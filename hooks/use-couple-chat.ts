"use client";

import { useQuery } from "@tanstack/react-query";
import type { CoupleChatMessage } from "@/lib/chat";

async function fetchCoupleChat(coupleId: string) {
  const url = new URL("/api/chat/messages", window.location.origin);
  url.searchParams.set("coupleId", coupleId);

  const res = await fetch(url.toString(), {
    method: "GET",
    cache: "no-store",
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json?.error || "Failed to load chat");
  }

  return Array.isArray(json?.data) ? (json.data as CoupleChatMessage[]) : [];
}

export function useCoupleChat(coupleId: string | undefined) {
  return useQuery({
    queryKey: ["couple-chat", coupleId],
    queryFn: () => fetchCoupleChat(coupleId as string),
    enabled: !!coupleId,
    staleTime: 30_000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}
