"use client";
import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export function TopProgressBar() {
  const [isVisible, setIsVisible] = useState(true);
  
  return (
    <div className="fixed top-0 left-0 right-0 z-[100] h-1.5 overflow-hidden">
      <motion.div
        className="h-full bg-gradient-to-r from-romantic-heart to-pink-500 rounded-r-full shadow-[0_0_10px_rgba(255,107,157,0.5)]"
        initial={{ width: "0%" }}
        animate={{ width: ["10%", "30%", "70%", "90%"] }}
        transition={{ 
          duration: 10,
          times: [0, 0.2, 0.5, 1],
          ease: "easeInOut"
        }}
      />
    </div>
  );
}
