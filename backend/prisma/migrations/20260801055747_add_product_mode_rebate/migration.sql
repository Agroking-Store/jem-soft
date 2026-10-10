-- CreateTable
CREATE TABLE "ProductModeRebate" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "premiumModeId" TEXT NOT NULL,
    "rebatePerThousand" DECIMAL(65,30) NOT NULL,

    CONSTRAINT "ProductModeRebate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProductModeRebate_productId_premiumModeId_key" ON "ProductModeRebate"("productId", "premiumModeId");

-- AddForeignKey
ALTER TABLE "ProductModeRebate" ADD CONSTRAINT "ProductModeRebate_productId_fkey" FOREIGN KEY ("productId") REFERENCES "ProductMaster"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductModeRebate" ADD CONSTRAINT "ProductModeRebate_premiumModeId_fkey" FOREIGN KEY ("premiumModeId") REFERENCES "PremiumModeMaster"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
