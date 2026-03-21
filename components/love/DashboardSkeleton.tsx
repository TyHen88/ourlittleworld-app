"use client";
import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { TopProgressBar } from "@/components/ui/TopProgressBar";
import { Card } from "@/components/ui/card";
import { Heart } from "lucide-react";

export function DashboardSkeleton() {
  return (
    <div className="p-6 space-y-8 max-w-2xl mx-auto">
      <TopProgressBar />
      
      {/* Centered Loading Pulse */}
      <div className="flex flex-col items-center justify-center pt-8 pb-4">
        <div className="relative mb-4">
          <Heart className="text-rose-200 animate-spin-slow fill-current opacity-30" size={50} />
          <Heart className="absolute inset-0 text-rose-500 animate-heart-pulse fill-current" size={50} />
        </div>
        <div className="h-1 w-32 bg-rose-50 rounded-full overflow-hidden">
          <div className="h-full w-1/3 bg-gradient-to-r from-rose-400 to-pink-500 rounded-full animate-loading-bar" />
        </div>
        <p className="text-[10px] text-rose-300 font-bold uppercase tracking-widest mt-4 animate-pulse">
            Connecting our world...
        </p>
      </div>

      {/* Header Skeleton */}
      <header className="flex items-center justify-between">
        <div className="flex items-center -space-x-3">
          <Skeleton className="w-12 h-12 rounded-full border-4 border-white" />
          <Skeleton className="w-12 h-12 rounded-full border-4 border-white" />
        </div>
        <div className="text-right space-y-2">
          <Skeleton className="h-5 w-24 ml-auto" />
          <Skeleton className="h-3 w-32 ml-auto" />
        </div>
      </header>

      {/* Anniversary Card Skeleton */}
      <Card className="p-5 border-none bg-slate-100/50 rounded-3xl h-48">
        <div className="flex flex-col items-center justify-center h-full space-y-4">
          <div className="flex -space-x-3">
            <Skeleton className="w-16 h-16 rounded-full" />
            <Skeleton className="w-16 h-16 rounded-full" />
          </div>
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-10 w-32 rounded-full" />
        </div>
      </Card>

      {/* Quick Actions Skeleton */}
      <section className="space-y-4">
        <Skeleton className="h-6 w-32" />
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
      </section>

      {/* Finances Skeleton */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
        <Skeleton className="h-40 w-full rounded-3xl" />
      </section>
    </div>
  );
}
