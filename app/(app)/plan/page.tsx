"use client";

import { AppBackButton } from "@/components/navigation/AppBackButton";

const Plan = () => {
    return (
        <div className="mx-auto max-w-2xl space-y-6 p-6 pb-32">
            <header className="flex items-center gap-3">
                <AppBackButton
                    fallbackHref="/dashboard"
                />
                <div>
                    <h1 className="text-xl font-black text-slate-800">Plan</h1>
                    <p className="text-sm text-slate-500">Plan tools and shared organization will live here.</p>
                </div>
            </header>
        </div>
    )
}

export default Plan
