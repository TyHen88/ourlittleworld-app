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
SMTP_HOST=smtp.yourprovider.com
SMTP_PORT=587
SMTP_USER=your-email@example.com
SMTP_PASSWORD=your-app-password
SMTP_FROM=OurLittleWorld <noreply@example.com>
```

Recommended Railway variables:

```bash
DIRECT_URL=${{Postgres.DATABASE_URL}}
AUTH_URL=https://your-app-domain.up.railway.app
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

Notes:

- Commit Prisma migrations before deploying. Railway runs `npm run db:deploy` on each release.
- Use `prisma migrate dev` locally to create migrations, then commit the generated `prisma/migrations/...` files.
- Do not use `prisma db push` in production.
- If you add a custom domain, update `AUTH_URL` to that final public URL and redeploy.
- Generate VAPID keys for web push with `npx web-push generate-vapid-keys`.
- Trip reminders are exposed at `GET/POST /api/push/trips/reminders` and should be called once per day with `Authorization: Bearer $CRON_SECRET` (or `?secret=...`).

## Railway cron setup

Railway cron jobs run the service start command on a schedule and expect the process to exit when done. Because of that, do **not** convert the main web service into a cron job.

Recommended setup:

1. Keep your existing app service as the public web service.
2. Create a second Railway service from the same repo, for example `trip-reminders-cron`.
3. Set the cron service start command to:

```bash
npm run cron:trip-reminders
```

4. Add these variables to the cron service:

```bash
APP_URL=https://your-app-domain.up.railway.app
CRON_SECRET=your-reminder-job-secret
```

You can use `AUTH_URL` instead of `APP_URL` if it already points at your live web app URL.

5. In Railway service settings, set the cron schedule in UTC.

Examples:

- Every day at 1:00 AM UTC: `0 1 * * *`
- Every day at 11:00 PM Cambodia time (UTC+7): `0 16 * * *`

The cron runner script is:

```bash
npm run cron:trip-reminders
```

It calls your deployed app at `/api/push/trips/reminders`, then exits cleanly for Railway cron compatibility.
