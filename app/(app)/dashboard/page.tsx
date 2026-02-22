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
        if (!isLoading && !user) {
            router.push("/login");
        }
    }, [user, isLoading, router]);

    if (isLoading) {
        return <FullPageLoader />;
    }

    if (!user || !profile || !couple) {
        return null;
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
