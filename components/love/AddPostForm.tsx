"use client";
import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Heart, Camera, Smile, Send, X, Image as ImageIcon, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { createPost } from "@/lib/actions/post";
import { createClient } from "@/utils/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useCouple } from "@/hooks/use-couple";
import { FullPageLoader } from "@/components/FullPageLoader";

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
    const queryClient = useQueryClient();
    const { user, couple } = useCouple();
    const [content, setContent] = useState("");
    const [previewImages, setPreviewImages] = useState<PreviewImage[]>([]);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);

    const MAX_CHARS = 500;
    const MAX_IMAGES = 10;

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

    const compressImage = async (file: File): Promise<File> => {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;

                    // Max dimensions
                    const MAX_WIDTH = 1920;
                    const MAX_HEIGHT = 1920;

                    if (width > height) {
                        if (width > MAX_WIDTH) {
                            height *= MAX_WIDTH / width;
                            width = MAX_WIDTH;
                        }
                    } else {
                        if (height > MAX_HEIGHT) {
                            width *= MAX_HEIGHT / height;
                            height = MAX_HEIGHT;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx?.drawImage(img, 0, 0, width, height);

                    canvas.toBlob((blob) => {
                        if (blob) {
                            const compressedFile = new File([blob], file.name, {
                                type: 'image/jpeg',
                                lastModified: Date.now(),
                            });
                            resolve(compressedFile);
                        } else {
                            resolve(file);
                        }
                    }, 'image/jpeg', 0.85);
                };
                img.src = e.target?.result as string;
            };
            reader.readAsDataURL(file);
        });
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);

        const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
        if (files.length === 0) return;

        await handleFiles(files);
    };

    const handleFiles = async (files: File[]) => {
        if (previewImages.length + files.length > MAX_IMAGES) {
            setError(`Maximum ${MAX_IMAGES} images allowed`);
            setTimeout(() => setError(null), 3000);
            return;
        }

        const makeId = () => {
            try {
                return crypto.randomUUID();
            } catch {
                return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
            }
        };

        const compressedFiles = await Promise.all(
            files.map(file => compressImage(file))
        );

        const next = compressedFiles.map((file) => ({
            id: makeId(),
            url: URL.createObjectURL(file),
            file,
        }));

        setPreviewImages((prev) => [...prev, ...next]);
    };

    const handlePaste = async (e: React.ClipboardEvent) => {
        const items = Array.from(e.clipboardData.items);
        const imageItems = items.filter(item => item.type.startsWith('image/'));

        if (imageItems.length > 0) {
            e.preventDefault();
            const files = await Promise.all(
                imageItems.map(item => item.getAsFile()).filter(Boolean) as File[]
            );
            await handleFiles(files);
        }
    };

    const insertEmoji = (emoji: string) => {
        setContent(prev => prev + emoji);
        setShowEmojiPicker(false);
    };

    const commonEmojis = ['❤️', '😍', '🥰', '😊', '😘', '💕', '💖', '✨', '🎉', '🌟', '💝', '🌹', '🎈', '🎁', '💑', '👫'];

    if (submitting && !embedded) {
        return <FullPageLoader />;
    }

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
                    previewImages.map(async (img, index) => {
                        setUploadProgress(Math.round(((index + 1) / previewImages.length) * 100));
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

            // Optimistic update - add post to cache immediately
            const optimisticPost = {
                id: `temp-${Date.now()}`,
                couple_id: couple?.id,
                author_id: user?.id,
                content: trimmed,
                image_url: imageUrls[0] || null,
                metadata: {
                    images: imageUrls,
                    likes: [],
                    likes_count: 0,
                    comments: [],
                    comments_count: 0,
                },
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                author: {
                    id: user?.id,
                    full_name: user?.user_metadata?.full_name || 'You',
                    avatar_url: user?.user_metadata?.avatar_url || null,
                },
            };

            if (couple?.id) {
                queryClient.setQueryData(['posts', couple.id], (old: any) => {
                    if (!old) return old;
                    return {
                        ...old,
                        pages: old.pages.map((page: any, idx: number) => {
                            if (idx === 0) {
                                return {
                                    ...page,
                                    data: [optimisticPost, ...page.data],
                                };
                            }
                            return page;
                        }),
                    };
                });
            }

            setContent("");
            clearPreviews();
            onSuccess?.();

            // Save to server in background
            const result = await createPost({
                content: trimmed,
                imageUrls,
            });

            if (!result?.success) {
                // Rollback on error
                if (couple?.id) {
                    queryClient.setQueryData(['posts', couple.id], (old: any) => {
                        if (!old) return old;
                        return {
                            ...old,
                            pages: old.pages.map((page: any, idx: number) => {
                                if (idx === 0) {
                                    return {
                                        ...page,
                                        data: page.data.filter((p: any) => p.id !== optimisticPost.id),
                                    };
                                }
                                return page;
                            }),
                        };
                    });
                }
                throw new Error(result?.error || 'Failed to create post');
            }

            // Replace temp post with real post from server
            if (couple?.id && result.data) {
                queryClient.setQueryData(['posts', couple.id], (old: any) => {
                    if (!old) return old;
                    return {
                        ...old,
                        pages: old.pages.map((page: any, idx: number) => {
                            if (idx === 0) {
                                return {
                                    ...page,
                                    data: page.data.map((p: any) =>
                                        p.id === optimisticPost.id ? { ...result.data, author: optimisticPost.author } : p
                                    ),
                                };
                            }
                            return page;
                        }),
                    };
                });

                // Update Recent Memory on dashboard
                queryClient.invalidateQueries({ queryKey: ['recent-posts', couple.id] });
            }
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
                <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={cn(
                        "relative transition-all",
                        isDragging && "ring-2 ring-romantic-heart rounded-3xl"
                    )}
                >
                    {embedded ? (
                        <div className="bg-slate-50/50 rounded-3xl p-4 border border-romantic-blush/20">
                            <textarea
                                value={content}
                                onChange={(e) => {
                                    if (e.target.value.length <= MAX_CHARS) {
                                        setContent(e.target.value);
                                    }
                                }}
                                onPaste={handlePaste}
                                placeholder="What's in your heart?"
                                className="w-full bg-transparent border-none outline-none text-slate-700 font-medium resize-none min-h-[90px]"
                            />
                            <div className="flex items-center justify-between mt-2">
                                <span className={cn(
                                    "text-xs font-medium",
                                    content.length > MAX_CHARS * 0.9 ? "text-red-500" : "text-slate-400"
                                )}>
                                    {content.length}/{MAX_CHARS}
                                </span>
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-button flex items-center justify-center text-white font-bold">
                                M
                            </div>
                            <div className="flex-1 bg-slate-50/50 rounded-2xl p-3 border border-romantic-blush/20">
                                <textarea
                                    value={content}
                                    onChange={(e) => {
                                        if (e.target.value.length <= MAX_CHARS) {
                                            setContent(e.target.value);
                                        }
                                    }}
                                    onPaste={handlePaste}
                                    placeholder="What's in your heart?"
                                    className="w-full bg-transparent border-none outline-none text-slate-700 font-medium resize-none min-h-[60px]"
                                />
                                <div className="flex items-center justify-end mt-1">
                                    <span className={cn(
                                        "text-xs font-medium",
                                        content.length > MAX_CHARS * 0.9 ? "text-red-500" : "text-slate-400"
                                    )}>
                                        {content.length}/{MAX_CHARS}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}

                    {isDragging && (
                        <div className="absolute inset-0 bg-romantic-heart/10 rounded-3xl flex items-center justify-center pointer-events-none">
                            <div className="text-center">
                                <ImageIcon className="mx-auto text-romantic-heart mb-2" size={48} />
                                <p className="text-romantic-heart font-bold">Drop images here</p>
                            </div>
                        </div>
                    )}
                </div>

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

                {submitting && uploadProgress > 0 && (
                    <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-600 font-medium">Uploading images...</span>
                            <span className="text-romantic-heart font-bold">{uploadProgress}%</span>
                        </div>
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <motion.div
                                className="h-full bg-gradient-to-r from-romantic-heart to-pink-500"
                                initial={{ width: 0 }}
                                animate={{ width: `${uploadProgress}%` }}
                                transition={{ duration: 0.3 }}
                            />
                        </div>
                    </div>
                )}

                <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center gap-2 relative">
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            multiple
                            className="hidden"
                            onChange={async (e) => {
                                const files = Array.from(e.target.files ?? []);
                                e.currentTarget.value = '';
                                if (files.length === 0) return;
                                await handleFiles(files);
                            }}
                        />

                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={previewImages.length >= MAX_IMAGES}
                            className="p-2.5 text-slate-400 hover:text-romantic-heart hover:bg-romantic-blush/20 rounded-full transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            title={`Add images (${previewImages.length}/${MAX_IMAGES})`}
                        >
                            <Camera size={22} />
                        </button>

                    </div>

                    <Button
                        disabled={submitting || (!content.trim() && previewImages.length === 0) || content.length > MAX_CHARS}
                        onClick={handleSubmit}
                        className="rounded-full px-8 bg-gradient-button text-white shadow-lg hover:shadow-xl transition-all border-none h-11"
                    >
                        {submitting ? (
                            <>
                                <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                                <span>Posting...</span>
                            </>
                        ) : (
                            <>
                                <span>Post</span>
                                <Send className="ml-2 w-4 h-4" />
                            </>
                        )}
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
