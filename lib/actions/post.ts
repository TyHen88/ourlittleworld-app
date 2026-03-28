"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getCachedUserOrThrow, getCachedUser } from "@/lib/auth-cache";
import { getCachedProfile } from "@/lib/db-utils";
import { Prisma } from "@prisma/client";
import { uploadFileToCloudinary } from "@/lib/cloudinary-upload";

type PostProfile = NonNullable<Awaited<ReturnType<typeof getCachedProfile>>>;
type PostAccessContext = {
    user: { id: string };
    profile: PostProfile;
    isSingle: boolean;
};

type CreatePostMetadata = Record<string, unknown> & {
    category?: string;
};

type StoredPostReply = {
    id: string;
    author_id: string;
    author_name: string;
    author_avatar: string | null;
    content: string;
    created_at: string;
};

type StoredPostComment = StoredPostReply & {
    replies: StoredPostReply[];
};

type StoredPostMetadata = Record<string, unknown> & {
    images?: string[];
    likes?: string[];
    likes_count?: number;
    comments?: StoredPostComment[];
    comments_count?: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getMetadataObject(value: Prisma.JsonValue | CreatePostMetadata | undefined | null): StoredPostMetadata {
    if (!isRecord(value)) {
        return {};
    }

    return { ...value } as StoredPostMetadata;
}

async function getPostAccessContext() {
    const user = await getCachedUserOrThrow();
    if (!user.id) throw new Error("User ID is missing");
    const actorUser = { ...user, id: user.id };

    const profile = await getCachedProfile(user.id);
    const isSingle = profile?.user_type === "SINGLE";

    if (!profile) {
        throw new Error("Profile not found");
    }

    if (!isSingle && !profile.couple_id) {
        throw new Error("No couple found");
    }

    return { user: actorUser, profile, isSingle } satisfies PostAccessContext;
}

async function getAuthorizedPost(postId: string, actor: Pick<PostAccessContext, "user" | "profile" | "isSingle">) {
    const post = await prisma.post.findUnique({
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
    metadata?: CreatePostMetadata;
}) {
    try {
        const { user, profile, isSingle } = await getPostAccessContext();
        const content = (input.content ?? "").trim();
        const normalizedCategory =
            typeof input.metadata?.category === "string" && input.metadata.category.trim()
                ? input.metadata.category.trim()
                : "Other";

        const imageUrls = Array.isArray(input.imageUrls) ? input.imageUrls.filter(Boolean) : [];
        if (!content && imageUrls.length === 0) {
            return { success: false, error: "Content or image is required" };
        }

        const baseMetadata = isRecord(input.metadata) ? input.metadata : undefined;
        const nextMetadata: StoredPostMetadata | undefined =
            baseMetadata || imageUrls.length > 0
                ? {
                    ...(baseMetadata ?? {}),
                    ...(imageUrls.length > 0 ? { images: imageUrls } : {}),
                    category: normalizedCategory,
                }
                : undefined;

        if (nextMetadata) {
            if (typeof nextMetadata.likes_count !== 'number') nextMetadata.likes_count = 0;
            if (typeof nextMetadata.comments_count !== 'number') nextMetadata.comments_count = 0;
        }

        const postData: Prisma.PostUncheckedCreateInput = {
            couple_id: isSingle ? null : (profile.couple_id ?? null),
            author_id: user.id,
            content,
            image_url: imageUrls[0] ?? null,
            category: normalizedCategory,
            ...(nextMetadata ? { metadata: nextMetadata as Prisma.InputJsonValue } : {}),
        };

        const data = await prisma.post.create({
            data: postData,
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
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "An unknown error occurred";
        return { success: false, error: message };
    }
}

export async function uploadPostImage(formData: FormData) {
    try {
        const user = await getCachedUser();
        if (!user || !user.id) {
            return { success: false, error: "Not authenticated" };
        }

        const file = formData.get("file");
        if (!(file instanceof File)) {
            return { success: false, error: "No file provided" };
        }

        const uploadResult = await uploadFileToCloudinary(file, {
            folder: "ourlittleworld/posts",
            public_id: `post-${user.id}-${Date.now()}-${crypto.randomUUID()}`,
            resource_type: "image",
            overwrite: false,
            transformation: [
                {
                    quality: "auto",
                    fetch_format: "auto",
                },
            ],
        });

        return { success: true, url: uploadResult.secure_url };
    } catch (error: unknown) {
        console.error("Post image upload error:", error);
        const message = error instanceof Error ? error.message : "An unknown error occurred";
        return { success: false, error: message };
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
    } catch (error: unknown) {
        console.error("Delete post error:", error);
        const message = error instanceof Error ? error.message : "An unknown error occurred";
        return { success: false, error: message };
    }
}

export async function toggleLikePost(postId: string) {
    try {
        const actor = await getPostAccessContext();
        const { user } = actor;
        const post = await getAuthorizedPost(postId, actor);

        const metadata = getMetadataObject(post.metadata);
        const likes = Array.isArray(metadata.likes)
            ? metadata.likes.filter((like): like is string => typeof like === "string")
            : [];
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

        await prisma.post.update({
            where: { id: postId },
            data: { metadata: nextMetadata as Prisma.InputJsonValue }
        });

        return { success: true, metadata: nextMetadata };
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "An unknown error occurred";
        return { success: false, error: message };
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

        const metadata = getMetadataObject(post.metadata);
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

        const totalComments = comments.reduce((acc, comment) => acc + 1 + comment.replies.length, 0);

        const nextMetadata = {
            ...metadata,
            comments,
            comments_count: totalComments
        };

        await prisma.post.update({
            where: { id: postId },
            data: { metadata: nextMetadata as Prisma.InputJsonValue }
        });

        return { success: true, comment: newComment, metadata: nextMetadata };
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "An unknown error occurred";
        return { success: false, error: message };
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

        const metadata = getMetadataObject(post.metadata);
        const comments = Array.isArray(metadata.comments) ? [...metadata.comments] : [];

        const commentIndex = comments.findIndex((comment) => comment.id === commentId);
        if (commentIndex === -1) return { success: false, error: "Comment not found" };

        const newReply: StoredPostReply = {
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

        const totalComments = comments.reduce((acc, comment) => acc + 1 + comment.replies.length, 0);

        const nextMetadata = {
            ...metadata,
            comments,
            comments_count: totalComments
        };

        await prisma.post.update({
            where: { id: postId },
            data: { metadata: nextMetadata as Prisma.InputJsonValue }
        });

        return { success: true, reply: newReply, metadata: nextMetadata };
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "An unknown error occurred";
        return { success: false, error: message };
    }
}
