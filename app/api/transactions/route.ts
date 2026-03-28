import { Payer, Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { getCachedUser } from "@/lib/auth-cache";
import prisma from "@/lib/prisma";
import {
    createCursorPaginatedResponse,
    decodePaginationCursor,
    encodePaginationCursor,
} from "@/lib/pagination";

type TransactionCursorPayload = {
    createdAt: string;
    id: string;
    transactionDate: string;
};

function sanitizeTransactions<T extends { amount: Prisma.Decimal | number | null }>(transactions: T[]) {
    return transactions.map((transaction) => ({
        ...transaction,
        amount: transaction.amount ? Number(transaction.amount.toString()) : 0,
    }));
}

export async function GET(request: NextRequest) {
    try {
        const user = await getCachedUser();

        if (!user || user.id === undefined) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Get query parameters
        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id") || searchParams.get("coupleId");
        const month = searchParams.get("month"); // Format: "2026-02"
        const period = searchParams.get("period") || "month";
        const date = searchParams.get("date");
        const category = searchParams.get("category");
        const payer = searchParams.get("payer");
        const cursor = decodePaginationCursor<TransactionCursorPayload>(searchParams.get("cursor"));
        const requestedLimit = searchParams.get("limit") ?? searchParams.get("pageSize");
        const limit = requestedLimit
            ? Math.min(Number.parseInt(requestedLimit, 10) || 20, 50)
            : null;

        if (!id) {
            return NextResponse.json({ error: "id or coupleId is required" }, { status: 400 });
        }

        if (limit !== null && (!Number.isFinite(limit) || limit <= 0 || limit > 50)) {
            return NextResponse.json({ error: "Invalid limit" }, { status: 400 });
        }

        // Verify user belongs to this couple or is the user themselves
        const dbUser = await prisma.user.findUnique({
            where: { id: user.id },
            select: { couple_id: true },
        });

        if (!dbUser || (dbUser.couple_id !== id && user.id !== id)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        // Build query filters
        const where: Prisma.TransactionWhereInput = {};
        if (dbUser.couple_id === id) {
            where.couple_id = id;
        } else {
            where.user_id = id;
        }

        const baseDate = date ? new Date(date) : new Date();

        if (month || period || date) {
            let startDate: Date;
            let endDate: Date;

            if (month) {
                const [year, monthNum] = month.split("-");
                startDate = new Date(parseInt(year), parseInt(monthNum) - 1, 1);
                endDate = new Date(parseInt(year), parseInt(monthNum), 0, 23, 59, 59, 999);
            } else if (period === "day") {
                startDate = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate(), 0, 0, 0, 0);
                endDate = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate(), 23, 59, 59, 999);
            } else if (period === "year") {
                startDate = new Date(baseDate.getFullYear(), 0, 1, 0, 0, 0, 0);
                endDate = new Date(baseDate.getFullYear(), 11, 31, 23, 59, 59, 999);
            } else {
                startDate = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1, 0, 0, 0, 0);
                endDate = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 0, 23, 59, 59, 999);
            }

            where.transaction_date = {
                gte: startDate,
                lte: endDate,
            };
        }

        // Filter by category if provided
        if (category) {
            where.category = category;
        }

        // Filter by payer if provided
        if (payer) {
            const normalizedPayer = payer.toUpperCase();

            if (
                normalizedPayer === "HIS" ||
                normalizedPayer === "HERS" ||
                normalizedPayer === "SHARED"
            ) {
                where.payer = normalizedPayer as Payer;
            }
        }

        const cursorTransactionDate = cursor ? new Date(cursor.transactionDate) : null;
        const cursorCreatedAt = cursor ? new Date(cursor.createdAt) : null;
        const cursorFilter: Prisma.TransactionWhereInput =
            cursor &&
            cursorTransactionDate &&
            !Number.isNaN(cursorTransactionDate.getTime()) &&
            cursorCreatedAt &&
            !Number.isNaN(cursorCreatedAt.getTime())
                ? {
                    OR: [
                        {
                            transaction_date: {
                                lt: cursorTransactionDate,
                            },
                        },
                        {
                            transaction_date: cursorTransactionDate,
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

        // Fetch transactions with creator info
        const transactions = await prisma.transaction.findMany({
            where: {
                ...where,
                ...cursorFilter,
            },
            include: {
                creator: {
                    select: {
                        id: true,
                        full_name: true,
                        avatar_url: true,
                    },
                },
            },
            orderBy: [{ transaction_date: "desc" }, { created_at: "desc" }, { id: "desc" }],
            ...(limit ? { take: limit } : {}),
        });

        const sanitizedTransactions = sanitizeTransactions(transactions);
        const lastTransaction = transactions[transactions.length - 1];
        const nextCursor =
            limit && transactions.length === limit && lastTransaction?.transaction_date
                ? encodePaginationCursor({
                    createdAt: lastTransaction.created_at.toISOString(),
                    id: lastTransaction.id,
                    transactionDate: lastTransaction.transaction_date.toISOString(),
                })
                : null;

        return NextResponse.json(
            createCursorPaginatedResponse(
                sanitizedTransactions,
                limit ?? sanitizedTransactions.length,
                nextCursor
            ),
            {
                status: 200,
                headers: {
                    "Cache-Control": "private, no-cache, no-store, must-revalidate",
                },
            }
        );
    } catch (error: unknown) {
        console.error("Error fetching transactions:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to fetch transactions" },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const user = await getCachedUser();

        if (!user || user.id === undefined) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { coupleId, userId, id, amount, category, note, payer, type, transactionDate } = body;
        const targetId = id || coupleId || userId;

        // Validate required fields
        if (!targetId || !amount || !category) {
            return NextResponse.json(
                { error: "Missing required fields" },
                { status: 400 }
            );
        }

        // Validate type if provided
        if (type && type !== "INCOME" && type !== "EXPENSE") {
            return NextResponse.json(
                { error: "Invalid transaction type" },
                { status: 400 }
            );
        }

        // Verify user belongs to this couple or is the user themselves
        const dbUser = await prisma.user.findUnique({
            where: { id: user.id },
            select: { couple_id: true },
        });

        if (!dbUser || (dbUser.couple_id !== targetId && user.id !== targetId)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const isCouple = dbUser.couple_id === targetId;

        // Create transaction
        const transaction = await prisma.transaction.create({
            data: {
                couple_id: isCouple ? targetId : null,
                user_id: !isCouple ? targetId : null,
                amount: parseFloat(amount),
                category,
                note: note || null,
                payer:
                    payer === "HIS" || payer === "HERS" || payer === "SHARED"
                        ? payer
                        : "SHARED",
                type: type || "EXPENSE",
                created_by: user.id,
                transaction_date: transactionDate ? new Date(transactionDate) : new Date(),
            },
            include: {
                creator: {
                    select: {
                        id: true,
                        full_name: true,
                        avatar_url: true,
                    },
                },
            },
        });

        const sanitizedTransaction = {
            ...transaction,
            amount: transaction.amount ? Number(transaction.amount.toString()) : 0,
        };

        return NextResponse.json(
            { success: true, data: sanitizedTransaction },
            { status: 201 }
        );
    } catch (error: unknown) {
        console.error("Error creating transaction:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to create transaction" },
            { status: 500 }
        );
    }
}
