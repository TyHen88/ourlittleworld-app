-- CreateEnum
CREATE TYPE "ReminderSource" AS ENUM ('CUSTOM', 'TRIP');

-- CreateTable
CREATE TABLE "reminders" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "couple_id" UUID,
    "user_id" UUID,
    "trip_id" UUID,
    "created_by" UUID NOT NULL,
    "source" "ReminderSource" NOT NULL DEFAULT 'CUSTOM',
    "name" TEXT NOT NULL,
    "note" TEXT,
    "reminder_date_key" VARCHAR(10),
    "reminder_time" VARCHAR(5),
    "has_date" BOOLEAN NOT NULL DEFAULT false,
    "has_time" BOOLEAN NOT NULL DEFAULT false,
    "scheduled_for" TIMESTAMPTZ(6),
    "is_completed" BOOLEAN NOT NULL DEFAULT false,
    "completed_at" TIMESTAMPTZ(6),
    "notification_sent_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reminders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "reminders_trip_id_key" ON "reminders"("trip_id");

-- CreateIndex
CREATE INDEX "reminders_couple_id_idx" ON "reminders"("couple_id");

-- CreateIndex
CREATE INDEX "reminders_user_id_idx" ON "reminders"("user_id");

-- CreateIndex
CREATE INDEX "reminders_created_by_idx" ON "reminders"("created_by");

-- CreateIndex
CREATE INDEX "reminders_reminder_date_key_idx" ON "reminders"("reminder_date_key");

-- CreateIndex
CREATE INDEX "reminders_scheduled_for_idx" ON "reminders"("scheduled_for");

-- CreateIndex
CREATE INDEX "reminders_is_completed_scheduled_for_idx" ON "reminders"("is_completed", "scheduled_for");

-- AddForeignKey
ALTER TABLE "reminders" ADD CONSTRAINT "reminders_couple_id_fkey" FOREIGN KEY ("couple_id") REFERENCES "couples"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reminders" ADD CONSTRAINT "reminders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reminders" ADD CONSTRAINT "reminders_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reminders" ADD CONSTRAINT "reminders_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
