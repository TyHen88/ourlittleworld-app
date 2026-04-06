"use client";

import React, { useEffect, useState } from "react";
import { MessageCircleHeart } from "lucide-react";
import { cn } from "@/lib/utils";
import { getCoupleChatChannelName } from "@/lib/chat";
import { getAblyRealtimeClient } from "@/lib/ably-client";
import { AppBackButton } from "@/components/navigation/AppBackButton";

interface ChatHeaderMember {
  id: string;
  full_name: string | null;
}

interface ChatHeaderCouple {
  id: string;
  couple_name: string | null;
  members: ChatHeaderMember[];
}

interface ChatHeaderProps {
  user: {
    id: string;
  };
  couple: ChatHeaderCouple | null;
}

export function ChatHeader({ user, couple }: ChatHeaderProps) {
  const [isPartnerOnline, setIsPartnerOnline] = useState(false);
  const partnerId =
    couple?.members.find((member) => member.id !== user.id)?.id ?? null;
  const partnerIsAvailable = !!couple?.id && !!partnerId && isPartnerOnline;

  useEffect(() => {
    if (!couple?.id || !partnerId) {
      return;
    }

    const client = getAblyRealtimeClient(user.id);
    if (!client) {
      return;
    }

    const channel = client.channels.get(getCoupleChatChannelName(couple.id));
    const connectionEvents = [
      "connecting",
      "connected",
      "disconnected",
      "suspended",
      "failed",
    ] as const;
    let isCancelled = false;

    const syncPresence = async () => {
      if (client.connection.state !== "connected") {
        if (!isCancelled) {
          setIsPartnerOnline(false);
        }
        return;
      }

      try {
        const members = await channel.presence.get();

        if (!isCancelled) {
          setIsPartnerOnline(
            members.some((member) => member.clientId === partnerId)
          );
        }
      } catch {
        if (!isCancelled) {
          setIsPartnerOnline(false);
        }
      }
    };

    const handlePresenceChange = () => {
      void syncPresence();
    };

    const handleConnectionState = () => {
      if (client.connection.state === "connected") {
        void syncPresence();
        return;
      }

      setIsPartnerOnline(false);
    };

    handleConnectionState();
    connectionEvents.forEach((event) => {
      client.connection.on(event, handleConnectionState);
    });
    void channel.presence.subscribe(handlePresenceChange);

    return () => {
      isCancelled = true;
      connectionEvents.forEach((event) => {
        client.connection.off(event, handleConnectionState);
      });
      channel.presence.unsubscribe(handlePresenceChange);
    };
  }, [couple?.id, partnerId, user.id]);

  return (
    <header className="mb-3 shrink-0 px-4 sm:mb-4 sm:px-6 md:px-0">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2.5">
          <AppBackButton
            fallbackHref="/dashboard"
          />
          <MessageCircleHeart
            className="mt-2 shrink-0 text-romantic-heart"
            size={24}
          />
          <h1 className="mt-2 truncate text-xl font-black tracking-tighter text-slate-800">
            {couple?.couple_name || "Couple Chat"}
          </h1>
        </div>

        <p className="mt-1 flex shrink-0 items-center gap-2 text-xs font-semibold text-slate-500">
          <span
            className={cn(
              "inline-block h-2 w-2 rounded-full",
              partnerIsAvailable ? "bg-emerald-500" : "bg-slate-300"
            )}
          />
          {partnerIsAvailable ? "Online" : "Offline"}
        </p>
      </div>
    </header>
  );
}
