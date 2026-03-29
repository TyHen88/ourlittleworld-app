import { NextRequest, NextResponse } from "next/server";

import { runReminderJob } from "@/lib/reminder-job";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

function isRequestAuthorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return process.env.NODE_ENV !== "production";
  }

  const bearer = request.headers.get("authorization");
  if (bearer === `Bearer ${secret}`) {
    return true;
  }

  return request.nextUrl.searchParams.get("secret") === secret;
}
export async function POST(request: NextRequest) {
  if (!isRequestAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await runReminderJob();
  return NextResponse.json(result);
}

export async function GET(request: NextRequest) {
  return POST(request);
}
