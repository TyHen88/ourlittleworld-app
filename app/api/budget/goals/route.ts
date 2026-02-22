import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import prisma from "@/lib/prisma";

export async function PUT(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: userError } = await supabase.auth.getUser();

        if (userError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { coupleId, monthlyTotal, hisBudget, hersBudget, sharedBudget } = body;

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

        // Get current couple data
        const couple = await prisma.couple.findUnique({
            where: { id: coupleId },
        });

        if (!couple) {
            return NextResponse.json({ error: "Couple not found" }, { status: 404 });
        }

        // Get current month in YYYY-MM format
        const currentMonth = new Date().toISOString().slice(0, 7);

        // Create or update budget for current month
        const budget = await prisma?.budget?.upsert({
            where: {
                couple_id_month: {
                    couple_id: coupleId,
                    month: currentMonth,
                },
            },
            update: {
                monthly_total: monthlyTotal || 2000,
                his_budget: hisBudget || 600,
                hers_budget: hersBudget || 500,
                shared_budget: sharedBudget || 900,
            },
            create: {
                couple_id: coupleId,
                month: currentMonth,
                monthly_total: monthlyTotal || 2000,
                his_budget: hisBudget || 600,
                hers_budget: hersBudget || 500,
                shared_budget: sharedBudget || 900,
            },
        });

        return NextResponse.json(
            {
                success: true,
                data: {
                    monthly_total: budget.monthly_total,
                    his_budget: budget.his_budget,
                    hers_budget: budget.hers_budget,
                    shared_budget: budget.shared_budget,
                },
                message: "Budget updated successfully"
            },
            { status: 200 }
        );
    } catch (error: any) {
        console.error("Error updating budget goals:", error);
        return NextResponse.json(
            { error: error.message || "Failed to update budget goals" },
            { status: 500 }
        );
    }
}
