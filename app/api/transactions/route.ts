import { NextRequest, NextResponse } from "next/server";
import { getCachedUser } from "@/lib/auth-cache";
import prisma from "@/lib/prisma";

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

        if (!id) {
            return NextResponse.json({ error: "id or coupleId is required" }, { status: 400 });
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
        const where: any = {};
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
            where.payer = payer.toUpperCase();
        }

        // Fetch transactions with creator info
        const transactions = await prisma.transaction.findMany({
            where,
            include: {
                creator: {
                    select: {
                        id: true,
                        full_name: true,
                        avatar_url: true,
                    },
                },
            },
            orderBy: {
                transaction_date: "desc",
            },
        });

        const sanitizedTransactions = transactions.map((t: any) => ({
            ...t,
            amount: t.amount ? Number(t.amount.toString()) : 0,
        }));

        return NextResponse.json(
            { data: sanitizedTransactions },
            {
                status: 200,
                headers: {
                    "Cache-Control": "private, no-cache, no-store, must-revalidate",
                },
            }
        );
    } catch (error: any) {
        console.error("Error fetching transactions:", error);
        return NextResponse.json(
            { error: error.message || "Failed to fetch transactions" },
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
                payer: (payer || "SHARED").toUpperCase(),
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
    } catch (error: any) {
        console.error("Error creating transaction:", error);
        return NextResponse.json(
            { error: error.message || "Failed to create transaction" },
            { status: 500 }
        );
    }
}
