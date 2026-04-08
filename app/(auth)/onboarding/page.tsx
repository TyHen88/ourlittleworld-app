"use client";
import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Heart, ArrowRight, Sparkles, Plus, Users, Copy, Check, Share2,
    Calendar, Camera, Wand2, Upload, X, Globe, User, Book, Map, Target
} from "lucide-react";
import { FloatingHearts } from "@/components/love/FloatingHearts";
import { createWorld, joinWorld, generateWorldName, uploadCouplePhoto } from "@/lib/actions/world";
import { completeOnboarding, getCurrentUser } from "@/lib/actions/auth";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import confetti from "canvas-confetti";

// Romantic name suggestions
const NAME_SUGGESTIONS = [
    "LoveHaven", "BlissNest", "ForeverUs", "HeartHaven2026",
    "OurSweetEscape", "TwoHearts", "EndlessLove", "DreamTogether"
];

const SOLO_GUIDE_SLIDES = [
    {
        title: "Welcome, Explorer!",
        description: "Every journey starts with a single step. OurLittleWorld is your personal sanctuary for self-discovery and solo adventures.",
        icon: <Globe className="text-emerald-500" size={48} />,
        color: "emerald"
    },
    {
        title: "Personal Journal",
        description: "Capture your private moments, milestones, and daily reflections. A safe space for your unique journey.",
        icon: <Book className="text-indigo-500" size={48} />,
        color: "indigo"
    },
    {
        title: "Solo Goals & Habits",
        description: "Set personal growth targets and track your daily progress. Watch yourself bloom every day.",
        icon: <Target className="text-emerald-500" size={48} />,
        color: "emerald"
    },
    {
        title: "Wealth & Trips",
        description: "Plan your personal savings and map out your next big solo adventure. Dreams are just plans in progress.",
        icon: <Map className="text-indigo-500" size={48} />,
        color: "indigo"
    }
];

function normalizeInviteCodeInput(value: string) {
    return value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
}

function getErrorMessage(error: unknown, fallback: string) {
    return error instanceof Error && error.message ? error.message : fallback;
}

export default function EnhancedOnboardingPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { data: session, status } = useSession();
    const [onboardingType, setOnboardingType] = useState<"SINGLE" | "COUPLE" | "CHOOSE">("CHOOSE");
    const [step, setStep] = useState<number>(1);
    const [mode, setMode] = useState<"choose" | "create" | "join">("choose");
    const [createStep, setCreateStep] = useState<1 | 2 | 3>(1);
    const [userId, setUserId] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [guideStep, setGuideStep] = useState(0);

    // Create world state
    const [worldName, setWorldName] = useState("");
    const [startDate, setStartDate] = useState("");
    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);
    const [partnerNickname, setPartnerNickname] = useState("");

    // Join world state
    const [inviteCode, setInviteCode] = useState("");

    // Success state
    const [generatedCode, setGeneratedCode] = useState("");
    const [createdWorldName, setCreatedWorldName] = useState("");
    const [copied, setCopied] = useState(false);
    const [inviteNotice, setInviteNotice] = useState("");
    const [isCompletingCoupleOnboarding, setIsCompletingCoupleOnboarding] = useState(false);
    const joinRedirectTimeoutRef = React.useRef<number | null>(null);

    const checkProfile = useCallback(async () => {
        try {
            const userProfile = await getCurrentUser() as { onboarding_completed?: boolean } | null;
            if (userProfile?.onboarding_completed) {
                router.push("/dashboard");
                return;
            }
        } catch (err) {
            console.error("Profile check failed", err);
        }
    }, [router]);

    useEffect(() => {
        if (status === "unauthenticated") {
            router.push("/login");
            return;
        }

        if (session?.user?.id) {
            setUserId(session.user.id);
            checkProfile();
        }
    }, [status, session, checkProfile, router]);

    useEffect(() => {
        const sharedInviteCode = normalizeInviteCodeInput(searchParams.get("code") || "");

        if (!sharedInviteCode) {
            return;
        }

        setOnboardingType("COUPLE");
        setMode("join");
        setStep(3);
        setInviteCode(sharedInviteCode);
        setError("");
    }, [searchParams]);

    useEffect(() => {
        return () => {
            if (joinRedirectTimeoutRef.current) {
                window.clearTimeout(joinRedirectTimeoutRef.current);
            }
        };
    }, []);

    const handleGenerateName = async () => {
        const name = await generateWorldName();
        setWorldName(name);
    };

    const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setPhotoFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setPhotoPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const showInviteNotice = (message: string) => {
        setInviteNotice(message);
        setTimeout(() => setInviteNotice(""), 2800);
    };

    const setCopiedState = () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2200);
    };

    const copyTextToClipboard = async (value: string) => {
        if (!value || typeof navigator === "undefined" || !navigator.clipboard?.writeText) {
            return false;
        }

        try {
            await navigator.clipboard.writeText(value);
            return true;
        } catch (clipboardError) {
            console.error("Clipboard write failed", clipboardError);
            return false;
        }
    };

    const getInviteSharePayload = (code: string) => {
        const resolvedWorldName = createdWorldName || worldName.trim() || "our world";
        const joinUrl = typeof window === "undefined"
            ? ""
            : `${window.location.origin}/onboarding?code=${code}`;

        return {
            title: `Join ${resolvedWorldName}`,
            text: `Join ${resolvedWorldName} on OurLittleWorld with my invite code: ${code}`,
            url: joinUrl
        };
    };

    const finishCoupleOnboarding = useCallback(async () => {
        if (isCompletingCoupleOnboarding) {
            return;
        }

        setIsCompletingCoupleOnboarding(true);
        setError("");

        try {
            await completeOnboarding('COUPLE');
            router.push("/dashboard");
        } catch (err) {
            setIsCompletingCoupleOnboarding(false);
            setError(getErrorMessage(err, "Failed to finish onboarding"));
        }
    }, [isCompletingCoupleOnboarding, router]);

    const handleCreateWorld = async () => {
        if (!userId || !worldName.trim()) {
            setError("Please enter a world name");
            return;
        }

        setLoading(true);
        setError("");

        try {
            // Upload photo if provided
            let photoUrl = null;
            if (photoFile) {
                const formData = new FormData();
                formData.append("file", photoFile);
                const uploadResult = await uploadCouplePhoto(formData);
                if (uploadResult.success) {
                    photoUrl = uploadResult.url;
                }
            }

            // Create the world
            const result = await createWorld({
                userId,
                worldName: worldName.trim(),
                startDate: startDate || undefined,
                couplePhotoUrl: photoUrl || undefined,
                partnerNickname: partnerNickname.trim() || undefined,
                theme: 'blush'
            });

            if (result.success && result.inviteCode) {
                setGeneratedCode(result.inviteCode);
                setCreatedWorldName(result.worldName || worldName);
                setStep(4); // Success screen

                const copiedInviteCode = await copyTextToClipboard(result.inviteCode);
                if (copiedInviteCode) {
                    setCopiedState();
                    showInviteNotice("Invite code copied. Share it with your partner now.");
                }

                // Trigger confetti
                confetti({
                    particleCount: 100,
                    spread: 70,
                    origin: { y: 0.6 },
                    colors: ['#FFE4E1', '#E6E6FA', '#FF6B6B', '#FFB6C1']
                });
            } else {
                setError(result.error || "Failed to create world");
            }
        } catch (err) {
            setError(getErrorMessage(err, "Something went wrong"));
        } finally {
            setLoading(false);
        }
    };

    const handleJoinWorld = async () => {
        const normalizedInviteCode = normalizeInviteCodeInput(inviteCode);

        if (!userId || !normalizedInviteCode) {
            setError("Please enter your partner's invite code.");
            return;
        }

        setLoading(true);
        setError("");

        const result = await joinWorld({
            userId,
            inviteCode: normalizedInviteCode,
            partnerNickname: partnerNickname.trim() || undefined
        });

        setLoading(false);

        if (result.success) {
            setCreatedWorldName(result.worldName || "Your World");
            setStep(4); // Success screen

            // Trigger confetti
            confetti({
                particleCount: 150,
                spread: 80,
                origin: { y: 0.6 },
                colors: ['#FFE4E1', '#E6E6FA', '#FF6B6B', '#FFB6C1']
            });

            joinRedirectTimeoutRef.current = window.setTimeout(() => {
                void finishCoupleOnboarding();
            }, 3000);
        } else {
            setError(result.error || "Failed to join world");
        }
    };

    const copyInviteCode = async () => {
        const copiedInviteCode = await copyTextToClipboard(generatedCode);

        if (copiedInviteCode) {
            setCopiedState();
            return;
        }

        showInviteNotice("Couldn't copy here. Please long-press the code and share it manually.");
    };

    const shareInviteCode = async () => {
        if (!generatedCode) {
            return;
        }

        const sharePayload = getInviteSharePayload(generatedCode);

        if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
            try {
                await navigator.share(sharePayload);
                showInviteNotice("Share sheet opened. Your partner can join from the link or code.");
                return;
            } catch (shareError) {
                if (shareError instanceof Error && shareError.name === "AbortError") {
                    return;
                }
            }
        }

        const fallbackShareText = sharePayload.url
            ? `${sharePayload.text}\n${sharePayload.url}`
            : sharePayload.text;

        const copiedInviteMessage = await copyTextToClipboard(fallbackShareText);

        if (copiedInviteMessage) {
            setCopiedState();
            showInviteNotice("Invite message copied. Paste it to your partner.");
            return;
        }

        showInviteNotice("Share isn't available here yet. Copy the code and send it manually.");
    };

    const containerVariants: Variants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
        exit: { opacity: 0, scale: 0.95, transition: { duration: 0.3 } }
    };

    const coupleStepVariants: Variants = {
        hidden: { opacity: 0, x: 32, scale: 0.98 },
        visible: { opacity: 1, x: 0, scale: 1, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } },
        exit: { opacity: 0, x: -32, scale: 0.98, transition: { duration: 0.25, ease: [0.4, 0, 0.2, 1] } },
    };

    if (status === "loading" || !userId) {
        return (
            <div className="flex items-center justify-center min-h-[100dvh] bg-gradient-love">
                <Heart className="text-romantic-heart animate-heart-beat fill-romantic-heart" size={64} />
            </div>
        );
    }

    const handleFinishSingle = async () => {
        setLoading(true);
        try {
            await completeOnboarding('SINGLE');
            confetti({
                particleCount: 100,
                spread: 70,
                origin: { y: 0.6 },
                colors: ['#10B981', '#6366F1', '#34D399', '#818CF8']
            });
            setTimeout(() => router.push("/dashboard"), 1500);
        } catch (err) {
            setError(getErrorMessage(err, "Failed to finish onboarding"));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={`flex flex-col items-center justify-center min-h-[100dvh] p-6 overflow-hidden transition-colors duration-700 ${onboardingType === 'SINGLE' ? 'bg-slate-50 text-slate-900 border-emerald-500' : 'bg-gradient-love'}`}>
            {onboardingType !== 'SINGLE' && <FloatingHearts />}

            <AnimatePresence mode="wait">
                {/* Step 0: Selection */}
                {onboardingType === "CHOOSE" && (
                    <motion.div
                        key="selection"
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        className="w-full max-w-2xl text-center space-y-12 relative z-10"
                    >
                        <div className="space-y-4">
                            <motion.div animate={{ scale: [1, 1.05, 1] }} transition={{ duration: 3, repeat: Infinity }}>
                                <Globe className="mx-auto text-romantic-heart" size={84} />
                            </motion.div>
                            <h1 className="text-5xl font-black tracking-tight text-slate-800">
                                Welcome to Your World
                            </h1>
                            <p className="text-slate-500 font-medium text-xl">
                                How would you like to start your journey?
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <button
                                onClick={() => setOnboardingType("SINGLE")}
                                className="group p-8 bg-white/80 backdrop-blur-xl rounded-4xl border-4 border-transparent hover:border-emerald-500 shadow-2xl transition-all text-left space-y-4"
                            >
                                <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform">
                                    <User size={32} />
                                </div>
                                <div className="space-y-2">
                                    <h3 className="text-2xl font-bold text-slate-800">Single Explorer</h3>
                                    <p className="text-slate-500">Capture your personal journey, set solo goals, and plan your own adventures.</p>
                                </div>
                                <div className="flex items-center text-emerald-600 font-bold group-hover:translate-x-2 transition-transform pt-2">
                                    Start Solo Journey <ArrowRight size={18} className="ml-2" />
                                </div>
                            </button>

                            <button
                                onClick={() => setOnboardingType("COUPLE")}
                                className="group p-8 bg-white/80 backdrop-blur-xl rounded-4xl border-4 border-transparent hover:border-romantic-heart shadow-2xl transition-all text-left space-y-4"
                            >
                                <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center text-romantic-heart group-hover:scale-110 transition-transform">
                                    <Heart size={32} />
                                </div>
                                <div className="space-y-2">
                                    <h3 className="text-2xl font-bold text-slate-800">Couple&apos;s World</h3>
                                    <p className="text-slate-500">A private space for two. Share memories, budget together, and build your life.</p>
                                </div>
                                <div className="flex items-center text-romantic-heart font-bold group-hover:translate-x-2 transition-transform pt-2">
                                    Start Together <ArrowRight size={18} className="ml-2" />
                                </div>
                            </button>
                        </div>
                    </motion.div>
                )}

                {/* SINGLE MODE GUIDE */}
                {onboardingType === "SINGLE" && (
                    <motion.div
                        key="single-guide"
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        className="w-full max-w-lg relative z-10"
                    >
                        <Card className="p-10 space-y-8 border-none shadow-2xl bg-white/90 backdrop-blur-2xl rounded-5xl overflow-hidden relative">
                            {/* Slide Indicator */}
                            <div className="flex justify-center gap-2 mb-4">
                                {SOLO_GUIDE_SLIDES.map((_, i) => (
                                    <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${i === guideStep ? 'w-8 bg-emerald-500' : 'w-2 bg-slate-200'}`} />
                                ))}
                            </div>

                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="p-4 bg-red-50 border border-red-200 rounded-2xl text-sm text-red-600 text-center"
                                >
                                    {error}
                                </motion.div>
                            )}

                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={guideStep}
                                    initial={{ x: 50, opacity: 0 }}
                                    animate={{ x: 0, opacity: 1 }}
                                    exit={{ x: -50, opacity: 0 }}
                                    className="text-center space-y-6"
                                >
                                    <div className="mx-auto w-24 h-24 bg-slate-50 rounded-3xl flex items-center justify-center shadow-inner">
                                        {SOLO_GUIDE_SLIDES[guideStep].icon}
                                    </div>
                                    <div className="space-y-3">
                                        <h2 className="text-3xl font-black text-slate-800 tracking-tight">
                                            {SOLO_GUIDE_SLIDES[guideStep].title}
                                        </h2>
                                        <p className="text-lg text-slate-600 leading-relaxed font-medium">
                                            {SOLO_GUIDE_SLIDES[guideStep].description}
                                        </p>
                                    </div>
                                </motion.div>
                            </AnimatePresence>

                            <div className="flex gap-4 items-center justify-between pt-6">
                                <Button
                                    variant="ghost"
                                    onClick={() => guideStep > 0 ? setGuideStep(gs => gs - 1) : setOnboardingType("CHOOSE")}
                                    className="text-slate-400 font-bold hover:text-slate-700"
                                >
                                    {guideStep === 0 ? "Change Mode" : "Previous"}
                                </Button>
                                
                                {guideStep < SOLO_GUIDE_SLIDES.length - 1 ? (
                                    <Button
                                        onClick={() => setGuideStep(gs => gs + 1)}
                                        className="rounded-full h-14 px-8 bg-slate-900 hover:bg-black text-white shadow-xl group"
                                    >
                                        Next
                                        <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
                                    </Button>
                                ) : (
                                    <Button
                                        onClick={handleFinishSingle}
                                        disabled={loading}
                                        className="rounded-full h-14 px-8 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xl shadow-emerald-200"
                                    >
                                        {loading ? "Preparing Your World..." : "Start My Journey"}
                                        {!loading && <Sparkles className="ml-2" />}
                                    </Button>
                                )}
                            </div>
                        </Card>
                    </motion.div>
                )}

                {/* Step 1 Choose (Couple) */}
                {onboardingType === "COUPLE" && step === 1 && mode === "choose" && (
                    <motion.div
                        key="choose"
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        className="w-full max-w-md text-center space-y-8 relative z-10"
                    >
                        <div className="space-y-3">
                            <motion.div
                                animate={{ scale: [1, 1.1, 1] }}
                                transition={{ duration: 2, repeat: Infinity }}
                            >
                                <Heart className="mx-auto text-romantic-heart fill-romantic-heart" size={72} />
                            </motion.div>
                            <h1 className="text-4xl font-bold tracking-tight text-slate-800">
                                Create Your World
                            </h1>
                            <p className="text-slate-500 font-medium text-lg">
                                Your private sanctuary for two 💕
                            </p>
                        </div>

                        <div className="space-y-4">
                            <Button
                                onClick={() => { setMode("create"); setStep(2); setCreateStep(1); setError(""); }}
                                className="w-full h-16 text-lg rounded-3xl bg-gradient-button text-white shadow-xl hover:shadow-2xl transition-all border-none group"
                            >
                                <Plus className="mr-2 group-hover:rotate-90 transition-transform" size={24} />
                                <span>Create Our World</span>
                                <Sparkles className="ml-2" size={20} />
                            </Button>

                            <Button
                                onClick={() => { setMode("join"); setStep(3); }}
                                variant="outline"
                                className="w-full h-16 text-lg rounded-3xl bg-white/60 backdrop-blur-md border-2 border-romantic-blush text-slate-700 shadow-lg hover:bg-white/80 hover:border-romantic-heart transition-all"
                            >
                                <Users className="mr-2" size={24} />
                                <span>Join with Code</span>
                                <ArrowRight className="ml-2" size={20} />
                            </Button>

                            <button
                                onClick={() => setOnboardingType("CHOOSE")}
                                className="w-full mt-4 text-slate-400 font-bold text-sm tracking-wide hover:text-slate-600 transition-colors"
                            >
                                Back to Selection
                            </button>
                        </div>
                    </motion.div>
                )}

                {/* Step 2: Create World Form */}
                {onboardingType === "COUPLE" && step === 2 && mode === "create" && (
                    <motion.div
                        key="create"
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        className="w-full max-w-lg space-y-6 relative z-10"
                    >
                        <Card className="p-8 space-y-6 border-none shadow-2xl bg-white/80 backdrop-blur-xl rounded-4xl">
                            <div className="text-center space-y-2">
                                <div className="mx-auto w-16 h-16 bg-gradient-button rounded-full flex items-center justify-center">
                                    <Sparkles className="text-white" size={32} />
                                </div>
                                <h2 className="text-3xl font-bold text-slate-800">Create Your World</h2>
                                <p className="text-slate-500">Make it uniquely yours</p>
                            </div>

                            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-widest text-slate-400 px-2">
                                <span>Step {createStep} of 3</span>
                                <div className="flex gap-2">
                                    <div className={`h-2 w-8 rounded-full ${createStep >= 1 ? 'bg-romantic-heart' : 'bg-slate-200'}`} />
                                    <div className={`h-2 w-8 rounded-full ${createStep >= 2 ? 'bg-romantic-heart' : 'bg-slate-200'}`} />
                                    <div className={`h-2 w-8 rounded-full ${createStep >= 3 ? 'bg-romantic-heart' : 'bg-slate-200'}`} />
                                </div>
                            </div>

                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="p-4 bg-red-50 border border-red-200 rounded-2xl text-sm text-red-600 text-center"
                                >
                                    {error}
                                </motion.div>
                            )}

                            <div className="space-y-5">
                                <AnimatePresence mode="wait">
                                {createStep === 1 && (
                                    <motion.div
                                        key="create-step-1"
                                        variants={coupleStepVariants}
                                        initial="hidden"
                                        animate="visible"
                                        exit="exit"
                                        className="space-y-5"
                                    >
                                        <div className="space-y-2">
                                            <Label className="text-sm font-semibold text-slate-600 uppercase tracking-wide ml-2">
                                                World Name *
                                            </Label>
                                            <div className="relative">
                                                <Input
                                                    value={worldName}
                                                    onChange={(e) => setWorldName(e.target.value)}
                                                    placeholder="Our Sweet Escape"
                                                    className="h-14 rounded-2xl border-romantic-blush bg-white/50 pr-12 text-lg"
                                                    maxLength={30}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={handleGenerateName}
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 hover:bg-romantic-blush/20 rounded-full transition-colors"
                                                    title="Generate random name"
                                                >
                                                    <Wand2 className="text-romantic-heart" size={20} />
                                                </button>
                                            </div>
                                            <div className="flex flex-wrap gap-2 mt-2">
                                                {NAME_SUGGESTIONS.slice(0, 4).map((name) => (
                                                    <button
                                                        key={name}
                                                        onClick={() => setWorldName(name)}
                                                        className="px-3 py-1 text-xs bg-romantic-blush/20 hover:bg-romantic-blush/40 text-romantic-heart rounded-full transition-colors"
                                                    >
                                                        {name}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="space-y-3 pt-2">
                                            <Button
                                                onClick={() => { setError(""); setCreateStep(2); }}
                                                disabled={!worldName.trim()}
                                                className="w-full h-14 rounded-3xl bg-gradient-button text-white shadow-lg text-lg group"
                                            >
                                                <span>Continue</span>
                                                <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" size={20} />
                                            </Button>
                                            <button
                                                onClick={() => { setStep(1); setMode("choose"); setError(""); }}
                                                className="w-full text-sm text-slate-400 hover:text-slate-600 transition-colors"
                                            >
                                                Back
                                            </button>
                                        </div>
                                    </motion.div>
                                )}

                                {createStep === 2 && (
                                    <motion.div
                                        key="create-step-2"
                                        variants={coupleStepVariants}
                                        initial="hidden"
                                        animate="visible"
                                        exit="exit"
                                        className="space-y-5"
                                    >
                                        <div className="space-y-2">
                                            <Label className="text-sm font-semibold text-slate-600 uppercase tracking-wide ml-2 flex items-center gap-2">
                                                <Calendar size={16} />
                                                When did it all begin? (Optional)
                                            </Label>
                                            <Input
                                                type="date"
                                                value={startDate}
                                                onChange={(e) => setStartDate(e.target.value)}
                                                className="h-14 rounded-2xl border-romantic-blush bg-white/50"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label className="text-sm font-semibold text-slate-600 uppercase tracking-wide ml-2 flex items-center gap-2">
                                                <Camera size={16} />
                                                Couple Photo (Optional)
                                            </Label>
                                            {photoPreview ? (
                                                <div className="relative">
                                                    <div className="w-full h-48 rounded-2xl overflow-hidden border-4 border-romantic-blush relative">
                                                        <img
                                                            src={photoPreview}
                                                            alt="Preview"
                                                            className="w-full h-full object-cover"
                                                        />
                                                        <div className="absolute inset-0 bg-gradient-to-t from-romantic-heart/20 to-transparent" />
                                                    </div>
                                                    <button
                                                        onClick={() => {
                                                            setPhotoFile(null);
                                                            setPhotoPreview(null);
                                                        }}
                                                        className="absolute top-2 right-2 p-2 bg-white/90 rounded-full hover:bg-white transition-colors"
                                                    >
                                                        <X size={20} className="text-slate-600" />
                                                    </button>
                                                </div>
                                            ) : (
                                                <label className="block w-full h-32 border-2 border-dashed border-romantic-blush rounded-2xl hover:border-romantic-heart transition-colors cursor-pointer bg-white/50">
                                                    <div className="flex flex-col items-center justify-center h-full text-slate-500">
                                                        <Upload size={32} className="mb-2" />
                                                        <span className="text-sm">Click to upload</span>
                                                    </div>
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        onChange={handlePhotoSelect}
                                                        className="hidden"
                                                    />
                                                </label>
                                            )}
                                        </div>

                                        <div className="space-y-3 pt-2">
                                            <Button
                                                onClick={() => { setError(""); setCreateStep(3); }}
                                                className="w-full h-14 rounded-3xl bg-gradient-button text-white shadow-lg text-lg group"
                                            >
                                                <span>Continue</span>
                                                <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" size={20} />
                                            </Button>
                                            <button
                                                onClick={() => { setError(""); setCreateStep(1); }}
                                                className="w-full text-sm text-slate-400 hover:text-slate-600 transition-colors"
                                            >
                                                Back
                                            </button>
                                        </div>
                                    </motion.div>
                                )}

                                {createStep === 3 && (
                                    <motion.div
                                        key="create-step-3"
                                        variants={coupleStepVariants}
                                        initial="hidden"
                                        animate="visible"
                                        exit="exit"
                                        className="space-y-5"
                                    >
                                        <div className="space-y-2">
                                            <Label className="text-sm font-semibold text-slate-600 uppercase tracking-wide ml-2 flex items-center gap-2">
                                                <Heart size={16} />
                                                What do you call your love? (Optional)
                                            </Label>
                                            <Input
                                                value={partnerNickname}
                                                onChange={(e) => setPartnerNickname(e.target.value)}
                                                placeholder="My Honey, My Love, Babe..."
                                                className="h-14 rounded-2xl border-romantic-blush bg-white/50"
                                                maxLength={20}
                                            />
                                        </div>

                                        <div className="space-y-3 pt-2">
                                            <Button
                                                onClick={handleCreateWorld}
                                                disabled={loading || !worldName.trim()}
                                                className="w-full h-14 rounded-3xl bg-gradient-button text-white shadow-lg text-lg group"
                                            >
                                                {loading ? (
                                                    <>
                                                        <div className="animate-spin mr-2">⭐</div>
                                                        Creating Your World...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Sparkles className="mr-2" size={20} />
                                                        Create Our World
                                                        <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" size={20} />
                                                    </>
                                                )}
                                            </Button>
                                            <button
                                                onClick={() => { setError(""); setCreateStep(2); }}
                                                className="w-full text-sm text-slate-400 hover:text-slate-600 transition-colors"
                                            >
                                                Back
                                            </button>
                                        </div>
                                    </motion.div>
                                )}
                                </AnimatePresence>
                            </div>
                        </Card>
                    </motion.div>
                )}

                {/* Step 3: Join World Form (Couple) */}
                {onboardingType === "COUPLE" && step === 3 && mode === "join" && (
                    <motion.div
                        key="join"
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        className="w-full max-w-md space-y-6 relative z-10"
                    >
                        <Card className="p-8 space-y-6 border-none shadow-2xl bg-white/80 backdrop-blur-xl rounded-4xl">
                            <div className="text-center space-y-2">
                                <div className="mx-auto w-16 h-16 bg-gradient-button rounded-full flex items-center justify-center">
                                    <Users className="text-white" size={32} />
                                </div>
                                <h2 className="text-3xl font-bold text-slate-800">Join Your World</h2>
                                <p className="text-slate-500">Enter the code from your partner</p>
                            </div>

                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="p-4 bg-red-50 border border-red-200 rounded-2xl text-sm text-red-600 text-center"
                                >
                                    {error}
                                </motion.div>
                            )}

                            <div className="space-y-5">
                                <div className="space-y-2">
                                    <Label className="text-sm font-semibold text-slate-600 uppercase tracking-wide ml-2">
                                        Invite Code *
                                    </Label>
                                    <Input
                                        value={inviteCode}
                                        onChange={(e) => {
                                            setInviteCode(normalizeInviteCodeInput(e.target.value));
                                            if (error) {
                                                setError("");
                                            }
                                        }}
                                        placeholder="ABC12345"
                                        maxLength={8}
                                        autoCapitalize="characters"
                                        autoCorrect="off"
                                        spellCheck={false}
                                        className="h-16 text-center text-2xl font-bold tracking-widest rounded-2xl border-romantic-blush bg-white/50 focus:ring-romantic-heart uppercase"
                                    />
                                    <p className="px-2 text-xs text-slate-400">
                                        Use the 8-character code your partner shared with you.
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-sm font-semibold text-slate-600 uppercase tracking-wide ml-2 flex items-center gap-2">
                                        <Heart size={16} />
                                        What do you call your love? (Optional)
                                    </Label>
                                    <Input
                                        value={partnerNickname}
                                        onChange={(e) => setPartnerNickname(e.target.value)}
                                        placeholder="My Sweetheart, My Angel..."
                                        className="h-14 rounded-2xl border-romantic-blush bg-white/50"
                                        maxLength={20}
                                    />
                                </div>
                            </div>

                            <div className="space-y-3 pt-4">
                                <Button
                                    onClick={handleJoinWorld}
                                    disabled={loading || normalizeInviteCodeInput(inviteCode).length !== 8}
                                    className="w-full h-14 rounded-3xl bg-gradient-button text-white shadow-lg text-lg"
                                >
                                    {loading ? "Connecting Hearts..." : "Join Our World 💕"}
                                </Button>
                                <button
                                    onClick={() => { setStep(1); setMode("choose"); setError(""); setInviteCode(""); }}
                                    className="w-full text-sm text-slate-400 hover:text-slate-600 transition-colors"
                                >
                                    Go Back
                                </button>
                            </div>
                        </Card>
                    </motion.div>
                )}

                {/* Step 4: Success Screen (Couple) */}
                {onboardingType === "COUPLE" && step === 4 && (
                    <motion.div
                        key="success"
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        className="w-full max-w-sm space-y-4 relative z-10"
                    >
                        <Card className="p-6 space-y-5 border-none shadow-2xl bg-white/80 backdrop-blur-xl rounded-[2rem] text-center">
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: "spring", duration: 0.6 }}
                            >
                                <div className="mx-auto mb-3 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-button">
                                    <Heart className="text-white fill-white" size={40} />
                                </div>
                            </motion.div>

                            <div className="space-y-2">
                                <h1 className="text-2xl font-bold text-slate-800">
                                    Welcome to {createdWorldName}! 💕
                                </h1>
                                <p className="text-sm leading-6 text-slate-600">
                                    {mode === "create"
                                        ? "Your world is ready! Share the code below with your partner."
                                        : "You've joined the world! Redirecting to your dashboard..."
                                    }
                                </p>
                            </div>

                            {mode === "create" && generatedCode && (
                                <div className="space-y-3">
                                    <div className="p-4 bg-gradient-love rounded-[1.6rem] text-left border border-white/70 shadow-lg">
                                        <div>
                                            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                                                Invite Code
                                            </p>
                                            <p className="text-xs leading-5 text-slate-600 mt-1">
                                                Share this with your partner so they can join right away.
                                            </p>
                                        </div>

                                        <div className="rounded-xl bg-white/80 px-3 py-4 border border-white/80">
                                            <p className="text-center text-[1.7rem] font-black text-slate-800 tracking-[0.18em] sm:text-[1rem]">
                                                {generatedCode}
                                            </p>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
                                            <Button
                                                onClick={copyInviteCode}
                                                variant="outline"
                                                className="h-11 rounded-xl border-white/80 bg-white/70 text-sm text-slate-700 hover:bg-white"
                                            >
                                                {copied ? <Check size={18} className="text-green-600" /> : <Copy size={18} />}
                                                {copied ? "Copied" : "Copy Code"}
                                            </Button>
                                            <Button
                                                onClick={shareInviteCode}
                                                className="h-11 rounded-xl bg-gradient-button text-sm text-white shadow-md"
                                            >
                                                <Share2 size={18} />
                                                Share
                                            </Button>
                                        </div>

                                        {inviteNotice && (
                                            <p className="mt-3 text-xs font-medium text-emerald-600 text-center">
                                                {inviteNotice}
                                            </p>
                                        )}
                                    </div>

                                    <Button
                                        onClick={() => void finishCoupleOnboarding()}
                                        disabled={isCompletingCoupleOnboarding}
                                        className="w-full h-12 rounded-2xl bg-gradient-button text-white shadow-lg text-base"
                                    >
                                        {isCompletingCoupleOnboarding ? "Opening Dashboard..." : "Continue to Dashboard"}
                                        <ArrowRight className="ml-2" size={20} />
                                    </Button>
                                </div>
                            )}

                            {mode === "join" && (
                                <div className="space-y-3">
                                    <div className="flex justify-center">
                                        <motion.div
                                            animate={{ rotate: 360 }}
                                            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                                        >
                                            <Heart className="text-romantic-heart fill-romantic-heart" size={40} />
                                        </motion.div>
                                    </div>
                                    <Button
                                        onClick={() => void finishCoupleOnboarding()}
                                        disabled={isCompletingCoupleOnboarding}
                                        className="w-full h-12 rounded-2xl bg-gradient-button text-white shadow-lg text-base"
                                    >
                                        {isCompletingCoupleOnboarding ? "Opening Dashboard..." : "Open Dashboard Now"}
                                        <ArrowRight className="ml-2" size={20} />
                                    </Button>
                                </div>
                            )}
                        </Card>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="absolute bottom-8 text-xs text-slate-400 font-medium">
                Made with ❤️ by OurLittleWorld
            </div>
        </div>
    );
}
