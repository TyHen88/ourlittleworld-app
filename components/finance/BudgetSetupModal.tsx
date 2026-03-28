"use client";

import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DollarSign, TrendingUp } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useCouple } from "@/hooks/use-couple";
import { cn } from "@/lib/utils";

interface BudgetSetupModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    coupleId?: string;
    currentBudget?: {
        monthly_total: number;
        his_budget: number;
        hers_budget: number;
        shared_budget: number;
    };
}

export function BudgetSetupModal({ open, onOpenChange, coupleId, currentBudget }: BudgetSetupModalProps) {
    const { profile } = useCouple();
    const isSingle = profile?.user_type === 'SINGLE';
    const queryClient = useQueryClient();

    const [monthlyTotal, setMonthlyTotal] = useState(0);
    const [hisBudget, setHisBudget] = useState(0);
    const [hersBudget, setHersBudget] = useState(0);
    const [sharedBudget, setSharedBudget] = useState(0);
    const [error, setError] = useState("");
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!open) return;

        setMonthlyTotal(currentBudget?.monthly_total ?? 0);
        setHisBudget(currentBudget?.his_budget ?? 0);
        setHersBudget(currentBudget?.hers_budget ?? 0);
        setSharedBudget(currentBudget?.shared_budget ?? 0);
        setError("");
    }, [currentBudget, open]);

    // Calculate total allocation
    const totalAllocated = hisBudget + hersBudget + sharedBudget;
    const isBalanced = totalAllocated === monthlyTotal;
    const difference = monthlyTotal - totalAllocated;
    const monthlyTotalSafe = monthlyTotal > 0 ? monthlyTotal : 1;
    const formatCurrency = (value: number) => Number.isFinite(value) ? value.toFixed(2) : "0.00";
    const getPercentage = (value: number) => monthlyTotal > 0 ? Math.round((value / monthlyTotal) * 100) : 0;

    const handleSave = async () => {
        if (!isSingle && !isBalanced) {
            setError(`Budget allocation doesn't match total. ${difference > 0 ? 'Add' : 'Remove'} $${formatCurrency(Math.abs(difference))}`);
            return;
        }

        // For single users, just ensure sharedBudget (used as personal) matches monthlyTotal
        const finalSharedBudget = isSingle ? monthlyTotal : sharedBudget;
        const finalHisBudget = isSingle ? 0 : hisBudget;
        const finalHersBudget = isSingle ? 0 : hersBudget;
        const finalBudgetGoals = {
            monthly_total: monthlyTotal,
            his_budget: finalHisBudget,
            hers_budget: finalHersBudget,
            shared_budget: finalSharedBudget,
        };

        if (monthlyTotal <= 0) {
            setError("Monthly budget must be greater than 0");
            return;
        }

        setError("");
        setSaving(true);

        // Optimistic update - update budget summary cache immediately
        const summaryQueryKey = ['budget-summary', coupleId];
        const previousSummaryEntries = queryClient.getQueriesData({ queryKey: summaryQueryKey });

        queryClient.setQueriesData({ queryKey: summaryQueryKey }, (old: any) => {
            if (!old) {
                // If no summary exists, create minimal structure with new budget
                return {
                    budget_goals: finalBudgetGoals,
                    income: { his: 0, hers: 0, shared: 0, total: 0 },
                    expenses: { his: 0, hers: 0, shared: 0, total: 0 },
                    balance: {
                        his: finalHisBudget,
                        hers: finalHersBudget,
                        shared: finalSharedBudget,
                        total: monthlyTotal
                    },
                    percentage: 0,
                    status: 'healthy',
                    transactions_count: 0,
                };
            }

            // Recalculate balance with new budget goals
            const newBalance = {
                his: finalHisBudget + (old.income?.his || 0) - (old.expenses?.his || 0),
                hers: finalHersBudget + (old.income?.hers || 0) - (old.expenses?.hers || 0),
                shared: finalSharedBudget + (old.income?.shared || 0) - (old.expenses?.shared || 0),
                total: 0,
            };
            newBalance.total = newBalance.his + newBalance.hers + newBalance.shared;

            return {
                ...old,
                budget_goals: finalBudgetGoals,
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
                    hisBudget: finalHisBudget,
                    hersBudget: finalHersBudget,
                    sharedBudget: finalSharedBudget,
                }),
            });

            const json = await res.json();

            if (!res.ok) {
                throw new Error(json.error || "Failed to update budget");
            }

            // Confirm with server data
            queryClient.invalidateQueries({ queryKey: summaryQueryKey });
        } catch (err: any) {
            // Rollback on error
            for (const [key, value] of previousSummaryEntries) {
                queryClient.setQueryData(key, value);
            }
            setError(err.message || "Failed to update budget");
            onOpenChange(true);
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                className="top-auto left-0 right-0 bottom-0 max-w-none translate-x-0 translate-y-0 rounded-t-[2rem] rounded-b-none border-none bg-white/95 p-6 shadow-2xl backdrop-blur-xl data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom sm:left-1/2 sm:right-auto sm:bottom-4 sm:w-full sm:max-w-[420px] sm:-translate-x-1/2 sm:rounded-3xl sm:rounded-b-3xl"
                showCloseButton={false}
            >
                <DialogHeader className="text-center">
                    <div className="mx-auto mb-1 h-1.5 w-14 rounded-full bg-slate-200" />
                    <DialogTitle className="text-center text-xl font-bold text-slate-800 flex items-center justify-center gap-2">
                        <TrendingUp className={isSingle ? "text-emerald-500" : "text-romantic-heart"} size={20} />
                        {isSingle ? "Set Starting Balance" : "Set Starting Balance"}
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-3">
                    {/* Monthly Total */}
                    <div className="text-center">
                        <label className="text-[10px] font-bold text-slate-500 mb-1.5 block uppercase tracking-wide">{isSingle ? "Starting Balance" : "Total Starting Balance"}</label>
                        <div className="relative">
                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-500" size={20} />
                            <Input
                                type="number"
                                step="0.01"
                                min="0"
                                placeholder="0.00"
                                value={monthlyTotal === 0 ? "" : monthlyTotal}
                                onChange={(e) => setMonthlyTotal(parseFloat(e.target.value) || 0)}
                                className={cn(
                                    "pl-10 text-2xl font-black h-12 rounded-2xl text-center border-2",
                                    isSingle ? "border-emerald-100 focus:border-emerald-500" : "border-romantic-blush/30 focus:border-romantic-heart"
                                )}
                                autoFocus
                            />
                        </div>
                    </div>

                    {!isSingle && (
                        <>
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
                                        <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wide">Mine</label>
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-sm font-black text-slate-800">${formatCurrency(hisBudget)}</span>
                                            <span className="text-[10px] text-slate-400 font-medium">{getPercentage(hisBudget)}%</span>
                                        </div>
                                    </div>
                                    <input
                                        type="range"
                                        min="0"
                                        max={monthlyTotalSafe}
                                        step="50"
                                        value={hisBudget}
                                        onChange={(e) => setHisBudget(parseFloat(e.target.value))}
                                        className="w-full h-2 rounded-full appearance-none cursor-pointer"
                                        style={{
                                            background: `linear-gradient(to right, #FFE4E1 0%, #FFE4E1 ${(hisBudget / monthlyTotalSafe) * 100}%, #e5e7eb ${(hisBudget / monthlyTotalSafe) * 100}%, #e5e7eb 100%)`
                                        }}
                                    />
                                </div>

                                {/* Hers Budget */}
                                <div>
                                    <div className="flex items-center justify-between mb-1.5">
                                        <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wide">Partner</label>
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-sm font-black text-slate-800">${formatCurrency(hersBudget)}</span>
                                            <span className="text-[10px] text-slate-400 font-medium">{getPercentage(hersBudget)}%</span>
                                        </div>
                                    </div>
                                    <input
                                        type="range"
                                        min="0"
                                        max={monthlyTotalSafe}
                                        step="50"
                                        value={hersBudget}
                                        onChange={(e) => setHersBudget(parseFloat(e.target.value))}
                                        className="w-full h-2 rounded-full appearance-none cursor-pointer"
                                        style={{
                                            background: `linear-gradient(to right, #E6E6FA 0%, #E6E6FA ${(hersBudget / monthlyTotalSafe) * 100}%, #e5e7eb ${(hersBudget / monthlyTotalSafe) * 100}%, #e5e7eb 100%)`
                                        }}
                                    />
                                </div>

                                {/* Shared Budget */}
                                <div>
                                    <div className="flex items-center justify-between mb-1.5">
                                        <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wide">Shared</label>
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-sm font-black text-slate-800">${formatCurrency(sharedBudget)}</span>
                                            <span className="text-[10px] text-slate-400 font-medium">{getPercentage(sharedBudget)}%</span>
                                        </div>
                                    </div>
                                    <input
                                        type="range"
                                        min="0"
                                        max={monthlyTotalSafe}
                                        step="50"
                                        value={sharedBudget}
                                        onChange={(e) => setSharedBudget(parseFloat(e.target.value))}
                                        className="w-full h-2 rounded-full appearance-none cursor-pointer"
                                        style={{
                                            background: `linear-gradient(to right, #D4F4DD 0%, #D4F4DD ${(sharedBudget / monthlyTotalSafe) * 100}%, #e5e7eb ${(sharedBudget / monthlyTotalSafe) * 100}%, #e5e7eb 100%)`
                                        }}
                                    />
                                </div>
                            </div>

                            {/* Balance Check - Compact */}
                            {!isBalanced && (
                                <div className="flex items-center justify-center p-2 rounded-xl bg-amber-50">
                                    <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wide">
                                        {difference > 0 ? `$${formatCurrency(difference)} left` : `$${formatCurrency(Math.abs(difference))} over`}
                                    </span>
                                </div>
                            )}
                        </>
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
                            disabled={saving || (!isSingle && !isBalanced)}
                            className={cn(
                                "flex-1 rounded-full shadow-lg",
                                isSingle ? "bg-emerald-500 hover:bg-emerald-600" : "bg-gradient-button"
                            )}
                        >
                            {saving ? "Saving..." : "Save Balance"}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
