"use client";

import { InfiniteData, QueryClient, useInfiniteQuery } from "@tanstack/react-query";
import type { CursorPaginatedResponse } from "@/lib/pagination";

export const POST_PAGE_SIZE = 10;
export const POST_QUERY_STALE_TIME = 0;
export const POST_QUERY_GC_TIME = 10 * 60 * 1000;

export type PostPageResponse<T = unknown> = CursorPaginatedResponse<T>;

type CachePost = { id?: string | null };
type FeedCacheData<T extends CachePost> = InfiniteData<PostPageResponse<T>>;

function dedupePosts<T extends { id?: string | null }>(posts: T[]): T[] {
  const seen = new Set<string>();

  return posts.filter((post) => {
    if (!post?.id) return true;
    if (seen.has(post.id)) return false;
    seen.add(post.id);
    return true;
  });
}

export async function fetchPostsPage<T = unknown>(params: {
  id: string;
  cursor?: string | null;
  pageSize: number;
  query?: string;
}): Promise<PostPageResponse<T>> {
  const url = new URL("/api/posts", window.location.origin);
  url.searchParams.set("id", params.id);
  url.searchParams.set("limit", String(params.pageSize));
  if (params.cursor) url.searchParams.set("cursor", params.cursor);
  if (params.query) url.searchParams.set("q", params.query);

  const res = await fetch(url.toString(), {
    method: "GET",
    cache: "no-store",
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json?.error || "Failed to fetch posts");
  }
  return {
    data: Array.isArray(json?.data) ? json.data : [],
    nextCursor:
      typeof json?.pagination?.nextCursor === "string"
        ? json.pagination.nextCursor
        : json?.pagination?.nextCursor === null
          ? null
          : typeof json?.nextCursor === "string"
            ? json.nextCursor
            : null,
    pagination: {
      hasMore: Boolean(json?.pagination?.hasMore),
      limit:
        typeof json?.pagination?.limit === "number"
          ? json.pagination.limit
          : params.pageSize,
      nextCursor:
        typeof json?.pagination?.nextCursor === "string"
          ? json.pagination.nextCursor
          : json?.pagination?.nextCursor === null
            ? null
            : typeof json?.nextCursor === "string"
              ? json.nextCursor
              : null,
    },
  };
}

export function getRecentPostsFromFeedCache<T>(
  queryClient: QueryClient,
  id: string | undefined,
  limit = 3
) {
  if (!id) return undefined;

  const cachedFeed = queryClient.getQueryData<InfiniteData<PostPageResponse<T>>>(POST_KEYS.feed(id, undefined));
  const firstPagePosts = cachedFeed?.pages?.[0]?.data;

  return Array.isArray(firstPagePosts) ? firstPagePosts.slice(0, limit) : undefined;
}

export function usePosts(id: string | undefined, queryStr?: string) {
  const query = useInfiniteQuery({
    queryKey: POST_KEYS.feed(id, queryStr),
    queryFn: async ({ pageParam }) => {
      if (!id) {
        return {
          data: [],
          nextCursor: null,
          pagination: {
            hasMore: false,
            limit: POST_PAGE_SIZE,
            nextCursor: null,
          },
        } satisfies PostPageResponse;
      }

      const result = await fetchPostsPage({
        id,
        cursor: typeof pageParam === "string" ? pageParam : null,
        pageSize: POST_PAGE_SIZE,
        query: queryStr,
      });

      return {
        data: Array.isArray(result.data) ? result.data : [],
        nextCursor: result.nextCursor ?? null,
      };
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: null as string | null,
    enabled: !!id,
    staleTime: POST_QUERY_STALE_TIME,
    gcTime: POST_QUERY_GC_TIME,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchInterval: false,
    placeholderData: (previousData) => previousData,
    retry: 1,
  });

  return {
    ...query,
    posts: query.data?.pages.flatMap((page) => page.data) || [],
  };
}

// Standardized Query Keys
export const POST_KEYS = {
  all: ['posts'] as const,
  feed: (id: string | undefined, query?: string) => [...POST_KEYS.all, id, query] as const,
  recent: (id: string | undefined) => ['recent-posts', id] as const,
};

export function updatePostInCaches(
  queryClient: QueryClient,
  id: string | undefined,
  postId: string,
  updater: (post: CachePost) => CachePost
) {
  if (!id) return;

  queryClient.setQueriesData<FeedCacheData<CachePost>>({ queryKey: POST_KEYS.all }, (old) => {
    if (!old?.pages) return old;

    return {
      ...old,
      pages: old.pages.map((page) => ({
        ...page,
        data: Array.isArray(page.data)
          ? page.data.map((post) => (post?.id === postId ? updater(post) : post))
          : page.data,
      })),
    };
  });

  queryClient.setQueryData<CachePost[]>(POST_KEYS.recent(id), (old) => {
    if (!Array.isArray(old)) return old;
    return old.map((post) => (post?.id === postId ? updater(post) : post));
  });
}

export function prependPostToCaches<T extends CachePost>(queryClient: QueryClient, id: string | undefined, post: T) {
  if (!id) return;

  queryClient.setQueryData<FeedCacheData<T>>(POST_KEYS.feed(id, undefined), (old) => {
    if (!old?.pages?.length) {
      return {
        pages: [
          {
            data: [post],
            nextCursor: null,
            pagination: {
              hasMore: false,
              limit: POST_PAGE_SIZE,
              nextCursor: null,
            },
          },
        ],
        pageParams: [null],
      };
    }

    return {
      ...old,
      pages: old.pages.map((page, index) =>
        index === 0
          ? {
              ...page,
              data: dedupePosts([post, ...(Array.isArray(page.data) ? page.data : [])]),
            }
          : page
      ),
    };
  });

  queryClient.setQueryData<T[]>(POST_KEYS.recent(id), (old) => {
    if (!Array.isArray(old)) return [post];
    return dedupePosts([post, ...old]).slice(0, 3);
  });
}

export function removePostFromCaches(queryClient: QueryClient, id: string | undefined, postId: string) {
  if (!id) return;

  queryClient.setQueriesData<FeedCacheData<CachePost>>({ queryKey: POST_KEYS.all }, (old) => {
    if (!old?.pages) return old;

    return {
      ...old,
      pages: old.pages.map((page) => ({
        ...page,
        data: Array.isArray(page.data) ? page.data.filter((post) => post?.id !== postId) : page.data,
      })),
    };
  });

  queryClient.setQueryData<CachePost[]>(POST_KEYS.recent(id), (old) => {
    if (!Array.isArray(old)) return old;
    return old.filter((post) => post?.id !== postId);
  });
}
