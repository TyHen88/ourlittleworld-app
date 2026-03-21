"use client";
import React from "react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TopProgressBar } from "@/components/ui/TopProgressBar";

export function PostSkeleton() {
  return (
    <Card className="overflow-hidden border-none shadow-xl bg-white/90 backdrop-blur-sm rounded-4xl p-0 relative">
      <TopProgressBar />
      <div className="p-4 flex items-center justify-between border-b border-slate-100">
        <div className="flex items-center gap-3">
          <Skeleton className="w-10 h-10 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
        <Skeleton className="w-8 h-8 rounded-full" />
      </div>

      <div className="p-5 space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-4/6" />
      </div>

      <div className="px-4 pb-4">
        <Skeleton className="aspect-[4/3] w-full rounded-3xl" />
      </div>

      <div className="px-5 pb-5 flex items-center gap-6">
        <Skeleton className="h-6 w-12 rounded-full" />
        <Skeleton className="h-6 w-12 rounded-full" />
        <Skeleton className="h-6 w-8 rounded-full ml-auto" />
      </div>
    </Card>
  );
}
