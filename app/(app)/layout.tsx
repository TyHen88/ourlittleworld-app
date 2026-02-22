import React from "react";
import { BottomNav } from "./BottomNav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex flex-col min-h-[100dvh] bg-romantic-warm">
            <div className="flex-1 pb-24">
                {children}
            </div>

            {/* Modern Bottom Navigation */}
            <BottomNav />
        </div>
    );
}
