import { NextRequest, NextResponse } from "next/server";
import { getCachedUser } from "@/lib/auth-cache";
import prisma from "@/lib/prisma";
import { getOrCreateNotificationPreference } from "@/lib/reminders";

export async function GET() {
    const user = await getCachedUser();
    if (!user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const preference = await getOrCreateNotificationPreference(user.id);
    return NextResponse.json({ data: preference });
}

export async function PUT(request: NextRequest) {
    const user = await getCachedUser();
    if (!user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const updated = await prisma.notificationPreference.upsert({
        where: { user_id: user.id },
        update: {
            email_enabled: Boolean(body.emailEnabled),
            telegram_enabled: Boolean(body.telegramEnabled),
            budget_alerts_enabled: body.budgetAlertsEnabled !== false,
            daily_digest_enabled: body.dailyDigestEnabled !== false,
            tracking_nudges_enabled: Boolean(body.trackingNudgesEnabled),
            quiet_hours_enabled: Boolean(body.quietHoursEnabled),
            quiet_hours_start: body.quietHoursStart ?? null,
            quiet_hours_end: body.quietHoursEnd ?? null,
            timezone: typeof body.timezone === "string" && body.timezone ? body.timezone : "UTC",
            digest_hour: typeof body.digestHour === "number" ? body.digestHour : 20,
            email_address: typeof body.emailAddress === "string" ? body.emailAddress : undefined,
            telegram_chat_id: typeof body.telegramChatId === "string" ? body.telegramChatId : undefined,
            telegram_verified: Boolean(body.telegramChatId),
            telegram_bound_at: body.telegramChatId ? new Date() : null,
        },
        create: {
            user_id: user.id,
            email_enabled: Boolean(body.emailEnabled),
            telegram_enabled: Boolean(body.telegramEnabled),
            budget_alerts_enabled: body.budgetAlertsEnabled !== false,
            daily_digest_enabled: body.dailyDigestEnabled !== false,
            tracking_nudges_enabled: Boolean(body.trackingNudgesEnabled),
            quiet_hours_enabled: Boolean(body.quietHoursEnabled),
            quiet_hours_start: body.quietHoursStart ?? null,
            quiet_hours_end: body.quietHoursEnd ?? null,
            timezone: typeof body.timezone === "string" && body.timezone ? body.timezone : "UTC",
            digest_hour: typeof body.digestHour === "number" ? body.digestHour : 20,
            email_address: typeof body.emailAddress === "string" ? body.emailAddress : user.email ?? null,
            telegram_chat_id: typeof body.telegramChatId === "string" ? body.telegramChatId : null,
            telegram_verified: Boolean(body.telegramChatId),
            telegram_bound_at: body.telegramChatId ? new Date() : null,
        },
    });

    return NextResponse.json({ data: updated });
}
