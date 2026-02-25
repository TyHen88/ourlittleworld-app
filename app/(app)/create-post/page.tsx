"use client";
import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, X, Image as ImageIcon, Loader2, Tag, Smile, MapPin, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { createPost } from "@/lib/actions/post";
import { createClient } from "@/utils/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useCouple } from "@/hooks/use-couple";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

type PreviewImage = {
    id: string;
    url: string;
    file: File;
};

export default function CreatePostPage() {
    const queryClient = useQueryClient();
    const router = useRouter();
    const { user, profile, couple, isLoading } = useCouple();
    const [content, setContent] = useState("");
    const [previewImages, setPreviewImages] = useState<PreviewImage[]>([]);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const [taggedPartner, setTaggedPartner] = useState<boolean>(false);
    const [feeling, setFeeling] = useState<string | null>(null);
    const [location, setLocation] = useState<string>("");
    const [showFeelingPicker, setShowFeelingPicker] = useState<boolean>(false);
    const [showLocationDrawer, setShowLocationDrawer] = useState<boolean>(false);
    const [locationSearch, setLocationSearch] = useState("");

    // Sample locations - in production, this would come from an API
    const popularLocations = [
        { id: 1, name: "Home Sweet Home", icon: "🏠", category: "Home" },
        { id: 2, name: "Favorite Restaurant", icon: "🍽️", category: "Dining" },
        { id: 3, name: "Coffee Shop", icon: "☕", category: "Café" },
        { id: 4, name: "Park", icon: "🌳", category: "Outdoor" },
        { id: 5, name: "Beach", icon: "🏖️", category: "Outdoor" },
        { id: 6, name: "Cinema", icon: "🎬", category: "Entertainment" },
        { id: 7, name: "Shopping Mall", icon: "🛍️", category: "Shopping" },
        { id: 8, name: "Gym", icon: "💪", category: "Fitness" },
        { id: 9, name: "Library", icon: "📚", category: "Education" },
        { id: 10, name: "Museum", icon: "🏛️", category: "Culture" },
    ];

    const filteredLocations = popularLocations.filter(loc =>
        loc.name.toLowerCase().includes(locationSearch.toLowerCase()) ||
        loc.category.toLowerCase().includes(locationSearch.toLowerCase())
    );

    const MAX_CHARS = 500;
    const MAX_IMAGES = 10;

    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);
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

    useEffect(() => {
        if (!isLoading && !user) {
            router.push("/login");
        }
    }, [user, isLoading, router]);

    useEffect(() => {
        autoResizeTextarea();
    }, [content]);

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

    const autoResizeTextarea = () => {
        const el = textareaRef.current;
        if (!el) return;
        el.style.height = "0px";
        el.style.height = `${el.scrollHeight}px`;
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
                                throw new Error(`Bucket not found: ${bucket}`);
                            }
                            if (
                                statusCode === 403 ||
                                statusCode === '403' ||
                                msg.toLowerCase().includes('row-level security')
                            ) {
                                throw new Error(`Unauthorized to upload to Storage bucket: ${bucket}`);
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

            // Add tagged partner and other metadata
            const metadata: any = {
                images: imageUrls,
                likes: [],
                likes_count: 0,
                comments: [],
                comments_count: 0,
            };

            if (taggedPartner && couple?.members) {
                const partner = couple.members.find((m: any) => m.id !== user?.id);
                if (partner) {
                    metadata.tagged_users = [partner.id];
                }
            }

            if (feeling) {
                metadata.feeling = feeling;
            }

            if (location.trim()) {
                metadata.location = location.trim();
            }

            const result = await createPost({
                content: trimmed,
                imageUrls,
                metadata,
            });

            if (!result?.success) {
                throw new Error(result?.error || 'Failed to create post');
            }

            if (couple?.id) {
                queryClient.invalidateQueries({ queryKey: ['posts', couple.id] });
                queryClient.invalidateQueries({ queryKey: ['recent-posts', couple.id] });
            }

            router.push('/feed');
        } catch (e: any) {
            setError(e?.message || 'Something went wrong');
            setSubmitting(false);
        }
    };

    const partner = couple?.members?.find((m: any) => m.id !== user?.id);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gradient-love flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-romantic-heart" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-love">
            <div className="sticky top-0 z-20 bg-white/70 backdrop-blur-xl border-b border-romantic-blush/30">
                <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
                    <button
                        onClick={() => router.back()}
                        className="p-2 -ml-2 hover:bg-romantic-blush/30 rounded-full transition-colors"
                        aria-label="Close"
                        type="button"
                    >
                        <X size={22} className="text-slate-700" />
                    </button>
                    <h1 className="text-base font-black text-slate-800 tracking-tight">Create Memory</h1>
                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={submitting || (!content.trim() && previewImages.length === 0) || content.length > MAX_CHARS}
                        className={cn(
                            "flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-lg transition-colors",
                            submitting || (!content.trim() && previewImages.length === 0) || content.length > MAX_CHARS
                                ? "text-slate-300"
                                : "text-romantic-heart hover:bg-romantic-blush/40"
                        )}
                    >
                        <span>{submitting ? "Posting" : "Post"}</span>
                        <Send className="h-4 w-4" />
                    </button>
                </div>
            </div>

            <div className="max-w-2xl mx-auto px-4 pb-28">
                <div className="pt-4">
                    <div className="flex items-start gap-3">
                        <Avatar className="w-11 h-11">
                            <AvatarImage src={profile?.avatar_url || undefined} />
                            <AvatarFallback className="bg-gradient-button text-white font-bold">
                                {profile?.full_name?.charAt(0) || user?.email?.charAt(0).toUpperCase()}
                            </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                            <p className="font-bold text-slate-800 leading-tight">{profile?.full_name || "You"}</p>
                            <div className="mt-2 flex flex-wrap gap-2">
                                <button
                                    type="button"
                                    onClick={() => setTaggedPartner((v: boolean) => !v)}
                                    className={cn(
                                        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors bg-white/70 backdrop-blur",
                                        taggedPartner
                                            ? "border-romantic-heart/30 text-romantic-heart"
                                            : "border-romantic-blush/30 text-slate-700 hover:bg-romantic-blush/20"
                                    )}
                                >
                                    <Tag size={14} />
                                    <span>Tag People</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setShowFeelingPicker(true)}
                                    className={cn(
                                        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors bg-white/70 backdrop-blur",
                                        feeling
                                            ? "border-amber-200 text-amber-700"
                                            : "border-romantic-blush/30 text-slate-700 hover:bg-romantic-blush/20"
                                    )}
                                >
                                    <Smile size={14} />
                                    <span>{feeling ? `Feeling ${feeling.split(" ")[1]}` : "Feeling"}</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setShowLocationDrawer(true)}
                                    className={cn(
                                        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors bg-white/70 backdrop-blur",
                                        location
                                            ? "border-sky-200 text-sky-700"
                                            : "border-romantic-blush/30 text-slate-700 hover:bg-romantic-blush/20"
                                    )}
                                >
                                    <MapPin size={14} />
                                    <span>{location ? location : "Location"}</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={cn(
                        "mt-4 relative",
                        isDragging ? "bg-romantic-blush/20 rounded-2xl" : ""
                    )}
                >
                    <textarea
                        ref={textareaRef}
                        value={content}
                        onChange={(e) => {
                            if (e.target.value.length <= MAX_CHARS) {
                                setContent(e.target.value);
                                autoResizeTextarea();
                            }
                        }}
                        onPaste={handlePaste}
                        placeholder="What's on your mind?"
                        className="w-full bg-transparent border-none outline-none text-slate-800 font-medium resize-none min-h-[96px] text-[17px] leading-relaxed placeholder:text-slate-400"
                        autoFocus
                    />

                    {isDragging && (
                        <div className="absolute inset-0 bg-romantic-heart/10 rounded-2xl flex items-center justify-center pointer-events-none">
                            <div className="text-center">
                                <ImageIcon className="mx-auto text-romantic-heart mb-2" size={56} />
                                <p className="text-romantic-heart font-bold">Drop images here</p>
                            </div>
                        </div>
                    )}
                </div>

                <AnimatePresence mode="wait">
                    {previewImages.length > 0 && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="mt-1"
                        >
                            {previewImages.length === 1 ? (
                                <div className="relative -mx-4 w-[calc(100%+2rem)] bg-slate-100 overflow-hidden aspect-[4/3]">
                                    <img
                                        src={previewImages[0].url}
                                        alt="Preview"
                                        className="w-full h-full object-cover"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setPreviewImages((prev) => {
                                                const target = prev[0];
                                                if (target) URL.revokeObjectURL(target.url);
                                                return [];
                                            });
                                        }}
                                        className="absolute top-3 right-3 p-2 bg-black/60 text-white rounded-full hover:bg-black/80 backdrop-blur-sm transition-colors"
                                        aria-label="Remove image"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 gap-0.5 -mx-4 w-[calc(100%+2rem)]">
                                    {previewImages.map((img) => (
                                        <div
                                            key={img.id}
                                            className="relative w-full bg-slate-100 overflow-hidden aspect-square"
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
                                                className="absolute top-2 right-2 p-2 bg-black/60 text-white rounded-full hover:bg-black/80 backdrop-blur-sm transition-colors"
                                                aria-label="Remove image"
                                            >
                                                <X size={16} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                            <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
                                <span>{previewImages.length}/{MAX_IMAGES} photos</span>
                                <button
                                    type="button"
                                    onClick={clearPreviews}
                                    className="font-semibold hover:text-red-500 transition-colors"
                                >
                                    Clear all
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <AnimatePresence>
                    {submitting && uploadProgress > 0 && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="mt-3 bg-white/70 backdrop-blur rounded-2xl p-4 border border-romantic-blush/20"
                        >
                            <div className="flex items-center justify-between text-sm mb-2">
                                <span className="text-slate-600 font-medium">Uploading...</span>
                                <span className="text-romantic-heart font-bold">{uploadProgress}%</span>
                            </div>
                            <div className="h-2 bg-romantic-warm/40 rounded-full overflow-hidden">
                                <motion.div
                                    className="h-full bg-gradient-to-r from-romantic-heart to-pink-500"
                                    initial={{ width: 0 }}
                                    animate={{ width: `${uploadProgress}%` }}
                                    transition={{ duration: 0.25, ease: "easeOut" }}
                                />
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <AnimatePresence>
                    {error && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="mt-3 bg-red-50 border border-red-200 rounded-2xl p-4"
                        >
                            <p className="text-sm text-red-600 font-medium">{error}</p>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Bottom options sheet (Facebook-style) */}
            <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t border-romantic-blush/30 rounded-t-3xl">
                <div className="max-w-2xl mx-auto">
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={async (e) => {
                            const files = Array.from(e.target.files ?? []);
                            e.currentTarget.value = "";
                            if (files.length === 0) return;
                            await handleFiles(files);
                        }}
                    />
                    <div className="divide-y divide-romantic-blush/20">
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={previewImages.length >= MAX_IMAGES}
                            className="w-full flex items-center gap-3 px-4 py-4 text-left disabled:opacity-50 hover:bg-romantic-blush/10 transition-colors"
                        >
                            <Camera size={18} className="text-slate-700" />
                            <span className="text-sm font-semibold text-slate-900">Photo / Videos</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setShowFeelingPicker(true)}
                            className="w-full flex items-center gap-3 px-4 py-4 text-left hover:bg-romantic-blush/10 transition-colors"
                        >
                            <Smile size={18} className="text-slate-700" />
                            <span className="text-sm font-semibold text-slate-900">Feeling / Activity</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setShowLocationDrawer(true)}
                            className="w-full flex items-center gap-3 px-4 py-4 text-left hover:bg-romantic-blush/10 transition-colors"
                        >
                            <MapPin size={18} className="text-slate-700" />
                            <span className="text-sm font-semibold text-slate-900">Location</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Feeling Picker Modal */}
            <AnimatePresence>
                {showFeelingPicker && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50"
                    >
                        <div
                            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                            onClick={() => setShowFeelingPicker(false)}
                        />
                        <div className="absolute left-0 right-0 bottom-0 max-w-2xl mx-auto">
                            <motion.div
                                initial={{ y: 40, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                exit={{ y: 40, opacity: 0 }}
                                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                className="bg-white rounded-t-3xl p-4 border border-slate-200 shadow-2xl"
                            >
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="font-bold text-slate-900">How are you feeling?</h3>
                                    <button
                                        type="button"
                                        onClick={() => setShowFeelingPicker(false)}
                                        className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                                    >
                                        <X size={18} className="text-slate-700" />
                                    </button>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    {[
                                        "❤️ loved", "😊 happy", "🥰 blessed", "😍 in love",
                                        "🎉 excited", "😌 grateful", "🤗 thankful", "💕 romantic",
                                        "✨ amazing", "🌟 wonderful", "💖 adored", "🥳 celebrating"
                                    ].map((f) => (
                                        <button
                                            key={f}
                                            type="button"
                                            onClick={() => {
                                                setFeeling(f);
                                                setShowFeelingPicker(false);
                                            }}
                                            className="flex items-center gap-2 p-3 rounded-2xl hover:bg-romantic-blush/20 transition-colors text-left"
                                        >
                                            <span className="text-2xl">{f.split(" ")[0]}</span>
                                            <span className="text-sm font-semibold text-slate-800 capitalize">{f.split(" ")[1]}</span>
                                        </button>
                                    ))}
                                </div>
                            </motion.div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Location Drawer */}
            <AnimatePresence>
                {showLocationDrawer && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowLocationDrawer(false)}
                            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
                        />
                        <motion.div
                            initial={{ y: "100%" }}
                            animate={{ y: 0 }}
                            exit={{ y: "100%" }}
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                            className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl z-50 max-h-[80vh] overflow-hidden"
                        >
                            <div className="max-w-2xl mx-auto p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-xl font-bold text-slate-900">Add Location</h3>
                                    <button
                                        type="button"
                                        onClick={() => setShowLocationDrawer(false)}
                                        className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                                    >
                                        <X size={20} className="text-slate-700" />
                                    </button>
                                </div>

                                <div className="relative mb-4">
                                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                    <input
                                        type="text"
                                        value={locationSearch}
                                        onChange={(e) => setLocationSearch(e.target.value)}
                                        placeholder="Search locations"
                                        className="w-full pl-9 pr-4 py-3 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-romantic-heart/20 focus:border-romantic-heart"
                                    />
                                </div>

                                <div className="overflow-y-auto max-h-[50vh] space-y-1">
                                    {filteredLocations.length > 0 ? (
                                        filteredLocations.map((loc) => (
                                            <button
                                                key={loc.id}
                                                type="button"
                                                onClick={() => {
                                                    setLocation(loc.name);
                                                    setShowLocationDrawer(false);
                                                    setLocationSearch("");
                                                }}
                                                className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-slate-50 transition-colors text-left"
                                            >
                                                <span className="text-2xl">{loc.icon}</span>
                                                <div className="flex-1">
                                                    <p className="font-semibold text-slate-900">{loc.name}</p>
                                                    <p className="text-xs text-slate-500">{loc.category}</p>
                                                </div>
                                            </button>
                                        ))
                                    ) : (
                                        <div className="text-center py-10">
                                            <p className="text-slate-500">No locations found</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}
