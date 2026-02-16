"use client";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, Edit2, Share2, Send, Calendar } from "lucide-react";
import { MilestonePreview } from "./MilestonePreview";
import { ProgressBar } from "./ProgressBar";

interface AnniversaryCardProps {
    daysTogether: number;
    milestones: any[];
    nextMilestone: any;
    prevMilestone: any;
    progress: number;
    daysUntil: number;
    onEdit: () => void;
    onShare: () => void;
    onSend: () => void;
    onMore: () => void;
}

export function AnniversaryCard({
    daysTogether,
    milestones,
    nextMilestone,
    prevMilestone,
    progress,
    daysUntil,
    onEdit,
    onShare,
    onSend,
    onMore
}: AnniversaryCardProps) {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
        >
            <Card className="p-8 border-none shadow-2xl bg-white/80 backdrop-blur-xl rounded-4xl">
                {/* Current Days Counter */}
                <div className="text-center mb-8">
                    <div className="inline-block relative">
                        <motion.div
                            animate={{ rotate: [0, 5, -5, 0] }}
                            transition={{ duration: 4, repeat: Infinity }}
                            className="absolute -top-6 -right-6"
                        >
                            <Sparkles className="text-yellow-400 fill-yellow-400" size={32} />
                        </motion.div>
                        <div className="bg-gradient-button text-white px-8 py-4 rounded-3xl shadow-xl">
                            <div className="text-6xl font-black tracking-tight">
                                D+{daysTogether}
                            </div>
                            <div className="text-sm font-medium opacity-90 mt-1">
                                Days Together
                            </div>
                        </div>
                    </div>
                </div>

                {/* Future Milestones Preview */}
                <MilestonePreview
                    milestones={milestones}
                    daysTogether={daysTogether}
                />

                {/* Progress Bar */}
                <ProgressBar
                    prevMilestone={prevMilestone}
                    nextMilestone={nextMilestone}
                    progress={progress}
                    daysUntil={daysUntil}
                    daysTogether={daysTogether}
                    milestones={milestones}
                />

                {/* Action Buttons */}
                <div className="grid grid-cols-4 gap-3 mt-8">
                    <Button
                        onClick={onEdit}
                        variant="outline"
                        className="flex-col h-auto py-3 rounded-2xl border-2 border-romantic-blush hover:bg-romantic-blush/20"
                    >
                        <Edit2 size={20} className="mb-1 text-romantic-heart" />
                        <span className="text-xs font-semibold">Edit</span>
                    </Button>

                    <Button
                        onClick={onShare}
                        variant="outline"
                        className="flex-col h-auto py-3 rounded-2xl border-2 border-purple-200 hover:bg-purple-50"
                    >
                        <Share2 size={20} className="mb-1 text-purple-500" />
                        <span className="text-xs font-semibold">Share</span>
                    </Button>

                    <Button
                        onClick={onSend}
                        variant="outline"
                        className="flex-col h-auto py-3 rounded-2xl border-2 border-rose-200 hover:bg-rose-50"
                    >
                        <Send size={20} className="mb-1 text-rose-500" />
                        <span className="text-xs font-semibold">Send</span>
                    </Button>

                    <Button
                        onClick={onMore}
                        variant="outline"
                        className="flex-col h-auto py-3 rounded-2xl border-2 border-slate-200 hover:bg-slate-50"
                    >
                        <Calendar size={20} className="mb-1 text-slate-500" />
                        <span className="text-xs font-semibold">More</span>
                    </Button>
                </div>
            </Card>
        </motion.div>
    );
}
