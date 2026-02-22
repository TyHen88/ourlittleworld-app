"use client";
import React from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { ShoppingBag, Coffee, Home, Heart, ChevronRight, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface TransactionProps {
    id: string;
    category: string;
    amount: number;
    note: string;
    payer: "His" | "Hers" | "Shared";
    date: string;
    type?: "INCOME" | "EXPENSE";
    onDetailClick?: () => void;
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

export function TransactionCard({ id, category, amount, note, payer, date, type = "EXPENSE", onDetailClick }: TransactionProps) {
    const Icon = ICONS[category as keyof typeof ICONS] || Heart;
    const isIncome = type === "INCOME";

    return (
        <motion.button
            whileHover={{ x: 4 }}
            whileTap={{ scale: 0.98 }}
            onClick={onDetailClick}
            className="w-full"
        >
            <div className="p-3 border-b border-slate-100 hover:bg-slate-50/50 transition-colors flex items-center gap-3 group">
                {/* Icon with type indicator */}
                <div className="relative">
                    <div className={cn("p-2 rounded-xl", COLORS[payer])}>
                        <Icon size={16} />
                    </div>
                    <div className={cn(
                        "absolute -bottom-0.5 -right-0.5 rounded-full p-0.5",
                        isIncome ? "bg-green-500" : "bg-red-500"
                    )}>
                        {isIncome ? <TrendingUp size={8} className="text-white" /> : <TrendingDown size={8} className="text-white" />}
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 text-left">
                    <div className="flex items-center justify-between gap-2">
                        <h4 className="text-sm font-bold text-slate-800 truncate">{note || category}</h4>
                        <span className={cn(
                            "text-sm font-black whitespace-nowrap",
                            isIncome ? "text-green-600" : "text-slate-900"
                        )}>
                            {isIncome ? "+" : "-"}${amount}
                        </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-[10px] text-slate-400 font-medium">{category}</p>
                        <span className="text-[10px] text-slate-300">•</span>
                        <p className="text-[10px] text-slate-400 font-medium">{date}</p>
                        <span className={cn("text-[9px] px-1.5 py-0.5 rounded-md font-bold uppercase", COLORS[payer])}>
                            {payer === "Shared" ? "Us" : payer}
                        </span>
                    </div>
                </div>

                {/* Detail arrow */}
                <ChevronRight size={16} className="text-slate-300 group-hover:text-slate-400 transition-colors flex-shrink-0" />
            </div>
        </motion.button>
    );
}
