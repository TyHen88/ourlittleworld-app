"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { motion, AnimatePresence } from "framer-motion";

interface DailyMoodBadgeProps {
    userId: string;
    coupleId: string;
    position?: "top-right" | "bottom-right";
}

export function DailyMoodBadge({ userId, coupleId, position = "top-right" }: DailyMoodBadgeProps) {
    const [mood, setMood] = useState<string | null>(null);

    useEffect(() => {
        const supabase = createClient();
        const today = new Date().toISOString().split('T')[0];

        // Fetch initial mood
        const fetchMood = async () => {
            const { data } = await supabase
                .from('daily_moods')
                .select('mood_emoji')
                .eq('user_id', userId)
                .eq('mood_date', today)
                .maybeSingle();

            setMood(data?.mood_emoji || null);
        };

        fetchMood();

        // Subscribe to realtime updates
        const channel = supabase
            .channel(`daily_moods:${coupleId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'daily_moods',
                    filter: `couple_id=eq.${coupleId}`
                },
                (payload: any) => {
                    // Update if it's this user's mood for today
                    if (payload.new?.user_id === userId && payload.new?.mood_date === today) {
                        setMood(payload.new.mood_emoji);
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [userId, coupleId]);

    const positionClasses = position === "top-right"
        ? "-top-1 -right-1"
        : "-bottom-1 -right-1";

    return (
        <AnimatePresence>
            {mood && (
                <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={{ type: "spring", duration: 0.4 }}
                    className={`absolute ${positionClasses} w-6 h-6 bg-white rounded-full shadow-lg flex items-center justify-center text-sm z-10 border-2 border-romantic-blush`}
                >
                    {mood}
                </motion.div>
            )}
        </AnimatePresence>
    );
}
