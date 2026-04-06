import { NextResponse } from "next/server";

import { getCachedUser } from "@/lib/auth-cache";
import { buildWidgetSummary } from "@/lib/widgets";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const user = await getCachedUser();

    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const summary = await buildWidgetSummary(user.id);

    return NextResponse.json(
      { data: summary },
      {
        headers: {
          "Cache-Control": "private, no-cache, no-store, max-age=0, must-revalidate",
        },
      },
    );
  } catch (error: unknown) {
    console.error("Widget summary error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to build widget summary" },
      { status: 500 },
    );
  }
}
