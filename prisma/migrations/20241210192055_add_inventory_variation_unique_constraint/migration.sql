/*
  Warnings:

  - A unique constraint covering the columns `[inventory_id,name]` on the table `inventoryVariation` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "inventoryVariation_inventory_id_name_key" ON "inventoryVariation"("inventory_id", "name");
