"use client";

import { FullPageLoader } from "@/components/FullPageLoader";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCouple } from "@/hooks/use-couple";
import { deleteAccount, signOut, updateCurrentUserProfile } from "@/lib/actions/auth";
import { uploadAvatar } from "@/lib/actions/storage";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { ChangePasswordModal } from "@/components/settings/ChangePasswordModal";
import { AnimatePresence, motion } from "framer-motion";
import {
    AlertTriangle,
    ArrowLeft,
    Bell,
    Camera,
    Check, ChevronRight,
    Copy,
    Download,
    Edit2,
    Heart,
    HelpCircle,
    Image as ImageIcon,
    Info,
    Lock,
    LogOut,
    Mail,
    Moon,
    Palette,
    Save,
    Send,
    Settings as SettingsIcon,
    Shield,
    Share2,
    Sparkles,
    Sun,
    Trash2,
    User,
    UserCheck2,
    X
} from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import React, { useEffect, useState } from "react";

type SettingsSection = "profile" | "couple" | "preferences" | "notifications" | "privacy" | "help";

const THEMES = [
    { id: "blush", name: "Blush", colors: "from-pink-100 to-rose-100", accent: "#e91e63" },
    { id: "lavender", name: "Lavender", colors: "from-purple-100 to-violet-100", accent: "#9c27b0" },
    { id: "mint", name: "Mint", colors: "from-green-100 to-emerald-100", accent: "#10b981" },
    { id: "sunset", name: "Sunset", colors: "from-orange-100 to-amber-100", accent: "#f59e0b" },
];

export default function SettingsPage() {
    const router = useRouter();
    const queryClient = useQueryClient();
    const { user, profile, couple, daysTogether, isLoading } = useCouple();

    const [activeSection, setActiveSection] = useState<SettingsSection>("profile");
    const [editing, setEditing] = useState(false);
    const [inviteCodeCopied, setInviteCodeCopied] = useState(false);
    const [selectedTheme, setSelectedTheme] = useState("blush");
    const [darkMode, setDarkMode] = useState(false);
    const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
    const [notifications, setNotifications] = useState({
        push: true,
        email: true,
        posts: true,
        comments: true,
        likes: true,
    });

    const avatarInputRef = React.useRef<HTMLInputElement | null>(null);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deletingAccount, setDeletingAccount] = useState(false);

    const [formData, setFormData] = useState({
        full_name: "",
        avatar_url: "",
        bio: "",
    });

    useEffect(() => {
        if (!isLoading && !user) {
            router.push("/login");
        }
    }, [user, isLoading, router]);

    useEffect(() => {
        if (profile) {
            setFormData({
                full_name: (profile as any)?.full_name || "",
                avatar_url: (profile as any)?.avatar_url || "",
                bio: (profile as any)?.bio || "",
            });
        }
    }, [profile]);

    const handleSave = async () => {
        if (!user) return;

        const previousData = queryClient.getQueryData(['couple', user.id]);
        queryClient.setQueryData(['couple', user.id], (old: any) => {
            if (!old) return old;
            return {
                ...old,
                full_name: formData.full_name,
                avatar_url: formData.avatar_url,
            };
        });

        setEditing(false);

        try {
            await updateCurrentUserProfile({
                full_name: formData.full_name,
                avatar_url: formData.avatar_url,
            });
            queryClient.invalidateQueries({ queryKey: ['couple', user.id] });
        } catch (error: any) {
            queryClient.setQueryData(['couple', user.id], previousData);
            setEditing(true);
            alert(error.message || 'Failed to update profile');
        }
    };

    const handleAvatarFileSelected = async (file: File) => {
        if (!user?.id) return;

        setUploadingAvatar(true);
        try {
            const formData = new FormData();
            formData.append("file", file);

            // Preview immediately
            const previewUrl = URL.createObjectURL(file);
            setFormData((prev) => ({ ...prev, avatar_url: previewUrl }));

            const result = await uploadAvatar(formData);
            if (result.success && result.publicUrl) {
                setFormData((prev) => ({ ...prev, avatar_url: result.publicUrl }));
                queryClient.invalidateQueries({ queryKey: ['couple', user.id] });
            } else {
                throw new Error(result.error || "Upload failed");
            }
        } catch (error: any) {
            console.error("Avatar upload failed:", error);
            // Revert preview on error if needed
        } finally {
            setUploadingAvatar(false);
        }
    };

    const handleSignOut = async () => {
        await signOut();
        router.push("/landing");
    };

    const copyInviteCode = () => {
        if (couple?.invite_code) {
            navigator.clipboard.writeText(couple.invite_code);
            setInviteCodeCopied(true);
            setTimeout(() => setInviteCodeCopied(false), 2000);
        }
    };

    const shareInviteCode = async () => {
        if (!couple?.invite_code) return;
        const shareData = {
            title: 'Our Little World',
            text: `Join my world! Use my invite code: ${couple.invite_code}`,
            url: `${window.location.origin}/onboarding?code=${couple.invite_code}`,
        };
        
        try {
            if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
                await navigator.share(shareData);
            } else {
                copyInviteCode();
            }
        } catch (err) {
            console.error('Error sharing:', err);
            // Don't alerts on cancel
            if ((err as Error).name !== 'AbortError') {
                copyInviteCode();
            }
        }
    };

    const handleAccountDelete = async () => {
        setDeletingAccount(true);
        try {
            await deleteAccount();
        } catch (err: any) {
            // Next.js redirects throw a special error that we should ignore on the client
            if (err.message?.includes("NEXT_REDIRECT")) return;
            
            console.error("Delete failed:", err);
            alert(err.message || "Failed to delete account");
            setDeletingAccount(false);
        }
    };

    if (isLoading) {
        return <FullPageLoader />;
    }

    const isSingle = profile?.user_type === 'SINGLE';

    const sections = [
        { id: "profile", label: "Profile", icon: User, color: isSingle ? "text-emerald-600" : "text-blue-600", bg: isSingle ? "bg-emerald-50" : "bg-blue-50" },
        ...(!isSingle ? [{ id: "couple", label: "Couple", icon: Heart, color: "text-pink-600", bg: "bg-pink-50" }] : []),
        { id: "preferences", label: "Preferences", icon: Palette, color: "text-purple-600", bg: "bg-purple-50" },
        { id: "notifications", label: "Notifications", icon: Bell, color: "text-amber-600", bg: "bg-amber-50" },
        { id: "privacy", label: "Privacy", icon: Shield, color: isSingle ? "text-emerald-600" : "text-green-600", bg: isSingle ? "bg-emerald-50" : "bg-green-50" },
        { id: "help", label: "Help", icon: HelpCircle, color: "text-slate-600", bg: "bg-slate-50" },
    ];

    return (
        <div className={cn(
            "min-h-screen p-6 pb-32",
            isSingle 
                ? "bg-gradient-to-br from-emerald-50 via-white to-indigo-50/20" 
                : "bg-gradient-to-br from-romantic-warm via-white to-romantic-blush/20"
        )}>
            <div className="max-w-4xl mx-auto space-y-6">
                {/* Header */}
                <motion.header
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center justify-between"
                >
                    <div className="flex items-center gap-3">
                        <a
                            href="/dashboard"
                            className="p-2 rounded-full bg-white hover:bg-slate-50 transition-colors shadow-sm"
                        >
                            <ArrowLeft className="text-slate-600" size={20} />
                        </a>
                        <div>
                            <h1 className="text-3xl font-black text-slate-800 flex items-center gap-2">
                                <SettingsIcon className={isSingle ? "text-emerald-600" : "text-romantic-heart"} size={28} />
                                Settings
                            </h1>
                            <p className="text-sm text-slate-500 mt-0.5">Manage your account and preferences</p>
                        </div>
                    </div>
                    <Button
                        onClick={handleSignOut}
                        variant="outline"
                        className="rounded-full border-slate-200 text-slate-600 hover:bg-slate-50"
                    >
                        <LogOut size={18} className="mr-2" />
                        Sign Out
                    </Button>
                </motion.header>

                {/* Navigation Tabs */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="grid grid-cols-3 md:grid-cols-6 gap-2"
                >
                    {sections.map((section) => {
                        const Icon = section.icon;
                        const isActive = activeSection === section.id;
                        if (section.id === "preferences") return null;
                        return (
                            <button
                                key={section.id}
                                onClick={() => setActiveSection(section.id as SettingsSection)}
                                className={cn(
                                    "flex flex-col items-center gap-2 p-4 rounded-2xl transition-all",
                                    isActive
                                        ? `${section.bg} ${section.color} shadow-md`
                                        : "bg-white text-slate-600 hover:bg-slate-50"
                                )}
                            >
                                <Icon size={24} />
                                <span className="text-xs font-bold">{section.label}</span>
                            </button>
                        );
                    })}
                </motion.div>

                {/* Content Sections */}
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeSection}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.2 }}
                        className="space-y-4"
                    >
                        {/* Profile Section */}
                        {activeSection === "profile" && (
                            <Card className="p-6 border-none shadow-lg bg-white rounded-3xl">
                                <h2 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2">
                                    <User className={isSingle ? "text-emerald-600" : "text-blue-600"} size={24} />
                                    Profile Information
                                </h2>

                                <div className="space-y-6">
                                    {/* Avatar Section */}
                                    <div className="flex items-center gap-6">
                                        <div className="relative">
                                            <Avatar className={cn("w-24 h-24 border-4 shadow-lg", isSingle ? "border-emerald-100" : "border-blue-100")}>
                                                <AvatarImage src={formData.avatar_url} />
                                                <AvatarFallback className={cn("text-white text-2xl font-bold", isSingle ? "bg-emerald-500" : "bg-gradient-button")}>
                                                    {formData.full_name?.charAt(0) || user?.email?.charAt(0).toUpperCase()}
                                                </AvatarFallback>
                                            </Avatar>
                                            {editing && (
                                                <button
                                                    type="button"
                                                    onClick={() => avatarInputRef.current?.click()}
                                                    disabled={uploadingAvatar}
                                                    className={cn("absolute bottom-0 right-0 p-2 text-white rounded-full shadow-lg hover:scale-110 transition-transform", isSingle ? "bg-emerald-600" : "bg-blue-600")}
                                                >
                                                    <Camera size={16} />
                                                </button>
                                            )}
                                            <input
                                                ref={avatarInputRef}
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                onChange={(e) => {
                                                    const file = e.target.files?.[0];
                                                    e.target.value = "";
                                                    if (file) handleAvatarFileSelected(file);
                                                }}
                                            />
                                        </div>

                                        <div className="flex-1">
                                            {editing ? (
                                                <div className="space-y-3">
                                                    <div>
                                                        <Label className="text-xs font-bold text-slate-600 uppercase">Full Name</Label>
                                                        <Input
                                                            value={formData.full_name}
                                                            onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                                            className="mt-1 rounded-xl"
                                                        />
                                                    </div>
                                                </div>
                                            ) : (
                                                <div>
                                                    <h3 className="text-2xl font-bold text-slate-800">{profile?.full_name || "No name set"}</h3>
                                                    <p className="text-sm text-slate-500 mt-1">{user?.email}</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Bio Section */}
                                    {editing && (
                                        <div className="space-y-2">
                                            <Label className="text-xs font-bold text-slate-600 uppercase">Bio</Label>
                                            <textarea
                                                value={formData.bio}
                                                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                                                placeholder={isSingle ? "Write a little about yourself..." : "Tell your partner about yourself..."}
                                                className={cn("w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none resize-none", isSingle ? "focus:border-emerald-500" : "focus:border-blue-500")}
                                                rows={3}
                                                maxLength={200}
                                            />
                                            <p className="text-xs text-slate-400 text-right">{formData.bio.length}/200</p>
                                        </div>
                                    )}

                                    {/* Action Buttons */}
                                    <div className="flex gap-3 pt-4">
                                        {editing ? (
                                            <>
                                                <Button
                                                    onClick={handleSave}
                                                    disabled={uploadingAvatar}
                                                    className={cn("flex-1 rounded-xl text-white", isSingle ? "bg-emerald-600 hover:bg-emerald-700" : "bg-blue-600 hover:bg-blue-700")}
                                                >
                                                    <Save size={18} className="mr-2" />
                                                    Save Changes
                                                </Button>
                                                <Button
                                                    onClick={() => {
                                                        setEditing(false);
                                                        setFormData({
                                                            full_name: profile?.full_name || "",
                                                            avatar_url: profile?.avatar_url || "",
                                                            bio: "",
                                                        });
                                                    }}
                                                    variant="outline"
                                                    className="flex-1 rounded-xl"
                                                >
                                                    <X size={18} className="mr-2" />
                                                    Cancel
                                                </Button>
                                            </>
                                        ) : (
                                            <Button
                                                onClick={() => setEditing(true)}
                                                variant="outline"
                                                className={cn("w-full rounded-xl border-blue-200 hover:bg-blue-50", isSingle && "border-emerald-200 hover:bg-emerald-50")}
                                            >
                                                <Edit2 size={18} className="mr-2" />
                                                Edit Profile
                                            </Button>
                                        )}
                                    </div>

                                    {/* Stats */}
                                    <div className="grid grid-cols-3 gap-3 pt-4 border-t">
                                        <div className={cn("text-center p-3 rounded-xl", isSingle ? "bg-emerald-50" : "bg-blue-50")}>
                                            <p className={cn("text-2xl font-black", isSingle ? "text-emerald-600" : "text-blue-600")}>
                                                {isSingle ? "Solo" : daysTogether}
                                            </p>
                                            <p className="text-[10px] text-slate-500 font-bold uppercase">{isSingle ? "Explorer" : "Days Together"}</p>
                                        </div>
                                        <div className="text-center p-3 bg-pink-50 rounded-xl">
                                            <p className="text-2xl font-black text-pink-600">0</p>
                                            <p className="text-[10px] text-slate-500 font-bold uppercase">Posts</p>
                                        </div>
                                        <div className="text-center p-3 bg-purple-50 rounded-xl">
                                            <p className="text-2xl font-black text-purple-600">0</p>
                                            <p className="text-[10px] text-slate-500 font-bold uppercase">Photos</p>
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        )}

                        {/* Couple Section */}
                        {activeSection === "couple" && (
                            <Card className="p-6 border-none shadow-lg bg-white rounded-3xl">
                                <h2 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2">
                                    <Heart className="text-pink-600" size={24} />
                                    Couple Settings
                                </h2>

                                {couple ? (
                                    <div className="space-y-6">
                                        {/* Couple Name */}
                                        <div>
                                            <Label className="text-xs font-bold text-slate-600 uppercase">Couple Name</Label>
                                            <p className="text-lg font-bold text-slate-800 mt-1">{couple.couple_name || "Our Little World"}</p>
                                        </div>

                                        {/* Anniversary */}
                                        {couple.start_date && (
                                            <div>
                                                <Label className="text-xs font-bold text-slate-600 uppercase">Anniversary</Label>
                                                <p className="text-lg font-bold text-slate-800 mt-1">
                                                    {new Date(couple.start_date).toLocaleDateString()}
                                                </p>
                                                <p className="text-sm text-pink-600 font-medium mt-1">
                                                    {daysTogether} days together ✨
                                                </p>
                                            </div>
                                        )}

                                        {/* Invite Code */}
                                        {couple.members && couple.members.length < 2 && (
                                            <div className="p-6 bg-gradient-to-br from-pink-50/50 to-rose-50/50 rounded-3xl border border-pink-100 shadow-sm relative overflow-hidden">
                                                <div className="absolute -right-8 -top-8 w-32 h-32 bg-pink-200/20 rounded-full blur-2xl" />
                                                
                                                <div className="relative z-10 space-y-4 text-center">
                                                    <div className="space-y-1">
                                                        <Label className="text-[10px] font-black text-pink-500 uppercase tracking-[0.2em] flex items-center justify-center gap-2">
                                                            <Sparkles size={12} />
                                                            Invite Your Partner
                                                        </Label>
                                                        <div className="bg-white/80 backdrop-blur-sm rounded-2xl py-4 mt-2 border border-white/50 shadow-inner">
                                                            <p className="text-2xl font-black text-slate-800 tracking-[0.2em] font-mono leading-none">
                                                                {couple.invite_code || "------"}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <button
                                                            onClick={copyInviteCode}
                                                            className="flex items-center justify-center gap-2 h-11 bg-white border border-pink-100 rounded-xl text-slate-600 font-bold text-xs shadow-sm hover:shadow-md active:scale-95 transition-all group"
                                                        >
                                                            {inviteCodeCopied ? (
                                                                <>
                                                                    <Check size={14} className="text-green-500" />
                                                                    <span className="text-green-600">Copied!</span>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <Copy size={14} className="group-hover:text-pink-500 transition-colors" />
                                                                    <span>Copy</span>
                                                                </>
                                                            )}
                                                        </button>
                                                        <button
                                                            onClick={shareInviteCode}
                                                            className="flex items-center justify-center gap-2 h-11 bg-pink-600 border border-pink-500 rounded-xl text-white font-bold text-xs shadow-lg shadow-pink-200 hover:bg-pink-700 active:scale-95 transition-all group"
                                                        >
                                                            <Share2 size={14} className="group-hover:translate-x-0.5 transition-transform" />
                                                            <span>Share</span>
                                                        </button>
                                                    </div>
                                                    
                                                    <p className="text-[10px] text-slate-400 font-medium">
                                                        Share this code with your partner to connect.
                                                    </p>
                                                </div>
                                            </div>
                                        )}

                                        {couple.members && couple.members.length >= 2 && (
                                            <div className="p-4 bg-green-50 rounded-2xl border border-green-200">
                                                <p className="text-sm font-bold text-green-700 text-center">
                                                    ✨ Your world is complete! Both partners connected.
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="text-center py-10 space-y-6">
                                        <div className="mx-auto w-20 h-20 bg-romantic-blush/30 rounded-full flex items-center justify-center">
                                            <Heart className="text-romantic-heart/40" size={40} />
                                        </div>
                                        <div className="space-y-2">
                                            <h3 className="text-lg font-bold text-slate-800">No Couple Connected</h3>
                                            <p className="text-sm text-slate-500 max-w-[240px] mx-auto">
                                                Share your world with someone special to unlock memories, budgets, and more.
                                            </p>
                                        </div>
                                        <Button 
                                            onClick={() => router.push("/onboarding")}
                                            className="rounded-full bg-gradient-button px-8 shadow-lg shadow-romantic-heart/20"
                                        >
                                            <Sparkles className="mr-2" size={18} />
                                            Connect Your World
                                        </Button>
                                    </div>
                                )}
                            </Card>
                        )}

                        {/* Preferences Section */}
                        {activeSection === "preferences" && (
                            <Card className="p-6 border-none shadow-lg bg-white rounded-3xl">
                                <h2 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2">
                                    <Palette className="text-purple-600" size={24} />
                                    Appearance & Preferences
                                </h2>

                                <div className="space-y-6">
                                    {/* Theme Selection */}
                                    <div>
                                        <Label className="text-xs font-bold text-slate-600 uppercase mb-3 block">Color Theme</Label>
                                        <div className="grid grid-cols-2 gap-3">
                                            {THEMES.map((theme) => (
                                                <button
                                                    key={theme.id}
                                                    onClick={() => setSelectedTheme(theme.id)}
                                                    className={cn(
                                                        "p-4 rounded-2xl transition-all border-2",
                                                        selectedTheme === theme.id
                                                            ? "border-purple-500 shadow-lg"
                                                            : "border-slate-200 hover:border-slate-300"
                                                    )}
                                                >
                                                    <div className={cn("h-12 rounded-xl bg-gradient-to-r mb-2", theme.colors)} />
                                                    <p className="text-sm font-bold text-slate-800">{theme.name}</p>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Dark Mode */}
                                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                                        <div className="flex items-center gap-3">
                                            {darkMode ? <Moon size={20} className="text-slate-600" /> : <Sun size={20} className="text-amber-500" />}
                                            <div>
                                                <p className="font-bold text-slate-800">Dark Mode</p>
                                                <p className="text-xs text-slate-500">Easier on the eyes at night</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => setDarkMode(!darkMode)}
                                            className={cn(
                                                "w-14 h-8 rounded-full transition-colors relative",
                                                darkMode ? "bg-purple-600" : "bg-slate-300"
                                            )}
                                        >
                                            <div className={cn(
                                                "absolute top-1 w-6 h-6 bg-white rounded-full transition-transform",
                                                darkMode ? "right-1" : "left-1"
                                            )} />
                                        </button>
                                    </div>
                                </div>
                            </Card>
                        )}

                        {/* Notifications Section */}
                        {activeSection === "notifications" && (
                            <Card className="p-6 border-none shadow-lg bg-white rounded-3xl">
                                <h2 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2">
                                    <Bell className="text-amber-600" size={24} />
                                    Notification Settings
                                </h2>

                                <div className="space-y-4">
                                    {[
                                        { key: "Telegram", label: "Telegram Notifications", desc: "Get notified on your Telegram", icon: Send },
                                        { key: "email", label: "Email Notifications", desc: "Receive updates via email", icon: Mail },
                                        { key: "posts", label: "New Posts", desc: "When your partner posts", icon: ImageIcon },
                                        { key: "comments", label: "Comments", desc: "When someone comments", icon: Heart },
                                        { key: "likes", label: "Likes & Reactions", desc: "When someone reacts", icon: Heart },
                                    ].map((item) => {
                                        const Icon = item.icon;
                                        if (item.key === "posts" || item.key === "comments" || item.key === "likes") return null;
                                        return (
                                            <div key={item.key} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                                                <div className="flex items-center gap-3">
                                                    <Icon size={20} className="text-amber-600" />
                                                    <div>
                                                        <p className="font-bold text-slate-800">{item.label}</p>
                                                        <p className="text-xs text-slate-500">{item.desc}</p>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => setNotifications({ ...notifications, [item.key]: !notifications[item.key as keyof typeof notifications] })}
                                                    className={cn(
                                                        "w-14 h-8 rounded-full transition-colors relative",
                                                        notifications[item.key as keyof typeof notifications] ? "bg-amber-600" : "bg-slate-300"
                                                    )}
                                                >
                                                    <div className={cn(
                                                        "absolute top-1 w-6 h-6 bg-white rounded-full transition-transform",
                                                        notifications[item.key as keyof typeof notifications] ? "right-1" : "left-1"
                                                    )} />
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            </Card>
                        )}

                        {/* Privacy Section */}
                        {activeSection === "privacy" && (
                            <Card className="p-6 border-none shadow-lg bg-white rounded-3xl">
                                <h2 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2">
                                    <Shield className="text-green-600" size={24} />
                                    Privacy & Security
                                </h2>

                                <div className="space-y-3">
                                    {[
                                        { label: "Change Password", icon: Lock, action: () => setIsChangePasswordOpen(true) },
                                        { label: "Download Your Data", icon: Download, action: () => {} },
                                        { label: isSingle ? "Delete Personal Data" : "Delete Account", icon: Trash2, action: () => setShowDeleteConfirm(true), danger: true },
                                    ].map((item) => {
                                        if (item.label === "Download Your Data") return null;
                                        const Icon = item.icon;
                                        return (
                                            <button
                                                key={item.label}
                                                onClick={item.action}
                                                className={cn(
                                                    "w-full flex items-center justify-between p-4 rounded-2xl transition-colors",
                                                    item.danger
                                                        ? "bg-red-50 hover:bg-red-100 text-red-600"
                                                        : "bg-slate-50 hover:bg-slate-100"
                                                )}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <Icon size={20} />
                                                    <span className="font-bold">{item.label}</span>
                                                </div>
                                                <ChevronRight size={20} />
                                            </button>
                                        );
                                    })}
                                </div>
                            </Card>
                        )}

                        {/* Help Section */}
                        {activeSection === "help" && (
                            <Card className="p-6 border-none shadow-lg bg-white rounded-3xl">
                                <h2 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2">
                                    <HelpCircle className="text-slate-600" size={24} />
                                    Help & Support
                                </h2>

                                <div className="space-y-3">
                                    {[
                                        { label: "FAQ", icon: HelpCircle, href: "/help/faq" },
                                        { label: "Contact Support", icon: Mail, href: "/help/contact" },
                                        { label: "About Developer", icon: UserCheck2, href: "/help/about" },
                                        { label: "Report a Bug", icon: Info, href: "/help/contact" },
                                        { label: "App Version", icon: Info, value: "v1.0.0" },
                                    ].map((item) => {

                                        if (item.label === "Report a Bug") return null;
                                        const Icon = item.icon;
                                        
                                        const Content = (
                                            <div className="flex items-center justify-between w-full">
                                                <div className="flex items-center gap-3">
                                                    <Icon size={20} className="text-slate-600" />
                                                    <span className="font-bold text-slate-800">{item.label}</span>
                                                </div>
                                                {item.value ? (
                                                    <span className="text-sm text-slate-500">{item.value}</span>
                                                ) : (
                                                    <ChevronRight size={20} className="text-slate-400" />
                                                )}
                                            </div>
                                        );

                                        if (item.href) {
                                            return (
                                                <Link 
                                                    key={item.label}
                                                    href={item.href}
                                                    className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl hover:bg-slate-100 transition-colors"
                                                >
                                                    {Content}
                                                </Link>
                                            );
                                        }

                                        return (
                                            <div
                                                key={item.label}
                                                className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl"
                                            >
                                                {Content}
                                            </div>
                                        );
                                    })}
                                </div>
                            </Card>
                        )}
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* Change Password Modal */}
            <ChangePasswordModal 
                isOpen={isChangePasswordOpen} 
                onClose={() => setIsChangePasswordOpen(false)} 
                userEmail={user?.email || ""} 
            />

            {/* Delete Confirmation Modal */}
            <AnimatePresence>
                {showDeleteConfirm && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="bg-white rounded-4xl p-8 max-w-sm w-full shadow-2xl space-y-6 text-center"
                        >
                            <div className="mx-auto w-16 h-16 bg-red-50 rounded-full flex items-center justify-center">
                                <AlertTriangle className="text-red-600" size={32} />
                            </div>
                             <div className="space-y-2">
                                <h3 className="2xl font-black text-slate-800">{isSingle ? "Delete Data?" : "Delete Account?"}</h3>
                                <p className="text-sm text-slate-500">
                                    This action is permanent and cannot be undone. You will lose all your {isSingle ? "personal " : ""}data and memories.
                                </p>
                            </div>
                            <div className="flex flex-col gap-3">
                                <Button
                                    onClick={handleAccountDelete}
                                    disabled={deletingAccount}
                                    className="h-12 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-bold"
                                >
                                    {deletingAccount ? "Deleting..." : "Yes, Delete Account"}
                                </Button>
                                <Button
                                    onClick={() => setShowDeleteConfirm(false)}
                                    variant="ghost"
                                    className="h-12 rounded-2xl text-slate-500 hover:text-slate-800 font-bold"
                                >
                                    Cancel
                                </Button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
