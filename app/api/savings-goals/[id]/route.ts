import { NextRequest, NextResponse } from "next/server";
import { getCachedUser } from "@/lib/auth-cache";
import prisma from "@/lib/prisma";

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
            icon,
            color,
            deadline,
            priority,
            isCompleted,
        } = body;

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

        // Update goal
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
                ...(priority !== undefined && { priority }),
                ...(isCompleted !== undefined && {
                    is_completed: isCompleted,
                    completed_at: isCompleted ? new Date() : null,
                }),
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
