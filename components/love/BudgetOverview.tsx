"use client";
import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowUpRight, PiggyBank, Settings, TrendingDown, Wallet } from "lucide-react";
import { useBudgetSummary } from "@/hooks/use-transactions";
import { BudgetSetupModal } from "@/components/finance/BudgetSetupModal";
import { useCouple } from "@/hooks/use-couple";
import { cn } from "@/lib/utils";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

interface BudgetOverviewProps {
    id?: string;
    period?: "day" | "month" | "year";
    date?: string;
}

export function BudgetOverview({ id, period = "month", date }: BudgetOverviewProps) {
    const { profile } = useCouple();
    const isSingle = profile?.user_type === 'SINGLE';
    const { data: summary, isLoading } = useBudgetSummary(id, { period, date });
    const [setupModalOpen, setSetupModalOpen] = useState(false);

    if (isLoading) {
        return (
            <Card className="p-6 border-none shadow-xl bg-white/80 backdrop-blur-md rounded-4xl">
                <div className="h-40 flex items-center justify-center">
                    <div className="animate-pulse text-slate-400">Loading...</div>
                </div>
            </Card>
        );
    }

    if (!summary) {
        return null;
    }

    const startingBalance = summary.budget_goals?.monthly_total ?? 0;
    const totalIncome = summary.income?.total ?? 0;
    const totalSpent = summary.expenses?.total ?? 0;
    const savedAmount = totalIncome - totalSpent;
    const remainingBalance = startingBalance + totalIncome - totalSpent;
    const categoryBreakdown = summary.category_breakdown ?? {};
    const topCategories = Object.entries(categoryBreakdown)
        .map(([name, value]) => ({
            name,
            value: Number(value ?? 0),
            share: totalSpent > 0 ? Math.round((Number(value ?? 0) / totalSpent) * 100) : 0,
        }))
        .filter((item) => item.value > 0)
        .sort((a, b) => b.value - a.value)
        .slice(0, 4);
    const categoryChartData = topCategories.map((item, index) => ({
        ...item,
        color: isSingle
            ? index === 0
                ? "#10b981"
                : index === 1
                    ? "#6366f1"
                    : index === 2
                        ? "#f59e0b"
                        : "#94a3b8"
            : index === 0
                ? "#fb7185"
                : index === 1
                    ? "#818cf8"
                    : index === 2
                        ? "#34d399"
                        : "#94a3b8",
    }));

    const total = summary.balance?.total ?? 0;
    const periodLabel = period === "day" ? "Today" : period === "year" ? "This Year" : "This Month";
    const summaryCards = isSingle
        ? [
            { label: "Income", value: totalIncome, icon: ArrowUpRight, tone: "text-emerald-700", bg: "bg-emerald-50" },
            { label: "Spent", value: totalSpent, icon: TrendingDown, tone: "text-rose-700", bg: "bg-rose-50" },
            { label: "Saved", value: savedAmount, icon: PiggyBank, tone: savedAmount >= 0 ? "text-indigo-700" : "text-amber-700", bg: savedAmount >= 0 ? "bg-indigo-50" : "bg-amber-50" },
            { label: "Remaining", value: remainingBalance, icon: Wallet, tone: remainingBalance >= 0 ? "text-sky-700" : "text-rose-700", bg: remainingBalance >= 0 ? "bg-sky-50" : "bg-rose-50" },
        ]
        : [
            { label: "Money In", value: totalIncome, icon: ArrowUpRight, tone: "text-emerald-700", bg: "bg-emerald-50" },
            { label: "Money Out", value: totalSpent, icon: TrendingDown, tone: "text-rose-700", bg: "bg-rose-50" },
            { label: "Current Balance", value: total, icon: Wallet, tone: "text-romantic-heart", bg: "bg-romantic-blush/20" },
            { label: "Starting Balance", value: startingBalance, icon: PiggyBank, tone: "text-slate-700", bg: "bg-slate-50" },
        ];

    return (
        <>
            <Card className="p-6 border-none shadow-xl bg-white/80 backdrop-blur-md rounded-4xl relative">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSetupModalOpen(true)}
                    className={cn(
                        "absolute top-4 right-4 rounded-full text-slate-400 transition-colors",
                        isSingle ? "hover:text-emerald-500 hover:bg-emerald-50" : "hover:text-romantic-heart hover:bg-romantic-blush/20"
                    )}
                >
                    <Settings size={18} />
                </Button>

                <div className="space-y-6">
                    <div className="pr-10">
                        <p className={cn(
                            "text-[11px] font-black uppercase tracking-[0.24em]",
                            isSingle ? "text-emerald-600/70" : "text-romantic-heart/70"
                        )}>
                            {isSingle ? "My Balance" : "Shared Balance"}
                        </p>
                        <h3 className="text-2xl font-black text-slate-900 mt-2">{periodLabel} balance summary</h3>
                        <p className="text-sm text-slate-500 mt-1">
                            {isSingle
                                ? "See how much you earned, spent, saved, and what remains for the selected period."
                                : "See how much came in, went out, and what remains in your shared balance for the selected period."}
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        {summaryCards.map((item) => {
                            const Icon = item.icon;
                            return (
                                <div key={item.label} className={cn("rounded-3xl p-4", item.bg)}>
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">{item.label}</span>
                                        <Icon className={item.tone} size={16} />
                                    </div>
                                    <p className="text-2xl font-black text-slate-900 mt-3">${item.value.toFixed(0)}</p>
                                </div>
                            );
                        })}
                    </div>

                    <div className="rounded-3xl bg-slate-50/80 p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h4 className="text-sm font-black text-slate-800">Category Breakdown</h4>
                                <p className="text-xs text-slate-500 mt-1">Where the money went in the selected period</p>
                            </div>
                        </div>

                        <div className="mt-4">
                            {categoryChartData.length > 0 ? (
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-[180px_1fr] items-center">
                                    <div className="h-44 w-full">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={categoryChartData}
                                                    dataKey="value"
                                                    nameKey="name"
                                                    innerRadius={42}
                                                    outerRadius={68}
                                                    paddingAngle={4}
                                                    stroke="none"
                                                >
                                                    {categoryChartData.map((item) => (
                                                        <Cell key={item.name} fill={item.color} />
                                                    ))}
                                                </Pie>
                                                <Tooltip
                                                    formatter={(value?: number) => [`$${Number(value ?? 0).toFixed(0)}`, "Spent"]}
                                                    contentStyle={{
                                                        borderRadius: 14,
                                                        border: "none",
                                                        boxShadow: "0 8px 28px rgba(15, 23, 42, 0.12)",
                                                        fontSize: 12,
                                                        fontWeight: 700,
                                                    }}
                                                />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>

                                    <div className="space-y-3">
                                        {categoryChartData.map((item) => (
                                            <div key={item.name} className="flex items-center justify-between rounded-2xl bg-white px-4 py-3">
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <span
                                                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                                        style={{ backgroundColor: item.color }}
                                                    />
                                                    <span className="font-semibold text-sm text-slate-700 truncate">{item.name}</span>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-sm font-black text-slate-900">${item.value.toFixed(0)}</p>
                                                    <p className="text-[11px] font-semibold text-slate-400">{item.share}%</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="rounded-2xl bg-white p-4 text-sm text-slate-500">
                                    Add a few entries and your spending breakdown will appear here.
                                </div>
                            )}
                        </div>
                    </div>

                    {!isSingle && (
                        <div className="grid grid-cols-3 gap-2">
                            {[
                                { label: "Mine", value: summary.balance?.his ?? 0 },
                                { label: "Partner", value: summary.balance?.hers ?? 0 },
                                { label: "Shared", value: summary.balance?.shared ?? 0 },
                            ].map((item) => (
                                <div key={item.label} className="rounded-2xl bg-slate-50 p-3 text-center">
                                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{item.label}</p>
                                    <p className="text-sm font-black text-slate-900 mt-1">${item.value.toFixed(0)}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </Card>

            {id && (
                <BudgetSetupModal
                    open={setupModalOpen}
                    onOpenChange={setSetupModalOpen}
                    coupleId={id}
                    currentBudget={summary?.budget_goals}
                />
            )}
        </>
    );
}
