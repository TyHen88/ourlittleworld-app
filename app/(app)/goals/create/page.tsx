"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
    Target, Calendar, DollarSign, Flag, Sparkles, ChevronLeft, Bell, GraduationCap, Rocket, Heart
} from "lucide-react";
import { useCreateSavingsGoal } from "@/hooks/use-savings-goals";
import { useCouple } from "@/hooks/use-couple";
import { GOAL_TYPE_DETAILS, GOAL_TYPES, GoalTypeValue } from "@/lib/goals";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FullPageLoader } from "@/components/FullPageLoader";


const PRIORITIES = [
    { value: "high", label: "High", color: "bg-red-100 text-red-600", icon: "🔥" },
    { value: "medium", label: "Medium", color: "bg-amber-100 text-amber-600", icon: "⚡" },
    { value: "low", label: "Low", color: "bg-blue-100 text-blue-600", icon: "💙" },
];

export default function CreateGoalPage() {
    const router = useRouter();
    const { user, profile, couple, isLoading: coupleLoading } = useCouple();
    const createGoal = useCreateSavingsGoal();

    const [goalType, setGoalType] = useState<GoalTypeValue>("SAVINGS");
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [targetAmount, setTargetAmount] = useState("");
    const [currentAmount, setCurrentAmount] = useState("");
    const [deadline, setDeadline] = useState("");
    const [reminderAt, setReminderAt] = useState("");
    const [profileFields, setProfileFields] = useState<Record<string, string>>({});

    const [priority, setPriority] = useState("medium");
    const [error, setError] = useState("");

    if (coupleLoading) return <FullPageLoader />;
    if (!user) return null;

    const isSingle = profile?.user_type === 'SINGLE';
    const coupleId = !isSingle ? couple?.id : undefined;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!title.trim()) {
            setError("Please enter a goal title");
            return;
        }

        if (goalType === "SAVINGS" && (!targetAmount || parseFloat(targetAmount) <= 0)) {
            setError("Please enter a valid target amount");
            return;
        }

        setError("");

        try {
            await createGoal.mutateAsync({
                userId: user.id,
                coupleId,
                title: title.trim(),
                description: description.trim() || undefined,
                targetAmount: goalType === "SAVINGS" ? parseFloat(targetAmount) : 0,
                currentAmount: goalType === "SAVINGS" && currentAmount ? parseFloat(currentAmount) : 0,

                deadline: deadline || undefined,
                reminderAt: reminderAt || undefined,
                type: goalType,
                priority,
                profile: profileFields,
            });

            router.push("/goals");
        } catch (err: any) {
            setError(err.message || "Failed to create goal");
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-romantic-warm via-white to-romantic-blush/20 p-6 pb-32">
            <div className="max-w-2xl mx-auto space-y-8">
                {/* Header */}
                <header className="flex items-center gap-4">
                    <button
                        onClick={() => router.back()}
                        className="p-3 rounded-2xl bg-white hover:bg-slate-50 transition-colors shadow-sm"
                    >
                        <ChevronLeft className="text-slate-600" size={24} />
                    </button>
                    <div>
                        <h1 className="text-3xl font-black text-slate-800 flex items-center gap-2">
                            <Target className={isSingle ? "text-emerald-500" : "text-romantic-heart"} size={28} />
                            {isSingle ? "New Personal Goal" : "New Savings Goal"}
                        </h1>
                        <p className="text-sm text-slate-500 mt-0.5">Start tracking your dreams</p>
                    </div>
                </header>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="bg-white/70 backdrop-blur-xl p-8 rounded-[2.5rem] shadow-xl border border-white/50 space-y-8">
                        
                        {/* Type Toggle */}
                        <div className="space-y-3">
                            <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Goal Type</Label>
                            <div className="grid grid-cols-2 gap-3">
                                {GOAL_TYPES.map((type) => {
                                    const icons = {
                                        SAVINGS: DollarSign,
                                        LEARNING: GraduationCap,
                                        WEDDING: Heart,
                                        FUTURE_SELF: Rocket,
                                        SOCIAL_CONTRACT: Sparkles,
                                        LONG_TERM_CHANGE: Target,
                                    };
                                    const Icon = icons[type];
                                    const selected = goalType === type;
                                    return (
                                        <button
                                            key={type}
                                            type="button"
                                            onClick={() => setGoalType(type)}
                                            className={cn(
                                                "rounded-[1.5rem] p-4 text-left border transition-all",
                                                selected ? "bg-white shadow-md border-pink-200" : "bg-slate-50 border-transparent hover:border-slate-200"
                                            )}
                                        >
                                            <div className="flex items-center gap-2">
                                                <Icon size={18} className={selected ? (isSingle ? "text-emerald-500" : "text-romantic-heart") : "text-slate-400"} />
                                                <span className="font-bold text-slate-800 text-sm">{GOAL_TYPE_DETAILS[type].label}</span>
                                            </div>
                                            <p className="text-xs text-slate-500 mt-2">{GOAL_TYPE_DETAILS[type].description}</p>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Title & Description */}
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Goal Title</Label>
                                <Input
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder={isSingle ? "e.g., Build a learning roadmap" : "e.g., Plan our wedding year"}
                                    className="rounded-2xl h-14 border-slate-100 focus:border-pink-300 focus:ring-pink-100 transition-all bg-white/50 text-lg font-bold"
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Description (Optional)</Label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Add details about your goal..."
                                    className="w-full min-h-[100px] p-4 rounded-2xl border border-slate-100 focus:border-pink-300 focus:ring-pink-100 focus:outline-none transition-all bg-white/50 text-sm"
                                />
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Type Details</Label>
                                <span className="text-[10px] font-bold uppercase tracking-wider text-pink-600">
                                    Auto roadmap will generate year, month, and day milestones
                                </span>
                            </div>
                            <div className="grid md:grid-cols-3 gap-4">
                                {GOAL_TYPE_DETAILS[goalType].fields.map((field) => (
                                    <div key={field.key} className="space-y-2">
                                        <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">{field.label}</Label>
                                        <Input
                                            value={profileFields[field.key] || ""}
                                            onChange={(e) => setProfileFields((prev) => ({ ...prev, [field.key]: e.target.value }))}
                                            placeholder={field.placeholder}
                                            className="rounded-2xl h-14 border-slate-100 bg-white/50"
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>


                        {/* Amounts (Only for SAVINGS) */}
                        {goalType === "SAVINGS" && (
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Target Amount</Label>
                                    <div className="relative">
                                        <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                        <Input
                                            type="number"
                                            value={targetAmount}
                                            onChange={(e) => setTargetAmount(e.target.value)}
                                            placeholder="0.00"
                                            className="pl-11 rounded-2xl h-14 border-slate-100 focus:border-pink-300 focus:ring-pink-100 transition-all bg-white/50 font-bold"
                                            step="0.01"
                                            min="0"
                                            required={goalType === "SAVINGS"}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Initial Savings</Label>
                                    <div className="relative">
                                        <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                        <Input
                                            type="number"
                                            value={currentAmount}
                                            onChange={(e) => setCurrentAmount(e.target.value)}
                                            placeholder="0.00"
                                            className="pl-11 rounded-2xl h-14 border-slate-100 focus:border-pink-300 focus:ring-pink-100 transition-all bg-white/50 font-bold"
                                            step="0.01"
                                            min="0"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Deadline & Reminder & Priority */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Target Date (Optional)</Label>
                                    <div className="relative">
                                        <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                        <Input
                                            type="date"
                                            value={deadline}
                                            onChange={(e) => setDeadline(e.target.value)}
                                            className="pl-11 rounded-2xl h-14 border-slate-100 focus:border-pink-300 focus:ring-pink-100 transition-all bg-white/50"
                                            min={new Date().toISOString().split("T")[0]}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1 text-pink-600">First Reminder Time (Optional)</Label>
                                    <div className="relative">
                                        <Bell className="absolute left-4 top-1/2 -translate-y-1/2 text-pink-400" size={18} />
                                        <Input
                                            type="datetime-local"
                                            value={reminderAt}
                                            onChange={(e) => setReminderAt(e.target.value)}
                                            className="pl-11 rounded-2xl h-14 border-pink-100 focus:border-pink-300 focus:ring-pink-200 transition-all bg-pink-50/50"
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Priority</Label>
                                <div className="grid grid-cols-3 gap-2">
                                    {PRIORITIES.map((p) => (
                                        <button
                                            key={p.value}
                                            type="button"
                                            onClick={() => setPriority(p.value)}
                                            className={cn(
                                                "py-3 px-1 rounded-2xl font-bold text-xs transition-all flex flex-col items-center justify-center gap-1",
                                                priority === p.value
                                                    ? p.color + " ring-2 ring-offset-1 shadow-md"
                                                    : "bg-white text-slate-400 hover:bg-slate-50"
                                            )}
                                        >
                                            <span className="text-base">{p.icon}</span>
                                            {p.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {error && (
                            <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-sm font-bold animate-shake">
                                {error}
                            </div>
                        )}

                        <Button
                            type="submit"
                            disabled={createGoal.isPending}
                            className={cn(
                                "w-full h-16 rounded-[2rem] text-white font-black text-xl shadow-xl active:scale-95 transition-all",
                                isSingle ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-100" : "bg-gradient-button shadow-pink-100"
                            )}
                        >
                            {createGoal.isPending ? "Creating Goal..." : (isSingle ? "Create Personal Goal" : "Create Shared Goal")}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
