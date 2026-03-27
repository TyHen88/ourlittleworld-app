"use client";

import { getErrorMessage, toast } from "@/lib/toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface Transaction {
    id: string;
    couple_id: string;
    amount: number;
    category: string;
    note: string | null;
    payer: "HIS" | "HERS" | "SHARED";
    type?: "INCOME" | "EXPENSE";
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
    period?: "day" | "month" | "year";
    date?: string;
}

export function useTransactions(id: string | undefined, filters?: TransactionFilters) {
    return useQuery({
        queryKey: ['transactions', id, filters],
        queryFn: async () => {
            if (!id) return [];

            const url = new URL("/api/transactions", window.location.origin);
            url.searchParams.set("id", id);

            if (filters?.period) url.searchParams.set("period", filters.period);
            if (filters?.date) url.searchParams.set("date", filters.date);
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
        enabled: !!id,
    });
}

export function useCreateTransaction() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: {
            coupleId?: string;
            userId?: string;
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
            const id = variables.coupleId || variables.userId;
            if (id) {
                queryClient.invalidateQueries({ queryKey: ['transactions', id] });
                queryClient.invalidateQueries({ queryKey: ['budget-summary', id] });
            }
            toast.success(
                data.type === "INCOME" ? "Income added" : "Transaction added",
                `${data.category} for $${Number(data.amount).toFixed(2)} was saved.`,
            );
        },
        onError: (error) => {
            toast.error("Couldn't save transaction", getErrorMessage(error, "Failed to create transaction"));
        },
    });
}

export function useUpdateTransaction() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: {
            id: string;
            coupleId?: string;
            userId?: string;
            amount?: number;
            category?: string;
            note?: string;
            payer?: "HIS" | "HERS" | "SHARED";
            transactionDate?: string;
        }) => {
            const { id, coupleId, userId, ...updateData } = data;
            void coupleId;
            void userId;

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
            const ownerId = variables.coupleId || variables.userId;
            if (ownerId) {
                queryClient.invalidateQueries({ queryKey: ['transactions', ownerId] });
                queryClient.invalidateQueries({ queryKey: ['budget-summary', ownerId] });
            }
            toast.success("Transaction updated", `${data.category} was updated.`);
        },
        onError: (error) => {
            toast.error("Couldn't update transaction", getErrorMessage(error, "Failed to update transaction"));
        },
    });
}

export function useDeleteTransaction() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: { id: string; coupleId?: string; userId?: string }) => {
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
            const ownerId = variables.coupleId || variables.userId;
            if (ownerId) {
                queryClient.invalidateQueries({ queryKey: ['transactions', ownerId] });
                queryClient.invalidateQueries({ queryKey: ['budget-summary', ownerId] });
            }
            toast.success("Transaction deleted", "The transaction was removed.");
        },
        onError: (error) => {
            toast.error("Couldn't delete transaction", getErrorMessage(error, "Failed to delete transaction"));
        },
    });
}

export function useBudgetSummary(
    id: string | undefined,
    filters?: { month?: string; period?: "day" | "month" | "year"; date?: string }
) {
    return useQuery({
        queryKey: ['budget-summary', id, filters],
        queryFn: async () => {
            if (!id) return null;

            const url = new URL("/api/budget/summary", window.location.origin);
            url.searchParams.set("id", id);
            if (filters?.month) url.searchParams.set("month", filters.month);
            if (filters?.period) url.searchParams.set("period", filters.period);
            if (filters?.date) url.searchParams.set("date", filters.date);

            const res = await fetch(url.toString());
            const json = await res.json();

            if (!res.ok) {
                throw new Error(json.error || "Failed to fetch budget summary");
            }

            return json.data;
        },
        staleTime: 30 * 1000,
        enabled: !!id,
    });
}
