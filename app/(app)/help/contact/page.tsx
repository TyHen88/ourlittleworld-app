"use client";

import { motion } from "framer-motion";
import { ArrowLeft, Mail, MessageCircle, Send, Sparkles } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { sendSupportEmail } from "@/lib/actions/support";

export default function ContactSupportPage() {
    const [sent, setSent] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        
        const form = e.target as HTMLFormElement;
        const subject = (form.elements.namedItem("subject") as HTMLInputElement).value;
        const message = (form.elements.namedItem("message") as HTMLTextAreaElement).value;

        try {
            const result = await sendSupportEmail({ subject, message });
            if (result.success) {
                setSent(true);
            } else {
                alert(result.error || "Failed to send message");
            }
        } catch (err) {
            console.error("Support form error:", err);
            alert("Something went wrong. Please try again later.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-romantic-warm via-white to-romantic-blush/20 p-6 pb-32">
            <div className="max-w-2xl mx-auto space-y-8">
                {/* Header */}
                <header className="flex items-center gap-4">
                    <Link
                        href="/settings"
                        className="p-3 rounded-2xl bg-white hover:bg-slate-50 transition-colors shadow-sm"
                    >
                        <ArrowLeft className="text-slate-600" size={20} />
                    </Link>
                    <div>
                        <h1 className="text-3xl font-black text-slate-800 flex items-center gap-2">
                            <Mail className="text-pink-600" size={28} />
                            Contact Support
                        </h1>
                        <p className="text-sm text-slate-500 mt-0.5">We'd love to hear from you</p>
                    </div>
                </header>

                <div className="grid md:grid-cols-5 gap-6">
                    {/* Contact Form */}
                    <Card className="md:col-span-3 p-8 border-none shadow-xl bg-white rounded-[2rem] relative overflow-hidden">
                        {sent ? (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="text-center py-10 space-y-4"
                            >
                                <div className="mx-auto w-20 h-20 bg-green-50 rounded-full flex items-center justify-center text-green-600">
                                    <Send size={40} />
                                </div>
                                <h2 className="text-2xl font-black text-slate-800">Message Sent!</h2>
                                <p className="text-sm text-slate-500 max-w-[200px] mx-auto">
                                    Thanks for reaching out! We'll get back to you within 24 hours.
                                </p>
                                <Button
                                    onClick={() => setSent(false)}
                                    variant="outline"
                                    className="rounded-full mt-4"
                                >
                                    Send another message
                                </Button>
                            </motion.div>
                        ) : (
                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Subject</Label>
                                    <Input
                                        name="subject"
                                        placeholder="What can we help with?"
                                        className="rounded-2xl h-12 border-slate-100 focus:border-pink-300 focus:ring-pink-100 transition-all bg-slate-50/30"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Message</Label>
                                    <textarea
                                        name="message"
                                        placeholder="Tell us more about your issue or feedback..."
                                        className="w-full min-h-[150px] p-4 rounded-2xl border border-slate-100 focus:border-pink-300 focus:ring-pink-100 focus:outline-none transition-all bg-slate-50/30 text-sm"
                                        required
                                    />
                                </div>
                                <Button
                                    disabled={loading}
                                    className="w-full h-14 rounded-2xl bg-pink-600 hover:bg-pink-700 text-white font-bold text-lg shadow-lg shadow-pink-100 active:scale-95 transition-all"
                                >
                                    {loading ? "Sending..." : "Send Message"}
                                </Button>
                            </form>
                        )}
                    </Card>

                    {/* Social & Other Links */}
                    <div className="md:col-span-2 space-y-4">
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="p-6 bg-white/50 backdrop-blur-sm border border-white rounded-[2rem] shadow-sm hover:shadow-md transition-all"
                        >
                            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 mb-4">
                                <Sparkles size={20} />
                            </div>
                            <h3 className="font-bold text-slate-800">Feedback</h3>
                            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                                Love the app? Have suggestions? We thrive on your feedback!
                            </p>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.1 }}
                            className="p-6 bg-white/50 backdrop-blur-sm border border-white rounded-[2rem] shadow-sm hover:shadow-md transition-all"
                        >
                            <div className="w-10 h-10 bg-pink-50 rounded-xl flex items-center justify-center text-pink-600 mb-4">
                                <MessageCircle size={20} />
                            </div>
                            <h3 className="font-bold text-slate-800">Telegram Support</h3>
                            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                                Contact developer for support via Telegram
                            </p>
                            <Link
                                href="https://t.me/ahh_tiii"
                                target="_blank"
                                className="text-xs font-bold text-pink-600 mt-3 block hover:underline"
                            >
                                @ourlittleworld
                            </Link>
                        </motion.div>
                    </div>
                </div>
            </div>
        </div>
    );
}
