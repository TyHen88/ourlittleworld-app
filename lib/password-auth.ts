import "server-only";

import bcrypt from "bcryptjs";

import prisma from "@/lib/prisma";

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function isValidPassword(password: string) {
  return password.length >= 8;
}

type PasswordLoginSuccess = {
  success: true;
  normalizedEmail: string;
  onboardingCompleted: boolean;
};

type PasswordLoginFailure = {
  success: false;
  error: string;
  status: 400 | 500;
};

export async function verifyPasswordLogin(data: {
  email?: string;
  password?: string;
}): Promise<PasswordLoginSuccess | PasswordLoginFailure> {
  const normalizedEmail =
    typeof data.email === "string" ? normalizeEmail(data.email) : "";
  const password = typeof data.password === "string" ? data.password : "";

  if (!normalizedEmail) {
    return {
      success: false,
      error: "Please enter your email address.",
      status: 400,
    };
  }

  if (!isValidEmail(normalizedEmail)) {
    return {
      success: false,
      error: "Please enter a valid email address.",
      status: 400,
    };
  }

  if (!password) {
    return {
      success: false,
      error: "Please enter your password.",
      status: 400,
    };
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: {
        id: true,
        password: true,
        is_deleted: true,
        onboarding_completed: true,
      },
    });

    if (!user || !user.password || user.is_deleted) {
      return {
        success: false,
        error: "Invalid email or password",
        status: 400,
      };
    }

    const isValid = await bcrypt.compare(password, user.password);

    if (!isValid) {
      return {
        success: false,
        error: "Invalid email or password",
        status: 400,
      };
    }

    return {
      success: true,
      normalizedEmail,
      onboardingCompleted: Boolean(user.onboarding_completed),
    };
  } catch (error) {
    console.error("[VERIFY_PASSWORD_LOGIN_ERROR]", error);

    return {
      success: false,
      error: "Authentication failed",
      status: 500,
    };
  }
}

type PasswordChangeSuccess = {
  success: true;
};

type PasswordChangeFailure = {
  success: false;
  error: string;
  status: 400 | 401 | 404 | 500;
};

export async function changePasswordForEmail(data: {
  email?: string | null;
  currentPassword?: string;
  newPassword?: string;
}): Promise<PasswordChangeSuccess | PasswordChangeFailure> {
  const email = typeof data.email === "string" ? normalizeEmail(data.email) : "";
  const currentPassword =
    typeof data.currentPassword === "string" ? data.currentPassword : "";
  const newPassword = typeof data.newPassword === "string" ? data.newPassword : "";

  if (!email) {
    return {
      success: false,
      error: "Not authenticated",
      status: 401,
    };
  }

  if (!isValidPassword(newPassword)) {
    return {
      success: false,
      error: "New password must be at least 8 characters.",
      status: 400,
    };
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        email: true,
        password: true,
      },
    });

    if (!user) {
      return {
        success: false,
        error: "User not found",
        status: 404,
      };
    }

    if (user.password) {
      if (!currentPassword) {
        return {
          success: false,
          error: "Please enter your current password.",
          status: 400,
        };
      }

      const isValid = await bcrypt.compare(currentPassword, user.password);
      if (!isValid) {
        return {
          success: false,
          error: "Current password is incorrect.",
          status: 400,
        };
      }
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { email },
      data: {
        password: hashedPassword,
      },
    });

    return { success: true };
  } catch (error) {
    console.error("[CHANGE_PASSWORD_ERROR]", error);

    return {
      success: false,
      error: "Failed to update password",
      status: 500,
    };
  }
}
