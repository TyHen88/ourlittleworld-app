"use server";

import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { getCachedUser } from "@/lib/auth-cache";
import { uploadFileToCloudinary } from "@/lib/cloudinary-upload";
import { notifyUsers } from "@/lib/notifications";
import { revalidatePath } from "next/cache";

// Romantic world name suggestions 
const ROMANTIC_NAMES = [
    "LoveHaven", "BlissNest", "ForeverUs", "HeartHaven2026",
    "OurSweetEscape", "TwoHearts", "EndlessLove", "DreamTogether",
    "SoulMates", "PerfectPair", "LoveStory", "TogetherForever",
    "OurParadise", "SweetJourney", "EternalBond", "LoveNest"
];

const INVITE_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const INVITE_CODE_LENGTH = 8;
const INVITE_CODE_PATTERN = /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$/;

// Generate a random romantic world name
export async function generateWorldName() {
    const randomName = ROMANTIC_NAMES[Math.floor(Math.random() * ROMANTIC_NAMES.length)];
    const year = new Date().getFullYear();
    return `${randomName}${Math.random() > 0.5 ? year : ''}`;
}

// Generate unique invite code
function generateInviteCode(): string {
    let code = '';
    for (let i = 0; i < INVITE_CODE_LENGTH; i++) {
        code += INVITE_CODE_ALPHABET.charAt(Math.floor(Math.random() * INVITE_CODE_ALPHABET.length));
    }
    return code;
}

function normalizeInviteCode(value: string) {
    return value.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function getWorldDisplayName(value: string | null | undefined) {
    const trimmed = value?.trim();
    return trimmed && trimmed.length > 0 ? trimmed : "your world";
}

function getPartnerDisplayName(user: {
    full_name?: string | null;
    name?: string | null;
}) {
    const fullName = user.full_name?.trim();
    if (fullName) {
        return fullName;
    }

    const fallbackName = user.name?.trim();
    return fallbackName && fallbackName.length > 0 ? fallbackName : "Your partner";
}

interface CreateWorldData {
    userId?: string;
    worldName: string;
    startDate?: string;
    couplePhotoUrl?: string;
    photoFile?: File;
    partnerNickname?: string;
    theme?: string;
}

export async function createWorld(data: CreateWorldData) {
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

        const existingUser = await prisma.user.findUnique({
            where: { id: user.id },
            select: { couple_id: true }
        });

        if (existingUser?.couple_id) {
            return { success: false, error: "Already a member of a world" };
        }

        let finalCouplePhotoUrl: string | null = data.couplePhotoUrl || null;

        if (data.photoFile) {
            const formData = new FormData();
            formData.append("file", data.photoFile);
            const uploadResult = await uploadCouplePhoto(formData);

            if (uploadResult.success && uploadResult.url) {
                finalCouplePhotoUrl = uploadResult.url;
            } else {
                return { success: false, error: uploadResult.error || "Failed to upload couple photo." };
            }
        }

        for (let attempt = 0; attempt < 5; attempt++) {
            const inviteCode = generateInviteCode();
            try {
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

                // 2. Update user's profile with couple_id
                await prisma.user.update({
                    where: { id: user.id },
                    data: { couple_id: couple.id }
                });

                return {
                    success: true,
                    data: couple,
                    inviteCode,
                    worldName: data.worldName
                };
            } catch (error: unknown) {
                console.error(">>> createWorld transaction error:", error);
                const isInviteCodeCollision =
                    error instanceof Prisma.PrismaClientKnownRequestError &&
                    error.code === "P2002" &&
                    (error.meta as Prisma.JsonObject)?.target === "invite_code";

                if (isInviteCodeCollision) {
                    continue;
                }
                throw error;
            }
        }

        return { success: false, error: "Failed to generate a unique invite code. Please try again." };
    } catch (error: unknown) {
        console.error('Create world error:', error);
        const message = error instanceof Error ? error.message : 'Unknown error';
        return { success: false, error: message };
    }
}

interface JoinWorldData {
    userId?: string;
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

        const normalizedInviteCode = normalizeInviteCode(data.inviteCode);

        if (!normalizedInviteCode) {
            return { success: false, error: "Enter your partner's invite code to continue." };
        }

        if (!INVITE_CODE_PATTERN.test(normalizedInviteCode)) {
            return {
                success: false,
                error: `Invite codes use ${INVITE_CODE_LENGTH} letters and numbers. Double-check the code and try again.`,
            };
        }

        const currentUser = await prisma.user.findUnique({
            where: { id: user.id },
            select: { couple_id: true }
        });

        // Find the couple by invite code
        const couple = await prisma.couple.findUnique({
            where: { invite_code: normalizedInviteCode },
            select: {
                id: true,
                couple_name: true,
                partner_2_nickname: true,
            }
        });

        if (!couple) {
            return {
                success: false,
                error: "We couldn't find that invite code. Ask your partner to share it again and try once more.",
            };
        }

        if (currentUser?.couple_id === couple.id) {
            return {
                success: false,
                error: "You're already connected to this world.",
            };
        }

        if (currentUser?.couple_id && currentUser.couple_id !== couple.id) {
            return {
                success: false,
                error: "Your account is already connected to another world. Leave that world first before joining a new one.",
            };
        }

        // Update couple and user profile in a transaction
        await prisma.$transaction(async (tx) => {
            const latestMemberCount = await tx.user.count({
                where: { couple_id: couple.id }
            });

            if (latestMemberCount >= 2) {
                throw new Error("This world already has both partners connected. Ask your partner for a fresh invite only if they create a new world.");
            }

            // 1. Update couple with second partner's nickname
            await tx.couple.update({
                where: { id: couple.id },
                data: {
                    partner_2_nickname: data.partnerNickname?.trim() || couple.partner_2_nickname || null
                }
            });

            // 2. Update user's profile with couple_id
            await tx.user.update({
                where: { id: user.id },
                data: {
                    couple_id: couple.id,
                },
            });
        });

        const recipientIds = await prisma.user.findMany({
            where: {
                couple_id: couple.id,
                id: {
                    not: user.id,
                },
                is_deleted: false,
            },
            select: {
                id: true,
            },
        });

        if (recipientIds.length > 0) {
            const joinedPartnerName = getPartnerDisplayName(user);
            const worldName = getWorldDisplayName(couple.couple_name);

            try {
                await notifyUsers({
                    userIds: recipientIds.map((recipient) => recipient.id),
                    type: "PARTNER_JOINED",
                    actorUserId: user.id,
                    coupleId: couple.id,
                    title: `${joinedPartnerName} joined ${worldName}`,
                    body: `Your partner just joined ${worldName}. You are both connected now.`,
                    detail: `${joinedPartnerName} joined ${worldName} successfully. Your shared space is now ready for both of you.`,
                    url: "/dashboard",
                    push: {
                        allowSingleUserRecipients: true,
                        tag: `world-partner-joined-${couple.id}-${user.id}`,
                        options: {
                            TTL: 10 * 60,
                            urgency: "high",
                        },
                    },
                });
            } catch (pushError) {
                console.error("Partner joined push notification error:", pushError);
            }
        }

        return {
            success: true,
            data: couple,
            worldName: couple.couple_name
        };
    } catch (error: unknown) {
        console.error('Join world error:', error);
        const message = error instanceof Error ? error.message : 'Unknown error';
        return { success: false, error: message };
    }
}

// Upload couple photo to Cloudinary
export async function uploadCouplePhoto(formData: FormData) {
    try {
        const user = await getCachedUser();

        if (!user || !user.id) {
            return { success: false, error: "Not authenticated" };
        }
        // Verification is done via session, no need for client-provided userId

        const file = formData.get("file");
        if (!(file instanceof File)) return { success: false, error: "No file provided" };

        const uploadResult = await uploadFileToCloudinary(file, {
            folder: "ourlittleworld/couples",
            public_id: `couple-${user.id}-${Date.now()}-${crypto.randomUUID()}`,
            resource_type: "image",
            overwrite: false,
            transformation: [
                {
                    quality: "auto",
                    fetch_format: "auto",
                },
            ],
        });

        return { success: true, url: uploadResult.secure_url };
    } catch (error: unknown) {
        console.error('Couple photo upload error:', error);
        const message = error instanceof Error ? error.message : 'Unknown error';
        return { success: false, error: message };
    }
}

// Get user's couple data
export async function getUserCouple(userId: string) {
    try {
        const sessionUser = await getCachedUser();

        if (!sessionUser?.id) {
            return { success: false, error: "Not authenticated" };
        }

        if (userId !== sessionUser.id) {
            return { success: false, error: "Unauthorized" };
        }

        // Find the couple the user belongs to
        const user = await prisma.user.findUnique({
            where: { id: sessionUser.id },
            include: { couple: true }
        });

        return { success: true, data: user?.couple || null };
    } catch (error: unknown) {
        console.error('Get user couple error:', error);
        const message = error instanceof Error ? error.message : 'Unknown error';
        return { success: false, error: message };
    }
}

export async function updateCoupleAnniversary(startDate: string | null) {
    const user = await getCachedUser();

    if (!user?.id) {
        throw new Error("Not authenticated");
    }

    const currentUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { couple_id: true },
    });

    if (!currentUser?.couple_id) {
        throw new Error("No couple found");
    }

    let parsedDate: Date | null = null;
    if (startDate) {
        parsedDate = new Date(`${startDate}T00:00:00`);
        if (Number.isNaN(parsedDate.getTime())) {
            throw new Error("Please choose a valid date.");
        }
    }

    const updatedCouple = await prisma.couple.update({
        where: { id: currentUser.couple_id },
        data: { start_date: parsedDate },
        select: { start_date: true },
    });

    revalidatePath("/dashboard");
    revalidatePath("/settings");

    return {
        success: true,
        start_date: updatedCouple.start_date?.toISOString() ?? null,
    };
}
