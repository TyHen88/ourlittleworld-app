import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import prisma from "@/lib/prisma";

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: userError } = await supabase.auth.getUser();

        if (userError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { amount, category, note, payer, transactionDate } = body;

        const { id } = await params;

        // Fetch existing transaction to verify ownership
        const existingTransaction = await prisma.transaction.findUnique({
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

        if (!existingTransaction) {
            return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
        }

        // Verify user is member of the couple
        const isMember = existingTransaction.couple.members.some(m => m.id === user.id);
        if (!isMember) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        // Update transaction
        const transaction = await prisma.transaction.update({
            where: { id },
            data: {
                ...(amount !== undefined && { amount: parseFloat(amount) }),
                ...(category !== undefined && { category }),
                ...(note !== undefined && { note }),
                ...(payer !== undefined && { payer: payer.toUpperCase() }),
                ...(transactionDate !== undefined && { transaction_date: new Date(transactionDate) }),
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
            { status: 200 }
        );
    } catch (error: any) {
        console.error("Error updating transaction:", error);
        return NextResponse.json(
            { error: error.message || "Failed to update transaction" },
            { status: 500 }
        );
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: userError } = await supabase.auth.getUser();

        if (userError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;

        // Fetch existing transaction to verify ownership
        const existingTransaction = await prisma.transaction.findUnique({
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

        if (!existingTransaction) {
            return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
        }

        // Verify user is member of the couple
        const isMember = existingTransaction.couple.members.some(m => m.id === user.id);
        if (!isMember) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        // Delete transaction
        await prisma.transaction.delete({
            where: { id },
        });

        return NextResponse.json(
            { success: true, message: "Transaction deleted" },
            { status: 200 }
        );
    } catch (error: any) {
        console.error("Error deleting transaction:", error);
        return NextResponse.json(
            { error: error.message || "Failed to delete transaction" },
            { status: 500 }
        );
    }
}
