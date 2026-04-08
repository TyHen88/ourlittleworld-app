import { NextResponse } from "next/server";

import { getCachedUser } from "@/lib/auth-cache";
import { getCachedProfileWithCouple } from "@/lib/db-utils";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getCachedUser();
    if (!user || !user.id) {
        return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const [profile, authDetails] = await Promise.all([
      getCachedProfileWithCouple(user.id),
      prisma.user.findUnique({
        where: { id: user.id },
        select: {
          password: true,
          accounts: {
            select: {
              provider: true,
            },
          },
        },
      }),
    ]);

    const providers = new Set(
      authDetails?.accounts.map((account) => account.provider.toLowerCase()) ?? []
    );
    const hasPassword = Boolean(authDetails?.password);
    const hasGoogleAccount = providers.has("google");
    const authMethod = hasGoogleAccount
      ? hasPassword
        ? "google_and_password"
        : "google"
      : hasPassword
        ? "password"
        : "unknown";

    const enrichedProfile = profile
      ? {
          ...profile,
          auth_method: authMethod,
          has_password: hasPassword,
          has_google_account: hasGoogleAccount,
        }
      : null;

    const response = NextResponse.json({
      user,
      profile: enrichedProfile,
      couple: enrichedProfile?.couple ?? null,
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
