ALTER TABLE "reminders"
ADD COLUMN IF NOT EXISTS "is_deleted" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS "reminders_is_deleted_idx"
ON "reminders"("is_deleted");
