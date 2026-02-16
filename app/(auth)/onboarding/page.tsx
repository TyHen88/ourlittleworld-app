"use client";
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Heart, ArrowRight, Sparkles, Plus, Users, Copy, Check,
    Calendar, Camera, Wand2, Upload, X
} from "lucide-react";
import { FloatingHearts } from "@/components/love/FloatingHearts";
import { createWorld, joinWorld, generateWorldName, uploadCouplePhoto } from "@/lib/actions/world";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import confetti from "canvas-confetti";

// Romantic name suggestions
const NAME_SUGGESTIONS = [
    "LoveHaven", "BlissNest", "ForeverUs", "HeartHaven2026",
    "OurSweetEscape", "TwoHearts", "EndlessLove", "DreamTogether"
];

export default function EnhancedOnboardingPage() {
    const router = useRouter();
    const [step, setStep] = useState<number>(1);
    const [mode, setMode] = useState<"choose" | "create" | "join">("choose");
    const [createStep, setCreateStep] = useState<1 | 2 | 3>(1);
    const [userId, setUserId] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    // Create world state
    const [worldName, setWorldName] = useState("");
    const [startDate, setStartDate] = useState("");
    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);
    const [partnerNickname, setPartnerNickname] = useState("");
    const [showSuggestions, setShowSuggestions] = useState(false);

    // Join world state
    const [inviteCode, setInviteCode] = useState("");

    // Success state
    const [generatedCode, setGeneratedCode] = useState("");
    const [createdWorldName, setCreatedWorldName] = useState("");
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        checkAuth();
    }, []);

    const checkAuth = async () => {
        const supabase = createClient();
        const { data: { user }, error: userError } = await supabase.auth.getUser();

        if (userError || !user) {
            router.push("/login");
            return;
        }

        // Check if user already has a couple
        const { data: profile } = await supabase
            .from('profiles')
            .select('couple_id')
            .eq('id', user.id)
            .maybeSingle();

        if (profile?.couple_id) {
            router.push("/dashboard");
            return;
        }

        setUserId(user.id);
    };

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
                const uploadResult = await uploadCouplePhoto(photoFile, userId);
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
        } catch (err: any) {
            setError(err.message || "Something went wrong");
        } finally {
            setLoading(false);
        }
    };

    const handleJoinWorld = async () => {
        if (!userId || !inviteCode.trim()) {
            setError("Please enter an invite code");
            return;
        }

        setLoading(true);
        setError("");

        const result = await joinWorld({
            userId,
            inviteCode: inviteCode.trim(),
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

            setTimeout(() => router.push("/dashboard"), 3000);
        } else {
            setError(result.error || "Failed to join world");
        }
    };

    const copyInviteCode = () => {
        navigator.clipboard.writeText(generatedCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const containerVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
        exit: { opacity: 0, scale: 0.95, transition: { duration: 0.3 } }
    };

    if (!userId) {
        return (
            <div className="flex items-center justify-center min-h-[100dvh] bg-gradient-love">
                <Heart className="text-romantic-heart animate-heart-beat fill-romantic-heart" size={64} />
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-[100dvh] p-6 bg-gradient-love overflow-hidden">
            <FloatingHearts />

            <AnimatePresence mode="wait">
                {/* Step 1: Choose Mode */}
                {step === 1 && mode === "choose" && (
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
                        </div>
                    </motion.div>
                )}

                {/* Step 2: Create World Form */}
                {step === 2 && mode === "create" && (
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
                                {createStep === 1 && (
                                    <>
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
                                    </>
                                )}

                                {createStep === 2 && (
                                    <>
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
                                    </>
                                )}

                                {createStep === 3 && (
                                    <>
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
                                    </>
                                )}
                            </div>
                        </Card>
                    </motion.div>
                )}

                {/* Step 3: Join World Form */}
                {step === 3 && mode === "join" && (
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
                                        onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                                        placeholder="ABC12345"
                                        maxLength={8}
                                        className="h-16 text-center text-2xl font-bold tracking-widest rounded-2xl border-romantic-blush bg-white/50 focus:ring-romantic-heart uppercase"
                                    />
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
                                    disabled={loading || !inviteCode.trim()}
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

                {/* Step 4: Success Screen */}
                {step === 4 && (
                    <motion.div
                        key="success"
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        className="w-full max-w-md space-y-6 relative z-10"
                    >
                        <Card className="p-8 space-y-6 border-none shadow-2xl bg-white/80 backdrop-blur-xl rounded-4xl text-center">
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: "spring", duration: 0.6 }}
                            >
                                <div className="mx-auto w-24 h-24 bg-gradient-button rounded-full flex items-center justify-center mb-4">
                                    <Heart className="text-white fill-white" size={48} />
                                </div>
                            </motion.div>

                            <div className="space-y-3">
                                <h1 className="text-3xl font-bold text-slate-800">
                                    Welcome to {createdWorldName}! 💕
                                </h1>
                                <p className="text-lg text-slate-600">
                                    {mode === "create"
                                        ? "Your world is ready! Share the code below with your partner."
                                        : "You've joined the world! Redirecting to your dashboard..."
                                    }
                                </p>
                            </div>

                            {mode === "create" && generatedCode && (
                                <div className="space-y-4">
                                    <div className="p-6 bg-gradient-love rounded-3xl relative">
                                        <p className="text-sm text-slate-600 mb-2">Your Invite Code</p>
                                        <p className="text-4xl font-black text-slate-800 tracking-widest">
                                            {generatedCode}
                                        </p>
                                        <button
                                            onClick={copyInviteCode}
                                            className="absolute top-4 right-4 p-2 bg-white/80 rounded-full hover:bg-white transition-colors"
                                        >
                                            {copied ? (
                                                <Check size={20} className="text-green-600" />
                                            ) : (
                                                <Copy size={20} className="text-slate-600" />
                                            )}
                                        </button>
                                    </div>

                                    <Button
                                        onClick={() => router.push("/dashboard")}
                                        className="w-full h-14 rounded-3xl bg-gradient-button text-white shadow-lg text-lg"
                                    >
                                        Continue to Dashboard
                                        <ArrowRight className="ml-2" size={20} />
                                    </Button>
                                </div>
                            )}

                            {mode === "join" && (
                                <div className="flex justify-center">
                                    <motion.div
                                        animate={{ rotate: 360 }}
                                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                                    >
                                        <Heart className="text-romantic-heart fill-romantic-heart" size={48} />
                                    </motion.div>
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
