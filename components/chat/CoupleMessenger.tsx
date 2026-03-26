"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import {
  Heart,
  Image as ImageIcon,
  LoaderCircle,
  MessageCircleHeart,
  Send,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCoupleChat } from "@/hooks/use-couple-chat";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  COUPLE_CHAT_EVENT,
  getCoupleChatChannelName,
  type CoupleChatMessage,
  type CoupleChatSticker,
} from "@/lib/chat";
import { getAblyRealtimeClient } from "@/lib/ably-client";

interface CoupleMember {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
}

interface CoupleThread {
  id: string;
  couple_name: string | null;
  members: CoupleMember[];
}

interface ChatProfile {
  user_type: string;
  full_name: string | null;
}

interface CoupleMessengerProps {
  user: {
    id: string;
    name?: string | null;
  };
  profile: ChatProfile | null;
  couple: CoupleThread | null;
}

const MAX_PENDING_IMAGES = 4;

export function CoupleMessenger({ user, profile, couple }: CoupleMessengerProps) {
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<CoupleChatMessage[]>([]);
  const [realtimeState, setRealtimeState] = useState("connecting");
  const [onlineCount, setOnlineCount] = useState(0);
  const [pendingImages, setPendingImages] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const autoScrollRef = useRef(true);
  const previousScrollHeightRef = useRef<number | null>(null);
  const isSingle = profile?.user_type === "SINGLE";
  const coupleId = couple?.id as string | undefined;
  const partner = couple?.members?.find((member) => member.id !== user.id) ?? null;
  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useCoupleChat(coupleId);
  const canSend =
    !!coupleId &&
    !sending &&
    !uploadingImage &&
    (draft.trim().length > 0 || pendingImages.length > 0);

  useEffect(() => {
    const historyMessages = data?.pages.flatMap((page) => page.data) ?? [];
    setMessages((currentMessages) => mergeMessages(currentMessages, historyMessages));
  }, [data?.pages]);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) {
      return;
    }

    if (previousScrollHeightRef.current !== null) {
      const previousScrollHeight = previousScrollHeightRef.current;
      previousScrollHeightRef.current = null;
      container.scrollTop = container.scrollHeight - previousScrollHeight;
      return;
    }

    if (autoScrollRef.current) {
      container.scrollTop = container.scrollHeight;
      autoScrollRef.current = false;
    }
  }, [messages]);

  useEffect(() => {
    if (!coupleId || isSingle) {
      return;
    }

    const client = getAblyRealtimeClient(user.id);
    if (!client) {
      setRealtimeState("unavailable");
      return;
    }

    const channelName = getCoupleChatChannelName(coupleId);
    const channel = client.channels.get(channelName);
    const connectionEvents = [
      "connecting",
      "connected",
      "disconnected",
      "suspended",
      "failed",
    ] as const;

    const updateConnectionState = () => {
      setRealtimeState(client.connection.state);
      if (client.connection.state === "connected") {
        setError(null);
      }
    };

    const handleConnectionFailure = (stateChange: {
      reason?: { message?: string };
    }) => {
      setRealtimeState(client.connection.state);
      setError(stateChange.reason?.message || "Realtime connection failed");
    };

    const refreshPresence = async () => {
      try {
        const members = await channel.presence.get();
        setOnlineCount(new Set(members.map((member) => member.clientId)).size);
      } catch {
        setOnlineCount(0);
      }
    };

    const handleMessage = (ablyMessage: { data?: unknown }) => {
      const nextMessage = extractRealtimeChatMessage(ablyMessage.data);

      if (!nextMessage) {
        return;
      }

      if (isNearBottom(scrollRef.current) || nextMessage.author_id === user.id) {
        autoScrollRef.current = true;
      }

      setMessages((currentMessages) =>
        mergeMessages(currentMessages, [nextMessage])
      );
    };

    const handlePresenceChange = () => {
      void refreshPresence();
    };

    updateConnectionState();
    connectionEvents.forEach((event) => {
      client.connection.on(event, updateConnectionState);
    });
    client.connection.on("failed", handleConnectionFailure);
    client.connection.on("suspended", handleConnectionFailure);

    void channel.subscribe(COUPLE_CHAT_EVENT, handleMessage);
    void channel.presence.subscribe(handlePresenceChange);

    void (async () => {
      try {
        await client.connection.whenState("connected");
        await channel.presence.enter({
          name: profile?.full_name || user.name || "User",
        });
        await refreshPresence();
      } catch {
        setRealtimeState("failed");
      }
    })();

    return () => {
      connectionEvents.forEach((event) => {
        client.connection.off(event, updateConnectionState);
      });
      client.connection.off("failed", handleConnectionFailure);
      client.connection.off("suspended", handleConnectionFailure);
      channel.unsubscribe(COUPLE_CHAT_EVENT, handleMessage);
      channel.presence.unsubscribe(handlePresenceChange);
      void channel.presence.leave();
    };
  }, [coupleId, isSingle, profile?.full_name, user.id, user.name]);

  const handleSend = async () => {
    const content = draft.trim();
    if (!canSend || !coupleId) {
      return;
    }

    setSending(true);
    setError(null);

    try {
      const res = await fetch("/api/chat/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content,
          imageUrls: pendingImages,
        }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json?.error || "Failed to send message");
      }

      autoScrollRef.current = true;
      setDraft("");
      setPendingImages([]);

      if (json?.data) {
        setMessages((currentMessages) =>
          mergeMessages(currentMessages, [json.data as CoupleChatMessage])
        );
      }
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []).slice(
      0,
      Math.max(MAX_PENDING_IMAGES - pendingImages.length, 0)
    );

    if (files.length === 0) {
      return;
    }

    setUploadingImage(true);
    setError(null);

    try {
      for (const file of files) {
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch("/api/chat/uploads", {
          method: "POST",
          body: formData,
        });

        const json = await response.json().catch(() => ({}));
        if (!response.ok || typeof json?.url !== "string") {
          throw new Error(json?.error || "Failed to upload image");
        }

        setPendingImages((currentImages) =>
          [...new Set([...currentImages, json.url])].slice(0, MAX_PENDING_IMAGES)
        );
      }
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Failed to upload image");
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleLoadOlder = async () => {
    if (!hasNextPage || isFetchingNextPage || !scrollRef.current) {
      return;
    }

    previousScrollHeightRef.current = scrollRef.current.scrollHeight;
    await fetchNextPage();
  };

  if (isSingle || !coupleId) {
    return (
      <div className="space-y-5">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="rounded-2xl bg-romantic-blush/30 p-3">
              <MessageCircleHeart className="text-romantic-heart" size={28} />
            </div>
            <div>
              <h2 className="text-xl font-black tracking-tight text-slate-800">Couple Messenger</h2>
              <p className="mt-2 text-sm text-slate-500">
                This chat is only available when your account is connected to a partner.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-[2rem] border border-dashed border-romantic-blush/40 bg-romantic-blush/10 p-6 text-center">
          <p className="text-sm font-medium text-slate-600">
            Connect your couple profile first, then this tab becomes your private messenger.
          </p>
          <Button asChild className="mt-4 rounded-full bg-gradient-button">
            <Link href="/onboarding">Connect With Partner</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white shadow-xl">
      <div className="border-b border-slate-100 bg-gradient-to-r from-romantic-blush/20 via-white to-romantic-lavender/20 px-6 py-5">
        <div className="flex items-center gap-4">
          <div className="flex -space-x-3">
            <Avatar className="h-11 w-11 border-4 border-white shadow-sm">
              <AvatarFallback className="bg-romantic-blush font-bold text-romantic-heart">
                {profile?.full_name?.[0] || user?.name?.[0] || "Y"}
              </AvatarFallback>
            </Avatar>
            <Avatar className="h-11 w-11 border-4 border-white shadow-sm">
              <AvatarFallback className="bg-romantic-lavender font-bold text-slate-700">
                {partner?.full_name?.[0] || "P"}
              </AvatarFallback>
            </Avatar>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">
              Private Thread
            </p>
            <div className="flex items-center gap-3">
              <h2 className="truncate text-xl font-black tracking-tight text-slate-800">
                {couple?.couple_name || "Couple Chat"}
              </h2>
              <span
                className={cn(
                  "rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.2em]",
                  realtimeState === "connected"
                    ? "bg-emerald-50 text-emerald-600"
                    : realtimeState === "connecting"
                      ? "bg-amber-50 text-amber-600"
                      : "bg-slate-100 text-slate-500"
                )}
              >
                {realtimeState === "connected" ? "Live" : realtimeState}
              </span>
            </div>
            <p className="text-sm text-slate-500">
              {onlineCount > 1
                ? `${partner?.full_name?.split(" ")[0] || "Your partner"} is online now.`
                : "Just the two of you."}
            </p>
          </div>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex h-[58vh] min-h-[24rem] flex-col gap-4 overflow-y-auto bg-slate-50/70 px-4 py-5"
      >
        {hasNextPage && (
          <div className="sticky top-0 z-10 flex justify-center">
            <button
              type="button"
              onClick={() => void handleLoadOlder()}
              disabled={isFetchingNextPage}
              className="rounded-full border border-slate-200 bg-white/95 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-slate-500 shadow-sm transition hover:border-romantic-blush/60 hover:text-romantic-heart disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isFetchingNextPage ? "Loading..." : "Load Older Messages"}
            </button>
          </div>
        )}

        {isLoading ? (
          Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className={cn(
                "max-w-[80%] rounded-[1.5rem] px-4 py-3 shadow-sm",
                index % 2 === 0 ? "self-end bg-white" : "self-start bg-romantic-blush/20"
              )}
            >
              <div className="h-3 w-24 animate-pulse rounded-full bg-slate-200" />
              <div className="mt-3 h-3 w-40 animate-pulse rounded-full bg-slate-200" />
            </div>
          ))
        ) : messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center px-6 text-center">
            <div className="rounded-full bg-romantic-blush/20 p-4">
              <Heart className="fill-romantic-heart text-romantic-heart" size={32} />
            </div>
            <h3 className="mt-4 text-lg font-black tracking-tight text-slate-800">
              Start your first message
            </h3>
            <p className="mt-2 max-w-sm text-sm text-slate-500">
              Send a note or a photo from your day.
            </p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {messages.map((message) => {
              const isMine = message.author_id === user.id;
              const authorLabel = isMine
                ? "You"
                : message.author.full_name?.split(" ")[0] || "Partner";
              const messageImages = getMessageImages(message);
              const sticker = message.metadata.sticker;
              const stickerOnly =
                !!sticker && messageImages.length === 0 && message.content.trim().length === 0;

              return (
                <motion.div
                  key={message.id}
                  layout="position"
                  initial={{
                    opacity: 0,
                    y: 12,
                    scale: 0.98,
                  }}
                  animate={{
                    opacity: 1,
                    y: 0,
                    scale: 1,
                  }}
                  exit={{
                    opacity: 0,
                    y: -8,
                  }}
                  transition={{
                    duration: 0.22,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  className={cn("flex", isMine ? "justify-end" : "justify-start")}
                >
                  <div
                    className={cn(
                      "max-w-[78%] overflow-hidden shadow-sm ring-1 ring-transparent transition-shadow duration-300",
                      stickerOnly
                        ? cn(
                            "rounded-[1.45rem] border px-3.5 py-2.5",
                            getStickerCardClass(sticker.theme, isMine)
                          )
                        : isMine
                          ? "rounded-[1.35rem] rounded-br-md bg-gradient-button px-3 py-2.5 text-white shadow-romantic-heart/20"
                          : "rounded-[1.35rem] rounded-bl-md border border-romantic-blush/30 bg-white px-3 py-2.5 text-slate-700 shadow-slate-200/70"
                    )}
                  >
                    <p
                      className={cn(
                        "text-[11px] font-semibold",
                        stickerOnly
                          ? "text-slate-500"
                          : isMine
                            ? "text-white/75"
                            : "text-slate-400"
                      )}
                    >
                      {authorLabel}
                    </p>

                    {sticker && (
                      <div
                        className={cn(
                          stickerOnly ? "mt-1.5 flex items-center gap-3" : "mt-1.5 rounded-[1rem] bg-white/15 p-2.5"
                        )}
                      >
                        <div className={cn("shrink-0", stickerOnly ? "text-4xl" : "text-3xl")}>
                          {sticker.emoji}
                        </div>
                        <div>
                          <p
                            className={cn(
                              "font-black tracking-tight",
                              stickerOnly ? "text-base text-slate-800" : isMine ? "text-sm text-white" : "text-sm text-slate-800"
                            )}
                          >
                            {sticker.label}
                          </p>
                          <p
                            className={cn(
                              "text-xs",
                              stickerOnly
                                ? "text-slate-500"
                                : isMine
                                  ? "text-white/75"
                                  : "text-slate-500"
                            )}
                          >
                            Sticker message
                          </p>
                        </div>
                      </div>
                    )}

                    {messageImages.length > 0 && (
                      <div
                        className={cn(
                          "mt-2 grid gap-2",
                          messageImages.length > 1 ? "grid-cols-2" : "grid-cols-1"
                        )}
                      >
                        {messageImages.map((imageUrl, index) => (
                          <a
                            key={`${message.id}-image-${index}`}
                            href={imageUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="overflow-hidden rounded-[1.25rem] border border-white/15 bg-white/10"
                          >
                            <Image
                              src={imageUrl}
                              alt={`Chat attachment ${index + 1}`}
                              width={720}
                              height={540}
                              className="h-48 w-full object-cover"
                            />
                          </a>
                        ))}
                      </div>
                    )}

                    {message.content.trim().length > 0 && (
                      <p
                        className={cn(
                          "whitespace-pre-wrap text-sm leading-relaxed",
                          sticker || messageImages.length > 0 ? "mt-1.5" : "mt-1",
                          isMine ? "text-white" : "text-slate-700"
                        )}
                      >
                        {message.content}
                      </p>
                    )}

                    <p
                      className={cn(
                        "mt-1.5 text-[11px]",
                        stickerOnly ? "text-slate-500" : isMine ? "text-white/75" : "text-slate-400"
                      )}
                    >
                      {new Date(message.created_at).toLocaleTimeString([], {
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>

      <div className="border-t border-slate-100 bg-white px-4 py-4">
        {error && (
          <p className="mb-3 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>
        )}

        <AnimatePresence initial={false}>
          {pendingImages.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="mb-3 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-3"
            >
              <div className="flex flex-wrap gap-3">
                {pendingImages.map((imageUrl) => (
                  <div
                    key={imageUrl}
                    className="relative h-20 w-20 overflow-hidden rounded-[1rem] border border-slate-200 bg-white"
                  >
                    <Image
                      src={imageUrl}
                      alt="Pending upload"
                      width={80}
                      height={80}
                      className="h-full w-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setPendingImages((currentImages) =>
                          currentImages.filter((currentImage) => currentImage !== imageUrl)
                        )
                      }
                      className="absolute right-1 top-1 rounded-full bg-black/70 p-1 text-white"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          multiple
          className="hidden"
          onChange={(event) => void handleFileSelect(event)}
        />

        <p className="mb-3 text-[11px] font-medium text-slate-400">
          {uploadingImage
            ? "Uploading image..."
            : pendingImages.length > 0
              ? `${pendingImages.length}/${MAX_PENDING_IMAGES} image${pendingImages.length > 1 ? "s" : ""} attached`
              : "Press Enter to send"}
        </p>

        <div className="flex items-end gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingImage || pendingImages.length >= MAX_PENDING_IMAGES}
            className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-[1.25rem] border border-slate-200 bg-slate-50 text-slate-500 transition hover:border-romantic-blush/70 hover:text-romantic-heart disabled:cursor-not-allowed disabled:opacity-60"
            aria-label="Add image"
          >
            {uploadingImage ? <LoaderCircle className="animate-spin" size={18} /> : <ImageIcon size={18} />}
          </button>
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void handleSend();
              }
            }}
            rows={1}
            placeholder="Message your partner..."
            className="min-h-[3.25rem] flex-1 resize-none rounded-[1.5rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-romantic-heart"
          />
          <button
            type="button"
            onClick={() => void handleSend()}
            disabled={!canSend}
            className={cn(
              "flex h-12 w-12 items-center justify-center rounded-full text-white shadow-lg transition",
              canSend
                ? "bg-gradient-button"
                : "cursor-not-allowed bg-slate-300"
            )}
          >
            {sending ? <LoaderCircle className="animate-spin" size={18} /> : <Send size={18} />}
          </button>
        </div>
      </div>
    </div>
  );
}

function mergeMessages(
  currentMessages: CoupleChatMessage[],
  incomingMessages: CoupleChatMessage[]
) {
  const map = new Map<string, CoupleChatMessage>();

  for (const message of currentMessages) {
    map.set(message.id, message);
  }

  for (const message of incomingMessages) {
    map.set(message.id, message);
  }

  return [...map.values()].sort((left, right) => {
    const dateDifference =
      new Date(left.created_at).getTime() - new Date(right.created_at).getTime();

    if (dateDifference !== 0) {
      return dateDifference;
    }

    return left.id.localeCompare(right.id);
  });
}

function getMessageImages(message: CoupleChatMessage) {
  if (message.metadata.images.length > 0) {
    return message.metadata.images;
  }

  if (message.image_url) {
    return [message.image_url];
  }

  return [];
}

function getStickerCardClass(
  theme: CoupleChatSticker["theme"],
  isMine: boolean
) {
  if (theme === "gold") {
    return isMine
      ? "border-amber-200 bg-gradient-to-br from-amber-100 to-rose-50"
      : "border-amber-200 bg-gradient-to-br from-amber-50 to-white";
  }

  if (theme === "sky") {
    return isMine
      ? "border-sky-200 bg-gradient-to-br from-sky-100 to-indigo-50"
      : "border-sky-200 bg-gradient-to-br from-sky-50 to-white";
  }

  if (theme === "mint") {
    return isMine
      ? "border-emerald-200 bg-gradient-to-br from-emerald-100 to-teal-50"
      : "border-emerald-200 bg-gradient-to-br from-emerald-50 to-white";
  }

  if (theme === "violet") {
    return isMine
      ? "border-violet-200 bg-gradient-to-br from-violet-100 to-fuchsia-50"
      : "border-violet-200 bg-gradient-to-br from-violet-50 to-white";
  }

  if (theme === "sunset") {
    return isMine
      ? "border-orange-200 bg-gradient-to-br from-orange-100 to-rose-50"
      : "border-orange-200 bg-gradient-to-br from-orange-50 to-white";
  }

  return isMine
    ? "border-rose-200 bg-gradient-to-br from-rose-100 to-pink-50"
    : "border-rose-200 bg-gradient-to-br from-rose-50 to-white";
}

function isNearBottom(container: HTMLDivElement | null) {
  if (!container) {
    return true;
  }

  return container.scrollHeight - container.scrollTop - container.clientHeight < 120;
}

function extractRealtimeChatMessage(data: unknown) {
  if (isCoupleChatMessage(data)) {
    return data;
  }

  if (
    typeof data === "object" &&
    data !== null &&
    "message" in data &&
    isCoupleChatMessage((data as { message?: unknown }).message)
  ) {
    return (data as { message: CoupleChatMessage }).message;
  }

  return null;
}

function isCoupleChatMessage(value: unknown): value is CoupleChatMessage {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Partial<CoupleChatMessage>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.author_id === "string" &&
    typeof candidate.content === "string" &&
    typeof candidate.created_at === "string" &&
    typeof candidate.updated_at === "string"
  );
}
