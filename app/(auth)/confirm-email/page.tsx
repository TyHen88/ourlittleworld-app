"use client";
import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mail, Heart, RefreshCw, CheckCircle2, ArrowRight } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

export default function ConfirmEmailPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const email = searchParams.get("email");
    const [checking, setChecking] = useState(false);
    const [confirmed, setConfirmed] = useState(false);

    // Check if user is already confirmed
    useEffect(() => {
        const supabase = createClient();
        const checkConfirmation = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user?.email_confirmed_at) {
                setConfirmed(true);
                setTimeout(() => router.push("/onboarding"), 2000);
            }
        };

        checkConfirmation();

        // Poll every 3 seconds to check if email is confirmed
        const interval = setInterval(checkConfirmation, 3000);
        return () => clearInterval(interval);
    }, [router]);

    const handleCheckAgain = async () => {
        setChecking(true);
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (user?.email_confirmed_at) {
            setConfirmed(true);
            setTimeout(() => router.push("/onboarding"), 1000);
        } else {
            setChecking(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-[100dvh] p-6 bg-gradient-love">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md space-y-6"
            >
                {!confirmed ? (
                    <Card className="p-8 space-y-6 border-none shadow-2xl bg-white/80 backdrop-blur-xl rounded-4xl">
                        {/* Animated Mail Icon */}
                        <div className="flex justify-center">
                            <motion.div
                                animate={{
                                    y: [0, -10, 0],
                                    rotate: [0, 5, -5, 0]
                                }}
                                transition={{
                                    duration: 2,
                                    repeat: Infinity,
                                    ease: "easeInOut"
                                }}
                                className="relative"
                            >
                                <div className="w-24 h-24 bg-gradient-button rounded-full flex items-center justify-center shadow-xl">
                                    <Mail className="text-white" size={48} />
                                </div>
                                <motion.div
                                    animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                                    transition={{ duration: 2, repeat: Infinity }}
                                    className="absolute -top-2 -right-2"
                                >
                                    <div className="w-8 h-8 bg-romantic-heart rounded-full flex items-center justify-center">
                                        <span className="text-white text-xl">!</span>
                                    </div>
                                </motion.div>
                            </motion.div>
                        </div>

                        {/* Content */}
                        <div className="text-center space-y-3">
                            <h1 className="text-3xl font-bold text-slate-800">Check Your Email</h1>
                            <p className="text-slate-600 font-medium">
                                We've sent a confirmation link to
                            </p>
                            {email && (
                                <p className="text-lg font-bold text-romantic-heart">
                                    {email}
                                </p>
                            )}
                        </div>

                        {/* Instructions */}
                        <div className="space-y-4 pt-4">
                            <div className="p-4 bg-romantic-blush/20 rounded-2xl border border-romantic-blush">
                                <div className="space-y-3 text-sm text-slate-600">
                                    <div className="flex items-start gap-3">
                                        <div className="w-6 h-6 bg-romantic-heart rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                                            <span className="text-white text-xs font-bold">1</span>
                                        </div>
                                        <p>Open the email we just sent you</p>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <div className="w-6 h-6 bg-romantic-heart rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                                            <span className="text-white text-xs font-bold">2</span>
                                        </div>
                                        <p>Click the confirmation link</p>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <div className="w-6 h-6 bg-romantic-heart rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                                            <span className="text-white text-xs font-bold">3</span>
                                        </div>
                                        <p>You'll be redirected to complete your profile</p>
                                    </div>
                                </div>
                            </div>

                            {/* Check Again Button */}
                            <Button
                                onClick={handleCheckAgain}
                                disabled={checking}
                                className="w-full h-14 rounded-2xl bg-gradient-button text-white shadow-lg text-lg group"
                            >
                                {checking ? (
                                    <>
                                        <RefreshCw className="mr-2 animate-spin" size={20} />
                                        Checking...
                                    </>
                                ) : (
                                    <>
                                        <RefreshCw className="mr-2" size={20} />
                                        I've Confirmed My Email
                                    </>
                                )}
                            </Button>

                            {/* Didn't receive email */}
                            <div className="text-center pt-2">
                                <p className="text-sm text-slate-500 mb-2">
                                    Didn't receive the email?
                                </p>
                                <div className="flex flex-col gap-2 text-xs text-slate-400">
                                    <p>• Check your spam folder</p>
                                    <p>• Make sure you entered the correct email</p>
                                    <p>• Wait a few minutes and check again</p>
                                </div>
                            </div>

                            {/* Back to login */}
                            <div className="text-center pt-4">
                                <button
                                    onClick={() => router.push("/login")}
                                    className="text-sm text-slate-400 hover:text-slate-600 transition-colors"
                                >
                                    Back to Login
                                </button>
                            </div>
                        </div>
                    </Card>
                ) : (
                    // Confirmed State
                    <Card className="p-8 space-y-6 border-none shadow-2xl bg-white/80 backdrop-blur-xl rounded-4xl">
                        <div className="flex justify-center">
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: "spring", duration: 0.6 }}
                            >
                                <div className="w-24 h-24 bg-emerald-500 rounded-full flex items-center justify-center shadow-xl">
                                    <CheckCircle2 className="text-white" size={48} />
                                </div>
                            </motion.div>
                        </div>

                        <div className="text-center space-y-3">
                            <h1 className="text-3xl font-bold text-slate-800">Email Confirmed! 🎉</h1>
                            <p className="text-slate-600 font-medium">
                                Redirecting you to complete your profile...
                            </p>
                        </div>

                        <div className="flex justify-center">
                            <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                            >
                                <Heart className="text-romantic-heart fill-romantic-heart" size={32} />
                            </motion.div>
                        </div>
                    </Card>
                )}
            </motion.div>

            {/* Footer */}
            <div className="absolute bottom-8 text-xs text-slate-400 font-medium">
                Made with ❤️ by OurLittleWorld
            </div>
        </div>
    );
}
