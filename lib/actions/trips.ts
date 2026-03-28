"use server";

import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { getCachedUser } from "@/lib/auth-cache";
import { revalidatePath } from "next/cache";
import { sendPushNotificationToUsers } from "@/lib/push";
import { formatTripDateLabel, getTripNotificationRecipientIds } from "@/lib/push-events";

const TRIP_TIME_ZONE = "Asia/Phnom_Penh";
const tripDateFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: TRIP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
});

type TripStatus = "PLANNED" | "ONGOING" | "COMPLETED";

type TripMutationInput = {
    budget?: number;
    budgetCurrency: "USD" | "KHR";
    destination: string;
    endDate: Date;
    isSolo?: boolean;
    notes?: string;
    startDate: Date;
    title: string;
};

function getTripDateKey(value: Date) {
    const parts = tripDateFormatter.formatToParts(value);
    const year = parts.find((part) => part.type === "year")?.value;
    const month = parts.find((part) => part.type === "month")?.value;
    const day = parts.find((part) => part.type === "day")?.value;

    if (!year || !month || !day) {
        throw new Error("Unable to format trip date");
    }

    return `${year}-${month}-${day}`;
}

function resolveTripStatus(startDate: Date, endDate: Date, now = new Date()): TripStatus {
    const todayKey = getTripDateKey(now);
    const startKey = getTripDateKey(startDate);
    const endKey = getTripDateKey(endDate);

    if (endKey < todayKey) {
        return "COMPLETED";
    }

    if (startKey <= todayKey && endKey >= todayKey) {
        return "ONGOING";
    }

    return "PLANNED";
}

function normalizeTripMetadata(metadata: Prisma.JsonValue | null | undefined) {
    if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
        return {};
    }

    return { ...(metadata as Record<string, Prisma.JsonValue>) };
}

async function getAuthenticatedTripUser() {
    const sessionUser = await getCachedUser();
    if (!sessionUser || !sessionUser.id) throw new Error('Not authenticated');

    const user = await prisma.user.findUnique({
        where: { id: sessionUser.id },
        include: { couple: true }
    });

    if (!user) throw new Error('User not found');

    return user;
}

function getTripAccessWhere(user: { id: string; couple_id: string | null }) {
    return {
        OR: [
            { user_id: user.id },
            ...(user.couple_id ? [{ couple_id: user.couple_id }] : [])
        ] as Prisma.TripWhereInput[]
    };
}

function sanitizeTrip<T extends { budget: Prisma.Decimal | number | null; transactions?: Array<{ amount: Prisma.Decimal | number | null }> }>(trip: T) {
    return {
        ...trip,
        budget: trip.budget ? Number(trip.budget.toString()) : 0,
        transactions: (trip.transactions || []).map((transaction) => ({
            ...transaction,
            amount: transaction.amount ? Number(transaction.amount.toString()) : 0,
        })),
    };
}

export async function getTrips() {
    const user = await getAuthenticatedTripUser();

    const trips = await prisma.trip.findMany({
        where: getTripAccessWhere(user),
        orderBy: { start_date: 'desc' },
        include: {
            transactions: true
        }
    });

    const tripsWithResolvedStatus = trips.map((trip) => ({
        ...trip,
        status: resolveTripStatus(trip.start_date, trip.end_date),
    }));

    const statusUpdates = tripsWithResolvedStatus
        .filter((trip, index) => trip.status !== trips[index]?.status)
        .map((trip) =>
            prisma.trip.update({
                where: { id: trip.id },
                data: { status: trip.status },
            }),
        );

    if (statusUpdates.length > 0) {
        await prisma.$transaction(statusUpdates);
    }

    const sanitizedTrips = tripsWithResolvedStatus.map((trip) => sanitizeTrip(trip));

    return sanitizedTrips;
}

export async function createTrip(data: TripMutationInput) {
    const user = await getAuthenticatedTripUser();
    const status = resolveTripStatus(data.startDate, data.endDate);

    const trip = await prisma.trip.create({
        data: {
            title: data.title,
            destination: data.destination,
            start_date: data.startDate,
            end_date: data.endDate,
            budget: data.budget,
            notes: data.notes,
            metadata: {
                budgetCurrency: data.budgetCurrency,
            },
            user_id: data.isSolo ? user.id : (user.user_type === 'SINGLE' ? user.id : null),
            couple_id: (!data.isSolo && user.user_type === 'COUPLE') ? user.couple_id : null,
            status,
        }
    });

    const sanitizedTrip = sanitizeTrip({
        ...trip,
        transactions: [],
    });

    const recipientIds = await getTripNotificationRecipientIds({
        coupleId: trip.couple_id,
        userId: trip.user_id,
        excludeUserId: user.id,
    });

    if (recipientIds.length > 0) {
        const creatorName = user.full_name?.trim() || "Your partner";
        const tripDate = formatTripDateLabel(trip.start_date);
        const tripLabel = trip.title?.trim() || trip.destination;

        await sendPushNotificationToUsers({
            userIds: recipientIds,
            payload: {
                title: `${creatorName} added a new trip`,
                body: `${tripLabel} starts on ${tripDate} in ${trip.destination}.`,
                url: "/trips",
                tag: `trip-created-${trip.id}`,
            },
            options: {
                TTL: 10 * 60,
                urgency: "normal",
            },
        });
    }

    revalidatePath('/trips');
    revalidatePath('/dashboard');
    return { success: true, data: sanitizedTrip };
}

export async function updateTrip(id: string, data: TripMutationInput) {
    const user = await getAuthenticatedTripUser();
    const status = resolveTripStatus(data.startDate, data.endDate);

    const existingTrip = await prisma.trip.findFirst({
        where: {
            id,
            ...getTripAccessWhere(user),
        },
    });

    if (!existingTrip) {
        throw new Error('Trip not found');
    }

    const trip = await prisma.trip.update({
        where: { id },
        data: {
            title: data.title,
            destination: data.destination,
            start_date: data.startDate,
            end_date: data.endDate,
            budget: data.budget,
            notes: data.notes,
            metadata: {
                ...normalizeTripMetadata(existingTrip.metadata),
                budgetCurrency: data.budgetCurrency,
            },
            status,
        },
    });

    const sanitizedTrip = sanitizeTrip({
        ...trip,
        transactions: [],
    });

    revalidatePath('/trips');
    revalidatePath('/dashboard');
    return { success: true, data: sanitizedTrip };
}

export async function deleteTrip(id: string) {
    const user = await getAuthenticatedTripUser();

    const existingTrip = await prisma.trip.findFirst({
        where: {
            id,
            ...getTripAccessWhere(user),
        },
    });

    if (!existingTrip) {
        throw new Error('Trip not found');
    }

    await prisma.trip.delete({
        where: { id }
    });

    revalidatePath('/trips');
    revalidatePath('/dashboard');
    return { success: true };
}
