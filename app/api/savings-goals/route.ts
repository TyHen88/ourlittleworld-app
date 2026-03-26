import { NextRequest, NextResponse } from "next/server";
import { getCachedUser } from "@/lib/auth-cache";
import prisma from "@/lib/prisma";
import { buildGoalProfile, generateGoalMilestones, isGoalType } from "@/lib/goals";

export async function GET(request: NextRequest) {
    try {
        const user = await getCachedUser();

        if (!user || user.id === undefined) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id") || searchParams.get("coupleId");

        if (!id) {
            return NextResponse.json({ error: "id or coupleId is required" }, { status: 400 });
        }

        // Verify user belongs to this couple or is solo
        // @ts-ignore
        const dbUser = await prisma.user.findUnique({
            where: { id: user.id },
            // @ts-ignore
            select: { couple_id: true, user_type: true },
        });

        if (!dbUser) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const isSingle = (dbUser as any).user_type === 'SINGLE';

        // Check ownership
        if (!isSingle && (dbUser as any).couple_id !== id) {
             const userOwnsId = user.id === id;
             if (!userOwnsId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        // Fetch all savings goals for the couple or user
        const goals = await prisma.savingsGoal.findMany({
            // @ts-ignore
            where: {
                OR: [
                    // @ts-ignore
                    { user_id: id },
                    { couple_id: id }
                ]
            },
            orderBy: [
                { is_completed: 'asc' },
                { deadline: 'asc' },
                { created_at: 'desc' },
            ],
            include: {
                milestones: {
                    orderBy: [
                        { due_at: "asc" },
                        { order_index: "asc" },
                    ],
                },
            },
        });

        const sanitizedGoals = goals.map((g: any) => ({
            ...g,
            target_amount: g.target_amount ? Number(g.target_amount.toString()) : 0,
            current_amount: g.current_amount ? Number(g.current_amount.toString()) : 0,
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
        const user = await getCachedUser();

        if (!user || user.id === undefined) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const {
            userId, // For personal goals
            coupleId,
            title,
            description,
            targetAmount,
            currentAmount,
            profile,
            icon,
            color,
            deadline,
            reminderAt,
            priority,
            type,
        } = body;

        const normalizedType = isGoalType(type) ? type : "SAVINGS";
        if (type && !isGoalType(type)) {
            return NextResponse.json({ error: "Invalid goal type" }, { status: 400 });
        }

        // Verify user belongs to this couple or is solo
        // @ts-ignore
        const dbUser = await prisma.user.findUnique({
            where: { id: user.id },
            // @ts-ignore
            select: { couple_id: true, user_type: true },
        });

        if (!dbUser) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const isSingle = (dbUser as any).user_type === 'SINGLE';

        if (!isSingle && !coupleId) {
            return NextResponse.json({ error: "coupleId is required for couples" }, { status: 400 });
        }

        if (!isSingle && (dbUser as any).couple_id !== coupleId) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        // Create savings goal
        const milestoneDrafts = generateGoalMilestones({
            title,
            type: normalizedType,
            deadline,
            reminderAt,
        });

        const goal = await prisma.savingsGoal.create({
            data: {
                // @ts-ignore
                user_id: body.userId || (isSingle ? user.id : null),
                couple_id: isSingle ? null : (body.userId ? null : coupleId),
                title,
                description: description || null,
                target_amount: parseFloat(targetAmount),
                current_amount: currentAmount ? parseFloat(currentAmount) : 0,
                icon: icon || "Target",
                color: color || "purple",
                deadline: deadline ? new Date(deadline) : null,
                reminder_at: reminderAt ? new Date(reminderAt) : null,
                priority: priority || "medium",
                type: normalizedType,
                profile: buildGoalProfile(normalizedType, profile),
                milestones: milestoneDrafts.length > 0 ? {
                    create: milestoneDrafts.map((milestone) => ({
                        ...milestone,
                        due_at: milestone.due_at ? new Date(milestone.due_at) : null,
                    })),
                } : undefined,
            },
            include: {
                milestones: {
                    orderBy: [
                        { due_at: "asc" },
                        { order_index: "asc" },
                    ],
                },
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
    } catch (error: any) {
        console.error("Error creating savings goal:", error);
        return NextResponse.json(
            { error: error.message || "Failed to create savings goal" },
            { status: 500 }
        );
    }
}
