import "server-only";

import { ReminderSource } from "@prisma/client";

import { sendPushNotificationToUsers } from "@/lib/push";
import { getTripNotificationRecipientIds } from "@/lib/push-events";
import prisma from "@/lib/prisma";

type ReminderJobResult = {
  success: true;
  attemptedDeliveries: number;
  customCount: number;
  failedDeliveries: number;
  removedDeliveries: number;
  sentCount: number;
  skippedCount: number;
  tripCount: number;
};

let activeReminderJob: Promise<ReminderJobResult> | null = null;

export async function runReminderJob() {
  if (activeReminderJob) {
    return activeReminderJob;
  }

  activeReminderJob = (async () => {
    const now = new Date();
    const reminders = await prisma.reminder.findMany({
      where: {
        is_deleted: false,
        is_completed: false,
        scheduled_for: {
          lte: now,
        },
        notification_sent_at: null,
      },
      include: {
        trip: {
          select: {
            id: true,
            title: true,
            destination: true,
            start_date: true,
          },
        },
      },
    });

    let attemptedDeliveries = 0;
    let customCount = 0;
    let failedDeliveries = 0;
    let removedDeliveries = 0;
    let skippedCount = 0;
    let tripCount = 0;

    for (const reminder of reminders) {
      const recipientIds = await getTripNotificationRecipientIds({
        coupleId: reminder.couple_id,
        userId: reminder.user_id,
      });

      if (recipientIds.length === 0) {
        skippedCount += 1;
        await prisma.reminder.update({
          where: {
            id: reminder.id,
          },
          data: {
            notification_sent_at: now,
          },
        });
        continue;
      }

      const isTripReminder = reminder.source === ReminderSource.TRIP;
      const tripLabel = reminder.trip?.title?.trim() || reminder.trip?.destination || reminder.name;
      const body = isTripReminder
        ? `${tripLabel} starts tomorrow${reminder.trip?.destination ? ` in ${reminder.trip.destination}` : ""}.`
        : reminder.note?.trim() || `Reminder: ${reminder.name}`;

      const result = await sendPushNotificationToUsers({
        userIds: recipientIds,
        allowSingleUserRecipients: true,
        payload: {
          title: isTripReminder ? "Your trip starts tomorrow" : reminder.name,
          body,
          url: isTripReminder ? "/trips" : "/reminders",
          tag: `reminder-${reminder.id}`,
        },
        options: {
          TTL: 60 * 60,
          urgency: "high",
        },
      });

      attemptedDeliveries += result.attempted;
      failedDeliveries += result.failed;
      removedDeliveries += result.removed;

      if (result.failed > 0 && result.delivered === 0 && result.removed === 0) {
        continue;
      }

      await prisma.reminder.update({
        where: {
          id: reminder.id,
        },
        data: {
          notification_sent_at: now,
        },
      });

      if (isTripReminder) {
        tripCount += 1;
      } else {
        customCount += 1;
      }
    }

    return {
      success: true,
      attemptedDeliveries,
      customCount,
      failedDeliveries,
      removedDeliveries,
      sentCount: tripCount + customCount,
      skippedCount,
      tripCount,
    } satisfies ReminderJobResult;
  })();

  try {
    return await activeReminderJob;
  } finally {
    activeReminderJob = null;
  }
}
