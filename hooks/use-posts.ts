"use client";

import { QueryClient, useInfiniteQuery } from "@tanstack/react-query";

function dedupePosts<T extends { id?: string | null }>(posts: T[]): T[] {
  const seen = new Set<string>();

  return posts.filter((post) => {
    if (!post?.id) return true;
    if (seen.has(post.id)) return false;
    seen.add(post.id);
    return true;
  });
}

async function fetchPostsPage(params: {
  id: string;
  page: number;
  pageSize: number;
  query?: string;
}) {
  const url = new URL("/api/posts", window.location.origin);
  url.searchParams.set("id", params.id);
  url.searchParams.set("page", String(params.page));
  url.searchParams.set("pageSize", String(params.pageSize));
  if (params.query) url.searchParams.set("q", params.query);

  const res = await fetch(url.toString(), {
    method: "GET",
    cache: "no-store",
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json?.error || "Failed to fetch posts");
  }
  return json as { data: any[]; nextCursor: number | null };
}

export function usePosts(id: string | undefined, queryStr?: string) {
  const query = useInfiniteQuery({
    queryKey: POST_KEYS.feed(id, queryStr),
    queryFn: async ({ pageParam = 0 }) => {
      if (!id) return { data: [], nextCursor: null };

      const pageSize = 10;
      const result = await fetchPostsPage({
        id,
        page: Number(pageParam) || 0,
        pageSize,
        query: queryStr,
      });

      return {
        data: Array.isArray(result.data) ? result.data : [],
        nextCursor: result.nextCursor ?? null,
      };
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: 0,
    enabled: !!id,
    staleTime: 5 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    refetchInterval: queryStr ? false : 8 * 1000,
    refetchIntervalInBackground: false,
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
  updater: (post: any) => any
) {
  if (!id) return;

  queryClient.setQueriesData({ queryKey: POST_KEYS.all }, (old: any) => {
    if (!old?.pages) return old;

    return {
      ...old,
      pages: old.pages.map((page: any) => ({
        ...page,
        data: Array.isArray(page.data)
          ? page.data.map((post: any) => (post?.id === postId ? updater(post) : post))
          : page.data,
      })),
    };
  });

  queryClient.setQueryData(POST_KEYS.recent(id), (old: any) => {
    if (!Array.isArray(old)) return old;
    return old.map((post: any) => (post?.id === postId ? updater(post) : post));
  });
}

export function prependPostToCaches(queryClient: QueryClient, id: string | undefined, post: any) {
  if (!id) return;

  queryClient.setQueryData(POST_KEYS.feed(id, undefined), (old: any) => {
    if (!old?.pages?.length) {
      return {
        pages: [{ data: [post], nextCursor: null }],
        pageParams: [0],
      };
    }

    return {
      ...old,
      pages: old.pages.map((page: any, index: number) =>
        index === 0
          ? {
              ...page,
              data: dedupePosts([post, ...(Array.isArray(page.data) ? page.data : [])]),
            }
          : page
      ),
    };
  });

  queryClient.setQueryData(POST_KEYS.recent(id), (old: any) => {
    if (!Array.isArray(old)) return [post];
    return dedupePosts([post, ...old]).slice(0, 3);
  });
}

export function removePostFromCaches(queryClient: QueryClient, id: string | undefined, postId: string) {
  if (!id) return;

  queryClient.setQueriesData({ queryKey: POST_KEYS.all }, (old: any) => {
    if (!old?.pages) return old;

    return {
      ...old,
      pages: old.pages.map((page: any) => ({
        ...page,
        data: Array.isArray(page.data) ? page.data.filter((post: any) => post?.id !== postId) : page.data,
      })),
    };
  });

  queryClient.setQueryData(POST_KEYS.recent(id), (old: any) => {
    if (!Array.isArray(old)) return old;
    return old.filter((post: any) => post?.id !== postId);
  });
}
