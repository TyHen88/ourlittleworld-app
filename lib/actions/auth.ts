"use server";

import prisma from "@/lib/prisma";
import { signIn as nextAuthSignIn, signOut as nextAuthSignOut } from "@/auth";
import { revalidatePath } from "next/cache";
import { AuthError } from "next-auth";
import { getCachedUser } from "@/lib/auth-cache";
import bcrypt from "bcryptjs";
import crypto from "crypto";

export async function signUp(email: string, fullName: string) {
    try {
        const existingUser = await prisma.user.findUnique({
            where: { email }
        });

        if (existingUser) {
            // User exists, just trigger login code
            return requestLoginCode(email);
        }

        const user = await prisma.user.create({
            data: {
                email,
                full_name: fullName,
                name: fullName, // NextAuth default
            }
        });

        // Trigger login code after signup
        return requestLoginCode(email);
    } catch (error: any) {
        console.error('Signup error:', error);
        return { success: false, error: error.message };
    }
}

export async function requestLoginCode(email: string) {
    try {
        await nextAuthSignIn("email", {
            email,
            redirect: false,
        });

        return { success: true };
    } catch (error: any) {
        console.error('Request login code error:', error);
        return { success: false, error: "Failed to send code. Please check your email." };
    }
}

export async function loginWithPassword(data: any) {
    try {
        const result = await nextAuthSignIn("credentials", {
            email: data.email,
            password: data.password,
            redirect: false,
        });

        return { success: true };
    } catch (error: any) {
        if (error instanceof AuthError) {
            switch (error.type) {
                case "CredentialsSignin":
                    return { success: false, error: "Invalid email or password" };
                default:
                    return { success: false, error: "Authentication failed" };
            }
        }
        throw error;
    }
}

/**
 * Validates the OTP token before proceeding to password input
 */
export async function validateOtp(email: string, token: string) {
    try {
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
        
        if (!vt) return { success: false, error: "Invalid or expired verification code" };

        const user = await prisma.user.findUnique({ where: { email } });
        
        return { 
            success: true, 
            isNewUser: !user?.password, // If no password, they need to SET one
            fullName: user?.full_name || user?.name
        };
    } catch (error: any) {
        return { success: false, error: "Verification failed" };
    }
}

/**
 * Completes the login/signup by verifying or setting the password
 */
export async function finalizeLoginWithPassword(email: string, token: string, password: string) {
    try {
        // 1. One last verification of the token
        const hashedToken = crypto
            .createHash("sha256")
            .update(`${token}${process.env.AUTH_SECRET}`)
            .digest("hex");

        const vt = await prisma.verificationToken.findFirst({
            where: { identifier: email, token: hashedToken, expires: { gt: new Date() } }
        });
        if (!vt) return { success: false, error: "Verification session expired. Please restart." };

        const user = await prisma.user.findUnique({ where: { email } });
        
        // 2. If user already has a password, check it. If not, set it (signup).
        if (user?.password) {
            const isValid = await bcrypt.compare(password, user.password);
            if (!isValid) return { success: false, error: "Incorrect password" };
        } else {
            // New user or resetting password
            const hashedPassword = await bcrypt.hash(password, 10);
            await prisma.user.update({
                where: { email },
                data: { 
                    password: hashedPassword,
                    emailVerified: new Date() // Mark as verified since they finished OTP + Password
                }
            });
        }

        // 3. Construct the NextAuth callback URL to finalize the session
        const callbackUrl = `/api/auth/callback/email?email=${encodeURIComponent(email)}&token=${token}`;
        
        return { success: true, callbackUrl };
    } catch (error: any) {
        console.error("Finalize error:", error);
        return { success: false, error: "Finalization failed" };
    }
}

export async function signOut() {
    try {
        await nextAuthSignOut();
        revalidatePath('/');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function getCurrentUser() {
    try {
        const user = await getCachedUser();
        if (!user || !user.id) return { success: false, error: 'Not authenticated' };

        // Get user with couple info using Prisma
        const dbUser = await prisma.user.findUnique({
            where: { id: user.id },
            include: {
                couple: {
                    include: {
                        members: true
                    }
                }
            }
        });

        return { success: true, user, profile: dbUser };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function updateCurrentUserProfile(data: { full_name?: string; avatar_url?: string }) {
    try {
        const user = await getCachedUser();
        if (!user || !user.id) return { success: false, error: 'Not authenticated' };

        const updated = await prisma.user.update({
            where: { id: user.id },
            data: {
                full_name: typeof data.full_name === 'string' ? data.full_name : undefined,
                name: typeof data.full_name === 'string' ? data.full_name : undefined,
                avatar_url: typeof data.avatar_url === 'string' ? data.avatar_url : undefined,
                image: typeof data.avatar_url === 'string' ? data.avatar_url : undefined,
            }
        });

        return { success: true, data: updated };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
