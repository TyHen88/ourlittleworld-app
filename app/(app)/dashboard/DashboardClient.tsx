"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { BudgetOverview } from "@/components/love/BudgetOverview";
import { CoupleFeedPost } from "@/components/love/CoupleFeedPost";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Heart, Stars, MapPin, Sparkles } from "lucide-react";
import { DailyMoodBadge } from "@/components/moods/DailyMoodBadge";
import { DailyMoodModal } from "@/components/moods/DailyMoodModal";
import { formatAnniversaryDate } from "@/lib/utils/date-utilities";

interface DashboardClientProps {
    user: any;
    profile: any;
    couple: any;
    daysTogether: number;
}

export function DashboardClient({ user, profile, couple, daysTogether }: DashboardClientProps) {
    const [moodModalOpen, setMoodModalOpen] = useState(false);

    // Derived values for the partner
    const otherPartner = couple?.members?.find((m: any) => m.id !== user?.id);

    return (
        <div className="p-6 space-y-8 max-w-2xl mx-auto">
            {/* Header Section */}
            <header className="flex items-center justify-between">
                <div className="flex items-center -space-x-3">
                    <div className="relative">
                        <Avatar className="w-12 h-12 border-4 border-white shadow-md">
                            <AvatarFallback className="bg-romantic-blush text-romantic-heart font-bold">
                                {profile?.avatar_url ? (
                                    <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                                ) : (profile?.full_name?.[0] || 'M')}
                            </AvatarFallback>
                        </Avatar>
                        {user && couple && (
                            <DailyMoodBadge
                                userId={user.id}
                                coupleId={couple.id}
                                position="bottom-right"
                            />
                        )}
                    </div>

                    <div className="relative">
                        <Avatar className="w-12 h-12 border-4 border-white shadow-md">
                            <AvatarFallback className="bg-romantic-lavender text-slate-600 font-bold overflow-hidden">
                                {otherPartner?.avatar_url ? (
                                    <img src={otherPartner.avatar_url} alt="" className="w-full h-full object-cover" />
                                ) : (otherPartner?.full_name?.[0] || 'L')}
                            </AvatarFallback>
                        </Avatar>
                        {otherPartner && couple && (
                            <DailyMoodBadge
                                userId={otherPartner.id}
                                coupleId={couple.id}
                                position="bottom-right"
                            />
                        )}
                    </div>
                </div>
                <div className="text-right">
                    <h1 className="text-xl font-bold text-slate-800 tracking-tight">Hi, Love</h1>
                    {daysTogether > 0 && (
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em]">
                            Day {daysTogether.toLocaleString()} Together
                        </p>
                    )}
                </div>
            </header>

            {/* Anniversary Card */}
            {couple?.couple_name && daysTogether > 0 && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5 }}
                >
                    <Card className="relative overflow-hidden p-8 border-none bg-gradient-to-br from-romantic-blush/40 via-romantic-lavender/40 to-white shadow-xl rounded-4xl">
                        <div className="relative z-10 text-center space-y-6">
                            <div className="flex flex-col items-center space-y-4">
                                <div className="flex items-center justify-center -space-x-4">
                                    <div className="relative group">
                                        <div className="absolute -inset-1 bg-gradient-to-r from-romantic-heart to-romantic-blush rounded-full blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
                                        <Avatar className="w-20 h-20 border-4 border-white shadow-xl relative">
                                            <AvatarFallback className="bg-romantic-blush text-romantic-heart text-xl font-bold overflow-hidden">
                                                {profile?.avatar_url ? (
                                                    <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                                                ) : (profile?.full_name?.[0] || 'M')}
                                            </AvatarFallback>
                                        </Avatar>
                                        {user && couple && (
                                            <DailyMoodBadge
                                                userId={user.id}
                                                coupleId={couple.id}
                                                position="bottom-right"
                                            />
                                        )}
                                    </div>
                                    <div className="z-10 bg-white rounded-full p-2 shadow-lg -rotate-12">
                                        <Heart className="text-romantic-heart fill-romantic-heart w-6 h-6 animate-heart-beat" />
                                    </div>
                                    <div className="relative group">
                                        <div className="absolute -inset-1 bg-gradient-to-r from-romantic-lavender to-romantic-blush rounded-full blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
                                        <Avatar className="w-20 h-20 border-4 border-white shadow-xl relative">
                                            <AvatarFallback className="bg-romantic-lavender text-slate-600 text-xl font-bold overflow-hidden">
                                                {otherPartner?.avatar_url ? (
                                                    <img src={otherPartner.avatar_url} alt="" className="w-full h-full object-cover" />
                                                ) : (otherPartner?.full_name?.[0] || 'L')}
                                            </AvatarFallback>
                                        </Avatar>
                                        {otherPartner && couple && (
                                            <DailyMoodBadge
                                                userId={otherPartner.id}
                                                coupleId={couple.id}
                                                position="bottom-right"
                                            />
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <h3 className="text-xl font-black text-slate-800 tracking-tight">
                                        {couple.partner_1_nickname || "Partner 1"} & {couple.partner_2_nickname || "Partner 2"}
                                    </h3>
                                    <div className="flex items-center justify-center gap-2">
                                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest bg-white/50 px-3 py-1 rounded-full backdrop-blur-sm">
                                            {couple.couple_name}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="inline-block relative">
                                <motion.div
                                    animate={{
                                        scale: [1, 1.05, 1],
                                        rotate: [0, 2, -2, 0]
                                    }}
                                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                                    className="bg-gradient-button text-white px-10 py-5 rounded-[2.5rem] shadow-2xl relative z-10"
                                >
                                    <div className="text-5xl font-black tracking-tighter">
                                        D+{daysTogether}
                                    </div>
                                    <div className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-80 mt-1">
                                        Days Together
                                    </div>
                                </motion.div>
                                <div className="absolute inset-0 bg-romantic-heart/20 rounded-[2.5rem] blur-2xl animate-pulse" />
                            </div>

                            <div className="pt-2">
                                <div className="inline-flex items-center gap-2 bg-slate-50/80 backdrop-blur-sm px-4 py-2 rounded-full border border-white/50 shadow-sm">
                                    <Sparkles className="text-romantic-heart w-3 h-3" />
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-tighter">
                                        Anniversary: {formatAnniversaryDate(couple.start_date) || "Special Day"}
                                    </p>
                                    <Sparkles className="text-romantic-heart w-3 h-3" />
                                </div>
                            </div>
                        </div>

                        <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                            <Heart className="w-32 h-32 text-romantic-heart fill-romantic-heart" />
                        </div>
                        <div className="absolute bottom-0 left-0 p-4 opacity-10 pointer-events-none">
                            <Heart className="w-24 h-24 text-romantic-lavender fill-romantic-lavender" />
                        </div>
                    </Card>
                </motion.div>
            )}

            {/* Hero "Us" Status */}
            <Card className="relative overflow-hidden p-4 border-none bg-gradient-love shadow-lg rounded-3xl group">
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="relative z-10 flex items-center gap-4"
                >
                    <div className="p-2 bg-white/40 rounded-full shrink-0">
                        <Heart className="text-romantic-heart fill-romantic-heart animate-heart-beat" size={24} />
                    </div>
                    <div className="text-left flex-1">
                        <h2 className="text-lg font-bold text-slate-800 italic leading-tight">"Love you more than yesterday"</h2>
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-600 font-bold uppercase tracking-wider mt-0.5">
                            <MapPin size={12} className="text-romantic-heart" />
                            <span>San Francisco, CA</span>
                        </div>
                    </div>
                </motion.div>

                <Stars className="absolute top-2 right-2 text-white/30 w-4 h-4 animate-pulse" />
                <div className="absolute -bottom-6 -left-6 w-20 h-20 bg-white/10 rounded-full blur-xl" />
            </Card>

            {/* Main Widgets */}
            <section className="space-y-6">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-slate-800">Finances</h3>
                    <span className="text-xs font-bold text-romantic-heart uppercase tracking-widest px-3 py-1 bg-romantic-blush/30 rounded-full italic">Healthy</span>
                </div>
                <BudgetOverview />
            </section>

            <section className="space-y-6 pb-6">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-slate-800">Recent Memory</h3>
                    <button className="text-xs font-bold text-slate-400 uppercase tracking-widest hover:text-romantic-heart transition-colors">See Feed</button>
                </div>
                <CoupleFeedPost
                    author="My Forever"
                    content="Coffee morning at our favorite corner! ☕✨"
                    timestamp="2 hours ago"
                    comments={3}
                    reactions={12}
                />
            </section>

            {/* Floating Heart Button for Mood Check-in */}
            {couple && (
                <motion.button
                    onClick={() => setMoodModalOpen(true)}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    className="fixed bottom-24 right-6 w-14 h-14 bg-gradient-button rounded-full shadow-2xl flex items-center justify-center z-50"
                >
                    <Heart className="text-white fill-white" size={24} />
                </motion.button>
            )}

            <DailyMoodModal
                open={moodModalOpen}
                onOpenChange={setMoodModalOpen}
            />
        </div>
    );
}
