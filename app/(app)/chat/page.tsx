import { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getCachedProfileWithCouple } from "@/lib/db-utils";
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
    <div className="mx-auto max-w-2xl px-6 py-6 pb-32">
      <header className="mb-5">
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Messenger</p>
        <h1 className="mt-2 text-3xl font-black tracking-tighter text-slate-800">Couple Chat</h1>
        <p className="mt-2 text-sm text-slate-500">
          A private message thread for you and your partner.
        </p>
      </header>

      <CoupleMessenger
        user={{ id: session.user.id, name: session.user.name }}
        profile={profile}
        couple={couple}
      />
    </div>
  );
}
