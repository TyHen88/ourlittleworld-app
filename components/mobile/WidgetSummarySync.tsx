"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";

import { syncNativeWidgetSummary } from "@/lib/mobile/widget-sync";

const WIDGET_SYNC_INTERVAL_MS = 5 * 60 * 1000;

export function WidgetSummarySync() {
  const { status } = useSession();

  useEffect(() => {
    if (status !== "authenticated" || typeof document === "undefined") {
      return;
    }

    void syncNativeWidgetSummary();

    const intervalId = window.setInterval(() => {
      void syncNativeWidgetSummary();
    }, WIDGET_SYNC_INTERVAL_MS);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void syncNativeWidgetSummary();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [status]);

  return null;
}
