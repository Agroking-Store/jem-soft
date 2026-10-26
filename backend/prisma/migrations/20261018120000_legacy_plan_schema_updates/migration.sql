-- CreateTable
CREATE TABLE "ProductAgeTermRebate" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "entryAge" INTEGER NOT NULL,
    "policyTerm" INTEGER,
    "ageBand" INTEGER,
    "minSumAssured" DECIMAL(18,2) NOT NULL,
    "maxSumAssured" DECIMAL(18,2),
    "rebatePerThousand" DECIMAL(10,4) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductAgeTermRebate_pkey" PRIMARY KEY ("id")
);

-- AlterTable ProductPremiumRate
ALTER TABLE "ProductPremiumRate" ADD COLUMN "ageBand" INTEGER;

-- AlterTable RiderPremiumRate
ALTER TABLE "RiderPremiumRate" ALTER COLUMN "ratePerThousand" TYPE DECIMAL(10,3);
ALTER TABLE "RiderPremiumRate" ADD COLUMN "ageBand" INTEGER;

-- AlterTable ProductPremiumModeFactor
ALTER TABLE "ProductPremiumModeFactor" ALTER COLUMN "factor" TYPE DECIMAL(10,6);

-- CreateIndex
CREATE INDEX "ProductPremiumRate_productId_ageBand_idx" ON "ProductPremiumRate"("productId", "ageBand");

-- CreateIndex
CREATE INDEX "RiderPremiumRate_productId_ageBand_idx" ON "RiderPremiumRate"("productId", "ageBand");

-- CreateIndex
CREATE INDEX "ProductAgeTermRebate_productId_idx" ON "ProductAgeTermRebate"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductAgeTermRebate_productId_entryAge_policyTerm_ageBand_minSumAssured_key" ON "ProductAgeTermRebate"("productId", "entryAge", "policyTerm", "ageBand", "minSumAssured");

-- AddForeignKey
ALTER TABLE "ProductAgeTermRebate" ADD CONSTRAINT "ProductAgeTermRebate_productId_fkey" FOREIGN KEY ("productId") REFERENCES "ProductMaster"("id") ON DELETE CASCADE ON UPDATE CASCADE;
