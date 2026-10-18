-- CreateTable
CREATE TABLE "ProductAgeTermRebate" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "entryAge" INTEGER NOT NULL,
    "policyTerm" INTEGER,
    "minSumAssured" DECIMAL(18,2) NOT NULL,
    "maxSumAssured" DECIMAL(18,2),
    "rebatePerThousand" DECIMAL(10,3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductAgeTermRebate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProductAgeTermRebate_productId_idx" ON "ProductAgeTermRebate"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductAgeTermRebate_productId_entryAge_policyTerm_minSumAssured_key" ON "ProductAgeTermRebate"("productId", "entryAge", "policyTerm", "minSumAssured");

-- AddForeignKey
ALTER TABLE "ProductAgeTermRebate" ADD CONSTRAINT "ProductAgeTermRebate_productId_fkey" FOREIGN KEY ("productId") REFERENCES "ProductMaster"("id") ON DELETE CASCADE ON UPDATE CASCADE;
