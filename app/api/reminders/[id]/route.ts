import { ReminderSource } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { getCachedUser } from "@/lib/auth-cache";
import prisma from "@/lib/prisma";
import { getReminderAccessWhere, serializeReminder } from "@/lib/reminder-service";
import {
  DEFAULT_CUSTOM_REMINDER_TIME,
  createReminderSchedule,
  getTodayReminderDateKey,
  isValidReminderDateKey,
  isValidReminderTime,
} from "@/lib/reminders";

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

async function getAccessibleReminder(params: { actorId: string; coupleId: string | null; id: string }) {
  return prisma.reminder.findFirst({
    where: {
      id: params.id,
      ...getReminderAccessWhere({
        id: params.actorId,
        couple_id: params.coupleId,
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
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const actor = await getReminderActor();

    if (!actor) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const existingReminder = await getAccessibleReminder({
      actorId: actor.id,
      coupleId: actor.couple_id,
      id,
    });

    if (!existingReminder) {
      return NextResponse.json({ error: "Reminder not found" }, { status: 404 });
    }

    const body = await request.json().catch(() => null);
    const isCompleted =
      typeof body?.isCompleted === "boolean" ? body.isCompleted : existingReminder.is_completed;

    if (existingReminder.source === ReminderSource.TRIP) {
      const updatedReminder = await prisma.reminder.update({
        where: {
          id: existingReminder.id,
        },
        data: {
          is_completed: isCompleted,
          completed_at: isCompleted ? new Date() : null,
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

      return NextResponse.json({ data: serializeReminder(updatedReminder) });
    }

    const name = typeof body?.name === "string" ? body.name.trim() : existingReminder.name;
    const note = typeof body?.note === "string" ? body.note.trim() : existingReminder.note ?? "";
    const hasDate = typeof body?.hasDate === "boolean" ? body.hasDate : existingReminder.has_date;
    const hasTime =
      typeof body?.hasTime === "boolean" ? body.hasTime : existingReminder.has_time;
    const reminderDateKey =
      hasDate
        ? body?.reminderDateKey !== undefined
          ? body.reminderDateKey
          : existingReminder.reminder_date_key ?? getTodayReminderDateKey()
        : getTodayReminderDateKey();
    const reminderTime =
      hasTime
        ? body?.reminderTime !== undefined
          ? body.reminderTime
          : existingReminder.reminder_time ?? DEFAULT_CUSTOM_REMINDER_TIME
        : DEFAULT_CUSTOM_REMINDER_TIME;

    if (!name) {
      return NextResponse.json({ error: "Reminder name is required" }, { status: 400 });
    }

    if (!isValidReminderDateKey(reminderDateKey)) {
      return NextResponse.json({ error: "Valid reminder date is required" }, { status: 400 });
    }

    if (!isValidReminderTime(reminderTime)) {
      return NextResponse.json({ error: "Valid reminder time is required" }, { status: 400 });
    }

    const nextSchedule = createReminderSchedule({
      dateKey: reminderDateKey,
      time: reminderTime,
    });

    const scheduleChanged =
      existingReminder.reminder_date_key !== reminderDateKey ||
      existingReminder.reminder_time !== reminderTime ||
      existingReminder.has_date !== hasDate ||
      existingReminder.has_time !== hasTime ||
      existingReminder.scheduled_for?.getTime() !== nextSchedule?.getTime();

    const updatedReminder = await prisma.reminder.update({
      where: {
        id: existingReminder.id,
      },
      data: {
        name,
        note: note || null,
        reminder_date_key: reminderDateKey,
        reminder_time: reminderTime,
        has_date: hasDate,
        has_time: hasTime,
        scheduled_for: nextSchedule,
        is_completed: isCompleted,
        completed_at: isCompleted ? new Date() : null,
        ...(scheduleChanged
          ? {
              notification_sent_at: null,
            }
          : {}),
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

    return NextResponse.json({ data: serializeReminder(updatedReminder) });
  } catch (error: unknown) {
    console.error("Error updating reminder:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update reminder" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const actor = await getReminderActor();

    if (!actor) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const existingReminder = await getAccessibleReminder({
      actorId: actor.id,
      coupleId: actor.couple_id,
      id,
    });

    if (!existingReminder) {
      return NextResponse.json({ error: "Reminder not found" }, { status: 404 });
    }

    await prisma.reminder.update({
      where: {
        id: existingReminder.id,
      },
      data: {
        is_deleted: true,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Error deleting reminder:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete reminder" },
      { status: 500 }
    );
  }
}
