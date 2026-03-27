"use client";

import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToastStore, toast, type ToastItem } from "@/lib/toast";

const TOAST_STYLES: Record<ToastItem["variant"], { icon: typeof CheckCircle2; className: string; iconClassName: string }> = {
    success: {
        icon: CheckCircle2,
        className: "border-emerald-200 bg-emerald-50/95 text-emerald-950 shadow-emerald-100/80",
        iconClassName: "text-emerald-600",
    },
    error: {
        icon: AlertCircle,
        className: "border-red-200 bg-red-50/95 text-red-950 shadow-red-100/80",
        iconClassName: "text-red-600",
    },
    info: {
        icon: Info,
        className: "border-slate-200 bg-white/95 text-slate-900 shadow-slate-200/80",
        iconClassName: "text-slate-500",
    },
};

export function Toaster() {
    const toasts = useToastStore((state) => state.toasts);

    return (
        <div
            aria-live="polite"
            aria-atomic="true"
            className="pointer-events-none fixed inset-x-0 bottom-5 z-[200] flex justify-center px-4 sm:justify-end"
        >
            <div className="flex w-full max-w-sm flex-col gap-3">
                <AnimatePresence initial={false}>
                    {toasts.map((item) => {
                        const config = TOAST_STYLES[item.variant];
                        const Icon = config.icon;

                        return (
                            <motion.div
                                key={item.id}
                                initial={{ opacity: 0, y: 16, scale: 0.96 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 8, scale: 0.98 }}
                                transition={{ duration: 0.2, ease: "easeOut" }}
                                className={cn(
                                    "pointer-events-auto overflow-hidden rounded-2xl border backdrop-blur-xl shadow-xl",
                                    config.className,
                                )}
                                role="status"
                            >
                                <div className="flex items-start gap-3 p-4">
                                    <Icon className={cn("mt-0.5 h-5 w-5 flex-shrink-0", config.iconClassName)} />
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-bold leading-5">{item.title}</p>
                                        {item.description && (
                                            <p className="mt-1 text-sm leading-5 text-current/75">{item.description}</p>
                                        )}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => toast.dismiss(item.id)}
                                        className="rounded-full p-1 text-current/45 transition-colors hover:bg-black/5 hover:text-current/70"
                                        aria-label="Dismiss notification"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </div>
        </div>
    );
}
