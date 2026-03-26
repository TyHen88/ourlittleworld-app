"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface SavingsGoal {
    id: string;
    couple_id: string | null;
    user_id: string | null;
    title: string;
    description: string | null;
    target_amount: number;
    current_amount: number;
    icon: string;
    color: string;
    deadline: string | null;
    reminder_at: string | null;
    priority: string;
    type: string;
    is_completed: boolean;
    completed_at: string | null;
    metadata: any;
    profile: Record<string, string> | null;
    milestones: Array<{
        id: string;
        title: string;
        description: string | null;
        cadence: "YEAR" | "MONTH" | "DAY";
        due_at: string | null;
        status: "PENDING" | "COMPLETED" | "SKIPPED";
        order_index: number;
    }>;
    created_at: string;
    updated_at: string;
}

export function useSavingsGoals(id: string | undefined) {
    return useQuery({
        queryKey: ['savings-goals', id],
        queryFn: async () => {
            const url = new URL("/api/savings-goals", window.location.origin);
            if (id) url.searchParams.set("id", id);

            const res = await fetch(url.toString());
            const json = await res.json();

            if (!res.ok) {
                throw new Error(json.error || "Failed to fetch savings goals");
            }

            return json.data as SavingsGoal[];
        },
        staleTime: 30 * 1000,
        // Always enabled for singles, or enabled if coupleId exists
        enabled: true,
    });
}

export function useCreateSavingsGoal() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: {
            userId?: string;
            coupleId?: string;
            title: string;
            description?: string;
            targetAmount: number;
            currentAmount?: number;
            icon?: string;
            color?: string;
            deadline?: string;
            reminderAt?: string;
            priority?: string;
            type?: string;
            profile?: Record<string, string>;
        }) => {
            const res = await fetch("/api/savings-goals", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });

            const json = await res.json();

            if (!res.ok) {
                throw new Error(json.error || "Failed to create savings goal");
            }

            return json.data as SavingsGoal;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['savings-goals'] });
        },
    });
}

export function useUpdateSavingsGoal() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: {
            id: string;
            coupleId?: string;
            userId?: string;
            title?: string;
            description?: string;
            targetAmount?: number;
            currentAmount?: number;
            icon?: string;
            color?: string;
            deadline?: string;
            reminderAt?: string;
            priority?: string;
            type?: string;
            isCompleted?: boolean;
            profile?: Record<string, string>;
        }) => {
            const { id, coupleId, ...updateData } = data;

            const res = await fetch(`/api/savings-goals/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(updateData),
            });

            const json = await res.json();

            if (!res.ok) {
                throw new Error(json.error || "Failed to update savings goal");
            }

            return json.data as SavingsGoal;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['savings-goals'] });
        },
    });
}

export function useDeleteSavingsGoal() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: { id: string; coupleId?: string; userId?: string }) => {
            const res = await fetch(`/api/savings-goals/${data.id}`, {
                method: "DELETE",
            });

            const json = await res.json();

            if (!res.ok) {
                throw new Error(json.error || "Failed to delete savings goal");
            }

            return json;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['savings-goals'] });
        },
    });
}
