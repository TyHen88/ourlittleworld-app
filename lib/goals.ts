import { addDays, addMonths, addYears, differenceInCalendarDays, startOfDay } from "date-fns";

export const GOAL_TYPES = [
    "SAVINGS",
    "LEARNING",
    "WEDDING",
    "FUTURE_SELF",
    "SOCIAL_CONTRACT",
    "LONG_TERM_CHANGE",
] as const;

export type GoalTypeValue = typeof GOAL_TYPES[number];
export type GoalCadenceValue = "YEAR" | "MONTH" | "DAY";

export interface GoalProfileField {
    key: string;
    label: string;
    placeholder: string;
}

export const GOAL_TYPE_DETAILS: Record<GoalTypeValue, {
    label: string;
    description: string;
    fields: GoalProfileField[];
}> = {
    SAVINGS: {
        label: "Savings",
        description: "Plan money goals with progress and contribution rhythm.",
        fields: [
            { key: "reason", label: "Why this matters", placeholder: "Security, travel, emergency fund..." },
            { key: "contributionPlan", label: "Contribution rhythm", placeholder: "Weekly, monthly, bonus-based..." },
            { key: "successMetric", label: "Success metric", placeholder: "Target amount or finish line" },
        ],
    },
    LEARNING: {
        label: "Learning",
        description: "Break a learning journey into clear checkpoints.",
        fields: [
            { key: "subject", label: "Subject", placeholder: "Language, coding, finance, design..." },
            { key: "studyRhythm", label: "Study rhythm", placeholder: "30 min daily, weekend deep work..." },
            { key: "proof", label: "Proof of progress", placeholder: "Portfolio, exam, project, certificate..." },
        ],
    },
    WEDDING: {
        label: "Wedding",
        description: "Track planning, budget, and timeline for the big day.",
        fields: [
            { key: "eventDate", label: "Wedding date", placeholder: "Ceremony or target month" },
            { key: "budgetFocus", label: "Main budget focus", placeholder: "Venue, guest list, outfits..." },
            { key: "priorityTheme", label: "Top priority", placeholder: "Simple, elegant, intimate, traditional..." },
        ],
    },
    FUTURE_SELF: {
        label: "Future Self",
        description: "Define long-term identity shifts and steady progress.",
        fields: [
            { key: "vision", label: "Vision", placeholder: "Who do you want to become?" },
            { key: "habit", label: "Core habit", placeholder: "Meditation, reading, fitness..." },
            { key: "reflection", label: "Reflection ritual", placeholder: "Weekly review, journaling..." },
        ],
    },
    SOCIAL_CONTRACT: {
        label: "Social Contract",
        description: "Clarify commitments, check-ins, and healthy agreements.",
        fields: [
            { key: "agreementTheme", label: "Agreement theme", placeholder: "Communication, money, chores..." },
            { key: "commitment", label: "Core commitment", placeholder: "What promise are you keeping?" },
            { key: "checkInRhythm", label: "Check-in rhythm", placeholder: "Weekly review, monthly reset..." },
        ],
    },
    LONG_TERM_CHANGE: {
        label: "Long-Term Change",
        description: "Guide a major life transition with phased progress.",
        fields: [
            { key: "baseline", label: "Current reality", placeholder: "Where are you today?" },
            { key: "targetState", label: "Target state", placeholder: "What should life look like later?" },
            { key: "supportSystem", label: "Support system", placeholder: "People, tools, routines, accountability..." },
        ],
    },
};

export interface GoalMilestoneDraft {
    title: string;
    description?: string;
    cadence: GoalCadenceValue;
    due_at?: string;
    order_index: number;
    reminder_offset_minutes?: number;
}

export interface GoalRoadmapInput {
    title: string;
    type: GoalTypeValue;
    deadline?: string | null;
    reminderAt?: string | null;
    createdAt?: Date;
}

function toIsoOrUndefined(value: Date | null): string | undefined {
    return value ? value.toISOString() : undefined;
}

export function buildGoalProfile(
    type: GoalTypeValue,
    profile: Record<string, string | undefined> | undefined
) {
    const fields = GOAL_TYPE_DETAILS[type].fields;
    return fields.reduce<Record<string, string>>((acc, field) => {
        const value = profile?.[field.key]?.trim();
        if (value) acc[field.key] = value;
        return acc;
    }, {});
}

export function generateGoalMilestones(input: GoalRoadmapInput): GoalMilestoneDraft[] {
    const now = input.createdAt ?? new Date();
    const targetDate = input.deadline ? new Date(input.deadline) : input.reminderAt ? new Date(input.reminderAt) : null;
    const daysUntilTarget = targetDate ? differenceInCalendarDays(startOfDay(targetDate), startOfDay(now)) : null;

    const milestones: GoalMilestoneDraft[] = [];

    if (targetDate && daysUntilTarget !== null && daysUntilTarget > 365) {
        milestones.push({
            title: `Yearly direction for ${input.title}`,
            description: "Define the long-horizon checkpoint that keeps this goal on track.",
            cadence: "YEAR",
            due_at: toIsoOrUndefined(addYears(now, 1)),
            order_index: milestones.length,
            reminder_offset_minutes: 60 * 24 * 14,
        });
    }

    if (targetDate && daysUntilTarget !== null && daysUntilTarget > 30) {
        milestones.push({
            title: `Monthly checkpoint for ${input.title}`,
            description: "Review progress and adjust the next month of action.",
            cadence: "MONTH",
            due_at: toIsoOrUndefined(targetDate ? addMonths(now, 1) : null),
            order_index: milestones.length,
            reminder_offset_minutes: 60 * 24 * 3,
        });
    }

    milestones.push({
        title: `Next action for ${input.title}`,
        description: "A near-term step to move the goal forward now.",
        cadence: "DAY",
        due_at: input.reminderAt ?? toIsoOrUndefined(targetDate ? addDays(targetDate, -1) : addDays(now, 1)),
        order_index: milestones.length,
        reminder_offset_minutes: 60 * 24,
    });

    if (targetDate) {
        milestones.push({
            title: `${GOAL_TYPE_DETAILS[input.type].label} milestone due`,
            description: "The main target date for this goal.",
            cadence: daysUntilTarget !== null && daysUntilTarget > 365 ? "YEAR" : daysUntilTarget !== null && daysUntilTarget > 30 ? "MONTH" : "DAY",
            due_at: targetDate.toISOString(),
            order_index: milestones.length,
            reminder_offset_minutes: 60 * 24,
        });
    }

    return milestones;
}

export function isGoalType(value: string): value is GoalTypeValue {
    return GOAL_TYPES.includes(value as GoalTypeValue);
}
