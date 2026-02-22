"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Download, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [isInstallable, setIsInstallable] = useState(false);

    useEffect(() => {
        const handler = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e);
            setIsInstallable(true);
        };

        window.addEventListener("beforeinstallprompt", handler);

        return () => {
            window.removeEventListener("beforeinstallprompt", handler);
        };
    }, []);

    const handleInstallClick = async () => {
        if (!deferredPrompt) {
            alert("To install this app:\n\niOS: Tap the Share button and select 'Add to Home Screen'\n\nAndroid: Tap the menu (⋮) and select 'Add to Home Screen' or 'Install App'");
            return;
        }

        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;

        if (outcome === "accepted") {
            setDeferredPrompt(null);
            setIsInstallable(false);
        }
    };


    return (
        <div className="h-screen bg-gradient-to-br from-romantic-blush/30 via-white to-romantic-lavender/30 overflow-hidden flex flex-col">
            {/* Decorative Background Elements */}
            <div className="absolute top-20 left-10 w-72 h-72 bg-romantic-heart/10 rounded-full blur-3xl animate-pulse" />
            <div className="absolute bottom-20 right-10 w-96 h-96 bg-romantic-lavender/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />

            <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6">
                {/* Hero Section */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2 }}
                    className="text-center max-w-2xl"
                >
                    <div className="inline-flex items-center gap-2 bg-romantic-blush/30 px-4 py-2 rounded-full mb-6">
                        <span className="text-romantic-heart">❤️</span>
                        <span className="text-sm font-bold text-romantic-heart">Your Relationship, Beautifully Organized</span>
                    </div>

                    <h2 className="text-4xl md:text-6xl font-black text-slate-800 mb-4 leading-tight">
                        Love Made
                        <span className="block bg-gradient-to-r from-romantic-heart to-romantic-lavender bg-clip-text text-transparent">
                            Simple & Sweet
                        </span>
                    </h2>

                    <p className="text-lg text-slate-600 max-w-xl mx-auto mb-8">
                        Track your journey together, manage shared finances, and cherish every moment.
                    </p>
                </motion.div>
            </div>

            {/* Bottom Buttons */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="relative z-10 pb-12 px-6 flex flex-col items-center gap-3"
            >
                <div className="flex flex-col sm:flex-row gap-2 w-full max-w-md">
                    <Button
                        onClick={handleInstallClick}
                        className="rounded-full bg-gradient-button shadow-lg text-sm px-6 py-3 group flex-1"
                    >
                        <Download className="mr-2 group-hover:animate-bounce" size={16} />
                        {isInstallable ? "Install App" : "Add to Home Screen"}
                        <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" size={14} />
                    </Button>

                    <Button
                        onClick={() => window.location.href = "/register"}
                        variant="outline"
                        className="rounded-full border-2 border-romantic-heart text-romantic-heart hover:bg-romantic-blush/20 text-sm px-6 py-3 flex-1"
                    >
                        Get Started
                    </Button>
                </div>

                <Button
                    variant="ghost"
                    onClick={() => window.location.href = "/login"}
                    className="text-slate-600 hover:text-romantic-heart text-sm"
                >
                    Already have an account? Log in
                </Button>
            </motion.div>
        </div>
    );
}
