"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/utils/supabase/client";
import { calculateDaysTogether } from "@/lib/utils/date-utilities";

const supabase = createClient();

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
    // 1. Fetch Auth User
    const authQuery = useQuery({
        queryKey: ["auth-user"],
        queryFn: async () => {
            try {
                const { data: { user }, error } = await supabase.auth.getUser();
                if (error) {
                    console.warn('Auth error:', error);
                    return null;
                }
                return user;
            } catch (err) {
                console.warn('Failed to fetch user:', err);
                return null;
            }
        },
        staleTime: Infinity, // Auth guest session is stable
        retry: false, // Don't retry auth failures
    });

    // 2. Fetch Profile & Couple
    const coupleQuery = useQuery({
        queryKey: ["couple", authQuery.data?.id],
        queryFn: async () => {
            if (!authQuery.data?.id) return null;

            try {
                const res = await fetch('/api/me', { method: 'GET' });
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
        enabled: !!authQuery.data?.id,
        retry: false, // Don't retry profile fetch failures
    });

    const profile = coupleQuery.data;
    const couple = (profile as any)?.couple as CoupleData | undefined;
    const daysTogether = couple ? calculateDaysTogether(couple.start_date) : 0;

    return {
        user: authQuery.data,
        profile,
        couple,
        daysTogether,
        isLoading: authQuery.isLoading || coupleQuery.isLoading,
        error: authQuery.error || coupleQuery.error,
        refresh: () => {
            authQuery.refetch();
            coupleQuery.refetch();
        }
    };
}
