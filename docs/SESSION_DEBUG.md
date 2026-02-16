# 🔍 Session Debugging Guide

## Issue: "No session" after login

The session should persist after login. Let me help you debug this.

---

## ✅ Quick Fixes to Try:

### 1. Clear Browser Storage
The session might be corrupted. Clear it:
1. Open browser DevTools (F12)
2. Go to **Application** tab → **Storage**
3. Click **Clear site data**
4. Refresh the page
5. Try logging in again

### 2. Check Session in Browser Console
After logging in, open browser console and run:
```javascript
// Check if session exists in localStorage
console.log(localStorage.getItem('ourlittleworld-auth-token'));

// Or check Supabase session directly
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://vlgysrlqjngldfsugtem.supabase.co',
  'sb_publishable_7CJLT0e9RJ3rrydTcOP9XQ_eovZyR_4'
);
supabase.auth.getSession().then(console.log);
```

### 3. Verify Email is Confirmed
If email confirmation is enabled, make sure you clicked the confirmation link:
1. Check your email
2. Click the confirmation link
3. Wait for redirect to `/onboarding`
4. Then try logging in

### 4. Check Supabase Dashboard
1. Go to **Supabase Dashboard** → **Authentication** → **Users**
2. Find your user
3. Check if `email_confirmed_at` has a value
4. If it's `null`, the email isn't confirmed yet

---

## 🔧 Updated Configuration

I've updated `lib/supabase.ts` to properly persist sessions:

```typescript
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    storageKey: 'ourlittleworld-auth',
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  },
});
```

This ensures:
- ✅ Sessions are saved to localStorage
- ✅ Sessions persist across page refreshes
- ✅ Sessions work in client components

---

## 🧪 Test the Session Flow

### Step 1: Login
1. Go to `/login`
2. Enter email and password
3. Click "Sign In"

### Step 2: Check Session Immediately
Open browser console and run:
```javascript
localStorage.getItem('ourlittleworld-auth-token')
```

You should see a JWT token.

### Step 3: Navigate to Profile
1. Click on the "Us" tab (heart icon) in bottom nav
2. Or go directly to `/profile`
3. You should see your profile data

### Step 4: Refresh Page
1. Press F5 to refresh
2. You should still be logged in
3. Profile should still load

---

## 🐛 Common Issues

### "getCurrentUser returns null"
**Cause:** Session not persisted or expired

**Solution:**
1. Make sure you're logged in
2. Check localStorage for the auth token
3. Try logging out and back in
4. Clear browser storage and try again

### "Redirected to /login immediately"
**Cause:** No valid session found

**Solution:**
1. Email might not be confirmed
2. Session expired (default: 1 hour)
3. Clear storage and login again

### "Session works but profile doesn't load"
**Cause:** Profile not created in database

**Solution:**
1. Run the `auto-profile-trigger.sql` script
2. Check Supabase → Table Editor → profiles
3. Verify your user has a profile row

---

## 📝 Manual Session Check

Add this to any page to debug:

```typescript
useEffect(() => {
  const checkSession = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    console.log('Current session:', session);
    console.log('User:', session?.user);
    console.log('Expires at:', new Date(session?.expires_at * 1000));
  };
  checkSession();
}, []);
```

---

## 🔄 If Nothing Works

Try this complete reset:

1. **Clear all data**:
   ```javascript
   localStorage.clear();
   sessionStorage.clear();
   ```

2. **Delete user from Supabase**:
   - Dashboard → Authentication → Users
   - Delete your test user

3. **Register fresh**:
   - Go to `/register`
   - Use a new email
   - Complete email confirmation
   - Login
   - Check profile

---

**Next Step:** Try clearing browser storage and logging in again! 💕
