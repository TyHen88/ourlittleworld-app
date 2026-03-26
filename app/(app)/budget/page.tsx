"use client";
import React, { useState } from "react";
import { BudgetOverview } from "@/components/love/BudgetOverview";
import { TransactionCard } from "@/components/love/TransactionCard";
import { TransactionDetailModal } from "@/components/love/TransactionDetailModal";
import { AddTransactionModal } from "@/components/finance/AddTransactionModal";
import { BudgetSetupModal } from "@/components/finance/BudgetSetupModal";
import { useCouple } from "@/hooks/use-couple";
import { useTransactions, useBudgetSummary } from "@/hooks/use-transactions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus, Sparkles, TrendingUp, Heart, Wallet, Smile, AlertTriangle, AlertCircle, DollarSign, Stars, CalendarDays } from "lucide-react";
import { motion } from "framer-motion";
import { FullPageLoader } from "@/components/FullPageLoader";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import Link from "next/link";

export default function BudgetPage() {
    const { user, couple, profile } = useCouple();
    const isSingle = profile?.user_type === 'SINGLE';
    const id = couple?.id || user?.id;
    const period = "month" as const;
    const currentDate = format(new Date(), "yyyy-MM-dd");
    const [transactionModalOpen, setTransactionModalOpen] = useState(false);
    const [budgetModalOpen, setBudgetModalOpen] = useState(false);
    const [selectedTransaction, setSelectedTransaction] = useState<any>(null);
    const [detailModalOpen, setDetailModalOpen] = useState(false);
    const { data: transactions, isLoading } = useTransactions(id, { period, date: currentDate });
    const { data: summary, isLoading: summaryLoading } = useBudgetSummary(id, { period, date: currentDate });

    // Check if budget is setup (budget_goals exists and has valid data)
    const hasBudget = summary?.budget_goals !== null &&
        summary?.budget_goals !== undefined &&
        summary?.budget_goals?.monthly_total > 0;

    // Show full page loader while initial data is loading
    const isLoadingInitial = (isLoading || summaryLoading) && !transactions && !summary;

    if (isLoadingInitial) {
        return <FullPageLoader />;
    }

    const getStatusMessage = () => {
        if (!summary) return null;
        const { status } = summary;
        const totalBalance = summary?.balance?.total ?? 0;
        const netFlow = (summary?.income?.total ?? 0) - (summary?.expenses?.total ?? 0);
        const periodLabel = "this month";

        if (status === "healthy") {
            return {
                icon: Smile,
                title: "Balance Looks Healthy",
                message: isSingle
                    ? `Your current balance trend is positive ${periodLabel}. Net change: $${netFlow.toFixed(0)}.`
                    : `Your shared balance is stable ${periodLabel}. Current balance: $${totalBalance.toFixed(0)}.`,
                color: "text-green-600",
                bg: "bg-green-50"
            };
        } else if (status === "warning") {
            return {
                icon: AlertTriangle,
                title: "Watch Your Balance",
                message: `Money out is starting to catch up ${periodLabel}. Current balance: $${totalBalance.toFixed(0)}.`,
                color: "text-amber-600",
                bg: "bg-amber-50"
            };
        } else {
            return {
                icon: AlertCircle,
                title: "Balance Running Low",
                message: `You need to review money in and money out ${periodLabel}. Current balance: $${totalBalance.toFixed(0)}.`,
                color: "text-red-600",
                bg: "bg-red-50"
            };
        }
    };

    const statusInfo = getStatusMessage();

    return (
        <div className="p-6 space-y-6 max-w-2xl mx-auto pb-32">
            <motion.header
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-3"
            >
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-black text-slate-800 flex items-center gap-2">
                            <Wallet className={isSingle ? "text-emerald-500" : "text-romantic-heart"} size={32} />
                            {isSingle ? "My Balance" : "Shared Balance"}
                        </h1>
                        <p className="text-sm text-slate-500 mt-1 flex items-center gap-1">
                            {isSingle ? "Track what you earned, spent, saved, and what remains" : "Track what came in, what went out, and what remains together"}
                            <Sparkles className={isSingle ? "text-emerald-500" : "text-romantic-heart"} size={14} />
                        </p>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-2xl bg-slate-50 px-4 py-3">
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Focus</p>
                        <p className="text-sm font-black text-slate-800">Manage income and expense entries</p>
                    </div>
                    <div className="flex gap-2">
                        <Link href="/calendar">
                            <Button variant="outline" className="rounded-2xl">
                                <CalendarDays size={16} className="mr-2" />
                                Filter in Calendar
                            </Button>
                        </Link>
                    </div>
                </div>
            </motion.header>

            {statusInfo && transactions && transactions.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1 }}
                >
                    <Card className={`p-4 border-none ${statusInfo.bg} rounded-3xl`}>
                        <div className="flex items-start gap-3">
                            <statusInfo.icon className={statusInfo.color} size={24} />
                            <div className="flex-1">
                                <h3 className={`font-bold ${statusInfo.color}`}>{statusInfo.title}</h3>
                                <p className="text-sm text-slate-600 mt-1">{statusInfo.message}</p>
                            </div>
                        </div>
                    </Card>
                </motion.div>
            )}

            {hasBudget && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                >
                    <BudgetOverview id={id} period={period} date={currentDate} />
                </motion.div>
            )}

            {!hasBudget && !summaryLoading && (
                <>
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.2 }}
                        className="text-center"
                    >
                        <Card className="p-8 border-2 border-dashed border-romantic-blush/30 bg-white/50 rounded-3xl">
                            <div className="space-y-4">
                                <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center ${isSingle ? 'bg-emerald-500' : 'bg-gradient-to-br from-romantic-blush to-romantic-lavender'}`}>
                                    {isSingle ? <TrendingUp className="text-white" size={32} /> : <Heart className="text-white" size={32} />}
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-slate-800 flex items-center justify-center gap-2">
                                        {isSingle ? "Start Tracking Your Balance" : "Start Tracking Together"}
                                        {isSingle ? <Stars className="text-emerald-500" size={20} /> : <Heart className="text-romantic-heart" size={20} />}
                                    </h3>
                                    <p className="text-sm text-slate-500 mt-2 max-w-sm mx-auto">
                                        {isSingle ? "Set your starting balance, then track income and expenses month by month." : "Set your shared starting balance, split it clearly, and track money together over time."}
                                    </p>
                                </div>
                                <Button
                                    size="lg"
                                    onClick={() => setBudgetModalOpen(true)}
                                    className={`rounded-full shadow-lg mt-4 ${isSingle ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-gradient-button'}`}
                                >
                                    <TrendingUp size={20} className="mr-2" />
                                    {isSingle ? "Set Starting Balance" : "Set Starting Balance"}
                                </Button>
                            </div>
                        </Card>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                    >
                        <Card className={`p-4 border-none rounded-3xl ${isSingle ? 'bg-emerald-50' : 'bg-gradient-to-br from-romantic-blush/20 to-romantic-lavender/20'}`}>
                            <div className="flex items-start gap-3">
                                <Sparkles className={isSingle ? "text-emerald-500 mt-1" : "text-romantic-heart mt-1"} size={20} />
                                <div>
                                    <h3 className="font-bold text-slate-800">Getting Started Tips</h3>
                                    <ul className="text-sm text-slate-600 mt-2 space-y-1">
                                        <li>• {isSingle ? "Set your starting balance first" : "Set your shared starting balance first"}</li>
                                        <li>• Add income and expense entries with the correct date</li>
                                        <li>• Review your month or year summary</li>
                                        <li>• Open Calendar when you want date-by-date detail</li>
                                    </ul>
                                </div>
                            </div>
                        </Card>
                    </motion.div>
                </>
            )}

            {hasBudget && (
                <motion.section
                    className="space-y-4"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                >
                    <div className="flex items-center justify-between px-2">
                        <div>
                            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                <TrendingUp size={20} className={isSingle ? "text-emerald-500" : "text-romantic-heart"} />
                                Money Activity
                            </h3>
                            <p className="text-xs text-slate-400 mt-0.5">{isSingle ? "Manage your latest income and expense entries here" : "Manage your shared income and expense entries here"}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">This Month</p>
                            {transactions && (
                                <p className="text-xs text-slate-300">{transactions.length} entries</p>
                            )}
                        </div>
                    </div>

                    {isLoading ? (
                        <div className="space-y-2 pb-20">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="h-16 bg-white/50 rounded-xl animate-pulse" />
                            ))}
                        </div>
                    ) : transactions && transactions.length > 0 ? (
                        <div className="bg-white rounded-2xl shadow-sm overflow-hidden pb-20">
                            {transactions.map((transaction: any) => (
                                <TransactionCard
                                    key={transaction.id}
                                    id={transaction.id}
                                    category={transaction.category}
                                    amount={parseFloat(transaction.amount)}
                                    note={transaction.note || transaction.category}
                                    payer={transaction.payer === "HIS" ? "His" : transaction.payer === "HERS" ? "Hers" : "Shared"}
                                    date={new Date(transaction.transaction_date).toLocaleDateString()}
                                    type={transaction.type || "EXPENSE"}
                                    onDetailClick={() => {
                                        setSelectedTransaction({
                                            id: transaction.id,
                                            category: transaction.category,
                                            amount: parseFloat(transaction.amount),
                                            note: transaction.note || transaction.category,
                                            payer: transaction.payer === "HIS" ? "His" : transaction.payer === "HERS" ? "Hers" : "Shared",
                                            date: new Date(transaction.transaction_date).toLocaleDateString(),
                                            type: transaction.type || "EXPENSE",
                                        });
                                        setDetailModalOpen(true);
                                    }}
                                />
                            ))}
                        </div>
                    ) : (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="text-center py-16"
                        >
                            <Card className="p-8 border-2 border-dashed border-romantic-blush/30 bg-white/50 rounded-3xl">
                                <div className="space-y-4">
                                    <div className="w-16 h-16 mx-auto bg-gradient-to-br from-romantic-blush to-romantic-lavender rounded-full flex items-center justify-center">
                                        <Heart className="text-white" size={32} />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-slate-800 flex items-center justify-center gap-2">
                                            Ready to Track!
                                            <DollarSign className="text-romantic-heart" size={20} />
                                        </h3>
                                        <p className="text-sm text-slate-500 mt-2 max-w-sm mx-auto">
                                            Your starting balance is ready. Add entries to see this period&apos;s income, spent, saved, and remaining balance.
                                        </p>
                                    </div>
                                    <Button
                                        size="lg"
                                        onClick={() => setTransactionModalOpen(true)}
                                        className="rounded-full bg-gradient-button shadow-lg mt-4"
                                    >
                                        <Plus size={20} className="mr-2" />
                                        Add First Entry
                                    </Button>
                                </div>
                            </Card>
                        </motion.div>
                    )}
                </motion.section>
            )}

            {id && (
                <>
                    <AddTransactionModal
                        open={transactionModalOpen}
                        onOpenChange={setTransactionModalOpen}
                        coupleId={id}
                    />
                    <BudgetSetupModal
                        open={budgetModalOpen}
                        onOpenChange={setBudgetModalOpen}
                        coupleId={id}
                        currentBudget={summary?.budget_goals}
                    />
                    <TransactionDetailModal
                        transaction={selectedTransaction}
                        open={detailModalOpen}
                        onClose={() => setDetailModalOpen(false)}
                    />
                </>
            )}

            {hasBudget && transactions && transactions.length > 0 && !detailModalOpen && (
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setTransactionModalOpen(true)}
                    className={cn(
                        "fixed bottom-28 right-6 w-14 h-14 text-white rounded-full shadow-2xl flex items-center justify-center border-2 border-white z-50",
                        isSingle ? "bg-emerald-500" : "bg-gradient-button"
                    )}
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.5, type: "spring" }}
                >
                    <Wallet size={25} />
                </motion.button>
            )}
        </div>
    );
}
