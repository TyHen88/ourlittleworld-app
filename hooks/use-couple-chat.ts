"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import type { CoupleChatMessage } from "@/lib/chat";
import type { CursorPaginatedResponse } from "@/lib/pagination";

type CoupleChatResponse = CursorPaginatedResponse<CoupleChatMessage>;

async function fetchCoupleChat(coupleId: string, cursor: string | null) {
  const url = new URL("/api/chat/messages", window.location.origin);
  url.searchParams.set("coupleId", coupleId);
  if (cursor) {
    url.searchParams.set("cursor", cursor);
  }

  const res = await fetch(url.toString(), {
    method: "GET",
    cache: "no-store",
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json?.error || "Failed to load chat");
  }

  return {
    data: Array.isArray(json?.data) ? (json.data as CoupleChatMessage[]) : [],
    nextCursor:
      typeof json?.pagination?.nextCursor === "string"
        ? json.pagination.nextCursor
        : json?.pagination?.nextCursor === null
          ? null
          : typeof json?.nextCursor === "string"
            ? json.nextCursor
            : null,
    pagination: {
      hasMore: Boolean(json?.pagination?.hasMore),
      limit:
        typeof json?.pagination?.limit === "number"
          ? json.pagination.limit
          : 80,
      nextCursor:
        typeof json?.pagination?.nextCursor === "string"
          ? json.pagination.nextCursor
          : json?.pagination?.nextCursor === null
            ? null
            : typeof json?.nextCursor === "string"
              ? json.nextCursor
              : null,
    },
  } satisfies CoupleChatResponse;
}

export function useCoupleChat(coupleId: string | undefined) {
  return useInfiniteQuery({
    queryKey: ["couple-chat", coupleId],
    queryFn: ({ pageParam }) =>
      fetchCoupleChat(coupleId as string, typeof pageParam === "string" ? pageParam : null),
    enabled: !!coupleId,
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    staleTime: 30_000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}
