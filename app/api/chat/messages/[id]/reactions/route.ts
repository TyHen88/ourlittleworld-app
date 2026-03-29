import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { getCachedUser } from "@/lib/auth-cache";
import { getCachedProfile } from "@/lib/db-utils";
import {
  COUPLE_CHAT_CATEGORY,
  COUPLE_CHAT_MESSAGE_UPDATED_EVENT,
  getCoupleChatChannelName,
  normalizeCoupleChatMetadata,
  serializeCoupleChatMessage,
  type CoupleChatMessageRecord,
} from "@/lib/chat";
import { getAblyRestClient } from "@/lib/ably-server";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

const EMOJI_PATTERN = /[\p{Extended_Pictographic}\p{Regional_Indicator}]/u;

const MESSAGE_SELECT = {
  id: true,
  couple_id: true,
  author_id: true,
  content: true,
  image_url: true,
  metadata: true,
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

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCachedUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const profile = await getCachedProfile(user.id);
    if (!profile?.couple_id || profile.user_type === "SINGLE") {
      return NextResponse.json({ error: "Couple chat is not available" }, { status: 403 });
    }

    const { id } = await context.params;
    if (!id) {
      return NextResponse.json({ error: "Message id is required" }, { status: 400 });
    }

    const body = await request.json().catch(() => null);
    const emoji = typeof body?.emoji === "string" ? body.emoji.trim() : "";

    if (!emoji || emoji.length > 32 || !EMOJI_PATTERN.test(emoji)) {
      return NextResponse.json({ error: "Invalid reaction emoji" }, { status: 400 });
    }

    const message = await prisma.post.findFirst({
      where: {
        id,
        couple_id: profile.couple_id,
        category: COUPLE_CHAT_CATEGORY,
        is_deleted: false,
      },
      select: MESSAGE_SELECT,
    });

    if (!message) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    const metadata = normalizeCoupleChatMetadata(message.metadata, {
      content: message.content,
      image_url: message.image_url,
    });

    const nextReactions = metadata.reactions.map((reaction) => ({
      emoji: reaction.emoji,
      user_ids: [...reaction.user_ids],
    }));
    const existingReaction = nextReactions.find((reaction) =>
      reaction.user_ids.includes(user.id)
    );
    const existingEmoji = existingReaction?.emoji ?? null;

    for (let index = nextReactions.length - 1; index >= 0; index -= 1) {
      nextReactions[index].user_ids = nextReactions[index].user_ids.filter(
        (userId) => userId !== user.id
      );

      if (nextReactions[index].user_ids.length === 0) {
        nextReactions.splice(index, 1);
      }
    }

    if (existingEmoji !== emoji) {
      const reactionIndex = nextReactions.findIndex(
        (reaction) => reaction.emoji === emoji
      );

      if (reactionIndex === -1) {
        nextReactions.push({
          emoji,
          user_ids: [user.id],
        });
      } else {
        nextReactions[reactionIndex].user_ids.push(user.id);
      }
    }

    const updatedMessage = await prisma.post.update({
      where: { id: message.id },
      data: {
        metadata: {
          type: metadata.type,
          images: metadata.images,
          sticker: metadata.sticker
            ? {
                id: metadata.sticker.id,
                emoji: metadata.sticker.emoji,
                label: metadata.sticker.label,
                theme: metadata.sticker.theme,
              }
            : null,
          reactions: nextReactions,
        } as Prisma.InputJsonValue,
      },
      select: MESSAGE_SELECT,
    });

    const serializedMessage = serializeCoupleChatMessage(
      updatedMessage as unknown as CoupleChatMessageRecord
    );

    const ably = getAblyRestClient();
    if (ably) {
      try {
        const channelName = getCoupleChatChannelName(profile.couple_id);
        await ably.channels.get(channelName).publish(COUPLE_CHAT_MESSAGE_UPDATED_EVENT, {
          coupleId: profile.couple_id,
          message: serializedMessage,
        });
      } catch (publishError) {
        console.error("Error publishing couple chat reaction update to Ably:", publishError);
      }
    }

    return NextResponse.json({ success: true, data: serializedMessage });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to update reaction";
    console.error("Error updating couple chat reaction:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
