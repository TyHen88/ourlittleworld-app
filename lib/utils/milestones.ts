import { Heart, Sparkles, Gift, Cake, Star, PartyPopper } from "lucide-react";

export const MILESTONES = [
    { days: 100, icon: Heart, label: "100 Days", color: "text-pink-500" },
    { days: 200, icon: Sparkles, label: "200 Days", color: "text-purple-500" },
    { days: 300, icon: Gift, label: "300 Days", color: "text-rose-500" },
    { days: 365, icon: Cake, label: "1 Year", color: "text-romantic-heart" },
    { days: 500, icon: Star, label: "500 Days", color: "text-yellow-500" },
    { days: 730, icon: PartyPopper, label: "2 Years", color: "text-romantic-heart" },
];

export function calculateDaysTogether(startDate: string): number {
    const start = new Date(startDate);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export function getNextMilestone(daysTogether: number) {
    return MILESTONES.find(m => m.days > daysTogether) || MILESTONES[MILESTONES.length - 1];
}

export function getPreviousMilestone(daysTogether: number) {
    const previous = [...MILESTONES].reverse().find(m => m.days <= daysTogether);
    return previous || MILESTONES[0];
}

export function getProgress(daysTogether: number) {
    const prev = getPreviousMilestone(daysTogether);
    const next = getNextMilestone(daysTogether);
    const range = next.days - prev.days;
    const current = daysTogether - prev.days;
    return (current / range) * 100;
}

export function getDaysUntilMilestone(daysTogether: number) {
    const next = getNextMilestone(daysTogether);
    return next.days - daysTogether;
}
