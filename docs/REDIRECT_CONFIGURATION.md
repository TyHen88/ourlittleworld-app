# ✅ Simplified Email Redirect Configuration

## Issue Fixed: "Failed to load response data"

The error was caused by the auth callback route trying to use PKCE flow which requires additional setup. I've simplified the configuration.

---

## 🔧 Current Configuration (Simplified)

### What Changed:

1. **Direct Redirect** - Email confirmation now redirects directly to `/onboarding`
   ```typescript
   emailRedirectTo: `${baseUrl}/onboarding`
   ```

2. **No Callback Route Needed** - Supabase handles the session automatically

3. **Simpler Flow** - Less complexity, fewer points of failure

---

## 🔄 How It Works Now:

1. **User registers** → Email sent with confirmation link
2. **User clicks link** → Supabase verifies email
3. **Supabase creates session** → Sets auth cookies
4. **User redirected** → Directly to `/onboarding` (authenticated!)

---

## ⚙️ Required Supabase Configuration

### Add Redirect URL to Supabase:

1. Go to **Supabase Dashboard**
2. Navigate to **Authentication** → **URL Configuration**  
3. Under **Redirect URLs**, add:
   ```
   http://localhost:3001/onboarding
   http://localhost:3001/**
   ```
4. Click **Save**

### For Production:
```
https://yourdomain.com/onboarding
https://yourdomain.com/**
```

---

## 🧪 Testing

### With Email Confirmation Enabled:

1. Register with a real email
2. Check inbox for confirmation email
3. Click the confirmation link
4. You should land on `/onboarding` (authenticated)
5. Create or join a couple

### With Email Confirmation Disabled (Development):

1. Register with any email
2. Immediately redirected to `/onboarding`
3. No email needed
4. Create or join a couple

---

## 📝 Email Template Variables

In your Supabase email template, you can use:

- `{{ .ConfirmationURL }}` - The full confirmation link
- `{{ .Email }}` - User's email
- `{{ .Token }}` - Confirmation token
- `{{ .SiteURL }}` - Your site URL

The `{{ .ConfirmationURL }}` automatically includes the `emailRedirectTo` parameter.

---

## 🎯 Summary

✅ **Simplified redirect** - Direct to `/onboarding`  
✅ **No callback route** - Supabase handles it  
✅ **Session automatic** - Auth cookies set by Supabase  
✅ **Less complexity** - Fewer moving parts  

**Next Step:** Add `http://localhost:3001/onboarding` to Supabase's allowed redirect URLs! 💕
