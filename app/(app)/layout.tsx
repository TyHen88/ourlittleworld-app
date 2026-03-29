import React from "react";
import { redirect } from "next/navigation";

import { getCachedUser } from "@/lib/auth-cache";

import { BottomNav } from "./BottomNav";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
    const user = await getCachedUser();

    if (!user?.id) {
        redirect("/login");
    }

    if (!user.onboarding_completed) {
        redirect("/onboarding");
    }

    return (
        <div className="flex flex-col min-h-[100dvh] bg-romantic-warm">
            <div className="flex min-h-0 flex-1 flex-col pb-24">
                {children}
            </div>

            {/* Modern Bottom Navigation */}
            <BottomNav />
        </div>
    );
}
