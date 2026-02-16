# 💕 Enhanced Romantic Onboarding Setup Guide

## Overview

The enhanced onboarding system creates a breathtaking, mobile-first experience for couples to create or join their "World" (couple space) with romantic features like:

- ✨ Multi-step wizard with smooth Framer Motion transitions
- 🎨 Soft pastel theme (blush, lavender, rose)
- 📸 Couple photo upload with heart frame preview
- 💝 Partner nicknames ("My Honey", "My Love")
- 📅 Relationship start date picker
- 🎲 Random romantic name generator
- 🎉 Canvas confetti celebration on success
- 💌 8-character unique invite codes

---

## 🗄️ Database Setup

### Step 1: Run the Migration

Go to **Supabase Dashboard → SQL Editor** and run:

```sql
-- File: database-migration-enhanced-couples.sql

ALTER TABLE couples 
ADD COLUMN IF NOT EXISTS start_date DATE,
ADD COLUMN IF NOT EXISTS couple_photo_url TEXT,
ADD COLUMN IF NOT EXISTS partner_1_nickname TEXT,
ADD COLUMN IF NOT EXISTS partner_2_nickname TEXT,
ADD COLUMN IF NOT EXISTS world_theme TEXT DEFAULT 'blush';

-- Update RLS policy for joining
CREATE POLICY "Users can join couples with valid invite code" 
  ON couples FOR UPDATE 
  USING (
    partner_2_id IS NULL 
    AND invite_code IS NOT NULL
  )
  WITH CHECK (
    auth.uid() = partner_2_id
  );
```

### Step 2: Create Storage Bucket

1. Go to **Storage** in Supabase Dashboard
2. Click **New Bucket**
3. Name: `couple-assets`
4. **Public**: ✅ Yes (for photo URLs)
5. Click **Create Bucket**

### Step 3: Set Storage Policies

In the `couple-assets` bucket, add these policies:

```sql
-- Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload couple photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'couple-assets');

-- Allow public read access
CREATE POLICY "Public can view couple photos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'couple-assets');
```

---

## 📁 New Files Created

### 1. **`lib/actions/world.ts`** - Server Actions
Enhanced server actions for:
- `createWorld()` - Create couple with all romantic fields
- `joinWorld()` - Join existing couple with validation
- `generateWorldName()` - Random romantic name generator
- `uploadCouplePhoto()` - Upload to Supabase Storage

### 2. **`app/(auth)/onboarding/page.tsx`** - Enhanced UI
Beautiful multi-step onboarding with:
- Step 1: Choose Create or Join
- Step 2: Create World Form (name, date, photo, nickname)
- Step 3: Join World Form (code, nickname)
- Step 4: Success Screen (confetti + invite code display)

### 3. **`database-migration-enhanced-couples.sql`** - Schema
Adds romantic fields to couples table

---

## 🎨 Design Features

### Color Palette
```css
Blush: #FFE4E1
Lavender: #E6E6FA
Rose: #FF6B6B
Pink: #FFB6C1
```

### UI Components
- **Glassmorphism cards**: `bg-white/80 backdrop-blur-xl`
- **Rounded corners**: `rounded-3xl` (48px)
- **Gradient buttons**: `bg-gradient-button`
- **Heart icons**: Lucide React icons
- **Smooth transitions**: Framer Motion

---

## 🔄 User Flow

### Create Flow:
```
1. Click "Create Our World"
   ↓
2. Enter world name (with suggestions + generator)
   ↓
3. Optional: Add start date
   ↓
4. Optional: Upload couple photo
   ↓
5. Optional: Set partner nickname
   ↓
6. Click "Create Our World"
   ↓
7. 🎉 Confetti + Show invite code
   ↓
8. Copy code & share with partner
   ↓
9. Continue to Dashboard
```

### Join Flow:
```
1. Click "Join with Code"
   ↓
2. Enter 8-character invite code
   ↓
3. Optional: Set partner nickname
   ↓
4. Click "Join Our World"
   ↓
5. 🎉 Confetti + Success message
   ↓
6. Auto-redirect to Dashboard (3s)
```

---

## 🧪 Testing

### Test Create World:
1. Login as User A
2. Go to `/onboarding`
3. Click "Create Our World"
4. Enter name: "ForeverUs"
5. Click magic wand to generate random name
6. Select start date
7. Upload a photo
8. Enter nickname: "My Love"
9. Click "Create Our World"
10. ✅ Should see confetti + invite code
11. Copy the code

### Test Join World:
1. Login as User B (different account)
2. Go to `/onboarding`
3. Click "Join with Code"
4. Paste the invite code from User A
5. Enter nickname: "My Honey"
6. Click "Join Our World"
7. ✅ Should see confetti + redirect to dashboard

### Test Validation:
- ❌ Try joining with invalid code → Error message
- ❌ Try joining already-complete world → Error message
- ❌ Try joining your own world → Error message
- ✅ All should show friendly error messages

---

## 🎯 Romantic Name Suggestions

Built-in suggestions:
- LoveHaven
- BlissNest
- ForeverUs
- HeartHaven2026
- OurSweetEscape
- TwoHearts
- EndlessLove
- DreamTogether
- SoulMates
- PerfectPair
- LoveStory
- TogetherForever
- OurParadise
- SweetJourney
- EternalBond
- LoveNest

Users can:
- Click suggestion chips to use them
- Click magic wand (🪄) to generate random name
- Type their own custom name

---

## 🔒 Security & RLS

### Couples Table Policies:
```sql
-- View: Only couple members
SELECT: auth.uid() = partner_1_id OR auth.uid() = partner_2_id

-- Update: Only couple members
UPDATE: auth.uid() = partner_1_id OR auth.uid() = partner_2_id

-- Create: Only as partner_1
INSERT: auth.uid() = partner_1_id

-- Join: Only if partner_2 is null
UPDATE: partner_2_id IS NULL AND auth.uid() = partner_2_id
```

### Storage Policies:
- Upload: Authenticated users only
- Read: Public (for displaying photos)

---

## 📱 Mobile-First Design

### Touch-Friendly:
- Large buttons: `h-14` to `h-16` (56-64px)
- Big inputs: `h-14` minimum
- Generous spacing: `space-y-6`
- Easy tap targets: `p-8` padding

### Responsive:
```tsx
// Tailwind breakpoints
sm: 640px   // Small phones
md: 768px   // Tablets
lg: 1024px  // Desktop
```

All components scale beautifully from 320px to 1920px!

---

## 🎉 Confetti Configuration

```typescript
confetti({
  particleCount: 100,
  spread: 70,
  origin: { y: 0.6 },
  colors: ['#FFE4E1', '#E6E6FA', '#FF6B6B', '#FFB6C1']
});
```

Triggers on:
- ✅ Successful world creation
- ✅ Successful world join

---

## 🚀 Next Steps

### 1. Run Database Migration
Execute `database-migration-enhanced-couples.sql` in Supabase

### 2. Create Storage Bucket
Set up `couple-assets` bucket with public access

### 3. Test the Flow
Create a world and join with a second account

### 4. Customize
- Add more romantic name suggestions
- Adjust color theme
- Customize confetti colors
- Add more optional fields

---

## 💡 Tips

### Photo Upload:
- Supports: JPG, PNG, GIF, WebP
- Preview shows before upload
- Heart-framed display
- Stored in Supabase Storage

### Invite Codes:
- 8 characters (e.g., `ABC12345`)
- Uppercase only
- Excludes confusing chars (0, O, I, 1)
- Unique per couple

### Nicknames:
- Max 20 characters
- Optional but recommended
- Used throughout the app
- Can be updated later

---

## ✅ Checklist

- [ ] Run database migration
- [ ] Create `couple-assets` storage bucket
- [ ] Set storage policies
- [ ] Test create world flow
- [ ] Test join world flow
- [ ] Test photo upload
- [ ] Test name generator
- [ ] Verify confetti works
- [ ] Check mobile responsiveness
- [ ] Test error handling

---

**Your romantic onboarding is ready! 💕**

Users will be absolutely delighted by the beautiful, thoughtful experience you've created for them to start their digital love journey together.
