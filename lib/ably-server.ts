import "server-only";

import * as Ably from "ably";

const ABLY_KEY_PATTERN = /^[\w-]+\.[\w-]+:[\w-]+$/;

export function getAblyRestClient() {
  const key = process.env.ABLY_API_KEY;
  if (!key) {
    return null;
  }

  if (!ABLY_KEY_PATTERN.test(key)) {
    return null;
  }

  return new Ably.Rest({
    key,
    queryTime: true,
  });
}
