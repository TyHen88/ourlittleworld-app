"use client";

import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { calculateDaysTogether } from "@/lib/utils/date-utilities";

export interface CoupleData {
    id: string;
    couple_name: string;
    couple_photo_url: string;
    start_date: string;
    partner_1_nickname: string;
    partner_2_nickname: string;
    partner_1_id: string;
    partner_2_id: string;
    invite_code?: string;
    members?: Array<{
        id: string;
        full_name: string | null;
        avatar_url: string | null;
    }>;
}

export interface UserProfile {
    id: string;
    full_name: string;
    couple_id: string;
    avatar_url: string;
    nickname?: string;
}

export function useCouple() {
    const { data: session, status } = useSession();
    const user = session?.user;

    // 2. Fetch Profile & Couple
    const coupleQuery = useQuery({
        queryKey: ["couple", user?.id],
        queryFn: async () => {
            if (!user?.id) return null;

            try {
                // Add a small timeout to the fetch to prevent hanging
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

                const res = await fetch('/api/me', { 
                    method: 'GET',
                    signal: controller.signal
                });
                
                clearTimeout(timeoutId);
                
                const json = await res.json().catch(() => ({}));
                if (!res.ok) {
                    console.warn('Failed to load profile:', json?.error);
                    return null;
                }
                return json?.profile ?? null;
            } catch (err) {
                console.warn('Failed to fetch profile:', err);
                return null;
            }
        },
        enabled: status === "authenticated" && !!user?.id,
        staleTime: 5 * 60 * 1000, // 5 minutes
        retry: 2, // Allow a few retries for the main context
    });

    const profile = coupleQuery.data;
    const couple = (profile as any)?.couple as CoupleData | undefined;
    const daysTogether = couple ? calculateDaysTogether(couple.start_date) : 0;

    // Determine if we are truly loading or if we should show a fallback
    const isSessionLoading = status === "loading";
    const isDataLoading = coupleQuery.isLoading && status === "authenticated";
    
    return {
        user,
        profile,
        couple,
        daysTogether,
        isLoading: isSessionLoading || isDataLoading,
        error: coupleQuery.error,
        status,
        refresh: () => {
            coupleQuery.refetch();
        }
    };
}
