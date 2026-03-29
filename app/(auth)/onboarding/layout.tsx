import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { getCachedUser } from "@/lib/auth-cache";

export const dynamic = "force-dynamic";

export default async function OnboardingLayout({ children }: { children: ReactNode }) {
  const user = await getCachedUser();

  if (!user?.id) {
    redirect("/login");
  }

  if (user.onboarding_completed) {
    redirect("/dashboard");
  }

  return children;
}
