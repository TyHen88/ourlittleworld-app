import "server-only";

import prisma from "@/lib/prisma";
import { getCachedUserOrThrow } from "@/lib/auth-cache";

export type AuthActor = {
  id: string;
  couple_id: string | null;
  user_type: string;
};

export async function getAuthActor() {
  const sessionUser = await getCachedUserOrThrow();

  if (!sessionUser.id) {
    throw new Error("Not authenticated");
  }

  const actor = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: {
      id: true,
      couple_id: true,
      user_type: true,
      is_deleted: true,
    },
  });

  if (!actor || actor.is_deleted) {
    throw new Error("Not authenticated");
  }

  return {
    id: actor.id,
    couple_id: actor.couple_id,
    user_type: actor.user_type,
  } satisfies AuthActor;
}

export function isSingleActor(actor: Pick<AuthActor, "couple_id" | "user_type">) {
  return actor.user_type === "SINGLE" || !actor.couple_id;
}

export function canAccessUserScope(
  actor: Pick<AuthActor, "id">,
  userId: string | null | undefined
) {
  return Boolean(userId && actor.id === userId);
}

export function canAccessCoupleScope(
  actor: Pick<AuthActor, "couple_id">,
  coupleId: string | null | undefined
) {
  return Boolean(actor.couple_id && coupleId && actor.couple_id === coupleId);
}
