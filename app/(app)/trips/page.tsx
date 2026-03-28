import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getCachedProfileWithCouple } from "@/lib/db-utils";
import { TripsClient } from "@/app/(app)/trips/TripsClient";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Trip Planner | OurLittleWorld",
};

export default async function TripsPage() {
  const session = await auth();
  
  if (!session?.user?.id) {
    redirect("/login");
  }

  const profile = await getCachedProfileWithCouple(session.user.id);

  return (
    <TripsClient
      user={session.user}
      profile={profile}
    />
  );
}
