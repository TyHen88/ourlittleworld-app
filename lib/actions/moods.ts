"use server";

import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { getCachedUser } from "@/lib/auth-cache";
import { revalidatePath } from "next/cache";

export async function submitDailyMood(data: {
    moodEmoji: string;
    note?: string;
    metadata?: {
        message?: string;
    };
}) {
    try {
        const user = await getCachedUser();
        if (!user || user.id === undefined) {
          return { success: false, error: "Not authenticated" };
        }

        const userId = user.id;

        // Get user with Prisma
        const dbUser = await prisma.user.findUnique({
            where: { id: userId },
            select: { couple_id: true }
        });

        if (!dbUser?.couple_id) {
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
            user_id: userId,
            couple_id: dbUser.couple_id,
            mood_date: today,
            mood_emoji: data.moodEmoji,
            note: data.note || null,
            ...(metadata ? { metadata } : {}),
        };

        // upsert with Prisma
        await prisma.dailyMood.upsert({
            where: {
                user_id_mood_date: {
                    user_id: userId,
                    mood_date: today
                }
            },
            update: updateData,
            create: createData
        });

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
        const user = await getCachedUser();
        if (!user || user.id === undefined) {
          return { success: false, error: "Not authenticated" };
        }

        const userId = user.id;

        const dbUser = await prisma.user.findUnique({
            where: { id: userId },
            select: { couple_id: true }
        });

        if (!dbUser?.couple_id) {
            return { success: false, error: "No couple found" };
        }

        const todayKey = new Date().toISOString().split('T')[0];
        const today = new Date(todayKey);

        const todayMood = await prisma.dailyMood.findFirst({
            where: {
                user_id: userId,
                mood_date: today
            }
        });

        if (todayMood) {
            await prisma.dailyMood.update({
                where: { id: todayMood.id },
                data: {
                    metadata: {
                        ...(todayMood.metadata as any || {}),
                        message: message
                    }
                }
            });
        } else {
            await prisma.dailyMood.create({
                data: {
                    user_id: userId,
                    couple_id: dbUser.couple_id,
                    mood_date: today,
                    mood_emoji: "😊",
                    metadata: { message: message }
                }
            });
        }

        revalidatePath('/dashboard');
        return { success: true };
    } catch (error: any) {
        console.error('Update message error:', error);
        return { success: false, error: error.message };
    }
}

export async function getHeroMessage(coupleId: string) {
    try {
        const todayKey = new Date().toISOString().split('T')[0];
        const today = new Date(todayKey);

        const mood = await prisma.dailyMood.findFirst({
            where: {
                couple_id: coupleId,
                mood_date: today,
                metadata: {
                    not: Prisma.JsonNull
                }
            },
            orderBy: {
                created_at: 'desc'
            }
        });

        const message = (mood?.metadata as any)?.message;
        return { success: true, message: message || null };
    } catch (error: any) {
        console.error('Get hero message error:', error);
        return { success: false, error: error.message };
    }
}

export async function getUserMoodBadgeData(userId: string) {
    try {
        const todayKey = new Date().toISOString().split('T')[0];
        const today = new Date(todayKey);

        const mood = await prisma.dailyMood.findUnique({
            where: {
                user_id_mood_date: {
                    user_id: userId,
                    mood_date: today
                }
            },
            select: {
                mood_emoji: true,
                note: true
            }
        });

        return { success: true, data: mood };
    } catch (error: any) {
        console.error('Get mood badge error:', error);
        return { success: false, error: error.message };
    }
}
