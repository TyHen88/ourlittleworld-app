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
  const daysTogether = (profileWithCouple as any)?.couple 
    ? calculateDaysTogetherSafe((profileWithCouple as any).couple.start_date)
    : 0;

  return (
    <DashboardClient
      user={session.user}
      profile={profileWithCouple}
      couple={(profileWithCouple as any)?.couple || null}
      daysTogether={daysTogether}
    />
  );
}
