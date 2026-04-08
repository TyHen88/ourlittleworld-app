"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
    AlertCircle,
    CheckCircle2,
    KeyRound,
    Loader2,
    Lock,
    ShieldCheck,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ChangePasswordModalProps {
    isOpen: boolean;
    onClose: () => void;
    userEmail?: string;
    requireCurrentPassword?: boolean;
    mode?: "change" | "set";
}

type Step = "form" | "success";

export function ChangePasswordModal({
    isOpen,
    onClose,
    userEmail,
    requireCurrentPassword = true,
    mode = "change",
}: ChangePasswordModalProps) {
    const [step, setStep] = useState<Step>("form");
    const [isLoading, setIsLoading] = useState(false);
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState<string | null>(null);

    const isSetMode = mode === "set";
    const modalTitle = isSetMode ? "Set Password" : "Security Center";
    const modalDescription = isSetMode
        ? "Add a password so you can sign in with email too"
        : "Protect your world with a strong password";
    const actionLabel = isSetMode ? "Set Password" : "Update Password";
    const successMessage = isSetMode
        ? "Password added. You can now sign in with Google or email and password."
        : "Your password has been securely updated.";

    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (newPassword !== confirmPassword) {
            setError("Passwords do not match");
            return;
        }

        if (newPassword.length < 8) {
            setError("Password must be at least 8 characters");
            return;
        }

        setIsLoading(true);
        try {
            const response = await fetch("/api/auth/change-password", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    currentPassword,
                    newPassword,
                }),
            });

            const result = await response.json().catch(() => null);

            if (!response.ok || !result?.success) {
                setError(
                    typeof result?.error === "string"
                        ? result.error
                        : "Failed to update password."
                );
                return;
            }

            setStep("success");
            setTimeout(() => {
                handleClose();
            }, 3000);
        } catch (requestError: unknown) {
            setError(
                requestError instanceof Error
                    ? requestError.message
                    : "Failed to update password."
            );
        } finally {
            setIsLoading(false);
        }
    };

    const handleClose = () => {
        setStep("form");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setError(null);
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
            <DialogContent className="overflow-hidden rounded-[2rem] border-none shadow-2xl sm:max-w-[425px]">
                <DialogHeader className="px-6 pt-6">
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-purple-50 transition-transform duration-300 hover:scale-110">
                        <Lock className="text-purple-600" size={24} />
                    </div>
                    <DialogTitle className="text-center text-2xl font-black tracking-tight text-slate-800">
                        {modalTitle}
                    </DialogTitle>
                    <DialogDescription className="text-center font-medium text-slate-500">
                        {modalDescription}
                    </DialogDescription>
                </DialogHeader>

                <div className="p-6">
                    <AnimatePresence mode="wait">
                        {step === "form" ? (
                            <motion.form
                                key="form"
                                onSubmit={handleUpdatePassword}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                className="space-y-6"
                            >
                                <div className="flex items-start gap-3 rounded-3xl border border-slate-100 bg-slate-50 p-4">
                                    <ShieldCheck className="mt-1 text-slate-400" size={18} />
                                    <div className="space-y-1">
                                        <p className="text-sm font-bold text-slate-700">Password Update</p>
                                        <p className="text-xs leading-relaxed text-slate-500">
                                            {requireCurrentPassword ? (
                                                <>
                                                    Change the password for{" "}
                                                    <span className="font-bold text-purple-600">
                                                        {userEmail || "your account"}
                                                    </span>{" "}
                                                    using your current password.
                                                </>
                                            ) : (
                                                <>
                                                    Add an email password for{" "}
                                                    <span className="font-bold text-purple-600">
                                                        {userEmail || "your account"}
                                                    </span>{" "}
                                                    so you can sign in without Google when needed.
                                                </>
                                            )}
                                        </p>
                                    </div>
                                </div>

                                {requireCurrentPassword ? (
                                    <div className="space-y-2">
                                        <Label className="ml-1 text-xs font-bold uppercase tracking-widest text-slate-500">
                                            Current Password
                                        </Label>
                                        <div className="relative">
                                            <ShieldCheck
                                                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                                                size={18}
                                            />
                                            <Input
                                                type="password"
                                                placeholder="Enter current password"
                                                value={currentPassword}
                                                onChange={(e) => setCurrentPassword(e.target.value)}
                                                className="h-14 rounded-2xl border-slate-200 bg-slate-50 pl-12 font-medium transition-all focus:border-purple-500 focus:bg-white focus:ring-2 focus:ring-purple-500/20"
                                            />
                                        </div>
                                    </div>
                                ) : null}

                                <div className="space-y-4 pt-2">
                                    <div className="space-y-2">
                                        <Label className="ml-1 text-xs font-bold uppercase tracking-widest text-slate-500">
                                            {isSetMode ? "Create Password" : "New Password"}
                                        </Label>
                                        <div className="relative">
                                            <KeyRound
                                                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                                                size={18}
                                            />
                                            <Input
                                                type="password"
                                                placeholder={isSetMode ? "Create a password" : "Enter new password"}
                                                value={newPassword}
                                                onChange={(e) => setNewPassword(e.target.value)}
                                                className="h-14 rounded-2xl border-slate-200 bg-slate-50 pl-12 font-medium transition-all focus:border-purple-500 focus:bg-white focus:ring-2 focus:ring-purple-500/20"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="ml-1 text-xs font-bold uppercase tracking-widest text-slate-500">
                                            Confirm New Password
                                        </Label>
                                        <div className="relative">
                                            <KeyRound
                                                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                                                size={18}
                                            />
                                            <Input
                                                type="password"
                                                placeholder="Confirm password"
                                                value={confirmPassword}
                                                onChange={(e) => setConfirmPassword(e.target.value)}
                                                className="h-14 rounded-2xl border-slate-200 bg-slate-50 pl-12 font-medium transition-all focus:border-purple-500 focus:bg-white focus:ring-2 focus:ring-purple-500/20"
                                                required
                                            />
                                        </div>
                                    </div>
                                </div>

                                {error ? (
                                    <div className="flex items-center gap-2 rounded-xl border border-red-100 bg-red-50 p-3 text-xs font-bold text-red-600">
                                        <AlertCircle size={14} />
                                        {error}
                                    </div>
                                ) : null}

                                <div className="flex flex-col gap-3 pt-2">
                                    <Button
                                        type="submit"
                                        className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 font-bold text-white shadow-lg shadow-purple-200 transition-all hover:from-purple-700 hover:to-indigo-700"
                                        disabled={isLoading}
                                    >
                                        {isLoading ? <Loader2 className="animate-spin" size={20} /> : actionLabel}
                                    </Button>
                                </div>
                            </motion.form>
                        ) : (
                            <motion.div
                                key="success"
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="space-y-4 py-8 text-center"
                            >
                                <div className="mx-auto mb-2 flex h-20 w-20 items-center justify-center rounded-full bg-green-50 shadow-inner">
                                    <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        transition={{ type: "spring", damping: 12 }}
                                    >
                                        <CheckCircle2 className="text-green-500" size={48} />
                                    </motion.div>
                                </div>
                                <div className="space-y-2">
                                    <h3 className="text-xl font-black text-slate-800">Success!</h3>
                                    <p className="text-sm font-medium text-slate-500">
                                        {successMessage}
                                    </p>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </DialogContent>
        </Dialog>
    );
}
