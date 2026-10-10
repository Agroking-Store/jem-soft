/*
  Warnings:

  - You are about to drop the column `extraClass` on the `PolicyPremiumCalculation` table. All the data in the column will be lost.
  - You are about to drop the column `rebate` on the `PolicyPremiumCalculation` table. All the data in the column will be lost.
  - You are about to drop the column `saRebate` on the `PolicyPremiumCalculation` table. All the data in the column will be lost.
  - You are about to alter the column `rebatePerThousand` on the `ProductSumAssuredRebate` table. The data in that column could be lost. The data in that column will be cast from `Decimal(10,2)` to `Decimal(10,3)`.
  - A unique constraint covering the columns `[productId,minSumAssured]` on the table `ProductSumAssuredRebate` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "Nominee" DROP CONSTRAINT "Nominee_policyId_fkey";

-- DropForeignKey
ALTER TABLE "PolicyAttribute" DROP CONSTRAINT "PolicyAttribute_policyId_fkey";

-- DropForeignKey
ALTER TABLE "PolicyDocument" DROP CONSTRAINT "PolicyDocument_policyId_fkey";

-- DropForeignKey
ALTER TABLE "PolicyLoan" DROP CONSTRAINT "PolicyLoan_policyId_fkey";

-- DropForeignKey
ALTER TABLE "PolicyRider" DROP CONSTRAINT "PolicyRider_policyId_fkey";

-- DropForeignKey
ALTER TABLE "PremiumPayment" DROP CONSTRAINT "PremiumPayment_policyId_fkey";

-- DropForeignKey
ALTER TABLE "ProductAttributeValue" DROP CONSTRAINT "ProductAttributeValue_attributeId_fkey";

-- DropForeignKey
ALTER TABLE "ProductAttributeValue" DROP CONSTRAINT "ProductAttributeValue_productId_fkey";

-- DropForeignKey
ALTER TABLE "ProductPremiumRate" DROP CONSTRAINT "ProductPremiumRate_productId_fkey";

-- AlterTable
ALTER TABLE "PolicyPremiumCalculation" DROP COLUMN "extraClass",
DROP COLUMN "rebate",
DROP COLUMN "saRebate",
ADD COLUMN     "extraClassAmount" DECIMAL(18,2),
ADD COLUMN     "extraClassRate" DECIMAL(10,2),
ADD COLUMN     "rebateAmount" DECIMAL(18,2),
ADD COLUMN     "rebateRate" DECIMAL(10,3),
ADD COLUMN     "tabularPremium" DECIMAL(18,2);

-- AlterTable
ALTER TABLE "ProductSumAssuredRebate" ALTER COLUMN "rebatePerThousand" SET DATA TYPE DECIMAL(10,3);

-- CreateIndex
CREATE UNIQUE INDEX "ProductSumAssuredRebate_productId_minSumAssured_key" ON "ProductSumAssuredRebate"("productId", "minSumAssured");

-- AddForeignKey
ALTER TABLE "ProductPremiumRate" ADD CONSTRAINT "ProductPremiumRate_productId_fkey" FOREIGN KEY ("productId") REFERENCES "ProductMaster"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductAttributeValue" ADD CONSTRAINT "ProductAttributeValue_productId_fkey" FOREIGN KEY ("productId") REFERENCES "ProductMaster"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductAttributeValue" ADD CONSTRAINT "ProductAttributeValue_attributeId_fkey" FOREIGN KEY ("attributeId") REFERENCES "ProductAttributeMaster"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PolicyAttribute" ADD CONSTRAINT "PolicyAttribute_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "Policy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PolicyRider" ADD CONSTRAINT "PolicyRider_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "Policy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Nominee" ADD CONSTRAINT "Nominee_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "Policy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PremiumPayment" ADD CONSTRAINT "PremiumPayment_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "Policy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PolicyLoan" ADD CONSTRAINT "PolicyLoan_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "Policy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PolicyDocument" ADD CONSTRAINT "PolicyDocument_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "Policy"("id") ON DELETE CASCADE ON UPDATE CASCADE;
