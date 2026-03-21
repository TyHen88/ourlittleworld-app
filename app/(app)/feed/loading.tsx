"use client";
import React from "react";
import { PostSkeleton } from "@/components/love/PostSkeleton";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="p-6 space-y-6 max-w-2xl mx-auto pb-32">
      <div className="space-y-4">
        <Skeleton className="h-10 w-48 rounded-lg" />
        <Skeleton className="h-4 w-64 rounded-lg" />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-10 w-24 rounded-full flex-shrink-0" />
        ))}
      </div>

      <Skeleton className="h-12 w-full rounded-2xl" />

      <div className="space-y-8 mt-8">
        {[1, 2, 3].map((i) => (
          <PostSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
