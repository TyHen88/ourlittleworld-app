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

  if (profile?.user_type === "SINGLE") {
    redirect("/dashboard");
  }

  return (
    <div className="flex h-[100svh] min-h-[100svh] flex-col overflow-hidden pt-5 sm:pt-4 md:mx-auto md:h-[100dvh] md:min-h-[100dvh] md:w-full md:max-w-2xl md:px-6 lg:h-[calc(100dvh-2.5rem)] lg:min-h-[calc(100dvh-2.5rem)]">
      <ChatHeader user={{ id: session.user.id }} couple={couple} />

      <CoupleMessenger
        user={{ id: session.user.id, name: session.user.name }}
        profile={profile}
        couple={couple}
      />
    </div>
  );
}
