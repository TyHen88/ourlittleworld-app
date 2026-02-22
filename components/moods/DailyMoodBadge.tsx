"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";

interface DailyMoodBadgeProps {
    userId: string;
    coupleId: string;
    position?: "top-right" | "bottom-right";
}

export function DailyMoodBadge({ userId, coupleId, position = "top-right" }: DailyMoodBadgeProps) {
    const queryClient = useQueryClient();
    const [noteOpen, setNoteOpen] = useState(false);
    const todayKey = new Date().toISOString().split('T')[0];

    const toDateKey = (value: any) => {
        if (!value) return null;
        if (typeof value === 'string') {
            // 'YYYY-MM-DD' or ISO string
            return value.includes('T') ? value.split('T')[0] : value;
        }
        try {
            return new Date(value).toISOString().split('T')[0];
        } catch {
            return null;
        }
    };

    // Fetch mood with React Query
    const { data: moodData } = useQuery({
        queryKey: ['daily-mood', userId, todayKey],
        queryFn: async () => {
            const supabase = createClient();
            const { data } = await supabase
                .from('daily_moods')
                .select('mood_emoji, note')
                .eq('user_id', userId)
                .eq('mood_date', todayKey)
                .maybeSingle();
            return data;
        },
        staleTime: 30 * 1000,
    });

    const mood = moodData?.mood_emoji || null;
    const note = moodData?.note || null;

    // Realtime subscription
    useEffect(() => {
        const supabase = createClient();

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
                    const row = payload?.new || payload?.old;
                    const rowUserId = row?.user_id;
                    const rowDateKey = toDateKey(row?.mood_date);

                    // Update if it's this user's mood for today
                    if (rowUserId === userId && rowDateKey === todayKey) {
                        queryClient.invalidateQueries({ queryKey: ['daily-mood', userId, todayKey] });
                        setNoteOpen(false);
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [userId, coupleId]);

    useEffect(() => {
        if (!noteOpen) return;

        const handlePointerDown = () => setNoteOpen(false);
        document.addEventListener('pointerdown', handlePointerDown);

        return () => {
            document.removeEventListener('pointerdown', handlePointerDown);
        };
    }, [noteOpen]);

    const positionClasses = position === "top-right"
        ? "-top-1 -right-1"
        : "-bottom-1 -right-1";

    const tooltipPositionClasses = position === "top-right"
        ? "top-full mt-2 right-0"
        : "bottom-full mb-2 right-0";

    return (
        <AnimatePresence>
            {mood && (
                <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={{ type: "spring", duration: 0.4 }}
                    onClick={(e) => {
                        if (!note) return;
                        e.stopPropagation();
                        setNoteOpen((v) => !v);
                    }}
                    onKeyDown={(e) => {
                        if (!note) return;
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            e.stopPropagation();
                            setNoteOpen((v) => !v);
                        }
                    }}
                    role={note ? "button" : undefined}
                    tabIndex={note ? 0 : -1}
                    className={`absolute ${positionClasses} group w-6 h-6 bg-white rounded-full shadow-lg flex items-center justify-center text-sm z-10 border-2 border-romantic-blush ${note ? 'cursor-pointer' : ''}`}
                    title={note || undefined}
                >
                    {mood}

                    {note && (
                        <div
                            onClick={(e) => e.stopPropagation()}
                            className={`absolute ${tooltipPositionClasses} ${noteOpen ? 'opacity-100' : 'opacity-0'} transition-opacity pointer-events-none z-20`}
                        >
                            <div className="max-w-[220px] whitespace-normal rounded-2xl bg-slate-900/90 text-white px-3 py-2 text-[11px] font-semibold shadow-xl">
                                {note}
                            </div>
                        </div>
                    )}
                </motion.div>
            )}
        </AnimatePresence>
    );
}
