-- DropForeignKey
ALTER TABLE "ebay_tokens" DROP CONSTRAINT "ebay_tokens_user_id_fkey";

-- AlterTable
ALTER TABLE "ebay_tokens" ALTER COLUMN "user_id" SET DATA TYPE TEXT;

-- AddForeignKey
ALTER TABLE "ebay_tokens" ADD CONSTRAINT "ebay_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;
