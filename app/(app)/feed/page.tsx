import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getCachedProfileWithCouple } from "@/lib/db-utils";
import FeedClient from "./FeedClient";

export default async function FeedPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const profileWithCouple = await getCachedProfileWithCouple(session.user.id);

  // We no longer redirect if couple is missing, allowing skip functionality
  return (
    <FeedClient
      user={session.user}
      profile={profileWithCouple}
      couple={profileWithCouple?.couple || null}
    />
  );
}
