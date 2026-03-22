import { NextRequest, NextResponse } from "next/server";
import { getCachedUser } from "@/lib/auth-cache";
import prisma from "@/lib/prisma";

export async function PUT(request: NextRequest) {
    try {
        const user = await getCachedUser();

        if (!user || user.id === undefined) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { id, coupleId, monthlyTotal, hisBudget, hersBudget, sharedBudget } = body;
        const targetId = id || coupleId;

        if (!targetId) {
            return NextResponse.json({ error: "target ID is required" }, { status: 400 });
        }

        // Verify user belongs to this couple or is this user
        const dbUser = await prisma.user.findUnique({
            where: { id: user.id },
            select: { couple_id: true },
        });

        if (!dbUser || (dbUser.couple_id !== targetId && user.id !== targetId)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const isCouple = dbUser.couple_id === targetId;
        
        if (isCouple) {
            // Get current couple data
            const couple = await prisma.couple.findUnique({
                where: { id: targetId },
            });

            if (!couple) {
                return NextResponse.json({ error: "Couple not found" }, { status: 404 });
            }
        }

        // Get current month in YYYY-MM format
        const currentMonth = new Date().toISOString().slice(0, 7);

        // Create or update budget for current month
        const budget = await prisma.budget.upsert({
            // @ts-ignore
            where: isCouple ? {
                couple_id_month: {
                    couple_id: targetId,
                    month: currentMonth,
                },
            } : {
                // @ts-ignore
                user_id_month: {
                    user_id: targetId,
                    month: currentMonth,
                },
            },
            update: {
                monthly_total: parseFloat(monthlyTotal),
                his_budget: parseFloat(hisBudget),
                hers_budget: parseFloat(hersBudget),
                shared_budget: parseFloat(sharedBudget),
            },
            create: {
                couple_id: isCouple ? targetId : null,
                // @ts-ignore
                user_id: isCouple ? null : targetId,
                month: currentMonth,
                monthly_total: parseFloat(monthlyTotal),
                his_budget: parseFloat(hisBudget),
                hers_budget: parseFloat(hersBudget),
                shared_budget: parseFloat(sharedBudget),
            },
        });

        return NextResponse.json(
            {
                success: true,
                data: {
                    monthly_total: budget.monthly_total ? Number(budget.monthly_total.toString()) : 0,
                    his_budget: budget.his_budget ? Number(budget.his_budget.toString()) : 0,
                    hers_budget: budget.hers_budget ? Number(budget.hers_budget.toString()) : 0,
                    shared_budget: budget.shared_budget ? Number(budget.shared_budget.toString()) : 0,
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
