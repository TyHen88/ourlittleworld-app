"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { AIAdvisorChat } from "@/components/ai/AIAdvisorChat";

export function AIFloatingAdvisor({ isSingle }: { isSingle: boolean }) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen || typeof document === "undefined") {
      return;
    }

    const { body, documentElement } = document;
    const scrollY = window.scrollY;
    const previousBodyStyles = {
      overflow: body.style.overflow,
      position: body.style.position,
      top: body.style.top,
      width: body.style.width,
    };
    const previousHtmlOverflow = documentElement.style.overflow;

    documentElement.style.overflow = "hidden";
    body.style.overflow = "hidden";
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.width = "100%";

    return () => {
      documentElement.style.overflow = previousHtmlOverflow;
      body.style.overflow = previousBodyStyles.overflow;
      body.style.position = previousBodyStyles.position;
      body.style.top = previousBodyStyles.top;
      body.style.width = previousBodyStyles.width;
      window.scrollTo(0, scrollY);
    };
  }, [isOpen]);

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
            className="fixed inset-0 z-[100] bg-slate-950/28 backdrop-blur-[3px]"
          />
        )}
      </AnimatePresence>

      {/* Bottom Sheet Chat */}
      <AnimatePresence>
        {isOpen && (
          <div className="pointer-events-none fixed inset-0 z-[101] flex items-end justify-center pt-[max(0.75rem,env(safe-area-inset-top))] sm:items-center sm:px-4 sm:py-4">
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="flex w-full justify-center pointer-events-auto"
            >
              <AIAdvisorChat isSingle={isSingle} variant="sheet" onClose={() => setIsOpen(false)} />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Main Floating Trigger Button */}
      <div className="fixed bottom-24 right-5 z-[90] sm:right-6">
        <motion.button
          whileHover={{ scale: 1.1, rotate: 5 }}
          whileTap={{ scale: 0.9 }}
          data-pan-y="true"
          onClick={() => setIsOpen(!isOpen)}
          aria-label={isOpen ? "Close AI advisor" : "Open AI advisor"}
          title="Open AI advisor"
          className={cn(
            "flex h-[3.3rem] w-[3.3rem] items-center justify-center rounded-full border-[3px] border-white text-white shadow-[0_18px_38px_rgba(15,23,42,0.2)] transition-all transform sm:h-14 sm:w-14",
            isSingle 
              ? "bg-gradient-to-br from-emerald-500 to-teal-600 shadow-emerald-500/25" 
              : "bg-gradient-to-br from-indigo-500 to-purple-700 shadow-indigo-500/25",
            isOpen ? "rotate-90 scale-0 opacity-0" : "scale-100 opacity-100"
          )}
        >
          <Sparkles className="fill-white text-white" size={22} />
        </motion.button>
      </div>
    </>
  );
}
