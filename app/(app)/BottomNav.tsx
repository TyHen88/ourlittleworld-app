"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Home, Wallet, Settings, Heart, MessageCircleHeart } from "lucide-react";

import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { icon: Home, label: "Home", href: "/dashboard" },
  { icon: Wallet, label: "Budget", href: "/budget" },
  { icon: MessageCircleHeart, label: "Chat", href: "/chat" },
  { icon: Heart, label: "Feed", href: "/feed" },
  { icon: Settings, label: "Settings", href: "/settings" },
];

function isEditableElement(element: Element | null) {
  if (!(element instanceof HTMLElement)) {
    return false;
  }

  const tagName = element.tagName;

  return (
    element.isContentEditable ||
    tagName === "INPUT" ||
    tagName === "TEXTAREA" ||
    tagName === "SELECT" ||
    element.getAttribute("role") === "textbox"
  );
}

function isMobileKeyboardOpen() {
  if (typeof window === "undefined") {
    return false;
  }

  const isSmallTouchScreen =
    window.innerWidth < 1024 &&
    window.matchMedia("(hover: none) and (pointer: coarse)").matches;

  if (!isSmallTouchScreen) {
    return false;
  }

  const viewport = window.visualViewport;
  const activeEditable = isEditableElement(document.activeElement);
  const viewportCompressed =
    !!viewport && viewport.height < window.innerHeight - 140;

  return activeEditable && viewportCompressed;
}

export function BottomNav() {
  const pathname = usePathname();
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

  useEffect(() => {
    const updateKeyboardState = () => {
      setIsKeyboardOpen(isMobileKeyboardOpen());
    };

    updateKeyboardState();

    const viewport = window.visualViewport;
    viewport?.addEventListener("resize", updateKeyboardState);
    viewport?.addEventListener("scroll", updateKeyboardState);
    window.addEventListener("resize", updateKeyboardState);
    document.addEventListener("focusin", updateKeyboardState);
    document.addEventListener("focusout", updateKeyboardState);

    return () => {
      viewport?.removeEventListener("resize", updateKeyboardState);
      viewport?.removeEventListener("scroll", updateKeyboardState);
      window.removeEventListener("resize", updateKeyboardState);
      document.removeEventListener("focusin", updateKeyboardState);
      document.removeEventListener("focusout", updateKeyboardState);
    };
  }, []);

  if (pathname === "/create-post") {
    return null;
  }

  return (
    <div
      className={cn(
        "fixed bottom-0 left-0 right-0 bg-gradient-to-t from-romantic-warm via-romantic-warm/95 to-transparent p-4 pb-8 pointer-events-none transition-all duration-200",
        isKeyboardOpen && "pointer-events-none translate-y-[calc(100%+2rem)] opacity-0"
      )}
      aria-hidden={isKeyboardOpen}
    >
      <nav className="max-w-md mx-auto h-16 bg-white/80 backdrop-blur-xl border border-romantic-blush/30 shadow-2xl rounded-full flex items-center justify-around px-6 pointer-events-auto">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link key={item.href} href={item.href} className="relative p-2 group">
              {isActive && (
                <motion.div
                  layoutId="nav-bg"
                  className="absolute inset-0 bg-romantic-blush/40 rounded-full"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
              <div
                className={cn(
                  "relative flex flex-col items-center transition-colors duration-300",
                  isActive
                    ? "text-romantic-heart scale-110"
                    : "text-slate-400 hover:text-slate-600"
                )}
              >
                <item.icon size={24} strokeWidth={isActive ? 2.5 : 2} />
              </div>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
