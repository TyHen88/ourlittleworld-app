/*
  Warnings:

  - You are about to drop the column `partner_1_id` on the `couples` table. All the data in the column will be lost.
  - You are about to drop the column `partner_2_id` on the `couples` table. All the data in the column will be lost.
  - You are about to drop the column `date` on the `daily_moods` table. All the data in the column will be lost.
  - The `payer` column on the `transactions` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - A unique constraint covering the columns `[user_id,mood_date]` on the table `daily_moods` will be added. If there are existing duplicate values, this will fail.
  - Made the column `created_at` on table `couples` required. This step will fail if there are existing NULL values in that column.
  - Made the column `updated_at` on table `couples` required. This step will fail if there are existing NULL values in that column.
  - Made the column `created_at` on table `daily_moods` required. This step will fail if there are existing NULL values in that column.
  - Made the column `created_at` on table `posts` required. This step will fail if there are existing NULL values in that column.
  - Made the column `updated_at` on table `posts` required. This step will fail if there are existing NULL values in that column.
  - Made the column `created_at` on table `profiles` required. This step will fail if there are existing NULL values in that column.
  - Made the column `updated_at` on table `profiles` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `updated_at` to the `transactions` table without a default value. This is not possible if the table is not empty.
  - Made the column `created_by` on table `transactions` required. This step will fail if there are existing NULL values in that column.
  - Made the column `created_at` on table `transactions` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "Payer" AS ENUM ('HIS', 'HERS', 'SHARED');

-- DropForeignKey
ALTER TABLE "couples" DROP CONSTRAINT "couples_partner_1_id_fkey";

-- DropForeignKey
ALTER TABLE "couples" DROP CONSTRAINT "couples_partner_2_id_fkey";

-- DropForeignKey
ALTER TABLE "transactions" DROP CONSTRAINT "transactions_created_by_fkey";

-- DropIndex
DROP INDEX "daily_moods_user_id_date_key";

-- AlterTable
ALTER TABLE "couples" DROP COLUMN "partner_1_id",
DROP COLUMN "partner_2_id",
ALTER COLUMN "created_at" SET NOT NULL,
ALTER COLUMN "updated_at" SET NOT NULL,
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "daily_moods" DROP COLUMN "date",
ADD COLUMN     "mood_date" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "created_at" SET NOT NULL;

-- AlterTable
ALTER TABLE "posts" ALTER COLUMN "created_at" SET NOT NULL,
ALTER COLUMN "updated_at" SET NOT NULL,
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "profiles" ALTER COLUMN "created_at" SET NOT NULL,
ALTER COLUMN "updated_at" SET NOT NULL,
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "transactions" ADD COLUMN     "updated_at" TIMESTAMPTZ(6) NOT NULL,
DROP COLUMN "payer",
ADD COLUMN     "payer" "Payer",
ALTER COLUMN "created_by" SET NOT NULL,
ALTER COLUMN "created_at" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "daily_moods_user_id_mood_date_key" ON "daily_moods"("user_id", "mood_date");

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
