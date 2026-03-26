export const COUPLE_CHAT_CATEGORY = "__COUPLE_CHAT__";
export const COUPLE_CHAT_EVENT = "message.created";

export interface CoupleChatAuthor {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
}

export interface CoupleChatMessage {
  id: string;
  couple_id: string | null;
  author_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  author: CoupleChatAuthor;
}

export interface CoupleChatMessageRecord {
  id: string;
  couple_id: string | null;
  author_id: string;
  content: string;
  created_at: Date;
  updated_at: Date;
  author: CoupleChatAuthor;
}

export function getCoupleChatChannelName(coupleId: string) {
  return `couple-chat:${coupleId}`;
}

export function serializeCoupleChatMessage(
  message: CoupleChatMessageRecord
): CoupleChatMessage {
  return {
    id: message.id,
    couple_id: message.couple_id,
    author_id: message.author_id,
    content: message.content,
    created_at: message.created_at.toISOString(),
    updated_at: message.updated_at.toISOString(),
    author: {
      id: message.author.id,
      full_name: message.author.full_name,
      avatar_url: message.author.avatar_url,
    },
  };
}
