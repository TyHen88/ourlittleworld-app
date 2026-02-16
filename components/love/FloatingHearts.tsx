"use client";
import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart } from "lucide-react";

export function FloatingHearts() {
    const [hearts, setHearts] = useState<{ id: number; x: number; size: number; duration: number }[]>([]);

    useEffect(() => {
        const interval = setInterval(() => {
            setHearts((prev) => [
                ...prev,
                {
                    id: Date.now(),
                    x: Math.random() * 100,
                    size: Math.random() * 20 + 10,
                    duration: Math.random() * 3 + 2,
                },
            ]);

            // Keep only recent hearts
            setHearts((prev) => prev.filter(h => h.id > Date.now() - 5000));
        }, 1000);

        return () => clearInterval(interval);
    }, []);

    return (
        <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
            <AnimatePresence>
                {hearts.map((heart) => (
                    <motion.div
                        key={heart.id}
                        initial={{ y: "100vh", opacity: 0, scale: 0.5 }}
                        animate={{
                            y: "-10vh",
                            opacity: [0, 0.4, 0],
                            scale: [0.5, 1, 0.8],
                            x: `${heart.x + Math.sin(heart.id) * 10}vw`
                        }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: heart.duration, ease: "linear" }}
                        className="absolute text-romantic-petal/20"
                        style={{ left: `${heart.x}vw` }}
                    >
                        <Heart size={heart.size} fill="currentColor" />
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    );
}
