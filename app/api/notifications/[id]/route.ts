import { NextRequest, NextResponse } from "next/server";

import { getCachedUser } from "@/lib/auth-cache";
import { serializeNotification } from "@/lib/notifications";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function PATCH(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCachedUser();

    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    if (!id) {
      return NextResponse.json({ error: "Notification id is required" }, { status: 400 });
    }

    const existingNotification = await prisma.appNotification.findFirst({
      where: {
        id,
        recipient_user_id: user.id,
        type: {
          not: "CHAT_MESSAGE",
        },
      },
      select: {
        id: true,
      },
    });

    if (!existingNotification) {
      return NextResponse.json({ error: "Notification not found" }, { status: 404 });
    }

    const notification = await prisma.appNotification.update({
      where: {
        id,
      },
      data: {
        is_read: true,
        read_at: new Date(),
      },
      select: {
        id: true,
        type: true,
        title: true,
        body: true,
        detail: true,
        url: true,
        is_read: true,
        read_at: true,
        created_at: true,
        updated_at: true,
        actor: {
          select: {
            id: true,
            full_name: true,
            avatar_url: true,
          },
        },
      },
    });

    return NextResponse.json({ success: true, data: serializeNotification(notification) });
  } catch (error: unknown) {
    console.error("Error updating notification:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update notification" },
      { status: 500 }
    );
  }
}
