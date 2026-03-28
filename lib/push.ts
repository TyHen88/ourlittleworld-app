import "server-only";

import prisma from "@/lib/prisma";
import webpush, { type PushSubscription, type RequestOptions, type WebPushError } from "web-push";

export type PushSubscriptionInput = {
  endpoint: string;
  expirationTime?: number | null;
  keys: {
    p256dh: string;
    auth: string;
  };
};

type NotificationPayload = {
  title: string;
  body: string;
  url: string;
  tag?: string;
  icon?: string;
  badge?: string;
};

let vapidConfigured = false;

function getWebPushConfig() {
  const publicKey =
    process.env.WEB_PUSH_PUBLIC_KEY ?? process.env.NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY ?? null;
  const privateKey = process.env.WEB_PUSH_PRIVATE_KEY ?? null;
  const subject = process.env.WEB_PUSH_SUBJECT ?? null;

  return {
    publicKey,
    privateKey,
    subject,
    isConfigured: Boolean(publicKey && privateKey && subject),
  };
}

function ensureWebPushConfigured() {
  const config = getWebPushConfig();
  if (!config.isConfigured) {
    return false;
  }

  if (!vapidConfigured) {
    webpush.setVapidDetails(config.subject!, config.publicKey!, config.privateKey!);
    vapidConfigured = true;
  }

  return true;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function isValidPushSubscription(value: unknown): value is PushSubscriptionInput {
  if (!isObject(value)) {
    return false;
  }

  if (typeof value.endpoint !== "string" || value.endpoint.length === 0) {
    return false;
  }

  const keys = value.keys;
  if (!isObject(keys)) {
    return false;
  }

  return typeof keys.p256dh === "string" && typeof keys.auth === "string";
}

export function getWebPushPublicKey() {
  return getWebPushConfig().publicKey;
}

export function isWebPushEnabled() {
  return ensureWebPushConfigured();
}

export async function upsertPushSubscription(params: {
  userId: string;
  subscription: PushSubscriptionInput;
  userAgent?: string | null;
}) {
  const { userId, subscription, userAgent } = params;

  return prisma.pushSubscription.upsert({
    where: { endpoint: subscription.endpoint },
    update: {
      user_id: userId,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
      user_agent: userAgent ?? null,
    },
    create: {
      user_id: userId,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
      user_agent: userAgent ?? null,
    },
  });
}

export async function removePushSubscription(params: { userId: string; endpoint: string }) {
  const { userId, endpoint } = params;

  return prisma.pushSubscription.deleteMany({
    where: {
      user_id: userId,
      endpoint,
    },
  });
}

function formatStoredSubscription(subscription: {
  endpoint: string;
  p256dh: string;
  auth: string;
}): PushSubscription {
  return {
    endpoint: subscription.endpoint,
    expirationTime: null,
    keys: {
      p256dh: subscription.p256dh,
      auth: subscription.auth,
    },
  };
}

function isExpiredSubscriptionError(error: unknown): error is WebPushError {
  return (
    isObject(error) &&
    typeof error.statusCode === "number" &&
    (error.statusCode === 404 || error.statusCode === 410)
  );
}

export async function sendPushNotificationToUsers(params: {
  userIds: string[];
  payload: NotificationPayload;
  options?: RequestOptions;
  allowSingleUserRecipients?: boolean;
}) {
  const uniqueUserIds = [...new Set(params.userIds.filter(Boolean))];
  if (uniqueUserIds.length === 0 || !ensureWebPushConfigured()) {
    return {
      attempted: 0,
      delivered: 0,
      removed: 0,
      failed: 0,
    };
  }

  let recipientUserIds = uniqueUserIds;

  if (!params.allowSingleUserRecipients) {
    const eligibleUsers = await prisma.user.findMany({
      where: {
        id: {
          in: uniqueUserIds,
        },
        is_deleted: false,
        user_type: {
          not: "SINGLE",
        },
      },
      select: {
        id: true,
      },
    });

    recipientUserIds = eligibleUsers.map((user) => user.id);
  }

  if (recipientUserIds.length === 0) {
    return {
      attempted: 0,
      delivered: 0,
      removed: 0,
      failed: 0,
    };
  }

  const subscriptions = await prisma.pushSubscription.findMany({
    where: {
      user_id: {
        in: recipientUserIds,
      },
    },
    select: {
      id: true,
      endpoint: true,
      p256dh: true,
      auth: true,
    },
  });

  if (subscriptions.length === 0) {
    return {
      attempted: 0,
      delivered: 0,
      removed: 0,
      failed: 0,
    };
  }

  const payload = JSON.stringify({
    title: params.payload.title,
    body: params.payload.body,
    tag: params.payload.tag ?? "ourlittleworld",
    icon: params.payload.icon ?? "/pwa-192x192.png",
    badge: params.payload.badge ?? "/pwa-192x192.png",
    data: {
      url: params.payload.url,
    },
  });

  let delivered = 0;
  let removed = 0;
  let failed = 0;

  await Promise.allSettled(
    subscriptions.map(async (subscription) => {
      try {
        await webpush.sendNotification(
          formatStoredSubscription(subscription),
          payload,
          params.options
        );
        delivered += 1;
      } catch (error: unknown) {
        if (isExpiredSubscriptionError(error)) {
          await prisma.pushSubscription.delete({
            where: { id: subscription.id },
          });
          removed += 1;
          return;
        }

        failed += 1;
        console.error("Failed to send push notification:", error);
      }
    })
  );

  return {
    attempted: subscriptions.length,
    delivered,
    removed,
    failed,
  };
}
