"use client";

import React from "react";
import { Heart } from "lucide-react";

import { TopProgressBar } from "@/components/ui/TopProgressBar";
import { cn } from "@/lib/utils";

interface PageLoaderShellProps {
  children?: React.ReactNode;
  label?: string;
  fullScreen?: boolean;
  className?: string;
  contentClassName?: string;
}

export function PageLoaderShell({
  children,
  label = "Preparing your world",
  fullScreen = true,
  className,
  contentClassName,
}: PageLoaderShellProps) {
  const hasChildren = React.Children.count(children) > 0;

  return (
    <div
      className={cn(
        "relative overflow-hidden bg-gradient-to-br from-romantic-warm via-white to-romantic-blush/20",
        fullScreen && "min-h-[100dvh]",
        className
      )}
    >
      <TopProgressBar />

      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-15%] top-[-15%] h-[50%] w-[50%] rounded-full bg-romantic-blush/25 blur-[110px]" />
        <div className="absolute bottom-[-20%] right-[-15%] h-[55%] w-[55%] rounded-full bg-romantic-lavender/20 blur-[120px]" />
      </div>

      <div
        className={cn(
          "relative z-10 mx-auto w-full max-w-2xl px-6",
          fullScreen && !hasChildren
            ? "flex min-h-[100dvh] flex-col items-center justify-center py-10"
            : "py-8"
        )}
      >
        <div className={cn("flex flex-col items-center text-center", hasChildren && "pt-6")}>
          <div className="relative mb-5">
            <Heart
              className="fill-current text-romantic-heart/20 animate-spin-slow"
              size={72}
            />
            <Heart
              className="absolute inset-0 fill-current text-romantic-heart animate-heart-pulse"
              size={72}
            />
          </div>

          <div className="h-1.5 w-40 overflow-hidden rounded-full bg-romantic-blush/35">
            <div className="h-full w-1/3 rounded-full bg-gradient-to-r from-romantic-heart to-pink-500 animate-loading-bar" />
          </div>

          <p className="mt-4 text-[10px] font-black uppercase tracking-[0.28em] text-slate-400">
            {label}
          </p>
        </div>

        {hasChildren ? (
          <div className={cn("mt-8", contentClassName)}>{children}</div>
        ) : null}
      </div>
    </div>
  );
}
