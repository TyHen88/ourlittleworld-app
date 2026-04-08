"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { NOTIFICATION_QUERY_KEYS } from "@/hooks/use-notifications";

type PushMessagePayload = {
  payload?: {
    tag?: string;
  };
  type?: string;
};

export function PushNotificationRealtimeSync() {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    const handleMessage = (event: MessageEvent<PushMessagePayload>) => {
      if (event.data?.type !== "olw-push-received") {
        return;
      }

      const tag = event.data.payload?.tag;
      if (typeof tag === "string" && tag.startsWith("chat")) {
        return;
      }

      void queryClient.invalidateQueries({ queryKey: NOTIFICATION_QUERY_KEYS.all });
    };

    navigator.serviceWorker.addEventListener("message", handleMessage);

    return () => {
      navigator.serviceWorker.removeEventListener("message", handleMessage);
    };
  }, [queryClient]);

  return null;
}
