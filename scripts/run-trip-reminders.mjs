import nextEnv from "@next/env";

const { loadEnvConfig } = nextEnv;

loadEnvConfig(process.cwd());

const baseUrl =
  process.env.APP_URL ||
  process.env.AUTH_URL ||
  process.env.NEXTAUTH_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  (process.env.NODE_ENV !== "production" ? "http://localhost:3000" : undefined);

if (!baseUrl) {
  throw new Error(
    "APP_URL, AUTH_URL, NEXTAUTH_URL, or NEXT_PUBLIC_APP_URL is required for cron:reminders",
  );
}

const url = new URL("/api/push/trips/reminders", baseUrl);
const headers = {};

if (process.env.CRON_SECRET) {
  headers.Authorization = `Bearer ${process.env.CRON_SECRET}`;
}

const response = await fetch(url, {
  method: "POST",
  headers,
});

const bodyText = await response.text();

if (!response.ok) {
  throw new Error(`Trip reminder cron failed (${response.status}): ${bodyText}`);
}

console.log(bodyText);
