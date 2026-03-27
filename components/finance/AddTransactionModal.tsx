"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import { ShoppingBag, Coffee, Home, Heart, DollarSign, Calendar, TrendingUp, TrendingDown, Wallet } from "lucide-react";
import { useCreateTransaction } from "@/hooks/use-transactions";
import { useQueryClient } from "@tanstack/react-query";
import { useCouple } from "@/hooks/use-couple";
import { cn } from "@/lib/utils";

interface AddTransactionModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    coupleId: string;
}

const EXPENSE_CATEGORIES = [
    { name: "Shopping", icon: ShoppingBag, color: "bg-blue-100 text-blue-600" },
    { name: "Coffee", icon: Coffee, color: "bg-amber-100 text-amber-600" },
    { name: "Bills", icon: Home, color: "bg-purple-100 text-purple-600" },
    { name: "Food", icon: Heart, color: "bg-pink-100 text-pink-600" },
    { name: "Transport", icon: DollarSign, color: "bg-green-100 text-green-600" },
    { name: "Entertainment", icon: Heart, color: "bg-red-100 text-red-600" },
];

const INCOME_CATEGORIES = [
    { name: "Salary", icon: DollarSign, color: "bg-green-100 text-green-600" },
    { name: "Bonus", icon: TrendingUp, color: "bg-emerald-100 text-emerald-600" },
    { name: "Gift", icon: Heart, color: "bg-pink-100 text-pink-600" },
    { name: "Refund", icon: DollarSign, color: "bg-blue-100 text-blue-600" },
    { name: "Other", icon: DollarSign, color: "bg-gray-100 text-gray-600" },
];

const PAYERS = [
    { value: "HIS", label: "His", color: "bg-romantic-blush text-romantic-heart" },
    { value: "HERS", label: "Hers", color: "bg-romantic-lavender text-slate-600" },
    { value: "SHARED", label: "Shared", color: "bg-romantic-mint text-emerald-600" },
];

export function AddTransactionModal({ open, onOpenChange, coupleId }: AddTransactionModalProps) {
    const { profile } = useCouple();
    const isSingle = profile?.user_type === 'SINGLE';
    const queryClient = useQueryClient();
    const createTransaction = useCreateTransaction();

    const [transactionType, setTransactionType] = useState<"INCOME" | "EXPENSE">("EXPENSE");
    const [amount, setAmount] = useState("");
    const [category, setCategory] = useState("Shopping");
    const [note, setNote] = useState("");
    const [payer, setPayer] = useState<"HIS" | "HERS" | "SHARED">("SHARED");
    const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
    const [error, setError] = useState("");
    const [uploadStatus, setUploadStatus] = useState<"idle" | "uploading" | "success" | "error">("idle");
    const [isExtracting, setIsExtracting] = useState(false);

    const categories = transactionType === "INCOME" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

    const handleSubmit = async () => {
        if (!amount || parseFloat(amount) <= 0) {
            setError("Please enter a valid amount");
            return;
        }

        if (!category) {
            setError("Please select a category");
            return;
        }

        setError("");

        // Optimistic update - add transaction to cache immediately
        const optimisticTransaction = {
            id: `temp-${Date.now()}`,
            couple_id: coupleId,
            amount: parseFloat(amount),
            category,
            note: note.trim() || null,
            payer,
            type: transactionType,
            created_by: "current-user",
            transaction_date: date,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            creator: {
                id: "current-user",
                full_name: "You",
                avatar_url: null,
            },
        };

        // Update transactions cache immediately
        queryClient.setQueryData(['transactions', coupleId, undefined], (old: any) => {
            if (!old) return [optimisticTransaction];
            return [optimisticTransaction, ...old];
        });

        // Close modal immediately
        setAmount("");
        setNote("");
        setTransactionType("EXPENSE");
        setCategory("Shopping");
        setPayer(isSingle ? "SHARED" : "SHARED"); // Default is fine
        onOpenChange(false);

        // Save to server in background
        try {
            const result = await createTransaction.mutateAsync({
                coupleId,
                amount: parseFloat(amount),
                category,
                note: note.trim() || undefined,
                payer,
                type: transactionType,
                transactionDate: date,
            });

            // Replace temp transaction with real one
            queryClient.setQueryData(['transactions', coupleId, undefined], (old: any) => {
                if (!old) return [result];
                return old.map((t: any) =>
                    t.id === optimisticTransaction.id ? result : t
                );
            });
        } catch (err: any) {
            // Rollback on error
            queryClient.setQueryData(['transactions', coupleId, undefined], (old: any) => {
                if (!old) return [];
                return old.filter((t: any) => t.id !== optimisticTransaction.id);
            });

            queryClient.invalidateQueries({ queryKey: ['budget-summary', coupleId, undefined] });

            setError(err.message || "Failed to add transaction");
            onOpenChange(true);
        }
    };

    return (
        <div
            className={cn(
                "fixed inset-0 z-50 flex items-end justify-center transition-all duration-300",
                open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
            )}
            onClick={() => onOpenChange(false)}
        >
            <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" />

            <motion.div
                initial={{ y: "100%" }}
                animate={{ y: open ? 0 : "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                onClick={(e) => e.stopPropagation()}
                className="relative w-full max-w-none overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:max-h-[84vh] sm:max-w-sm"
            >
                <div className="max-h-[92dvh] overflow-y-auto px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 sm:max-h-[84vh]">
                    <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-3" />

                    <div className="flex items-center gap-3 mb-4">
                        <div className={cn(
                            "p-2.5 rounded-2xl",
                            isSingle ? "bg-emerald-100 text-emerald-600" : "bg-romantic-blush text-romantic-heart"
                        )}>
                            <Wallet size={20} />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-base font-black text-slate-800">
                                {isSingle ? "Add Entry" : "Add Transaction"}
                            </h3>
                            <p className="text-[11px] text-slate-500 font-medium">
                                Add a new {transactionType === "INCOME" ? "income" : "expense"} record
                            </p>
                        </div>
                    </div>

                    <div className="space-y-3 py-1">
                        {/* Transaction Type Toggle */}
                        <div>
                            <label className="mb-1.5 block text-[9px] font-bold uppercase tracking-wide text-slate-600">Type</label>
                            <div className="grid grid-cols-2 gap-2">
                                <motion.button
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => {
                                        setTransactionType("EXPENSE");
                                        setCategory("Shopping");
                                    }}
                                    className={`flex items-center justify-center rounded-xl px-3 py-2.5 text-xs font-bold transition-all ${transactionType === "EXPENSE"
                                        ? "bg-red-100 text-red-600 ring-2 ring-offset-2 ring-red-300"
                                        : "bg-slate-50 text-slate-400 hover:bg-slate-100"
                                        }`}
                                >
                                    <TrendingDown size={14} className="mr-1.5" />
                                    Expense
                                </motion.button>
                                <motion.button
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => {
                                        setTransactionType("INCOME");
                                        setCategory("Salary");
                                    }}
                                    className={`flex items-center justify-center rounded-xl px-3 py-2.5 text-xs font-bold transition-all ${transactionType === "INCOME"
                                        ? "bg-green-100 text-green-600 ring-2 ring-offset-2 ring-green-300"
                                        : "bg-slate-50 text-slate-400 hover:bg-slate-100"
                                        }`}
                                >
                                    <TrendingUp size={14} className="mr-1.5" />
                                    Income
                                </motion.button>
                            </div>
                        </div>

                        {/* Amount Input */}
                        <div>
                            <label className="mb-1.5 block text-[9px] font-bold uppercase tracking-wide text-slate-600">Amount</label>
                            <div className="relative">
                                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <Input
                                    type="number"
                                    step="0.01"
                                    placeholder="0.00"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    className="h-11 rounded-xl pl-9 text-[18px] font-bold [font-size:18px]"
                                    autoFocus
                                />
                            </div>
                        </div>

                        {/* Category Selection */}
                        <div>
                            <label className="mb-1.5 block text-[9px] font-bold uppercase tracking-wide text-slate-600">Category</label>
                            <div className="grid grid-cols-3 gap-1.5">
                                {categories.map((cat) => {
                                    const Icon = cat.icon;
                                    return (
                                        <motion.button
                                            key={cat.name}
                                            whileTap={{ scale: 0.95 }}
                                            onClick={() => setCategory(cat.name)}
                                            className={`flex flex-col items-center gap-1 rounded-xl px-2 py-2 text-[10px] transition-all ${category === cat.name
                                                ? `${cat.color} ring-2 ring-offset-1 ring-slate-300`
                                                : "bg-slate-50 text-slate-400 hover:bg-slate-100"
                                                }`}
                                        >
                                            <Icon size={14} />
                                            <span className="font-bold leading-tight">{cat.name}</span>
                                        </motion.button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Payer Selection - Only for couples */}
                        {!isSingle && (
                            <div>
                                <label className="mb-1.5 block text-[9px] font-bold uppercase tracking-wide text-slate-600">Who Paid?</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {PAYERS.map((p) => (
                                        <motion.button
                                            key={p.value}
                                            whileTap={{ scale: 0.95 }}
                                            onClick={() => setPayer(p.value as any)}
                                            className={`rounded-xl px-2.5 py-2.5 text-xs font-bold transition-all ${payer === p.value
                                                ? `${p.color} ring-2 ring-offset-2 ring-slate-300`
                                                : "bg-slate-50 text-slate-400 hover:bg-slate-100"
                                                }`}
                                        >
                                            {p.label}
                                        </motion.button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Receipt Upload : disabled for now */}
                        {/* <div>
                            <label className="text-[10px] font-bold text-slate-600 mb-1.5 block uppercase tracking-wide">Receipt (Optional)</label>
                            <div className="flex items-center gap-2">
                                <label className="flex-1 cursor-pointer">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={async (e) => {
                                            const file = e.target.files?.[0];
                                            if (!file) return;

                                            setUploadStatus("uploading");
                                            setIsExtracting(true);

                                            try {
                                                const formData = new FormData();
                                                formData.append("file", file);

                                                const res = await fetch("/api/ocr/extract", {
                                                    method: "POST",
                                                    body: formData,
                                                });

                                                const json = await res.json();

                                                if (!res.ok) throw new Error(json.error);

                                                // Auto-populate fields from OCR
                                                if (json.data.amount) setAmount(json.data.amount.toString());
                                                if (json.data.date) setDate(json.data.date);
                                                if (json.data.name) setNote(json.data.name);

                                                setUploadStatus("success");
                                            } catch (err) {
                                                setUploadStatus("error");
                                                setError("Failed to extract receipt data");
                                            } finally {
                                                setIsExtracting(false);
                                            }
                                        }}
                                    />
                                    <div className="flex items-center gap-2 p-2.5 rounded-xl border-2 border-dashed border-slate-200 hover:border-romantic-heart hover:bg-romantic-blush/10 transition-all">
                                        <Upload size={16} className="text-slate-400" />
                                        <span className="text-xs font-medium text-slate-500">
                                            {isExtracting ? "Extracting..." : "Upload Receipt"}
                                        </span>
                                    </div>
                                </label>
                                {uploadStatus === "success" && (
                                    <CheckCircle2 size={20} className="text-green-500 flex-shrink-0" />
                                )}
                                {uploadStatus === "error" && (
                                    <XCircle size={20} className="text-red-500 flex-shrink-0" />
                                )}
                            </div>
                        </div> */}

                        {/* Note Input */}
                        <div>
                            <label className="mb-1.5 block text-[9px] font-bold uppercase tracking-wide text-slate-600">Note (Optional)</label>
                            <Input
                                placeholder="What was this for?"
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                                className="h-10 rounded-xl text-base [font-size:16px]"
                            />
                        </div>

                        {/* Date Input */}
                        <div>
                            <label className="mb-1.5 block text-[9px] font-bold uppercase tracking-wide text-slate-600">Date</label>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                <Input
                                    type="date"
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                    className="h-10 rounded-xl pl-9 text-base [font-size:16px]"
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="text-xs text-red-500 text-center font-medium">
                                {error}
                            </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex gap-2 pt-1">
                            <Button
                                variant="outline"
                                onClick={() => onOpenChange(false)}
                                className="h-10 flex-1 rounded-xl text-xs"
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleSubmit}
                                disabled={createTransaction.isPending}
                                className={`h-10 flex-1 rounded-xl text-xs ${isSingle ? 'bg-emerald-500 hover:bg-emerald-600 border-none' : 'bg-gradient-button'}`}
                            >
                                {createTransaction.isPending ? "Adding..." : "Add Transaction"}
                            </Button>
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
