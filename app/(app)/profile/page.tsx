"use client";
import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Heart, Camera, Edit2, Save, X, LogOut, Copy, Check } from "lucide-react";
import { getCurrentUser, signOut, updateCurrentUserProfile } from "@/lib/actions/auth";
import { useRouter } from "next/navigation";

export default function ProfilePage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(false);
    const [user, setUser] = useState<any>(null);
    const [profile, setProfile] = useState<any>(null);
    const [couple, setCouple] = useState<any>(null);
    const [inviteCodeCopied, setInviteCodeCopied] = useState(false);

    const [formData, setFormData] = useState({
        full_name: "",
        avatar_url: "",
    });

    useEffect(() => {
        loadProfile();
    }, []);

    const loadProfile = async () => {
        setLoading(true);
        const result = await getCurrentUser();
        if (!result.success || !result.user) {
            router.push("/login");
            return;
        }

        setUser(result.user);
        setProfile(result.profile);
        setCouple((result.profile as any)?.couple ?? null);

        setFormData({
            full_name: (result.profile as any)?.full_name || "",
            avatar_url: (result.profile as any)?.avatar_url || "",
        });

        setLoading(false);
    };

    const handleSave = async () => {
        if (!user) return;

        const result = await updateCurrentUserProfile({
            full_name: formData.full_name,
            avatar_url: formData.avatar_url,
        });

        if (result.success) {
            setEditing(false);
            loadProfile();
        }
    };

    const handleSignOut = async () => {
        await signOut();
        router.push("/login");
    };

    const copyInviteCode = () => {
        if (couple?.invite_code) {
            navigator.clipboard.writeText(couple.invite_code);
            setInviteCodeCopied(true);
            setTimeout(() => setInviteCodeCopied(false), 2000);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gradient-love">
                <Heart className="text-romantic-heart animate-heart-beat fill-romantic-heart" size={64} />
            </div>
        );
    }

    const otherPartner = couple?.members?.find((m: any) => m.id !== user?.id) ?? null;
    return (
        <div className="min-h-screen bg-gradient-love p-6">
            <div className="max-w-2xl mx-auto space-y-6 pb-24">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <h1 className="text-3xl font-bold text-slate-800">Profile</h1>
                    <Button
                        onClick={handleSignOut}
                        variant="outline"
                        className="rounded-full border-romantic-blush text-slate-600 hover:bg-romantic-blush/20"
                    >
                        <LogOut size={18} className="mr-2" />
                        Sign Out
                    </Button>
                </div>

                {/* Profile Card */}
                <Card className="p-8 border-none shadow-2xl bg-white/80 backdrop-blur-xl rounded-4xl">
                    <div className="flex flex-col items-center space-y-6">
                        {/* Avatar */}
                        <div className="relative">
                            <Avatar className="w-32 h-32 border-4 border-romantic-blush shadow-xl">
                                <AvatarImage src={formData.avatar_url} />
                                <AvatarFallback className="bg-gradient-button text-white text-3xl font-bold">
                                    {formData.full_name?.charAt(0) || user?.email?.charAt(0).toUpperCase()}
                                </AvatarFallback>
                            </Avatar>
                            {editing && (
                                <button className="absolute bottom-0 right-0 p-3 bg-gradient-button text-white rounded-full shadow-lg hover:scale-110 transition-transform">
                                    <Camera size={20} />
                                </button>
                            )}
                        </div>

                        {/* Profile Info */}
                        <div className="w-full space-y-4">
                            {editing ? (
                                <>
                                    <div className="space-y-2">
                                        <Label className="text-sm font-semibold text-slate-600 uppercase tracking-wide ml-2">
                                            Full Name
                                        </Label>
                                        <Input
                                            value={formData.full_name}
                                            onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                            className="h-14 rounded-2xl border-romantic-blush bg-white/50"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-sm font-semibold text-slate-600 uppercase tracking-wide ml-2">
                                            Avatar URL
                                        </Label>
                                        <Input
                                            value={formData.avatar_url}
                                            onChange={(e) => setFormData({ ...formData, avatar_url: e.target.value })}
                                            placeholder="https://example.com/avatar.jpg"
                                            className="h-14 rounded-2xl border-romantic-blush bg-white/50"
                                        />
                                    </div>

                                    <div className="flex gap-3 pt-4">
                                        <Button
                                            onClick={handleSave}
                                            className="flex-1 h-12 rounded-2xl bg-gradient-button text-white shadow-lg"
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
                                                });
                                            }}
                                            variant="outline"
                                            className="flex-1 h-12 rounded-2xl border-romantic-blush"
                                        >
                                            <X size={18} className="mr-2" />
                                            Cancel
                                        </Button>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="text-center space-y-2">
                                        <h2 className="text-2xl font-bold text-slate-800">{profile?.full_name || "No name set"}</h2>
                                        <p className="text-sm text-slate-500 font-medium">{user?.email}</p>
                                    </div>

                                    <Button
                                        onClick={() => setEditing(true)}
                                        variant="outline"
                                        className="w-full h-12 rounded-2xl border-romantic-blush text-slate-700 hover:bg-romantic-blush/20"
                                    >
                                        <Edit2 size={18} className="mr-2" />
                                        Edit Profile
                                    </Button>
                                </>
                            )}
                        </div>
                    </div>
                </Card>

                {/* Couple Info Card */}
                {couple && (
                    <Card className="p-8 border-none shadow-2xl bg-white/80 backdrop-blur-xl rounded-4xl">
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <h3 className="text-xl font-bold text-slate-800">Our World</h3>
                                <div className="flex -space-x-3">
                                    <Avatar className="w-10 h-10 border-2 border-white">
                                        <AvatarFallback className="bg-romantic-blush text-romantic-heart text-xs">
                                            {profile?.full_name?.charAt(0) || "M"}
                                        </AvatarFallback>
                                    </Avatar>
                                    <Avatar className="w-10 h-10 border-2 border-white">
                                        <AvatarFallback className="bg-romantic-lavender text-slate-600 text-xs">
                                            {otherPartner ? "P" : "?"}
                                        </AvatarFallback>
                                    </Avatar>
                                </div>
                            </div>

                            {couple?.members && couple.members.length >= 2 ? (
                                <div className="p-4 bg-romantic-mint/20 rounded-2xl border border-romantic-mint">
                                    <p className="text-sm font-bold text-emerald-700 text-center">
                                        ✨ Your world is complete! Both partners connected.
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="p-4 bg-romantic-blush/20 rounded-2xl border border-romantic-blush">
                                        <p className="text-sm font-medium text-slate-600 text-center mb-3">
                                            Share this code with your partner:
                                        </p>
                                        <div className="relative">
                                            <div className="p-4 bg-gradient-love rounded-2xl text-center">
                                                <p className="text-3xl font-black text-slate-800 tracking-widest">
                                                    {couple.invite_code}
                                                </p>
                                            </div>
                                            <button
                                                onClick={copyInviteCode}
                                                className="absolute top-2 right-2 p-2 bg-white/80 rounded-full hover:bg-white transition-colors"
                                            >
                                                {inviteCodeCopied ? (
                                                    <Check size={18} className="text-green-600" />
                                                ) : (
                                                    <Copy size={18} className="text-slate-600" />
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4 pt-4">
                                <div className="text-center p-4 bg-slate-50 rounded-2xl">
                                    <p className="text-2xl font-bold text-slate-800">0</p>
                                    <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Posts</p>
                                </div>
                                <div className="text-center p-4 bg-slate-50 rounded-2xl">
                                    <p className="text-2xl font-bold text-slate-800">$0</p>
                                    <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Spent</p>
                                </div>
                            </div>
                        </div>
                    </Card>
                )}

                {/* No Couple Card */}
                {!couple && (
                    <Card className="p-8 border-none shadow-2xl bg-white/80 backdrop-blur-xl rounded-4xl text-center">
                        <Heart className="mx-auto text-romantic-heart/30 mb-4" size={48} />
                        <h3 className="text-xl font-bold text-slate-800 mb-2">No Couple Yet</h3>
                        <p className="text-slate-500 mb-6">Create or join a couple to start your journey together.</p>
                        <Button
                            onClick={() => router.push("/onboarding")}
                            className="h-12 rounded-2xl bg-gradient-button text-white shadow-lg"
                        >
                            Get Started
                        </Button>
                    </Card>
                )}
            </div>
        </div>
    );
}
