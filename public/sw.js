const CACHE_NAME = "ourlittleworld-static-v5";
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
