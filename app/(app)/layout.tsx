"use client";
import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Home, Wallet, Image as ImageIcon, Heart } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
    { icon: Home, label: "Home", href: "/dashboard" },
    { icon: Wallet, label: "Budget", href: "/budget" },
    { icon: ImageIcon, label: "Feed", href: "/feed" },
    { icon: Heart, label: "Us", href: "/profile" },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();

    return (
        <div className="flex flex-col min-h-[100dvh] bg-romantic-warm">
            <div className="flex-1 pb-24">
                {children}
            </div>

            {/* Modern Bottom Navigation */}
            <div className="fixed bottom-0 left-0 right-0 p-4 pb-8 bg-gradient-to-t from-romantic-warm via-romantic-warm/95 to-transparent pointer-events-none">
                <nav className="max-w-md mx-auto h-16 bg-white/80 backdrop-blur-xl border border-romantic-blush/30 shadow-2xl rounded-full flex items-center justify-around px-6 pointer-events-auto">
                    {NAV_ITEMS.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className="relative p-2 group"
                            >
                                {isActive && (
                                    <motion.div
                                        layoutId="nav-bg"
                                        className="absolute inset-0 bg-romantic-blush/40 rounded-full"
                                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                    />
                                )}
                                <div className={cn(
                                    "relative flex flex-col items-center transition-colors duration-300",
                                    isActive ? "text-romantic-heart scale-110" : "text-slate-400 hover:text-slate-600"
                                )}>
                                    <item.icon size={24} strokeWidth={isActive ? 2.5 : 2} />
                                </div>
                            </Link>
                        );
                    })}
                </nav>
            </div>
        </div>
    );
}
