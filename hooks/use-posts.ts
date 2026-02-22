"use client";

import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/utils/supabase/client";
import { useEffect, useRef, useState } from "react";

const supabase = createClient();

async function fetchPostsPage(params: {
  coupleId: string;
  page: number;
  pageSize: number;
}) {
  const url = new URL("/api/posts", window.location.origin);
  url.searchParams.set("coupleId", params.coupleId);
  url.searchParams.set("page", String(params.page));
  url.searchParams.set("pageSize", String(params.pageSize));

  const res = await fetch(url.toString(), { method: "GET" });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json?.error || "Failed to fetch posts");
  }
  return json as { data: any[]; nextCursor: number | null };
}

async function fetchPostById(id: string) {
  const url = new URL(`/api/posts/${id}`, window.location.origin);
  const res = await fetch(url.toString(), { method: "GET" });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json?.error || "Failed to fetch post");
  }
  return json as { data: any };
}

export function usePosts(coupleId: string | undefined) {
  const queryClient = useQueryClient();
  const [realtimeStatus, setRealtimeStatus] = useState<'connected' | 'disconnected' | 'error'>('disconnected');
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const query = useInfiniteQuery({
    queryKey: ["posts", coupleId],
    queryFn: async ({ pageParam = 0 }) => {
      if (!coupleId) return { data: [], nextCursor: null };

      const pageSize = 10;
      const result = await fetchPostsPage({
        coupleId,
        page: Number(pageParam) || 0,
        pageSize,
      });

      return {
        data: Array.isArray(result.data) ? result.data : [],
        nextCursor: result.nextCursor ?? null,
      };
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: 0,
    enabled: !!coupleId,
    staleTime: 1000 * 5, // 5 seconds stale time for "fresh" feel
  });

  // Realtime subscription with reconnection
  useEffect(() => {
    if (!coupleId) return;

    let channel: ReturnType<typeof supabase.channel>;
    let isSubscribed = true;

    const setupChannel = () => {
      if (!isSubscribed) return;

      channel = supabase
        .channel(`posts-realtime-${coupleId}`, {
          config: {
            broadcast: { self: false },
            presence: { key: '' },
          },
        })
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "posts",
            filter: `couple_id=eq.${coupleId}`,
          },
          async (payload) => {
            if (!isSubscribed) return;
            if (payload.eventType === "INSERT") {
              const nextId = payload?.new?.id;
              if (!nextId) return;

              let newPost: any = null;
              try {
                const fetched = await fetchPostById(nextId);
                newPost = fetched?.data ?? null;
              } catch {
                return;
              }

              if (newPost) {
                queryClient.setQueryData(["posts", coupleId], (old: any) => {
                  if (!old) return old;
                  // Add new post to the very beginning of the first page
                  return {
                    ...old,
                    pages: old.pages.map((page: any, idx: number) => {
                      if (idx === 0) {
                        return {
                          ...page,
                          data: [newPost, ...page.data],
                        };
                      }
                      return page;
                    }),
                  };
                });
              }
            } else if (payload.eventType === "UPDATE") {
              const nextRow = payload?.new;
              const nextId = nextRow?.id;
              if (!nextId) return;

              queryClient.setQueryData(["posts", coupleId], (old: any) => {
                if (!old?.pages) return old;
                return {
                  ...old,
                  pages: old.pages.map((page: any) => {
                    const nextData = Array.isArray(page?.data)
                      ? page.data.map((row: any) => {
                        if (row?.id !== nextId) return row;
                        return {
                          ...row,
                          ...nextRow,
                          author: row?.author,
                        };
                      })
                      : page?.data;

                    return {
                      ...page,
                      data: nextData,
                    };
                  }),
                };
              });
            } else if (payload.eventType === "DELETE") {
              queryClient.setQueryData(["posts", coupleId], (old: any) => {
                if (!old) return old;
                return {
                  ...old,
                  pages: old.pages.map((page: any) => ({
                    ...page,
                    data: page.data.filter((p: any) => p.id !== payload.old.id),
                  })),
                };
              });
            }
          }
        )
        .subscribe((status) => {
          if (!isSubscribed) return;

          if (status === 'SUBSCRIBED') {
            setRealtimeStatus('connected');
            if (reconnectTimeoutRef.current) {
              clearTimeout(reconnectTimeoutRef.current);
              reconnectTimeoutRef.current = null;
            }
          } else if (status === 'CHANNEL_ERROR') {
            setRealtimeStatus('error');
            console.error("Realtime connection error. Attempting reconnect...");

            reconnectTimeoutRef.current = setTimeout(() => {
              if (isSubscribed) {
                supabase.removeChannel(channel);
                setupChannel();
              }
            }, 3000);
          } else if (status === 'CLOSED') {
            setRealtimeStatus('disconnected');
          }
        });
    };

    setupChannel();

    return () => {
      isSubscribed = false;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [coupleId, queryClient]);

  return query;
}
