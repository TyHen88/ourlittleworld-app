import { NextRequest, NextResponse } from "next/server";

import { verifyPasswordLogin } from "@/lib/password-auth";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);

  const result = await verifyPasswordLogin({
    email: typeof body?.email === "string" ? body.email : undefined,
    password: typeof body?.password === "string" ? body.password : undefined,
  });

  if (!result.success) {
    return NextResponse.json(
      { success: false, error: result.error },
      { status: result.status }
    );
  }

  return NextResponse.json({
    success: true,
    normalizedEmail: result.normalizedEmail,
    onboardingCompleted: result.onboardingCompleted,
  });
}
