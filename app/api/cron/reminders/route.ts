import { NextResponse } from "next/server";
import { runReminderEngine } from "@/lib/reminders";

export async function GET(request: Request) {
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const result = await runReminderEngine();
        return NextResponse.json({ success: true, ...result });
    } catch (error: any) {
        console.error("Reminder cron failed:", error);
        return NextResponse.json({ error: error.message || "Reminder cron failed" }, { status: 500 });
    }
}
