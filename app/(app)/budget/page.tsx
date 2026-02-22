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
import { Plus, Filter, Sparkles, TrendingUp, Heart, Info, Wallet, Smile, AlertTriangle, AlertCircle, DollarSign } from "lucide-react";
import { motion } from "framer-motion";
import { FullPageLoader } from "@/components/FullPageLoader";

export default function BudgetPage() {
    const { couple } = useCouple();
    const [transactionModalOpen, setTransactionModalOpen] = useState(false);
    const [budgetModalOpen, setBudgetModalOpen] = useState(false);
    const [selectedTransaction, setSelectedTransaction] = useState<any>(null);
    const [detailModalOpen, setDetailModalOpen] = useState(false);
    const { data: transactions, isLoading } = useTransactions(couple?.id);
    const { data: summary, isLoading: summaryLoading } = useBudgetSummary(couple?.id);

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
        const { status, percentage } = summary;
        const totalBalance = summary?.balance?.total ?? 0;

        if (status === "healthy") {
            return {
                icon: Smile,
                title: "Looking Good!",
                message: `You've used ${percentage}% of your budget. Keep it up!`,
                color: "text-green-600",
                bg: "bg-green-50"
            };
        } else if (status === "warning") {
            return {
                icon: AlertTriangle,
                title: "Watch Your Spending",
                message: `You've used ${percentage}% of your budget. Current balance: $${totalBalance.toFixed(0)}.`,
                color: "text-amber-600",
                bg: "bg-amber-50"
            };
        } else {
            return {
                icon: AlertCircle,
                title: "Over Budget!",
                message: `Your balance is running low ($${totalBalance.toFixed(0)}). Time to review!`,
                color: "text-red-600",
                bg: "bg-red-50"
            };
        }
    };

    const statusInfo = getStatusMessage();
    return (
        <div className="p-6 space-y-6 max-w-2xl mx-auto pb-32">
            {/* Welcome Header */}
            <motion.header
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-3"
            >
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-black text-slate-800 flex items-center gap-2">
                            <Wallet className="text-romantic-heart" size={32} />
                            Budget Tracker
                        </h1>
                        <p className="text-sm text-slate-500 mt-1 flex items-center gap-1">
                            Manage your finances together, stay on track!
                            <Sparkles className="text-romantic-heart" size={14} />
                        </p>
                    </div>
                </div>
            </motion.header>

            {/* Status Alert - Only show when transactions exist */}
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

            {/* Budget Overview - Show when budget is setup */}
            {hasBudget && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                >
                    <BudgetOverview coupleId={couple?.id} />
                </motion.div>
            )}

            {/* Setup Budget Empty State - Only show when no budget setup AND not loading */}
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
                                <div className="w-16 h-16 mx-auto bg-gradient-to-br from-romantic-blush to-romantic-lavender rounded-full flex items-center justify-center">
                                    <Heart className="text-white" size={32} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-slate-800 flex items-center justify-center gap-2">
                                        Start Tracking Together!
                                        <Heart className="text-romantic-heart" size={20} />
                                    </h3>
                                    <p className="text-sm text-slate-500 mt-2 max-w-sm mx-auto">
                                        Setup your budget to see where your money goes.
                                        Every coffee, every date, every shared moment counts!
                                    </p>
                                </div>
                                <Button
                                    size="lg"
                                    onClick={() => setBudgetModalOpen(true)}
                                    className="rounded-full bg-gradient-button shadow-lg mt-4"
                                >
                                    <TrendingUp size={20} className="mr-2" />
                                    Setup Budget
                                </Button>
                            </div>
                        </Card>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                    >
                        <Card className="p-4 border-none bg-gradient-to-br from-romantic-blush/20 to-romantic-lavender/20 rounded-3xl">
                            <div className="flex items-start gap-3">
                                <Sparkles className="text-romantic-heart mt-1" size={20} />
                                <div>
                                    <h3 className="font-bold text-slate-800">Getting Started Tips</h3>
                                    <ul className="text-sm text-slate-600 mt-2 space-y-1">
                                        <li>• Setup your monthly budget first</li>
                                        <li>• Add your first transaction using the + button</li>
                                        <li>• Track who paid what (His, Hers, or Shared)</li>
                                        <li>• Watch your spending progress in real-time!</li>
                                    </ul>
                                </div>
                            </div>
                        </Card>
                    </motion.div>
                </>
            )}

            {/* Transactions Section - Only show when budget is setup */}
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
                                <TrendingUp size={20} className="text-romantic-heart" />
                                Recent Transactions
                            </h3>
                            <p className="text-xs text-slate-400 mt-0.5">Track every expense together</p>
                        </div>
                        <div className="text-right">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">This Month</p>
                            {transactions && (
                                <p className="text-xs text-slate-300">{transactions.length} transactions</p>
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
                                            Your budget is set! Start adding transactions to track your spending together.
                                        </p>
                                    </div>
                                    <Button
                                        size="lg"
                                        onClick={() => setTransactionModalOpen(true)}
                                        className="rounded-full bg-gradient-button shadow-lg mt-4"
                                    >
                                        <Plus size={20} className="mr-2" />
                                        Add First Transaction
                                    </Button>
                                </div>
                            </Card>
                        </motion.div>
                    )}
                </motion.section>
            )}

            {couple?.id && (
                <>
                    <AddTransactionModal
                        open={transactionModalOpen}
                        onOpenChange={setTransactionModalOpen}
                        coupleId={couple.id}
                    />
                    <BudgetSetupModal
                        open={budgetModalOpen}
                        onOpenChange={setBudgetModalOpen}
                        coupleId={couple.id}
                        currentBudget={summary?.budget_goals}
                    />
                    <TransactionDetailModal
                        transaction={selectedTransaction}
                        open={detailModalOpen}
                        onClose={() => setDetailModalOpen(false)}
                    />
                </>
            )}

            {/* Floating Action Button - Only show when budget exists and has transactions and detail modal is closed */}
            {hasBudget && transactions && transactions.length > 0 && !detailModalOpen && (
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setTransactionModalOpen(true)}
                    className="fixed bottom-28 right-6 w-14 h-14 bg-gradient-button text-white rounded-full shadow-2xl flex items-center justify-center border-2 border-white z-50"
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
