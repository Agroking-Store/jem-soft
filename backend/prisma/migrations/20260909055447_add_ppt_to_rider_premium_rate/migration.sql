/*
  Warnings:

  - A unique constraint covering the columns `[riderId,entryAge,riderTerm,premiumPayingTerm,option]` on the table `RiderPremiumRate` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "RiderPremiumRate_riderId_entryAge_riderTerm_option_key";

-- AlterTable
ALTER TABLE "RiderPremiumRate" ADD COLUMN     "premiumPayingTerm" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "RiderPremiumRate_riderId_entryAge_riderTerm_premiumPayingTe_key" ON "RiderPremiumRate"("riderId", "entryAge", "riderTerm", "premiumPayingTerm", "option");
