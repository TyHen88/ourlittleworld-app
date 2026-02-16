"use client";
import { motion } from "framer-motion";
import { Flower2, Sparkles, Heart, Star } from "lucide-react";

const FloatingElement = ({ children, delay = 0, duration = 3 }: any) => (
    <motion.div
        animate={{
            y: [0, -20, 0],
            rotate: [0, 5, -5, 0],
        }}
        transition={{
            duration,
            repeat: Infinity,
            delay,
            ease: "easeInOut"
        }}
    >
        {children}
    </motion.div>
);

export function KawaiiDecorations() {
    return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <FloatingElement delay={0} duration={4}>
                <Flower2 className="absolute top-20 left-10 text-pink-300/40" size={40} />
            </FloatingElement>
            <FloatingElement delay={1} duration={5}>
                <Sparkles className="absolute top-40 right-20 text-purple-300/40" size={32} />
            </FloatingElement>
            <FloatingElement delay={2} duration={3.5}>
                <Heart className="absolute bottom-40 left-20 text-rose-300/40 fill-rose-300/40" size={28} />
            </FloatingElement>
            <FloatingElement delay={1.5} duration={4.5}>
                <Star className="absolute top-60 right-10 text-yellow-300/40 fill-yellow-300/40" size={24} />
            </FloatingElement>
        </div>
    );
}
