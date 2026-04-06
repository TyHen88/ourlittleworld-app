"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { CoupleFeedPost } from "@/components/love/CoupleFeedPost";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { MessageCircleHeart, Sparkles, Image as ImageIcon, Clock, Heart as HeartIcon, Search, ChevronRight, FolderOpen } from "lucide-react";
import { usePosts, prependPostToCaches } from "@/hooks/use-posts";
import { useDebounce } from "@/hooks/use-debounce";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Stars, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import { AppBackButton } from "@/components/navigation/AppBackButton";

type FilterType = "all" | "photos" | "recent" | "favorites";

interface FeedUser {
    id?: string;
    name?: string | null;
}

interface FeedProfile {
    user_type?: string | null;
    full_name?: string | null;
}

interface FeedCouple {
    id?: string;
}

interface FeedPostMetadata {
    category?: string;
    images?: string[];
    likes?: string[];
    likes_count?: number;
    comments_count?: number;
}

interface FeedPostAuthor {
    full_name?: string | null;
    avatar_url?: string | null;
}

interface FeedPostRecord {
    id: string;
    author_id: string;
    content: string;
    created_at: string | Date;
    category: string | null;
    image_url: string | null;
    metadata: FeedPostMetadata | null;
    author: FeedPostAuthor | null;
}

interface FeedPostCard {
    id: string;
    author: string;
    content: string;
    timestamp: string;
    reactions: number;
    comments: number;
    imageUrl: string | null;
    avatarUrl: string | null;
    metadata?: FeedPostMetadata;
    category: string;
    authorId: string | null;
}

function normalizePostCategory(value: string | null | undefined) {
    const trimmed = value?.trim();
    return trimmed ? trimmed : "Other";
}

interface FeedClientProps {
    user: FeedUser;
    profile: FeedProfile | null;
    couple: FeedCouple | null;
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
        const routes = ["/dashboard", "/create-post"];

        if (!couple && !isSingle) {
            routes.push("/onboarding");
        }

        routes.forEach((route) => {
            router.prefetch(route);
        });
    }, [couple, isSingle, router]);

    useEffect(() => {
        if (!id || typeof window === "undefined") return;

        const storageKey = `pending-created-post:${id}`;
        const pendingPost = sessionStorage.getItem(storageKey);
        if (!pendingPost) return;

        try {
            const parsed = JSON.parse(pendingPost);
            prependPostToCaches(queryClient, id, parsed);
            setSelectedCategory(normalizePostCategory(parsed?.category));
        } catch (error) {
            console.error("Failed to hydrate pending post", error);
        } finally {
            sessionStorage.removeItem(storageKey);
        }
    }, [id, queryClient]);

    const mappedPosts = useMemo(() => {
        if (!data) return [];

        const formatTimestamp = (value: unknown) => {
            try {
                if (!(typeof value === "string" || typeof value === "number" || value instanceof Date)) {
                    return String(value ?? "");
                }

                const d = new Date(value);
                return Number.isNaN(d.getTime()) ? String(value ?? "") : d.toLocaleString();
            } catch {
                return String(value ?? "");
            }
        };

        const seen = new Set<string>();
        const rows = data.pages.flatMap((page) => page.data as FeedPostRecord[]);

        return rows
            .filter((row) => {
                const postId = row?.id;
                if (!postId) return true;
                if (seen.has(postId)) return false;
                seen.add(postId);
                return true;
            })
            .map((row): FeedPostCard => {
                const normalizedCategory = normalizePostCategory(row?.category);
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
                    metadata: row?.metadata ? { ...row.metadata, category: normalizedCategory } : undefined,
                    category: normalizedCategory,
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

        const groups: Record<string, FeedPostCard[]> = {};
        mappedPosts.forEach(post => {
            if (!groups[post.category]) groups[post.category] = [];
            groups[post.category].push(post);
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

    const postsToDisplay = selectedCategory
        ? filteredPosts.filter(p => p.category === selectedCategory)
        : filteredPosts;

    return (
        <motion.div
            initial={shouldReduceMotion ? false : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            className="max-w-2xl mx-auto space-y-5 px-4 pb-32 pt-4 sm:px-6 sm:pt-6"
        >
            {!couple && !isSingle ? (
                <div className="flex flex-col items-center justify-center space-y-6 py-16 text-center">
                    <div className="flex h-24 w-24 items-center justify-center rounded-full bg-romantic-blush/30 animate-pulse">
                        <MessageCircleHeart className="text-romantic-heart/40" size={48} />
                    </div>
                    <div className="space-y-2">
                        <h2 className="text-2xl font-black text-slate-800">No Couple Connected</h2>
                        <p className="max-w-sm text-sm text-slate-500">
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
                    <header className="space-y-3.5">
                        <div className="flex items-center justify-between">
                            <div>
                                <h1 className="flex items-center gap-2 text-lg font-black tracking-tight text-slate-800 sm:text-xl">
                                    {isSingle ? (
                                        <Stars className="h-5 w-5 text-emerald-500 sm:h-6 sm:w-6" />
                                    ) : (
                                        <Sparkles className="h-5 w-5 text-romantic-heart sm:h-6 sm:w-6" />
                                    )}
                                    {isSingle ? "Personal Journal" : "Our Memories"}
                                </h1>
                                <p className="mt-1 text-xs text-slate-500 sm:text-sm">
                                    {isSingle ? "A collection of your journey and growth" : "Every moment with you is a gift"}
                                </p>
                            </div>
                            <AppBackButton
                                fallbackHref="/dashboard"
                            />
                        </div>

                        <div className="flex flex-wrap gap-2">
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
                                            "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-bold transition-all",
                                            isActive
                                                ? (isSingle
                                                    ? "border-emerald-200 bg-emerald-50 text-emerald-700 shadow-sm"
                                                    : "border-romantic-blush/50 bg-romantic-blush/20 text-romantic-heart shadow-sm")
                                                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                                        )}
                                    >
                                        <div className={cn(
                                            "flex h-5 w-5 items-center justify-center rounded-full",
                                            isActive
                                                ? (isSingle ? "bg-emerald-100" : "bg-white/70")
                                                : "bg-slate-100"
                                        )}>
                                            <Icon size={11} />
                                        </div>
                                        <span>{tab.label}</span>
                                        <span className={cn(
                                            "rounded-full px-1.5 py-0.5 text-[9px] leading-none",
                                            isActive
                                                ? (isSingle ? "bg-emerald-100 text-emerald-700" : "bg-white/70 text-romantic-heart")
                                                : "bg-slate-100 text-slate-500"
                                        )}>
                                            {tab.count}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>

                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <Input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder={isSingle ? "Search your journal..." : "Search memories..."}
                                className={cn(
                                    "h-11 rounded-2xl border-slate-200 bg-white pl-11 pr-4 text-base font-medium shadow-sm",
                                    isSingle
                                        ? "focus-visible:border-emerald-500 focus-visible:ring-emerald-100"
                                        : "focus-visible:border-romantic-heart focus-visible:ring-romantic-blush/40"
                                )}
                            />
                        </div>
                    </header>

                    <section className="space-y-5">
                        {isLoadingInitial ? (
                            <div className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-slate-200 bg-white/80 py-14 text-center shadow-sm">
                                <div className={cn(
                                    "h-9 w-9 animate-spin rounded-full border-[3px] border-slate-200 border-t-slate-500",
                                    isSingle && "border-emerald-100 border-t-emerald-500"
                                )} />
                                <div className="space-y-1">
                                    <p className="text-sm font-bold text-slate-700">
                                        {isSingle ? "Loading your journal..." : "Loading your memories..."}
                                    </p>
                                    <p className="text-xs text-slate-500">
                                        Syncing your latest posts
                                    </p>
                                </div>
                            </div>
                        ) : postsToDisplay.length === 0 ? (
                            <div className={cn(
                                "rounded-3xl border-2 border-dashed py-14 text-center",
                                isSingle ? "bg-emerald-50/50 border-emerald-100" : "bg-gradient-to-br from-romantic-blush/20 to-white border-romantic-blush/30"
                            )}>
                                <p className="text-base font-bold text-slate-600">
                                    {isSingle ? "Your journal is empty. What's on your mind today?" : "No memories found"}
                                </p>
                                {isSingle && (
                                    <Button
                                        onClick={() => router.push('/create-post')}
                                        className="mt-4 rounded-full bg-emerald-500 text-xs font-bold hover:bg-emerald-600"
                                    >
                                        Write First Entry
                                    </Button>
                                )}
                            </div>
                        ) : groupedPosts && !selectedCategory ? (
                            <div className="space-y-6">
                                <div className="flex items-end justify-between px-1">
                                    <div>
                                        <h2 className="text-lg font-black tracking-tight text-slate-800">
                                            {isSingle ? "Collections" : "Memory Collections"}
                                        </h2>
                                        <p className="mt-1 text-xs text-slate-500 sm:text-sm">
                                            {isSingle ? "Browse your moments like a photo library" : "Open a category to revisit your favorite moments"}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[9px] font-black uppercase tracking-[0.25em] text-slate-400">
                                            {collectionGroups.length} folders
                                        </p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    {collectionGroups.map((group, groupIndex) => (
                                        <motion.button
                                            key={group.catName}
                                            type="button"
                                            initial={{ opacity: 0, y: 24 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: groupIndex * 0.06 }}
                                            onClick={() => setSelectedCategory(group.catName)}
                                            className="overflow-hidden rounded-[1.75rem] border border-white/70 bg-white/90 text-left shadow-[0_18px_42px_-24px_rgba(15,23,42,0.35)] backdrop-blur-sm transition-transform hover:-translate-y-1"
                                        >
                                            <div className="p-2.5">
                                                <div className="grid grid-cols-2 gap-1.5 rounded-[1.35rem] bg-slate-100/80 p-1.5">
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

                                            <div className="flex items-center justify-between px-4 pb-4">
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <div className={cn("flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br text-base shadow-sm", group.catInfo.color)}>
                                                            {group.catInfo.icon}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <h3 className="truncate text-base font-black tracking-tight text-slate-800">
                                                                {group.catName}
                                                            </h3>
                                                            <p className="text-[11px] font-semibold text-slate-500">
                                                                {group.posts.length} {group.posts.length === 1 ? "memory" : "memories"}
                                                                {group.photoCount > 0 ? ` • ${group.photoCount} photos` : ""}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                                                    <ChevronRight size={16} />
                                                </div>
                                            </div>
                                        </motion.button>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {selectedCategory && (
                                    <div className="flex items-center justify-between rounded-3xl border border-slate-200 bg-white/80 px-4 py-2.5 shadow-sm">
                                        <div className="flex items-center gap-3">
                                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                                                <FolderOpen size={18} />
                                            </div>
                                            <div>
                                                <p className="text-[9px] font-black uppercase tracking-[0.22em] text-slate-400">
                                                    Collection
                                                </p>
                                                <h3 className="text-base font-black tracking-tight text-slate-800">
                                                    {selectedCategory}
                                                </h3>
                                            </div>
                                        </div>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            className="rounded-full px-3 text-xs font-semibold text-slate-600"
                                            onClick={() => setSelectedCategory(null)}
                                        >
                                            Back to folders
                                        </Button>
                                    </div>
                                )}
                                <AnimatePresence mode="popLayout">
                                    {postsToDisplay.map((p, index) => (
                                        <motion.div key={p.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}>
                                            <CoupleFeedPost {...p} currentUserId={user?.id} coupleId={couple?.id} authorId={p.authorId ?? undefined} />
                                        </motion.div>
                                    ))}
                                </AnimatePresence>

                                <div className="pt-8 text-center" ref={sentinelRef}>
                                    {isFetchingNextPage ? (
                                        <div className="flex items-center justify-center gap-3 py-6"><div className="w-6 h-6 border-3 border-romantic-blush/30 border-t-romantic-heart rounded-full animate-spin" /><span className="text-sm text-slate-500">Gathering more...</span></div>
                                    ) : hasNextPage ? (
                                        <div className="py-6 text-[11px] font-bold uppercase text-slate-400">Scroll for more ✨</div>
                                    ) : <div className="py-8 text-[11px] font-black uppercase italic text-slate-400">This is where it all began.</div>}
                                </div>
                            </div>
                        )}
                    </section>
                </>
            )}

            {(couple || isSingle) && (
                <motion.button
                    initial={shouldReduceMotion ? false : { opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.5, type: "spring" }}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => router.push('/create-post')}
                    className={cn(
                        "fixed bottom-24 right-6 z-50 flex h-12 w-12 items-center justify-center rounded-full border-2 border-white text-white shadow-2xl",
                        isSingle
                            ? "bg-gradient-to-br from-emerald-500 to-teal-600"
                            : "bg-gradient-button"
                    )}
                >
                    {isSingle ? <Pencil className="h-5 w-5" /> : <MessageCircleHeart size={23} />}
                </motion.button>
            )}
        </motion.div>
    );
}
