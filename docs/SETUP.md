# 🚀 Quick Setup Guide for OurLittleWorld

## Step 1: Get Your Supabase Credentials

1. Go to your Supabase project: https://supabase.com/dashboard
2. Click on your project: `vlgysrlqjngldfsugtem`
3. Go to **Settings** → **API**
4. Copy the following:
   - **Project URL** (already in `.env`)
   - **anon public key** (you need to add this)

## Step 2: Update `.env` File

Replace `your_supabase_anon_key_here` in your `.env` file with your actual anon key:

```bash
DATABASE_URL=postgresql://postgres:psql@1234@ty@db.vlgysrlqjngldfsugtem.supabase.co:5432/postgres

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://vlgysrlqjngldfsugtem.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...  # <-- PASTE YOUR KEY HERE
```

## Step 3: Create Database Tables

1. Go to **SQL Editor** in your Supabase dashboard
2. Click **New Query**
3. Copy the **entire contents** of `supabase-setup.sql`
4. Paste it into the SQL Editor
5. Click **Run** (or press Ctrl+Enter)
6. You should see: "Success. No rows returned"

This will create:
- ✅ `profiles` table
- ✅ `couples` table  
- ✅ `transactions` table
- ✅ `posts` table
- ✅ All RLS policies
- ✅ All indexes
- ✅ All triggers

## Step 4: Verify Tables Were Created

1. In Supabase dashboard, go to **Table Editor**
2. You should see 4 tables: `profiles`, `couples`, `transactions`, `posts`
3. Click on each to verify they exist

## Step 5: Restart Your Dev Server

```bash
npm run dev
```

## Step 6: Test the Flow

1. Visit `http://localhost:3001`
2. You'll be redirected to `/register`
3. Create an account (e.g., `user1@example.com`)
4. After registration, you'll go to `/onboarding`
5. Click **"Create Our World"**
6. You'll get a 6-character invite code (e.g., `ABC123`)
7. Copy the code
8. Open an incognito/private window
9. Register another account (e.g., `user2@example.com`)
10. Click **"Join a Couple"**
11. Enter the invite code
12. Both users should now see the dashboard! 💕

## Troubleshooting

### Error: "Could not find the table 'public.profiles'"
- You haven't run the `supabase-setup.sql` script yet
- Go to Step 3 above

### Error: "Invalid API key"
- Your `NEXT_PUBLIC_SUPABASE_ANON_KEY` is incorrect
- Go to Step 1 and copy the correct key

### Error: "Invalid invite code"
- Make sure you're entering the exact 6-character code
- Codes are case-insensitive
- The code must exist in the database

### Can't see the dashboard after joining
- Check browser console for errors
- Verify both users have `couple_id` set in the `profiles` table
- Check Supabase logs for RLS policy errors

## Database Schema Overview

```
profiles
├── id (UUID, FK to auth.users)
├── email
├── full_name
├── avatar_url
└── couple_id (FK to couples)

couples
├── id (UUID)
├── invite_code (6 chars, unique)
├── partner_1_id (FK to profiles)
├── partner_2_id (FK to profiles, nullable)
└── couple_name

transactions
├── id (UUID)
├── couple_id (FK to couples)
├── amount
├── category
├── note
├── payer ('His' | 'Hers' | 'Shared')
└── created_by (FK to profiles)

posts
├── id (UUID)
├── couple_id (FK to couples)
├── author_id (FK to profiles)
├── content
└── image_url
```

## Next Features to Implement

- [ ] Real transaction creation
- [ ] Real post creation with image upload
- [ ] Realtime updates using Supabase subscriptions
- [ ] Profile photo upload
- [ ] Budget goals and tracking
- [ ] Notifications when partner posts

---

Made with 💕 by OurLittleWorld
