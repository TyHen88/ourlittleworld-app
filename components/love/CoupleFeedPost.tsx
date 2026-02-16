"use client";
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Heart, MessageCircle, Share2, MoreHorizontal, Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface PostProps {
    author: string;
    content: string;
    timestamp: string;
    reactions: number;
    comments: number;
}

export function CoupleFeedPost({ author, content, timestamp, reactions, comments }: PostProps) {
    const [isLiked, setIsLiked] = useState(false);
    const [likesCount, setLikesCount] = useState(reactions);

    const toggleLike = () => {
        setIsLiked(!isLiked);
        setLikesCount(prev => isLiked ? prev - 1 : prev + 1);
    };

    return (
        <Card className="overflow-hidden border-none shadow-xl bg-white/90 backdrop-blur-sm rounded-4xl group">
            {/* Post Header */}
            <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Avatar className="w-10 h-10 ring-2 ring-romantic-blush/20">
                        <AvatarFallback className="bg-gradient-button text-white text-xs font-bold">{author[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                        <h4 className="text-sm font-bold text-slate-800">{author}</h4>
                        <p className="text-[10px] text-slate-400 font-medium uppercase tracking-tight">{timestamp}</p>
                    </div>
                </div>
                <button className="text-slate-300 hover:text-slate-600 transition-colors">
                    <MoreHorizontal size={20} />
                </button>
            </div>

            {/* Post Content */}
            <div className="px-4 pb-4">
                <div className="rounded-3xl bg-slate-50/50 border border-romantic-blush/20 px-4 py-3">
                    <p className="text-slate-700 leading-relaxed font-medium whitespace-pre-wrap break-words text-[15px]">
                        {content}
                    </p>
                </div>
            </div>

            {/* Sample Image Placeholder */}
            <div className="px-4 pb-4">
                <div className="aspect-[4/3] w-full rounded-3xl bg-romantic-blush/30 overflow-hidden relative">
                    <div className="absolute inset-0 flex items-center justify-center">
                        <ImageIcon className="text-romantic-blush animate-pulse" size={48} />
                    </div>
                    {/* In a real app, use next/image here */}
                </div>
            </div>

            {/* Actions */}
            <div className="px-5 pb-5 flex items-center gap-6">
                <button
                    onClick={toggleLike}
                    className="group/btn relative flex items-center gap-2"
                >
                    <div className="relative">
                        <Heart
                            className={cn(
                                "transition-all duration-300",
                                isLiked ? "fill-romantic-heart text-romantic-heart scale-110" : "text-slate-400 group-hover/btn:text-romantic-petal"
                            )}
                            size={22}
                        />
                        <AnimatePresence>
                            {isLiked && (
                                <motion.div
                                    initial={{ y: 0, opacity: 1, scale: 0.5 }}
                                    animate={{ y: -40, opacity: 0, scale: 2 }}
                                    exit={{ opacity: 0 }}
                                    className="absolute inset-0 text-romantic-heart pointer-events-none"
                                >
                                    <Heart fill="currentColor" size={22} />
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                    <span className={cn("text-xs font-bold", isLiked ? "text-romantic-heart" : "text-slate-400")}>
                        {likesCount}
                    </span>
                </button>

                <button className="flex items-center gap-2 text-slate-400 hover:text-slate-600 transition-colors">
                    <MessageCircle size={22} />
                    <span className="text-xs font-bold">{comments}</span>
                </button>

                <button className="flex items-center gap-2 text-slate-400 hover:text-slate-600 transition-colors ml-auto">
                    <Share2 size={20} />
                </button>
            </div>
        </Card>
    );
}
