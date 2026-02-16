"use client";
import { motion } from "framer-motion";
import { Heart } from "lucide-react";

interface ProgressBarProps {
    prevMilestone: any;
    nextMilestone: any;
    progress: number;
    daysUntil: number;
    daysTogether: number;
    milestones: any[];
}

export function ProgressBar({
    prevMilestone,
    nextMilestone,
    progress,
    daysUntil,
    daysTogether,
    milestones
}: ProgressBarProps) {
    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between text-sm font-semibold text-slate-600">
                <span>{prevMilestone.label}</span>
                <span className="text-romantic-heart">D-{daysUntil} to {nextMilestone.label}</span>
                <span>{nextMilestone.label}</span>
            </div>

            {/* Progress bar */}
            <div className="relative h-8 bg-gradient-to-r from-romantic-blush/30 to-romantic-lavender/30 rounded-full overflow-hidden border-2 border-white/50">
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className="h-full bg-gradient-button relative"
                >
                    <div className="absolute inset-0 bg-white/20 animate-pulse" />
                </motion.div>

                {/* Heart marker at current position */}
                <motion.div
                    initial={{ left: 0 }}
                    animate={{ left: `${progress}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2"
                >
                    <motion.div
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                    >
                        <Heart className="text-white fill-white drop-shadow-lg" size={20} />
                    </motion.div>
                </motion.div>
            </div>

            {/* Milestone markers */}
            <div className="relative h-2">
                {milestones.map((milestone) => {
                    const position = ((milestone.days - prevMilestone.days) / (nextMilestone.days - prevMilestone.days)) * 100;
                    if (milestone.days < prevMilestone.days || milestone.days > nextMilestone.days) return null;

                    const Icon = milestone.icon;
                    const isPassed = daysTogether >= milestone.days;

                    return (
                        <div
                            key={milestone.days}
                            className="absolute top-0 -translate-x-1/2"
                            style={{ left: `${position}%` }}
                        >
                            <div className={`p-1 rounded-full ${isPassed ? 'bg-romantic-heart' : 'bg-slate-300'}`}>
                                <Icon className="text-white" size={12} />
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
