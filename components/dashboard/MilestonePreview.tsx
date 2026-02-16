"use client";
import { motion } from "framer-motion";

interface MilestonePreviewProps {
    milestones: any[];
    daysTogether: number;
}

export function MilestonePreview({ milestones, daysTogether }: MilestonePreviewProps) {
    const upcomingMilestones = milestones.filter(m => m.days > daysTogether).slice(0, 2);

    return (
        <div className="grid grid-cols-2 gap-4 mb-8">
            {upcomingMilestones.map((milestone, idx) => {
                const Icon = milestone.icon;
                const daysUntil = milestone.days - daysTogether;
                return (
                    <motion.div
                        key={milestone.days}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 + idx * 0.1 }}
                        className="bg-gradient-to-br from-romantic-blush/30 to-romantic-lavender/30 p-4 rounded-2xl border-2 border-white/50"
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-white rounded-full">
                                <Icon className={`${milestone.color}`} size={20} />
                            </div>
                            <div className="flex-1">
                                <div className="text-xs font-semibold text-slate-600">{milestone.label}</div>
                                <div className="text-lg font-black text-romantic-heart">
                                    D-{daysUntil}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                );
            })}
        </div>
    );
}
