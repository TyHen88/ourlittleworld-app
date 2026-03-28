import { Metadata } from "next";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { RemindersClient } from "@/app/(app)/reminders/RemindersClient";
import { getCachedProfileWithCouple } from "@/lib/db-utils";

export const metadata: Metadata = {
  title: "Reminders | OurLittleWorld",
};

export default async function RemindersPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const profile = await getCachedProfileWithCouple(session.user.id);

  return <RemindersClient user={session.user} profile={profile} />;
}
