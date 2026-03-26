"use client";

import Link from "next/link";
import { Bell, ChevronRight, Mail, Send } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useReminders } from "@/hooks/use-reminders";

export function SmartRemindersCard() {
    const { data: reminders, isLoading } = useReminders("active", 3);

    return (
        <Card className="p-5 border-none bg-gradient-to-br from-amber-50 via-white to-orange-50 rounded-3xl shadow-sm">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Bell className="text-amber-600" size={18} />
                    <h3 className="text-base font-black text-slate-800">Smart Reminders</h3>
                </div>
                <Link href="/settings" className="text-xs font-bold text-amber-700 inline-flex items-center gap-1">
                    Configure
                    <ChevronRight size={12} />
                </Link>
            </div>

            {isLoading ? (
                <div className="space-y-3">
                    {[1, 2].map((item) => (
                        <div key={item} className="h-16 rounded-2xl bg-white/70 animate-pulse" />
                    ))}
                </div>
            ) : reminders && reminders.length > 0 ? (
                <div className="space-y-3">
                    {reminders.map((reminder) => (
                        <div key={reminder.id} className="rounded-2xl bg-white/80 p-4 border border-amber-100">
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="font-bold text-slate-800 text-sm">{reminder.title}</p>
                                    <p className="text-xs text-slate-500 mt-1">{reminder.analysis_summary || reminder.body}</p>
                                    <p className="text-[10px] text-amber-700 font-bold uppercase tracking-wider mt-2">
                                        {new Date(reminder.due_at).toLocaleString()}
                                    </p>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                    {reminder.deliveries.some((delivery) => delivery.channel === "EMAIL" && delivery.status === "SENT") && (
                                        <Mail size={14} className="text-blue-500" />
                                    )}
                                    {reminder.deliveries.some((delivery) => delivery.channel === "TELEGRAM" && delivery.status === "SENT") && (
                                        <Send size={14} className="text-sky-500" />
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="rounded-2xl bg-white/80 p-4 border border-amber-100">
                    <p className="font-bold text-slate-800 text-sm">No active reminders</p>
                    <p className="text-xs text-slate-500 mt-1">Goal milestones, budget alerts, and daily digests will appear here.</p>
                </div>
            )}
        </Card>
    );
}
