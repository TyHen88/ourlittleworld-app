"use client";

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { CursorPaginatedResponse } from "@/lib/pagination";
import { getErrorMessage, toast } from "@/lib/toast";

export interface Transaction {
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

export interface TransactionFilters {
    month?: string;
    category?: string;
    payer?: string;
    period?: "day" | "month" | "year";
    date?: string;
}

type TransactionPageResponse = CursorPaginatedResponse<Transaction>;

const TRANSACTION_PAGE_SIZE = 20;

export const TRANSACTION_KEYS = {
    all: ["transactions"] as const,
    owner: (id: string | undefined) => [...TRANSACTION_KEYS.all, id] as const,
    list: (id: string | undefined, filters?: TransactionFilters) =>
        [...TRANSACTION_KEYS.owner(id), filters] as const,
    infinite: (id: string | undefined, filters?: TransactionFilters) =>
        [...TRANSACTION_KEYS.owner(id), "infinite", filters] as const,
    summary: (
        id: string | undefined,
        filters?: { month?: string; period?: "day" | "month" | "year"; date?: string }
    ) => ["budget-summary", id, filters] as const,
};

function appendTransactionFilters(url: URL, filters?: TransactionFilters) {
    if (filters?.period) url.searchParams.set("period", filters.period);
    if (filters?.date) url.searchParams.set("date", filters.date);
    if (filters?.month) url.searchParams.set("month", filters.month);
    if (filters?.category) url.searchParams.set("category", filters.category);
    if (filters?.payer) url.searchParams.set("payer", filters.payer);
}

async function fetchTransactionPage(params: {
    cursor?: string | null;
    filters?: TransactionFilters;
    id: string;
    limit?: number;
}): Promise<TransactionPageResponse> {
    const url = new URL("/api/transactions", window.location.origin);
    url.searchParams.set("id", params.id);
    appendTransactionFilters(url, params.filters);

    if (params.cursor) {
        url.searchParams.set("cursor", params.cursor);
    }

    if (params.limit) {
        url.searchParams.set("limit", String(params.limit));
    }

    const res = await fetch(url.toString(), {
        method: "GET",
        cache: "no-store",
    });
    const json = await res.json().catch(() => ({}));

    if (!res.ok) {
        throw new Error(json?.error || "Failed to fetch transactions");
    }

    const nextCursor =
        typeof json?.pagination?.nextCursor === "string"
            ? json.pagination.nextCursor
            : json?.pagination?.nextCursor === null
                ? null
                : typeof json?.nextCursor === "string"
                    ? json.nextCursor
                    : null;

    return {
        data: Array.isArray(json?.data) ? (json.data as Transaction[]) : [],
        nextCursor,
        pagination: {
            hasMore: Boolean(json?.pagination?.hasMore),
            limit:
                typeof json?.pagination?.limit === "number"
                    ? json.pagination.limit
                    : params.limit ?? TRANSACTION_PAGE_SIZE,
            nextCursor,
        },
    };
}

export function useTransactions(id: string | undefined, filters?: TransactionFilters) {
    return useQuery({
        queryKey: TRANSACTION_KEYS.list(id, filters),
        queryFn: async () => {
            if (!id) return [];

            const result = await fetchTransactionPage({
                id,
                filters,
            });

            return result.data;
        },
        staleTime: 0,
        refetchOnMount: "always",
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
        enabled: !!id,
    });
}

export function useInfiniteTransactions(id: string | undefined, filters?: TransactionFilters) {
    const query = useInfiniteQuery({
        queryKey: TRANSACTION_KEYS.infinite(id, filters),
        queryFn: async ({ pageParam }) => {
            if (!id) {
                return {
                    data: [],
                    nextCursor: null,
                    pagination: {
                        hasMore: false,
                        limit: TRANSACTION_PAGE_SIZE,
                        nextCursor: null,
                    },
                } satisfies TransactionPageResponse;
            }

            return fetchTransactionPage({
                id,
                cursor: typeof pageParam === "string" ? pageParam : null,
                filters,
                limit: TRANSACTION_PAGE_SIZE,
            });
        },
        initialPageParam: null as string | null,
        getNextPageParam: (lastPage) => lastPage.nextCursor,
        enabled: !!id,
        staleTime: 0,
        gcTime: 10 * 60 * 1000,
        refetchOnMount: "always",
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
        placeholderData: (previousData) => previousData,
        retry: 1,
    });

    return {
        ...query,
        transactions: query.data?.pages.flatMap((page) => page.data) ?? [],
    };
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
            const id = variables.coupleId || variables.userId;
            if (id) {
                queryClient.invalidateQueries({ queryKey: TRANSACTION_KEYS.owner(id) });
                queryClient.invalidateQueries({ queryKey: ["budget-summary", id] });
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
                queryClient.invalidateQueries({ queryKey: TRANSACTION_KEYS.owner(ownerId) });
                queryClient.invalidateQueries({ queryKey: ["budget-summary", ownerId] });
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
        onSuccess: (_data, variables) => {
            const ownerId = variables.coupleId || variables.userId;
            if (ownerId) {
                queryClient.invalidateQueries({ queryKey: TRANSACTION_KEYS.owner(ownerId) });
                queryClient.invalidateQueries({ queryKey: ["budget-summary", ownerId] });
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
        queryKey: TRANSACTION_KEYS.summary(id, filters),
        queryFn: async () => {
            if (!id) return null;

            const url = new URL("/api/budget/summary", window.location.origin);
            url.searchParams.set("id", id);
            if (filters?.month) url.searchParams.set("month", filters.month);
            if (filters?.period) url.searchParams.set("period", filters.period);
            if (filters?.date) url.searchParams.set("date", filters.date);

            const res = await fetch(url.toString(), { cache: "no-store" });
            const json = await res.json();

            if (!res.ok) {
                throw new Error(json.error || "Failed to fetch budget summary");
            }

            return json.data;
        },
        staleTime: 0,
        refetchOnMount: "always",
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
        enabled: !!id,
    });
}
