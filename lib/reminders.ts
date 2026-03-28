import { addDays, endOfMonth, format, startOfMonth } from "date-fns";

export const REMINDER_TIME_ZONE = "Asia/Phnom_Penh";
export const CAMBODIA_UTC_OFFSET_MS = 7 * 60 * 60 * 1000;
export const DEFAULT_REMINDER_HOUR = 9;
export const DEFAULT_REMINDER_MINUTE = 0;
export const DEFAULT_CUSTOM_REMINDER_TIME = "00:00";

export type ReminderView = "today" | "all" | "completed" | "progress";

const reminderDateFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: REMINDER_TIME_ZONE,
  month: "short",
  day: "numeric",
  year: "numeric",
});

const reminderTimeFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: REMINDER_TIME_ZONE,
  hour: "numeric",
  minute: "2-digit",
});

export function isValidReminderDateKey(value: string | null | undefined) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function isValidReminderTime(value: string | null | undefined) {
  return typeof value === "string" && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);
}

export function getPhnomPenhDateKey(value: Date) {
  const localDate = new Date(value.getTime() + CAMBODIA_UTC_OFFSET_MS);
  const year = localDate.getUTCFullYear();
  const month = String(localDate.getUTCMonth() + 1).padStart(2, "0");
  const day = String(localDate.getUTCDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function getTodayReminderDateKey(now = new Date()) {
  return getPhnomPenhDateKey(now);
}

export function createReminderSchedule(params: {
  dateKey?: string | null;
  time?: string | null;
}) {
  if (!isValidReminderDateKey(params.dateKey)) {
    return null;
  }

  const dateKey = params.dateKey as string;
  const [year, month, day] = dateKey.split("-").map(Number);
  let hours = DEFAULT_REMINDER_HOUR;
  let minutes = DEFAULT_REMINDER_MINUTE;

  if (isValidReminderTime(params.time)) {
    const time = params.time as string;
    const [parsedHours, parsedMinutes] = time.split(":").map(Number);
    hours = parsedHours;
    minutes = parsedMinutes;
  }

  return new Date(Date.UTC(year, month - 1, day, hours, minutes) - CAMBODIA_UTC_OFFSET_MS);
}

export function getReminderDateLabel(dateKey: string | null | undefined) {
  if (!isValidReminderDateKey(dateKey)) {
    return "No date";
  }

  return reminderDateFormatter.format(createReminderSchedule({ dateKey, time: "12:00" })!);
}

export function getReminderTimeLabel(time: string | null | undefined) {
  if (!isValidReminderTime(time)) {
    return "Any time";
  }

  return reminderTimeFormatter.format(createReminderSchedule({ dateKey: "2026-01-01", time })!);
}

export function getMonthRangeKeys(month: string) {
  const baseDate = new Date(`${month}-01T00:00:00`);

  if (Number.isNaN(baseDate.getTime())) {
    return null;
  }

  return {
    startKey: format(startOfMonth(baseDate), "yyyy-MM-dd"),
    endKey: format(endOfMonth(baseDate), "yyyy-MM-dd"),
  };
}

export function getTomorrowReminderDateKey(dateKey: string) {
  const baseDate = new Date(`${dateKey}T00:00:00`);

  if (Number.isNaN(baseDate.getTime())) {
    return null;
  }

  return format(addDays(baseDate, 1), "yyyy-MM-dd");
}

export function getTripReminderDateKey(startDate: Date) {
  return getPhnomPenhDateKey(new Date(startDate.getTime() - 24 * 60 * 60 * 1000));
}

export function createTripReminderSchedule(startDate: Date) {
  const dateKey = getTripReminderDateKey(startDate);

  return {
    dateKey,
    scheduledFor: createReminderSchedule({
      dateKey,
      time: `${String(DEFAULT_REMINDER_HOUR).padStart(2, "0")}:${String(DEFAULT_REMINDER_MINUTE).padStart(2, "0")}`,
    }),
  };
}

export function formatReminderListDate(params: {
  dateKey?: string | null;
  time?: string | null;
}) {
  if (!isValidReminderDateKey(params.dateKey)) {
    return "No date";
  }

  const dateLabel = getReminderDateLabel(params.dateKey);
  if (!isValidReminderTime(params.time)) {
    return dateLabel;
  }

  return `${dateLabel} at ${getReminderTimeLabel(params.time)}`;
}
