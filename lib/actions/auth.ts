"use server";

import prisma from "@/lib/prisma";
import { signIn as nextAuthSignIn, signOut as nextAuthSignOut } from "@/auth";
import { revalidatePath } from "next/cache";
import { AuthError } from "next-auth";
import { getCachedUser } from "@/lib/auth-cache";
import bcrypt from "bcryptjs";

function normalizeEmail(email: string) {
    return email.trim().toLowerCase();
}

function isValidEmail(email: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPassword(password: string) {
    return password.length >= 8;
}

export async function signUp(email: string, fullName: string, password: string) {
    const normalizedEmail = normalizeEmail(email);
    const normalizedFullName = fullName.trim();

    if (normalizedFullName.length < 2) {
        throw new Error("Please enter your full name.");
    }

    if (!isValidEmail(normalizedEmail)) {
        throw new Error("Please enter a valid email address.");
    }

    if (!isValidPassword(password)) {
        throw new Error("Password must be at least 8 characters.");
    }

    const existingUser = await prisma.user.findUnique({
        where: { email: normalizedEmail }
    });

    if (existingUser && !existingUser.is_deleted) {
        throw new Error("An account with this email already exists. Please sign in.");
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);

        if (existingUser?.is_deleted) {
            await prisma.user.update({
                where: { id: existingUser.id },
                data: {
                    email: normalizedEmail,
                    full_name: normalizedFullName,
                    name: normalizedFullName,
                    password: hashedPassword,
                    emailVerified: new Date(),
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
                    password: hashedPassword,
                    emailVerified: new Date(),
                }
            });
        }

        return true;
    } catch (error: unknown) {
        console.error('[SIGNUP_ERROR]', error);
        const message = error instanceof Error ? error.message : 'Failed to create account';
        throw new Error(message);
    }
}

export async function requestLoginCode(email: string) {
    void email;
    throw new Error("Email code sign-in is disabled. Please sign in with your password.");
}

export async function loginWithPassword(data: { email?: string; password?: string }) {
    const normalizedEmail = typeof data.email === "string" ? normalizeEmail(data.email) : undefined;

    try {
        await nextAuthSignIn("credentials", {
            email: normalizedEmail,
            password: data.password,
            redirect: false,
        });

        if (!normalizedEmail) {
            throw new Error("Please enter your email address.");
        }

        const user = await prisma.user.findUnique({
            where: { email: normalizedEmail },
            select: { onboarding_completed: true }
        });

        return {
            success: true,
            onboardingCompleted: Boolean(user?.onboarding_completed),
        };
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
    void email;
    void token;
    throw new Error("Email verification codes are disabled. Please sign in with your password.");
}

/**
 * Completes the login/signup by verifying or setting the password
 */
export async function finalizeLoginWithPassword(email: string, token: string, password: string) {
    void email;
    void token;
    void password;
    throw new Error("Email verification codes are disabled. Please sign in with your password.");
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
    throw new Error("Password reset by email code is disabled. Change your password from settings using your current password.");
}

/**
 * Final step: verify OTP and set new password
 */
export async function updatePasswordWithOtp(otp: string, newPassword: string) {
    void otp;
    void newPassword;
    throw new Error("Password reset by email code is disabled. Change your password from settings using your current password.");
}

export async function changePassword(currentPassword: string, newPassword: string) {
    const sessionUser = await getCachedUser();
    if (!sessionUser?.email) throw new Error("Not authenticated");

    if (!isValidPassword(newPassword)) {
        throw new Error("New password must be at least 8 characters.");
    }

    const user = await prisma.user.findUnique({
        where: { email: sessionUser.email }
    });

    if (!user) {
        throw new Error("User not found");
    }

    if (user.password) {
        if (!currentPassword) {
            throw new Error("Please enter your current password.");
        }

        const isValid = await bcrypt.compare(currentPassword, user.password);
        if (!isValid) {
            throw new Error("Current password is incorrect.");
        }
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
        where: { email: sessionUser.email },
        data: {
            password: hashedPassword,
            emailVerified: user.emailVerified ?? new Date(),
        }
    });

    return { success: true };
}
