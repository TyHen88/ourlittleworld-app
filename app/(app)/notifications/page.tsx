import { Metadata } from "next";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { NotificationsClient } from "@/app/(app)/notifications/NotificationsClient";
import { getCachedProfileWithCouple } from "@/lib/db-utils";

export const metadata: Metadata = {
  title: "Notifications | OurLittleWorld",
};

export default async function NotificationsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const profile = await getCachedProfileWithCouple(session.user.id);

  return <NotificationsClient user={session.user} profile={profile} />;
}
