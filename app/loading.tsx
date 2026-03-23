"use client";

import React from "react";
import { motion } from "framer-motion";

export default function Loading() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[100dvh] bg-[#FDFBF7] relative overflow-hidden">
            {/* Background Blobs consistent with Splash/Landing */}
            <div className="absolute top-[-20%] left-[-20%] w-full h-full bg-romantic-blush/20 rounded-full blur-[100px] animate-pulse" />
            <div className="absolute bottom-[-20%] right-[-20%] w-full h-full bg-romantic-lavender/20 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1s' }} />

            <div className="relative z-10 flex flex-col items-center space-y-6">
                <motion.div
                    animate={{ 
                        scale: [1, 1.05, 1],
                        rotate: [0, 2, -2, 0]
                    }}
                    transition={{ 
                        duration: 3,
                        repeat: Infinity,
                        ease: "easeInOut"
                    }}
                    className="relative"
                >
                    
                    {/* Floating Glow behind badge logo */}
                    <div className="absolute inset-0 bg-romantic-heart/5 blur-3xl rounded-full scale-150 -z-10 animate-pulse" />
                </motion.div>
                
                <div className="flex items-center gap-2">
                    {[0, 1, 2].map((i) => (
                        <motion.div
                            key={i}
                            animate={{ 
                                scale: [1, 1.5, 1],
                                opacity: [0.3, 1, 0.3]
                            }}
                            transition={{ 
                                duration: 1,
                                repeat: Infinity,
                                delay: i * 0.2
                            }}
                            className="w-2 h-2 bg-romantic-heart rounded-full"
                        />
                    ))}
                </div>
                
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
                    Preparing Our World
                </p>
            </div>
        </div>
    );
}
