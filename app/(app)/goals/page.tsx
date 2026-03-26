"use client";

import { FullPageLoader } from "@/components/FullPageLoader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useCouple } from "@/hooks/use-couple";
import { useSavingsGoals, useUpdateSavingsGoal } from "@/hooks/use-savings-goals";
import { GOAL_TYPE_DETAILS } from "@/lib/goals";
import { cn } from "@/lib/utils";
import { differenceInDays, differenceInMonths, differenceInYears } from "date-fns";
import { AnimatePresence, motion } from "framer-motion";
import {
    ArrowLeft,
    CheckCircle2,
    Clock,
    Edit,
    Flag,
    Plus,
    Sparkles,
    Target,
    TrendingUp,
    CheckSquare,
    Bell,
    DollarSign,
    GraduationCap,
    Heart,
    Rocket
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";



const PRIORITY_CONFIG = {
    high: { label: "High Priority", color: "text-red-600", bg: "bg-red-50", border: "border-red-200" },
    medium: { label: "Medium Priority", color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200" },
    low: { label: "Low Priority", color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-200" },
};

export default function GoalsPage() {
    const router = useRouter();
    const { user, profile, couple, isLoading: coupleLoading } = useCouple();

    const [filter, setFilter] = useState<"all" | "active" | "completed" | "timeline">("all");

    useEffect(() => {
        if (!coupleLoading && !user) {
            router.push("/login");
        }
    }, [user, coupleLoading, router]);

    const isSingle = profile?.user_type === 'SINGLE';
    const effectiveIsSingle = isSingle;
    const currentId = isSingle ? user?.id : couple?.id;

    const { data: goals, isLoading: goalsLoading } = useSavingsGoals(currentId);
    const updateGoal = useUpdateSavingsGoal();

    const filteredGoals = useMemo(() => {
        if (!goals) return [];
        let result = goals;
        if (filter === "completed") result = goals.filter(g => g.is_completed);
        else if (filter === "active") result = goals.filter(g => !g.is_completed);
        
        if (filter === "timeline") {
            // Sort chronologically by deadline or reminder, ignore completed items unless that's all there is
            return [...goals].sort((a, b) => {
                const dateA = a.milestones?.find((milestone) => milestone.status === "PENDING" && milestone.due_at)?.due_at || a.deadline || a.reminder_at || a.created_at;
                const dateB = b.milestones?.find((milestone) => milestone.status === "PENDING" && milestone.due_at)?.due_at || b.deadline || b.reminder_at || b.created_at;
                return new Date(dateA).getTime() - new Date(dateB).getTime();
            });
        }
        
        return result;
    }, [goals, filter]);

    // Calculate statistics
    const stats = useMemo(() => {
        if (!goals) return { total: 0, active: 0, completed: 0, totalSaved: 0, totalTarget: 0 };

        const active = goals.filter(g => !g.is_completed);
        const completed = goals.filter(g => g.is_completed);
        const totalSaved = goals.reduce((sum, g) => sum + parseFloat(String(g.current_amount)), 0);
        const totalTarget = active.reduce((sum, g) => sum + parseFloat(String(g.target_amount)), 0);

        return {
            total: goals.length,
            active: active.length,
            completed: completed.length,
            totalSaved,
            totalTarget,
        };
    }, [goals]);

    // Get time remaining text
    const getTimeRemaining = (deadline: string | null) => {
        if (!deadline) return null;
        const deadlineDate = new Date(deadline);
        const now = new Date();

        if (deadlineDate < now) return { text: "Overdue", color: "text-red-600" };

        const days = differenceInDays(deadlineDate, now);
        const months = differenceInMonths(deadlineDate, now);
        const years = differenceInYears(deadlineDate, now);

        if (years > 0) return { text: `${years}y ${months % 12}m left`, color: "text-slate-500" };
        if (months > 0) return { text: `${months}m ${days % 30}d left`, color: "text-amber-600" };
        if (days > 7) return { text: `${days} days left`, color: "text-blue-600" };
        return { text: `${days} days left`, color: "text-red-600" };
    };


    // Handle mark as complete
    const handleMarkComplete = async (goalId: string) => {
        if (!currentId) return;

        await updateGoal.mutateAsync({
            id: goalId,
            coupleId: currentId,
            isCompleted: true,
        });
    };

    if (coupleLoading) return <FullPageLoader />;

    if (!user || (!isSingle && !couple)) {
        return null;
    }

    return (
        <div className="p-6 space-y-6 max-w-2xl mx-auto pb-32">
            {/* Header */}
            <motion.header
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-3"
            >
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-black text-slate-800 flex items-center gap-2">
                            <Target className={isSingle ? "text-emerald-500" : "text-romantic-heart"} size={32} />
                            {isSingle ? "Personal Goals" : "Savings Goals"}
                        </h1>
                        <p className="text-sm text-slate-500 mt-1 flex items-center gap-1">
                            {effectiveIsSingle ? "Track your personal dreams" : "Track your dreams together"}
                            <Sparkles className={effectiveIsSingle ? "text-emerald-500" : "text-romantic-heart"} size={14} />
                        </p>
                    </div>
                    <Link
                        href="/dashboard"
                        className="p-2 rounded-full bg-slate-50 hover:bg-slate-100 transition-colors"
                    >
                        <ArrowLeft className="text-slate-500" size={20} />
                    </Link>
                </div>

            </motion.header>

            {/* Statistics Cards */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="grid grid-cols-2 gap-3"
            >
                <Card className="p-4 border-none bg-gradient-to-br from-purple-50 to-violet-50 rounded-3xl shadow-sm">
                    <div className="flex items-center gap-2 mb-1">
                        <Target className="text-purple-500" size={16} />
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Goals</span>
                    </div>
                    <p className="text-2xl font-black text-slate-800">{stats.active}</p>
                    <p className="text-[10px] text-slate-400 mt-1">{stats.completed} completed</p>
                </Card>

                <Card className="p-4 border-none bg-gradient-to-br from-green-50 to-emerald-50 rounded-3xl shadow-sm">
                    <div className="flex items-center gap-2 mb-1">
                        <TrendingUp className="text-green-500" size={16} />
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Saved</span>
                    </div>
                    <p className="text-2xl font-black text-slate-800">${stats.totalSaved.toFixed(0)}</p>
                    <p className="text-[10px] text-slate-400 mt-1">of ${stats.totalTarget.toFixed(0)}</p>
                </Card>
            </motion.div>

            {/* Filter Tabs */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="flex gap-2 p-1 bg-slate-100 rounded-2xl"
            >
                {[
                    { value: "all", label: "All" },
                    { value: "active", label: "Active" },
                    { value: "completed", label: "Done" },
                    { value: "timeline", label: "Timeline" },
                ].map((tab) => (
                    <button
                        key={tab.value}
                        onClick={() => setFilter(tab.value as any)}
                        className={cn(
                            "flex-1 py-2 px-4 rounded-xl text-sm font-bold transition-all",
                            filter === tab.value
                                ? "bg-white text-slate-800 shadow-sm"
                                : "text-slate-500 hover:text-slate-700"
                        )}
                    >
                        {tab.label}
                    </button>
                ))}
            </motion.div>

            {/* Goals List */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="space-y-4"
            >
                {goalsLoading ? (
                    <div className="space-y-3">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="h-48 bg-white/50 rounded-3xl animate-pulse" />
                        ))}
                    </div>
                ) : filteredGoals.length === 0 ? (
                    <Card className="p-12 border-2 border-dashed border-romantic-blush/30 bg-white/50 rounded-3xl text-center">
                        <div className="w-16 h-16 mx-auto bg-gradient-to-br from-romantic-blush to-romantic-lavender rounded-full flex items-center justify-center mb-4">
                            <Target className="text-white" size={32} />
                        </div>
                        <h3 className="text-lg font-bold text-slate-800 mb-2">
                            {filter === "completed" ? "No Completed Goals Yet" : (isSingle ? "Start Your First Goal!" : "Start Your First Goal Together!")}
                        </h3>
                        <p className="text-sm text-slate-500 max-w-sm mx-auto mb-6">
                            {filter === "completed"
                                ? "Complete your active goals to see them here"
                                : "Set a savings goal and track your progress together. Dream big!"
                            }
                        </p>
                        {filter !== "completed" && (
                            <Link
                                href="/goals/create"
                                className={cn(
                                    "inline-flex items-center justify-center h-10 px-4 rounded-full shadow-lg text-sm font-medium transition-colors",
                                    isSingle ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "bg-gradient-button text-white"
                                )}
                            >
                                <Plus size={20} className="mr-2" />
                                {isSingle ? "Create Your First Goal" : "Create Your First Goal Together"}
                            </Link>
                        )}
                    </Card>
                ) : (
                    <div className="space-y-4">
                        <AnimatePresence mode="popLayout">
                            {filteredGoals.map((goal, index) => {
                                const progress = goal.type === "SAVINGS" && parseFloat(String(goal.target_amount)) > 0
                                    ? (parseFloat(String(goal.current_amount)) / parseFloat(String(goal.target_amount))) * 100
                                    : 0;
                                const timeRemaining = getTimeRemaining(goal.deadline);
                                const priorityConfig = PRIORITY_CONFIG[goal.priority as keyof typeof PRIORITY_CONFIG] || PRIORITY_CONFIG.medium;
                                const nextMilestone = goal.milestones?.find((milestone) => milestone.status === "PENDING");
                                const typeIcons = {
                                    SAVINGS: DollarSign,
                                    LEARNING: GraduationCap,
                                    WEDDING: Heart,
                                    FUTURE_SELF: Rocket,
                                    SOCIAL_CONTRACT: Sparkles,
                                    LONG_TERM_CHANGE: Target,
                                };
                                const GoalTypeIcon = typeIcons[(goal.type as keyof typeof typeIcons)] || Target;

                                return (
                                    <motion.div
                                        key={goal.id}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        transition={{ delay: index * 0.05 }}
                                    >
                                        <Card className={cn(
                                            "p-5 border-none rounded-3xl shadow-sm relative overflow-hidden",
                                            goal.is_completed
                                                ? "bg-gradient-to-br from-green-50 to-emerald-50"
                                                : "bg-white"
                                        )}>
                                            {/* Completed Badge */}
                                            {goal.is_completed && (
                                                <div className="absolute top-4 right-4">
                                                    <div className="flex items-center gap-1 px-2 py-1 bg-green-500 text-white rounded-full text-[10px] font-bold">
                                                        <CheckCircle2 size={12} />
                                                        Completed
                                                    </div>
                                                </div>
                                            )}

                                            {/* Header */}
                                            <div className="flex items-start gap-3 mb-4">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <GoalTypeIcon size={18} className={goal.type === "SAVINGS" ? "text-emerald-500" : "text-slate-400"} />
                                                        <h3 className={cn("font-black text-lg truncate", goal.is_completed ? "text-slate-500 line-through" : "text-slate-800")}>
                                                            {goal.title}
                                                        </h3>
                                                    </div>
                                                    
                                                    {goal.description && (
                                                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                                                            {goal.description}
                                                        </p>
                                                    )}
                                                    
                                                    <div className="flex flex-wrap items-center gap-2 mt-2">
                                                        {timeRemaining && (
                                                            <div className="flex items-center gap-1">
                                                                <Clock size={10} className={timeRemaining.color} />
                                                                <span className={cn("text-[10px] font-bold", timeRemaining.color)}>
                                                                    {timeRemaining.text}
                                                                </span>
                                                            </div>
                                                        )}
                                                        {goal.reminder_at && (
                                                            <div className="flex items-center gap-1">
                                                                <Bell size={10} className="text-pink-500" />
                                                                <span className="text-[10px] font-bold text-pink-500">
                                                                    {new Date(goal.reminder_at).toLocaleString([], { hour: '2-digit', minute:'2-digit', month: 'short', day: 'numeric' })}
                                                                </span>
                                                            </div>
                                                        )}
                                                        <div className={cn(
                                                            "px-2 py-0.5 rounded-full text-[9px] font-bold",
                                                            priorityConfig.bg,
                                                            priorityConfig.color
                                                        )}>
                                                            <Flag size={8} className="inline mr-1" />
                                                            {priorityConfig.label}
                                                        </div>
                                                        <div className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-slate-100 text-slate-600">
                                                            {GOAL_TYPE_DETAILS[goal.type as keyof typeof GOAL_TYPE_DETAILS]?.label || goal.type}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Progress / Checkbox */}
                                            {goal.type === "SAVINGS" ? (
                                                <div className="space-y-2 mb-4">
                                                    <div className="flex justify-between items-end">
                                                        <div>
                                                            <p className="text-2xl font-black text-slate-800">
                                                                ${parseFloat(String(goal.current_amount)).toFixed(0)}
                                                            </p>
                                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                                                                of ${parseFloat(String(goal.target_amount)).toFixed(0)}
                                                            </p>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className={cn("text-xl font-black", isSingle ? "text-emerald-600" : "text-romantic-heart")}>
                                                                {progress.toFixed(0)}%
                                                            </p>
                                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                                                                Progress
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                                                        <motion.div
                                                            initial={{ width: 0 }}
                                                            animate={{ width: `${Math.min(progress, 100)}%` }}
                                                            transition={{ duration: 1, ease: "easeOut" }}
                                                            className={cn(
                                                                "h-full rounded-full",
                                                                goal.is_completed ? "bg-green-500" : (isSingle ? "bg-emerald-500" : "bg-gradient-button")
                                                            )}
                                                        />
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="mb-4 rounded-2xl bg-slate-50 p-4">
                                                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Next milestone</p>
                                                    <p className="text-sm font-bold text-slate-800 mt-1">{nextMilestone?.title || "Roadmap will appear after save"}</p>
                                                    <p className="text-xs text-slate-500 mt-1">
                                                        {nextMilestone?.due_at ? new Date(nextMilestone.due_at).toLocaleDateString() : "No due date yet"}
                                                    </p>
                                                </div>
                                            )}

                                            {/* Actions */}
                                            {!goal.is_completed && (
                                                <div className="flex gap-2">
                                                    <Link
                                                        href={`/goals/${goal.id}/edit`}
                                                        className="flex-1 inline-flex items-center justify-center h-9 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-sm font-medium transition-all"
                                                    >
                                                        <Edit size={14} className="mr-1" />
                                                        Edit
                                                    </Link>
                                                    {(!goal.is_completed && goal.type === "SAVINGS" && progress >= 100) && (
                                                        <Button
                                                            size="sm"
                                                            onClick={(e) => {
                                                                e.preventDefault();
                                                                handleMarkComplete(goal.id);
                                                            }}
                                                            className="flex-1 rounded-full text-xs font-bold shadow-lg shadow-green-200"
                                                        >
                                                            <CheckCircle2 size={16} className="mr-1" />
                                                            Mark Complete
                                                        </Button>
                                                    )}
                                                    {(!goal.is_completed && goal.type !== "SAVINGS") && (
                                                        <Button
                                                            size="sm"
                                                            onClick={(e) => {
                                                                e.preventDefault();
                                                                handleMarkComplete(goal.id);
                                                            }}
                                                            className="flex-1 rounded-full text-xs font-bold shadow-lg bg-green-500 hover:bg-green-600 shadow-green-200"
                                                        >
                                                            <CheckCircle2 size={16} className="mr-1" />
                                                            Mark Complete
                                                        </Button>
                                                    )}
                                                </div>
                                            )}
                                        </Card>
                                        
                                        {/* Timeline Connector */}
                                        {filter === "timeline" && index < filteredGoals.length - 1 && (
                                            <div className="w-0.5 h-8 bg-slate-200 mx-auto my-2 rounded-full" />
                                        )}
                                    </motion.div>
                                );
                            })}
                        </AnimatePresence>
                    </div>
                )}
            </motion.div>

            {filteredGoals.length > 0 && filter !== "completed" && (
                <Link
                    href="/goals/create"
                    className={cn(
                        "fixed bottom-28 right-6 w-14 h-14 text-white rounded-full shadow-2xl flex items-center justify-center border-2 border-white z-50 transition-transform active:scale-95",
                        isSingle ? "bg-emerald-600 hover:bg-emerald-700" : "bg-gradient-button"
                    )}
                >
                    <Plus size={24} />
                </Link>
            )}

        </div>
    );
}
