# 🏠 OurLittleWorld Setup Guide

This guide will walk you through setting up the **OurLittleWorld** project for local development.

---

## 📋 Prerequisites

Before you begin, ensure you have the following installed:
- **Node.js** (v20+ recommended)
- **PostgreSQL** (v14+ recommended)
- **npm** (comes with Node.js)

---

## 🚀 Getting Started

### 1. Install Dependencies
Clone the repository and install the project dependencies:

```bash
npm install
```

### 2. Configure Environment Variables
Locate the `.env` file in the root directory. If it doesn't exist, create it. Use the template below and fill in your actual credentials:

```bash
# Site URL (for Auth callbacks)
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Database Connection (PostgreSQL)
# Format: postgresql://USER:PASSWORD@HOST:PORT/DATABASE
DATABASE_URL="postgresql://your_user:your_password@localhost:5432/ourlittleworld_db"

# NextAuth Security
AUTH_SECRET="your_generated_secret_here" # Use 'node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'base64\'))"' to generate one

# SMTP (Email Provider for Login Codes)
SMTP_HOST="smtp.yourprovider.com"
SMTP_PORT=587
SMTP_USER="your-email@example.com"
SMTP_PASSWORD="your-app-password"
SMTP_FROM="OurLittleWorld <noreply@example.com>"

# AI Features
GEMINI_API_KEY="your_google_gemini_api_key"
```

---

## 🗄️ Database Management

### 3. Initialize & Migrate the Database
To apply the existing migrations and sync your database schema, run:

```bash
npx prisma migrate dev
```

If you are setting this up in a **production-like** environment or just want to apply existing migrations without creating a new one:

```bash
npx prisma migrate deploy
```

### 4. Generate Prisma Client
Always ensure your locally installed Prisma client is up-to-date with your schema:

```bash
npx prisma generate
```

---

## 💻 Running the Application

### 5. Start Development Server
Once the database is ready, start the dev server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## ✅ Post-Setup Checklist
- [ ] Registered a PostgreSQL database.
- [ ] `.env` variables updated.
- [ ] Database migrations applied successfully.
- [ ] Login email (SMTP) tested (if using OTP login).
