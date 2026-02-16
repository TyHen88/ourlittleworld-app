"use client";
import React from "react";
import { CoupleFeedPost } from "@/components/love/CoupleFeedPost";
import { AddPostForm } from "@/components/love/AddPostForm";
import { Sparkles } from "lucide-react";

export default function FeedPage() {
    return (
        <div className="p-6 space-y-8 max-w-2xl mx-auto">
            <header className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                        Our Memories
                        <Sparkles className="text-romantic-heart h-5 w-5" />
                    </h1>
                    <p className="text-sm text-slate-400 font-medium tracking-tight">Every moment with you is a gift.</p>
                </div>
            </header>

            <AddPostForm />

            <section className="space-y-8 pt-4 pb-20">
                <CoupleFeedPost
                    author="My Forever"
                    content="Finally tried that new brunch spot! The pancakes were 10/10 but being with you was 100/10. 🥰🥞"
                    timestamp="Sun, 10:30 AM"
                    reactions={24}
                    comments={5}
                />

                <CoupleFeedPost
                    author="Me"
                    content="Found this old photo of our first date... How has it been 3 years already? Time flies when I'm with you. ❤️✨"
                    timestamp="Last Friday"
                    reactions={42}
                    comments={8}
                />
            </section>
        </div>
    );
}
