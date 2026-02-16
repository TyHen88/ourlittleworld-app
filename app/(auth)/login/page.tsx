"use client";
import React, { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Heart, Mail, Lock, ArrowRight } from "lucide-react";
import { signIn } from "@/lib/actions/auth";
import { useRouter } from "next/navigation";

export default function LoginPage() {
    const router = useRouter();
    const [formData, setFormData] = useState({
        email: "",
        password: "",
    });
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        const result = await signIn(formData.email, formData.password);
        setLoading(false);

        if (result.success) {
            router.push("/dashboard");
        } else {
            setError(result.error || "Login failed");
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-[100dvh] p-6 bg-gradient-love">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md space-y-6"
            >
                <div className="text-center space-y-3">
                    <Heart className="mx-auto text-romantic-heart fill-romantic-heart animate-heart-beat" size={56} />
                    <h1 className="text-3xl font-bold text-slate-800">Welcome Back</h1>
                    <p className="text-slate-500 font-medium">Sign in to your world</p>
                </div>

                <Card className="p-8 space-y-6 border-none shadow-2xl bg-white/70 backdrop-blur-xl rounded-4xl">
                    <form onSubmit={handleSubmit} className="space-y-5">
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
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
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
                                    type="password"
                                    placeholder="••••••••"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    className="h-14 pl-12 rounded-2xl border-romantic-blush bg-white/50 focus:ring-romantic-heart"
                                    required
                                />
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
                            <span>{loading ? "Signing in..." : "Sign In"}</span>
                            {!loading && <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />}
                        </Button>
                    </form>

                    <div className="text-center pt-2">
                        <p className="text-sm text-slate-500">
                            Don't have an account?{" "}
                            <button
                                onClick={() => router.push("/register")}
                                className="font-bold text-romantic-heart hover:underline"
                            >
                                Create Account
                            </button>
                        </p>
                    </div>
                </Card>
            </motion.div>
        </div>
    );
}
