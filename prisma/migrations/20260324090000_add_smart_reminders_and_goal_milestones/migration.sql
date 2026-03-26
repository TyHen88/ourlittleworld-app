-- CreateEnum
CREATE TYPE "GoalType" AS ENUM ('SAVINGS', 'LEARNING', 'WEDDING', 'FUTURE_SELF', 'SOCIAL_CONTRACT', 'LONG_TERM_CHANGE');

-- CreateEnum
CREATE TYPE "GoalCadence" AS ENUM ('YEAR', 'MONTH', 'DAY');

-- CreateEnum
CREATE TYPE "GoalMilestoneStatus" AS ENUM ('PENDING', 'COMPLETED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "ReminderSourceType" AS ENUM ('GOAL_MILESTONE', 'GOAL', 'BUDGET_ALERT', 'DAILY_DIGEST');

-- CreateEnum
CREATE TYPE "ReminderTriggerType" AS ENUM ('GOAL_UPCOMING', 'GOAL_DUE', 'GOAL_OVERDUE', 'DAILY_DIGEST', 'BUDGET_WARNING', 'BUDGET_OVER', 'CATEGORY_SPIKE', 'NO_EXPENSE_LOG');

-- CreateEnum
CREATE TYPE "ReminderStatus" AS ENUM ('PENDING', 'PARTIAL', 'DELIVERED', 'FAILED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "ReminderChannel" AS ENUM ('EMAIL', 'TELEGRAM');

-- CreateEnum
CREATE TYPE "ReminderDeliveryStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'SKIPPED');

-- AlterTable
ALTER TABLE "savings_goals"
    ADD COLUMN IF NOT EXISTS "profile" JSONB,
    ADD COLUMN IF NOT EXISTS "reminder_at" TIMESTAMPTZ(6);

-- Normalize legacy goal types before converting to enum
UPDATE "savings_goals"
SET "type" = CASE
    WHEN "type" IS NULL OR "type" = '' THEN 'SAVINGS'
    WHEN "type" = 'TODO' THEN 'LONG_TERM_CHANGE'
    WHEN "type" IN ('SAVINGS', 'LEARNING', 'WEDDING', 'FUTURE_SELF', 'SOCIAL_CONTRACT', 'LONG_TERM_CHANGE') THEN "type"
    ELSE 'LONG_TERM_CHANGE'
END;

ALTER TABLE "savings_goals" ALTER COLUMN "type" DROP DEFAULT;
ALTER TABLE "savings_goals"
    ALTER COLUMN "type" TYPE "GoalType"
    USING ("type"::"GoalType");
ALTER TABLE "savings_goals" ALTER COLUMN "type" SET DEFAULT 'SAVINGS';

-- CreateTable
CREATE TABLE "goal_milestones" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "goal_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "cadence" "GoalCadence" NOT NULL,
    "due_at" TIMESTAMPTZ(6),
    "status" "GoalMilestoneStatus" NOT NULL DEFAULT 'PENDING',
    "order_index" INTEGER NOT NULL DEFAULT 0,
    "is_required" BOOLEAN NOT NULL DEFAULT true,
    "completed_at" TIMESTAMPTZ(6),
    "reminder_offset_minutes" INTEGER DEFAULT 1440,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "goal_milestones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_preferences" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "email_enabled" BOOLEAN NOT NULL DEFAULT true,
    "telegram_enabled" BOOLEAN NOT NULL DEFAULT false,
    "budget_alerts_enabled" BOOLEAN NOT NULL DEFAULT true,
    "daily_digest_enabled" BOOLEAN NOT NULL DEFAULT true,
    "tracking_nudges_enabled" BOOLEAN NOT NULL DEFAULT false,
    "quiet_hours_enabled" BOOLEAN NOT NULL DEFAULT false,
    "quiet_hours_start" INTEGER,
    "quiet_hours_end" INTEGER,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "digest_hour" INTEGER NOT NULL DEFAULT 20,
    "email_address" TEXT,
    "telegram_chat_id" TEXT,
    "telegram_verified" BOOLEAN NOT NULL DEFAULT false,
    "telegram_bound_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reminders" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "owner_user_id" UUID NOT NULL,
    "milestone_id" UUID,
    "source_type" "ReminderSourceType" NOT NULL,
    "trigger_type" "ReminderTriggerType" NOT NULL,
    "source_ref" TEXT,
    "dedupe_key" TEXT,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "analysis_summary" TEXT,
    "facts" JSONB,
    "status" "ReminderStatus" NOT NULL DEFAULT 'PENDING',
    "due_at" TIMESTAMPTZ(6) NOT NULL,
    "delivered_at" TIMESTAMPTZ(6),
    "acknowledged_at" TIMESTAMPTZ(6),
    "dismissed_at" TIMESTAMPTZ(6),
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reminders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reminder_deliveries" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "reminder_id" UUID NOT NULL,
    "channel" "ReminderChannel" NOT NULL,
    "status" "ReminderDeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "attempt_count" INTEGER NOT NULL DEFAULT 1,
    "error_message" TEXT,
    "provider_response" JSONB,
    "sent_at" TIMESTAMPTZ(6),
    "failed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reminder_deliveries_pkey" PRIMARY KEY ("id")
);

-- Seed notification preference rows for existing users
INSERT INTO "notification_preferences" ("user_id", "email_address")
SELECT "id", "email"
FROM "users"
ON CONFLICT ("user_id") DO NOTHING;

-- CreateIndex
CREATE INDEX "goal_milestones_goal_id_due_at_idx" ON "goal_milestones"("goal_id", "due_at");

-- CreateIndex
CREATE UNIQUE INDEX "notification_preferences_user_id_key" ON "notification_preferences"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "reminders_dedupe_key_key" ON "reminders"("dedupe_key");

-- CreateIndex
CREATE INDEX "reminders_owner_user_id_due_at_idx" ON "reminders"("owner_user_id", "due_at");

-- CreateIndex
CREATE INDEX "reminders_status_due_at_idx" ON "reminders"("status", "due_at");

-- CreateIndex
CREATE INDEX "reminder_deliveries_reminder_id_channel_idx" ON "reminder_deliveries"("reminder_id", "channel");

-- AddForeignKey
ALTER TABLE "goal_milestones" ADD CONSTRAINT "goal_milestones_goal_id_fkey" FOREIGN KEY ("goal_id") REFERENCES "savings_goals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reminders" ADD CONSTRAINT "reminders_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reminders" ADD CONSTRAINT "reminders_milestone_id_fkey" FOREIGN KEY ("milestone_id") REFERENCES "goal_milestones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reminder_deliveries" ADD CONSTRAINT "reminder_deliveries_reminder_id_fkey" FOREIGN KEY ("reminder_id") REFERENCES "reminders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
