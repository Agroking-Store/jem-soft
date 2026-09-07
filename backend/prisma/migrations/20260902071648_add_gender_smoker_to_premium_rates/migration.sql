/*
  Warnings:

  - A unique constraint covering the columns `[productId,entryAge,secondaryAge,gender,smoker,policyTerm,premiumPayingTerm,option]` on the table `ProductPremiumRate` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "ProductPremiumRate_productId_entryAge_secondaryAge_policyTe_key";

-- AlterTable
ALTER TABLE "ProductPremiumRate" ADD COLUMN     "gender" TEXT,
ADD COLUMN     "smoker" BOOLEAN;

-- CreateIndex
CREATE UNIQUE INDEX "ProductPremiumRate_productId_entryAge_secondaryAge_gender_s_key" ON "ProductPremiumRate"("productId", "entryAge", "secondaryAge", "gender", "smoker", "policyTerm", "premiumPayingTerm", "option");
