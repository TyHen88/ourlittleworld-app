"use client";
import React from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { ShoppingBag, Coffee, Home, Heart, MoreVertical } from "lucide-react";
import { cn } from "@/lib/utils";

interface TransactionProps {
    category: string;
    amount: number;
    note: string;
    payer: "His" | "Hers" | "Shared";
    date: string;
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

export function TransactionCard({ category, amount, note, payer, date }: TransactionProps) {
    const Icon = ICONS[category as keyof typeof ICONS] || Heart;

    return (
        <motion.div
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
        >
            <Card className="p-4 border-none shadow-sm bg-white/80 backdrop-blur-sm rounded-3xl flex items-center gap-4 group">
                <div className={cn("p-3 rounded-2xl", COLORS[payer])}>
                    <Icon size={22} />
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                        <h4 className="text-sm font-bold text-slate-800 truncate">{note}</h4>
                        <span className="text-sm font-black text-slate-900">${amount}</span>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">{category} • {date}</p>
                        <span className={cn("text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-widest", COLORS[payer])}>
                            {payer === "Shared" ? "Us" : payer}
                        </span>
                    </div>
                </div>

                <button className="text-slate-200 group-hover:text-slate-400 transition-colors">
                    <MoreVertical size={16} />
                </button>
            </Card>
        </motion.div>
    );
}
