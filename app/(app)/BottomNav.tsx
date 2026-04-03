"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Home, Wallet, Settings, Heart, MessageCircleHeart, Plane } from "lucide-react";

import { useCouple } from "@/hooks/use-couple";
import { useCoupleChat } from "@/hooks/use-couple-chat";
import { cn } from "@/lib/utils";
import * as Ably from "ably";
import { getAblyRealtimeClient } from "@/lib/ably-client";
import { getCoupleChatChannelName, COUPLE_CHAT_EVENT } from "@/lib/chat";

const BASE_NAV_ITEMS = [
  { icon: Home, label: "Home", href: "/dashboard" },
  { icon: Wallet, label: "Budget", href: "/budget" },
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
  const { profile } = useCouple();
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const isSingle = profile?.user_type === "SINGLE";
  const isChatPage = pathname === "/chat";
  const coupleId = profile?.couple_id;

  // Reset unread count when visiting chat
  useEffect(() => {
    if (isChatPage) {
      setUnreadCount(0);
      if ("setAppBadge" in navigator) {
        void (navigator as any).clearAppBadge();
      }
    }
  }, [isChatPage]);

  // Listen for new messages globally
  useEffect(() => {
    if (!coupleId || !profile?.id || isChatPage) {
      return;
    }

    const client = getAblyRealtimeClient(profile.id);
    if (!client) return;

    const channelName = getCoupleChatChannelName(coupleId);
    const channel = client.channels.get(channelName);

    const handleNewMessage = (message: Ably.Message) => {
      // Only count messages from the partner
      const data = message.data as any;
      const authorId = data?.author_id || (data?.message as any)?.author_id;
      
      if (authorId && authorId !== profile.id) {
        setUnreadCount((current) => {
          const next = current + 1;
          if ("setAppBadge" in navigator) {
            void (navigator as any).setAppBadge(next);
          }
          return next;
        });
      }
    };

    void channel.subscribe(COUPLE_CHAT_EVENT, handleNewMessage);

    return () => {
      void channel.unsubscribe(COUPLE_CHAT_EVENT, handleNewMessage);
    };
  }, [coupleId, isChatPage, profile?.id]);
  const navItems = [
    BASE_NAV_ITEMS[0],
    BASE_NAV_ITEMS[1],
    isSingle
      ? { icon: Plane, label: "Trips", href: "/trips" }
      : { icon: MessageCircleHeart, label: "Chat", href: "/chat" },
    BASE_NAV_ITEMS[2],
    BASE_NAV_ITEMS[3],
  ];

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
        "fixed bottom-0 left-0 right-0 z-[100] bg-gradient-to-t from-romantic-warm via-romantic-warm/95 to-transparent p-4 pb-8 pointer-events-none transition-all duration-300",
        isKeyboardOpen && "translate-y-[calc(100%+2rem)] opacity-0"
      )}
      aria-hidden={isKeyboardOpen}
    >
      <nav className="max-w-md mx-auto h-16 bg-white/90 backdrop-blur-xl border border-romantic-blush/40 shadow-2xl rounded-full flex items-center justify-around px-2 pointer-events-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const isChat = item.label === "Chat";
          return (
            <Link 
              key={item.href} 
              href={item.href} 
              className="relative flex-1 h-full flex items-center justify-center group"
            >
              {isActive && (
                <motion.div
                  layoutId="nav-bg"
                  className="absolute inset-0 bg-romantic-blush/40 rounded-full"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
              <div
                className={cn(
                  "relative flex flex-col items-center transition-all duration-300",
                  isActive
                    ? "text-romantic-heart scale-110"
                    : "text-slate-400 hover:text-slate-600"
                )}
              >
                <item.icon size={26} strokeWidth={isActive ? 2.5 : 2} />
                
                {/* Message count badge */}
                {isChat && !isActive && unreadCount > 0 && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1.5 -right-1.5 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-romantic-heart px-1 text-[10px] font-bold text-white ring-2 ring-white"
                  >
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </motion.div>
                )}
              </div>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
