"use server";

import prisma from "@/lib/prisma";
import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

export async function submitDailyMood(data: {
    moodEmoji: string;
    note?: string;
}) {
    try {
        const supabase = await createClient();

        // Get current user from Supabase Auth
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
            return { success: false, error: "Not authenticated" };
        }

        // Get user's profile with Prisma
        const profile = await prisma.profile.findUnique({
            where: { id: user.id },
            select: { couple_id: true }
        });

        if (!profile?.couple_id) {
            return { success: false, error: "No couple found" };
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // upsert with Prisma
        await prisma.dailyMood.upsert({
            where: {
                user_id_mood_date: {
                    user_id: user.id,
                    mood_date: today
                }
            },
            update: {
                mood_emoji: data.moodEmoji,
                note: data.note || null,
            },
            create: {
                user_id: user.id,
                couple_id: profile.couple_id,
                mood_date: today,
                mood_emoji: data.moodEmoji,
                note: data.note || null,
            }
        });

        revalidatePath('/dashboard');
        return { success: true };
    } catch (error: any) {
        console.error('Submit mood error:', error);
        return { success: false, error: error.message };
    }
}

export async function getTodayMoods(coupleId: string) {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const data = await prisma.dailyMood.findMany({
            where: {
                couple_id: coupleId,
                mood_date: today
            }
        });

        return { success: true, data };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
