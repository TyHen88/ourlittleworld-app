# 🔒 Fixing RLS Policy Error

## Error: "new row violates row-level security policy for table 'profiles'"

This error occurs because the RLS policy is blocking profile creation during signup.

---

## ✅ Solution: Automatic Profile Creation with Database Trigger

The best practice is to use a **database trigger** that automatically creates a profile when a user signs up.

### Step 1: Run the Trigger SQL

1. Go to **Supabase Dashboard** → **SQL Editor**
2. Copy the entire contents of `auto-profile-trigger.sql`
3. Paste and click **Run**

This will:
- ✅ Create a function `handle_new_user()`
- ✅ Create a trigger on `auth.users` table
- ✅ Automatically create profile when user signs up
- ✅ Fix the RLS policy to allow the trigger

### Step 2: Test Signup

Now when you register:
1. User account is created in `auth.users`
2. Trigger automatically creates profile in `profiles` table
3. Profile includes `id`, `email`, and `full_name` from signup
4. No RLS errors!

---

## 🔄 How It Works

### Before (Manual Creation - RLS Error):
```typescript
// Server action tries to insert profile
supabase.from('profiles').insert({ ... })
// ❌ RLS blocks it because we're not authenticated yet
```

### After (Automatic Creation - Works!):
```sql
-- Trigger runs automatically when user signs up
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
-- ✅ Trigger has SECURITY DEFINER, bypasses RLS
```

---

## 📝 What the Trigger Does

```sql
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
```

- `NEW.id` - User ID from auth.users
- `NEW.email` - User email
- `NEW.raw_user_meta_data->>'full_name'` - Full name from signup metadata
- `SECURITY DEFINER` - Runs with elevated privileges, bypasses RLS

---

## 🧪 Testing

### Test the Trigger:

1. **Register a new user**:
   ```
   Email: test@example.com
   Password: password123
   Full Name: Test User
   ```

2. **Check the profiles table**:
   - Go to Supabase → Table Editor → profiles
   - You should see the new profile automatically created
   - With `id`, `email`, and `full_name` populated

3. **No RLS errors!** ✅

---

## 🔐 Updated RLS Policies

After running the trigger SQL, your RLS policies will be:

### Profiles Table:
- ✅ **SELECT**: Users can view their own profile
- ✅ **UPDATE**: Users can update their own profile
- ✅ **INSERT**: Authenticated users only (but trigger bypasses this)
- ❌ **DELETE**: Not allowed (for safety)

---

## 🐛 Troubleshooting

### "Trigger already exists"
**Solution:** The SQL script includes `DROP TRIGGER IF EXISTS`, so it's safe to run multiple times.

### "Profile not created"
**Solution:** 
1. Check Supabase logs for errors
2. Verify the trigger exists: `SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';`
3. Make sure you passed `full_name` in signup options

### "Still getting RLS error"
**Solution:**
1. Make sure you ran the entire `auto-profile-trigger.sql` script
2. Check that the INSERT policy was updated
3. Try deleting the user and registering again

---

## 📚 Additional Resources

- [Supabase Auth Triggers](https://supabase.com/docs/guides/auth/managing-user-data#using-triggers)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)

---

**Next Step:** Run `auto-profile-trigger.sql` in Supabase SQL Editor! 💕
