"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Heart, MessageCircleHeart, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCoupleChat } from "@/hooks/use-couple-chat";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  COUPLE_CHAT_EVENT,
  getCoupleChatChannelName,
  type CoupleChatMessage,
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

export function CoupleMessenger({ user, profile, couple }: CoupleMessengerProps) {
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<CoupleChatMessage[]>([]);
  const [realtimeState, setRealtimeState] = useState("connecting");
  const [onlineCount, setOnlineCount] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isSingle = profile?.user_type === "SINGLE";
  const coupleId = couple?.id as string | undefined;
  const { data: history = [], isLoading } = useCoupleChat(coupleId);

  useEffect(() => {
    setMessages((currentMessages) => mergeMessages(currentMessages, history));
  }, [history]);

  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages.length]);

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

    const updateConnectionState = () => {
      setRealtimeState(client.connection.state);
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

    const handleMessage = (ablyMessage: {
      data:
        | CoupleChatMessage
        | {
            coupleId?: string;
            message?: CoupleChatMessage;
          };
    }) => {
      const nextMessage =
        "message" in ablyMessage.data
          ? ablyMessage.data.message
          : ablyMessage.data;

      if (!nextMessage) {
        return;
      }

      setMessages((currentMessages) =>
        mergeMessages(currentMessages, [nextMessage])
      );
    };

    const handlePresenceChange = () => {
      void refreshPresence();
    };

    updateConnectionState();
    client.connection.on(
      ["connecting", "connected", "disconnected", "suspended", "failed"],
      updateConnectionState
    );
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
      client.connection.off(
        ["connecting", "connected", "disconnected", "suspended", "failed"],
        updateConnectionState
      );
      client.connection.off("failed", handleConnectionFailure);
      client.connection.off("suspended", handleConnectionFailure);
      channel.unsubscribe(COUPLE_CHAT_EVENT, handleMessage);
      channel.presence.unsubscribe(handlePresenceChange);
      void channel.presence.leave();
    };
  }, [coupleId, isSingle, profile?.full_name, user.id, user.name]);

  const handleSend = async () => {
    const content = draft.trim();
    if (!content || sending || !coupleId) return;

    setSending(true);
    setError(null);

    try {
      const res = await fetch("/api/chat/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json?.error || "Failed to send message");
      }

      setDraft("");
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
              <AvatarFallback className="bg-romantic-blush text-romantic-heart font-bold">
                {profile?.full_name?.[0] || user?.name?.[0] || "Y"}
              </AvatarFallback>
            </Avatar>
            <Avatar className="h-11 w-11 border-4 border-white shadow-sm">
              <AvatarFallback className="bg-romantic-lavender text-slate-700 font-bold">
                {couple?.members?.find((member) => member.id !== user.id)?.full_name?.[0] || "P"}
              </AvatarFallback>
            </Avatar>
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Private Thread</p>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-black tracking-tight text-slate-800">
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
              {onlineCount > 1 ? "Your partner is online now." : "Just the two of you."}
            </p>
          </div>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex h-[58vh] min-h-[24rem] flex-col gap-4 overflow-y-auto bg-slate-50/70 px-4 py-5"
      >
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
            <h3 className="mt-4 text-lg font-black tracking-tight text-slate-800">Start your first message</h3>
            <p className="mt-2 max-w-sm text-sm text-slate-500">
              This space is private to your couple. Send a note, a reminder, or something sweet.
            </p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {messages.map((message) => {
              const isMine = message.author_id === user.id;
              const authorLabel = isMine
                ? "You"
                : message.author.full_name?.split(" ")[0] || "Partner";

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
                      "max-w-[82%] rounded-[1.6rem] px-4 py-3 shadow-sm ring-1 ring-transparent transition-shadow duration-300",
                      isMine
                        ? "rounded-br-md bg-gradient-button text-white shadow-romantic-heart/20"
                        : "rounded-bl-md border border-romantic-blush/30 bg-white text-slate-700 shadow-slate-200/70"
                    )}
                  >
                    <p className={cn("text-[11px] font-black uppercase tracking-[0.18em]", isMine ? "text-white/75" : "text-slate-400")}>
                      {authorLabel}
                    </p>
                    <p className={cn("mt-1 whitespace-pre-wrap text-sm leading-relaxed", isMine ? "text-white" : "text-slate-700")}>
                      {message.content}
                    </p>
                    <p className={cn("mt-2 text-[11px]", isMine ? "text-white/75" : "text-slate-400")}>
                      {new Date(message.created_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
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
        <div className="flex items-end gap-3">
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
            disabled={!draft.trim() || sending}
            className={cn(
              "flex h-12 w-12 items-center justify-center rounded-full text-white shadow-lg transition",
              draft.trim() && !sending
                ? "bg-gradient-button"
                : "cursor-not-allowed bg-slate-300"
            )}
          >
            <Send size={18} />
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

  return [...map.values()].sort(
    (left, right) =>
      new Date(left.created_at).getTime() - new Date(right.created_at).getTime()
  );
}
