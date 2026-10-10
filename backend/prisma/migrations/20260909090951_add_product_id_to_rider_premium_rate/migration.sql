/*
  Warnings:

  - A unique constraint covering the columns `[riderId,productId,entryAge,riderTerm,premiumPayingTerm,option]` on the table `RiderPremiumRate` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `productId` to the `RiderPremiumRate` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "RiderPremiumRate_riderId_entryAge_riderTerm_premiumPayingTe_key";

-- AlterTable
ALTER TABLE "RiderPremiumRate" ADD COLUMN     "productId" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "RiderPremiumRate_riderId_productId_entryAge_riderTerm_premi_key" ON "RiderPremiumRate"("riderId", "productId", "entryAge", "riderTerm", "premiumPayingTerm", "option");

-- AddForeignKey
ALTER TABLE "RiderPremiumRate" ADD CONSTRAINT "RiderPremiumRate_productId_fkey" FOREIGN KEY ("productId") REFERENCES "ProductMaster"("id") ON DELETE CASCADE ON UPDATE CASCADE;
