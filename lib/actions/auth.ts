"use server";

import prisma from "@/lib/prisma";
import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";

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
        const callbackUrl = new URL('/auth/callback', baseUrl);
        callbackUrl.searchParams.set('next', '/onboarding');

        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: fullName,
                },
                // Redirect to onboarding after email confirmation
                emailRedirectTo: callbackUrl.toString(),
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

        const userId = data.user?.id;
        if (!userId) {
            return { success: true, data, redirectTo: "/dashboard" };
        }

        const profile = await prisma.profile.findUnique({
            where: { id: userId },
            select: { couple_id: true }
        });

        const redirectTo = profile?.couple_id ? "/dashboard" : "/onboarding";

        return { success: true, data, redirectTo };
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
        const supabase = await createClient();
        const { data: { user }, error: userError } = await supabase.auth.getUser();

        if (userError || !user) {
            return { success: false, error: "Not authenticated" };
        }
        if (userId && userId !== user.id) {
            return { success: false, error: "Unauthorized" };
        }
        if (!user.email) {
            return { success: false, error: "Missing user email" };
        }

        const existingProfile = await prisma.profile.findUnique({
            where: { id: user.id },
            select: { couple_id: true }
        });
        if (existingProfile?.couple_id) {
            return { success: false, error: "Already a member of a couple" };
        }

        for (let attempt = 0; attempt < 5; attempt++) {
            const inviteCode = generateInviteCode();
            try {
                const data = await prisma.$transaction(async (tx: any) => {
                    const couple = await tx.couple.create({
                        data: {
                            invite_code: inviteCode,
                            couple_name: coupleName,
                        }
                    });

                    await tx.profile.upsert({
                        where: { id: user.id },
                        update: { couple_id: couple.id },
                        create: {
                            id: user.id,
                            email: user.email,
                            full_name: (user.user_metadata as any)?.full_name ?? null,
                            couple_id: couple.id,
                        }
                    });

                    return couple;
                });

                revalidatePath('/dashboard');
                return { success: true, data, inviteCode };
            } catch (error: any) {
                const isInviteCodeCollision =
                    error instanceof Prisma.PrismaClientKnownRequestError &&
                    error.code === "P2002" &&
                    Array.isArray((error.meta as any)?.target) &&
                    ((error.meta as any).target as string[]).includes("invite_code");

                if (isInviteCodeCollision) continue;
                throw error;
            }
        }

        return { success: false, error: "Failed to generate a unique invite code. Please try again." };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function joinCouple(userId: string, inviteCode: string) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: userError } = await supabase.auth.getUser();

        if (userError || !user) {
            return { success: false, error: "Not authenticated" };
        }
        if (userId && userId !== user.id) {
            return { success: false, error: "Unauthorized" };
        }
        if (!user.email) {
            return { success: false, error: "Missing user email" };
        }

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

        const existingProfile = await prisma.profile.findUnique({
            where: { id: user.id },
            select: { couple_id: true }
        });
        if (existingProfile?.couple_id === couple.id) {
            return { success: true, data: couple };
        }
        if (existingProfile?.couple_id && existingProfile.couple_id !== couple.id) {
            throw new Error('You are already a member of another couple');
        }

        await prisma.$transaction(async (tx: any) => {
            // Update user's profile with couple_id
            await tx.profile.upsert({
                where: { id: user.id },
                update: { couple_id: couple.id },
                create: {
                    id: user.id,
                    email: user.email,
                    full_name: (user.user_metadata as any)?.full_name ?? null,
                    couple_id: couple.id,
                }
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
        if (!user.email) return { success: false, error: 'Missing user email' };

        await prisma.profile.upsert({
            where: { id: user.id },
            update: {
                email: user.email,
                full_name: (user.user_metadata as any)?.full_name ?? undefined,
            },
            create: {
                id: user.id,
                email: user.email,
                full_name: (user.user_metadata as any)?.full_name ?? null,
            }
        });

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

export async function updateCurrentUserProfile(data: { full_name?: string; avatar_url?: string }) {
    try {
        const supabase = await createClient();
        const { data: { user }, error } = await supabase.auth.getUser();

        if (error) throw error;
        if (!user) return { success: false, error: 'Not authenticated' };
        if (!user.email) return { success: false, error: 'Missing user email' };

        const updated = await prisma.profile.upsert({
            where: { id: user.id },
            update: {
                full_name: typeof data.full_name === 'string' ? data.full_name : undefined,
                avatar_url: typeof data.avatar_url === 'string' ? data.avatar_url : undefined,
            },
            create: {
                id: user.id,
                email: user.email,
                full_name: typeof data.full_name === 'string' ? data.full_name : ((user.user_metadata as any)?.full_name ?? null),
                avatar_url: typeof data.avatar_url === 'string' ? data.avatar_url : null,
            }
        });

        revalidatePath('/profile');
        return { success: true, data: updated };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
