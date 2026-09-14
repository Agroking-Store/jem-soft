/*
  Warnings:

  - A unique constraint covering the columns `[riderId,productId,entryAge,riderTerm,premiumPayingTerm,option,gender]` on the table `RiderPremiumRate` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE');

-- DropIndex
DROP INDEX "RiderPremiumRate_riderId_productId_entryAge_riderTerm_premi_key";

-- AlterTable
ALTER TABLE "RiderPremiumRate" ADD COLUMN     "gender" "Gender";

-- CreateIndex
CREATE UNIQUE INDEX "RiderPremiumRate_riderId_productId_entryAge_riderTerm_premi_key" ON "RiderPremiumRate"("riderId", "productId", "entryAge", "riderTerm", "premiumPayingTerm", "option", "gender");
