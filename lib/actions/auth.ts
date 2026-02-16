"use server";

import prisma from "@/lib/prisma";
import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

// Generate a unique 6-character invite code
function generateInviteCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

export async function signUp(email: string, password: string, fullName: string) {
    try {
        const supabase = await createClient();

        // Get the base URL for redirect
        const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3001';

        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: fullName,
                },
                // Redirect to onboarding after email confirmation
                emailRedirectTo: `${baseUrl}/onboarding`,
            },
        });

        if (error) {
            // Handle rate limit error
            if (error.message.includes('rate limit')) {
                throw new Error('Too many signup attempts. Please wait a few minutes and try again.');
            }
            throw error;
        }

        return { success: true, data };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function signIn(email: string, password: string) {
    try {
        const supabase = await createClient();
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) throw error;

        return { success: true, data };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function signOut() {
    try {
        const supabase = await createClient();
        const { error } = await supabase.auth.signOut();
        if (error) throw error;

        revalidatePath('/');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function createCouple(userId: string, coupleName?: string) {
    try {
        const inviteCode = generateInviteCode();

        const data = await prisma.$transaction(async (tx: any) => {
            const couple = await tx.couple.create({
                data: {
                    invite_code: inviteCode,
                    couple_name: coupleName,
                }
            });

            await tx.profile.update({
                where: { id: userId },
                data: { couple_id: couple.id }
            });

            return couple;
        });

        revalidatePath('/dashboard');
        return { success: true, data, inviteCode };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function joinCouple(userId: string, inviteCode: string) {
    try {
        // Find the couple by invite code
        const couple = await prisma.couple.findUnique({
            where: { invite_code: inviteCode.toUpperCase() }
        });

        if (!couple) {
            throw new Error('Invalid invite code');
        }

        // Check if couple already has 2 partners
        const memberCount = await prisma.profile.count({
            where: { couple_id: couple.id }
        });

        if (memberCount >= 2) {
            throw new Error('This couple is already complete');
        }

        await prisma.$transaction(async (tx: any) => {
            // Update user's profile with couple_id
            await tx.profile.update({
                where: { id: userId },
                data: { couple_id: couple.id }
            });
        });

        revalidatePath('/dashboard');
        return { success: true, data: couple };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function getCurrentUser() {
    try {
        const supabase = await createClient();
        const { data: { user }, error } = await supabase.auth.getUser();

        if (error) throw error;
        if (!user) return { success: false, error: 'Not authenticated' };

        // Get profile with couple info using Prisma
        const profile = await prisma.profile.findUnique({
            where: { id: user.id },
            include: {
                couple: {
                    include: {
                        members: true
                    }
                }
            }
        });

        return { success: true, user, profile };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
