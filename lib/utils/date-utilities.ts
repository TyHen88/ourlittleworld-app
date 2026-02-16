import { differenceInDays, parseISO } from "date-fns";

/**
 * Calculates the number of days between the start date and today.
 */
export function calculateDaysTogether(startDate: string): number {
    if (!startDate) return 0;
    try {
        const start = parseISO(startDate);
        const today = new Date();
        // We use absolute to handle potential future dates if needed, 
        // but normally it's positive. +1 because "Day 1" is the start date itself.
        return Math.abs(differenceInDays(today, start)) + 1;
    } catch (error) {
        console.error("Error calculating days together:", error);
        return 0;
    }
}

/**
 * Formats a date string into a romantic display format.
 */
export function calculateDaysTogetherSafe(startDate: string | Date | null | undefined): number {
    if (!startDate) return 0;
    return calculateDaysTogether(startDate instanceof Date ? startDate.toISOString() : startDate);
}

export function formatAnniversaryDate(date: string | Date | null | undefined): string {
    if (!date) return "";
    try {
        const normalized = date instanceof Date ? date : new Date(date);
        return normalized.toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric'
        });
    } catch (error) {
        return "";
    }
}
