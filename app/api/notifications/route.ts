import { NextRequest, NextResponse } from "next/server";

import { getCachedUser } from "@/lib/auth-cache";
import { NOTIFICATION_PAGE_SIZE, serializeNotification } from "@/lib/notifications";
import { createCursorPaginatedResponse, decodePaginationCursor, encodePaginationCursor } from "@/lib/pagination";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type NotificationCursorPayload = {
  createdAt: string;
  id: string;
};

async function getNotificationUser() {
  const user = await getCachedUser();

  if (!user?.id) {
    return null;
  }

  return user;
}

export async function GET(request: NextRequest) {
  try {
    const user = await getNotificationUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(
      Number.parseInt(searchParams.get("limit") ?? String(NOTIFICATION_PAGE_SIZE), 10) || NOTIFICATION_PAGE_SIZE,
      30
    );
    const cursor = decodePaginationCursor<NotificationCursorPayload>(searchParams.get("cursor"));
    const cursorCreatedAt = cursor ? new Date(cursor.createdAt) : null;

    const cursorFilter =
      cursor && cursorCreatedAt && !Number.isNaN(cursorCreatedAt.getTime())
        ? {
            OR: [
              {
                created_at: {
                  lt: cursorCreatedAt,
                },
              },
              {
                created_at: cursorCreatedAt,
                id: {
                  lt: cursor.id,
                },
              },
            ],
          }
        : {};

    const notifications = await prisma.appNotification.findMany({
      where: {
        recipient_user_id: user.id,
        type: {
          not: "CHAT_MESSAGE",
        },
        ...cursorFilter,
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
      orderBy: [{ created_at: "desc" }, { id: "desc" }],
      take: limit,
    });

    const lastNotification = notifications[notifications.length - 1];
    const nextCursor =
      notifications.length === limit && lastNotification
        ? encodePaginationCursor({
            createdAt: lastNotification.created_at.toISOString(),
            id: lastNotification.id,
          })
        : null;

    return NextResponse.json(
      createCursorPaginatedResponse(
        notifications.map((notification) => serializeNotification(notification)),
        limit,
        nextCursor
      ),
      {
        headers: {
          "Cache-Control": "private, no-cache, no-store, max-age=0, must-revalidate",
        },
      }
    );
  } catch (error: unknown) {
    console.error("Error fetching notifications:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch notifications" },
      { status: 500 }
    );
  }
}

export async function PATCH() {
  try {
    const user = await getNotificationUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();
    const result = await prisma.appNotification.updateMany({
      where: {
        recipient_user_id: user.id,
        type: {
          not: "CHAT_MESSAGE",
        },
        is_read: false,
      },
      data: {
        is_read: true,
        read_at: now,
      },
    });

    return NextResponse.json({ success: true, count: result.count });
  } catch (error: unknown) {
    console.error("Error marking notifications as read:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update notifications" },
      { status: 500 }
    );
  }
}
