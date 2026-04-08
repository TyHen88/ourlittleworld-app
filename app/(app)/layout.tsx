import React from "react";
import { redirect } from "next/navigation";

import { getCachedUser } from "@/lib/auth-cache";
import { AppNavigationHistory } from "@/components/navigation/AppNavigationHistory";
import { RouteDataRefresh } from "@/components/navigation/RouteDataRefresh";

import { AppSidebar } from "./AppSidebar";

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
        <div className="relative min-h-[100dvh] overflow-x-hidden bg-romantic-warm">
            <div className="pointer-events-none absolute inset-0 hidden md:block">
                <div className="absolute left-[-8%] top-[-10%] h-[24rem] w-[24rem] rounded-full bg-romantic-blush/30 blur-[110px]" />
                <div className="absolute bottom-[-8%] right-[-6%] h-[28rem] w-[28rem] rounded-full bg-romantic-lavender/28 blur-[130px]" />
            </div>

            <AppNavigationHistory />
            <RouteDataRefresh />
            <AppSidebar />

            <main className="relative min-h-[100dvh] min-w-0 flex-1">
                <div className="min-h-[100dvh] lg:px-5 lg:py-5">
                    <div className="min-h-[100dvh] lg:rounded-[2.4rem] lg:border lg:border-white/60 lg:bg-white/35 lg:shadow-[0_24px_70px_rgba(15,23,42,0.08)] lg:backdrop-blur-xl">
                        {children}
                    </div>
                </div>
            </main>
        </div>
    );
}
