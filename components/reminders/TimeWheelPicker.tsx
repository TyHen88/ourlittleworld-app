"use client";

import { cn } from "@/lib/utils";

const HOURS = Array.from({ length: 12 }, (_, index) => index + 1);
const MINUTES = Array.from({ length: 60 }, (_, index) => index);
const MERIDIEMS = ["AM", "PM"] as const;

export function TimeWheelPicker({
  hour,
  meridiem,
  minute,
  onHourChange,
  onMeridiemChange,
  onMinuteChange,
  tone = "romantic",
}: {
  hour: number;
  meridiem: "AM" | "PM";
  minute: number;
  onHourChange: (value: number) => void;
  onMinuteChange: (value: number) => void;
  onMeridiemChange: (value: "AM" | "PM") => void;
  tone?: "romantic" | "single";
}) {
  const activeClass =
    tone === "single"
      ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20"
      : "bg-romantic-heart text-white shadow-lg shadow-romantic-heart/20";

  return (
    <div className="grid grid-cols-3 gap-3">
      <TimeColumn
        label="Hour"
        values={HOURS}
        activeValue={hour}
        getLabel={(value) => String(value).padStart(2, "0")}
        onSelect={(value) => onHourChange(value)}
        activeClass={activeClass}
      />
      <TimeColumn
        label="Minute"
        values={MINUTES}
        activeValue={minute}
        getLabel={(value) => String(value).padStart(2, "0")}
        onSelect={(value) => onMinuteChange(value)}
        activeClass={activeClass}
      />
      <TimeColumn
        label="Period"
        values={MERIDIEMS}
        activeValue={meridiem}
        getLabel={(value) => value}
        onSelect={(value) => onMeridiemChange(value)}
        activeClass={activeClass}
      />
    </div>
  );
}

function TimeColumn<T extends string | number>({
  activeClass,
  activeValue,
  getLabel,
  label,
  onSelect,
  values,
}: {
  activeClass: string;
  activeValue: T;
  getLabel: (value: T) => string;
  label: string;
  onSelect: (value: T) => void;
  values: readonly T[];
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-2">
      <p className="mb-2 px-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">{label}</p>
      <div className="h-44 space-y-2 overflow-y-auto px-1 pb-1">
        {values.map((value) => {
          const isActive = value === activeValue;

          return (
            <button
              key={String(value)}
              type="button"
              onClick={() => onSelect(value)}
              className={cn(
                "w-full rounded-2xl px-3 py-2 text-sm font-bold transition-all",
                isActive ? activeClass : "bg-white text-slate-500 hover:bg-slate-100"
              )}
            >
              {getLabel(value)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
