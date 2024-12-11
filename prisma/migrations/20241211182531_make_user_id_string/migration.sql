-- DropForeignKey
ALTER TABLE "inventory" DROP CONSTRAINT "inventory_user_id_fkey";

-- AlterTable
ALTER TABLE "inventory" ALTER COLUMN "user_id" SET DATA TYPE TEXT;

-- AddForeignKey
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;
