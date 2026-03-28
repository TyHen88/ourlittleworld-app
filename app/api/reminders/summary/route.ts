import { NextRequest, NextResponse } from "next/server";

import { getCachedUser } from "@/lib/auth-cache";
import prisma from "@/lib/prisma";
import { getReminderAccessWhere, serializeReminder } from "@/lib/reminder-service";
import { getMonthRangeKeys, getTodayReminderDateKey } from "@/lib/reminders";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function getReminderActor() {
  const sessionUser = await getCachedUser();

  if (!sessionUser?.id) {
    return null;
  }

  return prisma.user.findUnique({
    where: {
      id: sessionUser.id,
    },
    select: {
      id: true,
      couple_id: true,
      user_type: true,
    },
  });
}

export async function GET(request: NextRequest) {
  try {
    const actor = await getReminderActor();

    if (!actor) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const requestedMonth = searchParams.get("month") ?? getTodayReminderDateKey().slice(0, 7);
    const monthRange = getMonthRangeKeys(requestedMonth);

    if (!monthRange) {
      return NextResponse.json({ error: "Invalid month" }, { status: 400 });
    }

    const accessWhere = getReminderAccessWhere(actor);
    const todayKey = getTodayReminderDateKey();

    const [allCount, progressCount, completedCount, todayCount, calendarReminders] =
      await Promise.all([
        prisma.reminder.count({
          where: accessWhere,
        }),
        prisma.reminder.count({
          where: {
            AND: [accessWhere, { is_completed: false }],
          },
        }),
        prisma.reminder.count({
          where: {
            AND: [accessWhere, { is_completed: true }],
          },
        }),
        prisma.reminder.count({
          where: {
            AND: [
              accessWhere,
              {
                is_completed: false,
                reminder_date_key: todayKey,
              },
            ],
          },
        }),
        prisma.reminder.findMany({
          where: {
            AND: [
              accessWhere,
              {
                reminder_date_key: {
                  gte: monthRange.startKey,
                  lte: monthRange.endKey,
                },
              },
            ],
          },
          include: {
            creator: {
              select: {
                id: true,
                full_name: true,
                avatar_url: true,
              },
            },
            trip: {
              select: {
                id: true,
                title: true,
                destination: true,
                start_date: true,
                end_date: true,
              },
            },
          },
          orderBy: [{ reminder_date_key: "asc" }, { created_at: "desc" }],
        }),
      ]);

    const dateCounts = calendarReminders.reduce<Record<string, number>>((acc, reminder) => {
      if (reminder.reminder_date_key) {
        acc[reminder.reminder_date_key] = (acc[reminder.reminder_date_key] ?? 0) + 1;
      }

      return acc;
    }, {});

    return NextResponse.json({
      summary: {
        today: todayCount,
        all: allCount,
        completed: completedCount,
        progress: progressCount,
      },
      month: requestedMonth,
      todayDateKey: todayKey,
      calendarDateCounts: dateCounts,
      calendarReminders: calendarReminders.map((reminder) => serializeReminder(reminder)),
      scopeLabel: actor.user_type === "SINGLE" || !actor.couple_id ? "My List" : "Our List",
    });
  } catch (error: unknown) {
    console.error("Error fetching reminder summary:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch reminder summary" },
      { status: 500 }
    );
  }
}
