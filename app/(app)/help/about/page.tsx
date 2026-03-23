"use client";

import { motion } from "framer-motion";
import { ArrowLeft, Code2, Heart, Instagram, Mail, Phone, Send, Sparkles, UserCheck2 } from "lucide-react";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const SOCIALS = [
    { icon: Send, label: "Telegram", href: "https://t.me/ahh_tiii", color: "text-pink-600 bg-pink-50" },
    { icon: Code2, label: "GitHub", href: "https://github.com/TyHen88", color: "text-slate-800 bg-slate-100" },
    { icon: Phone, label: "Phone", href: "tel:+85510297859", color: "text-blue-600 bg-blue-50" },
];

export default function AboutDeveloperPage() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-romantic-warm via-white to-romantic-blush/20 p-6 pb-32">
            <div className="max-w-2xl mx-auto space-y-8 text-center">
                {/* Header */}
                <header className="flex items-center gap-4 text-left">
                    <Link
                        href="/settings"
                        className="p-3 rounded-2xl bg-white hover:bg-slate-50 transition-colors shadow-sm"
                    >
                        <ArrowLeft className="text-slate-600" size={20} />
                    </Link>
                    <div>
                        <h1 className="text-3xl font-black text-slate-800 flex items-center gap-2">
                            <UserCheck2 className="text-pink-600" size={28} />
                            About Developer
                        </h1>
                        <p className="text-sm text-slate-500 mt-0.5">Meet the creator behind the scenes</p>
                    </div>
                </header>

                <div className="relative pt-10">
                    {/* Developer Card */}
                    <Card className="p-10 border-none shadow-2xl bg-white/70 backdrop-blur-xl rounded-[3rem] relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-8 opacity-10 scale-150 rotate-12 group-hover:scale-110 transition-transform">
                            <Sparkles size={120} className="text-pink-600" />
                        </div>

                        <div className="relative z-10 space-y-6">
                            <div className="mx-auto w-32 h-32 relative">
                                <Avatar className="w-full h-full border-4 border-white shadow-xl ring-2 ring-pink-50">
                                    <AvatarImage src="/mine.jpg" />
                                    <AvatarFallback className="bg-gradient-to-br from-pink-500 to-rose-500 text-white text-3xl font-black">
                                        TH
                                    </AvatarFallback>
                                </Avatar>
                                <motion.div
                                    className="absolute -bottom-2 -right-2 bg-white rounded-full p-2 shadow-lg"
                                    animate={{ scale: [1, 1.2, 1] }}
                                    transition={{ repeat: Infinity, duration: 2 }}
                                >
                                    <Heart className="text-pink-600" size={16} fill="currentColor" />
                                </motion.div>
                            </div>

                            <div className="space-y-2">
                                <h2 className="text-3xl font-black text-slate-800">Ty Hen</h2>
                                <p className="text-pink-600 font-bold uppercase tracking-widest text-xs">Lead Developer & Designer</p>
                            </div>

                            <p className="text-slate-600 text-sm leading-relaxed max-w-md mx-auto">
                                "Our Little World was born from the desire to create a more intentional space for couples.
                                In a world of noisy social media, we wanted something private, beautiful, and meaningful."
                            </p>

                            <div className="flex items-center justify-center gap-4 pt-4">
                                {SOCIALS.map((social, index) => {
                                    const Icon = social.icon;
                                    return (
                                        <Link
                                            key={index}
                                            href={social.href}
                                            target="_blank"
                                            className={cn(
                                                "p-4 rounded-2xl transition-all hover:scale-110 active:scale-95 shadow-sm hover:shadow-md",
                                                social.color
                                            )}
                                        >
                                            <Icon size={24} />
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                    </Card>

                    {/* Mission */}
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="p-8 grid md:grid-cols-2 gap-6"
                    >
                        <div className="p-6 bg-white/40 border border-white rounded-[2rem] text-left">
                            <h3 className="font-black text-slate-800 text-lg mb-2">Our Mission</h3>
                            <p className="text-xs text-slate-500 leading-relaxed">
                                To strengthen relationships through shared digital spaces that foster connection, memory-keeping, and growth.
                            </p>
                        </div>
                        <div className="p-6 bg-white/40 border border-white rounded-[2rem] text-left">
                            <h3 className="font-black text-slate-800 text-lg mb-2">Made with Love</h3>
                            <p className="text-xs text-slate-500 leading-relaxed font-italic">
                                Every line of code and every pixel is crafted with love and attention to detail, specifically for you and your partner.
                            </p>
                        </div>
                    </motion.div>
                </div>
            </div>
        </div>
    );
}
