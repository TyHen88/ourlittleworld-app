import { NextRequest, NextResponse } from "next/server";
import { getCachedUser } from "@/lib/auth-cache";
import {
  isValidPushSubscription,
  removePushSubscription,
  upsertPushSubscription,
  isWebPushEnabled,
} from "@/lib/push";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

function parseEndpoint(body: unknown) {
  if (typeof body === "string" && body.length > 0) {
    return body;
  }

  if (body && typeof body === "object" && "endpoint" in body) {
    const endpoint = body.endpoint;
    return typeof endpoint === "string" && endpoint.length > 0 ? endpoint : null;
  }

  return null;
}

export async function POST(request: NextRequest) {
  const user = await getCachedUser();
  if (!user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  if (!isWebPushEnabled()) {
    return NextResponse.json(
      { error: "Push notifications are not configured on the server." },
      { status: 503 }
    );
  }

  const body = await request.json();
  const subscription = body?.subscription;
  if (!isValidPushSubscription(subscription)) {
    return NextResponse.json({ error: "Invalid push subscription." }, { status: 400 });
  }

  await upsertPushSubscription({
    userId: user.id,
    subscription,
    userAgent: request.headers.get("user-agent"),
  });

  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest) {
  const user = await getCachedUser();
  if (!user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const endpoint = parseEndpoint(body);
  if (!endpoint) {
    return NextResponse.json({ error: "Subscription endpoint is required." }, { status: 400 });
  }

  await removePushSubscription({ userId: user.id, endpoint });

  return NextResponse.json({ success: true });
}
