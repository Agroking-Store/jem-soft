/*
  Warnings:

  - A unique constraint covering the columns `[riderId,entryAge,riderTerm,option]` on the table `RiderPremiumRate` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "RiderPremiumRate_riderId_entryAge_riderTerm_key";

-- AlterTable
ALTER TABLE "RiderPremiumRate" ADD COLUMN     "option" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "RiderPremiumRate_riderId_entryAge_riderTerm_option_key" ON "RiderPremiumRate"("riderId", "entryAge", "riderTerm", "option");
