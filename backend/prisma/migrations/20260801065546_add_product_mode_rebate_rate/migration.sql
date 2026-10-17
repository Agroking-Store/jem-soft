/*
  Warnings:

  - You are about to alter the column `rebatePerThousand` on the `ProductModeRebate` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `Decimal(10,2)`.

*/
-- AlterTable
ALTER TABLE "ProductModeRebate" ALTER COLUMN "rebatePerThousand" SET DATA TYPE DECIMAL(10,2);

-- CreateTable
CREATE TABLE "ProductModeRebateRate" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "premiumModeId" TEXT NOT NULL,
    "entryAge" INTEGER NOT NULL,
    "policyTerm" INTEGER NOT NULL,
    "rebatePerThousand" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "ProductModeRebateRate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProductModeRebateRate_productId_premiumModeId_entryAge_poli_key" ON "ProductModeRebateRate"("productId", "premiumModeId", "entryAge", "policyTerm");

-- AddForeignKey
ALTER TABLE "ProductModeRebateRate" ADD CONSTRAINT "ProductModeRebateRate_productId_fkey" FOREIGN KEY ("productId") REFERENCES "ProductMaster"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductModeRebateRate" ADD CONSTRAINT "ProductModeRebateRate_premiumModeId_fkey" FOREIGN KEY ("premiumModeId") REFERENCES "PremiumModeMaster"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
