import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getCachedProfileWithCouple } from "@/lib/db-utils";
import { DashboardClient } from "./DashboardClient";
import { calculateDaysTogether } from "@/lib/utils/date-utilities";
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
  const daysTogether = profileWithCouple?.couple 
    ? calculateDaysTogetherSafe(profileWithCouple.couple.start_date)
    : 0;

  return (
    <DashboardClient
      user={session.user}
      profile={profileWithCouple}
      couple={profileWithCouple?.couple || null}
      daysTogether={daysTogether}
    />
  );
}
