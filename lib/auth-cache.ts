import { auth } from "@/auth";
import { cache } from "react";
import prisma from "@/lib/prisma";

function isDynamicServerUsageError(error: unknown) {
  return (
    error instanceof Error &&
    "digest" in error &&
    error.digest === "DYNAMIC_SERVER_USAGE"
  );
}

export const getCachedUser = cache(async () => {
  try {
    const session = await auth();
    if (!session?.user?.id) return null;

    const dbUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        full_name: true,
        name: true,
        avatar_url: true,
        image: true,
        user_type: true,
        onboarding_completed: true,
        couple_id: true,
        emailVerified: true,
        is_deleted: true,
      },
    });

    if (!dbUser || dbUser.is_deleted) {
      return null;
    }

    return {
      id: dbUser.id,
      email: dbUser.email,
      name: dbUser.full_name ?? dbUser.name ?? session.user.name ?? null,
      image: dbUser.avatar_url ?? dbUser.image ?? session.user.image ?? null,
      full_name: dbUser.full_name,
      avatar_url: dbUser.avatar_url,
      user_type: dbUser.user_type,
      onboarding_completed: dbUser.onboarding_completed,
      couple_id: dbUser.couple_id,
      emailVerified: dbUser.emailVerified,
    };
  } catch (err) {
    if (isDynamicServerUsageError(err)) {
      throw err;
    }

    console.warn('Failed to fetch user from session:', err);
    return null;
  }
});

export const getCachedUserOrThrow = cache(async () => {
  const user = await getCachedUser();
  if (!user) throw new Error("Not authenticated");
  return user;
});
