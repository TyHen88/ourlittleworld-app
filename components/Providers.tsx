"use client";

import { WidgetSummarySync } from "@/components/mobile/WidgetSummarySync";
import { AutoEnablePushAfterRegister } from "@/components/push/AutoEnablePushAfterRegister";
import { PushNotificationRealtimeSync } from "@/components/push/PushNotificationRealtimeSync";
import { Toaster } from "@/components/ui/toaster";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SessionProvider } from "next-auth/react";
import { useState } from "react";

export function Providers({ children }: { children: React.ReactNode }) {
    const [queryClient] = useState(
        () =>
            new QueryClient({
                defaultOptions: {
                    queries: {
                        staleTime: 30 * 1000,
                        gcTime: 5 * 60 * 1000,
                        refetchOnWindowFocus: false,
                        refetchOnReconnect: true,
                        retry: 1,
                        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
                    },
                    mutations: {
                        retry: 0,
                        onError: (error) => {
                            console.error('Mutation error:', error);
                        },
                    },
                },
            })
    );

    return (
        <SessionProvider>
            <QueryClientProvider client={queryClient}>
                <AutoEnablePushAfterRegister />
                <PushNotificationRealtimeSync />
                <WidgetSummarySync />
                {children}
                <Toaster />
            </QueryClientProvider>
        </SessionProvider>
    );
}
