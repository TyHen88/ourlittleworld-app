"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { FullPageLoader } from "@/components/FullPageLoader";

export default function ProfilePage() {
    const router = useRouter();

    useEffect(() => {
        // Redirect to settings page
        router.replace("/settings");
    }, [router]);

    return <FullPageLoader />;
}
