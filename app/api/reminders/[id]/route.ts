import { NextRequest, NextResponse } from "next/server";
import { ReminderStatus } from "@prisma/client";
import { getCachedUser } from "@/lib/auth-cache";
import prisma from "@/lib/prisma";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const user = await getCachedUser();
    if (!user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const reminder = await prisma.reminder.findUnique({
        where: { id },
        select: { id: true, owner_user_id: true },
    });

    if (!reminder || reminder.owner_user_id !== user.id) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const updated = await prisma.reminder.update({
        where: { id },
        data: {
            ...(body.dismiss ? { status: ReminderStatus.DISMISSED, dismissed_at: new Date() } : {}),
            ...(body.acknowledge ? { acknowledged_at: new Date() } : {}),
        },
    });

    return NextResponse.json({ data: updated });
}
