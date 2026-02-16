# 📧 Email Template Setup Guide

## Beautiful Email Template Created! 💕

I've created a stunning, romantic email confirmation template for OurLittleWorld.

### Template Features:
- ✨ Gradient background (blush to lavender)
- 💕 Animated heart icon
- 📱 Fully mobile-responsive
- 🎨 Glassmorphism design
- 🔘 Beautiful CTA button with gradient
- 🔒 Security notice
- ✅ Professional footer

---

## How to Add Template to Supabase

### Step 1: Copy the Template

The template is located at:
```
email-templates/confirm-signup.html
```

### Step 2: Add to Supabase

1. **Go to Supabase Dashboard**
2. Navigate to **Authentication** → **Email Templates**
3. Click on **"Confirm signup"** template
4. **Delete the existing template**
5. **Copy the entire contents** of `email-templates/confirm-signup.html`
6. **Paste it** into the template editor
7. Click **Save**

### Step 3: Test the Email

1. Make sure email confirmation is **enabled**:
   - Go to **Authentication** → **Providers** → **Email**
   - Check ✅ "Enable email confirmations"
   - Save

2. Register a new user with a real email
3. Check your inbox for the beautiful confirmation email!

---

## Template Variables Available

Supabase provides these variables you can use:

- `{{ .Email }}` - User's email address
- `{{ .ConfirmationURL }}` - Email confirmation link
- `{{ .Token }}` - Confirmation token
- `{{ .TokenHash }}` - Hashed token
- `{{ .SiteURL }}` - Your site URL
- `{{ .RedirectTo }}` - Redirect URL after confirmation

---

## Other Email Templates to Customize

You can create matching templates for:

### 1. **Magic Link** (Passwordless Login)
```html
<h2>Sign in to OurLittleWorld 💕</h2>
<p>Click below to sign in:</p>
<a href="{{ .ConfirmationURL }}">Sign In</a>
```

### 2. **Reset Password**
```html
<h2>Reset Your Password 🔒</h2>
<p>Click below to reset your password:</p>
<a href="{{ .ConfirmationURL }}">Reset Password</a>
```

### 3. **Change Email**
```html
<h2>Confirm Email Change ✉️</h2>
<p>Click below to confirm your new email:</p>
<a href="{{ .ConfirmationURL }}">Confirm Change</a>
```

---

## Profile Page Created! 👤

I've also created a beautiful profile page at `/profile` with:

### Features:
- ✅ View and edit profile (name, avatar)
- ✅ Display couple information
- ✅ Show invite code (if partner hasn't joined)
- ✅ Copy invite code to clipboard
- ✅ View stats (posts, spending)
- ✅ Sign out button
- ✅ Redirect to onboarding if no couple

### Access Profile:
```
http://localhost:3001/profile
```

The profile page is accessible from the bottom navigation "Us" tab (Heart icon).

---

## Testing the Full Flow

### With Email Confirmation Enabled:

1. **Register** → `/register`
2. **Check email** → Click confirmation link
3. **Redirected to** → `/onboarding`
4. **Create/Join couple**
5. **Go to dashboard** → `/dashboard`
6. **View profile** → `/profile`

### With Email Confirmation Disabled (Development):

1. **Register** → `/register`
2. **Auto-confirmed** → Immediately active
3. **Redirected to** → `/onboarding`
4. **Create/Join couple**
5. **Go to dashboard** → `/dashboard`
6. **View profile** → `/profile`

---

## Next Steps

1. ✅ Add the email template to Supabase
2. ✅ Test registration with email confirmation
3. ✅ Customize other email templates (optional)
4. ✅ Test the profile page
5. ✅ Upload a profile picture (optional)

---

Made with 💕 by OurLittleWorld
