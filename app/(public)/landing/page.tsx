"use client";

import React, { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
    ArrowRight,
    Check,
    ChevronLeft,
    ChevronRight,
    Download,
    Home,
    MoreVertical,
    Plus,
    Share2,
    Smartphone,
    Sparkles,
    X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{
        outcome: "accepted" | "dismissed";
        platform?: string;
    }>;
}

type InstallPlatform = "ios" | "android" | "desktop";
type InstallIcon = "share" | "menu" | "plus" | "home" | "check" | "download";

interface InstallPreviewItem {
    active?: boolean;
    hint?: string;
    icon: InstallIcon;
    label: string;
}

interface InstallStep {
    description: string;
    eyebrow: string;
    note: string;
    previewItems: InstallPreviewItem[];
    previewLabel: string;
    title: string;
}

function getInstallSteps(platform: InstallPlatform, canPrompt: boolean): InstallStep[] {
    if (platform === "ios") {
        return [
            {
                eyebrow: "Step 1",
                title: "Open the Share menu in Safari",
                description: "Tap the Share button at the bottom of Safari to open the actions sheet.",
                note: "If Safari hides the toolbar, scroll slightly to make it appear again.",
                previewLabel: "Safari toolbar preview",
                previewItems: [
                    { icon: "home", label: "Page" },
                    { active: true, hint: "Tap this", icon: "share", label: "Share" },
                ],
            },
            {
                eyebrow: "Step 2",
                title: "Choose Add to Home Screen",
                description: "Scroll the actions sheet until you see Add to Home Screen, then tap it.",
                note: "It usually appears near options like Find on Page or Edit Actions.",
                previewLabel: "Share sheet preview",
                previewItems: [
                    { icon: "share", label: "Copy" },
                    { active: true, hint: "Select this row", icon: "plus", label: "Add to Home Screen" },
                    { icon: "home", label: "Bookmarks" },
                ],
            },
            {
                eyebrow: "Step 3",
                title: "Confirm the new home screen icon",
                description: "Tap Add in the top-right corner, then open Our Little World from your home screen.",
                note: "The app will launch without the normal browser bar after it is saved.",
                previewLabel: "Home screen preview",
                previewItems: [
                    { active: true, icon: "home", label: "Our Little World" },
                    { icon: "check", label: "Ready to open" },
                ],
            },
        ];
    }

    if (platform === "android") {
        return [
            {
                eyebrow: "Step 1",
                title: canPrompt ? "Open the install flow" : "Open the browser menu",
                description: canPrompt
                    ? "This browser can install the app directly. Continue through the guide to open the install prompt."
                    : "Tap the three-dot menu in your browser to find install options.",
                note: canPrompt
                    ? "Chrome and Edge usually show a native install sheet."
                    : "The menu is usually in the top-right corner.",
                previewLabel: canPrompt ? "Install prompt preview" : "Browser menu preview",
                previewItems: [
                    { icon: "home", label: "Browser" },
                    { active: true, hint: canPrompt ? "Ready to open" : "Tap the menu", icon: "menu", label: "More" },
                ],
            },
            {
                eyebrow: "Step 2",
                title: canPrompt ? "Choose Install" : "Tap Install app",
                description: canPrompt
                    ? "When the browser prompt opens, tap Install to add the app to your device."
                    : "In the browser menu, choose Install app or Add to Home screen.",
                note: "The wording depends on the browser, but the install action is the one you want.",
                previewLabel: "Install action preview",
                previewItems: [
                    { icon: "download", label: "Downloads" },
                    { active: true, hint: "Select this option", icon: "plus", label: "Install app" },
                    { icon: "home", label: "Bookmarks" },
                ],
            },
            {
                eyebrow: "Step 3",
                title: "Launch it from your home screen",
                description: "After the install finishes, open Our Little World like a normal app from your home screen.",
                note: "Your browser may also offer an Open button immediately after installation.",
                previewLabel: "App launcher preview",
                previewItems: [
                    { active: true, icon: "home", label: "Our Little World" },
                    { icon: "check", label: "Installed" },
                ],
            },
        ];
    }

    return [
        {
            eyebrow: "Step 1",
            title: "Open your browser menu",
            description: "Use the menu in your desktop browser to find the install option for this site.",
            note: "Chrome, Edge, and other Chromium browsers usually place it near the address bar or in the main menu.",
            previewLabel: "Desktop browser preview",
            previewItems: [
                { icon: "home", label: "Browser" },
                { active: true, hint: "Open menu", icon: "menu", label: "Menu" },
            ],
        },
        {
            eyebrow: "Step 2",
            title: canPrompt ? "Use the install prompt" : "Choose Install app",
            description: canPrompt
                ? "Continue and your browser will show the install prompt directly."
                : "Choose Install app or Add to Home screen from the browser menu.",
            note: "If your browser supports direct install, the final step below will open it for you.",
            previewLabel: "Install option preview",
            previewItems: [
                { icon: "download", label: "Downloads" },
                { active: true, hint: "Install this app", icon: "plus", label: "Install app" },
                { icon: "home", label: "Extensions" },
            ],
        },
        {
            eyebrow: "Step 3",
            title: "Pin and launch the app",
            description: "Confirm the install prompt, then open Our Little World from your app launcher or taskbar.",
            note: "The installed version feels more app-like and is easier to reopen.",
            previewLabel: "Installed app preview",
            previewItems: [
                { active: true, icon: "home", label: "Our Little World" },
                { icon: "check", label: "Installed" },
            ],
        },
    ];
}

function InstallStepIcon({ icon }: { icon: InstallIcon }) {
    switch (icon) {
        case "share":
            return <Share2 size={15} />;
        case "menu":
            return <MoreVertical size={15} />;
        case "plus":
            return <Plus size={15} />;
        case "check":
            return <Check size={15} />;
        case "download":
            return <Download size={15} />;
        case "home":
        default:
            return <Home size={15} />;
    }
}

function InstallPreview({
    platform,
    step,
}: {
    platform: InstallPlatform;
    step: InstallStep;
}) {
    const frameLabel = platform === "ios" ? "Safari" : platform === "android" ? "Chrome" : "Desktop browser";

    return (
        <div className="rounded-[2rem] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-3 shadow-[0_20px_60px_rgba(15,23,42,0.28)]">
            <div className="overflow-hidden rounded-[1.5rem] bg-[#fffaf7]">
                <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                    <div className="flex items-center gap-2">
                        <div className="grid grid-cols-3 gap-1">
                            <span className="size-2 rounded-full bg-rose-300" />
                            <span className="size-2 rounded-full bg-amber-300" />
                            <span className="size-2 rounded-full bg-emerald-300" />
                        </div>
                        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">
                            {frameLabel}
                        </p>
                    </div>
                    <div className="inline-flex items-center gap-1 rounded-full bg-romantic-blush/35 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-romantic-heart">
                        <Smartphone size={12} />
                        {step.previewLabel}
                    </div>
                </div>

                <div className="space-y-3 p-4">
                    <div className="rounded-[1.25rem] border border-dashed border-romantic-heart/20 bg-white px-4 py-3">
                        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
                            Action Preview
                        </p>
                        <p className="mt-1 text-sm font-bold text-slate-700">
                            {step.title}
                        </p>
                    </div>

                    <div className="space-y-2">
                        {step.previewItems.map((item, index) => (
                            <div
                                key={`${item.label}-${index}`}
                                className={cn(
                                    "flex items-center justify-between rounded-[1.15rem] border px-4 py-3 transition-colors",
                                    item.active
                                        ? "border-romantic-heart/30 bg-gradient-to-r from-romantic-blush/45 to-romantic-lavender/25 text-romantic-heart shadow-sm"
                                        : "border-slate-100 bg-slate-50/80 text-slate-500"
                                )}
                            >
                                <div className="flex items-center gap-3">
                                    <span
                                        className={cn(
                                            "inline-flex size-8 items-center justify-center rounded-full",
                                            item.active
                                                ? "bg-white text-romantic-heart"
                                                : "bg-white text-slate-400"
                                        )}
                                    >
                                        <InstallStepIcon icon={item.icon} />
                                    </span>
                                    <div>
                                        <p className="text-sm font-bold">
                                            {item.label}
                                        </p>
                                        {item.hint ? (
                                            <p className="text-[11px] font-medium opacity-75">
                                                {item.hint}
                                            </p>
                                        ) : null}
                                    </div>
                                </div>

                                {item.active ? (
                                    <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-romantic-heart">
                                        Focus
                                    </span>
                                ) : null}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function LandingPage() {
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [guideStep, setGuideStep] = useState(0);
    const [installPlatform, setInstallPlatform] = useState<InstallPlatform>("desktop");
    const [isGuideOpen, setIsGuideOpen] = useState(false);
    const [isInstallable, setIsInstallable] = useState(false);
    const [isStandalone, setIsStandalone] = useState(false);
    const router = useRouter();

    useEffect(() => {
        const updateClientState = () => {
            const userAgent = navigator.userAgent.toLowerCase();
            const nextPlatform = /iphone|ipad|ipod/.test(userAgent)
                ? "ios"
                : /android/.test(userAgent)
                    ? "android"
                    : "desktop";
            const standalone = window.matchMedia("(display-mode: standalone)").matches
                || Boolean((navigator as Navigator & { standalone?: boolean }).standalone);

            setInstallPlatform(nextPlatform);
            setIsStandalone(standalone);
        };

        const handleBeforeInstallPrompt = (event: Event) => {
            const promptEvent = event as BeforeInstallPromptEvent;
            promptEvent.preventDefault();
            setDeferredPrompt(promptEvent);
            setIsInstallable(true);
        };

        const handleInstalled = () => {
            setDeferredPrompt(null);
            setIsGuideOpen(false);
            setIsInstallable(false);
            setIsStandalone(true);
        };

        updateClientState();
        window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
        window.addEventListener("appinstalled", handleInstalled);

        return () => {
            window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
            window.removeEventListener("appinstalled", handleInstalled);
        };
    }, []);

    const installSteps = getInstallSteps(installPlatform, Boolean(deferredPrompt));
    const currentStep = installSteps[guideStep] ?? installSteps[0];
    const isLastStep = guideStep === installSteps.length - 1;

    const openInstallGuide = () => {
        setGuideStep(0);
        setIsGuideOpen(true);
    };

    const closeInstallGuide = () => {
        setIsGuideOpen(false);
    };

    const handleInstallPrompt = async () => {
        if (!deferredPrompt) {
            closeInstallGuide();
            return;
        }

        await deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;

        if (outcome === "accepted") {
            setDeferredPrompt(null);
            setIsGuideOpen(false);
            setIsInstallable(false);
        }
    };

    const handleGuidePrimaryAction = async () => {
        if (!isLastStep) {
            setGuideStep((current) => Math.min(current + 1, installSteps.length - 1));
            return;
        }

        if (deferredPrompt) {
            await handleInstallPrompt();
            return;
        }

        closeInstallGuide();
    };

    return (
        <>
            <div className="relative flex min-h-[100svh] flex-col overflow-x-hidden bg-[#FDFBF7]">
                <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-40">
                    <div className="absolute left-[-10%] top-[-10%] h-[60%] w-[60%] animate-pulse rounded-full bg-romantic-blush blur-[120px]" style={{ animationDuration: "8s" }} />
                    <div className="absolute bottom-[-10%] right-[-10%] h-[70%] w-[70%] animate-pulse rounded-full bg-romantic-lavender blur-[140px]" style={{ animationDuration: "12s", animationDelay: "1s" }} />
                    <div className="absolute right-[10%] top-[30%] h-[40%] w-[40%] animate-pulse rounded-full bg-romantic-petal/20 blur-[100px]" style={{ animationDuration: "10s", animationDelay: "2s" }} />
                    <div className="absolute bottom-[20%] left-[20%] h-[30%] w-[30%] animate-pulse rounded-full bg-romantic-mint/10 blur-[80px]" style={{ animationDuration: "15s" }} />
                </div>

                <div className="pointer-events-none absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03]" />

                <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 py-12">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.2 }}
                        className="max-w-2xl text-center"
                    >
                        <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-romantic-blush/30 px-4 py-2">
                            <span className="text-romantic-heart">❤️</span>
                            <span className="text-sm font-bold text-romantic-heart">Your Relationship, Beautifully Organized</span>
                        </div>

                        <h2 className="mb-4 text-4xl font-black leading-tight text-slate-800 text-balance md:text-6xl">
                            Your Love Story,
                            <span className="block bg-gradient-to-r from-romantic-heart to-romantic-lavender bg-clip-text text-transparent">
                                Beautifully Organized
                            </span>
                        </h2>

                        <p className="mx-auto mb-8 max-w-xl text-lg text-slate-600">
                            The private digital home where you share daily moods, track shared finances, plan future adventures, and celebrate your journey together.
                        </p>

                        {!isStandalone ? (
                            <div className="mx-auto hidden max-w-md rounded-[1.75rem] border border-white/70 bg-white/70 p-4 shadow-[0_18px_60px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:block">
                                <div className="flex items-start gap-3 text-left">
                                    <div className="rounded-2xl bg-romantic-blush/35 p-3 text-romantic-heart">
                                        <Sparkles size={18} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-black uppercase tracking-[0.18em] text-slate-400">
                                            Quick Install Guide
                                        </p>
                                        <p className="mt-1 text-sm font-semibold text-slate-600">
                                            Add Our Little World to your home screen in three small steps with a visual walkthrough.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ) : null}
                    </motion.div>
                </div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="relative z-10 flex flex-col items-center gap-3 px-6 pb-12"
                >
                    <div className="flex w-full max-w-md flex-col gap-2 sm:flex-row">
                        {!isStandalone ? (
                            <Button
                                onClick={openInstallGuide}
                                className="flex-1 rounded-full bg-gradient-button px-6 py-3 text-sm shadow-lg group"
                            >
                                <Download className="mr-2 group-hover:animate-bounce" size={16} />
                                {isInstallable ? "Install App" : "Add to Home Screen"}
                                <ArrowRight className="ml-2 transition-transform group-hover:translate-x-1" size={14} />
                            </Button>
                        ) : (
                            <div className="flex flex-1 items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 px-5 py-3 text-sm font-bold text-emerald-700">
                                <Check className="mr-2" size={16} />
                                Already on your home screen
                            </div>
                        )}

                        <Button
                            onClick={() => router.push("/register")}
                            variant="outline"
                            className="flex-1 rounded-full border-2 border-romantic-heart px-6 py-3 text-sm text-romantic-heart hover:bg-romantic-blush/20"
                        >
                            Get Started
                        </Button>
                    </div>

                    <Button
                        variant="ghost"
                        onClick={() => router.push("/login")}
                        className="text-sm text-slate-600 hover:text-romantic-heart"
                    >
                        Already have an account? Log in
                    </Button>
                </motion.div>
            </div>

            <AnimatePresence>
                {isGuideOpen ? (
                    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6">
                        <motion.button
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-slate-950/55 backdrop-blur-sm"
                            onClick={closeInstallGuide}
                        />

                        <motion.div
                            initial={{ opacity: 0, y: 48 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 48 }}
                            transition={{ type: "spring", damping: 24, stiffness: 260 }}
                            className="relative w-full overflow-hidden rounded-t-[2rem] bg-[#fffaf7] shadow-2xl sm:max-w-xl sm:rounded-[2rem]"
                        >
                            <div className="mx-auto mt-3 h-1.5 w-14 rounded-full bg-slate-200 sm:hidden" />

                            <div data-scroll-region="true" className="max-h-[90dvh] overflow-y-auto px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 sm:px-6 sm:pb-6">
                                <div className="mb-5 flex items-start justify-between gap-4">
                                    <div>
                                        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-romantic-heart">
                                            Install Guide
                                        </p>
                                        <h3 className="mt-1 text-xl font-black tracking-tight text-slate-800">
                                            Add Our Little World to your home screen
                                        </h3>
                                        <p className="mt-2 text-sm font-medium text-slate-500">
                                            Follow the preview, then use {installPlatform === "ios" ? "Safari" : "your browser"} to finish the install.
                                        </p>
                                    </div>

                                    <button
                                        onClick={closeInstallGuide}
                                        className="rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                                    >
                                        <X size={18} />
                                    </button>
                                </div>

                                <div className="mb-4 flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-2">
                                        {installSteps.map((step, index) => (
                                            <span
                                                key={step.title}
                                                className={cn(
                                                    "h-2 rounded-full transition-all",
                                                    index === guideStep
                                                        ? "w-8 bg-romantic-heart"
                                                        : "w-2 bg-romantic-blush/45"
                                                )}
                                            />
                                        ))}
                                    </div>

                                    <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                                        {guideStep + 1} / {installSteps.length}
                                    </span>
                                </div>

                                <InstallPreview
                                    platform={installPlatform}
                                    step={currentStep}
                                />

                                <div className="mt-5 space-y-2">
                                    <p className="text-[11px] font-black uppercase tracking-[0.18em] text-romantic-heart">
                                        {currentStep.eyebrow}
                                    </p>
                                    <h4 className="text-xl font-black tracking-tight text-slate-800">
                                        {currentStep.title}
                                    </h4>
                                    <p className="text-sm font-medium leading-6 text-slate-600">
                                        {currentStep.description}
                                    </p>
                                    <p className="rounded-2xl bg-white px-4 py-3 text-sm font-medium leading-6 text-slate-500 shadow-sm ring-1 ring-slate-100">
                                        {currentStep.note}
                                    </p>
                                </div>

                                <div className="mt-5 flex items-center gap-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => setGuideStep((current) => Math.max(current - 1, 0))}
                                        disabled={guideStep === 0}
                                        className="flex-1 rounded-full border-slate-200 text-slate-600"
                                    >
                                        <ChevronLeft className="mr-1" size={16} />
                                        Previous
                                    </Button>

                                    <Button
                                        type="button"
                                        onClick={() => void handleGuidePrimaryAction()}
                                        className="flex-1 rounded-full bg-gradient-button shadow-lg"
                                    >
                                        {isLastStep
                                            ? deferredPrompt
                                                ? "Open Install Prompt"
                                                : "Done"
                                            : "Next"}
                                        <ChevronRight className="ml-1" size={16} />
                                    </Button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                ) : null}
            </AnimatePresence>
        </>
    );
}
