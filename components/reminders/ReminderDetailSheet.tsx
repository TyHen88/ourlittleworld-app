"use client";

import { motion } from "framer-motion";
import { Bell, Calendar, CheckCircle2, Clock3, MapPin, NotebookPen, Plane, Trash2 } from "lucide-react";

import { cn } from "@/lib/utils";
import type { ReminderRecord } from "@/hooks/use-reminders";

export function ReminderDetailSheet({
  open,
  reminder,
  onClose,
  onDelete,
  onEdit,
  onOpenTrip,
}: {
  open: boolean;
  reminder: ReminderRecord | null;
  onClose: () => void;
  onDelete?: (() => void) | null;
  onEdit?: (() => void) | null;
  onOpenTrip?: (() => void) | null;
}) {
  if (!reminder) {
    return null;
  }

  const isTripReminder = reminder.source === "TRIP";
  const hasActions = Boolean(onEdit || onOpenTrip || onDelete);

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex items-end justify-center transition-all duration-300",
        open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
      )}
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" />

      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: open ? 0 : "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        onClick={(event) => event.stopPropagation()}
        className="relative w-full max-w-md rounded-t-3xl bg-white p-6 shadow-2xl"
      >
        <div className="mx-auto mb-4 h-1 w-12 rounded-full bg-slate-200" />

        <div className="mb-4 flex items-start gap-4">
          <div
            className={cn(
              "rounded-2xl p-3",
              reminder.is_completed
                ? "bg-green-100 text-green-600"
                : isTripReminder
                  ? "bg-amber-100 text-amber-600"
                  : "bg-blue-100 text-blue-600"
            )}
          >
            {reminder.is_completed ? <CheckCircle2 size={24} /> : isTripReminder ? <Plane size={24} /> : <Bell size={24} />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span
                className={cn(
                  "inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em]",
                  reminder.is_completed
                    ? "bg-green-100 text-green-700"
                    : isTripReminder
                      ? "bg-amber-100 text-amber-700"
                      : "bg-blue-100 text-blue-700"
                )}
              >
                {reminder.is_completed ? "Completed" : isTripReminder ? "Trip Reminder" : "Reminder"}
              </span>
            </div>
            <h3 className="text-lg font-black text-slate-800">{reminder.name}</h3>
            <p className="mt-1 text-xs font-medium text-slate-500">{reminder.schedule_label}</p>
          </div>
        </div>

        <div className="space-y-3 border-t border-slate-100 pt-4">
          <div className="flex items-start gap-3 rounded-2xl bg-slate-50 px-4 py-3">
            <Calendar size={16} className="mt-0.5 shrink-0 text-slate-400" />
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Date</p>
              <p className="text-sm font-bold text-slate-700">{reminder.date_label}</p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-2xl bg-slate-50 px-4 py-3">
            <Clock3 size={16} className="mt-0.5 shrink-0 text-slate-400" />
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Time</p>
              <p className="text-sm font-bold text-slate-700">{reminder.time_label}</p>
            </div>
          </div>

          {reminder.note ? (
            <div className="flex items-start gap-3 rounded-2xl bg-slate-50 px-4 py-3">
              <NotebookPen size={16} className="mt-0.5 shrink-0 text-slate-400" />
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Note</p>
                <p className="text-sm font-medium leading-relaxed text-slate-700">{reminder.note}</p>
              </div>
            </div>
          ) : null}

          {reminder.trip ? (
            <div className="flex items-start gap-3 rounded-2xl bg-slate-50 px-4 py-3">
              <MapPin size={16} className="mt-0.5 shrink-0 text-slate-400" />
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Trip</p>
                <p className="text-sm font-bold text-slate-700">{reminder.trip.destination}</p>
                <p className="text-xs font-medium text-slate-500">{reminder.trip.title}</p>
              </div>
            </div>
          ) : null}
        </div>

        {hasActions ? (
          <div className="mt-5 flex gap-2">
            {onEdit ? (
              <button
                type="button"
                onClick={onEdit}
                className="flex-1 rounded-2xl bg-slate-100 px-4 py-3 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-200"
              >
                Edit
              </button>
            ) : null}
            {onOpenTrip ? (
              <button
                type="button"
                onClick={onOpenTrip}
                className="flex-1 rounded-2xl bg-slate-100 px-4 py-3 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-200"
              >
                Open Trip
              </button>
            ) : null}
            {onDelete ? (
              <button
                type="button"
                onClick={onDelete}
                className={cn(
                  "flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold text-white transition-colors",
                  onEdit || onOpenTrip ? "flex-1" : "w-full",
                  isTripReminder ? "bg-amber-500 hover:bg-amber-600" : "bg-rose-500 hover:bg-rose-600"
                )}
              >
                <Trash2 size={16} />
                {isTripReminder ? "Turn Off" : "Delete"}
              </button>
            ) : null}
          </div>
        ) : null}
      </motion.div>
    </div>
  );
}
