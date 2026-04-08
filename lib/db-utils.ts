import prisma from "@/lib/prisma";

export async function getCachedProfile(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      couple_id: true,
      full_name: true,
      avatar_url: true,
      bio: true,
      email: true,
      user_type: true,
      onboarding_completed: true,
      created_at: true,
    },
  });
}

export async function getCachedProfileWithCouple(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      couple_id: true,
      full_name: true,
      avatar_url: true,
      bio: true,
      email: true,
      user_type: true,
      onboarding_completed: true,
      created_at: true,
      couple: {
        select: {
          id: true,
          couple_name: true,
          start_date: true,
          partner_1_nickname: true,
          partner_2_nickname: true,
          invite_code: true,
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
}

export async function batchGetProfiles(userIds: string[]) {
  if (userIds.length === 0) return [];
  
  return prisma.user.findMany({
    where: { id: { in: userIds } },
    select: {
      id: true,
      full_name: true,
      avatar_url: true,
    },
  });
}
