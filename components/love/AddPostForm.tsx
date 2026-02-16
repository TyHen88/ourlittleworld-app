"use client";
import React, { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Heart, Camera, Smile, Send, X } from "lucide-react";

export function AddPostForm() {
    const [content, setContent] = useState("");
    const [imagePreview, setImagePreview] = useState<string | null>(null);

    return (
        <Card className="p-4 border-none shadow-xl bg-white/70 backdrop-blur-md rounded-4xl">
            <div className="space-y-4">
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

                {imagePreview && (
                    <div className="relative aspect-video w-full rounded-3xl bg-romantic-blush/20 overflow-hidden">
                        <img src="/placeholder-love.jpg" alt="Preview" className="w-full h-full object-cover" />
                        <button
                            onClick={() => setImagePreview(null)}
                            className="absolute top-2 right-2 p-1.5 bg-black/40 text-white rounded-full hover:bg-black/60 backdrop-blur-sm"
                        >
                            <X size={16} />
                        </button>
                    </div>
                )}

                <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center gap-2">
                        <button className="p-2.5 text-slate-400 hover:text-romantic-heart hover:bg-romantic-blush/20 rounded-full transition-all">
                            <Camera size={22} />
                        </button>
                        <button className="p-2.5 text-slate-400 hover:text-romantic-heart hover:bg-romantic-blush/20 rounded-full transition-all">
                            <Smile size={22} />
                        </button>
                    </div>

                    <Button
                        disabled={!content.trim() && !imagePreview}
                        className="rounded-full px-8 bg-gradient-button text-white shadow-lg hover:shadow-xl transition-all border-none h-11"
                    >
                        <span>Post</span>
                        <Send className="ml-2 w-4 h-4" />
                    </Button>
                </div>
            </div>
        </Card>
    );
}
