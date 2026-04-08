const CACHE_NAME = "ourlittleworld-static-v6";
const OFFLINE_FALLBACK_URL = "/landing";
const PRECACHE_URLS = [
  OFFLINE_FALLBACK_URL,
  "/manifest.json",
  "/pwa-192x192.png",
  "/pwa-512x512.png",
];

const CACHEABLE_PUBLIC_ASSET = /\.(?:png|jpg|jpeg|webp|gif|svg|ico|woff2?|ttf)$/i;

function isSameOrigin(url) {
  return url.origin === self.location.origin;
}

function isRuntimeCacheableAsset(requestUrl) {
  if (!isSameOrigin(requestUrl)) {
    return false;
  }

  if (
    requestUrl.pathname.startsWith("/api/") ||
    requestUrl.pathname.startsWith("/_next/") ||
    requestUrl.pathname.startsWith("/dashboard") ||
    requestUrl.pathname.startsWith("/feed") ||
    requestUrl.pathname.startsWith("/budget") ||
    requestUrl.pathname.startsWith("/goals") ||
    requestUrl.pathname.startsWith("/settings") ||
    requestUrl.pathname.startsWith("/trips") ||
    requestUrl.pathname.startsWith("/world") ||
    requestUrl.pathname.startsWith("/support") ||
    requestUrl.pathname.startsWith("/profile")
  ) {
    return false;
  }

  if (requestUrl.search) {
    return false;
  }

  return CACHEABLE_PUBLIC_ASSET.test(requestUrl.pathname);
}

function canStoreResponse(response) {
  if (!response || response.status !== 200 || response.type !== "basic") {
    return false;
  }

  const cacheControl = response.headers.get("Cache-Control") ?? "";
  return !/(no-store|no-cache|private)/i.test(cacheControl);
}

async function broadcastPushToClients(payload) {
  const windowClients = await clients.matchAll({
    type: "window",
    includeUncontrolled: true,
  });

  await Promise.all(
    windowClients.map((client) =>
      client.postMessage({
        type: "olw-push-received",
        payload,
      }),
    ),
  );
}

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName.startsWith("ourlittleworld-")) {
            return caches.delete(cacheName);
          }

          return undefined;
        }),
      );

      if ("navigationPreload" in self.registration) {
        await self.registration.navigationPreload.enable();
      }

      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return;
  }

  const requestUrl = new URL(event.request.url);

  if (!isSameOrigin(requestUrl)) {
    return;
  }

  if (event.request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const preloadResponse = await event.preloadResponse;
          if (preloadResponse) {
            return preloadResponse;
          }

          return await fetch(event.request);
        } catch {
          const cache = await caches.open(CACHE_NAME);
          return (await cache.match(OFFLINE_FALLBACK_URL)) ?? Response.error();
        }
      })(),
    );
    return;
  }

  if (!isRuntimeCacheableAsset(requestUrl)) {
    return;
  }

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const cachedResponse = await cache.match(event.request);

      if (cachedResponse) {
        return cachedResponse;
      }

      const networkResponse = await fetch(event.request);
      if (canStoreResponse(networkResponse)) {
        cache.put(event.request, networkResponse.clone());
      }

      return networkResponse;
    })(),
  );
});

self.addEventListener("push", (event) => {
  const fallbackPayload = {
    title: "Our Little World",
    body: "You have a new notification.",
    tag: "ourlittleworld",
    icon: "/pwa-192x192.png",
    badge: "/pwa-192x192.png",
    data: { url: "/" },
  };

  const payload = (() => {
    if (!event.data) {
      return fallbackPayload;
    }

    try {
      const parsed = event.data.json();
      return {
        ...fallbackPayload,
        ...parsed,
        data: {
          ...fallbackPayload.data,
          ...(parsed?.data ?? {}),
        },
      };
    } catch {
      return {
        ...fallbackPayload,
        body: event.data.text(),
      };
    }
  })();

  event.waitUntil(
    Promise.all([
      self.registration.showNotification(payload.title, {
        body: payload.body,
        tag: payload.tag,
        icon: payload.icon,
        badge: payload.badge,
        data: payload.data,
      }),
      broadcastPushToClients(payload),
    ]),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = new URL(event.notification.data?.url || "/", self.location.origin).toString();

  event.waitUntil(
    (async () => {
      const windowClients = await clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });

      for (const client of windowClients) {
        if ("focus" in client && client.url === targetUrl) {
          await client.focus();
          return;
        }
      }

      if (clients.openWindow) {
        await clients.openWindow(targetUrl);
      }
    })(),
  );
});
