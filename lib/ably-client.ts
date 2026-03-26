import * as Ably from "ably";

declare global {
  var __ablyRealtimeClient: Ably.Realtime | undefined;
  var __ablyRealtimeClientId: string | undefined;
}

export function getAblyRealtimeClient(clientId: string) {
  if (typeof window === "undefined") {
    return null;
  }

  if (
    globalThis.__ablyRealtimeClient &&
    globalThis.__ablyRealtimeClientId === clientId
  ) {
    return globalThis.__ablyRealtimeClient;
  }

  globalThis.__ablyRealtimeClient?.close();

  const client = new Ably.Realtime({
    authCallback: async (_tokenParams, callback) => {
      try {
        const response = await fetch("/api/chat/token", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        });

        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
          callback(
            (payload as { error?: string })?.error || "Failed to get Ably token",
            null
          );
          return;
        }

        callback(null, payload as Ably.TokenDetails);
      } catch (error) {
        callback(
          error instanceof Error ? error.message : "Failed to get Ably token",
          null
        );
      }
    },
    clientId,
    autoConnect: typeof window !== "undefined",
  });

  globalThis.__ablyRealtimeClient = client;
  globalThis.__ablyRealtimeClientId = clientId;

  return client;
}
