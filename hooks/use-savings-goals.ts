"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface SavingsGoal {
    id: string;
    couple_id: string;
    title: string;
    description: string | null;
    target_amount: number;
    current_amount: number;
    icon: string;
    color: string;
    deadline: string | null;
    priority: string;
    is_completed: boolean;
    completed_at: string | null;
    metadata: any;
    created_at: string;
    updated_at: string;
}

export function useSavingsGoals(coupleId: string | undefined) {
    return useQuery({
        queryKey: ['savings-goals', coupleId],
        queryFn: async () => {
            if (!coupleId) return [];

            const url = new URL("/api/savings-goals", window.location.origin);
            url.searchParams.set("coupleId", coupleId);

            const res = await fetch(url.toString());
            const json = await res.json();

            if (!res.ok) {
                throw new Error(json.error || "Failed to fetch savings goals");
            }

            return json.data as SavingsGoal[];
        },
        staleTime: 30 * 1000,
        enabled: !!coupleId,
    });
}

export function useCreateSavingsGoal() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: {
            coupleId: string;
            title: string;
            description?: string;
            targetAmount: number;
            currentAmount?: number;
            icon?: string;
            color?: string;
            deadline?: string;
            priority?: string;
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
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['savings-goals', variables.coupleId] });
        },
    });
}

export function useUpdateSavingsGoal() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: {
            id: string;
            coupleId: string;
            title?: string;
            description?: string;
            targetAmount?: number;
            currentAmount?: number;
            icon?: string;
            color?: string;
            deadline?: string;
            priority?: string;
            isCompleted?: boolean;
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
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['savings-goals', variables.coupleId] });
        },
    });
}

export function useDeleteSavingsGoal() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: { id: string; coupleId: string }) => {
            const res = await fetch(`/api/savings-goals/${data.id}`, {
                method: "DELETE",
            });

            const json = await res.json();

            if (!res.ok) {
                throw new Error(json.error || "Failed to delete savings goal");
            }

            return json;
        },
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['savings-goals', variables.coupleId] });
        },
    });
}
