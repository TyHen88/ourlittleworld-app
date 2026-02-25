"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import { useCouple } from "@/hooks/use-couple";
import { useTransactions } from "@/hooks/use-transactions";
import { FullPageLoader } from "@/components/FullPageLoader";
import { cn } from "@/lib/utils";
import {
    Calendar as CalendarIcon,
    ChevronLeft,
    ChevronRight,
    TrendingDown,
    TrendingUp,
    ArrowLeft,
    Flame,
    Sparkles,
    Eye,
    EyeOff,
    BarChart3,
    Heart,
    ShoppingBag,
    Coffee,
    Home,
} from "lucide-react";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    ResponsiveContainer,
    Cell,
    Tooltip,
} from "recharts";
import {
    format,
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    eachDayOfInterval,
    isSameMonth,
    isSameDay,
    isToday,
    addMonths,
    subMonths,
    getWeek,
} from "date-fns";

const CATEGORY_ICONS: Record<string, any> = {
    Shopping: ShoppingBag,
    Coffee: Coffee,
    Home: Home,
    Shared: Heart,
};

const PAYER_COLORS = {
    HIS: "bg-romantic-blush text-romantic-heart",
    HERS: "bg-romantic-lavender text-slate-600",
    SHARED: "bg-romantic-mint text-emerald-600",
};

const PAYER_DOT_COLORS = {
    HIS: "bg-pink-400",
    HERS: "bg-violet-400",
    SHARED: "bg-emerald-400",
};

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface Transaction {
    id: string;
    couple_id: string;
    amount: number;
    category: string;
    note: string | null;
    payer: "HIS" | "HERS" | "SHARED";
    created_by: string;
    transaction_date: string;
    created_at: string;
    updated_at: string;
    type?: "INCOME" | "EXPENSE";
    creator: {
        id: string;
        full_name: string | null;
        avatar_url: string | null;
    };
}

export default function CalendarPage() {
    const router = useRouter();
    const { user, couple, isLoading: coupleLoading } = useCouple();
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [showWeeklyChart, setShowWeeklyChart] = useState(true);

    useEffect(() => {
        if (!coupleLoading && !user) {
            router.push("/login");
        }
    }, [user, coupleLoading, router]);

    const monthStr = format(currentMonth, "yyyy-MM");
    const { data: transactions, isLoading: txLoading } = useTransactions(couple?.id, { month: monthStr });

    // Group transactions by date
    const txByDate = useMemo(() => {
        const map: Record<string, Transaction[]> = {};
        if (!transactions) return map;
        transactions.forEach((tx: Transaction) => {
            const dateKey = format(new Date(tx.transaction_date), "yyyy-MM-dd");
            if (!map[dateKey]) map[dateKey] = [];
            map[dateKey].push(tx);
        });
        return map;
    }, [transactions]);

    // Calculate daily totals for heat intensity
    const dailyTotals = useMemo(() => {
        const map: Record<string, { expense: number; income: number }> = {};
        if (!transactions) return map;
        transactions.forEach((tx: Transaction) => {
            const dateKey = format(new Date(tx.transaction_date), "yyyy-MM-dd");
            if (!map[dateKey]) map[dateKey] = { expense: 0, income: 0 };
            const amount = parseFloat(String(tx.amount));
            if (tx.type === "INCOME") {
                map[dateKey].income += amount;
            } else {
                map[dateKey].expense += amount;
            }
        });
        return map;
    }, [transactions]);

    // Max expense for heat scale
    const maxExpense = useMemo(() => {
        const values = Object.values(dailyTotals).map((d) => d.expense);
        return Math.max(...values, 1);
    }, [dailyTotals]);

    // Weekly summary data for bar chart
    const weeklyData = useMemo(() => {
        const monthStart = startOfMonth(currentMonth);
        const monthEnd = endOfMonth(currentMonth);
        const weeks: Record<number, { week: string; expense: number; income: number; weekNum: number }> = {};

        if (!transactions) return [];

        transactions.forEach((tx: Transaction) => {
            const txDate = new Date(tx.transaction_date);
            if (txDate < monthStart || txDate > monthEnd) return;
            const weekNum = getWeek(txDate);
            if (!weeks[weekNum]) {
                weeks[weekNum] = {
                    week: `W${Object.keys(weeks).length + 1}`,
                    expense: 0,
                    income: 0,
                    weekNum,
                };
            }
            const amount = parseFloat(String(tx.amount));
            if (tx.type === "INCOME") {
                weeks[weekNum].income += amount;
            } else {
                weeks[weekNum].expense += amount;
            }
        });

        return Object.values(weeks).sort((a, b) => a.weekNum - b.weekNum);
    }, [transactions, currentMonth]);

    // Calendar days grid
    const calendarDays = useMemo(() => {
        const monthStart = startOfMonth(currentMonth);
        const monthEnd = endOfMonth(currentMonth);
        const calStart = startOfWeek(monthStart);
        const calEnd = endOfWeek(monthEnd);
        return eachDayOfInterval({ start: calStart, end: calEnd });
    }, [currentMonth]);

    // Month totals
    const monthTotals = useMemo(() => {
        let expense = 0;
        let income = 0;
        if (!transactions) return { expense, income };
        transactions.forEach((tx: Transaction) => {
            const amount = parseFloat(String(tx.amount));
            if (tx.type === "INCOME") income += amount;
            else expense += amount;
        });
        return { expense, income };
    }, [transactions]);

    // Selected date transactions
    const selectedDateTx = selectedDate
        ? txByDate[format(selectedDate, "yyyy-MM-dd")] || []
        : [];

    const selectedDateTotal = selectedDateTx.reduce((sum, tx) => {
        const amount = parseFloat(String(tx.amount));
        return tx.type === "INCOME" ? sum - amount : sum + amount;
    }, 0);

    // Get heat intensity color (0-4 scale)
    const getHeatColor = (dateKey: string) => {
        const total = dailyTotals[dateKey]?.expense || 0;
        if (total === 0) return "";
        const ratio = total / maxExpense;
        if (ratio < 0.25) return "bg-blue-50 text-blue-700";
        if (ratio < 0.5) return "bg-blue-100 text-blue-800";
        if (ratio < 0.75) return "bg-orange-100 text-orange-800";
        return "bg-red-100 text-red-800";
    };

    // Get payer dots for a date
    const getPayerDots = (dateKey: string) => {
        const txs = txByDate[dateKey];
        if (!txs) return [];
        const payers = new Set(txs.map((tx) => tx.payer));
        return Array.from(payers);
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
                            <CalendarIcon className="text-romantic-heart" size={32} />
                            Calendar
                        </h1>
                        <p className="text-sm text-slate-500 mt-1 flex items-center gap-1">
                            Visualize your spending by date
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

            {/* Month Summary Cards */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="grid grid-cols-2 gap-3"
            >
                <Card className="p-4 border-none bg-gradient-to-br from-red-50 to-orange-50 rounded-3xl shadow-sm">
                    <div className="flex items-center gap-2 mb-1">
                        <TrendingDown className="text-red-500" size={16} />
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Spent</span>
                    </div>
                    <p className="text-2xl font-black text-slate-800">${monthTotals.expense.toFixed(0)}</p>
                    <p className="text-[10px] text-slate-400 mt-1">{format(currentMonth, "MMMM yyyy")}</p>
                </Card>
                <Card className="p-4 border-none bg-gradient-to-br from-green-50 to-emerald-50 rounded-3xl shadow-sm">
                    <div className="flex items-center gap-2 mb-1">
                        <TrendingUp className="text-green-500" size={16} />
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Income</span>
                    </div>
                    <p className="text-2xl font-black text-slate-800">${monthTotals.income.toFixed(0)}</p>
                    <p className="text-[10px] text-slate-400 mt-1">{format(currentMonth, "MMMM yyyy")}</p>
                </Card>
            </motion.div>

            {/* Month Navigation */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
            >
                <Card className="p-4 border-none bg-white/80 backdrop-blur-md shadow-sm rounded-3xl">
                    <div className="flex items-center justify-between mb-4">
                        <button
                            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                            className="p-2 rounded-full hover:bg-slate-100 transition-colors"
                        >
                            <ChevronLeft className="text-slate-500" size={20} />
                        </button>
                        <div className="text-center">
                            <h2 className="text-lg font-black text-slate-800">
                                {format(currentMonth, "MMMM yyyy")}
                            </h2>
                            {txLoading && (
                                <span className="text-[10px] text-slate-400 animate-pulse">Loading...</span>
                            )}
                        </div>
                        <button
                            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                            className="p-2 rounded-full hover:bg-slate-100 transition-colors"
                        >
                            <ChevronRight className="text-slate-500" size={20} />
                        </button>
                    </div>

                    {/* Weekday Headers */}
                    <div className="grid grid-cols-7 gap-1 mb-1">
                        {WEEKDAYS.map((day) => (
                            <div
                                key={day}
                                className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-wider py-1"
                            >
                                {day}
                            </div>
                        ))}
                    </div>

                    {/* Calendar Grid */}
                    <div className="grid grid-cols-7 gap-1">
                        {calendarDays.map((day, idx) => {
                            const dateKey = format(day, "yyyy-MM-dd");
                            const inMonth = isSameMonth(day, currentMonth);
                            const isSelected = selectedDate && isSameDay(day, selectedDate);
                            const today = isToday(day);
                            const heatColor = getHeatColor(dateKey);
                            const dots = getPayerDots(dateKey);
                            const dayTotal = dailyTotals[dateKey];

                            return (
                                <motion.button
                                    key={idx}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={() => setSelectedDate(isSelected ? null : day)}
                                    className={cn(
                                        "relative aspect-square flex flex-col items-center justify-center rounded-xl transition-all text-xs",
                                        !inMonth && "opacity-30",
                                        inMonth && !heatColor && "hover:bg-slate-50",
                                        inMonth && heatColor,
                                        isSelected && "!bg-romantic-heart !text-white ring-2 ring-romantic-heart/30 ring-offset-1",
                                        today && !isSelected && "ring-1 ring-romantic-heart/40",
                                    )}
                                >
                                    <span
                                        className={cn(
                                            "font-bold text-[13px] leading-none",
                                            !inMonth && "text-slate-300",
                                            inMonth && !heatColor && "text-slate-700",
                                            isSelected && "text-white",
                                        )}
                                    >
                                        {format(day, "d")}
                                    </span>

                                    {/* Spending amount (small) */}
                                    {dayTotal && dayTotal.expense > 0 && !isSelected && inMonth && (
                                        <span className="text-[8px] font-bold leading-none mt-0.5 opacity-70">
                                            ${dayTotal.expense.toFixed(0)}
                                        </span>
                                    )}

                                    {/* Payer dots */}
                                    {dots.length > 0 && inMonth && (
                                        <div className="flex gap-0.5 mt-0.5">
                                            {dots.map((payer) => (
                                                <div
                                                    key={payer}
                                                    className={cn(
                                                        "w-1 h-1 rounded-full",
                                                        isSelected ? "bg-white/80" : PAYER_DOT_COLORS[payer],
                                                    )}
                                                />
                                            ))}
                                        </div>
                                    )}

                                    {/* Today indicator */}
                                    {today && !isSelected && (
                                        <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-romantic-heart rounded-full" />
                                    )}
                                </motion.button>
                            );
                        })}
                    </div>

                    {/* Legend */}
                    <div className="flex items-center justify-center gap-3 mt-4 pt-3 border-t border-slate-100">
                        <div className="flex items-center gap-1">
                            <div className="w-2 h-2 rounded-full bg-pink-400" />
                            <span className="text-[9px] font-bold text-slate-400 uppercase">His</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <div className="w-2 h-2 rounded-full bg-violet-400" />
                            <span className="text-[9px] font-bold text-slate-400 uppercase">Hers</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <div className="w-2 h-2 rounded-full bg-emerald-400" />
                            <span className="text-[9px] font-bold text-slate-400 uppercase">Shared</span>
                        </div>
                        <div className="h-3 w-px bg-slate-200" />
                        <div className="flex items-center gap-1">
                            <div className="w-3 h-2 rounded-sm bg-blue-50 border border-blue-200" />
                            <span className="text-[9px] text-slate-400">Low</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <div className="w-3 h-2 rounded-sm bg-red-100 border border-red-200" />
                            <span className="text-[9px] text-slate-400">High</span>
                        </div>
                    </div>
                </Card>
            </motion.div>

            {/* Selected Day Detail */}
            <AnimatePresence mode="wait">
                {selectedDate && (
                    <motion.div
                        key={format(selectedDate, "yyyy-MM-dd")}
                        initial={{ opacity: 0, y: 20, height: 0 }}
                        animate={{ opacity: 1, y: 0, height: "auto" }}
                        exit={{ opacity: 0, y: -10, height: 0 }}
                        transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                    >
                        <Card className="p-5 border-none bg-gradient-to-br from-romantic-blush/20 to-white shadow-sm rounded-3xl overflow-hidden">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h3 className="font-black text-slate-800 text-base">
                                        {format(selectedDate, "EEEE, MMM d")}
                                    </h3>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                                        {selectedDateTx.length} transaction{selectedDateTx.length !== 1 ? "s" : ""}
                                    </p>
                                </div>
                                {selectedDateTx.length > 0 && (
                                    <div className="text-right">
                                        <p className="text-lg font-black text-slate-800">
                                            ${Math.abs(selectedDateTotal).toFixed(0)}
                                        </p>
                                        <p className="text-[10px] font-bold text-red-400 uppercase tracking-wider">
                                            Net Spent
                                        </p>
                                    </div>
                                )}
                            </div>

                            {selectedDateTx.length === 0 ? (
                                <div className="text-center py-6">
                                    <Sparkles className="text-slate-300 mx-auto mb-2" size={24} />
                                    <p className="text-sm text-slate-400 font-medium">No transactions this day</p>
                                    <p className="text-[10px] text-slate-300 mt-1">A peaceful day for your wallet!</p>
                                </div>
                            ) : (
                                <div className="space-y-1">
                                    {selectedDateTx.map((tx) => {
                                        const Icon = CATEGORY_ICONS[tx.category] || Heart;
                                        const isIncome = tx.type === "INCOME";
                                        const amount = parseFloat(String(tx.amount));

                                        return (
                                            <motion.div
                                                key={tx.id}
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                className="flex items-center gap-3 p-3 rounded-2xl hover:bg-white/60 transition-colors"
                                            >
                                                <div className="relative">
                                                    <div className={cn("p-2 rounded-xl", PAYER_COLORS[tx.payer])}>
                                                        <Icon size={14} />
                                                    </div>
                                                    <div
                                                        className={cn(
                                                            "absolute -bottom-0.5 -right-0.5 rounded-full p-0.5",
                                                            isIncome ? "bg-green-500" : "bg-red-500",
                                                        )}
                                                    >
                                                        {isIncome ? (
                                                            <TrendingUp size={7} className="text-white" />
                                                        ) : (
                                                            <TrendingDown size={7} className="text-white" />
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-bold text-slate-800 truncate">
                                                        {tx.note || tx.category}
                                                    </p>
                                                    <div className="flex items-center gap-1.5 mt-0.5">
                                                        <span className="text-[10px] text-slate-400">{tx.category}</span>
                                                        <span className="text-[10px] text-slate-300">•</span>
                                                        <span
                                                            className={cn(
                                                                "text-[9px] px-1.5 py-0.5 rounded-md font-bold uppercase",
                                                                PAYER_COLORS[tx.payer],
                                                            )}
                                                        >
                                                            {tx.payer === "SHARED" ? "Us" : tx.payer === "HIS" ? "His" : "Hers"}
                                                        </span>
                                                    </div>
                                                </div>

                                                <span
                                                    className={cn(
                                                        "text-sm font-black whitespace-nowrap",
                                                        isIncome ? "text-green-600" : "text-slate-900",
                                                    )}
                                                >
                                                    {isIncome ? "+" : "-"}${amount.toFixed(0)}
                                                </span>
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            )}
                        </Card>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Weekly Breakdown Chart */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
            >
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <BarChart3 className="text-romantic-heart" size={20} />
                        Weekly Breakdown
                    </h3>
                    <button
                        onClick={() => setShowWeeklyChart(!showWeeklyChart)}
                        className="p-2 rounded-full hover:bg-slate-100 transition-colors"
                    >
                        {showWeeklyChart ? (
                            <EyeOff className="text-slate-400" size={16} />
                        ) : (
                            <Eye className="text-slate-400" size={16} />
                        )}
                    </button>
                </div>

                <AnimatePresence>
                    {showWeeklyChart && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                        >
                            <Card className="p-5 border-none bg-white/80 backdrop-blur-md shadow-sm rounded-3xl">
                                {weeklyData.length === 0 ? (
                                    <div className="text-center py-8">
                                        <BarChart3 className="text-slate-300 mx-auto mb-2" size={32} />
                                        <p className="text-sm text-slate-400 font-medium">No data for this month</p>
                                    </div>
                                ) : (
                                    <div className="h-48">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={weeklyData} barGap={4}>
                                                <XAxis
                                                    dataKey="week"
                                                    axisLine={false}
                                                    tickLine={false}
                                                    tick={{ fontSize: 11, fontWeight: 700, fill: "#94a3b8" }}
                                                />
                                                <YAxis
                                                    axisLine={false}
                                                    tickLine={false}
                                                    tick={{ fontSize: 10, fill: "#cbd5e1" }}
                                                    tickFormatter={(v) => `$${v}`}
                                                    width={45}
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
                                                    formatter={(value?: number, name?: string) => [
                                                        `$${(value ?? 0).toFixed(0)}`,
                                                        name === "expense" ? "Expense" : "Income",
                                                    ]}
                                                />
                                                <Bar
                                                    dataKey="expense"
                                                    radius={[8, 8, 0, 0]}
                                                    maxBarSize={32}
                                                >
                                                    {weeklyData.map((_, index) => (
                                                        <Cell
                                                            key={`expense-${index}`}
                                                            fill="#FFB4AB"
                                                        />
                                                    ))}
                                                </Bar>
                                                <Bar
                                                    dataKey="income"
                                                    radius={[8, 8, 0, 0]}
                                                    maxBarSize={32}
                                                >
                                                    {weeklyData.map((_, index) => (
                                                        <Cell
                                                            key={`income-${index}`}
                                                            fill="#86EFAC"
                                                        />
                                                    ))}
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                )}

                                {/* Weekly Stats */}
                                {weeklyData.length > 0 && (
                                    <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-100">
                                        {weeklyData.map((week) => (
                                            <div
                                                key={week.week}
                                                className="flex items-center justify-between p-2 rounded-xl bg-slate-50/80"
                                            >
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                                                    {week.week}
                                                </span>
                                                <div className="flex items-center gap-2">
                                                    {week.income > 0 && (
                                                        <span className="text-[10px] font-bold text-green-500">
                                                            +${week.income.toFixed(0)}
                                                        </span>
                                                    )}
                                                    <span className="text-xs font-black text-slate-700">
                                                        -${week.expense.toFixed(0)}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </Card>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>

            {/* Spending Streaks */}
            {transactions && transactions.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.35 }}
                >
                    <Card className="p-5 border-none bg-gradient-to-br from-amber-50/50 to-white shadow-sm rounded-3xl">
                        <div className="flex items-center gap-2 mb-3">
                            <Flame className="text-amber-500" size={18} />
                            <h4 className="font-bold text-slate-800 text-sm">Spending Insights</h4>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                            <div className="text-center p-3 bg-white/60 rounded-2xl">
                                <p className="text-xl font-black text-slate-800">
                                    {Object.keys(txByDate).length}
                                </p>
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-1">
                                    Active Days
                                </p>
                            </div>
                            <div className="text-center p-3 bg-white/60 rounded-2xl">
                                <p className="text-xl font-black text-slate-800">
                                    {transactions ? transactions.length : 0}
                                </p>
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-1">
                                    Transactions
                                </p>
                            </div>
                            <div className="text-center p-3 bg-white/60 rounded-2xl">
                                <p className="text-xl font-black text-slate-800">
                                    ${transactions && transactions.length > 0
                                        ? (monthTotals.expense / Object.keys(txByDate).length || 0).toFixed(0)
                                        : 0}
                                </p>
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-1">
                                    Avg/Day
                                </p>
                            </div>
                        </div>
                    </Card>
                </motion.div>
            )}
        </div>
    );
}
