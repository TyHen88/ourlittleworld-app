"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCouple } from "@/hooks/use-couple";
import { DashboardClient } from "./DashboardClient";
import { FullPageLoader } from "@/components/FullPageLoader";

export default function DashboardPage() {
    const router = useRouter();
    const { user, profile, couple, daysTogether, isLoading } = useCouple();

    useEffect(() => {
        if (!isLoading) {
            if (!user) {
                router.push("/login");
            } else if (!couple) {
                router.push("/onboarding");
            }
        }
    }, [user, couple, isLoading, router]);

    if (isLoading || !user || !profile || !couple) {
        return <FullPageLoader />;
    }

    return (
        <DashboardClient
            user={user}
            profile={profile}
            couple={couple}
            daysTogether={daysTogether}
        />
    );
}
