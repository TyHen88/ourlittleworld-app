import nodemailer from "nodemailer";
import prisma from "@/lib/prisma";
import { addDays, endOfDay, format, isAfter, isBefore, startOfDay, subDays } from "date-fns";
import { Prisma, GoalMilestoneStatus, ReminderChannel, ReminderDeliveryStatus, ReminderSourceType, ReminderStatus, ReminderTriggerType } from "@prisma/client";

type ReminderFactValue = string | number | boolean | null | undefined;

interface UpsertReminderInput {
    ownerUserId: string;
    milestoneId?: string | null;
    sourceType: ReminderSourceType;
    triggerType: ReminderTriggerType;
    sourceRef?: string;
    dedupeKey: string;
    title: string;
    body: string;
    analysisSummary: string;
    facts?: Record<string, ReminderFactValue | ReminderFactValue[] | Record<string, ReminderFactValue>>;
    dueAt: Date;
}

function toJsonValue(value: UpsertReminderInput["facts"]): Prisma.InputJsonValue | undefined {
    if (!value) return undefined;
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

export async function getOrCreateNotificationPreference(userId: string) {
    const existing = await prisma.notificationPreference.findUnique({
        where: { user_id: userId },
    });

    if (existing) return existing;

    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true },
    });

    return prisma.notificationPreference.create({
        data: {
            user_id: userId,
            email_address: user?.email ?? null,
        },
    });
}

function isWithinQuietHours(date: Date, preference: {
    quiet_hours_enabled: boolean;
    quiet_hours_start: number | null;
    quiet_hours_end: number | null;
}) {
    if (!preference.quiet_hours_enabled) return false;
    if (preference.quiet_hours_start === null || preference.quiet_hours_end === null) return false;

    const hour = date.getHours();
    if (preference.quiet_hours_start === preference.quiet_hours_end) return true;
    if (preference.quiet_hours_start < preference.quiet_hours_end) {
        return hour >= preference.quiet_hours_start && hour < preference.quiet_hours_end;
    }
    return hour >= preference.quiet_hours_start || hour < preference.quiet_hours_end;
}

async function upsertReminder(input: UpsertReminderInput) {
    return prisma.reminder.upsert({
        where: { dedupe_key: input.dedupeKey },
        update: {
            title: input.title,
            body: input.body,
            analysis_summary: input.analysisSummary,
            facts: toJsonValue(input.facts),
            due_at: input.dueAt,
            source_ref: input.sourceRef,
            milestone_id: input.milestoneId ?? null,
            status: ReminderStatus.PENDING,
            dismissed_at: null,
            acknowledged_at: null,
        },
        create: {
            owner_user_id: input.ownerUserId,
            milestone_id: input.milestoneId ?? null,
            source_type: input.sourceType,
            trigger_type: input.triggerType,
            source_ref: input.sourceRef,
            dedupe_key: input.dedupeKey,
            title: input.title,
            body: input.body,
            analysis_summary: input.analysisSummary,
            facts: toJsonValue(input.facts),
            due_at: input.dueAt,
        },
    });
}

async function queueGoalRemindersForUser(userId: string) {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, couple_id: true },
    });
    if (!user) return 0;

    const now = new Date();
    const goals = await prisma.savingsGoal.findMany({
        where: {
            is_completed: false,
            OR: [
                { user_id: user.id },
                ...(user.couple_id ? [{ couple_id: user.couple_id }] : []),
            ],
        },
        include: {
            milestones: {
                where: {
                    status: GoalMilestoneStatus.PENDING,
                },
                orderBy: [
                    { due_at: "asc" },
                    { order_index: "asc" },
                ],
            },
        },
    });

    let created = 0;

    for (const goal of goals) {
        const activeMilestones = goal.milestones.length > 0 ? goal.milestones : [];

        for (const milestone of activeMilestones) {
            if (!milestone.due_at) continue;

            const dueAt = new Date(milestone.due_at);
            const offsetMinutes = milestone.reminder_offset_minutes ?? 1440;
            const upcomingAt = new Date(dueAt.getTime() - offsetMinutes * 60 * 1000);
            const isUpcoming = isAfter(now, upcomingAt) && isBefore(now, dueAt);
            const isDue = now >= dueAt && now < endOfDay(dueAt);
            const isOverdue = now > endOfDay(dueAt);

            let triggerType: ReminderTriggerType | null = null;
            let dueTime = dueAt;
            if (isUpcoming) {
                triggerType = ReminderTriggerType.GOAL_UPCOMING;
                dueTime = upcomingAt;
            } else if (isDue) {
                triggerType = ReminderTriggerType.GOAL_DUE;
            } else if (isOverdue) {
                triggerType = ReminderTriggerType.GOAL_OVERDUE;
            }

            if (!triggerType) continue;

            const reminder = await upsertReminder({
                ownerUserId: user.id,
                milestoneId: milestone.id,
                sourceType: ReminderSourceType.GOAL_MILESTONE,
                triggerType,
                sourceRef: goal.id,
                dedupeKey: `${user.id}:${milestone.id}:${triggerType}:${format(startOfDay(dueAt), "yyyy-MM-dd")}`,
                title: `${goal.title}: ${milestone.title}`,
                body: milestone.description || goal.description || `Stay on track with ${goal.title}.`,
                analysisSummary: triggerType === ReminderTriggerType.GOAL_OVERDUE
                    ? "A required milestone is overdue and still incomplete."
                    : triggerType === ReminderTriggerType.GOAL_DUE
                    ? "A milestone is due today."
                    : "A milestone is approaching based on its reminder offset.",
                facts: {
                    goalTitle: goal.title,
                    milestoneTitle: milestone.title,
                    cadence: milestone.cadence,
                    dueAt: dueAt.toISOString(),
                },
                dueAt: dueTime,
            });
            if (reminder) created++;
        }

        if (goal.milestones.length === 0 && goal.reminder_at) {
            const dueAt = new Date(goal.reminder_at);
            const triggerType = now >= dueAt ? ReminderTriggerType.GOAL_DUE : ReminderTriggerType.GOAL_UPCOMING;
            const reminder = await upsertReminder({
                ownerUserId: user.id,
                sourceType: ReminderSourceType.GOAL,
                triggerType,
                sourceRef: goal.id,
                dedupeKey: `${user.id}:${goal.id}:${triggerType}:${format(startOfDay(dueAt), "yyyy-MM-dd")}`,
                title: goal.title,
                body: goal.description || "Goal reminder",
                analysisSummary: "Legacy goal reminder generated from the goal-level reminder date.",
                facts: {
                    goalTitle: goal.title,
                    dueAt: dueAt.toISOString(),
                },
                dueAt,
            });
            if (reminder) created++;
        }
    }

    return created;
}

async function queueBudgetRemindersForUser(userId: string) {
    const preference = await getOrCreateNotificationPreference(userId);
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, couple_id: true },
    });
    if (!user) return 0;

    const targetId = user.couple_id ?? user.id;
    const monthKey = format(new Date(), "yyyy-MM");
    const todayStart = startOfDay(new Date());
    const now = new Date();

    const [budget, monthTransactions, todayTransactions, baselineTransactions] = await Promise.all([
        prisma.budget.findFirst({
            where: {
                month: monthKey,
                OR: [{ couple_id: targetId }, { user_id: targetId }],
            },
        }),
        prisma.transaction.findMany({
            where: {
                OR: [{ couple_id: targetId }, { user_id: targetId }],
                transaction_date: { gte: startOfDay(new Date(monthKey + "-01")) },
                type: "EXPENSE",
            },
        }),
        prisma.transaction.findMany({
            where: {
                OR: [{ couple_id: targetId }, { user_id: targetId }],
                transaction_date: { gte: todayStart, lte: endOfDay(now) },
                type: "EXPENSE",
            },
        }),
        prisma.transaction.findMany({
            where: {
                OR: [{ couple_id: targetId }, { user_id: targetId }],
                transaction_date: { gte: subDays(todayStart, 7), lt: todayStart },
                type: "EXPENSE",
            },
        }),
    ]);

    let created = 0;
    const monthExpense = monthTransactions.reduce((sum, tx) => sum + Number(tx.amount), 0);
    const todayExpense = todayTransactions.reduce((sum, tx) => sum + Number(tx.amount), 0);
    const baselineDailyAverage = baselineTransactions.length > 0
        ? baselineTransactions.reduce((sum, tx) => sum + Number(tx.amount), 0) / 7
        : 0;

    if (preference.daily_digest_enabled && now.getHours() >= preference.digest_hour) {
        const categoryTotals = todayTransactions.reduce<Record<string, number>>((acc, tx) => {
            acc[tx.category] = (acc[tx.category] ?? 0) + Number(tx.amount);
            return acc;
        }, {});
        const topCategory = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0];

        await upsertReminder({
            ownerUserId: user.id,
            sourceType: ReminderSourceType.DAILY_DIGEST,
            triggerType: ReminderTriggerType.DAILY_DIGEST,
            sourceRef: `${targetId}:${monthKey}`,
            dedupeKey: `${user.id}:digest:${format(todayStart, "yyyy-MM-dd")}`,
            title: "Daily expense digest",
            body: todayExpense > 0
                ? `You spent $${todayExpense.toFixed(2)} today${topCategory ? `, mostly on ${topCategory[0]}.` : "."}`
                : "No expenses logged today.",
            analysisSummary: "Rule-based daily digest from today's transactions and current monthly budget position.",
            facts: {
                todayExpense,
                baselineDailyAverage: Number(baselineDailyAverage.toFixed(2)),
                monthExpense: Number(monthExpense.toFixed(2)),
                remainingBudget: budget ? Number(budget.monthly_total) - monthExpense : null,
                topCategory: topCategory?.[0] ?? null,
            },
            dueAt: now,
        });
        created++;
    }

    if (budget && preference.budget_alerts_enabled) {
        const monthlyTotal = Number(budget.monthly_total);
        const percentage = monthlyTotal > 0 ? (monthExpense / monthlyTotal) * 100 : 0;

        if (percentage >= 75 && percentage < 100) {
            await upsertReminder({
                ownerUserId: user.id,
                sourceType: ReminderSourceType.BUDGET_ALERT,
                triggerType: ReminderTriggerType.BUDGET_WARNING,
                sourceRef: `${targetId}:${monthKey}`,
                dedupeKey: `${user.id}:budget-warning:${monthKey}:${Math.floor(percentage / 5) * 5}`,
                title: "Budget warning",
                body: `You've used ${Math.round(percentage)}% of this month's budget.`,
                analysisSummary: "Monthly spending crossed the warning threshold.",
                facts: {
                    monthExpense: Number(monthExpense.toFixed(2)),
                    monthlyBudget: monthlyTotal,
                    usagePercentage: Math.round(percentage),
                },
                dueAt: now,
            });
            created++;
        }

        if (percentage >= 100) {
            await upsertReminder({
                ownerUserId: user.id,
                sourceType: ReminderSourceType.BUDGET_ALERT,
                triggerType: ReminderTriggerType.BUDGET_OVER,
                sourceRef: `${targetId}:${monthKey}`,
                dedupeKey: `${user.id}:budget-over:${monthKey}`,
                title: "Over budget",
                body: `You're over budget by $${(monthExpense - monthlyTotal).toFixed(2)} this month.`,
                analysisSummary: "Monthly spending is over the configured budget.",
                facts: {
                    monthExpense: Number(monthExpense.toFixed(2)),
                    monthlyBudget: monthlyTotal,
                    overBy: Number((monthExpense - monthlyTotal).toFixed(2)),
                },
                dueAt: now,
            });
            created++;
        }

        const currentMonthCategoryTotals = monthTransactions.reduce<Record<string, number>>((acc, tx) => {
            acc[tx.category] = (acc[tx.category] ?? 0) + Number(tx.amount);
            return acc;
        }, {});
        const topMonthCategory = Object.entries(currentMonthCategoryTotals).sort((a, b) => b[1] - a[1])[0];
        if (topMonthCategory && baselineDailyAverage > 0 && topMonthCategory[1] > baselineDailyAverage * 7 * 1.6) {
            await upsertReminder({
                ownerUserId: user.id,
                sourceType: ReminderSourceType.BUDGET_ALERT,
                triggerType: ReminderTriggerType.CATEGORY_SPIKE,
                sourceRef: `${targetId}:${monthKey}:${topMonthCategory[0]}`,
                dedupeKey: `${user.id}:category-spike:${monthKey}:${topMonthCategory[0]}`,
                title: `${topMonthCategory[0]} spending spike`,
                body: `${topMonthCategory[0]} spending is unusually high this month.`,
                analysisSummary: "Category spend is materially above the recent baseline.",
                facts: {
                    category: topMonthCategory[0],
                    categorySpend: Number(topMonthCategory[1].toFixed(2)),
                    baselineDailyAverage: Number(baselineDailyAverage.toFixed(2)),
                },
                dueAt: now,
            });
            created++;
        }
    }

    if (preference.tracking_nudges_enabled && todayTransactions.length === 0 && now.getHours() >= preference.digest_hour) {
        await upsertReminder({
            ownerUserId: user.id,
            sourceType: ReminderSourceType.DAILY_DIGEST,
            triggerType: ReminderTriggerType.NO_EXPENSE_LOG,
            sourceRef: `${targetId}:${format(todayStart, "yyyy-MM-dd")}`,
            dedupeKey: `${user.id}:no-expense:${format(todayStart, "yyyy-MM-dd")}`,
            title: "Daily tracking nudge",
            body: "No expense has been logged today. Update your tracker if you spent anything.",
            analysisSummary: "Tracking nudge because no expense has been recorded by the digest hour.",
            facts: {
                digestHour: preference.digest_hour,
                date: format(todayStart, "yyyy-MM-dd"),
            },
            dueAt: now,
        });
        created++;
    }

    return created;
}

async function buildTransporter() {
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !(process.env.SMTP_PASS || process.env.SMTP_PASSWORD)) {
        return null;
    }

    return nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === "true",
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS || process.env.SMTP_PASSWORD,
        },
    });
}

async function deliverViaEmail(reminder: any, email: string) {
    const transporter = await buildTransporter();
    if (!transporter) {
        throw new Error("SMTP is not configured");
    }

    await transporter.sendMail({
        from: process.env.SMTP_FROM || '"OurLittleWorld" <noreply@ourlittleworld.app>',
        to: email,
        subject: reminder.title,
        text: `${reminder.body}\n\n${reminder.analysis_summary || ""}`.trim(),
        html: `<h2>${reminder.title}</h2><p>${reminder.body}</p>${reminder.analysis_summary ? `<p><strong>Why:</strong> ${reminder.analysis_summary}</p>` : ""}`,
    });
}

async function deliverViaTelegram(reminder: any, chatId: string) {
    if (!process.env.TELEGRAM_BOT_TOKEN) {
        throw new Error("TELEGRAM_BOT_TOKEN is not configured");
    }

    const res = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            chat_id: chatId,
            text: `${reminder.title}\n${reminder.body}${reminder.analysis_summary ? `\nWhy: ${reminder.analysis_summary}` : ""}`,
        }),
    });

    if (!res.ok) {
        const data = await res.text();
        throw new Error(`Telegram send failed: ${data}`);
    }
}

async function createDelivery(reminderId: string, channel: ReminderChannel, status: ReminderDeliveryStatus, errorMessage?: string) {
    return prisma.reminderDelivery.create({
        data: {
            reminder_id: reminderId,
            channel,
            status,
            error_message: errorMessage,
            sent_at: status === ReminderDeliveryStatus.SENT ? new Date() : null,
            failed_at: status === ReminderDeliveryStatus.FAILED ? new Date() : null,
        },
    });
}

export async function deliverPendingReminders() {
    const now = new Date();
    const reminders = await prisma.reminder.findMany({
        where: {
            due_at: { lte: now },
            status: {
                in: [ReminderStatus.PENDING, ReminderStatus.PARTIAL, ReminderStatus.FAILED],
            },
        },
        include: {
            owner: {
                include: {
                    notificationPreference: true,
                },
            },
            deliveries: true,
        },
        orderBy: { due_at: "asc" },
    });

    let delivered = 0;

    for (const reminder of reminders) {
        const preference = reminder.owner.notificationPreference ?? await getOrCreateNotificationPreference(reminder.owner.id);
        if (isWithinQuietHours(now, preference)) {
            continue;
        }

        const channels: Array<{ channel: ReminderChannel; target: string | null }> = [
            { channel: ReminderChannel.EMAIL, target: preference.email_enabled ? (preference.email_address || reminder.owner.email) : null },
            { channel: ReminderChannel.TELEGRAM, target: preference.telegram_enabled ? preference.telegram_chat_id : null },
        ];

        let successCount = 0;
        let failureCount = 0;

        for (const item of channels) {
            if (!item.target) {
                continue;
            }

            const alreadySent = reminder.deliveries.some(
                (delivery) => delivery.channel === item.channel && delivery.status === ReminderDeliveryStatus.SENT
            );
            if (alreadySent) continue;

            try {
                if (item.channel === ReminderChannel.EMAIL) {
                    await deliverViaEmail(reminder, item.target);
                } else {
                    await deliverViaTelegram(reminder, item.target);
                }
                await createDelivery(reminder.id, item.channel, ReminderDeliveryStatus.SENT);
                successCount++;
            } catch (error: any) {
                await createDelivery(reminder.id, item.channel, ReminderDeliveryStatus.FAILED, error.message || "Delivery failed");
                failureCount++;
            }
        }

        const nextStatus =
            successCount > 0 && failureCount === 0
                ? ReminderStatus.DELIVERED
                : successCount > 0
                ? ReminderStatus.PARTIAL
                : ReminderStatus.FAILED;

        await prisma.reminder.update({
            where: { id: reminder.id },
            data: {
                status: nextStatus,
                delivered_at: successCount > 0 ? new Date() : null,
            },
        });

        if (successCount > 0) delivered++;
    }

    return delivered;
}

export async function generateSmartReminders() {
    const users = await prisma.user.findMany({
        where: { is_deleted: false },
        select: { id: true },
    });

    let generated = 0;
    for (const user of users) {
        generated += await queueGoalRemindersForUser(user.id);
        generated += await queueBudgetRemindersForUser(user.id);
    }

    return generated;
}

export async function runReminderEngine() {
    const generated = await generateSmartReminders();
    const delivered = await deliverPendingReminders();

    return { generated, delivered };
}
