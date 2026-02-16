You are a senior UI/UX designer + Next.js expert specializing in romantic, mobile-first PWAs. You create stunning, emotional, high-retention interfaces for couple/love apps — think Between, Paired, Honeydue but elevated for 2026: soft pastel palettes, subtle gradients, heart micro-animations, fluid responsive layouts, premium feel on every device.

Task: Build MVP code/structure for "OurLittleWorld" — a private couple PWA (Next.js 15+ App Router) focused on shared budget + private social feed. EMPHASIZE:

- 100% mobile-first & fully responsive (Tailwind breakpoints: sm, md, lg, xl — test on iPhone/Android views)
- Beautiful, romantic UI: Use soft pastel colors (blush #FFE4E1, lavender #E6E6FA, mint #D4F4DD, warm neutrals #FDFBF7, accents #FF6B6B/#FFB6C1), subtle linear gradients, rounded corners, glassmorphism/soft shadows where elegant
- Heart/confetti animations on key actions (new post, budget goal hit, join couple)
- Touch-optimized: large tap targets, swipe gestures if natural, smooth 300ms transitions
- PWA perfection: installable, offline-capable (cache recent data), fast load, app-like feel
- shadcn/ui components customized for romance (Card with heart icons, Button variants "love", Dialogs with soft blur)

Core features (implement with beauty priority):
1. Auth + Couple Join/Create: Cute onboarding with couple photo upload, nickname picker (e.g. "My Forever" suggestions), QR/invite code screen with gradient background
2. Dashboard: Bottom nav or tab bar (Budget | Feed | Us) — mobile-first layout
3. Budget: Beautiful pie/donut chart (Tremor or Recharts with pastel colors), transaction cards (color-coded: his/hers/shared), add form with emoji picker for categories
4. Private Feed: Instagram-like but couple-only — masonry/photo grid on desktop, vertical timeline on mobile, heart reactions, upload photos with preview
5. Offline: Draft posts/transactions locally, sync on reconnect with cute "syncing hearts" indicator

Tech constraints (must follow):
- Next.js 15+ App Router, Server Components + Server Actions
- Tailwind CSS v4 + shadcn/ui (custom theme with romantic colors)
- Supabase (Auth, RLS, Realtime, Storage for photos)
- Recharts or Tremor for charts
- Framer Motion for gentle animations (hearts floating, confetti via canvas-confetti)
- Zustand for light client state + realtime subs
- Mobile-first: base styles for <640px, then progressive overrides

Database (same as before):
- profiles, couples, transactions, posts (with RLS for couple-only access)

Output ONLY this exact structure:

1. Romantic Color Theme & Tailwind Config Snippet
   (tailwind.config.ts excerpt with custom colors, gradients, animations)

2. Project Structure Tree
   (focus on UI-heavy folders: components/ui, components/love, app/(app)/...)

3. PWA Setup (manifest + icons description + service worker tips)

4. Key Beautiful UI Code Files
   Provide complete code for:
   - app/layout.tsx (root with theme provider, mobile viewport meta)
   - components/LoveThemeProvider.tsx (custom shadcn theme)
   - app/(auth)/onboarding/page.tsx (couple join/create beautiful flow)
   - app/dashboard/page.tsx (mobile-first dashboard with tabs/nav)
   - components/BudgetOverview.tsx (pastel chart + summary cards)
   - components/TransactionCard.tsx (color-coded, animated)
   - components/CoupleFeedPost.tsx (photo + heart reaction animation)
   - components/AddPostForm.tsx (with photo preview, emoji)

5. Animation & Micro-interaction Examples
   (Framer Motion or tailwind animate examples for hearts/confetti)

6. Responsive & PWA Best Practices Checklist
   (mobile-first rules, touch handling, offline UX tips)

7. Next Steps for Polish
   (add dark mode toggle with heart icon, accessibility hearts, test on real devices)

Think step-by-step:
- Prioritize emotional delight: every screen should feel warm & loving
- Mobile perfection first — desktop scales up naturally
- Avoid clutter; use whitespace, soft shadows, rounded-3xl
- Use shadcn/ui primitives but override for romance (e.g. Button className="bg-gradient-to-r from-pink-400 to-rose-400 hover:from-pink-500...")

Generate now — make it breathtaking! 💕