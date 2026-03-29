import { NextRequest, NextResponse } from "next/server";

import { getCachedUser } from "@/lib/auth-cache";
import { changePasswordForEmail } from "@/lib/password-auth";

export async function POST(request: NextRequest) {
  const user = await getCachedUser();

  if (!user?.email) {
    return NextResponse.json(
      { success: false, error: "Not authenticated" },
      { status: 401 }
    );
  }

  const body = await request.json().catch(() => null);

  const result = await changePasswordForEmail({
    email: user.email,
    currentPassword:
      typeof body?.currentPassword === "string" ? body.currentPassword : undefined,
    newPassword: typeof body?.newPassword === "string" ? body.newPassword : undefined,
  });

  if (!result.success) {
    return NextResponse.json(
      { success: false, error: result.error },
      { status: result.status }
    );
  }

  return NextResponse.json({ success: true });
}
