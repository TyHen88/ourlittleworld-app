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
import { updateTodayMoodMessage, getHeroMessage } from "@/lib/actions/moods";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { AIFloatingAdvisor } from "@/components/ai/AIFloatingAdvisor";

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
    const isSingle = profile?.user_type === 'SINGLE';
    const displayColor = isSingle ? "emerald" : "romantic";
    const accentColor = isSingle ? "indigo" : "heart";

    // Derived values for the partner
    const otherPartner = couple?.members?.find((m: any) => m.id !== user?.id);

    // Calculate months together
    const monthsTogether = Math.floor(daysTogether / 30);

    const displayedHeroMessage = heroMessageLocal || "Love you more than yesterday";

    // Fetch hero message on mount
    useEffect(() => {
        if (!couple?.id) return;

        const fetchHeroMessage = async () => {
            const result = await getHeroMessage(couple.id);
            if (result.success && typeof result.message === 'string') {
                setHeroMessageLocal(result.message);
            }
            setLoadingHeroMessage(false);
        };

        fetchHeroMessage();
    }, [couple?.id]);

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
                <div className="space-y-1">
                    <h1 className="text-2xl font-black text-slate-800 tracking-tighter flex items-center gap-2">
                        {isSingle ? (
                            <Stars className="text-emerald-500 fill-emerald-500" size={24} />
                        ) : (
                            <img src="/logo.png" alt="" className="w-8 h-8 object-contain mix-blend-multiply" />
                        )}
                        {isSingle ? "Personal Sanctuary" : "Our Little World"}
                    </h1>
                    <p className={`text-sm font-bold uppercase tracking-widest pl-1 ${isSingle ? 'text-emerald-600/60' : 'text-slate-400'}`}>
                        Welcome, {profile?.full_name?.split(' ')[0] || user?.name?.split(' ')[0] || 'Explorer'}! {isSingle ? '🌿' : '✨'}
                    </p>
                </div>

                <div className="flex items-center gap-4">
                    {couple ? (
                        <div className="flex items-center -space-x-3">
                            <div className="relative">
                                <Avatar className="w-10 h-10 border-4 border-white shadow-md">
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
                                <Avatar className="w-10 h-10 border-4 border-white shadow-md">
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
                    ) : (
                        <Avatar className="w-12 h-12 border-4 border-white shadow-md">
                            <AvatarFallback className="bg-gradient-love text-white font-bold">
                                {profile?.avatar_url ? (
                                    <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                                ) : (profile?.full_name?.[0] || user?.name?.[0] || 'U')}
                            </AvatarFallback>
                        </Avatar>
                    )}
                </div>
            </header>

            {/* Milestone Card (Single or Couple) */}
            {isSingle ? (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <Card className="relative overflow-hidden p-6 border-none bg-gradient-to-br from-emerald-50 via-teal-50 to-white shadow-xl rounded-3xl">
                        <div className="relative z-10 flex items-center gap-5">
                            <div className="w-20 h-20 bg-emerald-100 rounded-3xl flex items-center justify-center shadow-inner group overflow-hidden border-4 border-white">
                                <Avatar className="w-full h-full rounded-none">
                                    <AvatarFallback className="bg-emerald-100 text-emerald-700 text-2xl font-black">
                                        {profile?.avatar_url ? (
                                            <img src={profile.avatar_url} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                        ) : (profile?.full_name?.[0] || user?.name?.[0] || 'U')}
                                    </AvatarFallback>
                                </Avatar>
                            </div>
                            <div className="space-y-1 text-left">
                                <h3 className="text-xl font-bold text-slate-800">Your Personal Journey</h3>
                                <p className="text-slate-500 font-medium">Capture moments and grow daily.</p>
                                <div className="pt-2 flex gap-2">
                                    <span className="text-[10px] font-black uppercase tracking-widest bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                                        Day {Math.floor((Date.now() - new Date(profile.created_at).getTime()) / (1000 * 60 * 60 * 24))} explorer
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                            <Sparkles size={80} className="text-emerald-600" />
                        </div>
                    </Card>
                </motion.div>
            ) : (
                couple?.couple_name && daysTogether > 0 && (
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
                )
            )}


            {/* Quick Actions */}
            <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="space-y-4"
            >
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <Zap className={isSingle ? "text-emerald-500" : "text-romantic-heart"} size={20} />
                    Quick Actions
                </h3>
                <div className="grid grid-cols-2 gap-3">
                    <motion.a
                        href="/budget"
                        whileHover={{ scale: 1.02, y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl border border-green-200 hover:border-green-200 transition-all group"
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
                        className={`p-4 bg-gradient-to-br from-pink-50 to-rose-50 rounded-2xl border border-pink-100 hover:border-pink-200 transition-all group ${isSingle ? 'from-emerald-50 to-teal-50 border-emerald-100 hover:border-emerald-200' : ''}`}
                    >
                        <div className="flex items-start justify-between">
                            <div className={`p-2 bg-pink-100 rounded-xl group-hover:bg-pink-200 transition-colors ${isSingle ? 'bg-emerald-100 group-hover:bg-emerald-200' : ''}`}>
                                {isSingle ? <Pencil className="text-emerald-600" size={20} /> : <Heart className="text-pink-600" size={20} />}
                            </div>
                            <ArrowRight className={`${isSingle ? 'text-emerald-300 group-hover:text-emerald-400' : 'text-pink-300 group-hover:text-pink-400'} transition-colors`} size={16} />
                        </div>
                        <h4 className="font-bold text-slate-800 mt-3 text-sm">{isSingle ? 'Personal Journal' : 'Our Memories'}</h4>
                        <p className="text-xs text-slate-500 mt-1">{isSingle ? 'Write your thoughts' : 'Share a moment'}</p>
                    </motion.a>

                    <motion.a
                        href="/trips"
                        whileHover={{ scale: 1.02, y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        className={`p-4 bg-gradient-to-br from-sky-50 to-blue-50 rounded-2xl border border-sky-100 hover:border-sky-200 transition-all group ${isSingle ? 'from-indigo-50 to-blue-50 border-indigo-100 hover:border-indigo-200' : ''}`}
                    >
                        <div className="flex items-start justify-between">
                            <div className={`p-2 bg-sky-100 rounded-xl group-hover:bg-sky-200 transition-colors ${isSingle ? 'bg-indigo-100 group-hover:bg-indigo-200' : ''}`}>
                                <MapPin className={isSingle ? "text-indigo-600" : "text-sky-600"} size={20} />
                            </div>
                            <ArrowRight className={`${isSingle ? 'text-indigo-300 group-hover:text-indigo-400' : 'text-sky-300 group-hover:text-sky-400'} transition-colors`} size={16} />
                        </div>
                        <h4 className="font-bold text-slate-800 mt-3 text-sm">Trip Planner</h4>
                        <p className="text-xs text-slate-500 mt-1">Plan your next adventure</p>
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
            {isSingle ? (
                <section className="space-y-6">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-bold text-slate-800">Wealth Planner</h3>
                        <span className="text-xs font-bold text-emerald-600 uppercase tracking-widest px-3 py-1 bg-emerald-50 rounded-full italic">Growing</span>
                    </div>
                    {/* Reuse BudgetOverview or create a solo version if needed, but for now it should handle null coupleId */}
                    <BudgetOverview id={user?.id} />
                </section>
            ) : (
                couple && (
                    <section className="space-y-6">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-bold text-slate-800">Finances</h3>
                            <span className="text-xs font-bold text-romantic-heart uppercase tracking-widest px-3 py-1 bg-romantic-blush/30 rounded-full italic">Healthy</span>
                        </div>
                        <BudgetOverview id={couple?.id} />
                    </section>
                )
            )}

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

            {/* Floating Button for Mood Check-in */}
            {/* Main Floating Button for Mood Check-in is now handled by AIFloatingAdvisor */}
            <AIFloatingAdvisor isSingle={isSingle} />

            <DailyMoodModal
                open={moodModalOpen}
                onOpenChange={setMoodModalOpen}
            />
        </div>
    );
}
