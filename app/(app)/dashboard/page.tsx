import React from "react";
import prisma from "@/lib/prisma";
import { createClient } from "@/utils/supabase/server";
import { calculateDaysTogether } from "@/lib/utils/date-utilities";
import { DashboardClient } from "./DashboardClient";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
    const supabase = await createClient();

    // Get session/user from Supabase Auth
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
        redirect("/login");
    }

    // Fetch profile and couple data using Prisma 
    // Include members of the couple to correctly display partner information
    const profile = await prisma.profile.findUnique({
        where: { id: user.id },
        include: {
            couple: {
                include: {
                    members: true
                }
            }
        }
    });

    if (!profile) {
        redirect("/login");
    }

    const couple = profile.couple;
    const daysTogether = couple?.start_date
        ? calculateDaysTogether(couple.start_date.toISOString())
        : 0;

    const todayKey = new Date().toISOString().split('T')[0];
    const today = new Date(todayKey);

    const dailyMoodDelegate: any = (prisma as any).dailyMood;

    const todayMessageRow = couple?.id
        ? await dailyMoodDelegate.findFirst({
            where: {
                couple_id: couple.id,
                mood_date: today,
                metadata: { not: null }
            },
            select: {
                metadata: true,
                created_at: true
            },
            orderBy: {
                created_at: "desc"
            }
        })
        : null;

    const heroMessage = (todayMessageRow?.metadata as any)?.message as string | undefined;

    return (
        <DashboardClient
            user={user}
            profile={profile}
            couple={couple}
            daysTogether={daysTogether}
            heroMessage={heroMessage}
        />
    );
}
