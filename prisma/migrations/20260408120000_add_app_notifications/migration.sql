-- CreateTable
CREATE TABLE "app_notifications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "recipient_user_id" UUID NOT NULL,
    "actor_user_id" UUID,
    "couple_id" UUID,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "detail" TEXT,
    "url" TEXT NOT NULL DEFAULT '/dashboard',
    "metadata" JSONB,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "read_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "app_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "app_notifications_recipient_user_id_is_read_idx" ON "app_notifications"("recipient_user_id", "is_read");

-- CreateIndex
CREATE INDEX "app_notifications_recipient_user_id_created_at_idx" ON "app_notifications"("recipient_user_id", "created_at");

-- CreateIndex
CREATE INDEX "app_notifications_couple_id_idx" ON "app_notifications"("couple_id");

-- AddForeignKey
ALTER TABLE "app_notifications" ADD CONSTRAINT "app_notifications_recipient_user_id_fkey" FOREIGN KEY ("recipient_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app_notifications" ADD CONSTRAINT "app_notifications_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app_notifications" ADD CONSTRAINT "app_notifications_couple_id_fkey" FOREIGN KEY ("couple_id") REFERENCES "couples"("id") ON DELETE CASCADE ON UPDATE CASCADE;
