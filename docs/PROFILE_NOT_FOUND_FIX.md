# 🔧 Quick Fix: Profile Not Found Error

## Error Message
```
{
    "code": "PGRST116",
    "details": "The result contains 0 rows",
    "message": "Cannot coerce the result to a single JSON object"
}
```

## What Happened
The profile doesn't exist in the database because:
1. We removed manual profile creation from the signup function
2. The database trigger hasn't been set up yet

## ✅ Quick Fix Applied

I've updated the profile page to automatically create the profile if it doesn't exist. This is a **temporary fallback** until you set up the proper database trigger.

### What Changed:
- Changed `.single()` to `.maybeSingle()` (doesn't error on missing rows)
- Added automatic profile creation if missing
- Profile page now works even without the trigger

---

## 🎯 Permanent Solution: Set Up Database Trigger

For the best setup, run the database trigger SQL:

### Step 1: Open Supabase SQL Editor
1. Go to **Supabase Dashboard**
2. Click **SQL Editor** in the left sidebar
3. Click **New Query**

### Step 2: Run the Trigger SQL
Copy and paste this entire script:

```sql
-- Automatic Profile Creation on Signup
-- This creates a profile automatically when a user signs up

-- 1. Create a function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create a trigger to call the function on user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

### Step 3: Click "Run"

---

## 🧪 Testing

### Test Without Trigger (Current Setup):
1. Login to your account
2. Go to `/profile`
3. Profile is automatically created ✅
4. You can edit and save changes

### Test With Trigger (Recommended):
1. Run the SQL trigger above
2. Register a new user
3. Profile is created automatically during signup
4. No manual creation needed

---

## 📝 How It Works Now

### Without Trigger (Fallback):
```typescript
// Profile page checks if profile exists
let profile = await supabase.from('profiles').select().maybeSingle();

// If not found, create it
if (!profile) {
  profile = await supabase.from('profiles').insert({
    id: user.id,
    email: user.email,
    full_name: user.user_metadata?.full_name
  });
}
```

### With Trigger (Recommended):
```sql
-- Trigger runs automatically when user signs up
-- Profile is created immediately
-- No manual creation needed
```

---

## 🎯 Recommendation

**For production:** Set up the database trigger (Step 2 above)

**For development:** The current fallback works fine, but the trigger is cleaner

---

## ✅ Status

- ✅ **Profile page fixed** - No more 406 error
- ✅ **Automatic profile creation** - Works with or without trigger
- ✅ **Graceful error handling** - Won't crash if profile missing

You can now use the app! The trigger is optional but recommended for cleaner code. 💕
