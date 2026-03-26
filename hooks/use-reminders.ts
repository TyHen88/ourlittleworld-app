"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export interface ReminderItem {
    id: string;
    title: string;
    body: string;
    analysis_summary: string | null;
    trigger_type: string;
    source_type: string;
    status: string;
    due_at: string;
    deliveries: Array<{
        id: string;
        channel: "EMAIL" | "TELEGRAM";
        status: "PENDING" | "SENT" | "FAILED" | "SKIPPED";
        error_message: string | null;
    }>;
    milestone?: {
        id: string;
        title: string;
        cadence: "YEAR" | "MONTH" | "DAY";
        goal: {
            id: string;
            title: string;
            type: string;
        };
    } | null;
}

export function useReminders(scope: "upcoming" | "today" | "active" = "upcoming", limit = 10) {
    return useQuery({
        queryKey: ["reminders", scope, limit],
        queryFn: async () => {
            const url = new URL("/api/reminders", window.location.origin);
            url.searchParams.set("scope", scope);
            url.searchParams.set("limit", String(limit));
            const res = await fetch(url.toString());
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || "Failed to fetch reminders");
            return json.data as ReminderItem[];
        },
        staleTime: 30 * 1000,
    });
}

export function useUpdateReminderStatus() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, dismiss, acknowledge }: { id: string; dismiss?: boolean; acknowledge?: boolean }) => {
            const res = await fetch(`/api/reminders/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ dismiss, acknowledge }),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || "Failed to update reminder");
            return json.data as ReminderItem;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["reminders"] });
        },
    });
}
