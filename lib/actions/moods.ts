"use server";

import prisma from "@/lib/prisma";
import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

export async function submitDailyMood(data: {
    moodEmoji: string;
    note?: string;
    metadata?: {
        message?: string;
    };
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

        const todayKey = new Date().toISOString().split('T')[0];
        const today = new Date(todayKey);

        const metadata = data.metadata?.message ? { message: data.metadata.message } : undefined;

        const updateData: any = {
            mood_emoji: data.moodEmoji,
            note: data.note || null,
            ...(metadata ? { metadata } : {}),
        };

        const createData: any = {
            user_id: user.id,
            couple_id: profile.couple_id,
            mood_date: today,
            mood_emoji: data.moodEmoji,
            note: data.note || null,
            ...(metadata ? { metadata } : {}),
        };

        // upsert with Prisma
        await prisma.dailyMood.upsert({
            where: {
                user_id_mood_date: {
                    user_id: user.id,
                    mood_date: today
                }
            },
            update: updateData,
            create: createData
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
        const todayKey = new Date().toISOString().split('T')[0];
        const today = new Date(todayKey);

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

export async function updateTodayMoodMessage(message: string) {
    try {
        const supabase = await createClient();

        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
            return { success: false, error: "Not authenticated" };
        }

        const profile = await prisma.profile.findUnique({
            where: { id: user.id },
            select: { couple_id: true }
        });

        if (!profile?.couple_id) {
            return { success: false, error: "No couple found" };
        }

        const todayKey = new Date().toISOString().split('T')[0];
        const today = new Date(todayKey);
        const trimmed = message.trim();

        const existing = await prisma.dailyMood.findUnique({
            where: {
                user_id_mood_date: {
                    user_id: user.id,
                    mood_date: today,
                }
            },
            select: { id: true, mood_emoji: true }
        });

        const dailyMoodDelegate: any = (prisma as any).dailyMood;

        if (existing) {
            await dailyMoodDelegate.update({
                where: { id: existing.id },
                data: {
                    metadata: trimmed ? { message: trimmed } : null,
                }
            });
        } else {
            await dailyMoodDelegate.create({
                data: {
                    user_id: user.id,
                    couple_id: profile.couple_id,
                    mood_date: today,
                    mood_emoji: "❤️",
                    note: null,
                    metadata: trimmed ? { message: trimmed } : null,
                }
            });
        }

        revalidatePath('/dashboard');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
