import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { getTripDayStart, TRIP_TIME_ZONE } from "@/lib/trip-dates";

const tripDateFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: TRIP_TIME_ZONE,
  month: "short",
  day: "numeric",
  year: "numeric",
});

export function formatTripDateLabel(value: Date) {
  return tripDateFormatter.format(value);
}

export function getDaysUntilTripStart(startDate: Date, now = new Date()) {
  const startDay = getTripDayStart(startDate);
  const today = getTripDayStart(now);
  const diffMs = startDay.getTime() - today.getTime();

  return Math.round(diffMs / (24 * 60 * 60 * 1000));
}

export function normalizeTripMetadata(metadata: Prisma.JsonValue | null | undefined) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return {};
  }

  return { ...(metadata as Record<string, Prisma.JsonValue>) };
}

export async function getCoupleMemberIds(params: {
  coupleId: string;
  excludeUserId?: string;
}) {
  const members = await prisma.user.findMany({
    where: {
      couple_id: params.coupleId,
      ...(params.excludeUserId
        ? {
            id: {
              not: params.excludeUserId,
            },
          }
        : {}),
    },
    select: {
      id: true,
    },
  });

  return members.map((member) => member.id);
}

export async function getTripNotificationRecipientIds(params: {
  coupleId?: string | null;
  userId?: string | null;
  excludeUserId?: string;
}) {
  if (params.coupleId) {
    return getCoupleMemberIds({
      coupleId: params.coupleId,
      excludeUserId: params.excludeUserId,
    });
  }

  if (params.userId && params.userId !== params.excludeUserId) {
    return [params.userId];
  }

  return [];
}
