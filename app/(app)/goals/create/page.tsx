"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
    Target, Home, Plane, Car, Heart, GraduationCap, Baby, Rocket, Trophy,
    Calendar, DollarSign, Flag, Sparkles
} from "lucide-react";
import { useCreateSavingsGoal } from "@/hooks/use-savings-goals";
import { useCouple } from "@/hooks/use-couple";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FullPageLoader } from "@/components/FullPageLoader";
import { AppBackButton } from "@/components/navigation/AppBackButton";

const GOAL_ICONS = [
    { name: "Target", icon: Target, color: "purple" },
    { name: "Home", icon: Home, color: "blue" },
    { name: "Plane", icon: Plane, color: "sky" },
    { name: "Car", icon: Car, color: "indigo" },
    { name: "Heart", icon: Heart, color: "pink" },
    { name: "GraduationCap", icon: GraduationCap, color: "green" },
    { name: "Baby", icon: Baby, color: "rose" },
    { name: "Rocket", icon: Rocket, color: "violet" },
    { name: "Trophy", icon: Trophy, color: "amber" },
];

const PRIORITIES = [
    { value: "high", label: "High", color: "bg-red-100 text-red-600", icon: "🔥" },
    { value: "medium", label: "Medium", color: "bg-amber-100 text-amber-600", icon: "⚡" },
    { value: "low", label: "Low", color: "bg-blue-100 text-blue-600", icon: "💙" },
];

export default function CreateGoalPage() {
    const router = useRouter();
    const { user, profile, couple, isLoading: coupleLoading } = useCouple();
    const createGoal = useCreateSavingsGoal();

    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [targetAmount, setTargetAmount] = useState("");
    const [currentAmount, setCurrentAmount] = useState("");
    const [deadline, setDeadline] = useState("");
    const [selectedIcon, setSelectedIcon] = useState("Target");
    const [selectedColor, setSelectedColor] = useState("purple");
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

        if (!targetAmount || parseFloat(targetAmount) <= 0) {
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
                targetAmount: parseFloat(targetAmount),
                currentAmount: currentAmount ? parseFloat(currentAmount) : 0,
                icon: selectedIcon,
                color: selectedColor,
                deadline: deadline || undefined,
                priority,
            });

            router.push("/goals");
        } catch (error) {
            setError(error instanceof Error ? error.message : "Failed to create goal");
        }
    };

    return (
        <div className="min-h-[100dvh] bg-gradient-to-br from-romantic-warm via-white to-romantic-blush/20 p-6 pb-32">
            <div className="max-w-2xl mx-auto space-y-8">
                {/* Header */}
                <header className="flex items-center gap-4">
                    <AppBackButton
                        fallbackHref="/goals"
                    />
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
                        {/* Title & Description */}
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Goal Title</Label>
                                <Input
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder={isSingle ? "e.g., Reading list, Fitness goal" : "e.g., Dream Vacation, New Home"}
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

                        {/* Icon Selection */}
                        <div className="space-y-3">
                            <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Choose Icon</Label>
                            <div className="grid grid-cols-5 gap-3">
                                {GOAL_ICONS.map((item) => {
                                    const Icon = item.icon;
                                    const isSelected = selectedIcon === item.name;
                                    return (
                                        <button
                                            key={item.name}
                                            type="button"
                                            onClick={() => {
                                                setSelectedIcon(item.name);
                                                setSelectedColor(item.color);
                                            }}
                                            className={cn(
                                                "p-4 rounded-2xl transition-all flex items-center justify-center aspect-square shadow-sm",
                                                isSelected
                                                    ? `bg-${item.color}-100 ring-2 ring-${item.color}-500 ring-offset-2`
                                                    : "bg-white hover:bg-slate-50"
                                            )}
                                        >
                                            <Icon
                                                size={24}
                                                className={isSelected ? `text-${item.color}-600` : "text-slate-400"}
                                            />
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Amounts */}
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
                                        required
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

                        {/* Deadline & Priority */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                            {createGoal.isPending ? "Creating Goal..." : (isSingle ? "Create Personal Goal" : "Create Savings Goal")}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
