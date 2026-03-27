import React from "react";
import { BottomNav } from "./BottomNav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex flex-col min-h-[100dvh] bg-romantic-warm">
            <div className="flex min-h-0 flex-1 flex-col pb-24">
                {children}
            </div>

            {/* Modern Bottom Navigation */}
            <BottomNav />
        </div>
    );
}
