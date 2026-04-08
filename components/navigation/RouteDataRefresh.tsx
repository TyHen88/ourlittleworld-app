"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";

export function RouteDataRefresh() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const hasMountedRef = useRef(false);
  const lastRouteKeyRef = useRef<string>("");

  const routeKey = pathname
    ? `${pathname}?${searchParams?.toString() ?? ""}`
    : "";

  useEffect(() => {
    if (!routeKey) {
      return;
    }

    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      lastRouteKeyRef.current = routeKey;
      return;
    }

    if (lastRouteKeyRef.current === routeKey) {
      return;
    }

    lastRouteKeyRef.current = routeKey;
    void queryClient.invalidateQueries();
    router.refresh();
  }, [queryClient, routeKey, router]);

  return null;
}
