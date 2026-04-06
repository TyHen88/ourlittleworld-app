"use client";

import { usePathname, useRouter } from "next/navigation";

const STORAGE_KEY = "olw:app-route-history";
const MAX_HISTORY_ENTRIES = 40;

function canUseStorage() {
  return typeof window !== "undefined" && typeof sessionStorage !== "undefined";
}

export function readAppHistory() {
  if (!canUseStorage()) {
    return [] as string[];
  }

  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as unknown;

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((item): item is string => typeof item === "string" && item.length > 0);
  } catch {
    return [];
  }
}

export function writeAppHistory(history: string[]) {
  if (!canUseStorage()) {
    return;
  }

  try {
    if (history.length === 0) {
      sessionStorage.removeItem(STORAGE_KEY);
      return;
    }

    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(history.slice(-MAX_HISTORY_ENTRIES)));
  } catch {
    // Ignore storage failures and fall back to route-level navigation only.
  }
}

export function normalizeAppHistory(history: string[], pathname: string) {
  const sanitized = history.filter(Boolean);

  if (!pathname) {
    return sanitized.slice(-MAX_HISTORY_ENTRIES);
  }

  if (sanitized.at(-1) === pathname) {
    return sanitized.slice(-MAX_HISTORY_ENTRIES);
  }

  const existingIndex = sanitized.lastIndexOf(pathname);

  if (existingIndex >= 0) {
    return sanitized.slice(0, existingIndex + 1);
  }

  return [...sanitized, pathname].slice(-MAX_HISTORY_ENTRIES);
}

export function useAppBackNavigation(fallbackHref = "/dashboard") {
  const router = useRouter();
  const pathname = usePathname();

  return () => {
    const currentPath = pathname || fallbackHref;
    const normalizedHistory = normalizeAppHistory(readAppHistory(), currentPath);
    const previousPath = normalizedHistory.at(-2);

    if (previousPath && previousPath !== currentPath) {
      writeAppHistory(normalizedHistory.slice(0, -1));
      router.push(previousPath);
      return;
    }

    if (currentPath !== fallbackHref) {
      writeAppHistory([fallbackHref]);
      router.push(fallbackHref);
    }
  };
}
