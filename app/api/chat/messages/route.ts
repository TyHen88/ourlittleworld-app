import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCachedUser } from "@/lib/auth-cache";
import { getCachedProfile, getCachedProfileWithCouple } from "@/lib/db-utils";
import {
  COUPLE_CHAT_CATEGORY,
  COUPLE_CHAT_EVENT,
  serializeCoupleChatMessage,
  type CoupleChatMessageRecord,
  getCoupleChatChannelName,
} from "@/lib/chat";
import { getAblyRestClient } from "@/lib/ably-server";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

const MESSAGE_SELECT = {
  id: true,
  couple_id: true,
  author_id: true,
  content: true,
  created_at: true,
  updated_at: true,
  author: {
    select: {
      id: true,
      full_name: true,
      avatar_url: true,
    },
  },
} as const;

export async function GET(request: NextRequest) {
  try {
    const user = await getCachedUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const profile = await getCachedProfile(user.id);
    if (!profile?.couple_id || profile.user_type === "SINGLE") {
      return NextResponse.json({ error: "Couple chat is not available" }, { status: 403 });
    }

    const url = new URL(request.url);
    const coupleId = url.searchParams.get("coupleId");
    if (!coupleId || coupleId !== profile.couple_id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const cursor = url.searchParams.get("cursor");
    const limit = Math.min(
      Number.parseInt(url.searchParams.get("limit") ?? "80", 10) || 80,
      100
    );

    const cursorMessage = cursor
      ? await prisma.post.findFirst({
          where: {
            id: cursor,
            couple_id: profile.couple_id,
            category: COUPLE_CHAT_CATEGORY,
            is_deleted: false,
          },
          select: {
            created_at: true,
          },
        })
      : null;

    const messages = await prisma.post.findMany({
      where: {
        couple_id: profile.couple_id,
        category: COUPLE_CHAT_CATEGORY,
        is_deleted: false,
        ...(cursorMessage
          ? {
              created_at: {
                lt: cursorMessage.created_at,
              },
            }
          : {}),
      },
      orderBy: { created_at: "desc" },
      take: limit,
      select: MESSAGE_SELECT,
    });

    const serializedMessages = [...messages]
      .reverse()
      .map((message) =>
        serializeCoupleChatMessage(message as CoupleChatMessageRecord)
      );

    return NextResponse.json({
      data: serializedMessages,
      nextCursor: messages.length === limit ? messages[messages.length - 1]?.id ?? null : null,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch messages";
    console.error("Error fetching couple chat:", error);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCachedUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const profile = await getCachedProfileWithCouple(user.id);
    if (!profile?.couple_id || profile.user_type === "SINGLE") {
      return NextResponse.json({ error: "Couple chat is not available" }, { status: 403 });
    }

    const body = await request.json();
    const content = String(body?.content || "").trim();
    if (!content) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    const message = await prisma.post.create({
      data: {
        couple_id: profile.couple_id,
        author_id: user.id,
        content,
        category: COUPLE_CHAT_CATEGORY,
      },
      select: MESSAGE_SELECT,
    });

    const serializedMessage = serializeCoupleChatMessage(
      message as CoupleChatMessageRecord
    );

    const ably = getAblyRestClient();
    if (ably) {
      try {
        const channelName = getCoupleChatChannelName(profile.couple_id);
        await ably.channels.get(channelName).publish(COUPLE_CHAT_EVENT, {
          coupleId: profile.couple_id,
          message: serializedMessage,
        });
      } catch (publishError) {
        console.error("Error publishing couple chat message to Ably:", publishError);
      }
    }

    return NextResponse.json({ success: true, data: serializedMessage }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to send message";
    console.error("Error creating couple chat message:", error);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
