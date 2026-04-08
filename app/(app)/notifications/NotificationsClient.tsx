"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { AnimatePresence, motion } from "framer-motion";
import {
  BellRing,
  Calendar,
  CheckCheck,
  ChevronDown,
  Heart,
  MessageCircleHeart,
  Plane,
  Sparkles,
  Wallet,
  type LucideIcon,
} from "lucide-react";

import { AppBackButton } from "@/components/navigation/AppBackButton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  type AppNotificationRecord,
  useInfiniteNotifications,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotificationSummary,
} from "@/hooks/use-notifications";
import { cn } from "@/lib/utils";

type NotificationsProfile = {
  user_type?: string | null;
  full_name?: string | null;
};

type NotificationsClientProps = {
  user: {
    id?: string;
    name?: string | null;
  };
  profile: NotificationsProfile | null;
};

function getNotificationMeta(type: string): {
  icon: LucideIcon;
  chipClassName: string;
  label: string;
} {
  switch (type) {
    case "PARTNER_JOINED":
      return {
        icon: Heart,
        chipClassName: "bg-pink-100 text-pink-700",
        label: "Connection",
      };
    case "CHAT_MESSAGE":
      return {
        icon: MessageCircleHeart,
        chipClassName: "bg-sky-100 text-sky-700",
        label: "Chat",
      };
    case "TRIP_CREATED":
    case "TRIP_REMINDER_DUE":
      return {
        icon: Plane,
        chipClassName: "bg-amber-100 text-amber-700",
        label: "Trip",
      };
    case "REMINDER_CREATED":
    case "CUSTOM_REMINDER_DUE":
      return {
        icon: Calendar,
        chipClassName: "bg-violet-100 text-violet-700",
        label: "Reminder",
      };
    case "BUDGET_ITEM_CREATED":
      return {
        icon: Wallet,
        chipClassName: "bg-emerald-100 text-emerald-700",
        label: "Budget",
      };
    default:
      return {
        icon: Sparkles,
        chipClassName: "bg-slate-100 text-slate-700",
        label: "Update",
      };
  }
}

function getActorLabel(notification: AppNotificationRecord) {
  const actorName = notification.actor?.full_name?.trim();
  return actorName && actorName.length > 0 ? actorName : "Our Little World";
}

function getActorInitials(notification: AppNotificationRecord) {
  const actorName = getActorLabel(notification);
  return actorName
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function NotificationsClient({ user, profile }: NotificationsClientProps) {
  const isSingle = profile?.user_type === "SINGLE";
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"unread" | "all">("all");
  const {
    notifications,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteNotifications(Boolean(user?.id));
  const { data: summary } = useNotificationSummary(Boolean(user?.id));
  const markNotificationRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  useEffect(() => {
    if (!hasNextPage || isFetchingNextPage) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          void fetchNextPage();
        }
      },
      { rootMargin: "320px" }
    );

    if (sentinelRef.current) {
      observer.observe(sentinelRef.current);
    }

    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  const tone = useMemo(
    () =>
      isSingle
        ? {
            page: "from-emerald-50 via-white to-indigo-50/30",
            tab: "border-emerald-200 bg-emerald-50 text-emerald-700",
            tabActive: "bg-emerald-600 text-white shadow-sm",
            unread: "bg-emerald-500",
            action: "border-emerald-200 text-emerald-700 hover:bg-emerald-50",
          }
        : {
            page: "from-romantic-warm via-white to-romantic-blush/30",
            tab: "border-romantic-blush/80 bg-romantic-blush/15 text-romantic-heart",
            tabActive: "bg-romantic-heart text-white shadow-sm",
            unread: "bg-romantic-heart",
            action: "border-romantic-blush/80 text-romantic-heart hover:bg-romantic-blush/20",
          },
    [isSingle]
  );

  const hasUnread = (summary?.unreadCount ?? notifications.filter((notification) => !notification.is_read).length) > 0;

  const visibleNotifications = useMemo(
    () =>
      activeTab === "unread"
        ? notifications.filter((notification) => !notification.is_read)
        : notifications,
    [activeTab, notifications]
  );

  const toggleExpanded = (notification: AppNotificationRecord) => {
    const nextExpandedId = expandedId === notification.id ? null : notification.id;
    setExpandedId(nextExpandedId);

    if (nextExpandedId === notification.id && !notification.is_read) {
      markNotificationRead.mutate(notification.id);
    }
  };

  const handleOpenNotification = (notification: AppNotificationRecord) => {
    if (!notification.is_read) {
      markNotificationRead.mutate(notification.id);
    }
  };

  return (
    <div className={cn("min-h-[100dvh] bg-gradient-to-br p-4 pb-28", tone.page)}>
      <div data-scroll-region="true" className="mx-auto flex w-full max-w-3xl flex-col gap-5">
        <motion.header
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start justify-between gap-3 pt-1"
        >
            <div className="flex items-center gap-3">
              <AppBackButton fallbackHref="/dashboard" />
              <div>
                <h1 className="flex items-center gap-2 text-xl font-black text-slate-900">
                  <BellRing className={isSingle ? "text-emerald-600" : "text-romantic-heart"} size={24} />
                  Notifications
                </h1>
              </div>
            </div>

          {hasUnread ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => markAllRead.mutate()}
              disabled={markAllRead.isPending}
              className={cn(
                "h-10 rounded-full border bg-white/85 px-4 text-sm font-bold shadow-none shrink-0",
                tone.action
              )}
            >
              <CheckCheck size={16} />
              Mark all read
            </Button>
          ) : null}
        </motion.header>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="flex items-center"
        >
          <div className="inline-flex rounded-full border border-white/80 bg-white/85 p-1 shadow-sm backdrop-blur-sm">
            <button
              type="button"
              onClick={() => setActiveTab("unread")}
              className={cn(
                "rounded-full px-4 py-2 text-sm font-bold transition-colors",
                activeTab === "unread" ? tone.tabActive : "text-slate-500 hover:text-slate-900"
              )}
            >
              Unread
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("all")}
              className={cn(
                "rounded-full px-4 py-2 text-sm font-bold transition-colors",
                activeTab === "all" ? tone.tabActive : "text-slate-500 hover:text-slate-900"
              )}
            >
              All
            </button>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="overflow-hidden rounded-[1.6rem] border border-white/80 bg-white/88 shadow-sm backdrop-blur-sm"
        >
          {isLoading ? (
            Array.from({ length: 3 }).map((_, index) => (
              <div
                key={`notification-skeleton-${index}`}
                className={cn(
                  "animate-pulse px-4 py-4",
                  index < 2 && "border-b border-slate-200/70"
                )}
              >
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="size-10 rounded-full bg-slate-200" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3.5 w-36 rounded-full bg-slate-200" />
                      <div className="h-3 w-28 rounded-full bg-slate-100" />
                    </div>
                  </div>
                  <div className="h-4 rounded-full bg-slate-100" />
                  <div className="h-4 w-4/5 rounded-full bg-slate-100" />
                </div>
              </div>
            ))
          ) : visibleNotifications.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                <BellRing size={28} />
              </div>
              <h2 className="mt-4 text-lg font-black text-slate-900">
                {activeTab === "unread" ? "All caught up" : "No notifications yet"}
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                {activeTab === "unread"
                  ? "New unread updates will show here when they arrive."
                  : "New activity from your world will appear here as it happens."}
              </p>
            </div>
          ) : (
            visibleNotifications.map((notification, index) => {
              const meta = getNotificationMeta(notification.type);
              const Icon = meta.icon;
              const expanded = expandedId === notification.id;

              return (
                <motion.div
                  key={notification.id}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className={cn(index < visibleNotifications.length - 1 && "border-b border-slate-200/70")}
                >
                  <div data-pan-y="true" className={cn("overflow-hidden bg-white/20 transition-colors", expanded && "bg-slate-50/70")}>
                    <button
                      type="button"
                      onClick={() => toggleExpanded(notification)}
                      className="w-full px-4 py-3.5 text-left"
                    >
                      <div className="flex items-start gap-3">
                        <div className="relative">
                          <Avatar className="size-10 border border-white shadow-sm">
                            <AvatarImage src={notification.actor?.avatar_url ?? undefined} />
                            <AvatarFallback className="bg-slate-100 font-black text-slate-700">
                              {getActorInitials(notification)}
                            </AvatarFallback>
                          </Avatar>
                          {!notification.is_read ? (
                            <span className={cn("absolute -right-0.5 top-0 inline-flex size-3 rounded-full ring-2 ring-white", tone.unread)} />
                          ) : null}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span
                                  className={cn(
                                    "inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-black uppercase tracking-[0.16em]",
                                    meta.chipClassName
                                  )}
                                >
                                  <Icon size={12} />
                                  {meta.label}
                                </span>
                                <span className="text-xs font-semibold text-slate-400">
                                  {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                                </span>
                              </div>

                              <p className="mt-2 text-sm font-bold leading-5 text-slate-900">
                                {notification.title}
                              </p>
                              <p className="mt-1 text-sm leading-5 text-slate-600">{notification.body}</p>
                            </div>

                            <ChevronDown
                              size={18}
                              className={cn(
                                "mt-1 shrink-0 text-slate-400 transition-transform",
                                expanded && "rotate-180"
                              )}
                            />
                          </div>
                        </div>
                      </div>
                    </button>

                    <AnimatePresence initial={false}>
                      {expanded ? (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2, ease: "easeOut" }}
                          className="overflow-hidden border-t border-slate-100"
                        >
                          <div className="space-y-3 px-4 py-3.5">
                            <div className="rounded-2xl bg-slate-50/90 p-3.5">
                              <p className="text-sm leading-6 text-slate-700">
                                {notification.detail || notification.body}
                              </p>
                            </div>

                            <div className="flex items-center justify-between gap-3">
                              <p className="text-xs font-semibold text-slate-400">
                                {notification.is_read ? "Seen" : "Unread"} notification
                              </p>
                              <Button asChild className="h-8 rounded-full px-3 text-xs font-bold bg-slate-900 text-white hover:bg-slate-800">
                                <Link href={notification.url} onClick={() => handleOpenNotification(notification)}>
                                  View
                                </Link>
                              </Button>
                            </div>
                          </div>
                        </motion.div>
                      ) : null}
                    </AnimatePresence>
                  </div>
                </motion.div>
              );
            })
          )}
        </motion.div>

        <div ref={sentinelRef} className="h-8" />

        {isFetchingNextPage ? (
          <div className="pb-4 text-center text-sm font-medium text-slate-400">Loading more notifications...</div>
        ) : null}
      </div>
    </div>
  );
}
