"use server";

import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { getCachedUser } from "@/lib/auth-cache";
import { revalidatePath } from "next/cache";
import { notifyUsers } from "@/lib/notifications";
import { formatTripDateLabel, getTripNotificationRecipientIds } from "@/lib/push-events";
import { syncTripReminder } from "@/lib/reminder-service";
import { createTripDate, getTripDateKey } from "@/lib/trip-dates";

type TripStatus = "PLANNED" | "ONGOING" | "COMPLETED";

type TripMutationInput = {
    budget?: number;
    budgetCurrency: "USD" | "KHR";
    destination: string;
    endDate: string;
    isSolo?: boolean;
    notes?: string;
    remindDayBefore?: boolean;
    startDate: string;
    title: string;
};

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

function sanitizeTrip<
    T extends {
        budget: Prisma.Decimal | number | null;
        transactions?: Array<{ amount: Prisma.Decimal | number | null }>;
        reminder?: { id: string; is_deleted?: boolean } | null;
    }
>(trip: T) {
    const { reminder, ...rest } = trip;

    return {
        ...rest,
        budget: trip.budget ? Number(trip.budget.toString()) : 0,
        transactions: (trip.transactions || []).map((transaction) => ({
            ...transaction,
            amount: transaction.amount ? Number(transaction.amount.toString()) : 0,
        })),
        trip_reminder_enabled: Boolean(reminder && !reminder.is_deleted),
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
    const startDate = createTripDate(data.startDate);
    const endDate = createTripDate(data.endDate);
    const status = resolveTripStatus(startDate, endDate);

    const trip = await prisma.trip.create({
        data: {
            title: data.title,
            destination: data.destination,
            start_date: startDate,
            end_date: endDate,
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

    await syncTripReminder({
        actorId: user.id,
        enabled: Boolean(data.remindDayBefore),
        trip: {
            id: trip.id,
            couple_id: trip.couple_id,
            user_id: trip.user_id,
            title: trip.title,
            destination: trip.destination,
            start_date: trip.start_date,
        },
    });

    const sanitizedTrip = sanitizeTrip({
        ...trip,
        transactions: [],
        reminder: data.remindDayBefore ? { id: "enabled" } : null,
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

        await notifyUsers({
            userIds: recipientIds,
            actorUserId: user.id,
            coupleId: trip.couple_id,
            type: "TRIP_CREATED",
            title: `${creatorName} added a new trip`,
            body: `${tripLabel} starts on ${tripDate} in ${trip.destination}.`,
            detail: `${creatorName} planned ${tripLabel} for ${tripDate}${trip.notes ? `. Notes: ${trip.notes}` : "."}`,
            url: "/trips",
            push: {
                tag: `trip-created-${trip.id}`,
                options: {
                    TTL: 10 * 60,
                    urgency: "normal",
                },
            },
        });
    }

    revalidatePath('/trips');
    revalidatePath('/dashboard');
    revalidatePath('/reminders');
    return { success: true, data: sanitizedTrip };
}

export async function updateTrip(id: string, data: TripMutationInput) {
    const user = await getAuthenticatedTripUser();
    const startDate = createTripDate(data.startDate);
    const endDate = createTripDate(data.endDate);
    const status = resolveTripStatus(startDate, endDate);

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
            start_date: startDate,
            end_date: endDate,
            budget: data.budget,
            notes: data.notes,
            metadata: {
                ...normalizeTripMetadata(existingTrip.metadata),
                budgetCurrency: data.budgetCurrency,
            },
            status,
        },
    });

    await syncTripReminder({
        actorId: user.id,
        enabled: Boolean(data.remindDayBefore),
        trip: {
            id: trip.id,
            couple_id: trip.couple_id,
            user_id: trip.user_id,
            title: trip.title,
            destination: trip.destination,
            start_date: trip.start_date,
        },
    });

    const sanitizedTrip = sanitizeTrip({
        ...trip,
        transactions: [],
        reminder: data.remindDayBefore ? { id: "enabled" } : null,
    });

    revalidatePath('/trips');
    revalidatePath('/dashboard');
    revalidatePath('/reminders');
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
    revalidatePath('/reminders');
    return { success: true };
}
