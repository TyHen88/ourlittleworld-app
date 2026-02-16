"use client";
import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Heart, Camera, Smile, Send, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { createPost } from "@/lib/actions/post";
import { createClient } from "@/utils/supabase/client";

interface AddPostFormProps {
    embedded?: boolean;
    className?: string;
    onSuccess?: () => void;
}

type PreviewImage = {
    id: string;
    url: string;
    file: File;
};

export function AddPostForm({ embedded = false, className, onSuccess }: AddPostFormProps) {
    const [content, setContent] = useState("");
    const [previewImages, setPreviewImages] = useState<PreviewImage[]>([]);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const previewImagesRef = useRef<PreviewImage[]>([]);

    useEffect(() => {
        previewImagesRef.current = previewImages;
    }, [previewImages]);

    useEffect(() => {
        return () => {
            for (const img of previewImagesRef.current) {
                URL.revokeObjectURL(img.url);
            }
        };
    }, []);

    const clearPreviews = () => {
        setPreviewImages((prev) => {
            for (const img of prev) URL.revokeObjectURL(img.url);
            return [];
        });
    };

    const handleSubmit = async () => {
        if (submitting) return;
        setError(null);
        setSubmitting(true);

        try {
            const trimmed = content.trim();
            let imageUrls: string[] = [];

            if (previewImages.length > 0) {
                const supabase = createClient();
                const { data: { user }, error: userError } = await supabase.auth.getUser();
                if (userError || !user) throw new Error('Not authenticated');

                const bucket = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET || 'couple-assets';

                const makeId = () => {
                    try {
                        return crypto.randomUUID();
                    } catch {
                        return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
                    }
                };

                const uploadedUrls = await Promise.all(
                    previewImages.map(async (img) => {
                        const fileExt = img.file.name.split('.').pop();
                        const fileName = `${user.id}-${Date.now()}-${makeId()}.${fileExt}`;
                        const filePath = `post-images/${fileName}`;

                        const { error: uploadError } = await supabase.storage
                            .from(bucket)
                            .upload(filePath, img.file, { cacheControl: '3600', upsert: false });

                        if (uploadError) {
                            const msg = (uploadError as any)?.message || '';
                            const statusCode = (uploadError as any)?.statusCode;
                            if (msg.toLowerCase().includes('bucket not found')) {
                                throw new Error(`Bucket not found: ${bucket}. Create it in Supabase Storage or set NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET to an existing bucket name.`);
                            }
                            if (
                                statusCode === 403 ||
                                statusCode === '403' ||
                                msg.toLowerCase().includes('row-level security') ||
                                msg.toLowerCase().includes('violates row-level security')
                            ) {
                                throw new Error(
                                    `Unauthorized to upload to Storage bucket: ${bucket}. This is a Supabase Storage RLS policy issue. Add an INSERT policy on storage.objects for bucket_id='${bucket}' for authenticated users.`
                                );
                            }
                            throw uploadError;
                        }

                        const { data: { publicUrl } } = supabase.storage
                            .from(bucket)
                            .getPublicUrl(filePath);

                        return publicUrl;
                    })
                );

                imageUrls = uploadedUrls.filter(Boolean);
            }

            const result = await createPost({
                content: trimmed,
                imageUrls,
            });

            if (!result?.success) throw new Error(result?.error || 'Failed to create post');

            setContent("");
            clearPreviews();
            onSuccess?.();
        } catch (e: any) {
            setError(e?.message || 'Something went wrong');
        } finally {
            setSubmitting(false);
        }
    };

    const Container: any = embedded ? "div" : Card;

    return (
        <Container
            className={cn(
                embedded
                    ? "p-4"
                    : "p-4 border-none shadow-xl bg-white/70 backdrop-blur-md rounded-4xl",
                className
            )}
        >
            <div className="space-y-4">
                {embedded ? (
                    <div className="bg-slate-50/50 rounded-3xl p-4 border border-romantic-blush/20">
                        <textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder="What's in your heart?"
                            className="w-full bg-transparent border-none outline-none text-slate-700 font-medium resize-none min-h-[90px]"
                        />
                    </div>
                ) : (
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-button flex items-center justify-center text-white font-bold">
                            M
                        </div>
                        <div className="flex-1 bg-slate-50/50 rounded-2xl p-3 border border-romantic-blush/20">
                            <textarea
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                placeholder="What's in your heart?"
                                className="w-full bg-transparent border-none outline-none text-slate-700 font-medium resize-none min-h-[60px]"
                            />
                        </div>
                    </div>
                )}

                {previewImages.length > 0 && (
                    <div
                        className={cn(
                            "grid gap-3",
                            previewImages.length === 1 ? "grid-cols-1" : "grid-cols-2"
                        )}
                    >
                        {previewImages.map((img) => (
                            <div
                                key={img.id}
                                className={cn(
                                    "relative w-full rounded-3xl bg-romantic-blush/20 overflow-hidden",
                                    previewImages.length === 1 ? "aspect-video" : "aspect-square"
                                )}
                            >
                                <img src={img.url} alt="Preview" className="w-full h-full object-cover" />
                                <button
                                    type="button"
                                    onClick={() => {
                                        setPreviewImages((prev) => {
                                            const target = prev.find((p) => p.id === img.id);
                                            if (target) URL.revokeObjectURL(target.url);
                                            return prev.filter((p) => p.id !== img.id);
                                        });
                                    }}
                                    className="absolute top-2 right-2 p-1.5 bg-black/40 text-white rounded-full hover:bg-black/60 backdrop-blur-sm"
                                    aria-label="Remove image"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center gap-2">
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            multiple
                            className="hidden"
                            onChange={(e) => {
                                const files = Array.from(e.target.files ?? []);
                                e.currentTarget.value = '';
                                if (files.length === 0) return;

                                const makeId = () => {
                                    try {
                                        return crypto.randomUUID();
                                    } catch {
                                        return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
                                    }
                                };

                                const next = files.map((file) => ({
                                    id: makeId(),
                                    url: URL.createObjectURL(file),
                                    file,
                                }));

                                setPreviewImages((prev) => [...prev, ...next]);
                            }}
                        />

                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="p-2.5 text-slate-400 hover:text-romantic-heart hover:bg-romantic-blush/20 rounded-full transition-all"
                        >
                            <Camera size={22} />
                        </button>
                        <button type="button" className="p-2.5 text-slate-400 hover:text-romantic-heart hover:bg-romantic-blush/20 rounded-full transition-all">
                            <Smile size={22} />
                        </button>
                    </div>

                    <Button
                        disabled={submitting || (!content.trim() && previewImages.length === 0)}
                        onClick={handleSubmit}
                        className="rounded-full px-8 bg-gradient-button text-white shadow-lg hover:shadow-xl transition-all border-none h-11"
                    >
                        <span>{submitting ? "Posting..." : "Post"}</span>
                        <Send className="ml-2 w-4 h-4" />
                    </Button>
                </div>

                {error && (
                    <div className="text-xs text-red-500 font-medium tracking-tight">
                        {error}
                    </div>
                )}
            </div>
        </Container>
    );
}
