"use client";

import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";

async function fetchPostsPage(params: {
  coupleId: string;
  page: number;
  pageSize: number;
  query?: string;
}) {
  const url = new URL("/api/posts", window.location.origin);
  url.searchParams.set("coupleId", params.coupleId);
  url.searchParams.set("page", String(params.page));
  url.searchParams.set("pageSize", String(params.pageSize));
  if (params.query) url.searchParams.set("q", params.query);

  const res = await fetch(url.toString(), { method: "GET" });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json?.error || "Failed to fetch posts");
  }
  return json as { data: any[]; nextCursor: number | null };
}

export function usePosts(coupleId: string | undefined, queryStr?: string) {
  const query = useInfiniteQuery({
    queryKey: ["posts", coupleId, queryStr],
    queryFn: async ({ pageParam = 0 }) => {
      if (!coupleId) return { data: [], nextCursor: null };

      const pageSize = 10;
      const result = await fetchPostsPage({
        coupleId,
        page: Number(pageParam) || 0,
        pageSize,
        query: queryStr,
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
    refetchInterval: 10000, // Poll every 10 seconds as a simple replacement for realtime for now
  });

  return query;
}
