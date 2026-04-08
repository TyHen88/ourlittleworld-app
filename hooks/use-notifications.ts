"use client";

import { InfiniteData, useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { CursorPaginatedResponse } from "@/lib/pagination";

export interface AppNotificationRecord {
  id: string;
  type: string;
  title: string;
  body: string;
  detail: string | null;
  url: string;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
  updated_at: string;
  actor: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

export interface NotificationSummaryResponse {
  totalCount: number;
  unreadCount: number;
}

type NotificationPageResponse = CursorPaginatedResponse<AppNotificationRecord>;

type NotificationInfiniteData = InfiniteData<NotificationPageResponse>;

export const NOTIFICATION_QUERY_KEYS = {
  all: ["notifications"] as const,
  list: () => [...NOTIFICATION_QUERY_KEYS.all, "list"] as const,
  summary: () => [...NOTIFICATION_QUERY_KEYS.all, "summary"] as const,
};

export const NOTIFICATION_PAGE_SIZE = 10;

async function fetchNotificationPage(cursor: string | null) {
  const url = new URL("/api/notifications", window.location.origin);
  url.searchParams.set("limit", String(NOTIFICATION_PAGE_SIZE));

  if (cursor) {
    url.searchParams.set("cursor", cursor);
  }

  const res = await fetch(url.toString(), {
    method: "GET",
    cache: "no-store",
  });
  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(json?.error || "Failed to fetch notifications");
  }

  const nextCursor =
    typeof json?.pagination?.nextCursor === "string"
      ? json.pagination.nextCursor
      : json?.pagination?.nextCursor === null
        ? null
        : typeof json?.nextCursor === "string"
          ? json.nextCursor
          : null;

  return {
    data: Array.isArray(json?.data) ? (json.data as AppNotificationRecord[]) : [],
    nextCursor,
    pagination: {
      hasMore: Boolean(json?.pagination?.hasMore),
      limit:
        typeof json?.pagination?.limit === "number"
          ? json.pagination.limit
          : NOTIFICATION_PAGE_SIZE,
      nextCursor,
    },
  } satisfies NotificationPageResponse;
}

function markNotificationAsReadInCache(queryClient: ReturnType<typeof useQueryClient>, notificationId: string) {
  const readAt = new Date().toISOString();

  queryClient.setQueryData<NotificationInfiniteData>(NOTIFICATION_QUERY_KEYS.list(), (old) => {
    if (!old?.pages) {
      return old;
    }

    return {
      ...old,
      pages: old.pages.map((page) => ({
        ...page,
        data: page.data.map((notification) =>
          notification.id === notificationId
            ? {
                ...notification,
                is_read: true,
                read_at: notification.read_at ?? readAt,
              }
            : notification
        ),
      })),
    };
  });
}

function markAllNotificationsAsReadInCache(queryClient: ReturnType<typeof useQueryClient>) {
  const readAt = new Date().toISOString();

  queryClient.setQueryData<NotificationInfiniteData>(NOTIFICATION_QUERY_KEYS.list(), (old) => {
    if (!old?.pages) {
      return old;
    }

    return {
      ...old,
      pages: old.pages.map((page) => ({
        ...page,
        data: page.data.map((notification) => ({
          ...notification,
          is_read: true,
          read_at: notification.read_at ?? readAt,
        })),
      })),
    };
  });
}

export function useInfiniteNotifications(enabled = true) {
  const query = useInfiniteQuery({
    queryKey: NOTIFICATION_QUERY_KEYS.list(),
    queryFn: ({ pageParam }) => fetchNotificationPage(typeof pageParam === "string" ? pageParam : null),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    staleTime: 30 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchInterval: 15 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    retry: 1,
    enabled,
  });

  return {
    ...query,
    notifications: query.data?.pages.flatMap((page) => page.data) ?? [],
  };
}

export function useNotificationSummary(enabled = true) {
  return useQuery({
    queryKey: NOTIFICATION_QUERY_KEYS.summary(),
    queryFn: async () => {
      const res = await fetch("/api/notifications/summary", {
        method: "GET",
        cache: "no-store",
      });
      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(json?.error || "Failed to fetch notification summary");
      }

      return {
        totalCount: typeof json?.totalCount === "number" ? json.totalCount : 0,
        unreadCount: typeof json?.unreadCount === "number" ? json.unreadCount : 0,
      } satisfies NotificationSummaryResponse;
    },
    staleTime: 15 * 1000,
    refetchInterval: 15 * 1000,
    refetchOnWindowFocus: true,
    enabled,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const res = await fetch(`/api/notifications/${notificationId}`, {
        method: "PATCH",
      });
      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(json?.error || "Failed to mark notification as read");
      }

      return json?.data as AppNotificationRecord;
    },
    onSuccess: (notification) => {
      markNotificationAsReadInCache(queryClient, notification.id);
      queryClient.invalidateQueries({ queryKey: NOTIFICATION_QUERY_KEYS.summary() });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/notifications", {
        method: "PATCH",
      });
      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(json?.error || "Failed to mark all notifications as read");
      }

      return typeof json?.count === "number" ? json.count : 0;
    },
    onSuccess: () => {
      markAllNotificationsAsReadInCache(queryClient);
      queryClient.invalidateQueries({ queryKey: NOTIFICATION_QUERY_KEYS.summary() });
    },
  });
}
