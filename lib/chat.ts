export const COUPLE_CHAT_CATEGORY = "__COUPLE_CHAT__";
export const COUPLE_CHAT_EVENT = "message.created";
export const COUPLE_CHAT_MESSAGE_UPDATED_EVENT = "message.updated";

export type CoupleChatMessageType = "text" | "image" | "sticker" | "mixed";

export interface CoupleChatAuthor {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
}

export interface CoupleChatSticker {
  id: string;
  emoji: string;
  label: string;
  theme: "rose" | "gold" | "sky" | "mint" | "violet" | "sunset";
}

export interface CoupleChatReaction {
  emoji: string;
  user_ids: string[];
}

export interface CoupleChatMessageMetadata {
  type: CoupleChatMessageType;
  images: string[];
  sticker: CoupleChatSticker | null;
  reactions: CoupleChatReaction[];
}

export interface CoupleChatMessage {
  id: string;
  couple_id: string | null;
  author_id: string;
  content: string;
  image_url: string | null;
  metadata: CoupleChatMessageMetadata;
  created_at: string;
  updated_at: string;
  author: CoupleChatAuthor;
}

export interface CoupleChatMessageRecord {
  id: string;
  couple_id: string | null;
  author_id: string;
  content: string;
  image_url: string | null;
  metadata: unknown;
  created_at: Date;
  updated_at: Date;
  author: CoupleChatAuthor;
}

export const COUPLE_CHAT_STICKERS: CoupleChatSticker[] = [
  { id: "love-burst", emoji: "💖", label: "Love Burst", theme: "rose" },
  { id: "kiss-kiss", emoji: "😘", label: "Kiss Kiss", theme: "gold" },
  { id: "cozy-hug", emoji: "🤗", label: "Cozy Hug", theme: "mint" },
  { id: "miss-you", emoji: "🥹", label: "Miss You", theme: "sky" },
  { id: "date-night", emoji: "🥂", label: "Date Night", theme: "violet" },
  { id: "rose-drop", emoji: "🌹", label: "Rose Drop", theme: "sunset" },
];

export const COUPLE_CHAT_DEFAULT_REACTIONS = [
  "💋",
  "😾",
  "😛",
  "☺️",
  "🦦",
  "🙂",
] as const;

export function getCoupleChatChannelName(coupleId: string) {
  return `couple-chat:${coupleId}`;
}

export function getCoupleChatStickerById(stickerId: string | null | undefined) {
  if (!stickerId) {
    return null;
  }

  return (
    COUPLE_CHAT_STICKERS.find((sticker) => sticker.id === stickerId) ?? null
  );
}

export function resolveCoupleChatMessageType(input: {
  content: string;
  images: string[];
  sticker: CoupleChatSticker | null;
}): CoupleChatMessageType {
  const hasText = input.content.trim().length > 0;
  const hasImages = input.images.length > 0;
  const hasSticker = !!input.sticker;
  const richPayloadCount =
    Number(hasText) + Number(hasImages) + Number(hasSticker);

  if (hasSticker && !hasText && !hasImages) {
    return "sticker";
  }

  if (hasImages && !hasText && !hasSticker) {
    return "image";
  }

  if (richPayloadCount > 1) {
    return "mixed";
  }

  return "text";
}

export function normalizeCoupleChatMetadata(
  metadata: unknown,
  fallback?: {
    content?: string;
    image_url?: string | null;
  },
): CoupleChatMessageMetadata {
  const value = isRecord(metadata) ? metadata : {};
  const images = Array.isArray(value.images)
    ? value.images.filter(
        (image): image is string =>
          typeof image === "string" && image.length > 0,
      )
    : [];
  const sticker = isRecord(value.sticker)
    ? normalizeCoupleChatSticker(value.sticker)
    : null;
  const reactions = normalizeCoupleChatReactions(value.reactions);

  if (fallback?.image_url && !images.includes(fallback.image_url)) {
    images.unshift(fallback.image_url);
  }

  const type =
    value.type === "text" ||
    value.type === "image" ||
    value.type === "sticker" ||
    value.type === "mixed"
      ? value.type
      : resolveCoupleChatMessageType({
          content: fallback?.content ?? "",
          images,
          sticker,
        });

  return {
    type,
    images,
    sticker,
    reactions,
  };
}

export function serializeCoupleChatMessage(
  message: CoupleChatMessageRecord,
): CoupleChatMessage {
  const metadata = normalizeCoupleChatMetadata(message.metadata, {
    content: message.content,
    image_url: message.image_url,
  });

  return {
    id: message.id,
    couple_id: message.couple_id,
    author_id: message.author_id,
    content: message.content,
    image_url: message.image_url,
    metadata,
    created_at: message.created_at.toISOString(),
    updated_at: message.updated_at.toISOString(),
    author: {
      id: message.author.id,
      full_name: message.author.full_name,
      avatar_url: message.author.avatar_url,
    },
  };
}

function normalizeCoupleChatSticker(
  value: Record<string, unknown>,
): CoupleChatSticker | null {
  const stickerId = typeof value.id === "string" ? value.id : null;
  const presetSticker = getCoupleChatStickerById(stickerId);
  if (presetSticker) {
    return presetSticker;
  }

  const theme = value.theme;

  if (
    typeof value.emoji === "string" &&
    typeof value.label === "string" &&
    (theme === "rose" ||
      theme === "gold" ||
      theme === "sky" ||
      theme === "mint" ||
      theme === "violet" ||
      theme === "sunset")
  ) {
    return {
      id:
        stickerId ?? `custom-${value.label.toLowerCase().replace(/\s+/g, "-")}`,
      emoji: value.emoji,
      label: value.label,
      theme,
    };
  }

  return null;
}

function normalizeCoupleChatReactions(value: unknown): CoupleChatReaction[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const reactions = new Map<string, Set<string>>();

  for (const entry of value) {
    if (
      !isRecord(entry) ||
      typeof entry.emoji !== "string" ||
      entry.emoji.length === 0
    ) {
      continue;
    }

    const userIds = Array.isArray(entry.user_ids)
      ? entry.user_ids.filter(
          (userId): userId is string =>
            typeof userId === "string" && userId.length > 0,
        )
      : [];

    if (userIds.length === 0) {
      continue;
    }

    const normalizedUserIds = reactions.get(entry.emoji) ?? new Set<string>();
    for (const userId of userIds) {
      normalizedUserIds.add(userId);
    }
    reactions.set(entry.emoji, normalizedUserIds);
  }

  return [...reactions.entries()]
    .map(([emoji, userIds]) => ({
      emoji,
      user_ids: [...userIds],
    }))
    .sort((left, right) => {
      const leftIndex = COUPLE_CHAT_DEFAULT_REACTIONS.indexOf(
        left.emoji as (typeof COUPLE_CHAT_DEFAULT_REACTIONS)[number],
      );
      const rightIndex = COUPLE_CHAT_DEFAULT_REACTIONS.indexOf(
        right.emoji as (typeof COUPLE_CHAT_DEFAULT_REACTIONS)[number],
      );

      if (leftIndex !== -1 || rightIndex !== -1) {
        return (
          (leftIndex === -1 ? Number.MAX_SAFE_INTEGER : leftIndex) -
          (rightIndex === -1 ? Number.MAX_SAFE_INTEGER : rightIndex)
        );
      }

      return left.emoji.localeCompare(right.emoji);
    });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
