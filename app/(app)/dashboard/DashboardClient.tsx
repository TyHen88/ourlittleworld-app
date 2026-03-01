"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { BudgetOverview } from "@/components/love/BudgetOverview";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Heart, Stars, MapPin, Sparkles, Pencil, Check, X, Wallet, TrendingUp, Calendar, Bell, Upload, Target, ArrowRight, Zap, Clock, Gift, Settings } from "lucide-react";
import { DailyMoodBadge } from "@/components/moods/DailyMoodBadge";
import { DailyMoodModal } from "@/components/moods/DailyMoodModal";
import { formatAnniversaryDate } from "@/lib/utils/date-utilities";
import { updateTodayMoodMessage } from "@/lib/actions/moods";
import { createClient } from "@/utils/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

interface DashboardClientProps {
    user: any;
    profile: any;
    couple: any;
    daysTogether: number;
}

export function DashboardClient({ user, profile, couple, daysTogether }: DashboardClientProps) {
    const queryClient = useQueryClient();
    const [moodModalOpen, setMoodModalOpen] = useState(false);
    const [heroMessageLocal, setHeroMessageLocal] = useState("");
    const [editingHeroMessage, setEditingHeroMessage] = useState(false);
    const [heroMessageDraft, setHeroMessageDraft] = useState("");
    const [savingHeroMessage, setSavingHeroMessage] = useState(false);
    const [loadingHeroMessage, setLoadingHeroMessage] = useState(true);
    const [displayMode, setDisplayMode] = useState<"days" | "months">("days");

    // Derived values for the partner
    const otherPartner = couple?.members?.find((m: any) => m.id !== user?.id);

    // Calculate months together
    const monthsTogether = Math.floor(daysTogether / 30);

    const displayedHeroMessage = heroMessageLocal || "Love you more than yesterday";

    // Fetch hero message on mount
    useEffect(() => {
        if (!couple?.id) return;

        const fetchHeroMessage = async () => {
            const supabase = createClient();
            const todayKey = new Date().toISOString().split('T')[0];
            const today = new Date(todayKey);

            const { data } = await supabase
                .from('daily_moods')
                .select('metadata')
                .eq('couple_id', couple.id)
                .eq('mood_date', today.toISOString())
                .not('metadata', 'is', null)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (data?.metadata) {
                const message = (data.metadata as any)?.message;
                if (typeof message === 'string') {
                    setHeroMessageLocal(message);
                }
            }
            setLoadingHeroMessage(false);
        };

        fetchHeroMessage();
    }, [couple?.id]);

    // Realtime subscription for hero message updates
    useEffect(() => {
        if (!couple?.id) return;

        const supabase = createClient();
        const todayKey = new Date().toISOString().split('T')[0];
        const toDateKey = (value: any) => {
            if (!value) return null;
            if (typeof value === 'string') {
                return value.includes('T') ? value.split('T')[0] : value;
            }
            try {
                return new Date(value).toISOString().split('T')[0];
            } catch {
                return null;
            }
        };

        const channel = supabase
            .channel(`daily_moods:dashboard:${couple.id}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'daily_moods',
                    filter: `couple_id=eq.${couple.id}`
                },
                (payload: any) => {
                    if (editingHeroMessage) return;

                    const row = payload?.new || payload?.old;
                    const rowDateKey = toDateKey(row?.mood_date);
                    if (rowDateKey !== todayKey) return;

                    if (payload?.eventType === 'DELETE') {
                        setHeroMessageLocal("");
                        return;
                    }

                    const message = payload?.new?.metadata?.message ?? row?.metadata?.message;
                    if (typeof message === 'string') {
                        setHeroMessageLocal(message);
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [couple?.id, editingHeroMessage]);

    useEffect(() => {
        const handler = (e: any) => {
            if (editingHeroMessage) return;
            const nextMessage = e?.detail?.message;
            if (typeof nextMessage === 'string') {
                setHeroMessageLocal(nextMessage);
            }
        };
        document.addEventListener('daily-mood-updated', handler as any);
        return () => {
            document.removeEventListener('daily-mood-updated', handler as any);
        };
    }, [editingHeroMessage]);

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
                    <Card className="relative overflow-hidden p-5 border-none bg-gradient-to-br from-romantic-blush/40 via-romantic-lavender/40 to-white shadow-xl rounded-3xl">
                        <div className="relative z-10 text-center space-y-4">
                            <div className="flex flex-col items-center space-y-3">
                                <div className="flex items-center justify-center -space-x-3">
                                    <div className="relative group">
                                        <Avatar className="w-16 h-16 border-3 border-white shadow-lg relative">
                                            <AvatarFallback className="bg-romantic-blush text-romantic-heart text-lg font-bold overflow-hidden">
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
                                    <div className="z-10 bg-white rounded-full p-1.5 shadow-md -rotate-12">
                                        <Heart className="text-romantic-heart fill-romantic-heart w-5 h-5 animate-heart-beat" />
                                    </div>
                                    <div className="relative group">
                                        <Avatar className="w-16 h-16 border-3 border-white shadow-lg relative">
                                            <AvatarFallback className="bg-romantic-lavender text-slate-600 text-lg font-bold overflow-hidden">
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
                                    <h3 className="text-lg font-bold text-slate-800">
                                        {couple.partner_1_nickname || "Partner 1"} & {couple.partner_2_nickname || "Partner 2"}
                                    </h3>
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wide bg-white/50 px-2.5 py-0.5 rounded-full">
                                        {couple.couple_name}
                                    </span>
                                </div>
                            </div>

                            <div className="space-y-2 flex flex-col items-center">
                                <button
                                    onClick={() => setDisplayMode(displayMode === "days" ? "months" : "days")}
                                    className="text-lg font-bold text-slate-800 hover:text-romantic-heart transition-colors cursor-pointer"
                                >
                                    {displayMode === "days"
                                        ? `Day ${daysTogether.toLocaleString()} Together`
                                        : `${monthsTogether} Months Together`
                                    }
                                </button>

                                <div className="flex items-center justify-center gap-1.5 bg-slate-50/80 backdrop-blur-sm px-3 py-1.5 rounded-full border border-white/50 shadow-sm w-fit mx-auto">
                                    <Calendar className="text-romantic-heart w-3 h-3" />
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                                        {formatAnniversaryDate(couple.start_date) || "Special Day"}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="absolute top-0 right-0 p-3 opacity-10 pointer-events-none">
                            <Heart className="w-20 h-20 text-romantic-heart fill-romantic-heart" />
                        </div>
                        <div className="absolute bottom-0 left-0 p-3 opacity-10 pointer-events-none">
                            <Heart className="w-16 h-16 text-romantic-lavender fill-romantic-lavender" />
                        </div>
                    </Card>
                </motion.div>
            )}


            {/* Quick Actions */}
            <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="space-y-4"
            >
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <Zap className="text-romantic-heart" size={20} />
                    Quick Actions
                </h3>
                <div className="grid grid-cols-2 gap-3">
                    <motion.a
                        href="/budget"
                        whileHover={{ scale: 1.02, y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl border border-green-100 hover:border-green-200 transition-all group"
                    >
                        <div className="flex items-start justify-between">
                            <div className="p-2 bg-green-100 rounded-xl group-hover:bg-green-200 transition-colors">
                                <Wallet className="text-green-600" size={20} />
                            </div>
                            <ArrowRight className="text-green-300 group-hover:text-green-400 transition-colors" size={16} />
                        </div>
                        <h4 className="font-bold text-slate-800 mt-3 text-sm">Add Transaction</h4>
                        <p className="text-xs text-slate-500 mt-1">Track your spending</p>
                    </motion.a>

                    <motion.a
                        href="/budget"
                        whileHover={{ scale: 1.02, y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border border-blue-100 hover:border-blue-200 transition-all group"
                    >
                        <div className="flex items-start justify-between">
                            <div className="p-2 bg-blue-100 rounded-xl group-hover:bg-blue-200 transition-colors">
                                <TrendingUp className="text-blue-600" size={20} />
                            </div>
                            <ArrowRight className="text-blue-300 group-hover:text-blue-400 transition-colors" size={16} />
                        </div>
                        <h4 className="font-bold text-slate-800 mt-3 text-sm">View Budget</h4>
                        <p className="text-xs text-slate-500 mt-1">Check your progress</p>
                    </motion.a>

                    <motion.button
                        whileHover={{ scale: 1.02, y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setMoodModalOpen(true)}
                        className="p-4 bg-gradient-to-br from-pink-50 to-rose-50 rounded-2xl border border-pink-100 hover:border-pink-200 transition-all group"
                    >
                        <div className="flex items-start justify-between">
                            <div className="p-2 bg-pink-100 rounded-xl group-hover:bg-pink-200 transition-colors">
                                <Heart className="text-pink-600" size={20} />
                            </div>
                            <ArrowRight className="text-pink-300 group-hover:text-pink-400 transition-colors" size={16} />
                        </div>
                        <h4 className="font-bold text-slate-800 mt-3 text-sm">Daily Mood</h4>
                        <p className="text-xs text-slate-500 mt-1">How are you feeling?</p>
                    </motion.button>

                    <motion.a
                        href="/calendar"
                        whileHover={{ scale: 1.02, y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        className="p-4 bg-gradient-to-br from-sky-50 to-blue-50 rounded-2xl border border-sky-100 hover:border-sky-200 transition-all group"
                    >
                        <div className="flex items-start justify-between">
                            <div className="p-2 bg-sky-100 rounded-xl group-hover:bg-sky-200 transition-colors">
                                <Calendar className="text-sky-600" size={20} />
                            </div>
                            <ArrowRight className="text-sky-300 group-hover:text-sky-400 transition-colors" size={16} />
                        </div>
                        <h4 className="font-bold text-slate-800 mt-3 text-sm">Calendar View</h4>
                        <p className="text-xs text-slate-500 mt-1">Spending by date</p>
                    </motion.a>

                    <motion.a
                        href="/create-post"
                        whileHover={{ scale: 1.02, y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        className="p-4 bg-gradient-to-br from-pink-50 to-rose-50 rounded-2xl border border-pink-100 hover:border-pink-200 transition-all group"
                    >
                        <div className="flex items-start justify-between">
                            <div className="p-2 bg-pink-100 rounded-xl group-hover:bg-pink-200 transition-colors">
                                <Pencil className="text-pink-600" size={20} />
                            </div>
                            <ArrowRight className="text-pink-300 group-hover:text-pink-400 transition-colors" size={16} />
                        </div>
                        <h4 className="font-bold text-slate-800 mt-3 text-sm">Create Memory</h4>
                        <p className="text-xs text-slate-500 mt-1">Share a moment</p>
                    </motion.a>

                    <motion.a
                        href="/settings"
                        whileHover={{ scale: 1.02, y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        className="p-4 bg-gradient-to-br from-slate-50 to-gray-50 rounded-2xl border border-slate-100 hover:border-slate-200 transition-all group"
                    >
                        <div className="flex items-start justify-between">
                            <div className="p-2 bg-slate-100 rounded-xl group-hover:bg-slate-200 transition-colors">
                                <Settings className="text-slate-600" size={20} />
                            </div>
                            <ArrowRight className="text-slate-300 group-hover:text-slate-400 transition-colors" size={16} />
                        </div>
                        <h4 className="font-bold text-slate-800 mt-3 text-sm">Settings</h4>
                        <p className="text-xs text-slate-500 mt-1">Manage your account</p>
                    </motion.a>
                </div>
            </motion.section>

            {/* Main Widgets */}
            <section className="space-y-6">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-slate-800">Finances</h3>
                    <span className="text-xs font-bold text-romantic-heart uppercase tracking-widest px-3 py-1 bg-romantic-blush/30 rounded-full italic">Healthy</span>
                </div>
                <BudgetOverview coupleId={couple?.id} />
            </section>

            {/* Coming Soon Features */}
            <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="space-y-4 pb-6"
            >
                <div className="flex items-center gap-2">
                    <Gift className="text-romantic-heart" size={20} />
                    <h3 className="text-lg font-bold text-slate-800">Coming Soon</h3>
                    <span className="text-xs font-bold text-amber-600 uppercase tracking-widest px-2 py-0.5 bg-amber-50 rounded-full">New</span>
                </div>
                <Card className="p-5 border-none bg-gradient-to-br from-slate-50 to-white shadow-sm rounded-3xl">
                    <div className="space-y-4">
                        <div className="flex items-start gap-3 group">
                            <div className="p-2 bg-amber-50 rounded-xl group-hover:bg-amber-100 transition-colors">
                                <Bell className="text-amber-600" size={18} />
                            </div>
                            <div className="flex-1">
                                <h4 className="font-bold text-slate-800 text-sm">Smart Reminders</h4>
                                <p className="text-xs text-slate-500 mt-1">Budget alerts & daily expense tracking</p>
                                <div className="flex items-center gap-1.5 mt-2">
                                    <Clock className="text-slate-400" size={12} />
                                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Phase 2</span>
                                </div>
                            </div>
                        </div>

                        <div className="h-px bg-slate-100" />

                        <a href="/calendar" className="flex items-start gap-3 group">
                            <div className="p-2 bg-blue-50 rounded-xl group-hover:bg-blue-100 transition-colors">
                                <Calendar className="text-blue-600" size={18} />
                            </div>
                            <div className="flex-1">
                                <h4 className="font-bold text-slate-800 text-sm">Calendar View</h4>
                                <p className="text-xs text-slate-500 mt-1">Visualize spending by date & week</p>
                                <div className="flex items-center gap-1.5 mt-2">
                                    <span className="text-[10px] text-green-600 font-bold uppercase tracking-wider bg-green-50 px-1.5 py-0.5 rounded-full">Live</span>
                                </div>
                            </div>
                            <ArrowRight className="text-slate-300 group-hover:text-blue-400 transition-colors mt-1" size={16} />
                        </a>

                        <div className="h-px bg-slate-100" />

                        <div className="flex items-start gap-3 group">
                            <div className="p-2 bg-green-50 rounded-xl group-hover:bg-green-100 transition-colors">
                                <Upload className="text-green-600" size={18} />
                            </div>
                            <div className="flex-1">
                                <h4 className="font-bold text-slate-800 text-sm">Receipt Upload</h4>
                                <p className="text-xs text-slate-500 mt-1">CSV import & bulk transactions</p>
                                <div className="flex items-center gap-1.5 mt-2">
                                    <Clock className="text-slate-400" size={12} />
                                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Phase 4</span>
                                </div>
                            </div>
                        </div>

                        <div className="h-px bg-slate-100" />

                        <a href="/goals" className="flex items-start gap-3 group">
                            <div className="p-2 bg-purple-50 rounded-xl group-hover:bg-purple-100 transition-colors">
                                <Target className="text-purple-600" size={18} />
                            </div>
                            <div className="flex-1">
                                <h4 className="font-bold text-slate-800 text-sm">Savings Goals</h4>
                                <p className="text-xs text-slate-500 mt-1">Track goals & multi-year planning</p>
                                <div className="flex items-center gap-1.5 mt-2">
                                    <span className="text-[10px] text-green-600 font-bold uppercase tracking-wider bg-green-50 px-1.5 py-0.5 rounded-full">Live</span>
                                </div>
                            </div>
                            <ArrowRight className="text-slate-300 group-hover:text-purple-400 transition-colors mt-1" size={16} />
                        </a>
                    </div>
                </Card>
            </motion.section>

            {/* Floating Heart Button for Mood Check-in */}
            {couple && (
                <motion.button
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.5, type: "spring" }}
                    onClick={() => setMoodModalOpen(true)}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    className="fixed bottom-24 right-6 w-14 h-14 bg-gradient-button rounded-full shadow-2xl flex items-center justify-center z-50 border-2 border-white"
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
