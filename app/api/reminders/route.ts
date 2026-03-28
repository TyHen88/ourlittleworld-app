import { Prisma, ReminderSource } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { getCachedUser } from "@/lib/auth-cache";
import { createCursorPaginatedResponse, decodePaginationCursor, encodePaginationCursor } from "@/lib/pagination";
import prisma from "@/lib/prisma";
import { getReminderAccessWhere, serializeReminder } from "@/lib/reminder-service";
import {
  DEFAULT_CUSTOM_REMINDER_TIME,
  createReminderSchedule,
  getTodayReminderDateKey,
  isValidReminderDateKey,
  isValidReminderTime,
  type ReminderView,
} from "@/lib/reminders";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type ReminderCursorPayload = {
  createdAt: string;
  id: string;
};

function getReminderView(searchParams: URLSearchParams): ReminderView {
  const value = searchParams.get("view");
  if (value === "today" || value === "completed" || value === "progress") {
    return value;
  }

  return "all";
}

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
    const view = getReminderView(searchParams);
    const limit = Math.min(
      Number.parseInt(searchParams.get("limit") ?? "20", 10) || 20,
      50
    );
    const cursor = decodePaginationCursor<ReminderCursorPayload>(searchParams.get("cursor"));

    const filters: Prisma.ReminderWhereInput[] = [getReminderAccessWhere(actor)];

    if (view === "today") {
      filters.push({
        is_completed: false,
        reminder_date_key: getTodayReminderDateKey(),
      });
    } else if (view === "completed") {
      filters.push({
        is_completed: true,
      });
    } else if (view === "progress") {
      filters.push({
        is_completed: false,
      });
    }

    const cursorCreatedAt = cursor ? new Date(cursor.createdAt) : null;
    const cursorFilter: Prisma.ReminderWhereInput =
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

    const reminders = await prisma.reminder.findMany({
      where: {
        AND: [...filters, cursorFilter],
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
      orderBy: [{ created_at: "desc" }, { id: "desc" }],
      take: limit,
    });

    const lastReminder = reminders[reminders.length - 1];
    const nextCursor =
      reminders.length === limit && lastReminder
        ? encodePaginationCursor({
            createdAt: lastReminder.created_at.toISOString(),
            id: lastReminder.id,
          })
        : null;

    return NextResponse.json(
      createCursorPaginatedResponse(
        reminders.map((reminder) => serializeReminder(reminder)),
        limit,
        nextCursor
      )
    );
  } catch (error: unknown) {
    console.error("Error fetching reminders:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch reminders" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const actor = await getReminderActor();

    if (!actor) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const note = typeof body?.note === "string" ? body.note.trim() : "";
    const isSoloOwner = actor.user_type === "SINGLE" || !actor.couple_id;
    const hasDate = Boolean(body?.hasDate);
    const hasTime = Boolean(body?.hasTime);
    const reminderDateKey = hasDate ? body?.reminderDateKey : getTodayReminderDateKey();
    const reminderTime = hasTime ? body?.reminderTime : DEFAULT_CUSTOM_REMINDER_TIME;

    if (!name) {
      return NextResponse.json({ error: "Reminder name is required" }, { status: 400 });
    }

    if (!isValidReminderDateKey(reminderDateKey)) {
      return NextResponse.json({ error: "Valid reminder date is required" }, { status: 400 });
    }

    if (!isValidReminderTime(reminderTime)) {
      return NextResponse.json({ error: "Valid reminder time is required" }, { status: 400 });
    }

    const reminder = await prisma.reminder.create({
      data: {
        couple_id: isSoloOwner ? null : actor.couple_id,
        user_id: isSoloOwner ? actor.id : null,
        created_by: actor.id,
        source: ReminderSource.CUSTOM,
        name,
        note: note || null,
        reminder_date_key: reminderDateKey,
        reminder_time: reminderTime,
        has_date: hasDate,
        has_time: hasTime,
        scheduled_for: createReminderSchedule({
          dateKey: reminderDateKey,
          time: reminderTime,
        }),
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
    });

    return NextResponse.json({ data: serializeReminder(reminder) }, { status: 201 });
  } catch (error: unknown) {
    console.error("Error creating reminder:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create reminder" },
      { status: 500 }
    );
  }
}
