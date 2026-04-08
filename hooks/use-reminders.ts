"use client";

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { CursorPaginatedResponse } from "@/lib/pagination";
import { getErrorMessage, toast } from "@/lib/toast";
import type { ReminderView } from "@/lib/reminders";

export interface ReminderRecord {
  id: string;
  couple_id: string | null;
  user_id: string | null;
  trip_id: string | null;
  source: "CUSTOM" | "TRIP";
  name: string;
  note: string | null;
  reminder_date_key: string | null;
  reminder_time: string | null;
  has_date: boolean;
  has_time: boolean;
  scheduled_for: string | null;
  is_completed: boolean;
  is_deleted: boolean;
  completed_at: string | null;
  notification_sent_at: string | null;
  created_at: string;
  updated_at: string;
  date_label: string;
  time_label: string;
  schedule_label: string;
  creator: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
  trip: {
    id: string;
    title: string;
    destination: string;
    start_date: string;
    end_date: string;
  } | null;
}

export interface ReminderSummaryResponse {
  summary: {
    today: number;
    all: number;
    completed: number;
    progress: number;
  };
  month: string;
  todayDateKey: string;
  calendarDateCounts: Record<string, number>;
  calendarReminders: ReminderRecord[];
  scopeLabel: string;
}

type ReminderPageResponse = CursorPaginatedResponse<ReminderRecord>;

const REMINDER_PAGE_SIZE = 20;

export const REMINDER_KEYS = {
  all: ["reminders"] as const,
  summary: (month: string) => [...REMINDER_KEYS.all, "summary", month] as const,
  list: (view: ReminderView) => [...REMINDER_KEYS.all, "list", view] as const,
};

async function fetchReminderPage(view: ReminderView, cursor: string | null) {
  const url = new URL("/api/reminders", window.location.origin);
  url.searchParams.set("view", view);
  url.searchParams.set("limit", String(REMINDER_PAGE_SIZE));

  if (cursor) {
    url.searchParams.set("cursor", cursor);
  }

  const res = await fetch(url.toString(), {
    method: "GET",
    cache: "no-store",
  });
  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(json?.error || "Failed to fetch reminders");
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
    data: Array.isArray(json?.data) ? (json.data as ReminderRecord[]) : [],
    nextCursor,
    pagination: {
      hasMore: Boolean(json?.pagination?.hasMore),
      limit:
        typeof json?.pagination?.limit === "number"
          ? json.pagination.limit
          : REMINDER_PAGE_SIZE,
      nextCursor,
    },
  } satisfies ReminderPageResponse;
}

export function useReminderSummary(month: string, enabled = true) {
  return useQuery({
    queryKey: REMINDER_KEYS.summary(month),
    queryFn: async () => {
      const url = new URL("/api/reminders/summary", window.location.origin);
      url.searchParams.set("month", month);

      const res = await fetch(url.toString(), {
        method: "GET",
        cache: "no-store",
      });
      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(json?.error || "Failed to fetch reminder summary");
      }

      return json as ReminderSummaryResponse;
    },
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    enabled,
  });
}

export function useInfiniteReminders(view: ReminderView) {
  const query = useInfiniteQuery({
    queryKey: REMINDER_KEYS.list(view),
    queryFn: ({ pageParam }) => fetchReminderPage(view, typeof pageParam === "string" ? pageParam : null),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    staleTime: 0,
    gcTime: 10 * 60 * 1000,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    retry: 1,
  });

  return {
    ...query,
    reminders: query.data?.pages.flatMap((page) => page.data) ?? [],
  };
}

export function useCreateReminder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      name: string;
      note?: string;
      hasDate: boolean;
      hasTime: boolean;
      reminderDateKey?: string | null;
      reminderTime?: string | null;
    }) => {
      const res = await fetch("/api/reminders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(json?.error || "Failed to create reminder");
      }

      return json.data as ReminderRecord;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: REMINDER_KEYS.all });
      toast.success("Reminder created", `${data.name} was added to your list.`);
    },
    onError: (error) => {
      toast.error("Couldn't create reminder", getErrorMessage(error, "Please try again."));
    },
  });
}

export function useUpdateReminder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      id: string;
      name?: string;
      note?: string;
      hasDate?: boolean;
      hasTime?: boolean;
      reminderDateKey?: string | null;
      reminderTime?: string | null;
      isCompleted?: boolean;
    }) => {
      const { id, ...body } = payload;
      const res = await fetch(`/api/reminders/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(json?.error || "Failed to update reminder");
      }

      return json.data as ReminderRecord;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: REMINDER_KEYS.all });
      toast.success("Reminder updated", `${data.name} was updated.`);
    },
    onError: (error) => {
      toast.error("Couldn't update reminder", getErrorMessage(error, "Please try again."));
    },
  });
}

export function useDeleteReminder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/reminders/${id}`, {
        method: "DELETE",
      });
      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(json?.error || "Failed to delete reminder");
      }

      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: REMINDER_KEYS.all });
      toast.success("Reminder removed", "The reminder was deleted.");
    },
    onError: (error) => {
      toast.error("Couldn't delete reminder", getErrorMessage(error, "Please try again."));
    },
  });
}

export function useToggleReminderCompletion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { id: string; isCompleted: boolean }) => {
      const res = await fetch(`/api/reminders/${payload.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          isCompleted: payload.isCompleted,
        }),
      });
      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(json?.error || "Failed to update reminder");
      }

      return json.data as ReminderRecord;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: REMINDER_KEYS.all });
      toast.success(
        data.is_completed ? "Reminder completed" : "Reminder reopened",
        data.is_completed ? `${data.name} moved to completed.` : `${data.name} is back in progress.`
      );
    },
    onError: (error) => {
      toast.error("Couldn't update reminder", getErrorMessage(error, "Please try again."));
    },
  });
}
