import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";

const NOTIFICATION_TIME_ZONE = "Asia/Phnom_Penh";
const CAMBODIA_UTC_OFFSET_MS = 7 * 60 * 60 * 1000;
const tripDateFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: NOTIFICATION_TIME_ZONE,
  month: "short",
  day: "numeric",
  year: "numeric",
});

export function formatTripDateLabel(value: Date) {
  return tripDateFormatter.format(value);
}

export function getPhnomPenhDateKey(value: Date) {
  const localDate = new Date(value.getTime() + CAMBODIA_UTC_OFFSET_MS);
  const year = localDate.getUTCFullYear();
  const month = String(localDate.getUTCMonth() + 1).padStart(2, "0");
  const day = String(localDate.getUTCDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getPhnomPenhDayStart(value: Date) {
  const localDate = new Date(value.getTime() + CAMBODIA_UTC_OFFSET_MS);
  const dayStartUtcMs =
    Date.UTC(
      localDate.getUTCFullYear(),
      localDate.getUTCMonth(),
      localDate.getUTCDate(),
      0,
      0,
      0,
      0
    ) - CAMBODIA_UTC_OFFSET_MS;

  return new Date(dayStartUtcMs);
}

export function getDaysUntilTripStart(startDate: Date, now = new Date()) {
  const startDay = getPhnomPenhDayStart(startDate);
  const today = getPhnomPenhDayStart(now);
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
