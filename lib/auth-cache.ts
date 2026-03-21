import { auth } from "@/auth";
import { cache } from "react";

export const getCachedUser = cache(async () => {
  try {
    const session = await auth();
    if (!session?.user) return null;
    return session.user;
  } catch (err) {
    console.warn('Failed to fetch user from session:', err);
    return null;
  }
});

export const getCachedUserOrThrow = cache(async () => {
  const user = await getCachedUser();
  if (!user) throw new Error("Not authenticated");
  return user;
});
