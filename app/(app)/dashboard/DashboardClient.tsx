"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { BudgetOverview } from "@/components/love/BudgetOverview";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Heart, Stars, MapPin, Sparkles, Pencil, Wallet, TrendingUp, Calendar, Bell, ArrowRight, Zap, Gift, Settings } from "lucide-react";
import { DailyMoodBadge } from "@/components/moods/DailyMoodBadge";
import { formatAnniversaryDate } from "@/lib/utils/date-utilities";
import { AIFloatingAdvisor } from "@/components/ai/AIFloatingAdvisor";
import { intervalToDuration, differenceInDays } from "date-fns";

interface DashboardUser {
    id: string;
    name?: string | null;
}

interface DashboardProfile {
    user_type: string;
    full_name: string | null;
    avatar_url: string | null;
}

interface DashboardMember {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
}

interface DashboardCouple {
    id: string;
    couple_name: string | null;
    partner_1_nickname: string | null;
    partner_2_nickname: string | null;
    start_date: string | Date | null;
    members: DashboardMember[];
}

interface DashboardClientProps {
    user: DashboardUser;
    profile: DashboardProfile | null;
    couple: DashboardCouple | null;
    daysTogether: number;
    daysActive: number;
}

export function DashboardClient({ user, profile, couple, daysTogether, daysActive }: DashboardClientProps) {
    const [displayMode, setDisplayMode] = useState<"days" | "months" | "ymd" | "md" | "dh">("days");
    const isSingle = profile?.user_type === "SINGLE";
    const router = useRouter();

    // Derived values for the partner
    const otherPartner = couple?.members?.find((member) => member.id !== user.id);
    const hasAnniversary = Boolean(couple?.start_date);
    const coupleName = couple?.couple_name?.trim() || "Our Little World";
    const primaryPartnerName = couple?.partner_1_nickname?.trim() || profile?.full_name?.split(" ")[0] || "You";
    const secondaryPartnerName = couple?.partner_2_nickname?.trim() || otherPartner?.full_name?.split(" ")[0] || "Partner";
    const anniversaryLabel = hasAnniversary
        ? formatAnniversaryDate(couple?.start_date)
        : "Open Couple Settings";

    // Calculate relationship duration labels based on anniversary date
    const anniversaryDate = couple?.start_date ? new Date(couple.start_date) : null;
    const now = new Date();
    
    // Decompose duration using date-fns
    const duration = anniversaryDate ? intervalToDuration({ start: anniversaryDate, end: now }) : null;
    const totalDays = anniversaryDate ? differenceInDays(now, anniversaryDate) + 1 : 0;
    
    const relationshipCounterLabel = !anniversaryDate 
        ? "Set your special day" 
        : (() => {
            switch (displayMode) {
                case "days":
                    return `Day ${totalDays.toLocaleString()} Together`;
                case "months": {
                    const months = (duration?.years || 0) * 12 + (duration?.months || 0);
                    return `${months} Months Together`;
                }
                case "ymd": {
                    const parts = [];
                    if (duration?.years) parts.push(`${duration.years} Years`);
                    if (duration?.months) parts.push(`${duration.months} Months`);
                    if (duration?.days) parts.push(`${duration.days} Days`);
                    return parts.length > 0 ? parts.join(", ") : "Day 1 Together";
                }
                case "md": {
                    const totalMonths = (duration?.years || 0) * 12 + (duration?.months || 0);
                    const parts = [];
                    if (totalMonths > 0) parts.push(`${totalMonths} Months`);
                    if (duration?.days) parts.push(`${duration.days} Days`);
                    return parts.length > 0 ? parts.join(", ") : "Day 1 Together";
                }
                case "dh": {
                    const hours = duration?.hours || 0;
                    return `${totalDays} Days, ${hours} Hours`;
                }
                default:
                    return `Day ${totalDays.toLocaleString()} Together`;
            }
        })();

    useEffect(() => {
        const routes = [
            "/budget",
            "/calendar",
            "/create-post",
            "/reminders",
            "/trips",
            "/settings",
        ];

        if (!isSingle) {
            routes.push("/chat");
        }

        routes.forEach((route) => {
            router.prefetch(route);
        });
    }, [isSingle, router]);

    return (
        <div className="p-6 space-y-8 max-w-2xl mx-auto">
            {/* Header Section */}
            <header className="flex items-center justify-between">
                <div className="space-y-1">
                    <h1 className="text-xl font-black text-slate-800 tracking-tighter flex items-center gap-2">
                        {isSingle ? (
                            <Stars className="text-emerald-500 fill-emerald-500" size={24} />
                        ) : (
                            <img src="/logo.png" alt="" className="w-8 h-8 object-contain mix-blend-multiply" />
                        )}
                        {isSingle ? "Personal Sanctuary" : "Our Little World"}
                    </h1>
                    <p className={`text-sm font-bold tracking-widest pl-1 ${isSingle ? "text-emerald-600/60" : "text-slate-400"}`}>
                        Welcome, {profile?.full_name?.split(" ")[0] || user.name?.split(" ")[0] || "Explorer"}!
                    </p>
                </div>

                <div className="flex items-center gap-4">
                    {couple ? (
                        <div className="flex items-center -space-x-4">
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
                    ) : (
                        <Avatar className="w-14 h-14 border-4 border-white shadow-md">
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
                        <div className="relative z-10 flex items-center gap-6">
                            <div className="w-24 h-24 bg-emerald-100 rounded-3xl flex items-center justify-center shadow-inner group overflow-hidden border-4 border-white">
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
                                    <span className="text-[10px] font-black tracking-widest bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                                        Day {daysActive} explorer
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
                couple && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.5 }}
                    >
                        <Card className="relative overflow-hidden p-5 border-none bg-gradient-to-br from-romantic-blush/40 via-romantic-lavender/40 to-white shadow-xl rounded-3xl">
                            <div className="relative z-10 text-center space-y-4">
                                <div className="flex flex-col items-center space-y-3">
                                    <div className="flex items-center justify-center -space-x-5">
                                        <div className="relative group">
                                            <Avatar className="w-24 h-24 border-4 border-white shadow-xl relative">
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
                                            <Avatar className="w-24 h-24 border-4 border-white shadow-xl relative">
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
                                            {primaryPartnerName} & {secondaryPartnerName}
                                        </h3>
                                        <span className="text-xs font-bold text-slate-400 tracking-wide bg-white/50 px-2.5 py-0.5 rounded-full">
                                            {coupleName}
                                        </span>
                                    </div>
                                </div>

                                <div className="space-y-2 flex flex-col items-center">
                                    <button
                                        onClick={() => {
                                            if (!hasAnniversary) {
                                                router.push("/settings?section=couple");
                                                return;
                                            }
                                            
                                            // Handle cycle: days -> months -> ymd -> md -> dh -> days
                                            const modes: (typeof displayMode)[] = ["days", "months", "ymd", "md", "dh"];
                                            const nextIndex = (modes.indexOf(displayMode) + 1) % modes.length;
                                            setDisplayMode(modes[nextIndex]);
                                        }}
                                        className={`text-lg font-semibold text-slate-800 transition-colors tracking-tight ${hasAnniversary ? "hover:text-romantic-heart cursor-pointer" : "hover:text-romantic-heart cursor-pointer"}`}
                                    >
                                        {relationshipCounterLabel}
                                    </button>

                                    {hasAnniversary ? (
                                        <div className="flex items-center justify-center gap-1.5 bg-slate-50/80 backdrop-blur-sm px-3 py-1.5 rounded-full border border-white/50 shadow-sm w-fit mx-auto">
                                            <Calendar className="text-romantic-heart w-3 h-3" />
                                            <p className="text-[10px] font-bold text-slate-500 tracking-wide">
                                                {anniversaryLabel}
                                            </p>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => router.push("/settings?section=couple")}
                                            className="flex items-center justify-center gap-1.5 bg-white/80 backdrop-blur-sm px-3 py-1.5 rounded-full border border-romantic-blush/60 shadow-sm w-fit mx-auto hover:border-romantic-heart hover:bg-white transition-colors"
                                        >
                                            <Calendar className="text-romantic-heart w-3 h-3" />
                                            <p className="text-[10px] font-bold text-slate-500 tracking-wide">
                                                {anniversaryLabel}
                                            </p>
                                        </button>
                                    )}
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
                    <Link href="/budget" prefetch className="block">
                        <motion.div
                            whileHover={{ scale: 1.02, y: -2 }}
                            whileTap={{ scale: 0.98 }}
                            data-pan-y="true"
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
                        </motion.div>
                    </Link>

                    <Link href="/budget" prefetch className="block">
                        <motion.div
                            whileHover={{ scale: 1.02, y: -2 }}
                            whileTap={{ scale: 0.98 }}
                            data-pan-y="true"
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
                        </motion.div>
                    </Link>

                    <Link href="/calendar" prefetch className="block">
                        <motion.div
                            whileHover={{ scale: 1.02, y: -2 }}
                            whileTap={{ scale: 0.98 }}
                            data-pan-y="true"
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
                        </motion.div>
                    </Link>

                    <Link href="/create-post" prefetch className="block">
                        <motion.div
                            whileHover={{ scale: 1.02, y: -2 }}
                            whileTap={{ scale: 0.98 }}
                            data-pan-y="true"
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
                        </motion.div>
                    </Link>

                    <Link href="/trips" prefetch className="block">
                        <motion.div
                            whileHover={{ scale: 1.02, y: -2 }}
                            whileTap={{ scale: 0.98 }}
                            data-pan-y="true"
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
                        </motion.div>
                    </Link>

                    <Link href="/settings" prefetch className="block">
                        <motion.div
                            whileHover={{ scale: 1.02, y: -2 }}
                            whileTap={{ scale: 0.98 }}
                            data-pan-y="true"
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
                        </motion.div>
                    </Link>
                </div>
            </motion.section>

            {/* Main Widgets */}
            {isSingle ? (
                <section className="space-y-6">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-bold text-slate-800">Wealth Planner</h3>
                        <span className="text-xs font-bold text-emerald-600 tracking-widest px-3 py-1 bg-emerald-50 rounded-full italic">Growing</span>
                    </div>
                    {/* Reuse BudgetOverview or create a solo version if needed, but for now it should handle null coupleId */}
                    <BudgetOverview id={user?.id} />
                </section>
            ) : (
                couple && (
                    <section className="space-y-6">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-bold text-slate-800">Finances</h3>
                            <span className="text-xs font-bold text-romantic-heart tracking-widest px-3 py-1 bg-romantic-blush/30 rounded-full italic">Healthy</span>
                        </div>
                        <BudgetOverview id={couple?.id} />
                    </section>
                )
            )}

            {/* New Features */}
            <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="space-y-4 pb-6"
            >
                <div className="flex items-center gap-2">
                    <Gift className="text-romantic-heart" size={20} />
                    <h3 className="text-lg font-bold text-slate-800">New Feature</h3>
                    <span className="text-xs font-bold text-amber-600 tracking-widest px-2 py-0.5 bg-amber-50 rounded-full">New</span>
                </div>
                <Card className="p-5 border-none bg-gradient-to-br from-slate-50 to-white shadow-sm rounded-3xl">
                    <div className="space-y-4">
                        <Link href="/reminders" prefetch className="flex items-start gap-3 group">
                            <div className="p-2 bg-amber-50 rounded-xl group-hover:bg-amber-100 transition-colors">
                                <Bell className="text-amber-600" size={18} />
                            </div>
                            <div className="flex-1">
                                <h4 className="font-bold text-slate-800 text-sm">Smart Reminders</h4>
                                <p className="text-xs text-slate-500 mt-1">To-do reminders, trip alerts, and push notifications</p>
                                <div className="flex items-center gap-1.5 mt-2">
                                    <span className="text-[10px] text-green-600 font-bold tracking-wider bg-green-50 px-1.5 py-0.5 rounded-full">Live</span>
                                </div>
                            </div>
                            <ArrowRight className="text-slate-300 group-hover:text-amber-400 transition-colors mt-1" size={16} />
                        </Link>

                        <div className="h-px bg-slate-100" />

                        <Link href="/calendar" prefetch className="flex items-start gap-3 group">
                            <div className="p-2 bg-blue-50 rounded-xl group-hover:bg-blue-100 transition-colors">
                                <Calendar className="text-blue-600" size={18} />
                            </div>
                            <div className="flex-1">
                                <h4 className="font-bold text-slate-800 text-sm">Calendar View</h4>
                                <p className="text-xs text-slate-500 mt-1">Visualize spending by date & week</p>
                                <div className="flex items-center gap-1.5 mt-2">
                                    <span className="text-[10px] text-green-600 font-bold tracking-wider bg-green-50 px-1.5 py-0.5 rounded-full">Live</span>
                                </div>
                            </div>
                            <ArrowRight className="text-slate-300 group-hover:text-blue-400 transition-colors mt-1" size={16} />
                        </Link>
                        {!isSingle && (
                            <>
                                <div className="h-px bg-slate-100" />

                                <Link href="/chat" prefetch className="flex items-start gap-3 group">
                                    <div className="p-2 bg-indigo-50 rounded-xl group-hover:bg-indigo-100 transition-colors">
                                        <Heart className="text-indigo-600 fill-indigo-600" size={18} />
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="font-bold text-slate-800 text-sm">Private Messenger</h4>
                                        <p className="text-xs text-slate-500 mt-1">
                                            Send private messages only your partner can read
                                        </p>
                                        <div className="flex items-center gap-1.5 mt-2">
                                            <span className="text-[10px] text-green-600 font-bold tracking-wider bg-green-50 px-1.5 py-0.5 rounded-full">
                                                Live
                                            </span>
                                        </div>
                                    </div>
                                    <ArrowRight className="text-slate-300 group-hover:text-indigo-400 transition-colors mt-1" size={16} />
                                </Link>
                            </>
                        )}
                    </div>
                </Card>
            </motion.section>

            {/* Floating Button for Mood Check-in */}
            {/* Main Floating Button for Mood Check-in is now handled by AIFloatingAdvisor */}
            <AIFloatingAdvisor isSingle={isSingle} />
        </div>
    );
}
