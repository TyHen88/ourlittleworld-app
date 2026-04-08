import "server-only";

import { Prisma } from "@prisma/client";

import prisma from "@/lib/prisma";
import { sendPushNotificationToUsers } from "@/lib/push";

export const NOTIFICATION_PAGE_SIZE = 10;

export type AppNotificationType =
  | "PARTNER_JOINED"
  | "CHAT_MESSAGE"
  | "FEED_POST_CREATED"
  | "POST_LIKED"
  | "POST_COMMENTED"
  | "POST_REPLIED"
  | "TRIP_CREATED"
  | "REMINDER_CREATED"
  | "CUSTOM_REMINDER_DUE"
  | "TRIP_REMINDER_DUE"
  | "BUDGET_ITEM_CREATED";

type NotificationPushOptions = Parameters<typeof sendPushNotificationToUsers>[0]["options"];

type NotifyUsersParams = {
  userIds: string[];
  type: AppNotificationType;
  title: string;
  body: string;
  detail?: string | null;
  url?: string | null;
  actorUserId?: string | null;
  coupleId?: string | null;
  metadata?: Prisma.InputJsonValue;
  push?: false | {
    allowSingleUserRecipients?: boolean;
    options?: NotificationPushOptions;
    tag?: string;
  };
};

type SerializableNotification = {
  id: string;
  type: string;
  title: string;
  body: string;
  detail: string | null;
  url: string;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
  updated_at: string;
  actor: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
};

export function serializeNotification(notification: {
  id: string;
  type: string;
  title: string;
  body: string;
  detail: string | null;
  url: string;
  is_read: boolean;
  read_at: Date | null;
  created_at: Date;
  updated_at: Date;
  actor: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}): SerializableNotification {
  return {
    id: notification.id,
    type: notification.type,
    title: notification.title,
    body: notification.body,
    detail: notification.detail,
    url: notification.url,
    is_read: notification.is_read,
    read_at: notification.read_at?.toISOString() ?? null,
    created_at: notification.created_at.toISOString(),
    updated_at: notification.updated_at.toISOString(),
    actor: notification.actor
      ? {
          id: notification.actor.id,
          full_name: notification.actor.full_name,
          avatar_url: notification.actor.avatar_url,
        }
      : null,
  };
}

export async function notifyUsers(params: NotifyUsersParams) {
  const recipientIds = [...new Set(params.userIds.filter(Boolean))];

  if (recipientIds.length === 0) {
    return {
      created: 0,
      push: null,
    };
  }

  const url = params.url?.trim() || "/dashboard";
  const body = params.body.trim();
  const detail = params.detail?.trim() || null;

  await prisma.appNotification.createMany({
    data: recipientIds.map((userId) => ({
      recipient_user_id: userId,
      actor_user_id: params.actorUserId ?? null,
      couple_id: params.coupleId ?? null,
      type: params.type,
      title: params.title.trim(),
      body,
      detail,
      url,
      metadata: params.metadata,
    })),
  });

  if (params.push === false) {
    return {
      created: recipientIds.length,
      push: null,
    };
  }

  try {
    const pushResult = await sendPushNotificationToUsers({
      userIds: recipientIds,
      allowSingleUserRecipients: params.push?.allowSingleUserRecipients,
      payload: {
        title: params.title.trim(),
        body,
        url,
        tag: params.push?.tag,
      },
      options: params.push?.options,
    });

    return {
      created: recipientIds.length,
      push: pushResult,
    };
  } catch (pushError) {
    console.error("Notification push delivery error:", pushError);

    return {
      created: recipientIds.length,
      push: {
        attempted: 0,
        delivered: 0,
        removed: 0,
        failed: recipientIds.length,
      },
    };
  }
}
