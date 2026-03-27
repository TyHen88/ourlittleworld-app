import { NextResponse } from "next/server";

import { getCachedUser } from "@/lib/auth-cache";
import { getCachedProfileWithCouple } from "@/lib/db-utils";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getCachedUser();
    if (!user || !user.id) {
        return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const profile = await getCachedProfileWithCouple(user.id);

    const response = NextResponse.json({
      user,
      profile,
      couple: profile?.couple ?? null,
    });

    response.headers.set(
      "Cache-Control",
      "no-store"
    );

    return response;
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Server error" },
      { status: 500 }
    );
  }
}
