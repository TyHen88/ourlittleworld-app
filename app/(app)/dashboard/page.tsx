import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getCachedProfileWithCouple } from "@/lib/db-utils";
import { DashboardClient } from "./DashboardClient";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard | OurLittleWorld",
};

export default async function DashboardPage() {
  const session = await auth();
  
  if (!session?.user?.id) {
    redirect("/login");
  }

  const profileWithCouple = await getCachedProfileWithCouple(session.user.id);

  const { calculateDaysTogetherSafe } = await import("@/lib/utils/date-utilities");
  const couple = profileWithCouple?.couple ?? null;
  const daysTogether = couple
    ? calculateDaysTogetherSafe(couple.start_date)
    : 0;
  const daysActive = profileWithCouple?.created_at
    ? calculateDaysTogetherSafe(profileWithCouple.created_at)
    : 0;

  return (
    <DashboardClient
      user={{ id: session.user.id, name: session.user.name }}
      profile={profileWithCouple}
      couple={couple}
      daysTogether={daysTogether}
      daysActive={daysActive}
    />
  );
}
