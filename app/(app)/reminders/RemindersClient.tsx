"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { AppBackButton } from "@/components/navigation/AppBackButton";
import {
  AlarmClock,
  Bell,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Circle,
  Clock3,
  ListTodo,
  LoaderCircle,
  PencilLine,
  Plane,
  Plus,
  Trash2,
  TrendingUp,
  X,
} from "lucide-react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";

import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { FullPageLoader } from "@/components/FullPageLoader";
import { ReminderDetailSheet } from "@/components/reminders/ReminderDetailSheet";
import {
  type ReminderRecord,
  useCreateReminder,
  useDeleteReminder,
  useInfiniteReminders,
  useReminderSummary,
  useToggleReminderCompletion,
  useUpdateReminder,
} from "@/hooks/use-reminders";
import {
  DEFAULT_CUSTOM_REMINDER_TIME,
  type ReminderView,
  getTodayReminderDateKey,
} from "@/lib/reminders";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";

type ReminderFormState = {
  name: string;
  note: string;
  hasDate: boolean;
  hasTime: boolean;
  reminderDateKey: string;
  reminderTime: string;
};

type ReminderTimeParts = {
  hour: number;
  minute: number;
  meridiem: "AM" | "PM";
};

type ReminderProfile = {
  user_type?: string | null;
  couple?: {
    id: string;
  } | null;
} | null;

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const REMINDER_HOURS = Array.from({ length: 12 }, (_, index) => index + 1);
const REMINDER_MINUTES = Array.from({ length: 60 }, (_, index) => index);
const REMINDER_MERIDIEMS = ["AM", "PM"] as const;

function createEmptyReminderForm(dateKey = getTodayReminderDateKey()): ReminderFormState {
  return {
    name: "",
    note: "",
    hasDate: false,
    hasTime: false,
    reminderDateKey: dateKey,
    reminderTime: DEFAULT_CUSTOM_REMINDER_TIME,
  };
}

function reminderToForm(reminder: ReminderRecord): ReminderFormState {
  return {
    name: reminder.name,
    note: reminder.note ?? "",
    hasDate: reminder.has_date,
    hasTime: reminder.has_time,
    reminderDateKey: reminder.reminder_date_key ?? getTodayReminderDateKey(),
    reminderTime: reminder.reminder_time ?? DEFAULT_CUSTOM_REMINDER_TIME,
  };
}

function parseReminderTime(value: string | null | undefined): ReminderTimeParts {
  if (!value || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value)) {
    return {
      hour: 9,
      minute: 0,
      meridiem: "AM",
    };
  }

  const [rawHour, rawMinute] = value.split(":").map(Number);

  return {
    hour: rawHour % 12 === 0 ? 12 : rawHour % 12,
    minute: rawMinute,
    meridiem: rawHour >= 12 ? "PM" : "AM",
  };
}

function formatReminderTime(parts: ReminderTimeParts) {
  let hour = parts.hour % 12;

  if (parts.meridiem === "PM") {
    hour += 12;
  }

  return `${String(hour).padStart(2, "0")}:${String(parts.minute).padStart(2, "0")}`;
}

function dateKeyToDate(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function RemindersClient({
  user,
  profile,
}: {
  user: {
    id?: string;
    name?: string | null;
  };
  profile: ReminderProfile;
}) {
  const router = useRouter();
  const isSingle = profile?.user_type === "SINGLE";
  const monthKey = getTodayReminderDateKey().slice(0, 7);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingReminder, setEditingReminder] = useState<ReminderRecord | null>(null);
  const [detailReminder, setDetailReminder] = useState<ReminderRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ReminderRecord | null>(null);
  const [activeView, setActiveView] = useState<ReminderView>("progress");
  const [editorMonth, setEditorMonth] = useState(() => dateKeyToDate(getTodayReminderDateKey()));
  const [form, setForm] = useState<ReminderFormState>(() => createEmptyReminderForm());
  const sentinelRef = useRef<HTMLDivElement>(null);

  const { data: summaryData } = useReminderSummary(monthKey, Boolean(user?.id));
  const {
    reminders,
    isLoading: listLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteReminders(activeView);

  const createReminder = useCreateReminder();
  const updateReminder = useUpdateReminder();
  const deleteReminder = useDeleteReminder();
  const toggleReminder = useToggleReminderCompletion();
  const reminderTimeParts = useMemo(() => parseReminderTime(form.reminderTime), [form.reminderTime]);

  useEffect(() => {
    if (!hasNextPage || isFetchingNextPage) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          void fetchNextPage();
        }
      },
      { rootMargin: "320px" }
    );

    if (sentinelRef.current) {
      observer.observe(sentinelRef.current);
    }

    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  const editorCalendarDays = useMemo(() => {
    const monthStart = startOfMonth(editorMonth);
    const monthEnd = endOfMonth(editorMonth);

    return eachDayOfInterval({
      start: startOfWeek(monthStart),
      end: endOfWeek(monthEnd),
    });
  }, [editorMonth]);

  const cards = useMemo(
    () => [
      {
        label: "Today",
        view: "today" as const,
        count: summaryData?.summary.today ?? 0,
        icon: AlarmClock,
        activeTone: isSingle ? "border-emerald-200 bg-emerald-50/80 ring-emerald-100" : "border-amber-200 bg-amber-50/80 ring-amber-100",
        iconTone: isSingle ? "bg-emerald-100 text-emerald-600" : "bg-amber-100 text-amber-600",
      },
      {
        label: "All",
        view: "all" as const,
        count: summaryData?.summary.all ?? 0,
        icon: ListTodo,
        activeTone: "border-slate-200 bg-slate-50/90 ring-slate-100",
        iconTone: "bg-slate-100 text-slate-600",
      },
      {
        label: "Completed",
        view: "completed" as const,
        count: summaryData?.summary.completed ?? 0,
        icon: CheckCircle2,
        activeTone: "border-green-200 bg-green-50/80 ring-green-100",
        iconTone: "bg-green-100 text-green-600",
      },
      {
        label: "Progress",
        view: "progress" as const,
        count: summaryData?.summary.progress ?? 0,
        icon: TrendingUp,
        activeTone: isSingle ? "border-emerald-200 bg-emerald-50/80 ring-emerald-100" : "border-romantic-blush/60 bg-romantic-blush/20 ring-romantic-blush/10",
        iconTone: isSingle ? "bg-emerald-100 text-emerald-600" : "bg-romantic-blush/45 text-romantic-heart",
      },
    ],
    [isSingle, summaryData]
  );

  const scopeLabel = summaryData?.scopeLabel ?? (isSingle ? "My List" : "Our List");
  const activeCard = cards.find((card) => card.view === activeView) ?? cards[cards.length - 1];
  const emptyStateTitle =
    activeView === "today"
      ? "No reminders for today"
      : activeView === "completed"
        ? "No completed reminders"
        : activeView === "all"
          ? "No reminders yet"
          : "No active reminders";

  const openCreateReminder = () => {
    const todayDateKey = summaryData?.todayDateKey ?? getTodayReminderDateKey();
    setEditingReminder(null);
    setForm(createEmptyReminderForm(todayDateKey));
    setEditorMonth(dateKeyToDate(todayDateKey));
    setIsEditorOpen(true);
  };

  const openEditReminder = (reminder: ReminderRecord) => {
    if (reminder.source === "TRIP") {
      setDetailReminder(reminder);
      return;
    }

    setEditingReminder(reminder);
    setForm(reminderToForm(reminder));
    setEditorMonth(dateKeyToDate(reminder.reminder_date_key ?? getTodayReminderDateKey()));
    setDetailReminder(null);
    setIsEditorOpen(true);
  };

  const closeEditor = () => {
    const todayDateKey = summaryData?.todayDateKey ?? getTodayReminderDateKey();
    setIsEditorOpen(false);
    setEditingReminder(null);
    setForm(createEmptyReminderForm(todayDateKey));
    setEditorMonth(dateKeyToDate(todayDateKey));
  };

  const handleReminderSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!form.name.trim()) {
      toast.error("Reminder name required", "Give this reminder a short name.");
      return;
    }

    const payload = {
      name: form.name.trim(),
      note: form.note.trim(),
      hasDate: form.hasDate,
      hasTime: form.hasTime,
      reminderDateKey: form.hasDate ? form.reminderDateKey : summaryData?.todayDateKey ?? getTodayReminderDateKey(),
      reminderTime: form.hasTime ? form.reminderTime : DEFAULT_CUSTOM_REMINDER_TIME,
    };

    try {
      if (editingReminder) {
        await updateReminder.mutateAsync({
          id: editingReminder.id,
          ...payload,
        });
      } else {
        await createReminder.mutateAsync(payload);
      }

      closeEditor();
    } catch {
      // Toast handled in hooks.
    }
  };

  const requestDeleteReminder = (reminder: ReminderRecord) => {
    setDeleteTarget(reminder);
  };

  const closeDeleteReminderModal = () => {
    if (deleteReminder.isPending) {
      return;
    }

    setDeleteTarget(null);
  };

  const handleDeleteReminder = async () => {
    if (!deleteTarget) {
      return;
    }

    try {
      await deleteReminder.mutateAsync(deleteTarget.id);
      setDetailReminder(null);
      setDeleteTarget(null);

      if (editingReminder?.id === deleteTarget.id) {
        closeEditor();
      }
    } catch {
      // Toast handled in hook.
    }
  };

  const handleToggleComplete = async (reminder: ReminderRecord) => {
    try {
      await toggleReminder.mutateAsync({
        id: reminder.id,
        isCompleted: !reminder.is_completed,
      });

      if (detailReminder?.id === reminder.id) {
        setDetailReminder(null);
      }
    } catch {
      // Toast handled in hook.
    }
  };

  const updateReminderTime = (updates: Partial<ReminderTimeParts>) => {
    setForm((current) => {
      const nextParts = {
        ...parseReminderTime(current.reminderTime),
        ...updates,
      };

      return {
        ...current,
        reminderTime: formatReminderTime(nextParts),
      };
    });
  };

  if (!user?.id) {
    return <FullPageLoader />;
  }

  return (
    <div className="min-h-[100dvh] bg-slate-50/50 pb-24">
      <header className={`sticky top-0 z-20 border-b bg-white/92 md:bg-white/85 md:backdrop-blur-xl ${isSingle ? "border-emerald-100" : "border-romantic-blush/30"}`}>
        <div className="mx-auto flex h-16 max-w-2xl items-center px-4">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <AppBackButton
              fallbackHref="/dashboard"
            />
            <div className="min-w-0">
              <h1 className="flex items-center gap-2 text-lg font-black tracking-tight text-slate-800">
                <Bell className={isSingle ? "text-emerald-500" : "text-romantic-heart"} size={20} />
                Reminders
              </h1>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-2xl space-y-5 px-4 py-5">
        <section>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-2 gap-3"
          >
            {cards.map((card) => {
              const Icon = card.icon;

              return (
                <button
                  key={card.label}
                  type="button"
                  onClick={() => setActiveView(card.view)}
                  className="text-left"
                >
                  <Card
                    className={cn(
                      "rounded-3xl border bg-white/90 px-4 py-4 shadow-sm transition-all",
                      activeView === card.view &&
                        cn("ring-2", card.activeTone),
                      activeView !== card.view && "border-slate-200/80 hover:border-slate-300/80 hover:bg-white"
                    )}
                  >
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div className={cn("inline-flex size-10 items-center justify-center rounded-2xl", card.iconTone)}>
                        <Icon size={18} />
                      </div>
                      <span className="text-lg font-black text-slate-800">{card.count}</span>
                    </div>
                    <p className="text-xs font-semibold text-slate-500">
                      {card.label}
                    </p>
                  </Card>
                </button>
              );
            })}
          </motion.div>
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-slate-800">{scopeLabel}</h2>
            <span className="text-xs font-semibold text-slate-500">
              {activeCard.label}
            </span>
          </div>

          {listLoading && reminders.length === 0 ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="h-18 rounded-3xl border border-slate-200/70 bg-white/80 animate-pulse shadow-sm" />
              ))}
            </div>
          ) : reminders.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-200 bg-white px-4 py-6 text-center">
              <Bell className={cn("mx-auto mb-2", isSingle ? "text-emerald-400" : "text-romantic-heart/70")} size={22} />
              <p className="text-sm font-bold text-slate-600">{emptyStateTitle}</p>
            </div>
          ) : (
            <div className="space-y-2">
              <AnimatePresence initial={false}>
                {reminders.map((reminder) => (
                  <motion.div
                    key={reminder.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                  >
                    <div className="flex items-start gap-3 rounded-3xl border border-slate-200/80 bg-white/90 px-4 py-3.5 shadow-sm transition-colors hover:border-slate-300/80">
                      <button
                        type="button"
                        onClick={() => void handleToggleComplete(reminder)}
                        className="mt-0.5 shrink-0"
                        aria-label={`Mark ${reminder.name} as completed`}
                      >
                        {reminder.is_completed ? (
                          <CheckCircle2 size={22} className="text-green-500" />
                        ) : (
                          <Circle size={22} className={isSingle ? "text-emerald-400" : "text-romantic-heart/70"} />
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => setDetailReminder(reminder)}
                        className="min-w-0 flex-1 text-left"
                      >
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-black text-slate-800">{reminder.name}</p>
                          {reminder.source === "TRIP" ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                              <Plane size={10} />
                              Trip
                            </span>
                          ) : null}
                        </div>
                        {reminder.note ? (
                          <p className="mt-1 line-clamp-1 text-sm text-slate-500">{reminder.note}</p>
                        ) : null}
                        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] font-medium text-slate-500">
                          <span className="inline-flex items-center gap-1">
                            <Clock3 size={12} />
                            {reminder.schedule_label}
                          </span>
                          {reminder.trip ? (
                            <span className="inline-flex items-center gap-1 text-amber-700">
                              <Plane size={12} />
                              {reminder.trip.destination}
                            </span>
                          ) : null}
                        </div>
                      </button>

                      <div className="flex shrink-0 items-center gap-1">
                        {reminder.source === "CUSTOM" ? (
                          <button
                            type="button"
                            onClick={() => openEditReminder(reminder)}
                            className="rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                            aria-label={`Edit ${reminder.name}`}
                          >
                            <PencilLine size={16} />
                          </button>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => requestDeleteReminder(reminder)}
                          className="rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-rose-600"
                          aria-label={reminder.source === "TRIP" ? `Turn off ${reminder.name}` : `Delete ${reminder.name}`}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              <div ref={sentinelRef} className="py-2 text-center">
                {isFetchingNextPage ? (
                  <p className="text-xs font-medium text-slate-400">Loading more reminders...</p>
                ) : hasNextPage ? (
                  <p className="text-xs font-medium text-slate-300">Scroll for more</p>
                ) : reminders.length > 0 ? (
                  <p className="text-xs font-medium text-slate-300">End of the list</p>
                ) : null}
              </div>
            </div>
          )}
        </section>
      </div>

      <motion.button
        type="button"
        onClick={openCreateReminder}
        aria-label="Add reminder"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2, type: "spring" }}
        className={cn(
          "fixed bottom-24 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full border-2 border-white text-white shadow-2xl",
          isSingle ? "bg-emerald-500" : "bg-gradient-button"
        )}
      >
        <Plus size={18} />
      </motion.button>

      <AnimatePresence>
        {deleteTarget ? (
          <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
              onClick={closeDeleteReminderModal}
            />
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.96 }}
              transition={{ type: "spring", damping: 24, stiffness: 280 }}
              className="relative z-10 w-full max-w-sm rounded-3xl bg-white p-5 shadow-2xl"
            >
              <div className="mb-4 flex items-start gap-3">
                <div className="rounded-2xl bg-rose-100 p-3 text-rose-600">
                  <Trash2 size={20} />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg font-black text-slate-800">
                    {deleteTarget.source === "TRIP" ? "Turn Off Reminder?" : "Delete Reminder?"}
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    {deleteTarget.source === "TRIP"
                      ? `${deleteTarget.name} will be removed from your reminder list.`
                      : `${deleteTarget.name} will be moved out of your reminder list.`}
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={closeDeleteReminderModal}
                  disabled={deleteReminder.isPending}
                  className="h-11 flex-1 rounded-2xl border border-slate-200 bg-white text-sm font-bold text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void handleDeleteReminder()}
                  disabled={deleteReminder.isPending}
                  className="flex h-11 flex-1 items-center justify-center gap-2 rounded-2xl bg-rose-500 text-sm font-bold text-white transition-colors hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {deleteReminder.isPending ? (
                    <LoaderCircle size={16} className="animate-spin" />
                  ) : (
                    <Trash2 size={16} />
                  )}
                  {deleteTarget.source === "TRIP" ? "Turn Off" : "Delete"}
                </button>
              </div>
            </motion.div>
          </div>
        ) : null}

        {isEditorOpen ? (
          <div className="fixed inset-0 z-50 flex items-end justify-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={closeEditor}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 24, stiffness: 280 }}
              className="relative w-full max-w-none overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:mb-4 sm:max-w-lg sm:rounded-3xl"
            >
              <div className="max-h-[90dvh] overflow-y-auto px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 sm:px-6 sm:pb-6">
                <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-slate-200" />

                <div className="mb-4 flex items-center gap-3">
                  <div className={cn(
                    "rounded-2xl p-2.5",
                    isSingle ? "bg-emerald-100 text-emerald-600" : "bg-romantic-blush/30 text-romantic-heart"
                  )}>
                    <Bell size={20} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-base font-black text-slate-800 sm:text-lg">
                      {editingReminder ? "Edit Reminder" : "Create Reminder"}
                    </h2>
                    <p className="text-[11px] font-medium text-slate-500">
                      Save a note, add a date, and optionally set a push time.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={closeEditor}
                    className="rounded-full p-1.5 text-slate-400 transition-colors hover:bg-slate-100"
                  >
                    <X size={18} />
                  </button>
                </div>

                <form onSubmit={handleReminderSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="ml-1 block text-[11px] font-semibold text-slate-500">Name</label>
                    <Input
                      required
                      placeholder="e.g. Pay rent, call mom, pack bag"
                      value={form.name}
                      onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                      className={cn(
                        "h-11 rounded-xl border-slate-100 text-base [font-size:16px]",
                        isSingle ? "focus-visible:border-emerald-500 focus-visible:ring-emerald-100" : "focus-visible:border-romantic-heart focus-visible:ring-romantic-blush/40"
                      )}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="ml-1 block text-[11px] font-semibold text-slate-500">Note</label>
                    <textarea
                      placeholder="Keep it short and useful."
                      value={form.note}
                      onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))}
                      className={cn(
                        "min-h-[88px] w-full resize-none rounded-xl border border-slate-100 px-3 py-2.5 text-base text-slate-800 outline-none transition-[color,box-shadow,border-color] [font-size:16px]",
                        isSingle ? "focus:border-emerald-500 focus:ring-3 focus:ring-emerald-100" : "focus:border-romantic-heart focus:ring-3 focus:ring-romantic-blush/40"
                      )}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setForm((current) => {
                        const nextHasDate = !current.hasDate;
                        const todayDateKey = summaryData?.todayDateKey ?? getTodayReminderDateKey();

                        return {
                          ...current,
                          hasDate: nextHasDate,
                          reminderDateKey: nextHasDate ? current.reminderDateKey : todayDateKey,
                        };
                      })
                    }
                    className={cn(
                      "flex w-full items-center justify-between gap-4 rounded-2xl bg-white px-4 text-left transition-colors hover:bg-slate-50"
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-slate-800">Date</p>
                    </div>
                    <span
                      aria-hidden="true"
                      className={cn(
                        "relative inline-flex h-7 w-12 shrink-0 rounded-full transition-colors",
                        form.hasDate ? "bg-slate-800" : "bg-slate-300"
                      )}
                    >
                      <span
                        className={cn(
                          "absolute top-1 size-5 rounded-full bg-white shadow-sm transition-transform",
                          form.hasDate ? "translate-x-6" : "translate-x-1"
                        )}
                      />
                    </span>
                  </button>

                  {form.hasDate ? (
                    <div className="rounded-3xl border border-slate-200 bg-slate-50/70 p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <p className="text-sm font-black text-slate-800">{format(editorMonth, "MMMM yyyy")}</p>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setEditorMonth((value) => subMonths(value, 1))}
                            className="rounded-full p-2 transition-colors hover:bg-white"
                          >
                            <ChevronLeft size={18} className="text-slate-500" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditorMonth((value) => addMonths(value, 1))}
                            className="rounded-full p-2 transition-colors hover:bg-white"
                          >
                            <ChevronRight size={18} className="text-slate-500" />
                          </button>
                        </div>
                      </div>

                      <div className="mb-2 grid grid-cols-7 gap-2">
                        {WEEKDAYS.map((day) => (
                          <div key={day} className="text-center text-[10px] font-semibold text-slate-400">
                            {day}
                          </div>
                        ))}
                      </div>

                      <div className="grid grid-cols-7 gap-2">
                        {editorCalendarDays.map((day) => {
                          const dateKey = format(day, "yyyy-MM-dd");
                          const isSelected = form.reminderDateKey === dateKey;

                          return (
                            <button
                              key={dateKey}
                              type="button"
                              onClick={() => setForm((current) => ({ ...current, reminderDateKey: dateKey }))}
                              className={cn(
                                "rounded-2xl border px-1 py-2 text-center text-xs font-bold transition-all",
                                isSelected
                                  ? isSingle
                                    ? "border-emerald-400 bg-emerald-500 text-white"
                                    : "border-romantic-heart bg-romantic-heart text-white"
                                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-100",
                                !isSameMonth(day, editorMonth) && "opacity-35"
                              )}
                            >
                              {format(day, "d")}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}

                  <div aria-hidden="true" className="h-px bg-slate-200" />

                  <button
                    type="button"
                    onClick={() =>
                      setForm((current) => {
                        const nextHasTime = !current.hasTime;

                        return {
                          ...current,
                          hasTime: nextHasTime,
                          reminderTime: nextHasTime ? current.reminderTime : DEFAULT_CUSTOM_REMINDER_TIME,
                        };
                      })
                    }
                    className={cn(
                      "flex w-full items-center justify-between gap-4 rounded-2xl bg-white px-4 text-left transition-colors hover:bg-slate-50"
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-slate-800">Time</p>
                    </div>
                    <span
                      aria-hidden="true"
                      className={cn(
                        "relative inline-flex h-7 w-12 shrink-0 rounded-full transition-colors",
                        form.hasTime ? "bg-slate-800" : "bg-slate-300"
                      )}
                    >
                      <span
                        className={cn(
                          "absolute top-1 size-5 rounded-full bg-white shadow-sm transition-transform",
                          form.hasTime ? "translate-x-6" : "translate-x-1"
                        )}
                      />
                    </span>
                  </button>

                  {form.hasTime ? (
                    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                      <label className="block text-[11px] font-semibold text-slate-500">
                        Reminder Time
                      </label>
                      <div className="mt-2 grid grid-cols-3 gap-2">
                        <select
                          value={String(reminderTimeParts.hour)}
                          onChange={(event) =>
                            updateReminderTime({
                              hour: Number(event.target.value),
                            })
                          }
                          className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700"
                        >
                          {REMINDER_HOURS.map((hour) => (
                            <option key={hour} value={hour}>
                              {String(hour).padStart(2, "0")}
                            </option>
                          ))}
                        </select>
                        <select
                          value={String(reminderTimeParts.minute)}
                          onChange={(event) =>
                            updateReminderTime({
                              minute: Number(event.target.value),
                            })
                          }
                          className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700"
                        >
                          {REMINDER_MINUTES.map((minute) => (
                            <option key={minute} value={minute}>
                              {String(minute).padStart(2, "0")}
                            </option>
                          ))}
                        </select>
                        <select
                          value={reminderTimeParts.meridiem}
                          onChange={(event) =>
                            updateReminderTime({
                              meridiem: event.target.value as "AM" | "PM",
                            })
                          }
                          className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700"
                        >
                          {REMINDER_MERIDIEMS.map((meridiem) => (
                            <option key={meridiem} value={meridiem}>
                              {meridiem}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ) : null}

                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={closeEditor}
                      className="h-10 flex-1 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-600 transition-colors hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={createReminder.isPending || updateReminder.isPending}
                      className={cn(
                        "flex h-10 flex-1 items-center justify-center gap-2 rounded-xl text-xs font-bold text-white shadow-lg transition-all",
                        isSingle ? "bg-emerald-500 hover:bg-emerald-600" : "bg-romantic-heart hover:bg-romantic-heart/90"
                      )}
                    >
                      {createReminder.isPending || updateReminder.isPending ? (
                        <LoaderCircle size={16} className="animate-spin" />
                      ) : editingReminder ? (
                        <PencilLine size={16} />
                      ) : (
                        <Plus size={16} />
                      )}
                      {editingReminder ? "Save Reminder" : "Create Reminder"}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        ) : null}
      </AnimatePresence>

      <ReminderDetailSheet
        open={Boolean(detailReminder)}
        reminder={detailReminder}
        onClose={() => setDetailReminder(null)}
        onEdit={
          detailReminder && detailReminder.source === "CUSTOM"
            ? () => openEditReminder(detailReminder)
            : null
        }
        onDelete={
          detailReminder
            ? () => requestDeleteReminder(detailReminder)
            : null
        }
        onOpenTrip={
          detailReminder?.trip
            ? () => {
              router.push("/trips");
              setDetailReminder(null);
            }
            : null
        }
      />
    </div>
  );
}
