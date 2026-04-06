"use client";

import { ArrowLeft } from "lucide-react";

import { useAppBackNavigation } from "./app-history";
import { cn } from "@/lib/utils";

type AppBackButtonProps = {
  ariaLabel?: string;
  className?: string;
  fallbackHref?: string;
  iconClassName?: string;
  size?: number;
};

export function AppBackButton({
  ariaLabel = "Go back",
  className = "",
  fallbackHref,
  iconClassName,
  size = 18,
}: AppBackButtonProps) {
  const goBack = useAppBackNavigation(fallbackHref);

  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={goBack}
      className={cn(
        "inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-transparent text-slate-600 shadow-none transition-colors hover:bg-slate-100/80 hover:text-slate-900",
        className,
      )}
    >
      <ArrowLeft className={cn("text-current", iconClassName)} size={size} />
    </button>
  );
}
