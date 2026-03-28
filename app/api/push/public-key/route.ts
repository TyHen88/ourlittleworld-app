import { NextResponse } from "next/server";
import { getWebPushPublicKey } from "@/lib/push";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

export async function GET() {
  const publicKey = getWebPushPublicKey();
  if (!publicKey) {
    return NextResponse.json(
      { error: "Push notifications are not configured on the server." },
      { status: 503 }
    );
  }

  return NextResponse.json({ publicKey });
}
