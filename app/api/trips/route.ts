import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { getCachedUser } from "@/lib/auth-cache";
import { createCursorPaginatedResponse, decodePaginationCursor, encodePaginationCursor } from "@/lib/pagination";
import prisma from "@/lib/prisma";
import { getTripDateKey, getTripDayStart } from "@/lib/trip-dates";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type TripStatus = "PLANNED" | "ONGOING" | "COMPLETED";
type TripCursorPayload = {
    createdAt: string;
    id: string;
    startDate: string;
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

function sanitizeTrip<T extends { budget: Prisma.Decimal | number | null; reminder?: { id: string; is_deleted?: boolean } | null }>(trip: T) {
    const { reminder, ...rest } = trip;

    return {
        ...rest,
        budget: trip.budget ? Number(trip.budget.toString()) : 0,
        trip_reminder_enabled: Boolean(reminder && !reminder.is_deleted),
    };
}

export async function GET(request: NextRequest) {
    try {
        const sessionUser = await getCachedUser();

        if (!sessionUser?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const user = await prisma.user.findUnique({
            where: { id: sessionUser.id },
            select: {
                id: true,
                couple_id: true,
            },
        });

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const { searchParams } = new URL(request.url);
        const statusGroup = searchParams.get("statusGroup");
        const limit = Math.min(
            Number.parseInt(searchParams.get("limit") ?? "12", 10) || 12,
            50
        );
        const cursor = decodePaginationCursor<TripCursorPayload>(searchParams.get("cursor"));

        if (!Number.isFinite(limit) || limit <= 0 || limit > 50) {
            return NextResponse.json({ error: "Invalid limit" }, { status: 400 });
        }

        const where: Prisma.TripWhereInput = {
            OR: [
                { user_id: user.id },
                ...(user.couple_id ? [{ couple_id: user.couple_id }] : []),
            ],
        };

        const todayStart = getTripDayStart();

        if (statusGroup === "past") {
            where.end_date = { lt: todayStart };
        } else if (statusGroup === "upcoming") {
            where.end_date = { gte: todayStart };
        }

        const cursorStartDate = cursor ? new Date(cursor.startDate) : null;
        const cursorCreatedAt = cursor ? new Date(cursor.createdAt) : null;
        const cursorFilter: Prisma.TripWhereInput =
            cursor &&
            cursorStartDate &&
            !Number.isNaN(cursorStartDate.getTime()) &&
            cursorCreatedAt &&
            !Number.isNaN(cursorCreatedAt.getTime())
                ? {
                    OR: [
                        {
                            start_date: {
                                lt: cursorStartDate,
                            },
                        },
                        {
                            start_date: cursorStartDate,
                            OR: [
                                {
                                    created_at: {
                                        lt: cursorCreatedAt,
                                    },
                                },
                                {
                                    created_at: cursorCreatedAt,
                                    id: {
                                        lt: cursor.id,
                                    },
                                },
                            ],
                        },
                    ],
                }
                : {};

        const trips = await prisma.trip.findMany({
            where: {
                AND: [where, cursorFilter],
            },
            include: {
                reminder: {
                    select: {
                        id: true,
                        is_deleted: true,
                    },
                },
            },
            orderBy: [{ start_date: "desc" }, { created_at: "desc" }, { id: "desc" }],
            take: limit,
        });

        const resolvedTrips = trips.map((trip) => ({
            ...trip,
            metadata: normalizeTripMetadata(trip.metadata),
            status: resolveTripStatus(trip.start_date, trip.end_date),
        }));

        const statusUpdates = resolvedTrips
            .filter((trip, index) => trip.status !== trips[index]?.status)
            .map((trip) =>
                prisma.trip.update({
                    where: { id: trip.id },
                    data: { status: trip.status },
                })
            );

        if (statusUpdates.length > 0) {
            await prisma.$transaction(statusUpdates);
        }

        const sanitizedTrips = resolvedTrips.map((trip) => sanitizeTrip(trip));
        const lastTrip = trips[trips.length - 1];
        const nextCursor =
            trips.length === limit && lastTrip
                ? encodePaginationCursor({
                    createdAt: lastTrip.created_at.toISOString(),
                    id: lastTrip.id,
                    startDate: lastTrip.start_date.toISOString(),
                })
                : null;

        return NextResponse.json(
            createCursorPaginatedResponse(sanitizedTrips, limit, nextCursor),
            {
                headers: {
                    "Cache-Control": "private, no-cache, no-store, max-age=0, must-revalidate",
                },
            }
        );
    } catch (error: unknown) {
        console.error("Error fetching trips:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to fetch trips" },
            { status: 500 }
        );
    }
}
