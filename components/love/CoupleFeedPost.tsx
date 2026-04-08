"use client";
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";
import { POST_KEYS, removePostFromCaches, updatePostInCaches } from "@/hooks/use-posts";
import Image from "next/image";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { RichTextContent } from "@/components/ui/RichTextContent";
import { Heart, MessageCircle, Share2, MoreHorizontal, X, ChevronLeft, ChevronRight, Send, CornerDownRight, ZoomIn, ZoomOut, Download, Maximize2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toggleLikePost, addComment, addReply, deletePost } from "@/lib/actions/post";
import { toast } from "@/lib/toast";

type PostReply = {
    id: string;
    author_id?: string | null;
    author_name?: string | null;
    author_avatar?: string | null;
    content: string;
    created_at: string;
};

type PostComment = PostReply & {
    replies: PostReply[];
};

type PostMetadata = {
    images?: string[];
    likes?: string[];
    likes_count?: number;
    comments?: PostComment[];
    comments_count?: number;
};

type PostMetadataInput = {
    images?: string[];
    likes?: string[];
    likes_count?: number;
    comments?: unknown[];
    comments_count?: number;
};

type PostCacheRecord = {
    id?: string | null;
    metadata?: PostMetadata;
};

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizePostReply(value: unknown): PostReply | null {
    if (!isRecord(value)) {
        return null;
    }

    if (
        typeof value.id !== "string" ||
        typeof value.content !== "string" ||
        typeof value.created_at !== "string"
    ) {
        return null;
    }

    return {
        id: value.id,
        author_id: typeof value.author_id === "string" ? value.author_id : null,
        author_name: typeof value.author_name === "string" ? value.author_name : null,
        author_avatar: typeof value.author_avatar === "string" ? value.author_avatar : null,
        content: value.content,
        created_at: value.created_at,
    };
}

function normalizePostComment(value: unknown): PostComment | null {
    const reply = normalizePostReply(value);
    if (!reply || !isRecord(value)) {
        return null;
    }

    const replies = Array.isArray(value.replies)
        ? value.replies
            .map((entry) => normalizePostReply(entry))
            .filter((entry): entry is PostReply => Boolean(entry))
        : [];

    return {
        ...reply,
        replies,
    };
}

function normalizePostMetadata(value: PostMetadataInput | undefined): PostMetadata | undefined {
    if (!value) {
        return undefined;
    }

    return {
        images: Array.isArray(value.images)
            ? value.images.filter((image): image is string => typeof image === "string")
            : undefined,
        likes: Array.isArray(value.likes)
            ? value.likes.filter((like): like is string => typeof like === "string")
            : undefined,
        likes_count: typeof value.likes_count === "number" ? value.likes_count : undefined,
        comments: Array.isArray(value.comments)
            ? value.comments
                .map((comment) => normalizePostComment(comment))
                .filter((comment): comment is PostComment => Boolean(comment))
            : undefined,
        comments_count: typeof value.comments_count === "number" ? value.comments_count : undefined,
    };
}

interface PostProps {
    id: string;
    author: string;
    authorId?: string; // Added to check for deletion rights
    content: string;
    timestamp: string;
    reactions: number;
    comments: number;
    imageUrl?: string | null;
    avatarUrl?: string | null;
    currentUserId?: string;
    coupleId?: string;
    metadata?: PostMetadataInput;
}

export function CoupleFeedPost({ id, author, authorId, content, timestamp, reactions, comments, imageUrl, avatarUrl, metadata, currentUserId, coupleId }: PostProps) {
    const queryClient = useQueryClient();
    const [modalOpen, setModalOpen] = useState(false);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [isExpanded, setIsExpanded] = useState(false);
    const [isCommentsOpen, setIsCommentsOpen] = useState(false);
    const [imageScale, setImageScale] = useState(1);
    const [imagePosition, setImagePosition] = useState({ x: 0, y: 0 });
    const [commentText, setCommentText] = useState("");
    const [submittingComment, setSubmittingComment] = useState(false);
    const [replyingToId, setReplyingToId] = useState<string | null>(null);
    const [replyText, setReplyText] = useState("");
    const [showOptions, setShowOptions] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isDeleted, setIsDeleted] = useState(false);
    const [isLiking, setIsLiking] = useState(false);
    const [submittingReplyId, setSubmittingReplyId] = useState<string | null>(null);

    const [localMetadata, setLocalMetadata] = useState<PostMetadata | undefined>(() => normalizePostMetadata(metadata));
    const targetId = coupleId || currentUserId;

    useEffect(() => {
        if (submittingComment) return;
        setLocalMetadata(normalizePostMetadata(metadata));
    }, [metadata, submittingComment]);

    // Get dynamic counts from arrays
    const dynamicLikesCount = useMemo(() => {
        return localMetadata?.likes?.length ?? reactions;
    }, [localMetadata?.likes, reactions]);

    const dynamicCommentsCount = useMemo(() => {
        const list = localMetadata?.comments || [];
        return list.reduce((acc, comment) => acc + 1 + (comment.replies?.length || 0), 0) || comments;
    }, [localMetadata?.comments, comments]);

    const [isLiked, setIsLiked] = useState(localMetadata?.likes?.includes(currentUserId || "") || false);
    const [likesCount, setLikesCount] = useState(dynamicLikesCount);

    // Sync state with metadata updates from realtime
    useEffect(() => {
        setIsLiked(localMetadata?.likes?.includes(currentUserId || "") || false);
        setLikesCount(dynamicLikesCount);
    }, [localMetadata?.likes, dynamicLikesCount, currentUserId]);

    // Get images from metadata, fallback to imageUrl
    const images = localMetadata?.images && localMetadata.images.length > 0
        ? localMetadata.images
        : imageUrl
            ? [imageUrl]
            : [];

    const syncMetadataAcrossCaches = (nextMetadata: PostMetadata | undefined) => {
        if (!targetId) return;

        updatePostInCaches(queryClient, targetId, id, (post: PostCacheRecord) => ({
            ...post,
            metadata: nextMetadata,
        }));
    };

    const toggleLike = async () => {
        if (isLiking) return;
        setIsLiking(true);

        // Optimistic update
        const nextLiked = !isLiked;
        setIsLiked(nextLiked);
        setLikesCount(prev => nextLiked ? prev + 1 : prev - 1);

        const currentMetadata = localMetadata;
        const currentLikes = Array.isArray(localMetadata?.likes) ? [...localMetadata.likes] : [];
        if (nextLiked && currentUserId) currentLikes.push(currentUserId);
        else if (!nextLiked && currentUserId) {
            const i = currentLikes.indexOf(currentUserId);
            if (i > -1) currentLikes.splice(i, 1);
        }

        setLocalMetadata(prev => ({
            ...(prev || {}),
            likes: currentLikes,
            likes_count: currentLikes.length
        }));

        const optimisticMetadata = {
            ...(currentMetadata || {}),
            likes: currentLikes,
            likes_count: currentLikes.length,
        };

        syncMetadataAcrossCaches(optimisticMetadata);

        try {
            const result = await toggleLikePost(id);
            if (!result.success) {
                setIsLiked(!nextLiked);
                setLikesCount(prev => !nextLiked ? prev + 1 : prev - 1);
                setLocalMetadata(currentMetadata);
                syncMetadataAcrossCaches(currentMetadata);
            } else if (result.metadata) {
                const nextMetadata = normalizePostMetadata(result.metadata);
                setLocalMetadata(nextMetadata);
                syncMetadataAcrossCaches(nextMetadata);
            }
        } finally {
            setIsLiking(false);
        }
    };

    const handleCommentSubmit = async () => {
        if (!commentText.trim() || submittingComment) return;
        setSubmittingComment(true);

        const trimmed = commentText.trim();
        const prevMetadata = localMetadata;

        const makeId = () => {
            try {
                return crypto.randomUUID();
            } catch {
                return `tmp-${Date.now()}-${Math.random().toString(16).slice(2)}`;
            }
        };

        const optimisticComment: PostComment = {
            id: `tmp-${makeId()}`,
            author_id: currentUserId,
            author_name: "Me",
            author_avatar: null,
            content: trimmed,
            created_at: new Date().toISOString(),
            replies: []
        };

        setCommentText("");
        setLocalMetadata((prev) => {
            const base: PostMetadata = prev ? { ...prev } : {};
            const nextComments = Array.isArray(base.comments) ? [...base.comments, optimisticComment] : [optimisticComment];
            const totalComments = nextComments.reduce((acc, comment) => acc + 1 + (comment.replies?.length || 0), 0);
            const nextMetadata = {
                ...base,
                comments: nextComments,
                comments_count: totalComments,
            };
            syncMetadataAcrossCaches(nextMetadata);
            return nextMetadata;
        });

        const result = await addComment(id, trimmed);
        if (result.success) {
            if (result.metadata) {
                const nextMetadata = normalizePostMetadata(result.metadata);
                setLocalMetadata(nextMetadata);
                syncMetadataAcrossCaches(nextMetadata);
            }
        } else {
            setLocalMetadata(prevMetadata);
            syncMetadataAcrossCaches(prevMetadata);
        }
        setSubmittingComment(false);
    };

    const handleReplySubmit = async (commentId: string) => {
        if (!replyText.trim() || submittingComment) return;
        setSubmittingComment(true);
        setSubmittingReplyId(commentId);

        const trimmed = replyText.trim();
        const prevMetadata = localMetadata;

        const makeId = () => {
            try {
                return crypto.randomUUID();
            } catch {
                return `tmp-${Date.now()}-${Math.random().toString(16).slice(2)}`;
            }
        };

        const optimisticReply: PostReply = {
            id: `tmp-${makeId()}`,
            author_id: currentUserId,
            author_name: "Me",
            author_avatar: null,
            content: trimmed,
            created_at: new Date().toISOString()
        };

        setReplyText("");
        setReplyingToId(null);
        setLocalMetadata((prev) => {
            const base: PostMetadata = prev ? { ...prev } : {};
            const list = Array.isArray(base.comments) ? [...base.comments] : [];
            const idx = list.findIndex((comment) => comment.id === commentId);
            if (idx === -1) return base;
            const target: PostComment = { ...list[idx] };
            target.replies = Array.isArray(target.replies) ? [...target.replies, optimisticReply] : [optimisticReply];
            list[idx] = target;
            const totalComments = list.reduce((acc, comment) => acc + 1 + (comment.replies?.length || 0), 0);
            const nextMetadata = {
                ...base,
                comments: list,
                comments_count: totalComments,
            };
            syncMetadataAcrossCaches(nextMetadata);
            return nextMetadata;
        });

        const result = await addReply(id, commentId, trimmed);
        if (result.success) {
            if (result.metadata) {
                const nextMetadata = normalizePostMetadata(result.metadata);
                setLocalMetadata(nextMetadata);
                syncMetadataAcrossCaches(nextMetadata);
            }
        } else {
            setLocalMetadata(prevMetadata);
            syncMetadataAcrossCaches(prevMetadata);
        }
        setSubmittingComment(false);
        setSubmittingReplyId(null);
    };

    const openModal = (index: number) => {
        setCurrentImageIndex(index);
        setModalOpen(true);
        setImageScale(1);
        setImagePosition({ x: 0, y: 0 });
    };

    const handleZoomIn = () => {
        setImageScale(prev => Math.min(prev + 0.5, 3));
    };

    const handleZoomOut = () => {
        setImageScale(prev => Math.max(prev - 0.5, 1));
        if (imageScale <= 1.5) {
            setImagePosition({ x: 0, y: 0 });
        }
    };

    const handleResetZoom = () => {
        setImageScale(1);
        setImagePosition({ x: 0, y: 0 });
    };

    const handleDownload = async () => {
        const imageUrl = images[currentImageIndex];
        try {
            const response = await fetch(imageUrl);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `memory-${currentImageIndex + 1}.jpg`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Download failed:', error);
        }
    };

    const nextImage = useCallback(() => {
        setCurrentImageIndex((prev) => (prev + 1) % images.length);
        handleResetZoom();
    }, [images.length]);

    const prevImage = useCallback(() => {
        setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
        handleResetZoom();
    }, [images.length]);

    // Keyboard navigation for modal
    useEffect(() => {
        if (!modalOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setModalOpen(false);
            } else if (e.key === 'ArrowLeft') {
                prevImage();
            } else if (e.key === 'ArrowRight') {
                nextImage();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [modalOpen, images.length, nextImage, prevImage]);

    if (isDeleted) {
        return null;
    }

    return (
        <Card className={cn(
            "group relative overflow-hidden rounded-[1.75rem] border-none bg-white/90 shadow-lg md:backdrop-blur-sm",
            isDeleting && "opacity-50 pointer-events-none"
        )}>
            {isDeleting && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/50 backdrop-blur-sm">
                    <div className="flex flex-col items-center">
                        <div className="w-8 h-8 rounded-full border-2 border-slate-300 border-t-slate-800 animate-spin mb-2" />
                        <span className="text-xs font-bold text-slate-800">Deleting...</span>
                    </div>
                </div>
            )}
            {/* Post Header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9 ring-2 ring-romantic-blush/20">
                        {avatarUrl && <AvatarImage src={avatarUrl} alt={author} />}
                        <AvatarFallback className="bg-gradient-button text-white text-xs font-bold">{author[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                        <h4 className="text-[13px] font-bold text-slate-800">{author}</h4>
                        <p className="text-[9px] font-medium uppercase tracking-tight text-slate-400">{timestamp}</p>
                    </div>
                </div>
                <div className="relative">
                    <button 
                        onClick={() => setShowOptions(!showOptions)}
                        className="rounded-full p-1 text-slate-300 transition-colors hover:bg-slate-100 hover:text-slate-600"
                    >
                        <MoreHorizontal size={18} />
                    </button>

                    <AnimatePresence>
                        {showOptions && (
                            <>
                                <div 
                                    className="fixed inset-0 z-10" 
                                    onClick={() => setShowOptions(false)} 
                                />
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.9, y: -10 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.9, y: -10 }}
                                    className="absolute right-0 z-20 mt-2 w-44 overflow-hidden rounded-2xl border border-slate-100 bg-white py-1.5 shadow-2xl"
                                >
                                    <button
                                        onClick={() => {
                                            setShowOptions(false);
                                            // Handle sharing or other options
                                        }}
                                        className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50"
                                    >
                                        <Share2 size={15} />
                                        Share Memory
                                    </button>
                                    
                                    {(currentUserId === authorId) && (
                                        <button
                                            onClick={async () => {
                                                if (window.confirm("Are you sure you want to delete this memory?")) {
                                                    const previousFeeds = queryClient.getQueriesData({ queryKey: POST_KEYS.all });
                                                    const previousRecent = targetId
                                                        ? queryClient.getQueryData(POST_KEYS.recent(targetId))
                                                        : undefined;

                                                    setShowOptions(false);
                                                    setIsDeleting(true);
                                                    removePostFromCaches(queryClient, targetId, id);

                                                    const res = await deletePost(id);
                                                    if (!res.success) {
                                                        for (const [key, value] of previousFeeds) {
                                                            queryClient.setQueryData(key, value);
                                                        }
                                                        if (targetId) {
                                                            queryClient.setQueryData(POST_KEYS.recent(targetId), previousRecent);
                                                        }
                                                        toast.error("Couldn't delete memory", res.error || "Failed to delete post.");
                                                        setIsDeleting(false);
                                                    } else {
                                                        toast.success("Memory deleted", "The memory was removed.");
                                                        setIsDeleted(true);
                                                    }
                                                }
                                            }}
                                            disabled={isDeleting}
                                            className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-xs font-semibold text-red-600 hover:bg-red-50"
                                        >
                                            <X size={15} />
                                            {isDeleting ? "Deleting..." : "Delete Memory"}
                                        </button>
                                    )}
                                </motion.div>
                            </>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Post Content - Separated by borders, no rounding, with Read More */}
            <div className="bg-slate-50/30 px-4">
                <p className={cn(
                    "whitespace-pre-wrap break-words text-[14px] font-medium leading-relaxed text-slate-700",
                    !isExpanded && "line-clamp-3"
                )}>
                    {content}
                </p>
                {content.length > 150 && (
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="mt-1.5 text-[9px] font-black tracking-widest text-romantic-heart transition-opacity hover:opacity-70"
                    >
                        {isExpanded ? "Show Less" : "Read More"}
                    </button>
                )}
            </div>

            {/* Post Images Grid */}
            {images.length > 0 && (
                <div className="px-3.5 pb-3.5">
                    <div className={cn(
                        "grid gap-1 overflow-hidden rounded-[1.35rem]",
                        images.length === 1 ? "grid-cols-1" :
                            images.length === 2 ? "grid-cols-2" :
                                "grid-cols-2 grid-rows-2"
                    )}>
                        {images.slice(0, 4).map((img, idx) => (
                            <div
                                key={idx}
                                className={cn(
                                    "relative bg-slate-100 cursor-pointer group/img",
                                    images.length === 1 ? "aspect-[4/3]" :
                                        images.length === 2 ? "aspect-square" :
                                            images.length === 3 && idx === 0 ? "row-span-2 aspect-square" : "aspect-square"
                                )}
                                onClick={() => openModal(idx)}
                            >
                                <Image
                                    src={img}
                                    alt={`Post image ${idx + 1}`}
                                    fill
                                    className="object-cover transition-transform group-hover/img:scale-105"
                                    sizes="(max-width: 768px) 50vw, 336px"
                                />
                                {idx === 3 && images.length > 4 && (
                                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                        <span className="text-white text-3xl font-bold">+{images.length - 4}</span>
                                    </div>
                                )}
                                <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/10 transition-colors" />
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Enhanced Image Modal */}
            <AnimatePresence>
                {modalOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-black/98 flex items-center justify-center"
                        onClick={() => setModalOpen(false)}
                    >
                        {/* Top Controls Bar */}
                        <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between bg-gradient-to-b from-black/50 to-transparent z-10">
                            <div className="flex items-center gap-2">
                                {/* Image Counter */}
                                <div className="px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full text-white text-sm font-bold">
                                    {currentImageIndex + 1} / {images.length}
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                {/* Download Button */}
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleDownload();
                                    }}
                                    className="p-2.5 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full text-white transition-colors"
                                    title="Download image"
                                >
                                    <Download size={20} />
                                </motion.button>

                                {/* Close Button */}
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => setModalOpen(false)}
                                    className="p-2.5 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full text-white transition-colors"
                                >
                                    <X size={20} />
                                </motion.button>
                            </div>
                        </div>

                        {/* Main Image Container */}
                        <div
                            className="relative w-full h-full flex items-center justify-center overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <motion.div
                                className="relative w-full h-full max-w-6xl max-h-[90vh] cursor-move"
                                style={{
                                    scale: imageScale,
                                    x: imagePosition.x,
                                    y: imagePosition.y,
                                }}
                                drag={imageScale > 1}
                                dragConstraints={{
                                    left: -200 * (imageScale - 1),
                                    right: 200 * (imageScale - 1),
                                    top: -200 * (imageScale - 1),
                                    bottom: 200 * (imageScale - 1),
                                }}
                                dragElastic={0.1}
                                animate={{
                                    scale: imageScale,
                                    x: imagePosition.x,
                                    y: imagePosition.y,
                                }}
                                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                            >
                                <Image
                                    src={images[currentImageIndex]}
                                    alt={`Image ${currentImageIndex + 1}`}
                                    fill
                                    className="object-contain select-none"
                                    sizes="(max-width: 1536px) 100vw, 1536px"
                                    priority
                                    draggable={false}
                                />
                            </motion.div>
                        </div>

                        {/* Bottom Controls Bar */}
                        <div className="absolute bottom-0 left-0 right-0 p-4 flex items-center justify-center bg-gradient-to-t from-black/50 to-transparent z-10">
                            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full p-2">
                                {/* Zoom Out */}
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleZoomOut();
                                    }}
                                    disabled={imageScale <= 1}
                                    className="p-2 hover:bg-white/20 rounded-full text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                    title="Zoom out"
                                >
                                    <ZoomOut size={20} />
                                </motion.button>

                                {/* Zoom Level Indicator */}
                                <div className="px-3 py-1 text-white text-sm font-bold min-w-[60px] text-center">
                                    {Math.round(imageScale * 100)}%
                                </div>

                                {/* Zoom In */}
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleZoomIn();
                                    }}
                                    disabled={imageScale >= 3}
                                    className="p-2 hover:bg-white/20 rounded-full text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                    title="Zoom in"
                                >
                                    <ZoomIn size={20} />
                                </motion.button>

                                {/* Reset Zoom */}
                                {imageScale > 1 && (
                                    <motion.button
                                        initial={{ opacity: 0, scale: 0 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0 }}
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleResetZoom();
                                        }}
                                        className="p-2 hover:bg-white/20 rounded-full text-white transition-colors ml-2 border-l border-white/20 pl-3"
                                        title="Reset zoom"
                                    >
                                        <Maximize2 size={20} />
                                    </motion.button>
                                )}
                            </div>
                        </div>

                        {/* Navigation Arrows */}
                        {images.length > 1 && (
                            <>
                                <motion.button
                                    whileHover={{ scale: 1.1, x: -5 }}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        prevImage();
                                    }}
                                    className="absolute left-4 top-1/2 -translate-y-1/2 p-4 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full text-white transition-all shadow-2xl"
                                >
                                    <ChevronLeft size={28} />
                                </motion.button>
                                <motion.button
                                    whileHover={{ scale: 1.1, x: 5 }}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        nextImage();
                                    }}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 p-4 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full text-white transition-all shadow-2xl"
                                >
                                    <ChevronRight size={28} />
                                </motion.button>
                            </>
                        )}

                        {/* Thumbnail Strip */}
                        {images.length > 1 && (
                            <div className="absolute bottom-20 left-1/2 -translate-x-1/2 flex gap-2 p-2 bg-black/30 backdrop-blur-sm rounded-full max-w-[90vw] overflow-x-auto scrollbar-hide">
                                {images.map((img, idx) => (
                                    <motion.button
                                        key={idx}
                                        whileHover={{ scale: 1.1 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setCurrentImageIndex(idx);
                                            handleResetZoom();
                                        }}
                                        className={cn(
                                            "relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 transition-all",
                                            currentImageIndex === idx
                                                ? "ring-2 ring-white shadow-lg"
                                                : "opacity-50 hover:opacity-100"
                                        )}
                                    >
                                        <Image
                                            src={img}
                                            alt={`Thumbnail ${idx + 1}`}
                                            fill
                                            className="object-cover"
                                            sizes="64px"
                                        />
                                    </motion.button>
                                ))}
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Actions */}
            <div className="flex items-center gap-5 px-4 pb-4">
                <button
                    onClick={toggleLike}
                    disabled={isLiking}
                    className="group/btn relative flex items-center gap-2"
                >
                    <div className="relative">
                        <Heart
                            className={cn(
                                "transition-all duration-300",
                                isLiked ? "fill-romantic-heart text-romantic-heart scale-110" : "text-slate-400 group-hover/btn:text-romantic-petal"
                            )}
                            size={20}
                        />
                        <AnimatePresence>
                            {isLiked && (
                                <motion.div
                                    initial={{ y: 0, opacity: 1, scale: 0.5 }}
                                    animate={{ y: -40, opacity: 0, scale: 2 }}
                                    exit={{ opacity: 0 }}
                                    className="absolute inset-0 text-romantic-heart pointer-events-none"
                                >
                                    <Heart fill="currentColor" size={20} />
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                    <span className={cn("text-[11px] font-bold", isLiked ? "text-romantic-heart" : "text-slate-400")}>
                        {isLiking ? "..." : likesCount}
                    </span>
                </button>

                <button
                    onClick={() => setIsCommentsOpen(!isCommentsOpen)}
                    className={cn(
                        "flex items-center gap-2 transition-colors",
                        isCommentsOpen ? "text-romantic-heart" : "text-slate-400 hover:text-slate-600"
                    )}
                >
                    <MessageCircle size={20} />
                    <span className="text-[11px] font-bold">{dynamicCommentsCount}</span>
                </button>

                <button className="ml-auto flex items-center gap-2 text-slate-400 transition-colors hover:text-slate-600">
                    <Share2 size={18} />
                </button>
            </div>

            {/* Comments Section */}
            <AnimatePresence>
                {isCommentsOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden bg-slate-50/50 border-t border-slate-100"
                    >
                        <div className="space-y-3.5 p-3.5">
                            {/* Comment Input */}
                            <div className="flex items-center gap-2">
                                <Avatar className="w-8 h-8">
                                    <AvatarFallback className="bg-slate-200 text-slate-500 text-[10px] font-bold">ME</AvatarFallback>
                                </Avatar>
                                <div className="flex-1 relative">
                                    <input
                                        type="text"
                                        value={commentText}
                                        onChange={(e) => setCommentText(e.target.value)}
                                        placeholder="Add a sweet comment..."
                                        className="w-full bg-white border border-slate-200 rounded-full px-4 py-2 text-sm outline-none focus:border-romantic-blush h-9"
                                        onKeyDown={(e) => e.key === 'Enter' && handleCommentSubmit()}
                                        disabled={submittingComment}
                                    />
                                    <button
                                        onClick={handleCommentSubmit}
                                        disabled={!commentText.trim() || submittingComment}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-romantic-heart disabled:opacity-30"
                                    >
                                        <Send size={16} />
                                    </button>
                                </div>
                            </div>

                            {/* Comments List */}
                            <div className="custom-scrollbar max-h-[280px] space-y-3.5 overflow-y-auto pr-2">
                                {(localMetadata?.comments?.length ?? 0) === 0 ? (
                                    <p className="text-center text-xs text-slate-400 py-2">No comments yet. Be the first!</p>
                                ) : (
                                    localMetadata?.comments?.map((comment) => (
                                        <div key={comment.id} className="space-y-2">
                                            <div className="flex gap-3">
                                                <Avatar className="w-8 h-8 shrink-0">
                                                    {comment.author_avatar && <AvatarImage src={comment.author_avatar} />}
                                                    <AvatarFallback className="bg-slate-100 text-slate-400 text-[10px]">{comment.author_name?.[0]}</AvatarFallback>
                                                </Avatar>
                                                <div className="flex-1">
                                                    <div className="bg-white rounded-2xl px-3 py-2 shadow-sm border border-slate-100 inline-block max-w-full">
                                                        <h5 className="text-[11px] font-bold text-slate-800">{comment.author_name}</h5>
                                                        <RichTextContent
                                                            text={comment.content}
                                                            tone="light"
                                                            className="text-xs text-slate-600"
                                                            previewListClassName="pt-0.5"
                                                        />
                                                    </div>
                                                    <div className="flex items-center gap-3 mt-1 px-1">
                                                        <span className="text-[9px] text-slate-400 uppercase font-medium">
                                                            {new Date(comment.created_at).toLocaleDateString()}
                                                        </span>
                                                        <button
                                                            onClick={() => setReplyingToId(replyingToId === comment.id ? null : comment.id)}
                                                            className="text-[9px] text-romantic-heart font-bold uppercase hover:underline"
                                                        >
                                                            Reply
                                                        </button>
                                                    </div>

                                                    {/* Replies List */}
                                                    {comment.replies?.length > 0 && (
                                                        <div className="mt-3 space-y-3 pl-2 border-l-2 border-romantic-blush/20">
                                                            {comment.replies.map((reply) => (
                                                                <div key={reply.id} className="flex gap-2">
                                                                    <Avatar className="w-6 h-6 shrink-0">
                                                                        {reply.author_avatar && <AvatarImage src={reply.author_avatar} />}
                                                                        <AvatarFallback className="bg-slate-50 text-slate-400 text-[8px]">{reply.author_name?.[0]}</AvatarFallback>
                                                                    </Avatar>
                                                                    <div className="flex-1">
                                                                        <div className="bg-white/80 rounded-xl px-2.5 py-1.5 shadow-sm border border-slate-50 inline-block max-w-full">
                                                                            <h5 className="text-[10px] font-bold text-slate-800">{reply.author_name}</h5>
                                                                            <RichTextContent
                                                                                text={reply.content}
                                                                                tone="light"
                                                                                className="text-[11px] text-slate-600"
                                                                                previewListClassName="pt-0.5"
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}

                                                    {/* Reply Input */}
                                                    <AnimatePresence>
                                                        {replyingToId === comment.id && (
                                                            <motion.div
                                                                initial={{ opacity: 0, y: -5 }}
                                                                animate={{ opacity: 1, y: 0 }}
                                                                exit={{ opacity: 0, y: -5 }}
                                                                className="mt-2 flex items-center gap-2"
                                                            >
                                                                <CornerDownRight size={14} className="text-slate-300" />
                                                                <div className="flex-1 relative">
                                                                    <input
                                                                        type="text"
                                                                        autoFocus
                                                                        value={replyText}
                                                                        onChange={(e) => setReplyText(e.target.value)}
                                                                        placeholder="Write a reply..."
                                                                        className="w-full bg-white border border-slate-200 rounded-full px-3 py-1.5 text-xs outline-none focus:border-romantic-blush h-8"
                                                                        onKeyDown={(e) => e.key === 'Enter' && handleReplySubmit(comment.id)}
                                                                        disabled={submittingComment}
                                                                    />
                                                                    <button
                                                                        onClick={() => handleReplySubmit(comment.id)}
                                                                        disabled={!replyText.trim() || submittingComment}
                                                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-romantic-heart disabled:opacity-30"
                                                                    >
                                                                        {submittingReplyId === comment.id ? (
                                                                            <span className="text-[10px] font-bold">...</span>
                                                                        ) : (
                                                                            <Send size={14} />
                                                                        )}
                                                                    </button>
                                                                </div>
                                                            </motion.div>
                                                        )}
                                                    </AnimatePresence>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </Card>
    );
}
