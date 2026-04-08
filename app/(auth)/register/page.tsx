"use client";
import React, { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Heart, Mail, User, ArrowRight, Loader2, Lock, Eye, EyeOff } from "lucide-react";
import { signUp } from "@/lib/actions/auth";
import { useRouter } from "next/navigation";
import { FullPageLoader } from "@/components/FullPageLoader";
import { signIn } from "next-auth/react";
import { GoogleAuthButton } from "@/components/auth/GoogleAuthButton";
import { markAutoEnablePushAfterRegister } from "@/lib/push-client";

function validateSignUpForm(fullName: string, email: string, password: string, confirmPassword: string) {
    const normalizedFullName = fullName.trim();
    const normalizedEmail = email.trim().toLowerCase();

    if (normalizedFullName.length < 2) {
        return "Please enter your full name.";
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
        return "Please enter a valid email address.";
    }

    if (password.length < 8) {
        return "Password must be at least 8 characters.";
    }

    if (password !== confirmPassword) {
        return "Passwords do not match.";
    }

    return null;
}

export default function RegisterPage() {
    const router = useRouter();
    const [formData, setFormData] = useState({
        fullName: "",
        email: "",
        password: "",
        confirmPassword: "",
    });
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [redirecting, setRedirecting] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        const validationError = validateSignUpForm(
            formData.fullName,
            formData.email,
            formData.password,
            formData.confirmPassword,
        );
        if (validationError) {
            setError(validationError);
            return;
        }

        setLoading(true);

        try {
            const success = await signUp(formData.email, formData.fullName, formData.password);
            const normalizedEmail = formData.email.trim().toLowerCase();

            if (success) {
                const result = await signIn("credentials", {
                    email: normalizedEmail,
                    password: formData.password,
                    redirect: false,
                });

                if (result?.error) {
                    throw new Error("Account created, but automatic sign-in failed. Please sign in manually.");
                }

                markAutoEnablePushAfterRegister();
                setRedirecting(true);
                router.push("/onboarding");
                router.refresh();
                return;
            }
        } catch (error: unknown) {
            setError(error instanceof Error ? error.message : "Registration failed");
        } finally {
            setLoading(false);
        }
    };

    if (redirecting) {
        return <FullPageLoader />;
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-[100dvh] p-6 bg-gradient-love">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md space-y-6"
            >
                <div className="text-center space-y-3">
                    <Heart className="mx-auto text-romantic-heart fill-romantic-heart animate-heart-beat" size={56} />
                    <h1 className="text-3xl font-bold text-slate-800">Create Account</h1>
                    <p className="text-slate-500 font-medium">Start your journey together</p>
                </div>

                <Card className="p-8 space-y-6 border-none shadow-2xl bg-white/70 backdrop-blur-xl rounded-4xl">
                    <div className="space-y-4">
                        <GoogleAuthButton label="Sign up with Google" autoEnablePushOnReturn />

                        <div className="flex items-center gap-3">
                            <div className="h-px flex-1 bg-slate-200" />
                            <span className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">
                                Or create with email
                            </span>
                            <div className="h-px flex-1 bg-slate-200" />
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="space-y-2">
                            <Label htmlFor="fullName" className="text-sm font-semibold text-slate-600 uppercase tracking-wide ml-2">
                                Full Name
                            </Label>
                            <div className="relative">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                                <Input
                                    id="fullName"
                                    type="text"
                                    placeholder="Your name"
                                    value={formData.fullName}
                                    onChange={(e) => {
                                        setFormData({ ...formData, fullName: e.target.value });
                                        if (error) setError("");
                                    }}
                                    className="h-14 pl-12 rounded-2xl border-romantic-blush bg-white/50 focus:ring-romantic-heart"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-sm font-semibold text-slate-600 uppercase tracking-wide ml-2">
                                Email
                            </Label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="you@example.com"
                                    value={formData.email}
                                    onChange={(e) => {
                                        setFormData({ ...formData, email: e.target.value });
                                        if (error) setError("");
                                    }}
                                    className="h-14 pl-12 rounded-2xl border-romantic-blush bg-white/50 focus:ring-romantic-heart"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="password" className="text-sm font-semibold text-slate-600 uppercase tracking-wide ml-2">
                                Password
                            </Label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                                <Input
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    placeholder="At least 8 characters"
                                    value={formData.password}
                                    onChange={(e) => {
                                        setFormData({ ...formData, password: e.target.value });
                                        if (error) setError("");
                                    }}
                                    className="h-14 pl-12 pr-12 rounded-2xl border-romantic-blush bg-white/50 focus:ring-romantic-heart"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 p-1 hover:text-romantic-heart transition-colors"
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="confirmPassword" className="text-sm font-semibold text-slate-600 uppercase tracking-wide ml-2">
                                Confirm Password
                            </Label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                                <Input
                                    id="confirmPassword"
                                    type={showConfirmPassword ? "text" : "password"}
                                    placeholder="Repeat your password"
                                    value={formData.confirmPassword}
                                    onChange={(e) => {
                                        setFormData({ ...formData, confirmPassword: e.target.value });
                                        if (error) setError("");
                                    }}
                                    className="h-14 pl-12 pr-12 rounded-2xl border-romantic-blush bg-white/50 focus:ring-romantic-heart"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 p-1 hover:text-romantic-heart transition-colors"
                                >
                                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        {error && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="p-3 bg-red-50 border border-red-200 rounded-2xl text-sm text-red-600 text-center"
                            >
                                {error}
                            </motion.div>
                        )}

                        <Button
                            type="submit"
                            disabled={loading}
                            className="w-full h-14 rounded-3xl bg-gradient-button text-white shadow-lg text-lg group"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 animate-spin" size={20} />
                                    <span>Creating Account...</span>
                                </>
                            ) : (
                                <>
                                    <span>Create Account</span>
                                    <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </Button>
                    </form>

                    <div className="text-center pt-2">
                        <p className="text-sm text-slate-500">
                            Already have an account?{" "}
                            <button
                                onClick={() => router.push("/login")}
                                className="font-bold text-romantic-heart hover:underline"
                            >
                                Sign In
                            </button>
                        </p>
                    </div>
                </Card>
            </motion.div>
        </div>
    );
}
