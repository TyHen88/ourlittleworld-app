"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import { calculateDaysTogether } from "@/lib/utils/date-utilities";

export interface CoupleData {
    id: string;
    couple_name: string;
    couple_photo_url: string;
    start_date: string;
    partner_1_id: string;
    partner_2_id: string;
    partner_1_nickname: string;
    partner_2_nickname: string;
}

export interface UserProfile {
    id: string;
    full_name: string;
    couple_id: string;
    avatar_url: string;
}

export function useCouple() {
    const [user, setUser] = useState<any>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [couple, setCouple] = useState<CoupleData | null>(null);
    const [daysTogether, setDaysTogether] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const loadData = useCallback(async () => {
        try {
            setIsLoading(true);
            const supabase = createClient();

            const { data: { user }, error: userError } = await supabase.auth.getUser();
            if (userError) throw userError;
            if (!user) {
                setIsLoading(false);
                return;
            }

            setUser(user);

            const { data: profileData, error: profileError } = await supabase
                .from('profiles')
                .select('*, couples!fk_profiles_couple(*)')
                .eq('id', user.id)
                .maybeSingle();

            if (profileError) throw profileError;

            if (profileData) {
                setProfile(profileData);
                if (profileData.couples) {
                    setCouple(profileData.couples);
                    setDaysTogether(calculateDaysTogether(profileData.couples.start_date));
                }
            }
        } catch (err: any) {
            setError(err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    return {
        user,
        profile,
        couple,
        daysTogether,
        isLoading,
        error,
        refresh: loadData
    };
}
