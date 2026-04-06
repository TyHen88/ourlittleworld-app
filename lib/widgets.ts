import prisma from "@/lib/prisma";
import { calculateDaysTogetherSafe } from "@/lib/utils/date-utilities";
import { COUPLE_CHAT_CATEGORY } from "@/lib/chat";
import { formatReminderListDate, getTodayReminderDateKey } from "@/lib/reminders";
import { getReminderAccessWhere } from "@/lib/reminder-service";

const WIDGET_TIME_ZONE = "Asia/Phnom_Penh";

export type WidgetMode = "SINGLE" | "COUPLE";

export interface WidgetThemeSummary {
  id: string | null;
  imageUrl: string | null;
}

export interface WidgetReminderSummary {
  id: string;
  name: string;
  scheduleLabel: string;
  scheduledFor: string | null;
  isTripReminder: boolean;
  route: "/reminders" | "/trips";
}

export interface WidgetBudgetSummary {
  month: string;
  totalBudget: number | null;
  spent: number;
  remaining: number | null;
  percentageUsed: number | null;
  status: "no_budget" | "healthy" | "warning" | "over_budget";
}

export interface WidgetTripSummary {
  id: string;
  title: string;
  destination: string;
  startDate: string;
  endDate: string;
  budget: number | null;
  route: "/trips";
}

export interface CoupleWidgetSummary {
  mode: "COUPLE";
  generatedAt: string;
  theme: WidgetThemeSummary;
  couple: {
    id: string;
    name: string | null;
    daysTogether: number;
  };
  unreadChatCount: number;
  nextReminder: WidgetReminderSummary | null;
  budget: WidgetBudgetSummary;
}

export interface SingleWidgetSummary {
  mode: "SINGLE";
  generatedAt: string;
  theme: WidgetThemeSummary;
  user: {
    id: string;
    fullName: string | null;
  };
  nextReminder: WidgetReminderSummary | null;
  nextTrip: WidgetTripSummary | null;
  budget: WidgetBudgetSummary;
}

export type WidgetSummary = CoupleWidgetSummary | SingleWidgetSummary;

function getCurrentMonthKey(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: WIDGET_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(now);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;

  if (!year || !month) {
    throw new Error("Unable to resolve widget month");
  }

  return `${year}-${month}`;
}

function getMonthRange(monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number);
  const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
  return { start, end };
}

async function getNextReminder(params: {
  userId: string;
  coupleId: string | null;
}) {
  const todayKey = getTodayReminderDateKey();
  const reminder = await prisma.reminder.findFirst({
    where: {
      AND: [
        getReminderAccessWhere({
          id: params.userId,
          couple_id: params.coupleId,
        }),
        {
          is_deleted: false,
          is_completed: false,
          OR: [
            {
              scheduled_for: {
                gte: new Date(),
              },
            },
            {
              scheduled_for: null,
              reminder_date_key: {
                gte: todayKey,
              },
            },
          ],
        },
      ],
    },
    orderBy: [
      { scheduled_for: "asc" },
      { reminder_date_key: "asc" },
      { created_at: "asc" },
    ],
    select: {
      id: true,
      name: true,
      source: true,
      scheduled_for: true,
      reminder_date_key: true,
      reminder_time: true,
    },
  });

  if (!reminder) {
    return null;
  }

  return {
    id: reminder.id,
    name: reminder.name,
    scheduleLabel: formatReminderListDate({
      dateKey: reminder.reminder_date_key,
      time: reminder.reminder_time,
    }),
    scheduledFor: reminder.scheduled_for?.toISOString() ?? null,
    isTripReminder: reminder.source === "TRIP",
    route: reminder.source === "TRIP" ? "/trips" : "/reminders",
  } satisfies WidgetReminderSummary;
}

async function getBudgetSummary(scope: { userId: string; coupleId: string | null; mode: WidgetMode }) {
  const month = getCurrentMonthKey();
  const range = getMonthRange(month);
  const scopeWhere =
    scope.mode === "SINGLE"
      ? { user_id: scope.userId }
      : { couple_id: scope.coupleId };

  const [budget, expenseAggregate] = await Promise.all([
    prisma.budget.findFirst({
      where: {
        month,
        ...scopeWhere,
      },
      select: {
        monthly_total: true,
      },
    }),
    prisma.transaction.aggregate({
      where: {
        ...scopeWhere,
        type: "EXPENSE",
        transaction_date: {
          gte: range.start,
          lte: range.end,
        },
      },
      _sum: {
        amount: true,
      },
    }),
  ]);

  const totalBudget = budget?.monthly_total
    ? Number(budget.monthly_total.toString())
    : null;
  const spent = expenseAggregate._sum.amount
    ? Number(expenseAggregate._sum.amount.toString())
    : 0;
  const remaining = totalBudget === null ? null : totalBudget - spent;
  const percentageUsed =
    totalBudget && totalBudget > 0 ? Math.round((spent / totalBudget) * 100) : null;

  let status: WidgetBudgetSummary["status"] = "no_budget";
  if (totalBudget !== null) {
    if ((remaining ?? 0) > totalBudget * 0.5) {
      status = "healthy";
    } else if ((remaining ?? 0) > totalBudget * 0.2) {
      status = "warning";
    } else {
      status = "over_budget";
    }
  }

  return {
    month,
    totalBudget,
    spent,
    remaining,
    percentageUsed,
    status,
  } satisfies WidgetBudgetSummary;
}

async function getUnreadChatCount(params: {
  userId: string;
  coupleId: string;
}) {
  const readState = await prisma.chatReadState.findUnique({
    where: {
      user_id_couple_id: {
        user_id: params.userId,
        couple_id: params.coupleId,
      },
    },
    select: {
      last_read_post_id: true,
      last_read_created_at: true,
    },
  });

  return prisma.post.count({
    where: {
      couple_id: params.coupleId,
      category: COUPLE_CHAT_CATEGORY,
      is_deleted: false,
      author_id: {
        not: params.userId,
      },
      ...(readState?.last_read_created_at
        ? {
            OR: [
              {
                created_at: {
                  gt: readState.last_read_created_at,
                },
              },
              ...(readState.last_read_post_id
                ? [
                    {
                      created_at: readState.last_read_created_at,
                      id: {
                        gt: readState.last_read_post_id,
                      },
                    },
                  ]
                : []),
            ],
          }
        : {}),
    },
  });
}

async function getNextTrip(userId: string) {
  const nextTrip = await prisma.trip.findFirst({
    where: {
      user_id: userId,
      end_date: {
        gte: new Date(),
      },
    },
    orderBy: [{ start_date: "asc" }, { created_at: "asc" }],
    select: {
      id: true,
      title: true,
      destination: true,
      start_date: true,
      end_date: true,
      budget: true,
    },
  });

  if (!nextTrip) {
    return null;
  }

  return {
    id: nextTrip.id,
    title: nextTrip.title,
    destination: nextTrip.destination,
    startDate: nextTrip.start_date.toISOString(),
    endDate: nextTrip.end_date.toISOString(),
    budget: nextTrip.budget ? Number(nextTrip.budget.toString()) : null,
    route: "/trips",
  } satisfies WidgetTripSummary;
}

export async function buildWidgetSummary(userId: string) {
  const actor = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      couple: true,
    },
  });

  if (!actor) {
    throw new Error("User not found");
  }

  const mode: WidgetMode =
    actor.user_type === "SINGLE" || !actor.couple_id ? "SINGLE" : "COUPLE";
  const theme =
    mode === "SINGLE"
      ? {
          id: actor.world_theme,
          imageUrl: actor.world_theme_url,
        }
      : {
          id: actor.couple?.world_theme ?? null,
          imageUrl: actor.couple?.world_theme_url ?? null,
        };

  if (mode === "SINGLE") {
    const [nextReminder, nextTrip, budget] = await Promise.all([
      getNextReminder({ userId: actor.id, coupleId: null }),
      getNextTrip(actor.id),
      getBudgetSummary({ userId: actor.id, coupleId: null, mode }),
    ]);

    return {
      mode,
      generatedAt: new Date().toISOString(),
      theme,
      user: {
        id: actor.id,
        fullName: actor.full_name,
      },
      nextReminder,
      nextTrip,
      budget,
    } satisfies SingleWidgetSummary;
  }

  const [nextReminder, unreadChatCount, budget] = await Promise.all([
    getNextReminder({ userId: actor.id, coupleId: actor.couple_id }),
    getUnreadChatCount({ userId: actor.id, coupleId: actor.couple_id as string }),
    getBudgetSummary({
      userId: actor.id,
      coupleId: actor.couple_id,
      mode,
    }),
  ]);

  return {
    mode,
    generatedAt: new Date().toISOString(),
    theme,
    couple: {
      id: actor.couple_id as string,
      name: actor.couple?.couple_name ?? null,
      daysTogether: calculateDaysTogetherSafe(actor.couple?.start_date ?? null),
    },
    unreadChatCount,
    nextReminder,
    budget,
  } satisfies CoupleWidgetSummary;
}
