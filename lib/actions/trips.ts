"use server";

import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { getCachedUser } from "@/lib/auth-cache";
import { revalidatePath } from "next/cache";

export async function getTrips() {
    const sessionUser = await getCachedUser();
    if (!sessionUser || !sessionUser.id) throw new Error('Not authenticated');

    const user = await prisma.user.findUnique({
        where: { id: sessionUser.id },
        include: { couple: true }
    });

    if (!user) throw new Error('User not found');

    const trips = await prisma.trip.findMany({
        where: {
            OR: [
                { user_id: user.id },
                ...(user.couple_id ? [{ couple_id: user.couple_id }] : [])
            ] as Prisma.TripWhereInput[]
        },
        orderBy: { start_date: 'desc' },
        include: {
            transactions: true
        }
    });

    // Sanitize trips for Next.js 13 Client Components (Decimal to Number)
    const sanitizedTrips = trips.map((trip) => ({
        ...trip,
        budget: trip.budget ? Number(trip.budget.toString()) : 0,
        transactions: (trip.transactions || []).map((t) => ({
            ...t,
            amount: t.amount ? Number(t.amount.toString()) : 0,
        })),
    }));

    return sanitizedTrips;
}

export async function createTrip(data: {
    title: string;
    destination: string;
    startDate: Date;
    endDate: Date;
    budget?: number;
    notes?: string;
    isSolo?: boolean;
}) {
    const sessionUser = await getCachedUser();
    if (!sessionUser || !sessionUser.id) throw new Error('Not authenticated');

    const user = await prisma.user.findUnique({
        where: { id: sessionUser.id }
    });

    if (!user) throw new Error('User not found');

    const trip = await prisma.trip.create({
        data: {
            title: data.title,
            destination: data.destination,
            start_date: data.startDate,
            end_date: data.endDate,
            budget: data.budget,
            notes: data.notes,
            user_id: data.isSolo ? user.id : (user.user_type === 'SINGLE' ? user.id : null),
            couple_id: (!data.isSolo && user.user_type === 'COUPLE') ? user.couple_id : null,
            status: 'PLANNED'
        }
    });

    const sanitizedTrip = {
        ...trip,
        budget: trip.budget ? Number(trip.budget.toString()) : 0,
        transactions: [],
    };

    revalidatePath('/trips');
    revalidatePath('/dashboard');
    return { success: true, data: sanitizedTrip };
}

export async function deleteTrip(id: string) {
    const sessionUser = await getCachedUser();
    if (!sessionUser || !sessionUser.id) throw new Error('Not authenticated');

    await prisma.trip.delete({
        where: { id }
    });

    revalidatePath('/trips');
    return { success: true };
}
