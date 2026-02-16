"use server";

import prisma from "@/lib/prisma";
import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

export async function createPost(input: {
    content: string;
    imageUrls?: string[];
    metadata?: any;
}) {
    try {
        const supabase = await createClient();

        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
            return { success: false, error: "Not authenticated" };
        }

        const content = (input.content ?? "").trim();

        const profile = await prisma.profile.findUnique({
            where: { id: user.id },
            select: { couple_id: true }
        });

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
                ...(nextMetadata ? { metadata: nextMetadata } : {}),
            }
        });

        revalidatePath('/feed');
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