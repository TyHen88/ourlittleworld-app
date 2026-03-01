"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { CoupleFeedPost } from "@/components/love/CoupleFeedPost";
import { AnimatePresence, motion } from "framer-motion";
import { MessageCircleHeart, Sparkles, X, Image as ImageIcon, Clock, Heart as HeartIcon, Filter, Search, ArrowLeft } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useCouple } from "@/hooks/use-couple";
import { usePosts } from "@/hooks/use-posts";
import { FullPageLoader } from "@/components/FullPageLoader";
import { cn } from "@/lib/utils";

type FilterType = "all" | "photos" | "recent" | "favorites";

export default function FeedPage() {
    const router = useRouter();
    const [filter, setFilter] = useState<FilterType>("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
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

    // Memoize the flattened and mapped posts with filtering
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
                category: row?.category ?? null,
            };
        });
    }, [data, user?.id, profile?.full_name]);

    // Filter posts based on selected filter
    const filteredPosts = useMemo(() => {
        let filtered = mappedPosts;
        const currentUserId = user?.id;

        // Apply filter
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

        // Apply search
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(p =>
                p.content.toLowerCase().includes(query) ||
                p.author.toLowerCase().includes(query)
            );
        }

        return filtered;
    }, [mappedPosts, filter, searchQuery, user?.id]);

    // Calculate filter counts
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


    const categories = [
        { id: 1, name: "Sweet Memories", icon: "✨", color: "from-pink-100 to-rose-50" },
        { id: 2, name: "Milestone", icon: "🏁", color: "from-amber-100 to-orange-50" },
        { id: 3, name: "Daily Life", icon: "🏠", color: "from-blue-100 to-sky-50" },
        { id: 4, name: "Travel", icon: "✈️", color: "from-emerald-100 to-teal-50" },
        { id: 5, name: "Food", icon: "🍳", color: "from-orange-100 to-amber-50" },
        { id: 6, name: "Entertainment", icon: "🍿", color: "from-purple-100 to-violet-50" },
        { id: 7, name: "Shopping", icon: "🛍️", color: "from-fuchsia-100 to-pink-50" },
        { id: 8, name: "Home", icon: "🛋️", color: "from-indigo-100 to-blue-50" },
        { id: 9, name: "Other", icon: "🌈", color: "from-slate-100 to-gray-50" },
    ];

    const groupedPosts = useMemo(() => {
        if (filter !== "all" || searchQuery.trim() || selectedCategory) return null;

        const groups: Record<string, any[]> = {};
        mappedPosts.forEach(post => {
            const cat = post.category || "Other";
            if (!groups[cat]) groups[cat] = [];
            groups[cat].push(post);
        });

        // Filter out categories with no posts for the initial view
        return Object.entries(groups).filter(([_, posts]) => posts.length > 0);
    }, [mappedPosts, filter, searchQuery, selectedCategory]);

    const isLoadingInitial = (coupleLoading || postsLoading) && mappedPosts.length === 0;

    if (isLoadingInitial) {
        return <FullPageLoader />;
    }

    const postsToDisplay = selectedCategory
        ? filteredPosts.filter(p => (p.category || "Other") === selectedCategory)
        : filteredPosts;

    return (
        <div className="p-6 space-y-6 max-w-2xl mx-auto pb-32">
            {/* Enhanced Header */}
            <motion.header
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
            >
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                            <Sparkles className="text-romantic-heart h-6 w-6" />
                            Our Memories
                        </h1>
                        <p className="text-sm text-slate-500 mt-1">Every moment with you is a gift</p>
                    </div>
                    <a
                        href="/dashboard"
                        className="p-2 rounded-full bg-slate-50 hover:bg-slate-100 transition-colors"
                    >
                        <ArrowLeft className="text-slate-500" size={20} />
                    </a>
                </div>

                {/* Filter Tabs */}
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
                                onClick={() => {
                                    setFilter(tab.value as FilterType);
                                    setSelectedCategory(null);
                                }}
                                className={cn(
                                    "flex items-center gap-2 px-4 py-2 rounded-full font-bold text-sm transition-all whitespace-nowrap",
                                    isActive
                                        ? "bg-romantic-heart text-white shadow-lg"
                                        : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"
                                )}
                            >
                                <Icon size={16} />
                                {tab.label}
                                <span className={cn(
                                    "text-xs px-1.5 py-0.5 rounded-full",
                                    isActive ? "bg-white/20" : "bg-slate-100"
                                )}>
                                    {tab.count}
                                </span>
                            </button>
                        );
                    })}
                </div>

                {/* Search Bar */}
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search memories..."
                        className="w-full pl-11 pr-4 py-3 rounded-2xl border border-slate-200 focus:border-romantic-heart focus:outline-none bg-white font-medium"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery("")}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                            <X size={18} />
                        </button>
                    )}
                </div>

                {selectedCategory && (
                    <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center gap-2 pt-2"
                    >
                        <button
                            onClick={() => setSelectedCategory(null)}
                            className="flex items-center gap-1.5 px-3 py-1 bg-slate-100 hover:bg-slate-200 rounded-full text-xs font-bold text-slate-600 transition-colors shadow-sm"
                        >
                            <ArrowLeft size={14} />
                            Back to Categories
                        </button>
                        <span className="text-sm font-bold text-slate-400">/</span>
                        <div className="flex items-center gap-1.5 px-3 py-1 bg-white border border-rose-100 rounded-full text-xs font-bold text-romantic-heart shadow-sm">
                            <span>{categories.find(c => c.name === selectedCategory)?.icon}</span>
                            <span>{selectedCategory}</span>
                        </div>
                    </motion.div>
                )}
            </motion.header>

            {/* Posts Section */}
            <section className="space-y-6">
                {!couple?.id ? (
                    <div className="text-center py-20 bg-gradient-to-br from-romantic-blush/20 to-white rounded-3xl border-2 border-dashed border-romantic-blush/30">
                        <Sparkles className="mx-auto text-slate-300 mb-4" size={48} />
                        <p className="text-slate-400 font-medium">No connection found</p>
                    </div>
                ) : postsToDisplay.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="text-center py-20 bg-gradient-to-br from-romantic-blush/20 to-white rounded-3xl border-2 border-dashed border-romantic-blush/30"
                    >
                        {filter === "all" && mappedPosts.length === 0 ? (
                            <>
                                <MessageCircleHeart className="mx-auto text-romantic-heart/30 mb-4" size={48} />
                                <p className="text-slate-600 font-bold text-lg">No memories yet</p>
                                <p className="text-sm text-slate-400 mt-2">Start creating beautiful moments together!</p>
                            </>
                        ) : (
                            <>
                                <Filter className="mx-auto text-slate-300 mb-4" size={48} />
                                <p className="text-slate-600 font-bold text-lg">No {filter} posts found</p>
                                <p className="text-sm text-slate-400 mt-2">Try a different filter or search term</p>
                            </>
                        )}
                    </motion.div>
                ) : groupedPosts && !selectedCategory ? (
                    <div className="space-y-12">
                        {groupedPosts.map(([catName, posts], groupIndex) => {
                            const catInfo = categories.find(c => c.name === catName) || categories[categories.length - 1];
                            return (
                                <motion.div
                                    key={catName}
                                    initial={{ opacity: 0, y: 30 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: groupIndex * 0.1, duration: 0.5 }}
                                    className="space-y-5"
                                >
                                    <div className="flex items-center justify-between px-1">
                                        <div className="flex items-center gap-3">
                                            <div className={cn(
                                                "w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-md bg-gradient-to-br transition-transform hover:scale-110",
                                                catInfo.color
                                            )}>
                                                {catInfo.icon}
                                            </div>
                                            <div>
                                                <h3 className="text-xl font-black text-slate-800 tracking-tight leading-none">{catName}</h3>
                                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                                                    {posts.length} {posts.length === 1 ? 'Memory' : 'Memories'}
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => {
                                                setSelectedCategory(catName);
                                                window.scrollTo({ top: 0, behavior: 'smooth' });
                                            }}
                                            className="px-5 py-2.5 rounded-2xl bg-white border border-slate-100 text-[11px] font-black uppercase tracking-wider text-slate-600 hover:border-romantic-heart hover:text-romantic-heart hover:translate-y-[-2px] active:translate-y-0 transition-all shadow-sm"
                                        >
                                            See All
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-1 gap-6">
                                        {posts.slice(0, 3).map((p) => (
                                            <CoupleFeedPost
                                                key={p.id}
                                                {...p}
                                                currentUserId={user?.id}
                                                coupleId={couple?.id}
                                            />
                                        ))}
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                ) : (
                    <>
                        <AnimatePresence mode="popLayout">
                            {postsToDisplay.map((p, index) => (
                                <motion.div
                                    key={p.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    transition={{ delay: index * 0.05 }}
                                >
                                    <CoupleFeedPost
                                        {...p}
                                        currentUserId={user?.id}
                                        coupleId={couple?.id}
                                    />
                                </motion.div>
                            ))}
                        </AnimatePresence>

                        <div className="pt-8 text-center" ref={sentinelRef}>
                            {isFetchingNextPage ? (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="flex items-center justify-center gap-3 py-6"
                                >
                                    <div className="w-6 h-6 border-3 border-romantic-blush/30 border-t-romantic-heart rounded-full animate-spin" />
                                    <span className="text-sm text-slate-500 font-bold tracking-tight">Gathering more memories...</span>
                                </motion.div>
                            ) : hasNextPage ? (
                                <div className="text-xs text-slate-400 font-bold tracking-widest uppercase py-6">Scroll to travel back in time ✨</div>
                            ) : postsToDisplay.length > 0 ? (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="flex flex-col items-center justify-center gap-3 py-10 opacity-70"
                                >
                                    <Heart className="w-8 h-8 text-romantic-heart/40" />
                                    <span className="text-xs text-slate-400 font-black tracking-widest uppercase italic text-center leading-relaxed">
                                        This is where it all began.<br />You've seen all your memories together.
                                    </span>
                                </motion.div>
                            ) : null}
                        </div>
                    </>
                )}
            </section>

            <motion.button
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5, type: "spring", stiffness: 260, damping: 20 }}
                type="button"
                onClick={() => router.push('/create-post')}
                whileHover={{ scale: 1.1, rotate: 5 }}
                whileTap={{ scale: 0.9 }}
                className="fixed bottom-24 right-6 w-16 h-16 bg-gradient-love rounded-full shadow-2xl flex items-center justify-center z-40 text-white border-2 border-white/50 backdrop-blur-sm"
            >
                <MessageCircleHeart size={28} />
            </motion.button>
        </div>
    );
}

// Just for the icon reference
function Heart({ className, size = 12 }: { className?: string, size?: number }) {
    return <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" /></svg>;
}
