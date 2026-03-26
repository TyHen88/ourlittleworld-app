"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { AIAdvisorChat } from "@/components/ai/AIAdvisorChat";

export function AIFloatingAdvisor({ isSingle }: { isSingle: boolean }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-[100]"
          />
        )}
      </AnimatePresence>

      {/* Bottom Sheet Chat */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[101] flex items-end justify-center pointer-events-none">
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="w-full pointer-events-auto flex justify-center px-0"
            >
              <AIAdvisorChat isSingle={isSingle} variant="sheet" onClose={() => setIsOpen(false)} />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Main Floating Trigger Button */}
      <div className="fixed bottom-24 right-6 z-[90]">
        <motion.button
          whileHover={{ scale: 1.1, rotate: 5 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "w-16 h-16 rounded-full shadow-2xl flex items-center justify-center border-4 border-white transition-all transform",
            isSingle 
              ? "bg-gradient-to-br from-emerald-500 to-teal-600 shadow-emerald-500/30" 
              : "bg-gradient-to-br from-indigo-500 to-purple-700 shadow-indigo-500/30",
            isOpen ? "rotate-90 scale-0 opacity-0" : "scale-100 opacity-100"
          )}
        >
          <Sparkles className="text-white fill-white" size={30} />
        </motion.button>
      </div>
    </>
  );
}
