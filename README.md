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
