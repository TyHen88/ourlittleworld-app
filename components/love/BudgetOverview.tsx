"use client";
import React from "react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { Card } from "@/components/ui/card";
import { motion } from "framer-motion";

const DATA = [
    { name: "His", value: 450, color: "#FFE4E1" },
    { name: "Hers", value: 380, color: "#E6E6FA" },
    { name: "Shared", value: 670, color: "#D4F4DD" },
];

export function BudgetOverview() {
    const total = DATA.reduce((acc, curr) => acc + curr.value, 0);
    const goal = 2000;
    const percentage = Math.round((total / goal) * 100);

    return (
        <Card className="p-6 border-none shadow-xl bg-white/80 backdrop-blur-md rounded-4xl">
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
                        <span className="text-2xl font-black text-slate-800">${total}</span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Spent</span>
                    </div>
                </div>

                <div className="flex-1 w-full space-y-4">
                    <div className="space-y-1">
                        <div className="flex justify-between text-sm font-bold">
                            <span className="text-slate-600">Monthly Goal</span>
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
                        <p className="text-[10px] text-slate-400 font-medium">Goal: ${goal}</p>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                        {DATA.map((item) => (
                            <div key={item.name} className="flex flex-col items-center p-2 rounded-2xl bg-slate-50/50">
                                <div className="w-2 h-2 rounded-full mb-1" style={{ backgroundColor: item.color }} />
                                <span className="text-[10px] font-bold text-slate-400 uppercase">{item.name}</span>
                                <span className="text-xs font-bold text-slate-700">${item.value}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </Card>
    );
}
