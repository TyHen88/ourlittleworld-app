"use client";
import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";
import Image from "next/image";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Heart, MessageCircle, Share2, MoreHorizontal, X, ChevronLeft, ChevronRight, Send, CornerDownRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { toggleLikePost, addComment, addReply } from "@/lib/actions/post";

interface PostProps {
    id: string;
    author: string;
    content: string;
    timestamp: string;
    reactions: number;
    comments: number;
    imageUrl?: string | null;
    avatarUrl?: string | null;
    currentUserId?: string;
    coupleId?: string;
    metadata?: {
        images?: string[];
        likes?: string[];
        likes_count?: number;
        comments?: any[];
        comments_count?: number;
    };
}

export function CoupleFeedPost({ id, author, content, timestamp, reactions, comments, imageUrl, avatarUrl, metadata, currentUserId, coupleId }: PostProps) {
    const queryClient = useQueryClient();
    const [modalOpen, setModalOpen] = useState(false);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [isExpanded, setIsExpanded] = useState(false);
    const [isCommentsOpen, setIsCommentsOpen] = useState(false);
    const [commentText, setCommentText] = useState("");
    const [submittingComment, setSubmittingComment] = useState(false);
    const [replyingToId, setReplyingToId] = useState<string | null>(null);
    const [replyText, setReplyText] = useState("");

    const [localMetadata, setLocalMetadata] = useState<PostProps["metadata"]>(metadata);

    useEffect(() => {
        if (submittingComment) return;
        setLocalMetadata(metadata);
    }, [metadata, submittingComment]);

    // Get dynamic counts from arrays
    const dynamicLikesCount = useMemo(() => {
        return metadata?.likes?.length ?? reactions;
    }, [metadata?.likes, reactions]);

    const dynamicCommentsCount = useMemo(() => {
        const list = localMetadata?.comments || [];
        return list.reduce((acc: number, c: any) => acc + 1 + (c.replies?.length || 0), 0) || comments;
    }, [localMetadata?.comments, comments]);

    const [isLiked, setIsLiked] = useState(metadata?.likes?.includes(currentUserId || "") || false);
    const [likesCount, setLikesCount] = useState(dynamicLikesCount);

    // Sync state with metadata updates from realtime
    useEffect(() => {
        setIsLiked(metadata?.likes?.includes(currentUserId || "") || false);
        setLikesCount(dynamicLikesCount);
    }, [metadata?.likes, dynamicLikesCount, currentUserId]);

    // Get images from metadata, fallback to imageUrl
    const images = metadata?.images && metadata.images.length > 0
        ? metadata.images
        : imageUrl
            ? [imageUrl]
            : [];

    const toggleLike = async () => {
        // Optimistic update
        const nextLiked = !isLiked;
        setIsLiked(nextLiked);
        setLikesCount(prev => nextLiked ? prev + 1 : prev - 1);

        const result = await toggleLikePost(id);
        if (!result.success) {
            // Revert on error
            setIsLiked(!nextLiked);
            setLikesCount(prev => !nextLiked ? prev + 1 : prev - 1);
        } else if (coupleId) {
            queryClient.invalidateQueries({ queryKey: ['posts', coupleId] });
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

        const optimisticComment = {
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
            const base: any = prev && typeof prev === 'object' ? prev : {};
            const nextComments = Array.isArray(base.comments) ? [...base.comments, optimisticComment] : [optimisticComment];
            const totalComments = nextComments.reduce((acc: number, c: any) => acc + 1 + (c.replies?.length || 0), 0);
            return {
                ...base,
                comments: nextComments,
                comments_count: totalComments,
            };
        });

        const result = await addComment(id, trimmed);
        if (result.success) {
            if (result.metadata) setLocalMetadata(result.metadata);
            if (coupleId) {
                await queryClient.invalidateQueries({ queryKey: ['posts', coupleId] });
            }
        } else {
            setLocalMetadata(prevMetadata);
        }
        setSubmittingComment(false);
    };

    const handleReplySubmit = async (commentId: string) => {
        if (!replyText.trim() || submittingComment) return;
        setSubmittingComment(true);

        const trimmed = replyText.trim();
        const prevMetadata = localMetadata;

        const makeId = () => {
            try {
                return crypto.randomUUID();
            } catch {
                return `tmp-${Date.now()}-${Math.random().toString(16).slice(2)}`;
            }
        };

        const optimisticReply = {
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
            const base: any = prev && typeof prev === 'object' ? prev : {};
            const list = Array.isArray(base.comments) ? [...base.comments] : [];
            const idx = list.findIndex((c: any) => c?.id === commentId);
            if (idx === -1) return base;
            const target = { ...list[idx] };
            target.replies = Array.isArray(target.replies) ? [...target.replies, optimisticReply] : [optimisticReply];
            list[idx] = target;
            const totalComments = list.reduce((acc: number, c: any) => acc + 1 + (c.replies?.length || 0), 0);
            return {
                ...base,
                comments: list,
                comments_count: totalComments,
            };
        });

        const result = await addReply(id, commentId, trimmed);
        if (result.success) {
            if (result.metadata) setLocalMetadata(result.metadata);
            if (coupleId) {
                await queryClient.invalidateQueries({ queryKey: ['posts', coupleId] });
            }
        } else {
            setLocalMetadata(prevMetadata);
        }
        setSubmittingComment(false);
    };

    const openModal = (index: number) => {
        setCurrentImageIndex(index);
        setModalOpen(true);
    };

    const nextImage = () => {
        setCurrentImageIndex((prev) => (prev + 1) % images.length);
    };

    const prevImage = () => {
        setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
    };

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
    }, [modalOpen, images.length]);

    return (
        <Card className="overflow-hidden border-none shadow-xl bg-white/90 backdrop-blur-sm rounded-4xl group">
            {/* Post Header */}
            <div className="border-b border-slate-100 p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Avatar className="w-10 h-10 ring-2 ring-romantic-blush/20">
                        {avatarUrl && <AvatarImage src={avatarUrl} alt={author} />}
                        <AvatarFallback className="bg-gradient-button text-white text-xs font-bold">{author[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                        <h4 className="text-sm font-bold text-slate-800">{author}</h4>
                        <p className="text-[10px] text-slate-400 font-medium uppercase tracking-tight">{timestamp}</p>
                    </div>
                </div>
                <button className="text-slate-300 hover:text-slate-600 transition-colors">
                    <MoreHorizontal size={20} />
                </button>
            </div>

            {/* Post Content - Separated by borders, no rounding, with Read More */}
            <div className="bg-slate-50/30 px-5">
                <p className={cn(
                    "text-slate-700 leading-relaxed font-medium whitespace-pre-wrap break-words text-[15px]",
                    !isExpanded && "line-clamp-3"
                )}>
                    {content}
                </p>
                {content.length > 150 && (
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="text-romantic-heart text-[10px] font-black tracking-widest mt-2 hover:opacity-70 transition-opacity"
                    >
                        {isExpanded ? "Show Less" : "Read More"}
                    </button>
                )}
            </div>

            {/* Post Images Grid */}
            {images.length > 0 && (
                <div className="px-4 pb-4">
                    <div className={cn(
                        "grid gap-1 rounded-3xl overflow-hidden",
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

            {/* Image Modal */}
            <AnimatePresence>
                {modalOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4"
                        onClick={() => setModalOpen(false)}
                    >
                        {/* Close Button */}
                        <button
                            onClick={() => setModalOpen(false)}
                            className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors z-10"
                        >
                            <X size={24} />
                        </button>

                        {/* Image Counter */}
                        <div className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-white/10 rounded-full text-white text-sm font-medium">
                            {currentImageIndex + 1} / {images.length}
                        </div>

                        {/* Main Image */}
                        <div
                            className="relative w-full h-full max-w-4xl max-h-[80vh]"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <Image
                                src={images[currentImageIndex]}
                                alt={`Image ${currentImageIndex + 1}`}
                                fill
                                className="object-contain"
                                sizes="(max-width: 1024px) 100vw, 1024px"
                            />
                        </div>

                        {/* Navigation Arrows */}
                        {images.length > 1 && (
                            <>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        prevImage();
                                    }}
                                    className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
                                >
                                    <ChevronLeft size={32} />
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        nextImage();
                                    }}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
                                >
                                    <ChevronRight size={32} />
                                </button>
                            </>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Actions */}
            <div className="px-5 pb-5 flex items-center gap-6">
                <button
                    onClick={toggleLike}
                    className="group/btn relative flex items-center gap-2"
                >
                    <div className="relative">
                        <Heart
                            className={cn(
                                "transition-all duration-300",
                                isLiked ? "fill-romantic-heart text-romantic-heart scale-110" : "text-slate-400 group-hover/btn:text-romantic-petal"
                            )}
                            size={22}
                        />
                        <AnimatePresence>
                            {isLiked && (
                                <motion.div
                                    initial={{ y: 0, opacity: 1, scale: 0.5 }}
                                    animate={{ y: -40, opacity: 0, scale: 2 }}
                                    exit={{ opacity: 0 }}
                                    className="absolute inset-0 text-romantic-heart pointer-events-none"
                                >
                                    <Heart fill="currentColor" size={22} />
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                    <span className={cn("text-xs font-bold", isLiked ? "text-romantic-heart" : "text-slate-400")}>
                        {likesCount}
                    </span>
                </button>

                <button
                    onClick={() => setIsCommentsOpen(!isCommentsOpen)}
                    className={cn(
                        "flex items-center gap-2 transition-colors",
                        isCommentsOpen ? "text-romantic-heart" : "text-slate-400 hover:text-slate-600"
                    )}
                >
                    <MessageCircle size={22} />
                    <span className="text-xs font-bold">{dynamicCommentsCount}</span>
                </button>

                <button className="flex items-center gap-2 text-slate-400 hover:text-slate-600 transition-colors ml-auto">
                    <Share2 size={20} />
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
                        <div className="p-4 space-y-4">
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
                            <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                {(localMetadata?.comments?.length ?? 0) === 0 ? (
                                    <p className="text-center text-xs text-slate-400 py-2">No comments yet. Be the first!</p>
                                ) : (
                                    localMetadata?.comments?.map((comment: any) => (
                                        <div key={comment.id} className="space-y-2">
                                            <div className="flex gap-3">
                                                <Avatar className="w-8 h-8 shrink-0">
                                                    {comment.author_avatar && <AvatarImage src={comment.author_avatar} />}
                                                    <AvatarFallback className="bg-slate-100 text-slate-400 text-[10px]">{comment.author_name?.[0]}</AvatarFallback>
                                                </Avatar>
                                                <div className="flex-1">
                                                    <div className="bg-white rounded-2xl px-3 py-2 shadow-sm border border-slate-100 inline-block max-w-full">
                                                        <h5 className="text-[11px] font-bold text-slate-800">{comment.author_name}</h5>
                                                        <p className="text-xs text-slate-600 break-words">{comment.content}</p>
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
                                                            {comment.replies.map((reply: any) => (
                                                                <div key={reply.id} className="flex gap-2">
                                                                    <Avatar className="w-6 h-6 shrink-0">
                                                                        {reply.author_avatar && <AvatarImage src={reply.author_avatar} />}
                                                                        <AvatarFallback className="bg-slate-50 text-slate-400 text-[8px]">{reply.author_name?.[0]}</AvatarFallback>
                                                                    </Avatar>
                                                                    <div className="flex-1">
                                                                        <div className="bg-white/80 rounded-xl px-2.5 py-1.5 shadow-sm border border-slate-50 inline-block max-w-full">
                                                                            <h5 className="text-[10px] font-bold text-slate-800">{reply.author_name}</h5>
                                                                            <p className="text-[11px] text-slate-600 break-words">{reply.content}</p>
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
                                                                    />
                                                                    <button
                                                                        onClick={() => handleReplySubmit(comment.id)}
                                                                        disabled={!replyText.trim() || submittingComment}
                                                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-romantic-heart disabled:opacity-30"
                                                                    >
                                                                        <Send size={14} />
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
