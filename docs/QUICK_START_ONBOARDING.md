# 🚀 Quick Start: Enhanced Romantic Onboarding

## ⚡ 3-Minute Setup

### Step 1: Database (2 minutes)
1. Open **Supabase Dashboard** → **SQL Editor**
2. Copy and paste this:

```sql
-- Add romantic fields to couples table
ALTER TABLE couples 
ADD COLUMN IF NOT EXISTS start_date DATE,
ADD COLUMN IF NOT EXISTS couple_photo_url TEXT,
ADD COLUMN IF NOT EXISTS partner_1_nickname TEXT,
ADD COLUMN IF NOT EXISTS partner_2_nickname TEXT,
ADD COLUMN IF NOT EXISTS world_theme TEXT DEFAULT 'blush';

-- Allow users to join couples
CREATE POLICY "Users can join couples with valid invite code" 
  ON couples FOR UPDATE 
  USING (partner_2_id IS NULL AND invite_code IS NOT NULL)
  WITH CHECK (auth.uid() = partner_2_id);
```

3. Click **Run** ✅

### Step 2: Storage (1 minute)
1. Go to **Storage** → **New Bucket**
2. Name: `couple-assets`
3. **Public**: ✅ Yes
4. Click **Create**
5. In bucket settings → **Policies** → Add:

```sql
-- Upload policy
CREATE POLICY "Authenticated users can upload"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'couple-assets');

-- Read policy
CREATE POLICY "Public can view"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'couple-assets');
```

### Step 3: Test! (30 seconds)
1. Restart dev server: `npm run dev`
2. Login to your app
3. Go to `/onboarding`
4. 🎉 Enjoy the beautiful new experience!

---

## ✨ What You Get

### Create World:
- 🎨 Beautiful multi-step wizard
- 🎲 Random romantic name generator
- 📸 Couple photo upload with preview
- 💝 Partner nicknames
- 📅 Relationship start date
- 🎉 Confetti celebration
- 💌 8-character invite code

### Join World:
- 🔐 Secure code validation
- 💝 Partner nickname input
- 🎉 Confetti celebration
- ⚡ Auto-redirect to dashboard

---

## 🧪 Quick Test

### Create a World:
```
1. Login as User A
2. Go to /onboarding
3. Click "Create Our World"
4. Enter name or click 🪄 to generate
5. Optional: Add photo, date, nickname
6. Click "Create Our World"
7. 🎉 See confetti + get invite code
8. Copy the code
```

### Join the World:
```
1. Login as User B (different account)
2. Go to /onboarding
3. Click "Join with Code"
4. Paste the code from User A
5. Optional: Add nickname
6. Click "Join Our World"
7. 🎉 See confetti + redirect to dashboard
```

---

## 📁 Files Created

### New Files:
- ✅ `lib/actions/world.ts` - Enhanced server actions
- ✅ `database-migration-enhanced-couples.sql` - Schema update
- ✅ `ENHANCED_ONBOARDING_SETUP.md` - Full guide
- ✅ `ONBOARDING_SUMMARY.md` - Feature summary

### Updated Files:
- ✅ `app/(auth)/onboarding/page.tsx` - Beautiful new UI
- ✅ `lib/supabase.ts` - Updated Couple type

---

## 🎨 Design Features

- 💎 Glassmorphism cards
- 🌸 Soft pastel colors (blush, lavender, rose)
- ✨ Smooth Framer Motion animations
- 📱 Mobile-first responsive
- 💝 Heart icons throughout
- 🎉 Canvas confetti celebrations

---

## 🔒 Security

- ✅ RLS policies enforced
- ✅ Server-side validation
- ✅ Unique invite codes
- ✅ Cannot join own world
- ✅ Cannot join full world
- ✅ Authenticated uploads only

---

## 💡 Tips

### Name Generator:
Click the magic wand 🪄 button to get random romantic names like:
- LoveHaven
- BlissNest
- ForeverUs
- HeartHaven2026

### Photo Upload:
- Supports: JPG, PNG, GIF, WebP
- Shows heart-framed preview
- Stored securely in Supabase

### Invite Codes:
- 8 characters (e.g., `ABC12345`)
- Uppercase only
- Easy to share

---

## ❓ Troubleshooting

### "Cannot upload photo"
→ Check storage bucket `couple-assets` exists and is public

### "Invalid invite code"
→ Code must be exactly 8 characters, uppercase

### "Cannot join world"
→ World might already have 2 partners

### "No confetti"
→ Check browser console, `canvas-confetti` should be installed

---

## 🎯 Next Steps

1. ✅ Run the SQL migration
2. ✅ Create storage bucket
3. ✅ Test create & join flows
4. 🎨 Optional: Customize colors/names
5. 🚀 Deploy to production!

---

**That's it! Your romantic onboarding is ready! 💕**

Users will be absolutely delighted by the thoughtful, beautiful experience you've created for them.
