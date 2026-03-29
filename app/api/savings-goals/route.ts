import { NextRequest, NextResponse } from "next/server";
import { getAuthActor, isSingleActor } from "@/lib/auth-guards";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
    try {
        const actor = await getAuthActor().catch(() => null);

        if (!actor) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id") || searchParams.get("coupleId");

        if (!id) {
            return NextResponse.json({ error: "id or coupleId is required" }, { status: 400 });
        }

        const actorIsSingle = isSingleActor(actor);
        const expectedId = actorIsSingle ? actor.id : actor.couple_id;

        if (!expectedId || id !== expectedId) {
             return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        // Fetch all savings goals for the couple or user
        const goals = await prisma.savingsGoal.findMany({
            where: {
                ...(actorIsSingle ? { user_id: actor.id } : { couple_id: actor.couple_id }),
            },
            orderBy: [
                { is_completed: 'asc' },
                { deadline: 'asc' },
                { created_at: 'desc' },
            ],
        });

        const sanitizedGoals = goals.map((goal) => ({
            ...goal,
            target_amount: goal.target_amount ? Number(goal.target_amount.toString()) : 0,
            current_amount: goal.current_amount ? Number(goal.current_amount.toString()) : 0,
        }));

        return NextResponse.json(
            { data: sanitizedGoals },
            {
                status: 200,
                headers: {
                    "Cache-Control": "private, no-cache, no-store, must-revalidate",
                },
            }
        );
    } catch (error: unknown) {
        console.error("Error fetching savings goals:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to fetch savings goals" },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const actor = await getAuthActor().catch(() => null);

        if (!actor) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const {
            title,
            description,
            targetAmount,
            currentAmount,
            icon,
            color,
            deadline,
            priority,
        } = body;

        const normalizedTitle = typeof title === "string" ? title.trim() : "";
        const parsedTargetAmount = Number.parseFloat(String(targetAmount));
        const parsedCurrentAmount =
            currentAmount === undefined || currentAmount === null || currentAmount === ""
                ? 0
                : Number.parseFloat(String(currentAmount));
        const actorIsSingle = isSingleActor(actor);

        if (!normalizedTitle) {
            return NextResponse.json({ error: "Title is required" }, { status: 400 });
        }

        if (!Number.isFinite(parsedTargetAmount) || parsedTargetAmount <= 0) {
            return NextResponse.json({ error: "Valid targetAmount is required" }, { status: 400 });
        }

        if (!Number.isFinite(parsedCurrentAmount) || parsedCurrentAmount < 0) {
            return NextResponse.json({ error: "currentAmount must be zero or greater" }, { status: 400 });
        }

        if (!actorIsSingle && !actor.couple_id) {
            return NextResponse.json({ error: "Couple not found" }, { status: 400 });
        }

        // Create savings goal
        const goal = await prisma.savingsGoal.create({
            data: {
                user_id: actorIsSingle ? actor.id : null,
                couple_id: actorIsSingle ? null : actor.couple_id,
                title: normalizedTitle,
                description: description || null,
                target_amount: parsedTargetAmount,
                current_amount: parsedCurrentAmount,
                icon: icon || "Target",
                color: color || "purple",
                deadline: deadline ? new Date(deadline) : null,
                priority: priority || "medium",
            },
        });

        const sanitizedGoal = {
            ...goal,
            target_amount: goal.target_amount ? Number(goal.target_amount.toString()) : 0,
            current_amount: goal.current_amount ? Number(goal.current_amount.toString()) : 0,
        };

        return NextResponse.json(
            { success: true, data: sanitizedGoal },
            { status: 201 }
        );
    } catch (error: unknown) {
        console.error("Error creating savings goal:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to create savings goal" },
            { status: 500 }
        );
    }
}
