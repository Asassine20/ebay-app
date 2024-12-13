/*
  Warnings:

  - Changed the type of `user_id` on the `ebay_tokens` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- DropForeignKey
ALTER TABLE "ebay_tokens" DROP CONSTRAINT "ebay_tokens_user_id_fkey";

-- AlterTable
ALTER TABLE "ebay_tokens" DROP COLUMN "user_id",
ADD COLUMN     "user_id" INTEGER NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "ebay_tokens_user_id_key" ON "ebay_tokens"("user_id");

-- AddForeignKey
ALTER TABLE "ebay_tokens" ADD CONSTRAINT "ebay_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
