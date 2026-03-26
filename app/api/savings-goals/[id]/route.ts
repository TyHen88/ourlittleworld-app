import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getCachedUser } from "@/lib/auth-cache";
import prisma from "@/lib/prisma";
import { buildGoalProfile, generateGoalMilestones, isGoalType } from "@/lib/goals";

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getCachedUser();

        if (!user || user.id === undefined) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const {
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
            isCompleted,
        } = body;

        const { id } = await params;
        if (type && !isGoalType(type)) {
            return NextResponse.json({ error: "Invalid goal type" }, { status: 400 });
        }

        // Fetch existing goal to verify ownership
        const existingGoal = await prisma.savingsGoal.findUnique({
            where: { id },
            include: {
                couple: {
                    include: {
                        members: {
                            select: { id: true },
                        },
                    },
                },
                milestones: true,
            },
        });

        if (!existingGoal) {
            return NextResponse.json({ error: "Goal not found" }, { status: 404 });
        }

        // Verify ownership: member of couple or the solo user
        let hasAccess = false;
        if (existingGoal.couple_id) {
            hasAccess = (existingGoal as any).couple?.members.some((m: any) => m.id === user.id);
        } else if ((existingGoal as any).user_id) {
            hasAccess = (existingGoal as any).user_id === user.id;
        }

        if (!hasAccess) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        // Update goal
        const normalizedType = isGoalType(type) ? type : existingGoal.type;
        const nextTitle = title ?? existingGoal.title;
        const nextDeadline = deadline !== undefined ? deadline : existingGoal.deadline?.toISOString();
        const nextReminderAt = reminderAt !== undefined ? reminderAt : existingGoal.reminder_at?.toISOString();
        const nextProfile = profile !== undefined
            ? buildGoalProfile(normalizedType, profile)
            : (existingGoal.profile as Record<string, string> | null);
        const milestoneDrafts = generateGoalMilestones({
            title: nextTitle,
            type: normalizedType,
            deadline: nextDeadline,
            reminderAt: nextReminderAt,
        });

        const goal = await prisma.savingsGoal.update({
            where: { id },
            data: {
                ...(title !== undefined && { title }),
                ...(description !== undefined && { description }),
                ...(targetAmount !== undefined && { target_amount: parseFloat(targetAmount) }),
                ...(currentAmount !== undefined && { current_amount: parseFloat(currentAmount) }),
                ...(icon !== undefined && { icon }),
                ...(color !== undefined && { color }),
                ...(deadline !== undefined && { deadline: deadline ? new Date(deadline) : null }),
                ...(reminderAt !== undefined && { reminder_at: reminderAt ? new Date(reminderAt) : null }),
                ...(priority !== undefined && { priority }),
                ...(type !== undefined && { type: normalizedType }),
                ...(profile !== undefined && {
                    profile: nextProfile && Object.keys(nextProfile).length > 0
                        ? (nextProfile as Prisma.InputJsonValue)
                        : Prisma.JsonNull,
                }),
                ...(isCompleted !== undefined && {
                    is_completed: isCompleted,
                    completed_at: isCompleted ? new Date() : null,
                }),
                milestones: {
                    deleteMany: {},
                    create: milestoneDrafts.map((milestone) => ({
                        ...milestone,
                        due_at: milestone.due_at ? new Date(milestone.due_at) : null,
                    })),
                },
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
            { status: 200 }
        );
    } catch (error: any) {
        console.error("Error updating savings goal:", error);
        return NextResponse.json(
            { error: error.message || "Failed to update savings goal" },
            { status: 500 }
        );
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getCachedUser();

        if (!user || user.id === undefined) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;

        // Fetch existing goal to verify ownership
        const existingGoal = await prisma.savingsGoal.findUnique({
            where: { id },
            include: {
                couple: {
                    include: {
                        members: {
                            select: { id: true },
                        },
                    },
                },
            },
        });

        if (!existingGoal) {
            return NextResponse.json({ error: "Goal not found" }, { status: 404 });
        }

        // Verify ownership: member of couple or the solo user
        let hasAccess = false;
        if (existingGoal.couple_id) {
            hasAccess = (existingGoal as any).couple?.members.some((m: any) => m.id === user.id);
        } else if ((existingGoal as any).user_id) {
            hasAccess = (existingGoal as any).user_id === user.id;
        }

        if (!hasAccess) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        // Delete goal
        await prisma.savingsGoal.delete({
            where: { id },
        });

        return NextResponse.json(
            { success: true, message: "Goal deleted" },
            { status: 200 }
        );
    } catch (error: any) {
        console.error("Error deleting savings goal:", error);
        return NextResponse.json(
            { error: error.message || "Failed to delete savings goal" },
            { status: 500 }
        );
    }
}
