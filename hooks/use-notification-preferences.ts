"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export interface NotificationPreferences {
    email_enabled: boolean;
    telegram_enabled: boolean;
    budget_alerts_enabled: boolean;
    daily_digest_enabled: boolean;
    tracking_nudges_enabled: boolean;
    quiet_hours_enabled: boolean;
    quiet_hours_start: number | null;
    quiet_hours_end: number | null;
    timezone: string;
    digest_hour: number;
    email_address: string | null;
    telegram_chat_id: string | null;
    telegram_verified: boolean;
}

export function useNotificationPreferences() {
    return useQuery({
        queryKey: ["notification-preferences"],
        queryFn: async () => {
            const res = await fetch("/api/notification-preferences");
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || "Failed to fetch notification preferences");
            return json.data as NotificationPreferences;
        },
        staleTime: 30 * 1000,
    });
}

export function useUpdateNotificationPreferences() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: {
            emailEnabled: boolean;
            telegramEnabled: boolean;
            budgetAlertsEnabled: boolean;
            dailyDigestEnabled: boolean;
            trackingNudgesEnabled: boolean;
            quietHoursEnabled: boolean;
            quietHoursStart: number | null;
            quietHoursEnd: number | null;
            timezone: string;
            digestHour: number;
            emailAddress: string | null;
            telegramChatId: string | null;
        }) => {
            const res = await fetch("/api/notification-preferences", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || "Failed to update notification preferences");
            return json.data as NotificationPreferences;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["notification-preferences"] });
            queryClient.invalidateQueries({ queryKey: ["reminders"] });
        },
    });
}
