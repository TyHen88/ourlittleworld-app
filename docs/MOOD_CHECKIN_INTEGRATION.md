# 💕 Daily Mood Check-in Integration Guide

## Overview
Add a subtle daily mood check-in feature to the dashboard without changing existing styles.

---

## 1. Database Setup

Run in **Supabase SQL Editor**:
```sql
-- See: sql/daily-moods-table.sql
```

This creates:
- `daily_moods` table
- RLS policies (only couple members can read/write)
- Realtime enabled
- Indexes for performance

---

## 2. Integration Steps

### Add to Dashboard Header

Replace the header section in `app/(app)/dashboard/page.tsx`:

```tsx
import { DailyMoodBadge } from "@/components/moods/DailyMoodBadge";
import { DailyMoodModal } from "@/components/moods/DailyMoodModal";
import { Heart } from "lucide-react";

// Add state
const [moodModalOpen, setMoodModalOpen] = useState(false);
const [user, setUser] = useState<any>(null);
const [profile, setProfile] = useState<any>(null);

// In loadCoupleData, also set user and profile:
setUser(user);
setProfile(profile);

// Update header section:
<header className="flex items-center justify-between">
    <div className="flex items-center -space-x-3">
        <div className="relative">
            <Avatar className="w-12 h-12 border-4 border-white shadow-md">
                <AvatarFallback className="bg-romantic-blush text-romantic-heart">
                    {profile?.full_name?.[0] || 'M'}
                </AvatarFallback>
            </Avatar>
            {/* My mood badge */}
            {user && couple && (
                <DailyMoodBadge 
                    userId={user.id} 
                    coupleId={couple.id}
                    position="bottom-right"
                />
            )}
        </div>
        
        <div className="relative">
            <Avatar className="w-12 h-12 border-4 border-white shadow-md">
                <AvatarFallback className="bg-romantic-lavender text-slate-600">
                    J
                </AvatarFallback>
            </Avatar>
            {/* Partner's mood badge */}
            {couple && (
                <DailyMoodBadge 
                    userId={couple.partner_1_id === user?.id ? couple.partner_2_id : couple.partner_1_id} 
                    coupleId={couple.id}
                    position="bottom-right"
                />
            )}
        </div>
    </div>
    
    <div className="text-right">
        <h1 className="text-xl font-bold text-slate-800">Hi, Love</h1>
        {daysTogether > 0 && (
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">
                Day {daysTogether.toLocaleString()} Together
            </p>
        )}
    </div>
</header>

{/* Floating Heart Button (bottom-right of anniversary card) */}
{couple && (
    <motion.button
        onClick={() => setMoodModalOpen(true)}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        className="fixed bottom-24 right-6 w-14 h-14 bg-gradient-button rounded-full shadow-2xl flex items-center justify-center z-50"
    >
        <Heart className="text-white fill-white" size={24} />
    </motion.button>
)}

{/* Mood Modal */}
<DailyMoodModal 
    open={moodModalOpen} 
    onOpenChange={setMoodModalOpen}
/>
```

---

## 3. Realtime Subscription Example

The `DailyMoodBadge` component automatically handles realtime:

```tsx
// In DailyMoodBadge.tsx
const channel = supabase
    .channel(`daily_moods:${coupleId}`)
    .on(
        'postgres_changes',
        {
            event: '*', // INSERT, UPDATE, DELETE
            schema: 'public',
            table: 'daily_moods',
            filter: `couple_id=eq.${coupleId}`
        },
        (payload: any) => {
            // Update mood when partner submits
            if (payload.new?.user_id === userId) {
                setMood(payload.new.mood_emoji);
            }
        }
    )
    .subscribe();
```

**How it works**:
1. User A submits mood → INSERT into `daily_moods`
2. Supabase broadcasts change to all subscribed clients
3. User B's badge updates instantly (no refresh needed)

---

## 4. Features

### Mood Badge
- ✅ Shows emoji next to avatar
- ✅ Updates in realtime when partner submits
- ✅ Smooth scale animation on appear/disappear
- ✅ Only shows if mood submitted today
- ✅ Positioned bottom-right of avatar

### Floating Heart Button
- ✅ Fixed position (bottom-right, above nav)
- ✅ Gradient background matching theme
- ✅ Hover/tap animations
- ✅ Opens mood modal

### Mood Modal
- ✅ 8 emoji options (happy, lovey, tired, excited, etc.)
- ✅ Optional 100-char note
- ✅ Selected emoji highlights with gradient
- ✅ Submit with heart animation
- ✅ Mobile-friendly touch targets

---

## 5. User Flow

```
1. User taps floating heart button
   ↓
2. Modal opens: "How's your day, love? 😊"
   ↓
3. User selects emoji (e.g., ❤️)
   ↓
4. Optional: Add note "Feeling great today! 💕"
   ↓
5. Tap "Share My Mood"
   ↓
6. Server Action inserts/updates daily_moods
   ↓
7. Realtime broadcasts to partner
   ↓
8. Partner's app shows emoji badge next to avatar
   ↓
9. Modal closes with smooth animation
```

---

## 6. Database Schema

```sql
daily_moods (
    id UUID PRIMARY KEY,
    couple_id UUID (FK to couples),
    user_id UUID (FK to profiles),
    date DATE (default today),
    mood_emoji TEXT,
    note TEXT (optional),
    created_at TIMESTAMP,
    
    UNIQUE(user_id, date) -- One mood per user per day
)
```

**RLS**:
- Read: Only couple members
- Write: Only own moods
- Update: Only own moods

---

## 7. Testing

### Test Realtime
1. Open app in 2 browsers (User A & User B)
2. User A submits mood: 😊
3. User B should see 😊 badge appear instantly
4. User B submits mood: ❤️
5. User A should see ❤️ badge appear instantly

### Test Upsert
1. Submit mood: 😊 with note "Good morning"
2. Submit again: 🎉 with note "Great news!"
3. Check database: Should have 1 row (updated, not duplicated)

---

## 8. Styling Notes

**No changes to existing UI**:
- ✅ Keeps all current colors (blush, lavender, rose)
- ✅ Keeps all current animations
- ✅ Keeps all current layout
- ✅ Adds only:
  - Tiny emoji badges (6x6, bottom-right of avatars)
  - Floating heart button (bottom-right, fixed)
  - Modal (overlay, doesn't shift layout)

**Mobile-first**:
- Touch targets: 48px minimum
- Modal: Full-width on mobile
- Emoji grid: 4 columns
- No horizontal scroll

---

## 9. Performance

**Optimizations**:
- ✅ Realtime subscription only for couple_id
- ✅ Fetch only today's moods
- ✅ Upsert prevents duplicate rows
- ✅ Indexes on couple_id and date
- ✅ Unsubscribe on unmount

**Database queries**:
```sql
-- Initial fetch (fast with index)
SELECT mood_emoji FROM daily_moods 
WHERE user_id = ? AND date = CURRENT_DATE;

-- Realtime filter (efficient)
filter: `couple_id=eq.${coupleId}`
```

---

## 10. Future Enhancements

### Phase 2
- [ ] Mood history calendar
- [ ] Mood trends chart
- [ ] Couple mood compatibility
- [ ] Mood-based suggestions

### Phase 3
- [ ] Custom emoji upload
- [ ] Mood streaks
- [ ] Mood notifications
- [ ] Mood-based themes

---

## ✅ Checklist

- [ ] Run `sql/daily-moods-table.sql` in Supabase
- [ ] Add imports to dashboard
- [ ] Add state variables
- [ ] Update header with badges
- [ ] Add floating heart button
- [ ] Add modal component
- [ ] Test realtime with 2 browsers
- [ ] Test on mobile

---

**Your subtle mood check-in is ready!** 💕

Users can now share their daily mood with their partner, and see each other's moods update in realtime!
