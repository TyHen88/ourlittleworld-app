"use client";
import React, { useEffect, useState } from "react";
import { CoupleFeedPost } from "@/components/love/CoupleFeedPost";
import { AddPostForm } from "@/components/love/AddPostForm";
import { AnimatePresence, motion } from "framer-motion";
import { Plus, Sparkles, X } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { createClient } from "@/utils/supabase/client";
import { useCouple } from "@/hooks/use-couple";

export default function FeedPage() {
    const [composerOpen, setComposerOpen] = useState(false);
    const { user, profile, couple, isLoading: coupleLoading } = useCouple();

    const [posts, setPosts] = useState<any[]>([]);
    const [page, setPage] = useState(0);
    const [loadingInitial, setLoadingInitial] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const pageSize = 10;

    const formatTimestamp = (value: any) => {
        try {
            const d = new Date(value);
            if (Number.isNaN(d.getTime())) return String(value ?? "");
            return d.toLocaleString();
        } catch {
            return String(value ?? "");
        }
    };

    const mapRowToView = (row: any) => {
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
        };
    };

    const fetchPage = async (nextPage: number, mode: 'replace' | 'append') => {
        if (!couple?.id) return;

        const supabase = createClient();
        const from = nextPage * pageSize;
        const to = from + pageSize - 1;

        const { data, error } = await supabase
            .from('posts')
            .select('id, couple_id, author_id, content, image_url, metadata, created_at, author:profiles(full_name, avatar_url, id)')
            .eq('couple_id', couple.id)
            .order('created_at', { ascending: false })
            .range(from, to);

        if (error) throw error;

        const rows = Array.isArray(data) ? data : [];
        setHasMore(rows.length === pageSize);
        setPage(nextPage);

        if (mode === 'replace') {
            setPosts(rows.map(mapRowToView));
        } else {
            setPosts((prev) => {
                const existing = new Set(prev.map((p: any) => p.id));
                const merged = [...prev];
                for (const row of rows.map(mapRowToView)) {
                    if (!existing.has(row.id)) merged.push(row);
                }
                return merged;
            });
        }
    };

    useEffect(() => {
        if (!couple?.id) return;
        let cancelled = false;

        (async () => {
            try {
                setLoadingInitial(true);
                await fetchPage(0, 'replace');
            } catch {
                if (cancelled) return;
                setPosts([]);
                setHasMore(false);
            } finally {
                if (cancelled) return;
                setLoadingInitial(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [couple?.id]);

    useEffect(() => {
        if (!couple?.id) return;
        const supabase = createClient();

        const channel = supabase
            .channel(`posts:feed:${couple.id}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'posts',
                    filter: `couple_id=eq.${couple.id}`
                },
                (payload: any) => {
                    const eventType = payload?.eventType;
                    const row = payload?.new || payload?.old;
                    if (!row?.id) return;

                    if (eventType === 'DELETE') {
                        setPosts((prev) => prev.filter((p: any) => p.id !== row.id));
                        return;
                    }

                    const view = mapRowToView(row);
                    setPosts((prev) => {
                        const idx = prev.findIndex((p: any) => p.id === view.id);
                        if (idx === -1) return [view, ...prev];
                        const next = [...prev];
                        next[idx] = { ...next[idx], ...view };
                        return next;
                    });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [couple?.id, user?.id, profile?.full_name]);

    useEffect(() => {
        if (!couple?.id) return;
        if (!hasMore) return;
        if (loadingInitial || loadingMore) return;

        const el = document.getElementById('feed-load-more-sentinel');
        if (!el) return;

        const obs = new IntersectionObserver(
            (entries) => {
                const first = entries[0];
                if (!first?.isIntersecting) return;
                if (!hasMore) return;
                if (loadingMore || loadingInitial) return;

                (async () => {
                    try {
                        setLoadingMore(true);
                        await fetchPage(page + 1, 'append');
                    } catch {
                        setHasMore(false);
                    } finally {
                        setLoadingMore(false);
                    }
                })();
            },
            { root: null, rootMargin: '200px', threshold: 0 }
        );

        obs.observe(el);
        return () => obs.disconnect();
    }, [couple?.id, hasMore, loadingInitial, loadingMore, page]);

    useEffect(() => {
        if (!composerOpen) return;

        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setComposerOpen(false);
        };

        document.addEventListener('keydown', onKeyDown);
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        return () => {
            document.removeEventListener('keydown', onKeyDown);
            document.body.style.overflow = prevOverflow;
        };
    }, [composerOpen]);

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
                {coupleLoading || loadingInitial ? (
                    <div className="text-sm text-slate-400 font-medium tracking-tight">Loading...</div>
                ) : !couple?.id ? (
                    <div className="text-sm text-slate-400 font-medium tracking-tight">No couple found.</div>
                ) : posts.length === 0 ? (
                    <div className="text-sm text-slate-400 font-medium tracking-tight">No posts yet. Tap + to create your first memory.</div>
                ) : (
                    posts.map((p: any) => (
                        <CoupleFeedPost
                            key={p.id}
                            author={p.author}
                            content={p.content}
                            timestamp={p.timestamp}
                            reactions={p.reactions}
                            comments={p.comments}
                        />
                    ))
                )}

                {couple?.id && (
                    <div className="pt-2">
                        {loadingMore ? (
                            <div className="text-xs text-slate-400 font-medium tracking-tight">Loading more...</div>
                        ) : hasMore ? (
                            <div className="text-xs text-slate-300 font-medium tracking-tight">Scroll to load more</div>
                        ) : posts.length > 0 ? (
                            <div className="text-xs text-slate-300 font-medium tracking-tight">You're all caught up</div>
                        ) : null}
                    </div>
                )}
                <div id="feed-load-more-sentinel" className="h-1" />
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
                            initial={{ y: 16, opacity: 0, scale: 0.98 }}
                            animate={{ y: 0, opacity: 1, scale: 1 }}
                            exit={{ y: 16, opacity: 0, scale: 0.98 }}
                            transition={{ type: "spring", stiffness: 400, damping: 30 }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="rounded-4xl bg-white/85 backdrop-blur-md border border-white/60 shadow-2xl overflow-hidden">
                                <div className="px-5 py-4 flex items-center justify-between border-b border-romantic-blush/20 bg-gradient-to-r from-white/70 to-romantic-blush/10">
                                    <div className="flex items-center gap-3">
                                        <Avatar className="w-10 h-10 ring-2 ring-romantic-blush/30 shadow-sm">
                                            <AvatarFallback className="bg-gradient-button text-white text-xs font-bold">M</AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <h2 className="text-base font-black text-slate-800 tracking-tight">New memory</h2>
                                            <p className="text-xs text-slate-400 font-medium tracking-tight">Write something sweet for your love</p>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        aria-label="Close"
                                        onClick={() => setComposerOpen(false)}
                                        className="w-9 h-9 rounded-full bg-white/80 hover:bg-white shadow-sm flex items-center justify-center text-slate-600 hover:text-slate-900"
                                    >
                                        <X size={18} />
                                    </button>
                                </div>
                                <AddPostForm embedded className="p-5" onSuccess={() => setComposerOpen(false)} />
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <motion.button
                type="button"
                onClick={() => setComposerOpen(true)}
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.95 }}
                className="fixed bottom-24 right-6 w-14 h-14 bg-gradient-button rounded-full shadow-2xl flex items-center justify-center z-50"
                aria-label="New post"
            >
                <Plus className="text-white" size={24} />
            </motion.button>
        </div>
    );
}
