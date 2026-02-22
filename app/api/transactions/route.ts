import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: userError } = await supabase.auth.getUser();

        if (userError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Get query parameters
        const { searchParams } = new URL(request.url);
        const coupleId = searchParams.get("coupleId");
        const month = searchParams.get("month"); // Format: "2026-02"
        const category = searchParams.get("category");
        const payer = searchParams.get("payer");

        if (!coupleId) {
            return NextResponse.json({ error: "coupleId is required" }, { status: 400 });
        }

        // Verify user belongs to this couple
        const profile = await prisma.profile.findUnique({
            where: { id: user.id },
            select: { couple_id: true },
        });

        if (!profile || profile.couple_id !== coupleId) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        // Build query filters
        const where: any = {
            couple_id: coupleId,
        };

        // Filter by month if provided
        if (month) {
            const [year, monthNum] = month.split("-");
            const startDate = new Date(parseInt(year), parseInt(monthNum) - 1, 1);
            const endDate = new Date(parseInt(year), parseInt(monthNum), 0, 23, 59, 59);

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

        return NextResponse.json(
            { data: transactions },
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
        const supabase = await createClient();
        const { data: { user }, error: userError } = await supabase.auth.getUser();

        if (userError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { coupleId, amount, category, note, payer, type, transactionDate } = body;

        // Validate required fields
        if (!coupleId || !amount || !category || !payer) {
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

        // Verify user belongs to this couple
        const profile = await prisma.profile.findUnique({
            where: { id: user.id },
            select: { couple_id: true },
        });

        if (!profile || profile.couple_id !== coupleId) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        // Create transaction
        const transaction = await prisma.transaction.create({
            data: {
                couple_id: coupleId,
                amount: parseFloat(amount),
                category,
                note: note || null,
                payer: payer.toUpperCase(),
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

        return NextResponse.json(
            { success: true, data: transaction },
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
