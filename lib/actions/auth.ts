"use server";

import prisma from "@/lib/prisma";
import { signIn as nextAuthSignIn, signOut as nextAuthSignOut } from "@/auth";
import { revalidatePath } from "next/cache";
import { AuthError } from "next-auth";
import { getCachedUser } from "@/lib/auth-cache";
import bcrypt from "bcryptjs";
import crypto from "crypto";

function normalizeEmail(email: string) {
    return email.trim().toLowerCase();
}

function isValidEmail(email: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function signUp(email: string, fullName: string) {
    const normalizedEmail = normalizeEmail(email);
    const normalizedFullName = fullName.trim();

    if (normalizedFullName.length < 2) {
        throw new Error("Please enter your full name.");
    }

    if (!isValidEmail(normalizedEmail)) {
        throw new Error("Please enter a valid email address.");
    }

    const existingUser = await prisma.user.findUnique({
        where: { email: normalizedEmail }
    });

    if (existingUser && !existingUser.is_deleted) {
        return await requestLoginCode(normalizedEmail);
    }

    try {
        if (existingUser?.is_deleted) {
            await prisma.user.update({
                where: { id: existingUser.id },
                data: {
                    email: normalizedEmail,
                    full_name: normalizedFullName,
                    name: normalizedFullName,
                    password: null,
                    emailVerified: null,
                    image: null,
                    avatar_url: null,
                    bio: null,
                    is_deleted: false,
                    onboarding_completed: false,
                    user_type: "COUPLE",
                    couple_id: null,
                }
            });
        } else {
            await prisma.user.create({
                data: {
                    email: normalizedEmail,
                    full_name: normalizedFullName,
                    name: normalizedFullName,
                }
            });
        }

        return await requestLoginCode(normalizedEmail);
    } catch (error: unknown) {
        console.error('[SIGNUP_ERROR]', error);
        const message = error instanceof Error ? error.message : 'Failed to create account';
        throw new Error(message);
    }
}

export async function requestLoginCode(email: string) {
    const normalizedEmail = normalizeEmail(email);

    try {
        await nextAuthSignIn("email", {
            email: normalizedEmail,
            redirect: false,
        });
        return true;
    } catch (error: unknown) {
        console.error('[LOGIN_CODE_ERROR]', error);
        throw new Error("Failed to send code. Please check your email.");
    }
}

export async function loginWithPassword(data: { email?: string; password?: string }) {
    try {
        await nextAuthSignIn("credentials", {
            email: data.email,
            password: data.password,
            redirect: false,
        });
        return true;
    } catch (error: unknown) {
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
    const normalizedEmail = normalizeEmail(email);
    const hashedToken = crypto
        .createHash("sha256")
        .update(`${token}${process.env.AUTH_SECRET}`)
        .digest("hex");

    const vt = await prisma.verificationToken.findFirst({
        where: { 
            identifier: normalizedEmail, 
            token: hashedToken, 
            expires: { gt: new Date() } 
        }
    });
    
    if (!vt) {
        console.error('[OTP_VALIDATION_ERROR] Token invalid or expired', { email: normalizedEmail });
        throw new Error("Invalid or expired verification code");
    }

    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    
    return { 
        isNewUser: !user?.password,
        fullName: user?.full_name || user?.name
    };
}

/**
 * Completes the login/signup by verifying or setting the password
 */
export async function finalizeLoginWithPassword(email: string, token: string, password: string) {
    const normalizedEmail = normalizeEmail(email);
    // 1. One last verification of the token
    const hashedToken = crypto
        .createHash("sha256")
        .update(`${token}${process.env.AUTH_SECRET}`)
        .digest("hex");

    const vt = await prisma.verificationToken.findFirst({
        where: { identifier: normalizedEmail, token: hashedToken, expires: { gt: new Date() } }
    });
    
    if (!vt) {
        console.error('[FINALIZE_AUTH_ERROR] Verification session expired', { email: normalizedEmail });
        throw new Error("Verification session expired. Please restart.");
    }

    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    
    // 2. If user already has a password, check it. If not, set it (signup).
    if (user?.password) {
        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
            console.error('[FINALIZE_AUTH_ERROR] Incorrect password', { email: normalizedEmail });
            throw new Error("Incorrect password");
        }
    } else {
        const hashedPassword = await bcrypt.hash(password, 10);
        await prisma.user.update({
            where: { email: normalizedEmail },
            data: { 
                password: hashedPassword,
                emailVerified: new Date()
            }
        });
    }

    // 3. Construct the NextAuth callback URL
    return `/api/auth/callback/email?email=${encodeURIComponent(normalizedEmail)}&token=${token}&callbackUrl=/onboarding`;
}

export async function signOut() {
    try {
        await nextAuthSignOut();
        revalidatePath('/');
        return true;
    } catch (error: unknown) {
        if (error instanceof Error && error.message?.includes("NEXT_REDIRECT")) throw error;
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
    } catch (error: unknown) {
        console.error('[GET_CURRENT_USER_ERROR]', error);
        throw new Error('Failed to fetch profile');
    }
}
export async function updateCurrentUserProfile(data: { full_name?: string; avatar_url?: string; bio?: string }) {
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
                bio: typeof data.bio === 'string' ? data.bio : undefined,
            }
        });
        
        revalidatePath("/dashboard", "page");
        revalidatePath("/settings", "page");

        return updated;
    } catch (error: unknown) {
        console.error('[UPDATE_PROFILE_ERROR]', error);
        const message = error instanceof Error ? error.message : 'Failed to update profile';
        throw new Error(message);
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
    } catch (error: unknown) {
        if (error instanceof Error && error.message.includes("NEXT_REDIRECT")) throw error;
        console.error('[DELETE_ACCOUNT_ERROR]', error);
        throw new Error('Failed to delete account');
    }
}

export async function completeOnboarding(userType: 'SINGLE' | 'COUPLE') {
    const user = await getCachedUser();
    if (!user || !user.id) throw new Error('Not authenticated');

    try {
        await prisma.user.update({
            where: { id: user.id },
            data: {
                user_type: userType as string,
                onboarding_completed: true,
            }
        });
        revalidatePath('/');
        return true;
    } catch (error: unknown) {
        console.error('[COMPLETE_ONBOARDING_ERROR]', error);
        const message = error instanceof Error ? error.message : 'Failed to complete onboarding';
        throw new Error(message);
    }
}

/**
 * Sends an OTP code to the current user's email for password change verification
 */
export async function requestCodeForPasswordChange() {
    const user = await getCachedUser();
    if (!user || !user.email) throw new Error('Not authenticated');

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

    // We use a custom hash for the token to store in the DB
    const hashedToken = crypto
        .createHash("sha256")
        .update(`${otp}${process.env.AUTH_SECRET}`)
        .digest("hex");

    try {
        // Store the token
        await prisma.verificationToken.create({
            data: {
                identifier: user.email,
                token: hashedToken,
                expires
            }
        });

        // Send the email (mocking transporter for now as it's typically in the root auth.ts)
        // For production, we'd import and use a transporter here or call an API but for this setup 
        // we'll log it and assume the existence of a sender is configured. 
        // Since we're in a server action, we'll re-use the SMTP configuration logic from root auth.ts
        const nodemailer = await import("nodemailer");
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: Number(process.env.SMTP_PORT),
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASSWORD,
            },
        });

        await transporter.sendMail({
            to: user.email,
            from: process.env.SMTP_FROM,
            subject: `Verification Code: ${otp}`,
            html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; padding: 20px; border-radius: 12px;">
                    <h2 style="color: #FF6B9D; text-align: center;">Change Your Password</h2>
                    <p>Hello,</p>
                    <p>You requested to change your password for your OurLittleWorld account. Please use the verification code below:</p>
                    <div style="background: #FDF2F5; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
                        <span style="font-size: 32px; font-weight: bold; letter-spacing: 4px; color: #FF6B9D;">${otp}</span>
                    </div>
                    <p>This code will expire in 10 minutes.</p>
                    <p>If you didn't request this change, you can safely ignore this email.</p>
                </div>
            `
        });

        return { success: true };
    } catch (error: unknown) {
        console.error('[PASSWORD_CHANGE_REQUEST_ERROR]', error);
        throw new Error("Failed to send verification code. Please try again later.");
    }
}

/**
 * Final step: verify OTP and set new password
 */
export async function updatePasswordWithOtp(otp: string, newPassword: string) {
    const user = await getCachedUser();
    if (!user || !user.email) throw new Error('Not authenticated');

    const hashedToken = crypto
        .createHash("sha256")
        .update(`${otp}${process.env.AUTH_SECRET}`)
        .digest("hex");

    // 1. Verify token
    const vt = await prisma.verificationToken.findFirst({
        where: { 
            identifier: user.email, 
            token: hashedToken, 
            expires: { gt: new Date() } 
        }
    });

    if (!vt) {
        throw new Error("Invalid or expired verification code.");
    }

    try {
        // 2. Hash and update password
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await prisma.user.update({
            where: { email: user.email },
            data: { 
                password: hashedPassword,
                emailVerified: new Date()
            }
        });

        // 3. Clean up the token
        await prisma.verificationToken.delete({
            where: { identifier_token: { identifier: user.email, token: hashedToken } }
        });

        return { success: true };
    } catch (error: unknown) {
        console.error('[PASSWORD_UPDATE_ERROR]', error);
        throw new Error("Failed to update password. Please try again.");
    }
}
