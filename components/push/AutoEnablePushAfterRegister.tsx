"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";

import {
    browserSupportsPushNotifications,
    clearAutoEnablePushAfterRegister,
    enablePushNotifications,
    getExistingPushSubscription,
    shouldAutoEnablePushAfterRegister,
} from "@/lib/push-client";

export function AutoEnablePushAfterRegister() {
    const { status } = useSession();
    const hasAttemptedRef = useRef(false);

    useEffect(() => {
        if (status !== "authenticated" || hasAttemptedRef.current || !shouldAutoEnablePushAfterRegister()) {
            return;
        }

        hasAttemptedRef.current = true;
        clearAutoEnablePushAfterRegister();

        if (!browserSupportsPushNotifications()) {
            return;
        }

        const timeoutId = window.setTimeout(() => {
            void (async () => {
                try {
                    const existingSubscription = await getExistingPushSubscription();
                    if (existingSubscription) {
                        return;
                    }

                    if (typeof Notification !== "undefined" && Notification.permission === "denied") {
                        return;
                    }

                    await enablePushNotifications();
                } catch (error) {
                    console.warn("Automatic push enable after registration failed:", error);
                }
            })();
        }, 600);

        return () => {
            window.clearTimeout(timeoutId);
        };
    }, [status]);

    return null;
}
