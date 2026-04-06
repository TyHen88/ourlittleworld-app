-- AlterTable
ALTER TABLE "users"
ADD COLUMN "world_theme" TEXT DEFAULT 'blush',
ADD COLUMN "world_theme_url" TEXT,
ADD COLUMN "world_theme_config" JSONB;

-- AlterTable
ALTER TABLE "couples"
ADD COLUMN "world_theme_url" TEXT,
ADD COLUMN "world_theme_config" JSONB;

-- CreateTable
CREATE TABLE "chat_read_states" (
    "user_id" UUID NOT NULL,
    "couple_id" UUID NOT NULL,
    "last_read_post_id" UUID,
    "last_read_created_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_read_states_pkey" PRIMARY KEY ("user_id","couple_id")
);

-- CreateIndex
CREATE INDEX "chat_read_states_couple_id_idx" ON "chat_read_states"("couple_id");

-- AddForeignKey
ALTER TABLE "chat_read_states" ADD CONSTRAINT "chat_read_states_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_read_states" ADD CONSTRAINT "chat_read_states_couple_id_fkey" FOREIGN KEY ("couple_id") REFERENCES "couples"("id") ON DELETE CASCADE ON UPDATE CASCADE;
