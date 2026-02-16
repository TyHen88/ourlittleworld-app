"use client";

import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/utils/supabase/client";
import { useEffect, useCallback } from "react";

const supabase = createClient();

export function usePosts(coupleId: string | undefined) {
  const queryClient = useQueryClient();

  const query = useInfiniteQuery({
    queryKey: ["posts", coupleId],
    queryFn: async ({ pageParam = 0 }) => {
      console.log(`Fetching posts for couple ${coupleId}, page ${pageParam}...`);
      if (!coupleId) return { data: [], nextCursor: null };

      const pageSize = 10;
      const { data, error } = await supabase
        .from("posts")
        .select(`
          *,
          author:profiles(id, full_name, avatar_url)
        `)
        .eq("couple_id", coupleId)
        .order("created_at", { ascending: false })
        .range(pageParam * pageSize, (pageParam + 1) * pageSize - 1);

      if (error) {
        console.error("Fetch error:", error);
        throw error;
      }

      console.log(`Fetched ${data?.length || 0} posts.`);
      return {
        data: data || [],
        nextCursor: data.length === pageSize ? pageParam + 1 : null,
      };
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: 0,
    enabled: !!coupleId,
    staleTime: 1000 * 5, // 5 seconds stale time for "fresh" feel
  });

  // Realtime subscription
  useEffect(() => {
    if (!coupleId) return;

    const channel = supabase
      .channel(`posts-realtime-${coupleId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "posts",
          filter: `couple_id=eq.${coupleId}`,
        },
        async (payload) => {
          if (payload.eventType === "INSERT") {
            const { data: newPost, error } = await supabase
              .from("posts")
              .select(`
                *,
                author:profiles(id, full_name, avatar_url)
              `)
              .eq("id", payload.new.id)
              .single();

            if (!error && newPost) {
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
              
              // Also invalidate just to be safe and ensure everything is fresh
              queryClient.invalidateQueries({ queryKey: ["posts", coupleId] });
            }
          } else if (payload.eventType === "UPDATE") {
            // Specifically for likes/comments/metadata updates
             queryClient.invalidateQueries({ queryKey: ["posts", coupleId] });
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
        console.log(`Supabase Realtime Status (Posts): ${status}`);
        if (status === 'CHANNEL_ERROR') {
          console.error("Failed to connect to Supabase Realtime for posts. Check if 'posts' table has Realtime enabled in Supabase dashboard.");
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [coupleId, queryClient]);

  return query;
}
