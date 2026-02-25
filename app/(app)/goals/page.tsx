"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useCouple } from "@/hooks/use-couple";
import { useSavingsGoals, useUpdateSavingsGoal } from "@/hooks/use-savings-goals";
import { FullPageLoader } from "@/components/FullPageLoader";
import { cn } from "@/lib/utils";
import {
    Target,
    Plus,
    TrendingUp,
    Calendar,
    Sparkles,
    ArrowLeft,
    Trophy,
    Rocket,
    Home,
    Plane,
    Car,
    Heart,
    GraduationCap,
    Baby,
    DollarSign,
    CheckCircle2,
    Clock,
    Edit,
    Trash2,
    Flag,
} from "lucide-react";
import { format, differenceInDays, differenceInMonths, differenceInYears } from "date-fns";
import { AddGoalModal } from "@/components/goals/AddGoalModal";
import { EditGoalModal } from "@/components/goals/EditGoalModal";

const GOAL_ICONS: Record<string, any> = {
    Target: Target,
    Home: Home,
    Plane: Plane,
    Car: Car,
    Heart: Heart,
    GraduationCap: GraduationCap,
    Baby: Baby,
    Rocket: Rocket,
    Trophy: Trophy,
};

const PRIORITY_CONFIG = {
    high: { label: "High Priority", color: "text-red-600", bg: "bg-red-50", border: "border-red-200" },
    medium: { label: "Medium Priority", color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200" },
    low: { label: "Low Priority", color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-200" },
};

export default function GoalsPage() {
    const router = useRouter();
    const { user, couple, isLoading: coupleLoading } = useCouple();
    const { data: goals, isLoading: goalsLoading } = useSavingsGoals(couple?.id);
    const updateGoal = useUpdateSavingsGoal();

    const [addModalOpen, setAddModalOpen] = useState(false);
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [selectedGoal, setSelectedGoal] = useState<any>(null);
    const [filter, setFilter] = useState<"all" | "active" | "completed">("all");

    useEffect(() => {
        if (!coupleLoading && !user) {
            router.push("/login");
        }
    }, [user, coupleLoading, router]);

    // Filter goals
    const filteredGoals = useMemo(() => {
        if (!goals) return [];
        if (filter === "all") return goals;
        if (filter === "completed") return goals.filter(g => g.is_completed);
        return goals.filter(g => !g.is_completed);
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

    // Handle quick progress update
    const handleQuickUpdate = async (goalId: string, amount: number) => {
        if (!couple?.id) return;
        
        await updateGoal.mutateAsync({
            id: goalId,
            coupleId: couple.id,
            currentAmount: amount,
        });
    };

    // Handle mark as complete
    const handleMarkComplete = async (goalId: string) => {
        if (!couple?.id) return;
        
        await updateGoal.mutateAsync({
            id: goalId,
            coupleId: couple.id,
            isCompleted: true,
        });
    };

    if (coupleLoading) return <FullPageLoader />;

    if (!user || !couple) {
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
                            <Target className="text-romantic-heart" size={32} />
                            Savings Goals
                        </h1>
                        <p className="text-sm text-slate-500 mt-1 flex items-center gap-1">
                            Track your dreams together
                            <Sparkles className="text-romantic-heart" size={14} />
                        </p>
                    </div>
                    <a
                        href="/dashboard"
                        className="p-2 rounded-full bg-slate-50 hover:bg-slate-100 transition-colors"
                    >
                        <ArrowLeft className="text-slate-500" size={20} />
                    </a>
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
                    { value: "all", label: "All Goals" },
                    { value: "active", label: "Active" },
                    { value: "completed", label: "Completed" },
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
                            {filter === "completed" ? "No Completed Goals Yet" : "Start Your First Goal!"}
                        </h3>
                        <p className="text-sm text-slate-500 max-w-sm mx-auto mb-6">
                            {filter === "completed" 
                                ? "Complete your active goals to see them here"
                                : "Set a savings goal and track your progress together. Dream big!"
                            }
                        </p>
                        {filter !== "completed" && (
                            <Button
                                onClick={() => setAddModalOpen(true)}
                                className="rounded-full bg-gradient-button shadow-lg"
                            >
                                <Plus size={20} className="mr-2" />
                                Create Your First Goal
                            </Button>
                        )}
                    </Card>
                ) : (
                    <div className="space-y-4">
                        <AnimatePresence mode="popLayout">
                            {filteredGoals.map((goal, index) => {
                                const Icon = GOAL_ICONS[goal.icon] || Target;
                                const progress = (parseFloat(String(goal.current_amount)) / parseFloat(String(goal.target_amount))) * 100;
                                const timeRemaining = getTimeRemaining(goal.deadline);
                                const priorityConfig = PRIORITY_CONFIG[goal.priority as keyof typeof PRIORITY_CONFIG] || PRIORITY_CONFIG.medium;

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
                                                <div className={cn(
                                                    "p-3 rounded-2xl",
                                                    `bg-${goal.color}-100`
                                                )}>
                                                    <Icon className={`text-${goal.color}-600`} size={24} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="font-black text-slate-800 text-lg truncate">
                                                        {goal.title}
                                                    </h3>
                                                    {goal.description && (
                                                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                                                            {goal.description}
                                                        </p>
                                                    )}
                                                    <div className="flex items-center gap-2 mt-2">
                                                        {timeRemaining && (
                                                            <div className="flex items-center gap-1">
                                                                <Clock size={10} className={timeRemaining.color} />
                                                                <span className={cn("text-[10px] font-bold", timeRemaining.color)}>
                                                                    {timeRemaining.text}
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
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Progress */}
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
                                                        <p className="text-xl font-black text-romantic-heart">
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
                                                            goal.is_completed ? "bg-green-500" : "bg-gradient-button"
                                                        )}
                                                    />
                                                </div>
                                            </div>

                                            {/* Actions */}
                                            {!goal.is_completed && (
                                                <div className="flex gap-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => {
                                                            setSelectedGoal(goal);
                                                            setEditModalOpen(true);
                                                        }}
                                                        className="flex-1 rounded-full border-slate-200 hover:bg-slate-50"
                                                    >
                                                        <Edit size={14} className="mr-1" />
                                                        Edit
                                                    </Button>
                                                    {progress >= 100 && (
                                                        <Button
                                                            size="sm"
                                                            onClick={() => handleMarkComplete(goal.id)}
                                                            className="flex-1 rounded-full bg-green-500 hover:bg-green-600 text-white"
                                                        >
                                                            <Trophy size={14} className="mr-1" />
                                                            Mark Complete
                                                        </Button>
                                                    )}
                                                </div>
                                            )}
                                        </Card>
                                    </motion.div>
                                );
                            })}
                        </AnimatePresence>
                    </div>
                )}
            </motion.div>

            {/* Floating Add Button */}
            {filteredGoals.length > 0 && filter !== "completed" && (
                <motion.button
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.5, type: "spring" }}
                    onClick={() => setAddModalOpen(true)}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="fixed bottom-28 right-6 w-14 h-14 bg-gradient-button text-white rounded-full shadow-2xl flex items-center justify-center border-2 border-white z-50"
                >
                    <Plus size={24} />
                </motion.button>
            )}

            {/* Modals */}
            {couple?.id && (
                <>
                    <AddGoalModal
                        open={addModalOpen}
                        onOpenChange={setAddModalOpen}
                        coupleId={couple.id}
                    />
                    <EditGoalModal
                        open={editModalOpen}
                        onOpenChange={setEditModalOpen}
                        goal={selectedGoal}
                        coupleId={couple.id}
                    />
                </>
            )}
        </div>
    );
}
