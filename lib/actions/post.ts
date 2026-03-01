"use server";

import prisma from "@/lib/prisma";
import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { getCachedUserOrThrow } from "@/lib/auth-cache";
import { getCachedProfile } from "@/lib/db-utils";

export async function createPost(input: {
    content: string;
    imageUrls?: string[];
    metadata?: any;
}) {
    try {
        const user = await getCachedUserOrThrow();
        const content = (input.content ?? "").trim();

        const profile = await getCachedProfile(user.id);

        if (!profile?.couple_id) {
            return { success: false, error: "No couple found" };
        }

        const imageUrls = Array.isArray(input.imageUrls) ? input.imageUrls.filter(Boolean) : [];
        if (!content && imageUrls.length === 0) {
            return { success: false, error: "Content or image is required" };
        }

        const baseMetadata = input.metadata && typeof input.metadata === 'object' ? input.metadata : undefined;
        const nextMetadata: any =
            baseMetadata || imageUrls.length > 0
                ? {
                    ...(baseMetadata ?? {}),
                    ...(imageUrls.length > 0 ? { images: imageUrls } : {}),
                }
                : undefined;

        if (nextMetadata) {
            if (typeof nextMetadata.likes_count !== 'number') nextMetadata.likes_count = 0;
            if (typeof nextMetadata.comments_count !== 'number') nextMetadata.comments_count = 0;
        }

        const postDelegate: any = (prisma as any).post;
        const data = await postDelegate.create({
            data: {
                couple_id: profile.couple_id,
                author_id: user.id,
                content,
                image_url: imageUrls[0] ?? null,
                category: input.metadata?.category || null,
                ...(nextMetadata ? { metadata: nextMetadata } : {}),
            }
        });

        return { success: true, data };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function uploadPostImage(file: File) {
    try {
        const supabase = await createClient();

        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
            return { success: false, error: "Not authenticated" };
        }

        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}-${Date.now()}-${Math.random().toString(16).slice(2)}.${fileExt}`;
        const filePath = `post-images/${fileName}`;

        const { error } = await supabase.storage
            .from('couple-assets')
            .upload(filePath, file, {
                cacheControl: '3600',
                upsert: false
            });

        if (error) throw error;

        const { data: { publicUrl } } = supabase.storage
            .from('couple-assets')
            .getPublicUrl(filePath);

        return { success: true, url: publicUrl };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function toggleLikePost(postId: string) {
    try {
        const user = await getCachedUserOrThrow();
        const profile = await getCachedProfile(user.id);
        if (!profile?.couple_id) return { success: false, error: "No couple found" };

        const post: any = await prisma.post.findUnique({
            where: { id: postId },
            select: { metadata: true, couple_id: true }
        });

        if (!post) return { success: false, error: "Post not found" };
        if (post.couple_id !== profile.couple_id) return { success: false, error: "Post not found" };

        const metadata = (post.metadata as any) || {};
        const likes = Array.isArray(metadata.likes) ? metadata.likes : [];
        const userIndex = likes.indexOf(user.id);

        if (userIndex > -1) {
            likes.splice(userIndex, 1);
        } else {
            likes.push(user.id);
        }

        const nextMetadata = {
            ...metadata,
            likes,
            likes_count: likes.length
        };

        const updated = await (prisma as any).post.update({
            where: { id: postId },
            data: { metadata: nextMetadata }
        });

        return { success: true, metadata: updated?.metadata ?? nextMetadata };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function addComment(postId: string, content: string) {
    try {
        const user = await getCachedUserOrThrow();
        const profile = await getCachedProfile(user.id);
        if (!profile?.couple_id) return { success: false, error: "No couple found" };

        const post: any = await prisma.post.findUnique({
            where: { id: postId },
            select: { metadata: true, couple_id: true }
        });

        if (!post) return { success: false, error: "Post not found" };
        if (post.couple_id !== profile.couple_id) return { success: false, error: "Post not found" };

        const metadata = (post.metadata as any) || {};
        const comments = Array.isArray(metadata.comments) ? metadata.comments : [];

        const newComment = {
            id: crypto.randomUUID(),
            author_id: user.id,
            author_name: profile?.full_name || "Someone",
            author_avatar: profile?.avatar_url || null,
            content,
            created_at: new Date().toISOString(),
            replies: []
        };

        comments.push(newComment);

        const totalComments = comments.reduce((acc: number, c: any) => acc + 1 + (c.replies?.length || 0), 0);

        const nextMetadata = {
            ...metadata,
            comments,
            comments_count: totalComments
        };

        const updated = await (prisma as any).post.update({
            where: { id: postId },
            data: { metadata: nextMetadata }
        });

        return { success: true, comment: newComment, metadata: updated?.metadata ?? nextMetadata };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function addReply(postId: string, commentId: string, content: string) {
    try {
        const user = await getCachedUserOrThrow();
        const profile = await getCachedProfile(user.id);
        if (!profile?.couple_id) return { success: false, error: "No couple found" };

        const post: any = await prisma.post.findUnique({
            where: { id: postId },
            select: { metadata: true, couple_id: true }
        });

        if (!post) return { success: false, error: "Post not found" };
        if (post.couple_id !== profile.couple_id) return { success: false, error: "Post not found" };

        const metadata = (post.metadata as any) || {};
        const comments = Array.isArray(metadata.comments) ? [...metadata.comments] : [];

        const commentIndex = comments.findIndex((c: any) => c.id === commentId);
        if (commentIndex === -1) return { success: false, error: "Comment not found" };

        const newReply = {
            id: crypto.randomUUID(),
            author_id: user.id,
            author_name: profile?.full_name || "Someone",
            author_avatar: profile?.avatar_url || null,
            content,
            created_at: new Date().toISOString()
        };

        const targetComment = { ...comments[commentIndex] };
        targetComment.replies = Array.isArray(targetComment.replies) ? [...targetComment.replies, newReply] : [newReply];

        comments[commentIndex] = targetComment;

        const totalComments = comments.reduce((acc: number, c: any) => acc + 1 + (c.replies?.length || 0), 0);

        const nextMetadata = {
            ...metadata,
            comments,
            comments_count: totalComments
        };

        const updated = await (prisma as any).post.update({
            where: { id: postId },
            data: { metadata: nextMetadata }
        });

        return { success: true, reply: newReply, metadata: updated?.metadata ?? nextMetadata };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}