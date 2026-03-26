import { NextRequest, NextResponse } from "next/server";
import { ReminderStatus } from "@prisma/client";
import { getCachedUser } from "@/lib/auth-cache";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
    const user = await getCachedUser();
    if (!user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const scope = searchParams.get("scope") || "upcoming";
    const limit = Number(searchParams.get("limit") || "10");
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);

    const reminders = await prisma.reminder.findMany({
        where: {
            owner_user_id: user.id,
            ...(scope === "today"
                ? { due_at: { gte: todayStart, lte: todayEnd } }
                : scope === "active"
                ? { status: { in: [ReminderStatus.PENDING, ReminderStatus.PARTIAL, ReminderStatus.FAILED] } }
                : {}),
        },
        include: {
            deliveries: true,
            milestone: {
                select: {
                    id: true,
                    title: true,
                    cadence: true,
                    goal: {
                        select: {
                            id: true,
                            title: true,
                            type: true,
                        },
                    },
                },
            },
        },
        orderBy: { due_at: "asc" },
        take: limit,
    });

    return NextResponse.json({ data: reminders });
}
