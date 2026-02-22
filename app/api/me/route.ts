import { NextResponse } from "next/server";

import { getCachedUser } from "@/lib/auth-cache";
import { getCachedProfileWithCouple } from "@/lib/db-utils";

export async function GET() {
  try {
    const user = await getCachedUser();
    if (!user) {
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
      "private, max-age=30, stale-while-revalidate=60"
    );

    return response;
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message ?? "Server error" },
      { status: 500 }
    );
  }
}
