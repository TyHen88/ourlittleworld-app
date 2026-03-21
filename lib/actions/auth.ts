"use server";

import prisma from "@/lib/prisma";
import { signIn as nextAuthSignIn, signOut as nextAuthSignOut } from "@/auth";
import { revalidatePath } from "next/cache";
import { AuthError } from "next-auth";
import { getCachedUser } from "@/lib/auth-cache";
import bcrypt from "bcryptjs";
import crypto from "crypto";

export async function signUp(email: string, fullName: string) {
    const existingUser = await prisma.user.findFirst({
        where: { email, is_deleted: false }
    });

    if (existingUser) {
        return await requestLoginCode(email);
    }

    try {
        await prisma.user.create({
            data: {
                email,
                full_name: fullName,
                name: fullName,
            }
        });
        return await requestLoginCode(email);
    } catch (error: any) {
        console.error('[SIGNUP_ERROR]', error);
        throw new Error(error.message || 'Failed to create account');
    }
}

export async function requestLoginCode(email: string) {
    try {
        await nextAuthSignIn("email", {
            email,
            redirect: false,
        });
        return true;
    } catch (error: any) {
        console.error('[LOGIN_CODE_ERROR]', error);
        throw new Error("Failed to send code. Please check your email.");
    }
}

export async function loginWithPassword(data: any) {
    try {
        await nextAuthSignIn("credentials", {
            email: data.email,
            password: data.password,
            redirect: false,
        });
        return true;
    } catch (error: any) {
        if (error instanceof AuthError) {
            console.error('[LOGIN_PASSWORD_ERROR]', error.type);
            switch (error.type) {
                case "CredentialsSignin":
                    throw new Error("Invalid email or password");
                default:
                    throw new Error("Authentication failed");
            }
        }
        throw error;
    }
}

/**
 * Validates the OTP token before proceeding to password input
 */
export async function validateOtp(email: string, token: string) {
    const hashedToken = crypto
        .createHash("sha256")
        .update(`${token}${process.env.AUTH_SECRET}`)
        .digest("hex");

    const vt = await prisma.verificationToken.findFirst({
        where: { 
            identifier: email, 
            token: hashedToken, 
            expires: { gt: new Date() } 
        }
    });
    
    if (!vt) {
        console.error('[OTP_VALIDATION_ERROR] Token invalid or expired', { email });
        throw new Error("Invalid or expired verification code");
    }

    const user = await prisma.user.findUnique({ where: { email } });
    
    return { 
        isNewUser: !user?.password,
        fullName: user?.full_name || user?.name
    };
}

/**
 * Completes the login/signup by verifying or setting the password
 */
export async function finalizeLoginWithPassword(email: string, token: string, password: string) {
    // 1. One last verification of the token
    const hashedToken = crypto
        .createHash("sha256")
        .update(`${token}${process.env.AUTH_SECRET}`)
        .digest("hex");

    const vt = await prisma.verificationToken.findFirst({
        where: { identifier: email, token: hashedToken, expires: { gt: new Date() } }
    });
    
    if (!vt) {
        console.error('[FINALIZE_AUTH_ERROR] Verification session expired', { email });
        throw new Error("Verification session expired. Please restart.");
    }

    const user = await prisma.user.findUnique({ where: { email } });
    
    // 2. If user already has a password, check it. If not, set it (signup).
    if (user?.password) {
        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
            console.error('[FINALIZE_AUTH_ERROR] Incorrect password', { email });
            throw new Error("Incorrect password");
        }
    } else {
        const hashedPassword = await bcrypt.hash(password, 10);
        await prisma.user.update({
            where: { email },
            data: { 
                password: hashedPassword,
                emailVerified: new Date()
            }
        });
    }

    // 3. Construct the NextAuth callback URL
    return `/api/auth/callback/email?email=${encodeURIComponent(email)}&token=${token}&callbackUrl=/onboarding`;
}

export async function signOut() {
    try {
        await nextAuthSignOut();
        revalidatePath('/');
        return true;
    } catch (error: any) {
        if (error.message?.includes("NEXT_REDIRECT")) throw error;
        console.error('[SIGNOUT_ERROR]', error);
        throw new Error("Failed to sign out");
    }
}

export async function getCurrentUser() {
    const user = await getCachedUser();
    if (!user || !user.id) {
        throw new Error('Not authenticated');
    }

    try {
        const dbUser = await prisma.user.findUnique({
            where: { id: user.id },
            include: {
                couple: {
                    include: { members: true }
                }
            }
        });

        if (!dbUser) throw new Error('User not found');
        return dbUser;
    } catch (error: any) {
        console.error('[GET_CURRENT_USER_ERROR]', error);
        throw new Error('Failed to fetch profile');
    }
}

export async function updateCurrentUserProfile(data: { full_name?: string; avatar_url?: string }) {
    const user = await getCachedUser();
    if (!user || !user.id) throw new Error('Not authenticated');

    try {
        const updated = await prisma.user.update({
            where: { id: user.id },
            data: {
                full_name: typeof data.full_name === 'string' ? data.full_name : undefined,
                name: typeof data.full_name === 'string' ? data.full_name : undefined,
                avatar_url: typeof data.avatar_url === 'string' ? data.avatar_url : undefined,
                image: typeof data.avatar_url === 'string' ? data.avatar_url : undefined,
            }
        });
        return updated;
    } catch (error: any) {
        console.error('[UPDATE_PROFILE_ERROR]', error);
        throw new Error(error.message || 'Failed to update profile');
    }
}

export async function deleteAccount() {
    const sessionUser = await getCachedUser();
    if (!sessionUser || !sessionUser.id) throw new Error('Not authenticated');

    const user = await prisma.user.findUnique({
        where: { id: sessionUser.id }
    });

    if (!user) throw new Error('User not found');

    const timestamp = Date.now();
    const deletedEmail = `deleted_${timestamp}_${user.email}`;

    try {
        await prisma.user.update({
            where: { id: user.id },
            data: {
                is_deleted: true,
                email: deletedEmail,
                couple_id: null,
            }
        });
        await nextAuthSignOut();
        return true;
    } catch (error: any) {
        if (error.message?.includes("NEXT_REDIRECT")) throw error;
        console.error('[DELETE_ACCOUNT_ERROR]', error);
        throw new Error('Failed to delete account');
    }
}
