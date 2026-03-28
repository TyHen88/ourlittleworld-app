"use client";

import React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CoupleFeedPost } from "@/components/love/CoupleFeedPost";
import { motion } from "framer-motion";
import { fetchPostsPage, getRecentPostsFromFeedCache, POST_KEYS, POST_QUERY_GC_TIME, POST_QUERY_STALE_TIME } from "@/hooks/use-posts";
import { Sparkles } from "lucide-react";
import Link from "next/link";

interface RecentMemoryProps {
    coupleId: string;
    currentUserId?: string;
}

interface RecentMemoryPost {
    id: string;
    content: string | null;
    created_at: string;
    image_url: string | null;
    metadata?: {
        images?: string[];
        likes?: string[];
        likes_count?: number;
        comments?: Array<Record<string, unknown>>;
        comments_count?: number;
    };
    author?: {
        full_name?: string | null;
        avatar_url?: string | null;
    } | null;
}

export function RecentMemory({ coupleId, currentUserId }: RecentMemoryProps) {
    const queryClient = useQueryClient();
    const initialPosts = getRecentPostsFromFeedCache<RecentMemoryPost>(queryClient, coupleId, 3);
    const initialDataUpdatedAt = queryClient.getQueryState(POST_KEYS.feed(coupleId, undefined))?.dataUpdatedAt;

    const { data: posts = [], isLoading } = useQuery<RecentMemoryPost[]>({
        queryKey: POST_KEYS.recent(coupleId),
        queryFn: async () => {
            const result = await fetchPostsPage<RecentMemoryPost>({
                id: coupleId,
                cursor: null,
                pageSize: 3,
            });

            return result.data;
        },
        enabled: !!coupleId,
        staleTime: POST_QUERY_STALE_TIME,
        gcTime: POST_QUERY_GC_TIME,
        refetchOnMount: false,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        initialData: initialPosts,
        initialDataUpdatedAt,
    });

    const formatTimestamp = (value: string) => {
        try {
            const d = new Date(value);
            if (Number.isNaN(d.getTime())) return "Just now";
            
            const now = new Date();
            const diffMs = now.getTime() - d.getTime();
            const diffMins = Math.floor(diffMs / 60000);
            const diffHours = Math.floor(diffMs / 3600000);
            const diffDays = Math.floor(diffMs / 86400000);

            if (diffMins < 1) return "Just now";
            if (diffMins < 60) return `${diffMins}m ago`;
            if (diffHours < 24) return `${diffHours}h ago`;
            if (diffDays < 7) return `${diffDays}d ago`;
            return d.toLocaleDateString();
        } catch {
            return "Just now";
        }
    };

    if (isLoading) {
        return (
            <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="h-32 bg-white/50 rounded-3xl animate-pulse" />
                ))}
            </div>
        );
    }

    if (!posts || posts.length === 0) {
        return (
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center py-12 bg-white/50 rounded-3xl border-2 border-dashed border-romantic-blush/30"
            >
                <Sparkles className="mx-auto text-romantic-heart/30 mb-3" size={32} />
                <p className="text-slate-400 font-medium">No memories yet</p>
                <p className="text-xs text-slate-300 mt-1">Create your first post!</p>
            </motion.div>
        );
    }

    return (
        <div className="space-y-4">
            {posts.map((post, index) => (
                <motion.div
                    key={post.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                >
                    <CoupleFeedPost
                        id={post.id}
                        author={post.author?.full_name || "Someone"}
                        content={post.content || ""}
                        timestamp={formatTimestamp(post.created_at)}
                        reactions={post.metadata?.likes_count || 0}
                        comments={post.metadata?.comments_count || 0}
                        imageUrl={post.image_url}
                        avatarUrl={post.author?.avatar_url}
                        metadata={post.metadata ?? undefined}
                        currentUserId={currentUserId}
                        coupleId={coupleId}
                    />
                </motion.div>
            ))}

            {posts.length > 3 && (
                <Link href="/feed">
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="w-full py-3 text-sm font-bold text-romantic-heart hover:text-romantic-heart/80 transition-colors"
                    >
                        View all {posts.length} memories →
                    </motion.button>
                </Link>
            )}
        </div>
    );
}
