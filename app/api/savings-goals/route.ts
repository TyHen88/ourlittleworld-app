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

        const { searchParams } = new URL(request.url);
        const coupleId = searchParams.get("coupleId");

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

        // Fetch all savings goals for the couple
        const goals = await (prisma as any).savingsGoal.findMany({
            where: {
                couple_id: coupleId,
            },
            orderBy: [
                { is_completed: 'asc' },
                { deadline: 'asc' },
                { created_at: 'desc' },
            ],
        });

        return NextResponse.json(
            { data: goals },
            {
                status: 200,
                headers: {
                    "Cache-Control": "private, no-cache, no-store, must-revalidate",
                },
            }
        );
    } catch (error: any) {
        console.error("Error fetching savings goals:", error);
        return NextResponse.json(
            { error: error.message || "Failed to fetch savings goals" },
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
        const {
            coupleId,
            title,
            description,
            targetAmount,
            currentAmount,
            icon,
            color,
            deadline,
            priority,
        } = body;

        // Validate required fields
        if (!coupleId || !title || !targetAmount) {
            return NextResponse.json(
                { error: "Missing required fields" },
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

        // Create savings goal
        const goal = await (prisma as any).savingsGoal.create({
            data: {
                couple_id: coupleId,
                title,
                description: description || null,
                target_amount: parseFloat(targetAmount),
                current_amount: currentAmount ? parseFloat(currentAmount) : 0,
                icon: icon || "Target",
                color: color || "purple",
                deadline: deadline ? new Date(deadline) : null,
                priority: priority || "medium",
            },
        });

        return NextResponse.json(
            { success: true, data: goal },
            { status: 201 }
        );
    } catch (error: any) {
        console.error("Error creating savings goal:", error);
        return NextResponse.json(
            { error: error.message || "Failed to create savings goal" },
            { status: 500 }
        );
    }
}
