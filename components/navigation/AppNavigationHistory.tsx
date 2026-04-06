"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

import { normalizeAppHistory, readAppHistory, writeAppHistory } from "./app-history";

export function AppNavigationHistory() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname) {
      return;
    }

    const currentHistory = readAppHistory();
    const nextHistory = normalizeAppHistory(currentHistory, pathname);

    if (
      nextHistory.length === currentHistory.length &&
      nextHistory.every((entry, index) => entry === currentHistory[index])
    ) {
      return;
    }

    writeAppHistory(nextHistory);
  }, [pathname]);

  return null;
}
