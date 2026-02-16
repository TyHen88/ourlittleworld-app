"use client";

import React, { useEffect, useState, useMemo } from "react";
import { CoupleFeedPost } from "@/components/love/CoupleFeedPost";
import { AddPostForm } from "@/components/love/AddPostForm";
import { AnimatePresence, motion } from "framer-motion";
import { Plus, Sparkles, X } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useCouple } from "@/hooks/use-couple";
import { usePosts } from "@/hooks/use-posts";
import { FullPageLoader } from "@/components/FullPageLoader";

export default function FeedPage() {
    const [composerOpen, setComposerOpen] = useState(false);
    const sentinelRef = React.useRef<HTMLDivElement>(null);

    // Now both hooks use TanStack Query under the hood
    const { user, profile, couple, isLoading: coupleLoading } = useCouple();
    const {
        data,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isLoading: postsLoading
    } = usePosts(couple?.id);

    // Memoize the flattened and mapped posts
    const mappedPosts = useMemo(() => {
        const postsArray = data?.pages.flatMap(page => page.data) || [];
        console.log(`FeedPage Data Update: ${postsArray.length} posts retrieved from cache.`);

        if (!data) return [];

        const formatTimestamp = (value: any) => {
            try {
                const d = new Date(value);
                return Number.isNaN(d.getTime()) ? String(value ?? "") : d.toLocaleString();
            } catch {
                return String(value ?? "");
            }
        };

        return data.pages.flatMap(page => page.data).map((row: any) => {
            const authorName =
                row?.author?.full_name ||
                (row?.author_id && user?.id && row.author_id === user.id ? profile?.full_name : null) ||
                "My Forever";

            return {
                id: row?.id,
                author: authorName,
                content: row?.content ?? "",
                timestamp: formatTimestamp(row?.created_at),
                reactions: Number(row?.metadata?.likes_count ?? 0),
                comments: Number(row?.metadata?.comments_count ?? 0),
                imageUrl: row?.image_url ?? null,
                avatarUrl: row?.author?.avatar_url ?? null,
                metadata: row?.metadata ?? null,
            };
        });
    }, [data, user?.id, profile?.full_name]);

    // Infinite scroll observer using useRef instead of getElementById
    useEffect(() => {
        if (!hasNextPage || isFetchingNextPage) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting) fetchNextPage();
            },
            { rootMargin: '400px' }
        );

        if (sentinelRef.current) observer.observe(sentinelRef.current);
        return () => observer.disconnect();
    }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

    // Cleanup overflow on unmount or composer close
    useEffect(() => {
        if (composerOpen) {
            document.body.style.overflow = 'hidden';
            const handleEsc = (e: KeyboardEvent) => e.key === 'Escape' && setComposerOpen(false);
            document.addEventListener('keydown', handleEsc);
            return () => {
                document.body.style.overflow = 'unset';
                document.removeEventListener('keydown', handleEsc);
            };
        }
    }, [composerOpen]);

    const isLoadingInitial = (coupleLoading || postsLoading) && mappedPosts.length === 0;

    if (isLoadingInitial) {
        return <FullPageLoader />;
    }

    return (
        <div className="p-6 space-y-8 max-w-2xl mx-auto">
            <header className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                        Our Memories
                        <Sparkles className="text-romantic-heart h-5 w-5" />
                    </h1>
                    <p className="text-sm text-slate-400 font-medium tracking-tight">Every moment with you is a gift.</p>
                </div>
            </header>

            <section className="space-y-8 pt-4 pb-20">
                {!couple?.id ? (
                    <div className="text-center py-20 bg-white/50 rounded-4xl border-2 border-dashed border-romantic-blush/30">
                        <p className="text-slate-400 font-medium">No connection found.</p>
                    </div>
                ) : mappedPosts.length === 0 ? (
                    <div className="text-center py-20 bg-white/50 rounded-4xl border-2 border-dashed border-romantic-blush/30">
                        <p className="text-slate-400 font-medium">No memories yet.</p>
                        <p className="text-xs text-slate-300 mt-2">Tap the + to create your first one!</p>
                    </div>
                ) : (
                    <>
                        {mappedPosts.map((p) => (
                            <CoupleFeedPost
                                key={p.id}
                                {...p}
                                currentUserId={user?.id}
                            />
                        ))}

                        <div className="pt-8 text-center" ref={sentinelRef}>
                            {isFetchingNextPage ? (
                                <div className="text-xs text-slate-400 font-medium flex items-center justify-center gap-2">
                                    <div className="w-4 h-4 border-2 border-slate-200 border-t-slate-400 rounded-full animate-spin" />
                                    Loading more...
                                </div>
                            ) : hasNextPage ? (
                                <div className="text-xs text-slate-300 font-medium tracking-wide">Keep scrolling for more magic</div>
                            ) : (
                                <div className="text-xs text-slate-300 font-medium flex items-center justify-center gap-2 tracking-widest uppercase py-4">
                                    <Heart className="w-3 h-3 text-romantic-heart/50" />
                                    The beginning of your story
                                    <Heart className="w-3 h-3 text-romantic-heart/50" />
                                </div>
                            )}
                        </div>
                    </>
                )}
            </section>

            <AnimatePresence>
                {composerOpen && (
                    <motion.div
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setComposerOpen(false)}
                    >
                        <motion.div
                            className="w-full max-w-2xl relative"
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: 20, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="rounded-4xl bg-white shadow-2xl overflow-hidden">
                                <div className="px-6 py-4 flex items-center justify-between border-b border-slate-100">
                                    <h2 className="text-lg font-black text-slate-800 tracking-tight">Post a memory</h2>
                                    <button onClick={() => setComposerOpen(false)} className="p-2 hover:bg-slate-50 rounded-full">
                                        <X size={20} className="text-slate-400" />
                                    </button>
                                </div>
                                <AddPostForm embedded className="p-6" onSuccess={() => setComposerOpen(false)} />
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <motion.button
                type="button"
                onClick={() => setComposerOpen(true)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="fixed bottom-24 right-6 w-14 h-14 bg-gradient-brand rounded-full shadow-2xl flex items-center justify-center z-40 text-white"
            >
                <Plus size={28} />
            </motion.button>
        </div>
    );
}

// Just for the icon reference
function Heart({ className, size = 12 }: { className?: string, size?: number }) {
    return <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" /></svg>;
}
