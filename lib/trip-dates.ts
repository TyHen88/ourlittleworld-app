export const TRIP_TIME_ZONE = "Asia/Phnom_Penh";
const CAMBODIA_UTC_OFFSET_MS = 7 * 60 * 60 * 1000;

const tripDateKeyFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: TRIP_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const tripShortDateFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: TRIP_TIME_ZONE,
  month: "short",
  day: "numeric",
});

const tripLongDateFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: TRIP_TIME_ZONE,
  month: "short",
  day: "numeric",
  year: "numeric",
});

function toTripDate(value: Date | string) {
  const normalized = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(normalized.getTime())) {
    throw new Error("Invalid trip date");
  }

  return normalized;
}

export function isValidTripDateKey(value: string | null | undefined): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function getTripDateKey(value: Date | string) {
  const parts = tripDateKeyFormatter.formatToParts(toTripDate(value));
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  if (!year || !month || !day) {
    throw new Error("Unable to format trip date");
  }

  return `${year}-${month}-${day}`;
}

export function formatTripDateInputValue(value: Date | string | null | undefined) {
  if (!value) {
    return "";
  }

  try {
    return getTripDateKey(value);
  } catch {
    return "";
  }
}

export function createTripDate(dateKey: string) {
  if (!isValidTripDateKey(dateKey)) {
    throw new Error("Invalid trip date");
  }

  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0) - CAMBODIA_UTC_OFFSET_MS);
}

export function formatTripShortDateLabel(value: Date | string) {
  return tripShortDateFormatter.format(toTripDate(value));
}

export function formatTripLongDateLabel(value: Date | string) {
  return tripLongDateFormatter.format(toTripDate(value));
}

export function getTripDayStart(value: Date | string = new Date()) {
  const localDate = new Date(toTripDate(value).getTime() + CAMBODIA_UTC_OFFSET_MS);
  const dayStartUtcMs =
    Date.UTC(
      localDate.getUTCFullYear(),
      localDate.getUTCMonth(),
      localDate.getUTCDate(),
      0,
      0,
      0,
      0,
    ) - CAMBODIA_UTC_OFFSET_MS;

  return new Date(dayStartUtcMs);
}

export function getTripNotificationDateKey(value: Date | string) {
  return getTripDateKey(new Date(toTripDate(value).getTime() - 24 * 60 * 60 * 1000));
}
