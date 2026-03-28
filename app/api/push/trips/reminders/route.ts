import { ReminderSource } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { sendPushNotificationToUsers } from "@/lib/push";
import prisma from "@/lib/prisma";
import { getTripNotificationRecipientIds } from "@/lib/push-events";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

function isRequestAuthorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return process.env.NODE_ENV !== "production";
  }

  const bearer = request.headers.get("authorization");
  if (bearer === `Bearer ${secret}`) {
    return true;
  }

  return request.nextUrl.searchParams.get("secret") === secret;
}

async function runReminderJob() {
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

  let tripCount = 0;
  let customCount = 0;

  for (const reminder of reminders) {
    const recipientIds = await getTripNotificationRecipientIds({
      coupleId: reminder.couple_id,
      userId: reminder.user_id,
    });

    if (recipientIds.length === 0) {
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
    tripCount,
    customCount,
    sentCount: tripCount + customCount,
  };
}

export async function POST(request: NextRequest) {
  if (!isRequestAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await runReminderJob();
  return NextResponse.json(result);
}

export async function GET(request: NextRequest) {
  return POST(request);
}
