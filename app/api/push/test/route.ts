import { NextResponse } from "next/server";
import { getCachedUser } from "@/lib/auth-cache";
import { sendPushNotificationToUsers } from "@/lib/push";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

export async function POST() {
  const user = await getCachedUser();
  if (!user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const result = await sendPushNotificationToUsers({
    userIds: [user.id],
    payload: {
      title: "Test notification",
      body: "Web push is configured and your current browser subscription can receive notifications.",
      url: "/settings",
      tag: "push-test",
    },
    options: {
      TTL: 60,
      urgency: "high",
    },
  });

  return NextResponse.json({
    success: result.delivered > 0,
    ...result,
  });
}
