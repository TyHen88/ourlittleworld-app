"use client";

import React from "react";
import { Heart } from "lucide-react";

export function FullPageLoader() {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-t from-rose-50 to-white">

            <div className="relative mb-8">
                <Heart
                    className="text-rose-400 animate-spin-slow fill-current opacity-30"
                    size={90}
                />
                <Heart
                    className="absolute inset-0 text-rose-600 animate-heart-pulse fill-current"
                    size={90}
                />
            </div>

            <div className="h-1.5 w-48 bg-rose-100 rounded-full overflow-hidden">
                <div className="h-full w-1/3 bg-gradient-to-r from-rose-400 to-pink-500 rounded-full animate-loading-bar" />
            </div>

        </div>
    );
}
