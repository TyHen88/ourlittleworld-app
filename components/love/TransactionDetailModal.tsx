"use client";
import React from "react";
import { motion } from "framer-motion";
import { ShoppingBag, Coffee, Home, Heart } from "lucide-react";
import { cn } from "@/lib/utils";

interface TransactionProps {
    id: string;
    category: string;
    amount: number;
    note: string;
    payer: "His" | "Hers" | "Shared";
    date: string;
    type?: "INCOME" | "EXPENSE";
}

const ICONS = {
    Shopping: ShoppingBag,
    Coffee: Coffee,
    Home: Home,
    Shared: Heart,
};

const COLORS = {
    His: "bg-romantic-blush text-romantic-heart",
    Hers: "bg-romantic-lavender text-slate-600",
    Shared: "bg-romantic-mint text-emerald-600",
};

export function TransactionDetailModal({ transaction, open, onClose }: {
    transaction: TransactionProps | null;
    open: boolean;
    onClose: () => void;
}) {
    if (!transaction) return null;

    const Icon = ICONS[transaction.category as keyof typeof ICONS] || Heart;
    const isIncome = transaction.type === "INCOME";

    return (
        <div
            className={cn(
                "fixed inset-0 z-50 flex items-end justify-center transition-all duration-300",
                open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
            )}
            onClick={onClose}
        >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" />

            {/* Modal */}
            <motion.div
                initial={{ y: "100%" }}
                animate={{ y: open ? 0 : "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                onClick={(e) => e.stopPropagation()}
                className="relative w-full max-w-md bg-white rounded-t-3xl shadow-2xl p-6 space-y-4"
            >
                {/* Handle */}
                <div className="w-12 h-1 bg-slate-200 rounded-full mx-auto mb-4" />

                {/* Header */}
                <div className="flex items-center gap-4">
                    <div className={cn("p-3 rounded-2xl", COLORS[transaction.payer])}>
                        <Icon size={24} />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-lg font-black text-slate-800">{transaction.note || transaction.category}</h3>
                        <p className="text-xs text-slate-500 font-medium">{transaction.category}</p>
                    </div>
                </div>

                {/* Amount */}
                <div className="text-center py-4">
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-wide mb-1">
                        {isIncome ? "Income" : "Expense"}
                    </p>
                    <p className={cn(
                        "text-4xl font-black",
                        isIncome ? "text-green-600" : "text-slate-900"
                    )}>
                        {isIncome ? "+" : "-"}${transaction.amount}
                    </p>
                </div>

                {/* Details */}
                <div className="space-y-3 pt-4 border-t border-slate-100">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Date</span>
                        <span className="text-sm font-bold text-slate-800">{transaction.date}</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Paid By</span>
                        <span className={cn("text-xs px-2 py-1 rounded-lg font-bold uppercase", COLORS[transaction.payer])}>
                            {transaction.payer === "Shared" ? "Us" : transaction.payer}
                        </span>
                    </div>
                </div>

                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="w-full py-3 bg-slate-100 hover:bg-slate-200 rounded-2xl font-bold text-slate-700 transition-colors"
                >
                    Close
                </button>
            </motion.div>
        </div>
    );
}
