"use client";

import { Fragment, useMemo } from "react";
import type { LucideIcon } from "lucide-react";
import {
    ExternalLink,
    Facebook,
    Globe,
    Instagram,
    Music2,
    Send,
    Twitter,
    Youtube,
} from "lucide-react";

import { cn } from "@/lib/utils";

type RichTextContentProps = {
    text: string;
    tone?: "light" | "dark";
    className?: string;
    previewListClassName?: string;
};

type ParsedToken =
    | {
        type: "text";
        value: string;
    }
    | {
        type: "url";
        value: string;
        href: string;
    }
    | {
        type: "phone";
        value: string;
        href: string;
    };

type LinkPreviewPlatform = {
    label: string;
    icon: LucideIcon;
    chipClassName: string;
};

const DETECTABLE_PATTERN = /((?:https?:\/\/|www\.)[^\s<]+)|((?:\+?\d[\d\s().-]{6,}\d))/g;

function stripTrailingPunctuation(value: string) {
    let core = value;
    let trailing = "";

    while (/[.,!?;:]+$/.test(core)) {
        trailing = core.slice(-1) + trailing;
        core = core.slice(0, -1);
    }

    return { core, trailing };
}

function normalizeUrl(raw: string) {
    const { core } = stripTrailingPunctuation(raw);
    const href = core.startsWith("http://") || core.startsWith("https://") ? core : `https://${core}`;

    try {
        const url = new URL(href);
        return url.toString();
    } catch {
        return null;
    }
}

function normalizePhoneHref(raw: string) {
    const { core } = stripTrailingPunctuation(raw);
    const digits = core.replace(/\D/g, "");

    if (digits.length < 8 || digits.length > 15) {
        return null;
    }

    const hasPlusPrefix = core.trim().startsWith("+");
    return `tel:${hasPlusPrefix ? "+" : ""}${digits}`;
}

function parseRichText(text: string) {
    const tokens: ParsedToken[] = [];
    let cursor = 0;

    for (const match of text.matchAll(DETECTABLE_PATTERN)) {
        const rawMatch = match[0];
        const matchIndex = match.index ?? 0;

        if (matchIndex > cursor) {
            tokens.push({
                type: "text",
                value: text.slice(cursor, matchIndex),
            });
        }

        if (match[1]) {
            const normalizedUrl = normalizeUrl(rawMatch);
            if (normalizedUrl) {
                const { core, trailing } = stripTrailingPunctuation(rawMatch);
                tokens.push({
                    type: "url",
                    value: core,
                    href: normalizedUrl,
                });
                if (trailing) {
                    tokens.push({
                        type: "text",
                        value: trailing,
                    });
                }
            } else {
                tokens.push({
                    type: "text",
                    value: rawMatch,
                });
            }
        } else if (match[2]) {
            const phoneHref = normalizePhoneHref(rawMatch);
            if (phoneHref) {
                const { core, trailing } = stripTrailingPunctuation(rawMatch);
                tokens.push({
                    type: "phone",
                    value: core,
                    href: phoneHref,
                });
                if (trailing) {
                    tokens.push({
                        type: "text",
                        value: trailing,
                    });
                }
            } else {
                tokens.push({
                    type: "text",
                    value: rawMatch,
                });
            }
        }

        cursor = matchIndex + rawMatch.length;
    }

    if (cursor < text.length) {
        tokens.push({
            type: "text",
            value: text.slice(cursor),
        });
    }

    return tokens;
}

function getPreviewPlatform(href: string): LinkPreviewPlatform {
    let hostname = "";

    try {
        hostname = new URL(href).hostname.toLowerCase();
    } catch {
        return {
            label: "Link",
            icon: Globe,
            chipClassName: "bg-slate-100 text-slate-700",
        };
    }

    if (hostname.includes("tiktok.com")) {
        return {
            label: "TikTok",
            icon: Music2,
            chipClassName: "bg-slate-900 text-white",
        };
    }

    if (hostname.includes("instagram.com") || hostname.includes("instagr.am")) {
        return {
            label: "Instagram",
            icon: Instagram,
            chipClassName: "bg-pink-100 text-pink-700",
        };
    }

    if (
        hostname.includes("facebook.com") ||
        hostname === "fb.com" ||
        hostname.endsWith(".fb.com") ||
        hostname === "fb.watch"
    ) {
        return {
            label: "Facebook",
            icon: Facebook,
            chipClassName: "bg-blue-100 text-blue-700",
        };
    }

    if (
        hostname.includes("x.com") ||
        hostname.includes("twitter.com") ||
        hostname === "t.co"
    ) {
        return {
            label: "X",
            icon: Twitter,
            chipClassName: "bg-slate-900 text-white",
        };
    }

    if (
        hostname === "t.me" ||
        hostname.includes("telegram.me") ||
        hostname.includes("telegram.org")
    ) {
        return {
            label: "Telegram",
            icon: Send,
            chipClassName: "bg-sky-100 text-sky-700",
        };
    }

    if (
        hostname.includes("youtube.com") ||
        hostname === "youtu.be" ||
        hostname.endsWith(".youtu.be")
    ) {
        return {
            label: "YouTube",
            icon: Youtube,
            chipClassName: "bg-red-100 text-red-700",
        };
    }

    return {
        label: "Link",
        icon: Globe,
        chipClassName: "bg-slate-100 text-slate-700",
    };
}

function formatPreviewLabel(href: string) {
    try {
        const url = new URL(href);
        const hostname = url.hostname.replace(/^www\./, "");
        const path = decodeURIComponent(url.pathname).replace(/\/$/, "");
        const condensedPath = path.length > 34 ? `${path.slice(0, 34)}...` : path;

        return condensedPath && condensedPath !== "/"
            ? `${hostname}${condensedPath}`
            : hostname;
    } catch {
        return href;
    }
}

export function RichTextContent({
    text,
    tone = "light",
    className,
    previewListClassName,
}: RichTextContentProps) {
    const tokens = useMemo(() => parseRichText(text), [text]);
    const previewUrls = useMemo(() => {
        const seen = new Set<string>();

        return tokens
            .filter((token): token is Extract<ParsedToken, { type: "url" }> => token.type === "url")
            .map((token) => token.href)
            .filter((href) => {
                if (seen.has(href)) {
                    return false;
                }

                seen.add(href);
                return true;
            })
            .slice(0, 3);
    }, [tokens]);

    if (!text.trim()) {
        return null;
    }

    const textLinkClassName =
        tone === "dark"
            ? "font-semibold text-white underline underline-offset-2 decoration-white/50 hover:text-white/80"
            : "font-semibold text-sky-700 underline underline-offset-2 decoration-sky-300 hover:text-sky-900";

    const phoneLinkClassName =
        tone === "dark"
            ? "font-semibold text-white underline underline-offset-2 decoration-white/45 hover:text-white/80"
            : "font-semibold text-emerald-700 underline underline-offset-2 decoration-emerald-300 hover:text-emerald-900";

    const previewCardClassName =
        tone === "dark"
            ? "border border-white/15 bg-white/10 text-white hover:bg-white/15"
            : "border border-slate-200 bg-white/90 text-slate-800 hover:border-slate-300";

    const previewMetaTextClassName =
        tone === "dark" ? "text-white/70" : "text-slate-500";

    return (
        <div className={cn(previewUrls.length > 0 && "space-y-2")}>
            <p className={cn("whitespace-pre-wrap break-words", className)}>
                {tokens.map((token, index) => {
                    if (token.type === "text") {
                        return <Fragment key={`text-${index}`}>{token.value}</Fragment>;
                    }

                    if (token.type === "phone") {
                        return (
                            <a
                                key={`phone-${index}`}
                                href={token.href}
                                className={cn(phoneLinkClassName, "break-all")}
                            >
                                {token.value}
                            </a>
                        );
                    }

                    return (
                        <a
                            key={`url-${index}`}
                            href={token.href}
                            target="_blank"
                            rel="noreferrer noopener"
                            className={cn(textLinkClassName, "break-all")}
                        >
                            {token.value}
                        </a>
                    );
                })}
            </p>

            {previewUrls.length > 0 ? (
                <div className={cn("space-y-2", previewListClassName)}>
                    {previewUrls.map((href) => {
                        const platform = getPreviewPlatform(href);
                        const Icon = platform.icon;

                        return (
                            <a
                                key={href}
                                href={href}
                                target="_blank"
                                rel="noreferrer noopener"
                                className={cn(
                                    "block rounded-2xl px-3.5 py-3 transition-colors",
                                    previewCardClassName,
                                )}
                            >
                                <div className="flex items-center gap-3">
                                    <div
                                        className={cn(
                                            "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl",
                                            platform.chipClassName,
                                        )}
                                    >
                                        <Icon size={18} />
                                    </div>

                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-bold">{platform.label}</span>
                                            <span className={cn("text-xs", previewMetaTextClassName)}>
                                                {new URL(href).hostname.replace(/^www\./, "")}
                                            </span>
                                        </div>
                                        <p className={cn("truncate text-xs", previewMetaTextClassName)}>
                                            {formatPreviewLabel(href)}
                                        </p>
                                    </div>

                                    <ExternalLink
                                        size={16}
                                        className={cn("shrink-0", previewMetaTextClassName)}
                                    />
                                </div>
                            </a>
                        );
                    })}
                </div>
            ) : null}
        </div>
    );
}
