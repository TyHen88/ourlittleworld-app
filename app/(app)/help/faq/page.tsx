"use client";

import { motion } from "framer-motion";
import { ChevronDown, HelpCircle, MessageCircle, Sparkles } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { AppBackButton } from "@/components/navigation/AppBackButton";

const FAQS = [
    {
        question: "How do I invite my partner?",
        answer: "Go to Settings > Couple. You'll find a secret invite code there. Share it with your partner, and they can enter it during onboarding or in their settings to connect your worlds."
    },
    {
        question: "Is our data private?",
        answer: "Absolutely. 'Our Little World' is designed specifically for couples. Your posts, photos, and messages are only visible to you and your connected partner."
    },
    {
        question: "How do we track our anniversary?",
        answer: "Once you connect, you can set your 'Together Since' date in the Couple Settings. We'll automatically calculate how many days you've been together and show it on your dashboard."
    },
    {
        question: "Can I use the app for a long-distance relationship?",
        answer: "Yes! The app is perfect for staying connected no matter the distance. You can share memories, post updates, and see each other's status in real-time."
    },
    {
        question: "How do I change my profile theme?",
        answer: "You can customize your experience in Settings > Preferences. Choose from our curated color palettes to match your mood."
    }
];

export default function FAQPage() {
    return (
        <div className="min-h-[100dvh] bg-gradient-to-br from-romantic-warm via-white to-romantic-blush/20 p-6 pb-32">
            <div className="max-w-2xl mx-auto space-y-8">
                {/* Header */}
                <header className="flex items-center gap-4">
                    <AppBackButton
                        fallbackHref="/settings"
                    />
                    <div>
                        <h1 className="text-3xl font-black text-slate-800 flex items-center gap-2">
                            <HelpCircle className="text-pink-600" size={28} />
                            FAQ
                        </h1>
                        <p className="text-sm text-slate-500 mt-0.5">Common questions about Our Little World</p>
                    </div>
                </header>

                {/* FAQ List */}
                <div className="space-y-4">
                    {FAQS.map((faq, index) => (
                        <FAQItem key={index} faq={faq} index={index} />
                    ))}
                </div>

                {/* Still Need Help? */}
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="p-6 bg-pink-600 rounded-[2rem] text-white shadow-xl shadow-pink-200 relative overflow-hidden group"
                >
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                        <MessageCircle size={100} />
                    </div>
                    <div className="relative z-10 space-y-4">
                        <h3 className="text-xl font-bold flex items-center gap-2">
                            <Sparkles size={20} />
                            Still have questions?
                        </h3>
                        <p className="text-pink-100 text-sm max-w-[280px]">
                            We&apos;re here to help! Send us a message and we&apos;ll get back to you as soon as possible.
                        </p>
                        <Link 
                            href="/help/contact"
                            className="inline-flex items-center justify-center px-6 py-3 bg-white text-pink-600 font-bold rounded-2xl hover:bg-pink-50 transition-colors shadow-sm"
                        >
                            Contact Support
                        </Link>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}

function FAQItem({ faq, index }: { faq: typeof FAQS[0], index: number }) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className="group"
        >
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "w-full text-left p-6 rounded-3xl transition-all border outline-none",
                    isOpen 
                        ? "bg-white border-pink-100 shadow-md ring-4 ring-pink-50" 
                        : "bg-white/50 border-slate-100 hover:border-pink-200 hover:bg-white"
                )}
            >
                <div className="flex items-center justify-between gap-4">
                    <span className={cn(
                        "font-bold transition-colors",
                        isOpen ? "text-pink-600" : "text-slate-800"
                    )}>
                        {faq.question}
                    </span>
                    <ChevronDown 
                        size={20} 
                        className={cn(
                            "text-slate-400 transition-transform duration-300",
                            isOpen && "rotate-180 text-pink-600"
                        )} 
                    />
                </div>
                {isOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        className="overflow-hidden"
                    >
                        <p className="mt-4 text-sm text-slate-500 leading-relaxed border-t border-slate-50 pt-4">
                            {faq.answer}
                        </p>
                    </motion.div>
                )}
            </button>
        </motion.div>
    );
}
