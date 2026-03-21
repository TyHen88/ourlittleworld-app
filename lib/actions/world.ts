"use server";

console.log(">>> World actions file loaded");

import prisma from "@/lib/prisma";
import fs from "fs/promises";
import path from "path";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { getCachedUser } from "@/lib/auth-cache";

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
    photoFile?: any; // Added for internal photo handling if needed
    partnerNickname?: string;
    theme?: string;
}

export async function createWorld(data: CreateWorldData) {
    console.log(">>> createWorld action called with data:", data.worldName);
    try {
        console.log(">>> createWorld: fetching cached user...");
        const user = await getCachedUser();
        console.log(">>> createWorld: user fetched:", user?.id);

        if (!user || !user.id) {
            return { success: false, error: "Not authenticated" };
        }
        if (data.userId && data.userId !== user.id) {
            return { success: false, error: "Unauthorized" };
        }
        if (!user.email) {
            return { success: false, error: "Missing user email" };
        }

        console.log("CreateWorld: authenticated user", user.id, user.email);

        const existingUser = await prisma.user.findUnique({
            where: { id: user.id },
            select: { couple_id: true }
        });

        console.log("CreateWorld: existing user couple_id", existingUser?.couple_id);

        if (existingUser?.couple_id) {
            return { success: false, error: "Already a member of a world" };
        }

        let finalCouplePhotoUrl: string | null = data.couplePhotoUrl || null;

        if (data.photoFile) {
            console.log(">>> createWorld: photoFile provided, attempting upload...");
            const formData = new FormData();
            formData.append("file", data.photoFile);
            const uploadResult = await uploadCouplePhoto(formData);

            if (uploadResult.success && uploadResult.url) {
                finalCouplePhotoUrl = uploadResult.url;
                console.log(">>> createWorld: photo uploaded successfully:", finalCouplePhotoUrl);
            } else {
                console.error(">>> createWorld: Photo upload failed:", uploadResult.error);
                return { success: false, error: uploadResult.error || "Failed to upload couple photo." };
            }
        }

        for (let attempt = 0; attempt < 5; attempt++) {
            const inviteCode = generateInviteCode();
            try {
                console.log(">>> createWorld: Attempting to create couple with code:", inviteCode);
                
                // 1. Create the couple
                const couple = await prisma.couple.create({
                    data: {
                        invite_code: inviteCode,
                        couple_name: data.worldName,
                        start_date: data.startDate ? new Date(data.startDate) : null,
                        couple_photo_url: finalCouplePhotoUrl, // Use the uploaded URL or existing one
                        partner_1_nickname: data.partnerNickname || null,
                        world_theme: data.theme || 'blush',
                    }
                });

                console.log(">>> createWorld: couple created", couple.id);

                // 2. Update user's profile with couple_id
                await prisma.user.update({
                    where: { id: user.id },
                    data: { couple_id: couple.id }
                });

                console.log(">>> createWorld: user updated with couple_id");

                return {
                    success: true,
                    data: couple,
                    inviteCode,
                    worldName: data.worldName
                };
            } catch (error: any) {
                console.error(">>> createWorld transaction error:", error);
                const isInviteCodeCollision =
                    error instanceof Prisma.PrismaClientKnownRequestError &&
                    error.code === "P2002" &&
                    (error.meta as any)?.target?.includes("invite_code");

                if (isInviteCodeCollision) {
                    console.log(">>> createWorld: code collision, retrying...");
                    continue;
                }
                throw error;
            }
        }

        return { success: false, error: "Failed to generate a unique invite code. Please try again." };
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
        const user = await getCachedUser();

        if (!user || !user.id) {
            return { success: false, error: "Not authenticated" };
        }
        if (data.userId && data.userId !== user.id) {
            return { success: false, error: "Unauthorized" };
        }
        if (!user.email) {
            return { success: false, error: "Missing user email" };
        }

        // Find the couple by invite code
        const couple = await prisma.couple.findUnique({
            where: { invite_code: data.inviteCode.toUpperCase() }
        });

        if (!couple) {
            throw new Error('Invalid invite code. Please check and try again.');
        }

        // Check if couple already has 2 partners
        const memberCount = await prisma.user.count({
            where: { couple_id: couple.id }
        });

        if (memberCount >= 2) {
            throw new Error('This world is already complete. Please ask for a new invite code.');
        }

        // Check if user is already in this world
        const currentUser = await prisma.user.findUnique({
            where: { id: user.id },
            select: { couple_id: true }
        });

        if (currentUser?.couple_id === couple.id) {
            throw new Error('You are already a member of this world!');
        }
        if (currentUser?.couple_id && currentUser.couple_id !== couple.id) {
            throw new Error('You are already a member of another world.');
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
            await tx.user.upsert({
                where: { id: user.id },
                update: { couple_id: couple.id },
                create: {
                    id: user.id,
                    email: user.email,
                    full_name: user.name ?? null,
                    couple_id: couple.id,
                }
            });
        });

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

// Upload couple photo to Local Storage
export async function uploadCouplePhoto(formData: FormData) {
    console.log(">>> uploadCouplePhoto called");
    try {
        const user = await getCachedUser();
        console.log(">>> uploadCouplePhoto: user fetched:", user?.id);

        if (!user || !user.id) {
            return { success: false, error: "Not authenticated" };
        }
        // Verification is done via session, no need for client-provided userId

        const file = formData.get("file") as File;
        if (!file) return { success: false, error: "No file provided" };

        const fileExt = file.name.split('.').pop() || 'jpg';
        const fileName = `couple-${user.id}-${Date.now()}.${fileExt}`;
        
        const buffer = Buffer.from(await file.arrayBuffer());
        const relativePath = `/uploads/${fileName}`;
        const absolutePath = path.join(process.cwd(), "public", "uploads", fileName);

        await fs.writeFile(absolutePath, buffer);

        return { success: true, url: relativePath };
    } catch (error: any) {
        console.error('Local couple photo upload error:', error);
        return { success: false, error: error.message };
    }
}

// Get user's couple data
export async function getUserCouple(userId: string) {
    try {
        // Find the couple the user belongs to
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { couple: true }
        });

        return { success: true, data: user?.couple || null };
    } catch (error: any) {
        console.error('Get user couple error:', error);
        return { success: false, error: error.message };
    }
}

//update couple, request : photo, nickname, start_date
