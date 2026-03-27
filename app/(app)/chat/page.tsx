import { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getCachedProfileWithCouple } from "@/lib/db-utils";
import { ChatHeader } from "@/components/chat/ChatHeader";
import { CoupleMessenger } from "@/components/chat/CoupleMessenger";

export const metadata: Metadata = {
  title: "Chat | OurLittleWorld",
};

export default async function ChatPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const profile = await getCachedProfileWithCouple(session.user.id);
  const couple = profile?.couple ?? null;

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden pt-5 sm:pt-4 md:mx-auto md:w-full md:max-w-2xl md:px-6">
      <ChatHeader user={{ id: session.user.id }} couple={couple} />

      <CoupleMessenger
        user={{ id: session.user.id, name: session.user.name }}
        profile={profile}
        couple={couple}
      />
    </div>
  );
}
