This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Deploy on Railway

This repo is configured for Railway with [`railway.json`](./railway.json).

Railway deploy flow:

```bash
npm run build
# runs: prisma generate && next build

npm run db:deploy
# runs: prisma migrate deploy

npm run start
```

Required Railway variables:

```bash
NEXT_PUBLIC_SITE_URL=https://your-app-domain.up.railway.app
DATABASE_URL=${{Postgres.DATABASE_URL}}
DIRECT_URL=${{Postgres.DATABASE_URL}}
AUTH_SECRET=your-secret
```

Notes:

- `DATABASE_URL` is required for the app and migrations.
- `DIRECT_URL` is optional locally, but recommended on Railway so Prisma can use the direct database connection consistently.
- Railway does not create new Prisma migrations from `schema.prisma`. Create them locally with `prisma migrate dev`, commit the new `prisma/migrations/...` folder, and let Railway apply them with `prisma migrate deploy`.
- Redeploy after adding or changing database environment variables.
- Do not use `prisma db push` in production. Railway deploys should use `prisma migrate deploy`.

Add : URL railway and run migrate deploy locally when has any deploy

# npx prisma migrate dev --name your_change_name

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
