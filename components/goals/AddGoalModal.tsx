"use client";

import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion } from "framer-motion";
import {
    Target, Home, Plane, Car, Heart, GraduationCap, Baby, Rocket, Trophy,
    Calendar, DollarSign, Flag, Sparkles
} from "lucide-react";
import { useCreateSavingsGoal } from "@/hooks/use-savings-goals";
import { cn } from "@/lib/utils";

interface AddGoalModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    coupleId: string;
}

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

export function AddGoalModal({ open, onOpenChange, coupleId }: AddGoalModalProps) {
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

    const handleSubmit = async () => {
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

            // Reset form
            setTitle("");
            setDescription("");
            setTargetAmount("");
            setCurrentAmount("");
            setDeadline("");
            setSelectedIcon("Target");
            setSelectedColor("purple");
            setPriority("medium");
            onOpenChange(false);
        } catch (err: any) {
            setError(err.message || "Failed to create goal");
        }
    };

    const handleClose = () => {
        setTitle("");
        setDescription("");
        setTargetAmount("");
        setCurrentAmount("");
        setDeadline("");
        setSelectedIcon("Target");
        setSelectedColor("purple");
        setPriority("medium");
        setError("");
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto rounded-3xl">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-black text-slate-800 flex items-center gap-2">
                        <Sparkles className="text-romantic-heart" size={24} />
                        Create Savings Goal
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Title */}
                    <div className="space-y-2">
                        <Label className="text-sm font-bold text-slate-700">Goal Title *</Label>
                        <Input
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="e.g., Dream Vacation, New Home, Wedding"
                            className="rounded-2xl border-slate-200 focus:border-romantic-heart"
                            maxLength={100}
                        />
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                        <Label className="text-sm font-bold text-slate-700">Description</Label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Add details about your goal..."
                            className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:border-romantic-heart focus:outline-none resize-none"
                            rows={3}
                            maxLength={500}
                        />
                    </div>

                    {/* Icon Selection */}
                    <div className="space-y-2">
                        <Label className="text-sm font-bold text-slate-700">Choose Icon</Label>
                        <div className="grid grid-cols-5 gap-2">
                            {GOAL_ICONS.map((item) => {
                                const Icon = item.icon;
                                const isSelected = selectedIcon === item.name;
                                return (
                                    <button
                                        key={item.name}
                                        onClick={() => {
                                            setSelectedIcon(item.name);
                                            setSelectedColor(item.color);
                                        }}
                                        className={cn(
                                            "p-2 rounded-xl transition-all flex items-center justify-center aspect-square",
                                            isSelected
                                                ? `bg-${item.color}-100 ring-1 ring-${item.color}-500`
                                                : "bg-slate-50 hover:bg-slate-100"
                                        )}
                                    >
                                        <Icon
                                            size={20}
                                            className={isSelected ? `text-${item.color}-600` : "text-slate-400"}
                                        />
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Target Amount */}
                    <div className="space-y-2">
                        <Label className="text-sm font-bold text-slate-700">Target Amount *</Label>
                        <div className="relative">
                            <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <Input
                                type="number"
                                value={targetAmount}
                                onChange={(e) => setTargetAmount(e.target.value)}
                                placeholder="0.00"
                                className="pl-11 rounded-2xl border-slate-200 focus:border-romantic-heart"
                                step="0.01"
                                min="0"
                            />
                        </div>
                    </div>

                    {/* Current Amount */}
                    <div className="space-y-2">
                        <Label className="text-sm font-bold text-slate-700">Current Savings (Optional)</Label>
                        <div className="relative">
                            <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <Input
                                type="number"
                                value={currentAmount}
                                onChange={(e) => setCurrentAmount(e.target.value)}
                                placeholder="0.00"
                                className="pl-11 rounded-2xl border-slate-200 focus:border-romantic-heart"
                                step="0.01"
                                min="0"
                            />
                        </div>
                    </div>

                    {/* Deadline */}
                    <div className="space-y-2">
                        <Label className="text-sm font-bold text-slate-700">Target Date (Optional)</Label>
                        <div className="relative">
                            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <Input
                                type="date"
                                value={deadline}
                                onChange={(e) => setDeadline(e.target.value)}
                                className="pl-11 rounded-2xl border-slate-200 focus:border-romantic-heart"
                                min={new Date().toISOString().split("T")[0]}
                            />
                        </div>
                    </div>

                    {/* Priority */}
                    <div className="space-y-2">
                        <Label className="text-sm font-bold text-slate-700">Priority</Label>
                        <div className="grid grid-cols-3 gap-2">
                            {PRIORITIES.map((p) => (
                                <button
                                    key={p.value}
                                    onClick={() => setPriority(p.value)}
                                    className={cn(
                                        "p-3 rounded-2xl font-bold text-sm transition-all",
                                        priority === p.value
                                            ? p.color + " ring-2 ring-offset-1"
                                            : "bg-slate-50 text-slate-400 hover:bg-slate-100"
                                    )}
                                >
                                    <span className="mr-1">{p.icon}</span>
                                    {p.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="p-3 bg-red-50 border border-red-200 rounded-2xl"
                        >
                            <p className="text-sm text-red-600 font-medium">{error}</p>
                        </motion.div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-3 pt-2">
                        <Button
                            variant="outline"
                            onClick={handleClose}
                            className="flex-1 rounded-full border-slate-200"
                            disabled={createGoal.isPending}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSubmit}
                            className="flex-1 rounded-full bg-gradient-button shadow-lg"
                            disabled={createGoal.isPending}
                        >
                            {createGoal.isPending ? "Creating..." : "Create Goal"}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
