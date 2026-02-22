"use client";
import React, { useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Settings } from "lucide-react";
import { useBudgetSummary } from "@/hooks/use-transactions";
import { BudgetSetupModal } from "@/components/finance/BudgetSetupModal";

interface BudgetOverviewProps {
    coupleId?: string;
}

export function BudgetOverview({ coupleId }: BudgetOverviewProps) {
    const { data: summary, isLoading } = useBudgetSummary(coupleId);
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

    const DATA = [
        { name: "His", value: summary.balance?.his ?? 0, color: "#FFE4E1" },
        { name: "Hers", value: summary.balance?.hers ?? 0, color: "#E6E6FA" },
        { name: "Shared", value: summary.balance?.shared ?? 0, color: "#D4F4DD" },
    ];

    const total = summary.balance?.total ?? 0;
    const goal = summary.budget_goals?.monthly_total ?? 0;
    const percentage = summary.percentage ?? 0;

    return (
        <>
            <Card className="p-6 border-none shadow-xl bg-white/80 backdrop-blur-md rounded-4xl relative">
                {/* Edit Budget Button */}
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSetupModalOpen(true)}
                    className="absolute top-4 right-4 rounded-full text-slate-400 hover:text-romantic-heart hover:bg-romantic-blush/20"
                >
                    <Settings size={18} />
                </Button>

                <div className="flex flex-col sm:flex-row items-center gap-6">
                    <div className="h-40 w-40 relative min-w-[160px] min-h-[160px]">
                        <ResponsiveContainer width="100%" height="100%" minWidth={160} minHeight={160}>
                            <PieChart>
                                <Pie
                                    data={DATA}
                                    innerRadius={55}
                                    outerRadius={75}
                                    paddingAngle={8}
                                    dataKey="value"
                                    stroke="none"
                                >
                                    {DATA.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <span className="text-2xl font-black text-slate-800">${total.toFixed(0)}</span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Balance</span>
                        </div>
                    </div>

                    <div className="flex-1 w-full space-y-4">
                        <div className="space-y-1">
                            <div className="flex justify-between text-sm font-bold">
                                <span className="text-slate-600">Base Budget</span>
                                <span className="text-romantic-heart">{percentage}%</span>
                            </div>
                            <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${percentage}%` }}
                                    className="h-full bg-gradient-button"
                                    transition={{ duration: 1, ease: "easeOut" }}
                                />
                            </div>
                            <p className="text-[10px] text-slate-400 font-medium">Base: ${goal}</p>
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                            {DATA.map((item) => (
                                <div key={item.name} className="flex flex-col items-center p-2 rounded-2xl bg-slate-50/50">
                                    <div className="w-2 h-2 rounded-full mb-1" style={{ backgroundColor: item.color }} />
                                    <span className="text-[10px] font-bold text-slate-400 uppercase">{item.name}</span>
                                    <span className="text-xs font-bold text-slate-700">${item.value.toFixed(0)}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </Card>

            {coupleId && (
                <BudgetSetupModal
                    open={setupModalOpen}
                    onOpenChange={setSetupModalOpen}
                    coupleId={coupleId}
                    currentBudget={summary?.budget_goals}
                />
            )}
        </>
    );
}
