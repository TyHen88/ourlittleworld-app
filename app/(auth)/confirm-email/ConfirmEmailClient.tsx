"use client";
import React, { useEffect } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lock, ArrowRight } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

export default function ConfirmEmailClient() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const email = searchParams.get("email") || "";

    useEffect(() => {
        if (!email) {
            router.push("/login");
        }
    }, [email, router]);

    return (
        <div className="flex flex-col items-center justify-center min-h-[100dvh] p-6 bg-gradient-love text-slate-800">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md space-y-6"
            >
                <Card className="p-8 space-y-6 border-none shadow-2xl bg-white/80 backdrop-blur-xl rounded-4xl text-center">
                    <div className="flex justify-center">
                        <div className="w-24 h-24 bg-gradient-button rounded-full flex items-center justify-center shadow-xl">
                            <Lock className="text-white" size={48} />
                        </div>
                    </div>

                    <div className="space-y-3">
                        <h1 className="text-3xl font-bold text-slate-800">Password Sign-In Only</h1>
                        <p className="text-slate-600 font-medium">
                            Email verification codes are disabled now.
                        </p>
                        {email && (
                            <p className="text-sm font-semibold text-romantic-heart">
                                Continue with your password for {email}
                            </p>
                        )}
                    </div>

                    <div className="space-y-3">
                        <Button
                            onClick={() => router.push("/login")}
                            className="w-full h-14 rounded-2xl bg-gradient-button text-white shadow-lg text-lg group"
                        >
                            <span>Go to Login</span>
                            <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => router.push("/register")}
                            className="w-full h-14 rounded-2xl"
                        >
                            Create a New Account
                        </Button>
                    </div>
                </Card>
            </motion.div>
        </div>
    );
}
