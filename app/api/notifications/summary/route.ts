import { NextResponse } from "next/server";

import { getCachedUser } from "@/lib/auth-cache";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const user = await getCachedUser();

    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [totalCount, unreadCount] = await prisma.$transaction([
      prisma.appNotification.count({
        where: {
          recipient_user_id: user.id,
          type: {
            not: "CHAT_MESSAGE",
          },
        },
      }),
      prisma.appNotification.count({
        where: {
          recipient_user_id: user.id,
          type: {
            not: "CHAT_MESSAGE",
          },
          is_read: false,
        },
      }),
    ]);

    return NextResponse.json({
      totalCount,
      unreadCount,
    });
  } catch (error: unknown) {
    console.error("Error fetching notification summary:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch notification summary" },
      { status: 500 }
    );
  }
}
