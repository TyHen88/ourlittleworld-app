"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface Transaction {
    id: string;
    couple_id: string;
    amount: number;
    category: string;
    note: string | null;
    payer: "HIS" | "HERS" | "SHARED";
    created_by: string;
    transaction_date: string;
    created_at: string;
    updated_at: string;
    creator: {
        id: string;
        full_name: string | null;
        avatar_url: string | null;
    };
}

interface TransactionFilters {
    month?: string;
    category?: string;
    payer?: string;
}

export function useTransactions(coupleId: string | undefined, filters?: TransactionFilters) {
    return useQuery({
        queryKey: ['transactions', coupleId, filters],
        queryFn: async () => {
            if (!coupleId) return [];

            const url = new URL("/api/transactions", window.location.origin);
            url.searchParams.set("coupleId", coupleId);

            if (filters?.month) url.searchParams.set("month", filters.month);
            if (filters?.category) url.searchParams.set("category", filters.category);
            if (filters?.payer) url.searchParams.set("payer", filters.payer);

            const res = await fetch(url.toString());
            const json = await res.json();

            if (!res.ok) {
                throw new Error(json.error || "Failed to fetch transactions");
            }

            return json.data as Transaction[];
        },
        staleTime: 30 * 1000,
        enabled: !!coupleId,
    });
}

export function useCreateTransaction() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: {
            coupleId: string;
            amount: number;
            category: string;
            note?: string;
            payer: "HIS" | "HERS" | "SHARED";
            type: "INCOME" | "EXPENSE";
            transactionDate?: string;
        }) => {
            const res = await fetch("/api/transactions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });

            const json = await res.json();

            if (!res.ok) {
                throw new Error(json.error || "Failed to create transaction");
            }

            return json.data as Transaction;
        },
        onSuccess: (data, variables) => {
            // Invalidate queries to trigger refetch
            queryClient.invalidateQueries({ queryKey: ['transactions', variables.coupleId] });
            queryClient.invalidateQueries({ queryKey: ['budget-summary', variables.coupleId] });
        },
    });
}

export function useUpdateTransaction() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: {
            id: string;
            coupleId: string;
            amount?: number;
            category?: string;
            note?: string;
            payer?: "HIS" | "HERS" | "SHARED";
            transactionDate?: string;
        }) => {
            const { id, coupleId, ...updateData } = data;

            const res = await fetch(`/api/transactions/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(updateData),
            });

            const json = await res.json();

            if (!res.ok) {
                throw new Error(json.error || "Failed to update transaction");
            }

            return json.data as Transaction;
        },
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['transactions', variables.coupleId] });
            queryClient.invalidateQueries({ queryKey: ['budget-summary', variables.coupleId] });
        },
    });
}

export function useDeleteTransaction() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: { id: string; coupleId: string }) => {
            const res = await fetch(`/api/transactions/${data.id}`, {
                method: "DELETE",
            });

            const json = await res.json();

            if (!res.ok) {
                throw new Error(json.error || "Failed to delete transaction");
            }

            return json;
        },
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['transactions', variables.coupleId] });
            queryClient.invalidateQueries({ queryKey: ['budget-summary', variables.coupleId] });
        },
    });
}

export function useBudgetSummary(coupleId: string | undefined, month?: string) {
    return useQuery({
        queryKey: ['budget-summary', coupleId, month],
        queryFn: async () => {
            if (!coupleId) return null;

            const url = new URL("/api/budget/summary", window.location.origin);
            url.searchParams.set("coupleId", coupleId);
            if (month) url.searchParams.set("month", month);

            const res = await fetch(url.toString());
            const json = await res.json();

            if (!res.ok) {
                throw new Error(json.error || "Failed to fetch budget summary");
            }

            return json.data;
        },
        staleTime: 30 * 1000,
        enabled: !!coupleId,
    });
}
