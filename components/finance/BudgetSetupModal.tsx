"use client";

import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import { DollarSign, TrendingUp } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

interface BudgetSetupModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    coupleId: string;
    currentBudget?: {
        monthly_total: number;
        his_budget: number;
        hers_budget: number;
        shared_budget: number;
    };
}

export function BudgetSetupModal({ open, onOpenChange, coupleId, currentBudget }: BudgetSetupModalProps) {
    const queryClient = useQueryClient();

    const [monthlyTotal, setMonthlyTotal] = useState(currentBudget?.monthly_total || 2000);
    const [hisBudget, setHisBudget] = useState(currentBudget?.his_budget || 600);
    const [hersBudget, setHersBudget] = useState(currentBudget?.hers_budget || 500);
    const [sharedBudget, setSharedBudget] = useState(currentBudget?.shared_budget || 900);
    const [error, setError] = useState("");
    const [saving, setSaving] = useState(false);

    // Update state when currentBudget changes
    useEffect(() => {
        if (currentBudget) {
            setMonthlyTotal(currentBudget.monthly_total);
            setHisBudget(currentBudget.his_budget);
            setHersBudget(currentBudget.hers_budget);
            setSharedBudget(currentBudget.shared_budget);
        }
    }, [currentBudget]);

    // Calculate total allocation
    const totalAllocated = hisBudget + hersBudget + sharedBudget;
    const isBalanced = totalAllocated === monthlyTotal;
    const difference = monthlyTotal - totalAllocated;

    const handleSave = async () => {
        if (!isBalanced) {
            setError(`Budget allocation doesn't match total. ${difference > 0 ? 'Add' : 'Remove'} $${Math.abs(difference)}`);
            return;
        }

        if (monthlyTotal <= 0) {
            setError("Monthly budget must be greater than 0");
            return;
        }

        setError("");
        setSaving(true);

        // Optimistic update - update budget summary cache immediately
        const previousData = queryClient.getQueryData(['budget-summary', coupleId, undefined]);

        queryClient.setQueryData(['budget-summary', coupleId, undefined], (old: any) => {
            if (!old) {
                // If no summary exists, create minimal structure with new budget
                return {
                    budget_goals: {
                        monthly_total: monthlyTotal,
                        his_budget: hisBudget,
                        hers_budget: hersBudget,
                        shared_budget: sharedBudget,
                    },
                    income: { his: 0, hers: 0, shared: 0, total: 0 },
                    expenses: { his: 0, hers: 0, shared: 0, total: 0 },
                    balance: { his: hisBudget, hers: hersBudget, shared: sharedBudget, total: monthlyTotal },
                    percentage: 0,
                    status: 'healthy',
                    transactions_count: 0,
                };
            }

            const newBudgetGoals = {
                monthly_total: monthlyTotal,
                his_budget: hisBudget,
                hers_budget: hersBudget,
                shared_budget: sharedBudget,
            };

            // Recalculate balance with new budget goals
            const newBalance = {
                his: hisBudget + (old.income?.his || 0) - (old.expenses?.his || 0),
                hers: hersBudget + (old.income?.hers || 0) - (old.expenses?.hers || 0),
                shared: sharedBudget + (old.income?.shared || 0) - (old.expenses?.shared || 0),
                total: 0,
            };
            newBalance.total = newBalance.his + newBalance.hers + newBalance.shared;

            return {
                ...old,
                budget_goals: newBudgetGoals,
                balance: newBalance,
            };
        });

        // Close modal immediately
        onOpenChange(false);

        // Save to server in background
        try {
            const res = await fetch("/api/budget/goals", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    coupleId,
                    monthlyTotal,
                    hisBudget,
                    hersBudget,
                    sharedBudget,
                }),
            });

            const json = await res.json();

            if (!res.ok) {
                throw new Error(json.error || "Failed to update budget");
            }

            // Confirm with server data
            queryClient.invalidateQueries({ queryKey: ['budget-summary', coupleId, undefined] });
        } catch (err: any) {
            // Rollback on error
            queryClient.setQueryData(['budget-summary', coupleId, undefined], previousData);
            setError(err.message || "Failed to update budget");
            onOpenChange(true);
        } finally {
            setSaving(false);
        }
    };

    const handleAutoBalance = () => {
        // Auto-distribute remaining budget
        if (difference !== 0) {
            const perCategory = Math.floor(difference / 3);
            const remainder = difference % 3;

            setHisBudget(hisBudget + perCategory);
            setHersBudget(hersBudget + perCategory);
            setSharedBudget(sharedBudget + perCategory + remainder);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[420px] border-none shadow-2xl bg-white/95 backdrop-blur-xl rounded-3xl p-6">
                <DialogHeader>
                    <DialogTitle className="text-center text-xl font-bold text-slate-800 flex items-center justify-center gap-2">
                        <TrendingUp className="text-romantic-heart" size={20} />
                        Set Base Budget
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-3">
                    {/* Monthly Total */}
                    <div className="text-center">
                        <label className="text-[10px] font-bold text-slate-500 mb-1.5 block uppercase tracking-wide">Total Starting Amount</label>
                        <div className="relative">
                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-romantic-heart" size={20} />
                            <Input
                                type="number"
                                step="100"
                                placeholder="2000"
                                value={monthlyTotal}
                                onChange={(e) => setMonthlyTotal(parseFloat(e.target.value) || 0)}
                                className="pl-10 text-2xl font-black h-12 rounded-2xl text-center border-2 border-romantic-blush/30 focus:border-romantic-heart"
                                autoFocus
                            />
                        </div>
                    </div>

                    {/* Divider */}
                    <div className="relative py-1">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-slate-200"></div>
                        </div>
                        <div className="relative flex justify-center text-[10px]">
                            <span className="bg-white px-2 text-slate-400 font-bold uppercase tracking-wide">Allocate</span>
                        </div>
                    </div>

                    {/* Allocation with Sliders */}
                    <div className="space-y-3">
                        {/* His Budget */}
                        <div>
                            <div className="flex items-center justify-between mb-1.5">
                                <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wide">His</label>
                                <div className="flex items-center gap-1.5">
                                    <span className="text-sm font-black text-slate-800">${hisBudget}</span>
                                    <span className="text-[10px] text-slate-400 font-medium">{Math.round((hisBudget / monthlyTotal) * 100)}%</span>
                                </div>
                            </div>
                            <input
                                type="range"
                                min="0"
                                max={monthlyTotal}
                                step="50"
                                value={hisBudget}
                                onChange={(e) => setHisBudget(parseFloat(e.target.value))}
                                className="w-full h-2 rounded-full appearance-none cursor-pointer"
                                style={{
                                    background: `linear-gradient(to right, #FFE4E1 0%, #FFE4E1 ${(hisBudget / monthlyTotal) * 100}%, #e5e7eb ${(hisBudget / monthlyTotal) * 100}%, #e5e7eb 100%)`
                                }}
                            />
                        </div>

                        {/* Hers Budget */}
                        <div>
                            <div className="flex items-center justify-between mb-1.5">
                                <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wide">Hers</label>
                                <div className="flex items-center gap-1.5">
                                    <span className="text-sm font-black text-slate-800">${hersBudget}</span>
                                    <span className="text-[10px] text-slate-400 font-medium">{Math.round((hersBudget / monthlyTotal) * 100)}%</span>
                                </div>
                            </div>
                            <input
                                type="range"
                                min="0"
                                max={monthlyTotal}
                                step="50"
                                value={hersBudget}
                                onChange={(e) => setHersBudget(parseFloat(e.target.value))}
                                className="w-full h-2 rounded-full appearance-none cursor-pointer"
                                style={{
                                    background: `linear-gradient(to right, #E6E6FA 0%, #E6E6FA ${(hersBudget / monthlyTotal) * 100}%, #e5e7eb ${(hersBudget / monthlyTotal) * 100}%, #e5e7eb 100%)`
                                }}
                            />
                        </div>

                        {/* Shared Budget */}
                        <div>
                            <div className="flex items-center justify-between mb-1.5">
                                <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wide">Shared</label>
                                <div className="flex items-center gap-1.5">
                                    <span className="text-sm font-black text-slate-800">${sharedBudget}</span>
                                    <span className="text-[10px] text-slate-400 font-medium">{Math.round((sharedBudget / monthlyTotal) * 100)}%</span>
                                </div>
                            </div>
                            <input
                                type="range"
                                min="0"
                                max={monthlyTotal}
                                step="50"
                                value={sharedBudget}
                                onChange={(e) => setSharedBudget(parseFloat(e.target.value))}
                                className="w-full h-2 rounded-full appearance-none cursor-pointer"
                                style={{
                                    background: `linear-gradient(to right, #D4F4DD 0%, #D4F4DD ${(sharedBudget / monthlyTotal) * 100}%, #e5e7eb ${(sharedBudget / monthlyTotal) * 100}%, #e5e7eb 100%)`
                                }}
                            />
                        </div>
                    </div>

                    {/* Balance Check - Compact */}
                    {!isBalanced && (
                        <div className="flex items-center justify-between p-2 rounded-xl bg-amber-50">
                            <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wide">
                                {difference > 0 ? `$${difference} left` : `$${Math.abs(difference)} over`}
                            </span>
                            <button
                                onClick={handleAutoBalance}
                                className="text-[10px] font-bold text-romantic-heart hover:underline uppercase tracking-wide"
                            >
                                Auto Fix
                            </button>
                        </div>
                    )}

                    {error && (
                        <div className="text-xs text-red-500 text-center font-bold">
                            {error}
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-2 pt-1">
                        <Button
                            variant="ghost"
                            onClick={() => onOpenChange(false)}
                            className="flex-1 rounded-full"
                            disabled={saving}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSave}
                            disabled={saving || !isBalanced}
                            className="flex-1 rounded-full bg-gradient-button shadow-lg"
                        >
                            {saving ? "💾 Saving..." : "✓ Save"}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
