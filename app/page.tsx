"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Heart } from "lucide-react";

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    // Simple simulation of authenticating/onboarding check
    const timer = setTimeout(() => {
      router.push("/register");
    }, 1500);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[100dvh] bg-gradient-love">
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{
          type: "spring",
          stiffness: 260,
          damping: 20,
          duration: 0.8
        }}
        className="text-center space-y-4"
      >
        <Heart className="text-romantic-heart mx-auto fill-romantic-heart shadow-xl" size={80} />
        <h1 className="text-3xl font-black text-slate-800 tracking-tighter">OurLittleWorld</h1>
        <div className="flex items-center justify-center gap-1">
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
            className="w-2 h-2 bg-romantic-heart rounded-full"
          />
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ repeat: Infinity, duration: 1.5, delay: 0.2 }}
            className="w-2 h-2 bg-romantic-heart rounded-full"
          />
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ repeat: Infinity, duration: 1.5, delay: 0.4 }}
            className="w-2 h-2 bg-romantic-heart rounded-full"
          />
        </div>
      </motion.div>
    </div>
  );
}
