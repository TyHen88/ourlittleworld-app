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
    full_name: string | null;
    couple_id: string | null;
    avatar_url: string | null;
    email?: string | null;
    user_type?: string | null;
    onboarding_completed?: boolean;
    created_at?: string;
    bio?: string | null;
    nickname?: string | null;
    auth_method?: "google" | "password" | "google_and_password" | "unknown";
    has_password?: boolean;
    has_google_account?: boolean;
    couple?: CoupleData | null;
}

export function useCouple() {
    const { data: session, status } = useSession();
    const user = session?.user;

    // 2. Fetch Profile & Couple
    const coupleQuery = useQuery<UserProfile | null>({
        queryKey: ["couple", user?.id],
        queryFn: async () => {
            if (!user?.id) return null;

            try {
                // Add a small timeout to the fetch to prevent hanging
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

                const res = await fetch('/api/me', { 
                    method: 'GET',
                    signal: controller.signal,
                    cache: "no-store",
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
        staleTime: 0,
        gcTime: 30 * 60 * 1000,
        refetchOnMount: "always",
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
        retry: 2,
    });

    const profile = coupleQuery.data;
    const couple = profile?.couple ?? undefined;
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
