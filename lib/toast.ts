"use client";

import { create } from "zustand";

export type ToastVariant = "success" | "error" | "info";

export interface ToastOptions {
    title: string;
    description?: string;
    variant?: ToastVariant;
    duration?: number;
}

export interface ToastItem extends ToastOptions {
    id: string;
    variant: ToastVariant;
}

interface ToastState {
    toasts: ToastItem[];
    showToast: (options: ToastOptions) => string;
    dismissToast: (id: string) => void;
}

const DEFAULT_DURATION = 4000;

const createToastId = () => {
    try {
        return crypto.randomUUID();
    } catch {
        return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    }
};

export const useToastStore = create<ToastState>((set, get) => ({
    toasts: [],
    showToast: (options) => {
        const id = createToastId();
        const nextToast: ToastItem = {
            id,
            title: options.title,
            description: options.description,
            variant: options.variant ?? "info",
            duration: options.duration ?? DEFAULT_DURATION,
        };

        set((state) => ({
            toasts: [...state.toasts, nextToast],
        }));

        if ((nextToast.duration ?? DEFAULT_DURATION) > 0) {
            window.setTimeout(() => {
                get().dismissToast(id);
            }, nextToast.duration ?? DEFAULT_DURATION);
        }

        return id;
    },
    dismissToast: (id) =>
        set((state) => ({
            toasts: state.toasts.filter((toast) => toast.id !== id),
        })),
}));

const pushToast = (options: ToastOptions) => useToastStore.getState().showToast(options);

export const toast = {
    success: (title: string, description?: string, duration?: number) =>
        pushToast({ title, description, duration, variant: "success" }),
    error: (title: string, description?: string, duration?: number) =>
        pushToast({ title, description, duration, variant: "error" }),
    info: (title: string, description?: string, duration?: number) =>
        pushToast({ title, description, duration, variant: "info" }),
    dismiss: (id: string) => useToastStore.getState().dismissToast(id),
};

export function getErrorMessage(error: unknown, fallback: string) {
    if (error instanceof Error && error.message) {
        return error.message;
    }

    return fallback;
}
