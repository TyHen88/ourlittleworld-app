"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { CoupleFeedPost } from "@/components/love/CoupleFeedPost";
import { PostSkeleton } from "@/components/love/PostSkeleton";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { MessageCircleHeart, Sparkles, Image as ImageIcon, Clock, Heart as HeartIcon, Search, ArrowLeft, ChevronRight, FolderOpen } from "lucide-react";
import { usePosts, prependPostToCaches } from "@/hooks/use-posts";
import { useDebounce } from "@/hooks/use-debounce";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Stars, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";

type FilterType = "all" | "photos" | "recent" | "favorites";

interface FeedClientProps {
    user: any;
    profile: any;
    couple: any;
}

export default function FeedClient({ user, profile, couple }: FeedClientProps) {
    const isSingle = profile?.user_type === 'SINGLE';
    const router = useRouter();
    const queryClient = useQueryClient();
    const shouldReduceMotion = useReducedMotion();
    const [filter, setFilter] = useState<FilterType>("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const sentinelRef = React.useRef<HTMLDivElement>(null);

    const debouncedSearchQuery = useDebounce(searchQuery, 500);
    const id = couple?.id || user?.id;
    const {
        data,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isLoading: postsLoading
    } = usePosts(id, debouncedSearchQuery || undefined);

    useEffect(() => {
        if (!id || typeof window === "undefined") return;

        const storageKey = `pending-created-post:${id}`;
        const pendingPost = sessionStorage.getItem(storageKey);
        if (!pendingPost) return;

        try {
            const parsed = JSON.parse(pendingPost);
            prependPostToCaches(queryClient, id, parsed);
        } catch (error) {
            console.error("Failed to hydrate pending post", error);
        } finally {
            sessionStorage.removeItem(storageKey);
        }
    }, [id, queryClient]);

    const mappedPosts = useMemo(() => {
        if (!data) return [];

        const formatTimestamp = (value: any) => {
            try {
                const d = new Date(value);
                return Number.isNaN(d.getTime()) ? String(value ?? "") : d.toLocaleString();
            } catch {
                return String(value ?? "");
            }
        };

        const seen = new Set<string>();

        return data.pages
            .flatMap(page => page.data)
            .filter((row: any) => {
                const postId = row?.id;
                if (!postId) return true;
                if (seen.has(postId)) return false;
                seen.add(postId);
                return true;
            })
            .map((row: any) => {
            const authorName =
                row?.author?.full_name ||
                (row?.author_id && user?.id && row.author_id === user.id ? profile?.full_name : null) ||
                (isSingle ? "You" : "My Forever");

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
                    category: row?.category ?? null,
                    authorId: row?.author_id ?? null,
                };
            });
    }, [data, user?.id, profile?.full_name, isSingle]);

    const filteredPosts = useMemo(() => {
        let filtered = mappedPosts;
        const currentUserId = user?.id;

        if (filter === "photos") {
            filtered = filtered.filter(p => p.imageUrl || (p.metadata?.images && p.metadata.images.length > 0));
        } else if (filter === "recent") {
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            filtered = filtered.filter(p => {
                try {
                    const postDate = new Date(p.timestamp);
                    return postDate >= sevenDaysAgo;
                } catch {
                    return true;
                }
            });
        } else if (filter === "favorites") {
            filtered = filtered.filter(p => p.metadata?.likes?.includes(currentUserId || ""));
        }

        return filtered;
    }, [mappedPosts, filter, user?.id]);

    const filterCounts = useMemo(() => {
        const currentUserId = user?.id;
        return {
            all: mappedPosts.length,
            photos: mappedPosts.filter(p => p.imageUrl || (p.metadata?.images && p.metadata.images.length > 0)).length,
            recent: mappedPosts.filter(p => {
                try {
                    const sevenDaysAgo = new Date();
                    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
                    const postDate = new Date(p.timestamp);
                    return postDate >= sevenDaysAgo;
                } catch {
                    return true;
                }
            }).length,
            favorites: mappedPosts.filter(p => p.metadata?.likes?.includes(currentUserId || "")).length,
        };
    }, [mappedPosts, user?.id]);

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

    const categories = useMemo(() => ([
        { id: 1, name: isSingle ? "Deep Thoughts" : "Sweet Memories", icon: isSingle ? "🧘" : "✨", color: isSingle ? "from-emerald-100 to-teal-50" : "from-pink-100 to-rose-50" },
        { id: 2, name: isSingle ? "Personal Wins" : "Milestone", icon: "🏁", color: isSingle ? "from-indigo-100 to-blue-50" : "from-amber-100 to-orange-50" },
        { id: 3, name: "Daily Life", icon: "🏠", color: isSingle ? "from-emerald-50 to-teal-50" : "from-blue-100 to-sky-50" },
        { id: 4, name: "Travel", icon: "✈️", color: "from-emerald-100 to-teal-50" },
        { id: 5, name: "Food & Wellness", icon: "🥗", color: isSingle ? "from-green-100 to-emerald-50" : "from-orange-100 to-amber-50" },
        { id: 6, name: "Hobbies", icon: "🎨", color: "from-purple-100 to-violet-50" },
        { id: 7, name: isSingle ? "Productivity" : "Shopping", icon: isSingle ? "🚀" : "🛍️", color: "from-fuchsia-100 to-pink-50" },
        { id: 8, name: "Home", icon: "🛋️", color: "from-indigo-100 to-blue-50" },
        { id: 9, name: "Other", icon: "🌈", color: "from-slate-100 to-gray-50" },
    ]), [isSingle]);

    const groupedPosts = useMemo(() => {
        if (filter !== "all" || searchQuery.trim() || selectedCategory) return null;

        const groups: Record<string, any[]> = {};
        mappedPosts.forEach(post => {
            const cat = post.category || "Other";
            if (!groups[cat]) groups[cat] = [];
            groups[cat].push(post);
        });

        return Object.entries(groups).filter(([, posts]) => posts.length > 0);
    }, [mappedPosts, filter, searchQuery, selectedCategory]);

    const collectionGroups = useMemo(() => {
        if (!groupedPosts) return [];

        return groupedPosts
            .map(([catName, posts]) => {
                const catInfo = categories.find(c => c.name === catName) || categories[categories.length - 1];
                const coverImages = posts
                    .flatMap((post) => {
                        const galleryImages = Array.isArray(post.metadata?.images) ? post.metadata.images : [];
                        if (galleryImages.length > 0) return galleryImages;
                        return post.imageUrl ? [post.imageUrl] : [];
                    })
                    .filter(Boolean)
                    .slice(0, 4);

                return {
                    catName,
                    posts,
                    catInfo,
                    coverImages,
                    photoCount: posts.reduce((count, post) => {
                        const galleryImages = Array.isArray(post.metadata?.images) ? post.metadata.images.length : 0;
                        return count + Math.max(galleryImages, post.imageUrl ? 1 : 0);
                    }, 0),
                    latestTimestamp: posts[0]?.timestamp ?? "",
                };
            })
            .sort((a, b) => {
                const aTime = new Date(a.latestTimestamp).getTime();
                const bTime = new Date(b.latestTimestamp).getTime();
                return bTime - aTime;
            });
    }, [categories, groupedPosts]);

    const isLoadingInitial = postsLoading && mappedPosts.length === 0;

    if (isLoadingInitial) {
        return (
            <motion.div
                initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.28, ease: "easeOut" }}
                className="p-6 space-y-6 max-w-2xl mx-auto pb-32"
            >
                <div className="space-y-4">
                    <Skeleton className="h-10 w-48 rounded-lg" />
                    <Skeleton className="h-4 w-64 rounded-lg" />
                </div>
                {/* ... other loading skeletons ... */}
                <div className="space-y-8 mt-8">
                    {[1, 2, 3].map((i) => (
                        <PostSkeleton key={i} />
                    ))}
                </div>
            </motion.div>
        );
    }

    const postsToDisplay = selectedCategory
        ? filteredPosts.filter(p => (p.category || "Other") === selectedCategory)
        : filteredPosts;

    return (
        <motion.div
            initial={shouldReduceMotion ? false : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            className="p-6 space-y-6 max-w-2xl mx-auto pb-32"
        >
            {!couple && !isSingle ? (
                <div className="flex flex-col items-center justify-center py-20 text-center space-y-8">
                    <div className="w-32 h-32 bg-romantic-blush/30 rounded-full flex items-center justify-center animate-pulse">
                        <MessageCircleHeart className="text-romantic-heart/40" size={64} />
                    </div>
                    <div className="space-y-3">
                        <h2 className="text-3xl font-black text-slate-800">No Couple Connected</h2>
                        <p className="text-slate-500 max-w-sm">
                            Connect with your partner to share memories, photos, and milestones in your private feed.
                        </p>
                    </div>
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => router.push("/onboarding")}
                        className="px-8 py-4 bg-gradient-button text-white rounded-full font-bold shadow-xl shadow-romantic-heart/20"
                    >
                        Connect Your World ✨
                    </motion.button>
                </div>
            ) : (
                <>
                    <header className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                                    {isSingle ? (
                                        <Stars className="text-emerald-500 h-6 w-6" />
                                    ) : (
                                        <Sparkles className="text-romantic-heart h-6 w-6" />
                                    )}
                                    {isSingle ? "Personal Journal" : "Our Memories"}
                                </h1>
                                <p className="text-sm text-slate-500 mt-1">
                                    {isSingle ? "A collection of your journey and growth" : "Every moment with you is a gift"}
                                </p>
                            </div>
                            <button onClick={() => router.push("/dashboard")} className="p-2 rounded-full bg-slate-50 hover:bg-slate-100 transition-colors">
                                <ArrowLeft className="text-slate-500" size={20} />
                            </button>
                        </div>

                        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                            {[
                                { value: "all", label: "All", icon: Sparkles, count: filterCounts.all },
                                { value: "photos", label: "Photos", icon: ImageIcon, count: filterCounts.photos },
                                { value: "recent", label: "Recent", icon: Clock, count: filterCounts.recent },
                                { value: "favorites", label: "Favorites", icon: HeartIcon, count: filterCounts.favorites },
                            ].map((tab) => {
                                const Icon = tab.icon;
                                const isActive = filter === tab.value;
                                return (
                                    <button
                                        key={tab.value}
                                        onClick={() => { setFilter(tab.value as FilterType); setSelectedCategory(null); }}
                                        className={cn(
                                            "flex items-center gap-2 px-4 py-2 rounded-full font-bold text-sm transition-all whitespace-nowrap",
                                            isActive 
                                                ? (isSingle ? "bg-emerald-500 text-white shadow-lg" : "bg-romantic-heart text-white shadow-lg")
                                                : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"
                                        )}
                                    >
                                        <Icon size={16} />
                                        {tab.label}
                                        <span className={cn("text-xs px-1.5 py-0.5 rounded-full", isActive ? "bg-white/20" : "bg-slate-100")}>{tab.count}</span>
                                    </button>
                                );
                            })}
                        </div>

                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder={isSingle ? "Search your journal..." : "Search memories..."}
                                className={cn(
                                    "w-full pl-11 pr-4 py-3 rounded-2xl border border-slate-200 focus:outline-none bg-white font-medium",
                                    isSingle ? "focus:border-emerald-500" : "focus:border-romantic-heart"
                                )}
                            />
                        </div>
                    </header>

                    <section className="space-y-6">
                        {postsToDisplay.length === 0 ? (
                            <div className={cn(
                                "text-center py-20 rounded-3xl border-2 border-dashed",
                                isSingle ? "bg-emerald-50/50 border-emerald-100" : "bg-gradient-to-br from-romantic-blush/20 to-white border-romantic-blush/30"
                            )}>
                                <p className="text-slate-600 font-bold text-lg">
                                    {isSingle ? "Your journal is empty. What's on your mind today?" : "No memories found"}
                                </p>
                                {isSingle && (
                                    <Button 
                                        onClick={() => router.push('/create-post')}
                                        className="mt-4 bg-emerald-500 hover:bg-emerald-600 rounded-full font-bold"
                                    >
                                        Write First Entry
                                    </Button>
                                )}
                            </div>
                        ) : groupedPosts && !selectedCategory ? (
                           <div className="space-y-8">
                                <div className="flex items-end justify-between px-1">
                                    <div>
                                        <h2 className="text-xl font-black text-slate-800 tracking-tight">
                                            {isSingle ? "Collections" : "Memory Collections"}
                                        </h2>
                                        <p className="text-sm text-slate-500 mt-1">
                                            {isSingle ? "Browse your moments like a photo library" : "Open a category to revisit your favorite moments"}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
                                            {collectionGroups.length} folders
                                        </p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                                    {collectionGroups.map((group, groupIndex) => (
                                        <motion.button
                                            key={group.catName}
                                            type="button"
                                            initial={{ opacity: 0, y: 24 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: groupIndex * 0.06 }}
                                            onClick={() => setSelectedCategory(group.catName)}
                                            className="overflow-hidden rounded-[2rem] border border-white/70 bg-white/90 text-left shadow-[0_20px_50px_-24px_rgba(15,23,42,0.35)] backdrop-blur-sm transition-transform hover:-translate-y-1"
                                        >
                                            <div className="p-3">
                                                <div className="grid grid-cols-2 gap-2 rounded-[1.5rem] bg-slate-100/80 p-2">
                                                    {Array.from({ length: 4 }).map((_, imageIndex) => {
                                                        const coverImage = group.coverImages[imageIndex];
                                                        return (
                                                            <div
                                                                key={`${group.catName}-${imageIndex}`}
                                                                className={cn(
                                                                    "relative overflow-hidden rounded-2xl bg-gradient-to-br",
                                                                    group.catInfo.color,
                                                                    imageIndex === 0 ? "aspect-[1.2/1]" : "aspect-square"
                                                                )}
                                                            >
                                                                {coverImage ? (
                                                                    <Image
                                                                        src={coverImage}
                                                                        alt={`${group.catName} preview ${imageIndex + 1}`}
                                                                        fill
                                                                        className="object-cover"
                                                                        sizes="(max-width: 640px) 45vw, 260px"
                                                                    />
                                                                ) : (
                                                                    <div className="flex h-full w-full items-center justify-center text-3xl">
                                                                        {group.catInfo.icon}
                                                                    </div>
                                                                )}
                                                                <div className="absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-white/20" />
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between px-5 pb-5">
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <div className={cn("flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br text-lg shadow-sm", group.catInfo.color)}>
                                                            {group.catInfo.icon}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <h3 className="truncate text-lg font-black tracking-tight text-slate-800">
                                                                {group.catName}
                                                            </h3>
                                                            <p className="text-xs font-semibold text-slate-500">
                                                                {group.posts.length} {group.posts.length === 1 ? "memory" : "memories"}
                                                                {group.photoCount > 0 ? ` • ${group.photoCount} photos` : ""}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                                                    <ChevronRight size={18} />
                                                </div>
                                            </div>
                                        </motion.button>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {selectedCategory && (
                                    <div className="flex items-center justify-between rounded-3xl border border-slate-200 bg-white/80 px-4 py-3 shadow-sm">
                                        <div className="flex items-center gap-3">
                                            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-600">
                                                <FolderOpen size={20} />
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
                                                    Collection
                                                </p>
                                                <h3 className="text-lg font-black tracking-tight text-slate-800">
                                                    {selectedCategory}
                                                </h3>
                                            </div>
                                        </div>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            className="rounded-full font-semibold text-slate-600"
                                            onClick={() => setSelectedCategory(null)}
                                        >
                                            Back to folders
                                        </Button>
                                    </div>
                                )}
                                <AnimatePresence mode="popLayout">
                                    {postsToDisplay.map((p, index) => (
                                        <motion.div key={p.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}>
                                            <CoupleFeedPost {...p} currentUserId={user?.id} coupleId={couple?.id} authorId={p.authorId} />
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                                
                                <div className="pt-8 text-center" ref={sentinelRef}>
                                    {isFetchingNextPage ? (
                                        <div className="flex items-center justify-center gap-3 py-6"><div className="w-6 h-6 border-3 border-romantic-blush/30 border-t-romantic-heart rounded-full animate-spin" /><span className="text-sm text-slate-500">Gathering more...</span></div>
                                    ) : hasNextPage ? (
                                        <div className="text-xs text-slate-400 font-bold uppercase py-6">Scroll for more ✨</div>
                                    ) : <div className="text-xs text-slate-400 font-black uppercase py-10 italic">This is where it all began.</div>}
                                </div>
                            </div>
                        )}
                    </section>
                </>
            )}

            <motion.button
                initial={shouldReduceMotion ? false : { opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5, type: "spring" }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => router.push('/create-post')}
                className={cn(
                    "fixed bottom-24 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full border-2 border-white text-white shadow-2xl",
                    isSingle
                        ? "bg-gradient-to-br from-emerald-500 to-teal-600"
                        : "bg-gradient-button"
                )}
            >
                {isSingle ? <Pencil className="h-7 w-7" /> : <MessageCircleHeart size={28} />}
            </motion.button>
        </motion.div>
    );
}
