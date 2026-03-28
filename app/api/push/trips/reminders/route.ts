import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { sendPushNotificationToUsers } from "@/lib/push";
import {
  formatTripDateLabel,
  getDaysUntilTripStart,
  getPhnomPenhDateKey,
  getTripNotificationRecipientIds,
  normalizeTripMetadata,
} from "@/lib/push-events";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

type ReminderMetadata = {
  soonSentFor?: string;
  tomorrowSentFor?: string;
};

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

function getReminderMetadata(metadata: Prisma.JsonValue | null | undefined): ReminderMetadata {
  const baseMetadata = normalizeTripMetadata(metadata);
  const pushMetadata = baseMetadata.pushNotifications;

  if (!pushMetadata || typeof pushMetadata !== "object" || Array.isArray(pushMetadata)) {
    return {};
  }

  const reminderMetadata = pushMetadata as Record<string, Prisma.JsonValue>;

  return {
    soonSentFor:
      typeof reminderMetadata.tripStartsSoonSentFor === "string"
        ? reminderMetadata.tripStartsSoonSentFor
        : undefined,
    tomorrowSentFor:
      typeof reminderMetadata.tripStartsTomorrowSentFor === "string"
        ? reminderMetadata.tripStartsTomorrowSentFor
        : undefined,
  };
}

function mergeReminderMetadata(metadata: Prisma.JsonValue | null | undefined, updates: ReminderMetadata) {
  const baseMetadata = normalizeTripMetadata(metadata);
  const existingPushMetadata =
    baseMetadata.pushNotifications &&
    typeof baseMetadata.pushNotifications === "object" &&
    !Array.isArray(baseMetadata.pushNotifications)
      ? (baseMetadata.pushNotifications as Record<string, Prisma.JsonValue>)
      : {};

  return {
    ...baseMetadata,
    pushNotifications: {
      ...existingPushMetadata,
      ...(updates.soonSentFor ? { tripStartsSoonSentFor: updates.soonSentFor } : {}),
      ...(updates.tomorrowSentFor ? { tripStartsTomorrowSentFor: updates.tomorrowSentFor } : {}),
    },
  } satisfies Prisma.InputJsonObject;
}

async function runTripReminderJob() {
  const now = new Date();
  const trips = await prisma.trip.findMany({
    where: {
      status: "PLANNED",
    },
    select: {
      id: true,
      title: true,
      destination: true,
      start_date: true,
      metadata: true,
      couple_id: true,
      user_id: true,
    },
  });

  let soonCount = 0;
  let tomorrowCount = 0;

  for (const trip of trips) {
    const daysUntilStart = getDaysUntilTripStart(trip.start_date, now);
    if (daysUntilStart !== 7 && daysUntilStart !== 1) {
      continue;
    }

    const startDateKey = getPhnomPenhDateKey(trip.start_date);
    const reminderMetadata = getReminderMetadata(trip.metadata);

    if (daysUntilStart === 7 && reminderMetadata.soonSentFor === startDateKey) {
      continue;
    }

    if (daysUntilStart === 1 && reminderMetadata.tomorrowSentFor === startDateKey) {
      continue;
    }

    const recipientIds = await getTripNotificationRecipientIds({
      coupleId: trip.couple_id,
      userId: trip.user_id,
    });

    if (recipientIds.length === 0) {
      continue;
    }

    const tripLabel = trip.title?.trim() || trip.destination;
    const body =
      daysUntilStart === 1
        ? `${tripLabel} starts tomorrow in ${trip.destination}.`
        : `${tripLabel} starts in one week on ${formatTripDateLabel(trip.start_date)}.`;

    const result = await sendPushNotificationToUsers({
      userIds: recipientIds,
      payload: {
        title:
          daysUntilStart === 1
            ? "Your trip starts tomorrow"
            : "Your trip is coming up soon",
        body,
        url: "/trips",
        tag: `trip-reminder-${trip.id}-${daysUntilStart}`,
      },
      options: {
        TTL: 60 * 60,
        urgency: "high",
      },
    });

    if (result.delivered === 0 && result.failed === 0 && result.removed === 0) {
      continue;
    }

    await prisma.trip.update({
      where: { id: trip.id },
      data: {
        metadata: mergeReminderMetadata(trip.metadata, {
          soonSentFor: daysUntilStart === 7 ? startDateKey : reminderMetadata.soonSentFor,
          tomorrowSentFor: daysUntilStart === 1 ? startDateKey : reminderMetadata.tomorrowSentFor,
        }),
      },
    });

    if (daysUntilStart === 1) {
      tomorrowCount += 1;
    } else {
      soonCount += 1;
    }
  }

  return {
    success: true,
    soonCount,
    tomorrowCount,
  };
}

export async function POST(request: NextRequest) {
  if (!isRequestAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await runTripReminderJob();
  return NextResponse.json(result);
}

export async function GET(request: NextRequest) {
  return POST(request);
}
