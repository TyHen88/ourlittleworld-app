import prisma from "@/lib/prisma";
import { cache } from "react";

export const getCachedProfile = cache(async (userId: string) => {
  return prisma.profile.findUnique({
    where: { id: userId },
    select: {
      id: true,
      couple_id: true,
      full_name: true,
      avatar_url: true,
      email: true,
    },
  });
});

export const getCachedProfileWithCouple = cache(async (userId: string) => {
  return prisma.profile.findUnique({
    where: { id: userId },
    select: {
      id: true,
      couple_id: true,
      full_name: true,
      avatar_url: true,
      email: true,
      couple: {
        include: {
          members: {
            select: {
              id: true,
              full_name: true,
              avatar_url: true,
            },
          },
        },
      },
    },
  });
});

export async function batchGetProfiles(userIds: string[]) {
  if (userIds.length === 0) return [];
  
  return prisma.profile.findMany({
    where: { id: { in: userIds } },
    select: {
      id: true,
      full_name: true,
      avatar_url: true,
    },
  });
}
