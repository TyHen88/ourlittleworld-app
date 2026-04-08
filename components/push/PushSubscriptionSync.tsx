"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";

import {
  browserSupportsPushNotifications,
  getExistingPushSubscription,
} from "@/lib/push-client";

async function syncCurrentBrowserSubscription() {
  if (!browserSupportsPushNotifications()) {
    return;
  }

  const subscription = await getExistingPushSubscription();
  if (!subscription) {
    return;
  }

  await fetch("/api/push/subscriptions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    cache: "no-store",
    body: JSON.stringify({
      subscription: subscription.toJSON(),
    }),
  });
}

export function PushSubscriptionSync() {
  const { data: session, status } = useSession();
  const lastSyncedUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    const userId = session?.user?.id ?? null;

    if (status !== "authenticated" || !userId) {
      lastSyncedUserIdRef.current = null;
      return;
    }

    if (lastSyncedUserIdRef.current === userId) {
      return;
    }

    lastSyncedUserIdRef.current = userId;

    void syncCurrentBrowserSubscription().catch((error) => {
      console.warn("Push subscription sync failed:", error);
      lastSyncedUserIdRef.current = null;
    });
  }, [session?.user?.id, status]);

  return null;
}
