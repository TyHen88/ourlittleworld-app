"use client";

const AUTO_ENABLE_PUSH_AFTER_REGISTER_KEY = "olw:auto-enable-push-after-register";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const normalized = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(normalized);
  const outputArray = new Uint8Array(rawData.length);

  for (let index = 0; index < rawData.length; index += 1) {
    outputArray[index] = rawData.charCodeAt(index);
  }

  return outputArray;
}

export function browserSupportsPushNotifications() {
  return (
    typeof window !== "undefined" &&
    "Notification" in window &&
    "serviceWorker" in navigator &&
    "PushManager" in window
  );
}

export async function getExistingPushSubscription() {
  if (!browserSupportsPushNotifications()) {
    return null;
  }

  const registration = await navigator.serviceWorker.getRegistration();
  if (!registration) {
    return null;
  }

  return registration.pushManager.getSubscription();
}

async function getPushRegistration() {
  const existingRegistration = await navigator.serviceWorker.getRegistration();
  if (existingRegistration) {
    if (existingRegistration.active) {
      return existingRegistration;
    }

    return navigator.serviceWorker.ready;
  }

  await navigator.serviceWorker.register("/sw.js");
  return navigator.serviceWorker.ready;
}

export async function subscribeBrowserToPush(publicKey: string) {
  if (!browserSupportsPushNotifications()) {
    throw new Error("Push notifications are not supported in this browser.");
  }

  if (Notification.permission === "denied") {
    throw new Error("Notifications are blocked in this browser.");
  }

  const permission =
    Notification.permission === "granted"
      ? "granted"
      : await Notification.requestPermission();

  if (permission !== "granted") {
    throw new Error("Notification permission was not granted.");
  }

  const registration = await getPushRegistration();
  const existingSubscription = await registration.pushManager.getSubscription();
  if (existingSubscription) {
    return existingSubscription;
  }

  return registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey),
  });
}

export async function unsubscribeBrowserFromPush() {
  if (!browserSupportsPushNotifications()) {
    return null;
  }

  const registration = await navigator.serviceWorker.getRegistration();
  if (!registration) {
    return null;
  }

  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    return null;
  }

  const endpoint = subscription.endpoint;
  await subscription.unsubscribe();
  return endpoint;
}

export async function enablePushNotifications() {
  if (!browserSupportsPushNotifications()) {
    throw new Error("Push notifications are not supported in this browser.");
  }

  const publicKeyResponse = await fetch("/api/push/public-key", {
    method: "GET",
    cache: "no-store",
  });
  const publicKeyPayload = await publicKeyResponse.json().catch(() => null);

  if (!publicKeyResponse.ok || !publicKeyPayload?.publicKey) {
    throw new Error(publicKeyPayload?.error || "Push notifications are not configured.");
  }

  const subscription = await subscribeBrowserToPush(publicKeyPayload.publicKey);

  const subscribeResponse = await fetch("/api/push/subscriptions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      subscription: subscription.toJSON(),
    }),
  });
  const subscribePayload = await subscribeResponse.json().catch(() => null);

  if (!subscribeResponse.ok) {
    throw new Error(subscribePayload?.error || "Failed to enable push notifications.");
  }

  return subscription;
}

export async function disablePushNotifications() {
  const endpoint = await unsubscribeBrowserFromPush();

  if (endpoint) {
    await fetch("/api/push/subscriptions", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ endpoint }),
    });
  }

  return endpoint;
}

export function markAutoEnablePushAfterRegister() {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(AUTO_ENABLE_PUSH_AFTER_REGISTER_KEY, "1");
}

export function shouldAutoEnablePushAfterRegister() {
  if (typeof window === "undefined") {
    return false;
  }

  return window.sessionStorage.getItem(AUTO_ENABLE_PUSH_AFTER_REGISTER_KEY) === "1";
}

export function clearAutoEnablePushAfterRegister() {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.removeItem(AUTO_ENABLE_PUSH_AFTER_REGISTER_KEY);
}
