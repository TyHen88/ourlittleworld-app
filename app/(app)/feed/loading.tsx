import { PageLoaderShell } from "@/components/PageLoaderShell";
import { PostSkeleton } from "@/components/love/PostSkeleton";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <PageLoaderShell label="Preparing your world" contentClassName="space-y-6 pb-32">
      <div className="space-y-4">
        <Skeleton className="h-10 w-48 rounded-lg" />
        <Skeleton className="h-4 w-64 rounded-lg" />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-10 w-24 flex-shrink-0 rounded-full" />
        ))}
      </div>

      <Skeleton className="h-12 w-full rounded-2xl" />

      <div className="mt-8 space-y-8">
        {[1, 2, 3].map((i) => (
          <PostSkeleton key={i} />
        ))}
      </div>
    </PageLoaderShell>
  );
}
