"use client";

import { getErrorMessage, toast } from "@/lib/toast";
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
    priority: string;
    is_completed: boolean;
    completed_at: string | null;
    metadata: Record<string, unknown> | null;
    created_at: string;
    updated_at: string;
}

export function useSavingsGoals(id: string | undefined) {
    return useQuery({
        queryKey: ['savings-goals', id],
        queryFn: async () => {
            if (!id) return [];

            const url = new URL("/api/savings-goals", window.location.origin);
            url.searchParams.set("id", id);

            const res = await fetch(url.toString());
            const json = await res.json();

            if (!res.ok) {
                throw new Error(json.error || "Failed to fetch savings goals");
            }

            return json.data as SavingsGoal[];
        },
        staleTime: 30 * 1000,
        enabled: !!id,
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
            const ownerId = variables.userId || variables.coupleId;
            if (ownerId) {
                queryClient.invalidateQueries({ queryKey: ['savings-goals', ownerId] });
            }
            toast.success("Goal created", `"${data.title}" is now being tracked.`);
        },
        onError: (error) => {
            toast.error("Couldn't create goal", getErrorMessage(error, "Failed to create savings goal"));
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
            priority?: string;
            isCompleted?: boolean;
        }) => {
            const { id, coupleId, userId, isCompleted, ...updateData } = data;
            void coupleId;
            void userId;
            void isCompleted;

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
            const ownerId = variables.userId || variables.coupleId;
            if (ownerId) {
                queryClient.invalidateQueries({ queryKey: ['savings-goals', ownerId] });
            }
            toast.success(
                variables.isCompleted ? "Goal updated" : "Goal saved",
                variables.isCompleted ? `"${data.title}" has been marked complete.` : `"${data.title}" was updated.`,
            );
        },
        onError: (error) => {
            toast.error("Couldn't update goal", getErrorMessage(error, "Failed to update savings goal"));
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
        onSuccess: (data, variables) => {
            const ownerId = variables.userId || variables.coupleId;
            if (ownerId) {
                queryClient.invalidateQueries({ queryKey: ['savings-goals', ownerId] });
            }
            toast.success("Goal deleted", "The goal was removed.");
        },
        onError: (error) => {
            toast.error("Couldn't delete goal", getErrorMessage(error, "Failed to delete savings goal"));
        },
    });
}
