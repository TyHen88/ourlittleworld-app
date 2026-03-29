"use client";

import { useState } from "react";
import { 
    Dialog, 
    DialogContent, 
    DialogHeader, 
    DialogTitle, 
    DialogDescription
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
    Lock, 
    KeyRound, 
    Loader2, 
    CheckCircle2, 
    AlertCircle,
    ShieldCheck
} from "lucide-react";
import { changePassword } from "@/lib/actions/auth";
import { motion, AnimatePresence } from "framer-motion";

interface ChangePasswordModalProps {
    isOpen: boolean;
    onClose: () => void;
    userEmail?: string;
}

type Step = "form" | "success";

export function ChangePasswordModal({ isOpen, onClose, userEmail }: ChangePasswordModalProps) {
    const [step, setStep] = useState<Step>("form");
    const [isLoading, setIsLoading] = useState(false);
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState<string | null>(null);

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
            await changePassword(currentPassword, newPassword);
            setStep("success");
            setTimeout(() => {
                handleClose();
            }, 3000);
        } catch (error: unknown) {
            setError(error instanceof Error ? error.message : "Failed to update password.");
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
            <DialogContent className="sm:max-w-[425px] border-none shadow-2xl rounded-[2rem] overflow-hidden">
                <DialogHeader className="pt-6 px-6">
                    <div className="mx-auto w-12 h-12 bg-purple-50 rounded-full flex items-center justify-center mb-4 transition-transform hover:scale-110 duration-300">
                        <Lock className="text-purple-600" size={24} />
                    </div>
                    <DialogTitle className="text-2xl font-black text-center text-slate-800 tracking-tight">
                        Security Center
                    </DialogTitle>
                    <DialogDescription className="text-center text-slate-500 font-medium">
                        Protect your world with a strong password
                    </DialogDescription>
                </DialogHeader>

                <div className="p-6">
                    <AnimatePresence mode="wait">
                        {step === "form" && (
                            <motion.form 
                                key="form"
                                onSubmit={handleUpdatePassword}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                className="space-y-6"
                            >
                                <div className="bg-slate-50 p-4 rounded-3xl flex items-start gap-3 border border-slate-100">
                                    <ShieldCheck className="text-slate-400 mt-1" size={18} />
                                    <div className="space-y-1">
                                        <p className="text-sm font-bold text-slate-700">Password Update</p>
                                        <p className="text-xs text-slate-500 leading-relaxed">
                                            Change the password for <span className="font-bold text-purple-600">{userEmail || "your account"}</span> using your current password.
                                        </p>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Current Password</Label>
                                    <div className="relative">
                                        <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                        <Input 
                                            type="password"
                                            placeholder="••••••••" 
                                            value={currentPassword}
                                            onChange={(e) => setCurrentPassword(e.target.value)}
                                            className="h-14 pl-12 rounded-2xl bg-slate-50 border-slate-200 focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all font-medium"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-4 pt-2">
                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">New Password</Label>
                                        <div className="relative">
                                            <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                            <Input 
                                                type="password"
                                                placeholder="••••••••" 
                                                value={newPassword}
                                                onChange={(e) => setNewPassword(e.target.value)}
                                                className="h-14 pl-12 rounded-2xl bg-slate-50 border-slate-200 focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all font-medium"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Confirm New Password</Label>
                                        <div className="relative">
                                            <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                            <Input 
                                                type="password"
                                                placeholder="••••••••" 
                                                value={confirmPassword}
                                                onChange={(e) => setConfirmPassword(e.target.value)}
                                                className="h-14 pl-12 rounded-2xl bg-slate-50 border-slate-200 focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all font-medium"
                                                required
                                            />
                                        </div>
                                    </div>
                                </div>

                                {error && (
                                    <div className="bg-red-50 p-3 rounded-xl flex items-center gap-2 text-red-600 text-xs font-bold border border-red-100 animate-pulse">
                                        <AlertCircle size={14} />
                                        {error}
                                    </div>
                                ) }

                                <div className="flex flex-col gap-3 pt-2">
                                    <Button 
                                        type="submit"
                                        className="w-full h-14 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-2xl font-bold shadow-lg shadow-purple-200 transition-all flex items-center justify-center gap-2 group"
                                        disabled={isLoading}
                                    >
                                        {isLoading ? <Loader2 className="animate-spin" size={20} /> : "Update Password"}
                                    </Button>
                                </div>
                            </motion.form>
                        )}

                        {step === "success" && (
                            <motion.div 
                                key="success"
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="py-8 text-center space-y-4"
                            >
                                <div className="mx-auto w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mb-2 shadow-inner">
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
                                    <p className="text-sm text-slate-500 font-medium">Your password has been securely updated.</p>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </DialogContent>
        </Dialog>
    );
}
