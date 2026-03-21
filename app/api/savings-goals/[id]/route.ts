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

        // Verify user is member of the couple
        const isMember = existingGoal.couple.members.some((m: any) => m.id === user.id);
        if (!isMember) {
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

        return NextResponse.json(
            { success: true, data: goal },
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

        // Verify user is member of the couple
        const isMember = existingGoal.couple.members.some((m: any) => m.id === user.id);
        if (!isMember) {
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
