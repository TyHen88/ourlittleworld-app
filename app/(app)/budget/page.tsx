"use client";
import React from "react";
import { BudgetOverview } from "@/components/love/BudgetOverview";
import { TransactionCard } from "@/components/love/TransactionCard";
import { Button } from "@/components/ui/button";
import { Plus, Filter } from "lucide-react";
import { motion } from "framer-motion";

export default function BudgetPage() {
    return (
        <div className="p-6 space-y-8 max-w-2xl mx-auto">
            <header className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 tracking-tight">Financial Hub</h1>
                    <p className="text-sm text-slate-400 font-medium">Saving for our dreams together</p>
                </div>
                <Button size="icon" className="rounded-full bg-white shadow-lg text-slate-400 border-none hover:text-romantic-heart">
                    <Filter size={20} />
                </Button>
            </header>

            <BudgetOverview />

            <section className="space-y-4">
                <div className="flex items-center justify-between px-2">
                    <h3 className="text-lg font-bold text-slate-800 underline decoration-romantic-blush decoration-4">Recent Spending</h3>
                    <p className="text-xs font-bold text-slate-300 uppercase tracking-widest">This Week</p>
                </div>

                <div className="space-y-3 pb-20">
                    <TransactionCard
                        category="Coffee"
                        amount={12.50}
                        note="Morning Lattes ☕"
                        payer="His"
                        date="Today, 09:15"
                    />
                    <TransactionCard
                        category="Shopping"
                        amount={85.20}
                        note="Grocery run"
                        payer="Shared"
                        date="Yesterday, 18:30"
                    />
                    <TransactionCard
                        category="Home"
                        amount={1200}
                        note="Monthly Rent"
                        payer="Shared"
                        date="1 Feb, 10:00"
                    />
                    <TransactionCard
                        category="Hers"
                        amount={45.00}
                        note="Skincare 🌸"
                        payer="Hers"
                        date="31 Jan, 14:20"
                    />
                </div>
            </section>

            {/* Floating Action Button */}
            <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="fixed bottom-28 right-6 w-14 h-14 bg-gradient-button text-white rounded-2xl shadow-2xl flex items-center justify-center border-4 border-white z-50"
            >
                <Plus size={32} />
            </motion.button>
        </div>
    );
}
