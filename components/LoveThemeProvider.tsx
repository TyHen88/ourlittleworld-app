"use client";
import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

export function LoveThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider 
      attribute="class" 
      defaultTheme="light" 
      forcedTheme="light"
    >
      <div className="selection:bg-romantic-petal/30 min-h-screen">
        {children}
      </div>
    </NextThemesProvider>
  );
}
