"use client";
import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mail, RefreshCw, CheckCircle2, Loader2, Lock, Eye, EyeOff } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { validateOtp, finalizeLoginWithPassword, requestLoginCode } from "@/lib/actions/auth";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function getErrorMessage(error: unknown, fallback: string) {
    return error instanceof Error ? error.message : fallback;
}

export default function ConfirmEmailClient() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const email = searchParams.get("email") || "";
    
    const [step, setStep] = useState<"otp" | "password">("otp");
    const [otp, setOtp] = useState(["", "", "", "", "", ""]);
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [isNewUser, setIsNewUser] = useState(false);
    
    const [verifying, setVerifying] = useState(false);
    const [resending, setResending] = useState(false);
    const [error, setError] = useState("");
    const [confirmed, setConfirmed] = useState(false);
    
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

    useEffect(() => {
        if (!email) {
            router.push("/login");
        }
    }, [email, router]);

    const handleChange = (index: number, value: string) => {
        if (value.length > 1) value = value.slice(-1);
        if (!/^\d*$/.test(value)) return;

        const newOtp = [...otp];
        newOtp[index] = value;
        setOtp(newOtp);

        if (value !== "" && index < 5) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
        if (e.key === "Backspace" && otp[index] === "" && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    const handleVerifyOtp = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        const code = otp.join("");
        if (code.length !== 6) {
            setError("Please enter all 6 digits");
            return;
        }

        setError("");
        setVerifying(true);

        try {
            const result = await validateOtp(email, code);
            setIsNewUser(result.isNewUser || false);
            setStep("password");
        } catch (error: unknown) {
            setError(getErrorMessage(error, "Invalid code. Please try again."));
        } finally {
            setVerifying(false);
        }
    };

    const handleFinalize = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!password) {
            setError("Please enter your password");
            return;
        }

        setError("");
        setVerifying(true);

        try {
            const code = otp.join("");
            const callbackUrl = await finalizeLoginWithPassword(email, code, password);

            setConfirmed(true);
            setTimeout(() => {
                window.location.href = callbackUrl;
            }, 1500);
        } catch (error: unknown) {
            setError(getErrorMessage(error, "Failed to finalize login"));
        } finally {
            setVerifying(false);
        }
    };

    const handleResend = async () => {
        setResending(true);
        setError("");
        try {
            await requestLoginCode(email);
            // No feedback needed or just toast
        } catch (error: unknown) {
            setError(getErrorMessage(error, "Failed to resend code"));
        } finally {
            setResending(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-[100dvh] p-6 bg-gradient-love text-slate-800">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md space-y-6"
            >
                {!confirmed ? (
                    <Card className="p-8 space-y-6 border-none shadow-2xl bg-white/80 backdrop-blur-xl rounded-4xl">
                        <AnimatePresence mode="wait">
                            {step === "otp" ? (
                                <motion.div
                                    key="otp"
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    className="space-y-6"
                                >
                                    <div className="flex justify-center">
                                        <div className="w-24 h-24 bg-gradient-button rounded-full flex items-center justify-center shadow-xl">
                                            <Mail className="text-white" size={48} />
                                        </div>
                                    </div>

                                    <div className="text-center space-y-3">
                                        <h1 className="text-3xl font-bold text-slate-800">Enter Code</h1>
                                        <p className="text-slate-600 font-medium">
                                            We&apos;ve sent a 6-digit code to
                                        </p>
                                        <p className="text-lg font-bold text-romantic-heart">
                                            {email}
                                        </p>
                                    </div>

                                    <div className="flex justify-between gap-2">
                                        {otp.map((digit, index) => (
                                            <input
                                                key={index}
                                                ref={(el) => { inputRefs.current[index] = el; }}
                                                type="text"
                                                inputMode="numeric"
                                                maxLength={1}
                                                value={digit}
                                                onChange={(e) => handleChange(index, e.target.value)}
                                                onKeyDown={(e) => handleKeyDown(index, e)}
                                                className="w-12 h-14 text-center text-2xl font-bold rounded-xl border-2 border-romantic-blush bg-white/50 focus:border-romantic-heart focus:ring-4 focus:ring-romantic-heart/10 outline-none transition-all shadow-sm"
                                            />
                                        ))}
                                    </div>

                                    {error && (
                                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-3 bg-red-50 border border-red-200 rounded-2xl text-sm text-red-600 text-center">
                                            {error}
                                        </motion.div>
                                    )}

                                    <Button
                                        onClick={() => handleVerifyOtp()}
                                        disabled={verifying || otp.some(d => d === "")}
                                        className="w-full h-14 rounded-2xl bg-gradient-button text-white shadow-lg text-lg group"
                                    >
                                        {verifying ? <Loader2 className="animate-spin" /> : "Verify Code"}
                                    </Button>

                                    <div className="text-center space-y-4">
                                        <button onClick={handleResend} disabled={resending} className="text-sm font-bold text-romantic-heart hover:underline disabled:opacity-50 flex items-center justify-center gap-2 mx-auto">
                                            {resending ? <RefreshCw className="animate-spin" size={16} /> : <RefreshCw size={16} />}
                                            Resend New Code
                                        </button>
                                        <button onClick={() => router.push("/login")} className="text-sm text-slate-400 hover:text-slate-600">Back to Login</button>
                                    </div>
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="password"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="space-y-6"
                                >
                                    <div className="flex justify-center">
                                        <div className="w-24 h-24 bg-gradient-button rounded-full flex items-center justify-center shadow-xl">
                                            <Lock className="text-white" size={48} />
                                        </div>
                                    </div>

                                    <div className="text-center space-y-3">
                                        <h1 className="text-3xl font-bold text-slate-800">
                                            {isNewUser ? "Set Your Password" : "Welcome Back!"}
                                        </h1>
                                        <p className="text-slate-600 font-medium">
                                            {isNewUser ? "Choose a secure password for your account" : "Please enter your password to continue"}
                                        </p>
                                    </div>

                                    <form onSubmit={handleFinalize} className="space-y-4">
                                        <div className="space-y-2">
                                            <Label className="ml-2 text-slate-600">Password</Label>
                                            <div className="relative">
                                                <Input
                                                    type={showPassword ? "text" : "password"}
                                                    placeholder="••••••••"
                                                    value={password}
                                                    onChange={(e) => setPassword(e.target.value)}
                                                    className="h-14 rounded-2xl border-romantic-blush pr-12"
                                                    required
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowPassword(!showPassword)}
                                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
                                                >
                                                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                                </button>
                                            </div>
                                        </div>

                                        {error && (
                                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-3 bg-red-50 border border-red-200 rounded-2xl text-sm text-red-600 text-center">
                                                {error}
                                            </motion.div>
                                        )}

                                        <Button
                                            type="submit"
                                            disabled={verifying}
                                            className="w-full h-14 rounded-2xl bg-gradient-button text-white shadow-lg text-lg"
                                        >
                                            {verifying ? <Loader2 className="animate-spin" /> : (isNewUser ? "Finish Setup" : "Sign In")}
                                        </Button>
                                    </form>

                                    <button onClick={() => setStep("otp")} className="w-full text-center text-sm text-slate-400 font-medium">
                                        Back to OTP
                                    </button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </Card>
                ) : (
                    <Card className="p-8 space-y-6 border-none shadow-2xl bg-white/80 backdrop-blur-xl rounded-4xl text-center">
                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring" }}>
                            <div className="w-24 h-24 bg-emerald-500 rounded-full flex items-center justify-center shadow-xl mx-auto">
                                <CheckCircle2 className="text-white" size={48} />
                            </div>
                        </motion.div>
                        <h1 className="text-3xl font-bold text-slate-800">Perfect!</h1>
                        <p className="text-slate-600 font-medium">Signing you in...</p>
                    </Card>
                )}
            </motion.div>
        </div>
    );
}
