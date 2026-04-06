"use client";
import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowUpRight, PiggyBank, Settings, TrendingDown, Wallet } from "lucide-react";
import { useBudgetSummary } from "@/hooks/use-transactions";
import { BudgetSetupModal } from "@/components/finance/BudgetSetupModal";
import { useCouple } from "@/hooks/use-couple";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

interface BudgetOverviewProps {
    id?: string;
    period?: "day" | "month" | "year";
    date?: string;
}

function formatBudgetAmount(value: number) {
    return `$${value.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

function getBudgetCategoryTickLabel(value: string) {
    const trimmed = value.trim();

    if (trimmed.length <= 8) {
        return trimmed;
    }

    const firstWord = trimmed.split(/\s+/)[0] ?? trimmed;

    if (firstWord.length <= 8) {
        return firstWord;
    }

    return `${trimmed.slice(0, 7)}…`;
}

export function BudgetOverview({ id, period = "month", date }: BudgetOverviewProps) {
    const { profile } = useCouple();
    const isSingle = profile?.user_type === 'SINGLE';
    const { data: summary, isLoading } = useBudgetSummary(id, { period, date });
    const [setupModalOpen, setSetupModalOpen] = useState(false);

    if (isLoading) {
        return (
            <Card className="rounded-[2rem] border border-slate-200/80 bg-white/90 p-5 shadow-sm">
                <div className="space-y-5">
                    <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
                        <div className="space-y-2">
                            <Skeleton className="h-4 w-24 rounded-full" />
                            <Skeleton className="h-7 w-36 rounded-2xl" />
                        </div>
                        <Skeleton className="size-9 rounded-2xl" />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        {[1, 2, 3, 4].map((item) => (
                            <div key={item} className="rounded-3xl border border-slate-200/80 bg-slate-50/80 p-4">
                                <div className="flex items-center justify-between gap-3">
                                    <Skeleton className="h-4 w-20 rounded-full" />
                                    <Skeleton className="size-8 rounded-2xl" />
                                </div>
                                <Skeleton className="mt-4 h-7 w-24 rounded-2xl" />
                            </div>
                        ))}
                    </div>

                    <div className="space-y-4 rounded-3xl border border-slate-200/80 bg-slate-50/70 p-4">
                        <div className="space-y-2">
                            <Skeleton className="h-4 w-32 rounded-full" />
                            <Skeleton className="h-3 w-40 rounded-full" />
                        </div>
                        <Skeleton className="h-48 w-full rounded-3xl" />
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                            {[1, 2, 3, 4].map((item) => (
                                <div key={item} className="rounded-2xl border border-slate-200/70 bg-white px-4 py-3">
                                    <div className="flex items-center justify-between gap-3">
                                        <Skeleton className="h-4 w-24 rounded-full" />
                                        <Skeleton className="h-4 w-12 rounded-full" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
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
        shortLabel: getBudgetCategoryTickLabel(item.name),
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
    const summaryCards = isSingle
        ? [
            {
                label: "Income",
                value: totalIncome,
                icon: ArrowUpRight,
                iconTone: "bg-emerald-100 text-emerald-700",
                surfaceTone: "border-emerald-100 bg-emerald-50/70",
            },
            {
                label: "Spent",
                value: totalSpent,
                icon: TrendingDown,
                iconTone: "bg-rose-100 text-rose-700",
                surfaceTone: "border-rose-100 bg-rose-50/70",
            },
            {
                label: "Saved",
                value: savedAmount,
                icon: PiggyBank,
                iconTone: savedAmount >= 0 ? "bg-indigo-100 text-indigo-700" : "bg-amber-100 text-amber-700",
                surfaceTone: savedAmount >= 0 ? "border-indigo-100 bg-indigo-50/70" : "border-amber-100 bg-amber-50/70",
            },
            {
                label: "Remaining",
                value: remainingBalance,
                icon: Wallet,
                iconTone: remainingBalance >= 0 ? "bg-sky-100 text-sky-700" : "bg-rose-100 text-rose-700",
                surfaceTone: remainingBalance >= 0 ? "border-sky-100 bg-sky-50/70" : "border-rose-100 bg-rose-50/70",
            },
        ]
        : [
            {
                label: "Money in",
                value: totalIncome,
                icon: ArrowUpRight,
                iconTone: "bg-emerald-100 text-emerald-700",
                surfaceTone: "border-emerald-100 bg-emerald-50/70",
            },
            {
                label: "Money out",
                value: totalSpent,
                icon: TrendingDown,
                iconTone: "bg-rose-100 text-rose-700",
                surfaceTone: "border-rose-100 bg-rose-50/70",
            },
            {
                label: "Current balance",
                value: total,
                icon: Wallet,
                iconTone: "bg-romantic-blush/45 text-romantic-heart",
                surfaceTone: "border-romantic-blush/70 bg-romantic-blush/15",
            },
            {
                label: "Starting balance",
                value: startingBalance,
                icon: PiggyBank,
                iconTone: "bg-slate-100 text-slate-700",
                surfaceTone: "border-slate-200 bg-slate-50/70",
            },
        ];

    return (
        <>
            <Card className="relative rounded-[2rem] border border-slate-200/80 bg-white/90 p-5 shadow-sm">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSetupModalOpen(true)}
                    className={cn(
                        "absolute right-4 top-4 rounded-2xl text-slate-400 transition-colors",
                        isSingle ? "hover:bg-emerald-50 hover:text-emerald-500" : "hover:bg-romantic-blush/20 hover:text-romantic-heart"
                    )}
                >
                    <Settings size={18} />
                </Button>

                <div className="space-y-5">
                    <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4 pr-10">
                        <div>
                            <p className="text-sm font-black text-slate-800">
                                {isSingle ? "Balance overview" : "Shared balance overview"}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                                A simpler view of what came in, what went out, and what is left.
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        {summaryCards.map((item) => {
                            const Icon = item.icon;
                            return (
                                <div
                                    key={item.label}
                                    className={cn("rounded-3xl border p-4", item.surfaceTone)}
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <p className="text-xs font-semibold text-slate-500">{item.label}</p>
                                            <p className="mt-3 text-xl font-black tracking-tight text-slate-900">
                                                {formatBudgetAmount(item.value)}
                                            </p>
                                        </div>
                                        <div className={cn("inline-flex size-9 shrink-0 items-center justify-center rounded-2xl", item.iconTone)}>
                                            <Icon size={17} />
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="rounded-3xl border border-slate-200/80 bg-slate-50/70 p-4">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <h4 className="text-sm font-black text-slate-800">Category Breakdown</h4>
                                <p className="text-xs text-slate-500 mt-1">Where the money went in the selected period</p>
                            </div>
                        </div>

                        <div className="mt-4">
                            {categoryChartData.length > 0 ? (
                                <div className="h-48 rounded-3xl bg-white/85 px-2 py-3">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={categoryChartData} barGap={6}>
                                            <XAxis
                                                dataKey="shortLabel"
                                                axisLine={false}
                                                tickLine={false}
                                                tick={{ fontSize: 11, fontWeight: 700, fill: "#94a3b8" }}
                                            />
                                            <YAxis
                                                axisLine={false}
                                                tickLine={false}
                                                tick={{ fontSize: 10, fill: "#cbd5e1" }}
                                                tickFormatter={(value) => `$${value}`}
                                                width={48}
                                            />
                                            <Tooltip
                                                cursor={{ fill: "rgba(0,0,0,0.03)", radius: 8 }}
                                                contentStyle={{
                                                    borderRadius: 16,
                                                    border: "none",
                                                    boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
                                                    fontSize: 12,
                                                    fontWeight: 700,
                                                }}
                                                formatter={(value?: number) => [formatBudgetAmount(Number(value ?? 0)), "Spent"]}
                                                labelFormatter={(_, payload) => {
                                                    const category = payload?.[0]?.payload?.name;
                                                    return typeof category === "string" ? category : "Category";
                                                }}
                                            />
                                            <Bar
                                                dataKey="value"
                                                radius={[8, 8, 0, 0]}
                                                maxBarSize={34}
                                            >
                                                {categoryChartData.map((item) => (
                                                    <Cell key={item.name} fill={item.color} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            ) : (
                                <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-4 text-sm text-slate-500">
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
                                <div key={item.label} className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-3 text-center">
                                    <p className="text-[11px] font-semibold text-slate-500">{item.label}</p>
                                    <p className="mt-1 text-sm font-black text-slate-900">{formatBudgetAmount(item.value)}</p>
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
