import { NextRequest, NextResponse } from "next/server";

import { getCachedUser } from "@/lib/auth-cache";
import prisma from "@/lib/prisma";
import { COUPLE_CHAT_CATEGORY } from "@/lib/chat";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(request: NextRequest) {
  try {
    const user = await getCachedUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const messageId =
      typeof body?.messageId === "string" && body.messageId.length > 0
        ? body.messageId
        : null;

    if (!messageId) {
      return NextResponse.json({ error: "messageId is required" }, { status: 400 });
    }

    const [profile, message] = await Promise.all([
      prisma.user.findUnique({
        where: { id: user.id },
        select: {
          id: true,
          user_type: true,
          couple_id: true,
        },
      }),
      prisma.post.findFirst({
        where: {
          id: messageId,
          category: COUPLE_CHAT_CATEGORY,
          is_deleted: false,
        },
        select: {
          id: true,
          couple_id: true,
          created_at: true,
        },
      }),
    ]);

    if (!profile?.couple_id || profile.user_type === "SINGLE") {
      return NextResponse.json({ error: "Couple chat is not available" }, { status: 403 });
    }

    if (!message || message.couple_id !== profile.couple_id) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    await prisma.chatReadState.upsert({
      where: {
        user_id_couple_id: {
          user_id: user.id,
          couple_id: profile.couple_id,
        },
      },
      update: {
        last_read_post_id: message.id,
        last_read_created_at: message.created_at,
      },
      create: {
        user_id: user.id,
        couple_id: profile.couple_id,
        last_read_post_id: message.id,
        last_read_created_at: message.created_at,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Chat read-state update error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update read state" },
      { status: 500 },
    );
  }
}
