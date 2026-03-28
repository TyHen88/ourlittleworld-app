"use client";

import { useInfiniteQuery } from "@tanstack/react-query";

import type { CursorPaginatedResponse } from "@/lib/pagination";

export type TripStatusGroup = "upcoming" | "past";

export interface TripRecord {
    budget?: number | string | null;
    destination: string;
    end_date: string | Date;
    id: string;
    metadata?: unknown;
    notes?: string | null;
    start_date: string | Date;
    status?: string | null;
    title: string;
}

type TripPageResponse = CursorPaginatedResponse<TripRecord>;

const TRIP_PAGE_SIZE = 12;

export const TRIP_KEYS = {
    all: ["trips"] as const,
    list: (statusGroup: TripStatusGroup) => [...TRIP_KEYS.all, statusGroup] as const,
};

async function fetchTripPage(
    statusGroup: TripStatusGroup,
    cursor: string | null
): Promise<TripPageResponse> {
    const url = new URL("/api/trips", window.location.origin);
    url.searchParams.set("limit", String(TRIP_PAGE_SIZE));
    url.searchParams.set("statusGroup", statusGroup);

    if (cursor) {
        url.searchParams.set("cursor", cursor);
    }

    const res = await fetch(url.toString(), {
        method: "GET",
        cache: "no-store",
    });
    const json = await res.json().catch(() => ({}));

    if (!res.ok) {
        throw new Error(json?.error || "Failed to fetch trips");
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
        data: Array.isArray(json?.data) ? (json.data as TripRecord[]) : [],
        nextCursor,
        pagination: {
            hasMore: Boolean(json?.pagination?.hasMore),
            limit:
                typeof json?.pagination?.limit === "number"
                    ? json.pagination.limit
                    : TRIP_PAGE_SIZE,
            nextCursor,
        },
    };
}

export function useInfiniteTrips(statusGroup: TripStatusGroup) {
    const query = useInfiniteQuery({
        queryKey: TRIP_KEYS.list(statusGroup),
        queryFn: ({ pageParam }) =>
            fetchTripPage(statusGroup, typeof pageParam === "string" ? pageParam : null),
        initialPageParam: null as string | null,
        getNextPageParam: (lastPage) => lastPage.nextCursor,
        staleTime: 60 * 1000,
        gcTime: 10 * 60 * 1000,
        refetchOnMount: false,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        placeholderData: (previousData) => previousData,
        retry: 1,
    });

    return {
        ...query,
        trips: query.data?.pages.flatMap((page) => page.data) ?? [],
    };
}
