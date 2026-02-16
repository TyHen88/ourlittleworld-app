"use client";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Sparkles } from "lucide-react";

interface WorldNameCardProps {
    coupleName: string;
    startDate?: string;
}

export function WorldNameCard({ coupleName, startDate }: WorldNameCardProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
        >
            <Card className="p-6 border-none shadow-xl bg-gradient-to-br from-white/90 to-romantic-blush/20 backdrop-blur-xl rounded-3xl text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                    <Sparkles className="text-romantic-heart" size={20} />
                    <span className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Our World</span>
                    <Sparkles className="text-romantic-heart" size={20} />
                </div>
                <h2 className="text-3xl font-black text-slate-800">
                    {coupleName}
                </h2>
                {startDate && (
                    <p className="text-sm text-slate-500 mt-2">
                        Since {new Date(startDate).toLocaleDateString('en-US', {
                            month: 'long',
                            day: 'numeric',
                            year: 'numeric'
                        })}
                    </p>
                )}
            </Card>
        </motion.div>
    );
}
