import { NextResponse } from "next/server";
import { getCachedUser } from "@/lib/auth-cache";
import { getCachedProfile } from "@/lib/db-utils";
import { getAblyRestClient } from "@/lib/ably-server";
import { getCoupleChatChannelName } from "@/lib/chat";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

export async function POST() {
  try {
    const user = await getCachedUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const profile = await getCachedProfile(user.id);
    if (!profile?.couple_id || profile.user_type === "SINGLE") {
      return NextResponse.json(
        { error: "Couple chat is not available" },
        { status: 403 }
      );
    }

    const ably = getAblyRestClient();
    if (!ably) {
      return NextResponse.json(
        {
          error:
            'ABLY_API_KEY is missing or invalid. Expected "<appId>.<keyId>:<secret>".',
        },
        { status: 500 }
      );
    }

    const channelName = getCoupleChatChannelName(profile.couple_id);
    const tokenRequest = await ably.auth.createTokenRequest({
      clientId: user.id,
      ttl: 60 * 60 * 1000,
      capability: {
        [channelName]: ["publish", "subscribe", "presence"],
      },
    });

    return NextResponse.json(tokenRequest);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to create Ably token";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
