"use client";

import React, { useEffect, useEffectEvent, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bell,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Heart,
  Home,
  Menu,
  MessageCircleHeart,
  Plane,
  Plus,
  Settings,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import * as Ably from "ably";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { getAblyRealtimeClient } from "@/lib/ably-client";
import { getCoupleChatChannelName, COUPLE_CHAT_EVENT } from "@/lib/chat";
import { useCouple } from "@/hooks/use-couple";
import { cn } from "@/lib/utils";

type NavItem = {
  description: string;
  href: string;
  icon: LucideIcon;
  label: string;
};

type NavSection = {
  items: NavItem[];
  label: string;
};

function getDisplayName(value: string | null | undefined, fallback: string) {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : fallback;
}

function getInitials(value: string | null | undefined, fallback = "OLW") {
  const normalized = value?.trim();

  if (!normalized) {
    return fallback.slice(0, 2).toUpperCase();
  }

  const parts = normalized
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("") || fallback.slice(0, 2).toUpperCase();
}

function isRouteActive(pathname: string, href: string) {
  if (href === "/dashboard") {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

function getNavSections(isSingle: boolean): NavSection[] {
  const explore: NavItem[] = [
    { href: "/dashboard", icon: Home, label: "Dashboard", description: "Overview and highlights" },
    {
      href: "/chat",
      icon: MessageCircleHeart,
      label: "Chat",
      description: isSingle ? "Connect with a partner to use chat" : "Realtime conversation",
    },
    { href: "/feed", icon: Heart, label: "Feed", description: "Shared posts and memories" },
  ];

  return [
    { label: "Explore", items: explore },
    {
      label: "Plan",
      items: [
        { href: "/budget", icon: Wallet, label: "Budget", description: "Money and balances" },
        { href: "/calendar", icon: Calendar, label: "Calendar", description: "Dates and activity" },
        { href: "/reminders", icon: Bell, label: "Reminders", description: "Alerts and tasks" },
        { href: "/trips", icon: Plane, label: "Trips", description: "Plans and getaways" },
      ],
    },
    {
      label: "Account",
      items: [{ href: "/settings", icon: Settings, label: "Settings", description: "Profile and preferences" }],
    },
  ];
}

function SidebarContent({
  onNavigate,
  pathname,
  unreadCount,
}: {
  onNavigate?: () => void;
  pathname: string;
  unreadCount: number;
}) {
  const { user, profile, couple, daysTogether } = useCouple();
  const isSingle = profile?.user_type === "SINGLE";
  const navSections = useMemo(() => getNavSections(isSingle), [isSingle]);
  const partner = couple?.members?.find((member) => member.id !== profile?.id);
  const worldName = isSingle
    ? getDisplayName(profile?.full_name, "Personal Sanctuary")
    : getDisplayName(couple?.couple_name, "Our Little World");
  const subtitle = isSingle
    ? "A calm place to track your days."
    : daysTogether > 0
      ? `Day ${daysTogether.toLocaleString()} together`
      : "Keep your world in sync.";
  const userName = getDisplayName(profile?.full_name, user?.name ?? "Explorer");
  const asideTone = isSingle
    ? {
        badge: "bg-emerald-50 text-emerald-700",
        icon: "bg-emerald-100 text-emerald-700",
        activeBorder: "border-emerald-200",
        activeIcon: "bg-emerald-500 text-white",
        activeSurface: "bg-emerald-50/90",
        activeText: "text-slate-900",
        inactiveHover: "group-hover:text-emerald-700",
        cta: "border-emerald-200 text-emerald-700 hover:bg-emerald-50",
      }
    : {
        badge: "bg-romantic-blush/45 text-romantic-heart",
        icon: "bg-romantic-blush/45 text-romantic-heart",
        activeBorder: "border-romantic-blush/80",
        activeIcon: "bg-romantic-heart text-white",
        activeSurface: "bg-romantic-blush/35",
        activeText: "text-slate-900",
        inactiveHover: "group-hover:text-romantic-heart",
        cta: "border-romantic-blush/80 text-romantic-heart hover:bg-romantic-blush/20",
      };

  return (
    <div className="flex h-full flex-col">
      <div className="mb-4 border-b border-slate-200/80 px-1 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex -space-x-3">
            <Avatar className="size-11 ring-2 ring-white">
              <AvatarImage src={profile?.avatar_url ?? undefined} />
              <AvatarFallback className="bg-slate-200 font-black text-slate-700">
                {getInitials(profile?.full_name, "You")}
              </AvatarFallback>
            </Avatar>

            {!isSingle ? (
              <Avatar className="size-11 ring-2 ring-white">
                <AvatarImage src={partner?.avatar_url ?? undefined} />
                <AvatarFallback className="bg-slate-100 font-black text-slate-600">
                  {getInitials(partner?.full_name, "Us")}
                </AvatarFallback>
              </Avatar>
            ) : null}
          </div>

          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-center gap-2">
              <span className={cn("inline-flex rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.2em]", asideTone.badge)}>
                {isSingle ? "Personal" : "Shared"}
              </span>
            </div>
            <p className="truncate text-sm font-black text-slate-900">{worldName}</p>
            <p className="truncate text-xs font-medium text-slate-500">
              {isSingle ? userName : subtitle}
            </p>
          </div>

          <div className={cn("flex size-10 shrink-0 items-center justify-center rounded-[1rem]", asideTone.icon)}>
            <Menu size={16} />
          </div>
        </div>
      </div>

      <div data-scroll-region="true" className="flex-1 space-y-5 overflow-y-auto pr-1">
        {navSections.map((section) => (
          <div key={section.label}>
            <p className="mb-2 px-2 text-[10px] font-black uppercase tracking-[0.28em] text-slate-400">
              {section.label}
            </p>

            <div className="space-y-1.5">
              {section.items.map((item) => {
                const active = isRouteActive(pathname, item.href);
                const showUnread = item.href === "/chat" && unreadCount > 0 && pathname !== "/chat";

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavigate}
                    className="group block"
                  >
                    <div
                      className={cn(
                        "relative flex items-center gap-3 rounded-[1.4rem] border px-3 py-3 transition-all duration-200",
                        active
                          ? cn("shadow-sm", asideTone.activeBorder, asideTone.activeSurface)
                          : "border-transparent bg-transparent text-slate-500 hover:border-white/70 hover:bg-white/75",
                      )}
                    >
                      <div
                        className={cn(
                          "relative flex size-11 shrink-0 items-center justify-center rounded-[1rem] transition-colors",
                          active ? asideTone.activeIcon : "bg-slate-100 text-slate-500 group-hover:bg-white",
                        )}
                      >
                        <item.icon size={18} />
                        {showUnread ? (
                          <span className="absolute -right-1 -top-1 inline-flex min-w-[1.2rem] items-center justify-center rounded-full bg-slate-950 px-1 py-0.5 text-[10px] font-black text-white ring-2 ring-white/80">
                            {unreadCount > 99 ? "99+" : unreadCount}
                          </span>
                        ) : null}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className={cn("truncate text-sm font-black", active ? asideTone.activeText : cn("text-slate-800", asideTone.inactiveHover))}>
                          {item.label}
                        </p>
                        <p className="truncate text-xs font-medium text-slate-400">
                          {item.description}
                        </p>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-5 border-t border-slate-200/80 pt-4">
        <Button
          asChild
          variant="outline"
          className={cn(
            "h-11 w-full rounded-[1.25rem] bg-white/75 text-sm font-black shadow-none",
            asideTone.cta,
          )}
        >
          <Link href="/create-post" onClick={onNavigate}>
            <Plus size={16} />
            Create Memory
          </Link>
        </Button>
      </div>
    </div>
  );
}

function SidebarToggleHandle({
  className,
  direction,
  onClick,
  placement = "edge",
  unreadCount = 0,
}: {
  className?: string;
  direction: "close" | "open";
  onClick: () => void;
  placement?: "edge" | "floating";
  unreadCount?: number;
}) {
  const isCloseAction = direction === "close";
  const ChevronIcon = isCloseAction ? ChevronLeft : ChevronRight;
  const isFloating = placement === "floating";

  return (
    <motion.button
      type="button"
      aria-label={isCloseAction ? "Close sidebar" : "Show sidebar"}
      onClick={onClick}
      initial={{ opacity: 0, x: -16, scale: 0.96 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: -16, scale: 0.96 }}
      whileHover={{ x: 2, scale: 1.02 }}
      whileTap={{ scale: 0.96 }}
      transition={{ type: "spring", stiffness: 300, damping: 24 }}
      className={cn(
        isFloating
          ? "group relative inline-flex size-11 items-center justify-center rounded-full border border-white/80 bg-white text-slate-500 shadow-[0_18px_40px_rgba(15,23,42,0.18)] transition-colors hover:bg-white hover:text-slate-700"
          : "group relative inline-flex h-14 w-10 items-center justify-center overflow-hidden rounded-r-[1.25rem] border border-l-0 border-slate-200/80 bg-white/96 text-slate-500 shadow-[0_14px_32px_rgba(15,23,42,0.14)] transition-colors hover:bg-white hover:text-slate-700",
        className,
      )}
    >
      <div className={cn("absolute inset-0", isFloating ? "rounded-full bg-white" : "bg-gradient-to-b from-white to-slate-50/90")} />
      {!isFloating ? (
        <div
          className={cn(
            "absolute inset-y-2 left-0 w-[3px] rounded-r-full",
            isCloseAction ? "bg-slate-300/90" : "bg-romantic-heart/45",
          )}
        />
      ) : null}
      <motion.span
        animate={{ x: [0, isCloseAction ? -2 : 2, 0] }}
        transition={{ duration: 1.6, ease: "easeInOut", repeat: Infinity, repeatDelay: 1.2 }}
        className="relative inline-flex items-center justify-center"
      >
        <ChevronIcon size={20} strokeWidth={2.4} />
      </motion.span>

      {unreadCount > 0 ? (
        <span className="absolute right-1 top-1 inline-flex min-w-[1.05rem] items-center justify-center rounded-full bg-slate-950 px-1 py-0.5 text-[9px] font-black text-white ring-2 ring-white">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      ) : null}
    </motion.button>
  );
}

export function AppSidebar() {
  const pathname = usePathname();
  const { profile } = useCouple();
  const [unreadCount, setUnreadCount] = useState(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const isChatPage = pathname === "/chat";
  const shouldHideSidebar = pathname === "/create-post";
  const coupleId = profile?.couple_id;
  const closeSidebar = useEffectEvent(() => {
    setIsSidebarOpen(false);
  });
  const resetUnreadBadge = useEffectEvent(() => {
    setUnreadCount(0);
    if ("setAppBadge" in navigator) {
      void (navigator as { clearAppBadge?: () => Promise<void> }).clearAppBadge?.();
    }
  });

  useEffect(() => {
    if (isChatPage) {
      resetUnreadBadge();
    }
  }, [isChatPage]);

  useEffect(() => {
    closeSidebar();
  }, [pathname, shouldHideSidebar]);

  useEffect(() => {
    if (!coupleId || !profile?.id || isChatPage) {
      return;
    }

    const client = getAblyRealtimeClient(profile.id);

    if (!client) {
      return;
    }

    const channel = client.channels.get(getCoupleChatChannelName(coupleId));

    const handleNewMessage = (message: Ably.Message) => {
      const data = message.data as {
        author_id?: string;
        message?: {
          author_id?: string;
        };
      };
      const authorId = data?.author_id ?? data?.message?.author_id;

      if (!authorId || authorId === profile.id) {
        return;
      }

      setUnreadCount((current) => {
        const next = current + 1;

        if ("setAppBadge" in navigator) {
          void (navigator as { setAppBadge?: (count?: number) => Promise<void> }).setAppBadge?.(next);
        }

        return next;
      });
    };

    void channel.subscribe(COUPLE_CHAT_EVENT, handleNewMessage);

    return () => {
      void channel.unsubscribe(COUPLE_CHAT_EVENT, handleNewMessage);
    };
  }, [coupleId, isChatPage, profile?.id]);

  useEffect(() => {
    if (!isSidebarOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isSidebarOpen]);

  if (shouldHideSidebar) {
    return null;
  }

  return (
    <>
      <AnimatePresence>
        {!isSidebarOpen ? (
          <SidebarToggleHandle
            direction="open"
            unreadCount={unreadCount}
            onClick={() => setIsSidebarOpen(true)}
            className="fixed left-0 top-1/2 z-[70] -translate-y-1/2"
          />
        ) : null}

        {isSidebarOpen ? (
          <>
            <motion.button
              type="button"
              aria-label="Close sidebar"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className="fixed inset-0 z-50 bg-slate-950/20 backdrop-blur-[2px]"
            />

            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: "0%" }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 260, damping: 30 }}
              className="fixed inset-y-0 left-0 z-[60] w-[min(22rem,calc(100vw-0.75rem))] p-3 lg:w-[22rem] lg:p-5"
            >
              <div className="absolute left-full top-1/2 z-[70] -translate-y-1/2 pl-2">
                <SidebarToggleHandle
                  direction="close"
                  placement="floating"
                  onClick={() => setIsSidebarOpen(false)}
                />
              </div>

              <div className="relative h-full rounded-[2.4rem] border border-white/70 bg-white/78 p-4 shadow-[0_30px_80px_rgba(15,23,42,0.16)] backdrop-blur-2xl">
                <SidebarContent
                  pathname={pathname}
                  unreadCount={unreadCount}
                  onNavigate={() => setIsSidebarOpen(false)}
                />
              </div>
            </motion.aside>
          </>
        ) : null}
      </AnimatePresence>
    </>
  );
}
