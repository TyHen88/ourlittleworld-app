const baseUrl = process.env.APP_URL || process.env.AUTH_URL;

if (!baseUrl) {
  throw new Error("APP_URL or AUTH_URL is required for cron:trip-reminders");
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
