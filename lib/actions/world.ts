"use server";

import prisma from "@/lib/prisma";
import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

// Romantic world name suggestions 
const ROMANTIC_NAMES = [
    "LoveHaven", "BlissNest", "ForeverUs", "HeartHaven2026",
    "OurSweetEscape", "TwoHearts", "EndlessLove", "DreamTogether",
    "SoulMates", "PerfectPair", "LoveStory", "TogetherForever",
    "OurParadise", "SweetJourney", "EternalBond", "LoveNest"
];

// Generate a random romantic world name
export async function generateWorldName() {
    const randomName = ROMANTIC_NAMES[Math.floor(Math.random() * ROMANTIC_NAMES.length)];
    const year = new Date().getFullYear();
    return `${randomName}${Math.random() > 0.5 ? year : ''}`;
}

// Generate unique invite code
function generateInviteCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 8; i++) { // 8 characters for uniqueness
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

interface CreateWorldData {
    userId: string;
    worldName: string;
    startDate?: string;
    couplePhotoUrl?: string;
    partnerNickname?: string;
    theme?: string;
}

export async function createWorld(data: CreateWorldData) {
    try {
        const inviteCode = generateInviteCode();

        // Use Prisma transaction to ensure both operations succeed
        const couple = await prisma.$transaction(async (tx: any) => {
            // 1. Create the couple
            const newCouple = await tx.couple.create({
                data: {
                    invite_code: inviteCode,
                    couple_name: data.worldName,
                    start_date: data.startDate ? new Date(data.startDate) : null,
                    couple_photo_url: data.couplePhotoUrl || null,
                    partner_1_nickname: data.partnerNickname || null,
                    world_theme: data.theme || 'blush',
                }
            });

            // 2. Update user's profile with couple_id
            await tx.profile.update({
                where: { id: data.userId },
                data: { couple_id: newCouple.id }
            });

            return newCouple;
        });

        revalidatePath('/dashboard');
        return {
            success: true,
            data: couple,
            inviteCode,
            worldName: data.worldName
        };
    } catch (error: any) {
        console.error('Create world error:', error);
        return { success: false, error: error.message };
    }
}

interface JoinWorldData {
    userId: string;
    inviteCode: string;
    partnerNickname?: string;
}

export async function joinWorld(data: JoinWorldData) {
    try {
        // Find the couple by invite code
        const couple = await prisma.couple.findUnique({
            where: { invite_code: data.inviteCode.toUpperCase() }
        });

        if (!couple) {
            throw new Error('Invalid invite code. Please check and try again.');
        }

        // Check if couple already has 2 partners
        const memberCount = await prisma.profile.count({
            where: { couple_id: couple.id }
        });

        if (memberCount >= 2) {
            throw new Error('This world is already complete. Please ask for a new invite code.');
        }

        // Check if user is already in this world
        const userProfile = await prisma.profile.findUnique({
            where: { id: data.userId },
            select: { couple_id: true }
        });

        if (userProfile?.couple_id === couple.id) {
            throw new Error('You are already a member of this world!');
        }

        // Update couple and user profile in a transaction
        await prisma.$transaction(async (tx: any) => {
            // 1. Update couple with second partner's nickname
            await tx.couple.update({
                where: { id: couple.id },
                data: {
                    partner_2_nickname: data.partnerNickname || null
                }
            });

            // 2. Update user's profile with couple_id
            await tx.profile.update({
                where: { id: data.userId },
                data: { couple_id: couple.id }
            });
        });

        revalidatePath('/dashboard');
        return {
            success: true,
            data: couple,
            worldName: couple.couple_name
        };
    } catch (error: any) {
        console.error('Join world error:', error);
        return { success: false, error: error.message };
    }
}

// Upload couple photo to Supabase Storage
export async function uploadCouplePhoto(file: File, userId: string) {
    try {
        const supabase = await createClient();

        // Create unique filename
        const fileExt = file.name.split('.').pop();
        const fileName = `${userId}-${Date.now()}.${fileExt}`;
        const filePath = `couple-photos/${fileName}`;

        // Upload to Supabase Storage
        const { data, error } = await supabase.storage
            .from('couple-assets')
            .upload(filePath, file, {
                cacheControl: '3600',
                upsert: false
            });

        if (error) throw error;

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
            .from('couple-assets')
            .getPublicUrl(filePath);

        return { success: true, url: publicUrl };
    } catch (error: any) {
        console.error('Upload photo error:', error);
        return { success: false, error: error.message };
    }
}

// Get user's couple data
export async function getUserCouple(userId: string) {
    try {
        // Find the couple the user belongs to
        const profile = await prisma.profile.findUnique({
            where: { id: userId },
            include: { couple: true }
        });

        return { success: true, data: profile?.couple || null };
    } catch (error: any) {
        console.error('Get user couple error:', error);
        return { success: false, error: error.message };
    }
}

//update couple, request : photo, nickname, start_date
