import "server-only";

import { Prisma, ReminderSource } from "@prisma/client";

import prisma from "@/lib/prisma";
import {
  createTripReminderSchedule,
  formatReminderListDate,
  getReminderDateLabel,
  getReminderTimeLabel,
} from "@/lib/reminders";
import { formatTripDateLabel } from "@/lib/push-events";

export function getReminderAccessWhere(user: { id: string; couple_id: string | null }) {
  return {
    AND: [
      { is_deleted: false },
      {
        OR: [
          { user_id: user.id },
          ...(user.couple_id ? [{ couple_id: user.couple_id }] : []),
        ],
      },
    ],
  } satisfies Prisma.ReminderWhereInput;
}

export function serializeReminder<
  T extends {
    id: string;
    couple_id: string | null;
    user_id: string | null;
    trip_id: string | null;
    source: ReminderSource;
    name: string;
    note: string | null;
    reminder_date_key: string | null;
    reminder_time: string | null;
    has_date: boolean;
    has_time: boolean;
    scheduled_for: Date | null;
    is_completed: boolean;
    is_deleted: boolean;
    completed_at: Date | null;
    notification_sent_at: Date | null;
    created_at: Date;
    updated_at: Date;
    creator?: {
      id: string;
      full_name: string | null;
      avatar_url: string | null;
    } | null;
    trip?: {
      id: string;
      title: string;
      destination: string;
      start_date: Date;
      end_date: Date;
    } | null;
  },
>(reminder: T) {
  return {
    id: reminder.id,
    couple_id: reminder.couple_id,
    user_id: reminder.user_id,
    trip_id: reminder.trip_id,
    source: reminder.source,
    name: reminder.name,
    note: reminder.note,
    reminder_date_key: reminder.reminder_date_key,
    reminder_time: reminder.reminder_time,
    has_date: reminder.has_date,
    has_time: reminder.has_time,
    scheduled_for: reminder.scheduled_for?.toISOString() ?? null,
    is_completed: reminder.is_completed,
    is_deleted: reminder.is_deleted,
    completed_at: reminder.completed_at?.toISOString() ?? null,
    notification_sent_at: reminder.notification_sent_at?.toISOString() ?? null,
    created_at: reminder.created_at.toISOString(),
    updated_at: reminder.updated_at.toISOString(),
    date_label: reminder.reminder_date_key ? getReminderDateLabel(reminder.reminder_date_key) : "No date",
    time_label: reminder.reminder_time ? getReminderTimeLabel(reminder.reminder_time) : "Any time",
    schedule_label: reminder.reminder_date_key
      ? formatReminderListDate({
          dateKey: reminder.reminder_date_key,
          time: reminder.reminder_time,
        })
      : "No date",
    creator: reminder.creator
      ? {
          id: reminder.creator.id,
          full_name: reminder.creator.full_name,
          avatar_url: reminder.creator.avatar_url,
        }
      : null,
    trip: reminder.trip
      ? {
          id: reminder.trip.id,
          title: reminder.trip.title,
          destination: reminder.trip.destination,
          start_date: reminder.trip.start_date.toISOString(),
          end_date: reminder.trip.end_date.toISOString(),
        }
      : null,
  };
}

export async function syncTripReminder(params: {
  actorId: string;
  enabled: boolean;
  trip: {
    id: string;
    couple_id: string | null;
    user_id: string | null;
    title: string;
    destination: string;
    start_date: Date;
  };
}) {
  if (!params.enabled) {
    await prisma.reminder.updateMany({
      where: {
        trip_id: params.trip.id,
      },
      data: {
        is_deleted: true,
      },
    });
    return;
  }

  const { dateKey, scheduledFor } = createTripReminderSchedule(params.trip.start_date);
  const tripLabel = params.trip.title?.trim() || params.trip.destination;
  const tripDate = formatTripDateLabel(params.trip.start_date);
  const name = tripLabel;
  const note = `Starts on ${tripDate} in ${params.trip.destination}.`;
  const existingReminder = await prisma.reminder.findUnique({
    where: {
      trip_id: params.trip.id,
    },
    select: {
      id: true,
      is_deleted: true,
      reminder_date_key: true,
      reminder_time: true,
      scheduled_for: true,
    },
  });

  const scheduleChanged =
    !existingReminder ||
    existingReminder.is_deleted ||
    existingReminder.reminder_date_key !== dateKey ||
    existingReminder.reminder_time !== null ||
    existingReminder.scheduled_for?.getTime() !== scheduledFor?.getTime();

  if (existingReminder) {
    await prisma.reminder.update({
      where: {
        id: existingReminder.id,
      },
      data: {
        couple_id: params.trip.couple_id,
        user_id: params.trip.user_id,
        source: ReminderSource.TRIP,
        name,
        note,
        is_deleted: false,
        reminder_date_key: dateKey,
        reminder_time: null,
        has_date: true,
        has_time: false,
        scheduled_for: scheduledFor,
        ...(scheduleChanged
          ? {
              is_completed: false,
              completed_at: null,
              notification_sent_at: null,
            }
          : {}),
      },
    });
    return;
  }

  await prisma.reminder.create({
    data: {
      couple_id: params.trip.couple_id,
      user_id: params.trip.user_id,
      trip_id: params.trip.id,
      created_by: params.actorId,
      source: ReminderSource.TRIP,
      name,
      note,
      is_deleted: false,
      reminder_date_key: dateKey,
      reminder_time: null,
      has_date: true,
      has_time: false,
      scheduled_for: scheduledFor,
    },
  });
}
