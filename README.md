# OurLittleWorld

Next.js 16 app with Prisma/Postgres, Auth.js, and Railway-first deployment settings.

## Local development

```bash
npm install
cp .env.example .env
npm run db:migrate
npm run dev
```

Open `http://localhost:3000`.

## Deploy on Railway

This repo is configured for Railway with [`railway.json`](./railway.json).

Railway service flow:

```bash
npm run build
npm run db:deploy
npm run start
```

Railway will also probe `GET /api/health` for service health.

Required Railway variables:

```bash
DATABASE_URL=${{Postgres.DATABASE_URL}}
AUTH_SECRET=your-auth-secret
RESEND_API_KEY=re_your_api_key
RESEND_FROM=OurLittleWorld <onboarding@resend.dev>
```

Optional Railway variables:

```bash
DIRECT_URL=${{Postgres.DATABASE_URL}}
AUTH_URL=https://your-app-domain.up.railway.app
GOOGLE_CLIENT_ID=your-google-oauth-web-client-id
GOOGLE_CLIENT_SECRET=your-google-oauth-web-client-secret
NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY=your-public-vapid-key
WEB_PUSH_PUBLIC_KEY=your-public-vapid-key
WEB_PUSH_PRIVATE_KEY=your-private-vapid-key
WEB_PUSH_SUBJECT=mailto:you@example.com
CRON_SECRET=your-reminder-job-secret
ABLY_API_KEY=your-ably-key
OPENAI_API_KEY=your-openai-key
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-cloudinary-key
CLOUDINARY_API_SECRET=your-cloudinary-secret
```

Optional SMTP fallback variables:

```bash
SMTP_HOST=smtp.yourprovider.com
SMTP_PORT=587
SMTP_USER=your-email@example.com
SMTP_PASSWORD=your-app-password
SMTP_FROM=OurLittleWorld <noreply@example.com>
```

Notes:

- Commit Prisma migrations before deploying. Railway runs `npm run db:deploy` on each release.
- Use `prisma migrate dev` locally to create migrations, then commit the generated `prisma/migrations/...` files.
- Do not use `prisma db push` in production.
- If you add a custom domain, update `AUTH_URL` to that final public URL and redeploy.
- Google sign-in uses a Google OAuth `Web application` client, not a Google service account.
- Add the Auth.js callback URL to Google OAuth:
  - Local: `http://localhost:3000/api/auth/callback/google`
  - Production: `https://your-app-domain.up.railway.app/api/auth/callback/google`
- Railway disables outbound SMTP on Free, Trial, and Hobby plans. `RESEND_API_KEY` over HTTPS is the preferred email setup for Railway.
- Generate VAPID keys for web push with `npx web-push generate-vapid-keys`.
- Reminder delivery is exposed at `GET/POST /api/push/trips/reminders` and should be called on a recurring schedule with `Authorization: Bearer $CRON_SECRET` (or `?secret=...`).
- Timed custom reminders need a frequent schedule. For near-real-time delivery, run the job every minute.
- In local development, the app now starts an in-process reminder poller automatically. In production, prefer an external cron job; only enable `ENABLE_IN_PROCESS_REMINDER_SCHEDULER=true` if you are certain a single web instance should own reminder polling.

## Railway cron setup

Railway cron jobs run the service start command on a schedule and expect the process to exit when done. Because of that, do **not** convert the main web service into a cron job.

Recommended setup:

1. Keep your existing app service as the public web service.
2. Create a second Railway service from the same repo, for example `reminders-cron`.
3. Set the cron service start command to:

```bash
npm run cron:reminders
```

4. Add these variables to the cron service:

```bash
APP_URL=https://your-app-domain.up.railway.app
CRON_SECRET=your-reminder-job-secret
```

You can use `AUTH_URL` instead of `APP_URL` if it already points at your live web app URL.

5. In Railway service settings, set the cron schedule in UTC.

Examples:

- Every minute: `* * * * *`
- Every 5 minutes: `*/5 * * * *`

The cron runner script is:

```bash
npm run cron:reminders
```

It calls your deployed app at `/api/push/trips/reminders`, then exits cleanly for Railway cron compatibility.
