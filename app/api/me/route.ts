import { NextResponse } from "next/server";

import { getCachedUser } from "@/lib/auth-cache";
import { getCachedProfileWithCouple } from "@/lib/db-utils";

export async function GET() {
  try {
    const user = await getCachedUser();
    if (!user || !user.id) {
        return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    console.log("API/ME: fetching profile for user", user.id);
    const profile = await getCachedProfileWithCouple(user.id);
    console.log("API/ME: profile found:", !!profile, "couple found:", !!profile?.couple);

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
