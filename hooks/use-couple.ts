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
            const { data: { user }, error } = await supabase.auth.getUser();
            if (error) throw error;
            return user;
        },
        staleTime: Infinity, // Auth guest session is stable
    });

    // 2. Fetch Profile & Couple
    const coupleQuery = useQuery({
        queryKey: ["couple", authQuery.data?.id],
        queryFn: async () => {
            if (!authQuery.data?.id) return null;

            const { data, error } = await supabase
                .from('profiles')
                .select('*, couples!fk_profiles_couple(*)')
                .eq('id', authQuery.data.id)
                .maybeSingle();

            if (error) throw error;
            return data;
        },
        enabled: !!authQuery.data?.id,
    });

    const profile = coupleQuery.data;
    const couple = profile?.couples as unknown as CoupleData | undefined;
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
