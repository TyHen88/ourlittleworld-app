"use server";

import prisma from "@/lib/prisma";
import fs from "fs/promises";
import path from "path";
import { revalidatePath } from "next/cache";
import { getCachedUserOrThrow, getCachedUser } from "@/lib/auth-cache";
import { getCachedProfile } from "@/lib/db-utils";

async function getPostAccessContext() {
    const user = await getCachedUserOrThrow();
    if (!user.id) throw new Error("User ID is missing");

    const profile = await getCachedProfile(user.id);
    const isSingle = (profile as any)?.user_type === "SINGLE";

    if (!profile) {
        throw new Error("Profile not found");
    }

    if (!isSingle && !profile.couple_id) {
        throw new Error("No couple found");
    }

    return { user, profile, isSingle };
}

async function getAuthorizedPost(postId: string, actor: { user: any; profile: any; isSingle: boolean }) {
    const post: any = await prisma.post.findUnique({
        where: { id: postId },
        select: {
            id: true,
            metadata: true,
            couple_id: true,
            author_id: true,
            is_deleted: true,
        },
    });

    if (!post || post.is_deleted) {
        throw new Error("Post not found");
    }

    if (!actor.isSingle && post.couple_id !== actor.profile?.couple_id) {
        throw new Error("Post not found");
    }

    if (actor.isSingle && post.author_id !== actor.user.id) {
        throw new Error("Post not found");
    }

    return post;
}

export async function createPost(input: {
    content: string;
    imageUrls?: string[];
    metadata?: any;
}) {
    try {
        const { user, profile, isSingle } = await getPostAccessContext();
        const content = (input.content ?? "").trim();

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

        const data = await prisma.post.create({
            data: {
                couple_id: isSingle ? null : (profile?.couple_id ?? null),
                author_id: user.id,
                content,
                image_url: imageUrls[0] ?? null,
                category: input.metadata?.category || null,
                ...(nextMetadata ? { metadata: nextMetadata } : {}),
            } as any,
            include: {
                author: {
                    select: {
                        id: true,
                        full_name: true,
                        avatar_url: true,
                    },
                },
            },
        });

        revalidatePath("/feed");
        revalidatePath("/dashboard");
        return { success: true, data };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function uploadPostImage(formData: FormData) {
    try {
        const user = await getCachedUser();
        if (!user || !user.id) {
            return { success: false, error: "Not authenticated" };
        }

        const file = formData.get("file") as File;
        if (!file) return { success: false, error: "No file provided" };

        const fileExt = file.name.split('.').pop() || 'jpg';
        const fileName = `post-${user.id}-${Date.now()}-${Math.random().toString(16).slice(2)}.${fileExt}`;
        
        const buffer = Buffer.from(await file.arrayBuffer());
        const relativePath = `/uploads/${fileName}`;
        const absolutePath = path.join(process.cwd(), "public", "uploads", fileName);

        await fs.writeFile(absolutePath, buffer);

        return { success: true, url: relativePath };
    } catch (error: any) {
        console.error("Local post image upload error:", error);
        return { success: false, error: error.message };
    }
}

export async function deletePost(postId: string) {
    try {
        const { user } = await getPostAccessContext();

        const post = await prisma.post.findUnique({
            where: { id: postId },
            select: { author_id: true }
        });

        if (!post) throw new Error("Post not found");
        if (post.author_id !== user.id) throw new Error("Unauthorized to delete this post");

        await prisma.post.update({
            where: { id: postId },
            data: { is_deleted: true }
        });

        return { success: true, postId };
    } catch (error: any) {
        console.error("Delete post error:", error);
        return { success: false, error: error.message };
    }
}

export async function toggleLikePost(postId: string) {
    try {
        const actor = await getPostAccessContext();
        const { user } = actor;
        const post = await getAuthorizedPost(postId, actor);

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

        const updated = await prisma.post.update({
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
        const actor = await getPostAccessContext();
        const { user, profile } = actor;
        const post = await getAuthorizedPost(postId, actor);
        const trimmedContent = content.trim();

        if (!trimmedContent) {
            return { success: false, error: "Comment is required" };
        }

        const metadata = (post.metadata as any) || {};
        const comments = Array.isArray(metadata.comments) ? [...metadata.comments] : [];

        const newComment = {
            id: crypto.randomUUID(),
            author_id: user.id,
            author_name: profile?.full_name || "Someone",
            author_avatar: profile?.avatar_url || null,
            content: trimmedContent,
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

        const updated = await prisma.post.update({
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
        const actor = await getPostAccessContext();
        const { user, profile } = actor;
        const post = await getAuthorizedPost(postId, actor);
        const trimmedContent = content.trim();

        if (!trimmedContent) {
            return { success: false, error: "Reply is required" };
        }

        const metadata = (post.metadata as any) || {};
        const comments = Array.isArray(metadata.comments) ? [...metadata.comments] : [];

        const commentIndex = comments.findIndex((c: any) => c.id === commentId);
        if (commentIndex === -1) return { success: false, error: "Comment not found" };

        const newReply = {
            id: crypto.randomUUID(),
            author_id: user.id,
            author_name: profile?.full_name || "Someone",
            author_avatar: profile?.avatar_url || null,
            content: trimmedContent,
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

        const updated = await prisma.post.update({
            where: { id: postId },
            data: { metadata: nextMetadata }
        });

        return { success: true, reply: newReply, metadata: updated?.metadata ?? nextMetadata };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
