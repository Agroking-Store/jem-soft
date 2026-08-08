/*
  Warnings:

  - You are about to alter the column `sumAssured` on the `PolicyPremiumCalculation` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `Decimal(18,2)`.
  - You are about to alter the column `basicYearlyPremium` on the `PolicyPremiumCalculation` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `Decimal(18,2)`.
  - You are about to alter the column `totalYearlyPremium` on the `PolicyPremiumCalculation` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `Decimal(18,2)`.
  - You are about to alter the column `installmentPremium` on the `PolicyPremiumCalculation` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `Decimal(18,2)`.
  - You are about to alter the column `gst` on the `PolicyPremiumCalculation` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `Decimal(18,2)`.
  - You are about to alter the column `extraClass` on the `PolicyPremiumCalculation` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `Decimal(18,2)`.
  - You are about to alter the column `rebate` on the `PolicyPremiumCalculation` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `Decimal(18,2)`.
  - You are about to alter the column `totalInstallmentPremium` on the `PolicyPremiumCalculation` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `Decimal(18,2)`.

*/
-- AlterTable
ALTER TABLE "PolicyPremiumCalculation" ADD COLUMN     "modeFactor" DECIMAL(8,4),
ADD COLUMN     "riderPremium" DECIMAL(18,2),
ADD COLUMN     "saRebate" DECIMAL(10,2),
ADD COLUMN     "tabularRate" DECIMAL(10,2),
ALTER COLUMN "sumAssured" SET DATA TYPE DECIMAL(18,2),
ALTER COLUMN "basicYearlyPremium" SET DATA TYPE DECIMAL(18,2),
ALTER COLUMN "totalYearlyPremium" SET DATA TYPE DECIMAL(18,2),
ALTER COLUMN "installmentPremium" SET DATA TYPE DECIMAL(18,2),
ALTER COLUMN "gst" SET DATA TYPE DECIMAL(18,2),
ALTER COLUMN "extraClass" SET DATA TYPE DECIMAL(18,2),
ALTER COLUMN "rebate" SET DATA TYPE DECIMAL(18,2),
ALTER COLUMN "totalInstallmentPremium" SET DATA TYPE DECIMAL(18,2);

-- CreateTable
CREATE TABLE "ProductPremiumRate" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "entryAge" INTEGER NOT NULL,
    "policyTerm" INTEGER NOT NULL,
    "premiumPayingTerm" INTEGER,
    "tabularRate" DECIMAL(10,2) NOT NULL,
    "effectiveFrom" TIMESTAMP(3),
    "effectiveTo" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductPremiumRate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductSumAssuredRebate" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "minSumAssured" DECIMAL(18,2) NOT NULL,
    "maxSumAssured" DECIMAL(18,2),
    "rebatePerThousand" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductSumAssuredRebate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductPremiumModeFactor" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "premiumModeId" TEXT NOT NULL,
    "factor" DECIMAL(8,4) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductPremiumModeFactor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RiderPremiumRate" (
    "id" TEXT NOT NULL,
    "riderId" TEXT NOT NULL,
    "entryAge" INTEGER NOT NULL,
    "ratePerThousand" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RiderPremiumRate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductRider" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "riderId" TEXT NOT NULL,
    "isMandatory" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ProductRider_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedicalHistory" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MedicalHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedicalHistoryRecord" (
    "id" TEXT NOT NULL,
    "medicalHistoryId" TEXT NOT NULL,
    "medicalHistoryDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "age" INTEGER,
    "gender" TEXT,
    "bloodGroup" TEXT NOT NULL,
    "bloodPressure" TEXT,
    "pulse" TEXT,
    "height" DOUBLE PRECISION,
    "weight" DOUBLE PRECISION,
    "chest" DOUBLE PRECISION,
    "abdomen" DOUBLE PRECISION,
    "identificationMark" TEXT,
    "spectaclesDetails" TEXT,
    "dentalDetails" TEXT,
    "majorIllness" TEXT,
    "operationAccident" TEXT,
    "specialReport" TEXT,
    "doctorName" TEXT,
    "medicalExaminationDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MedicalHistoryRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProductPremiumRate_productId_entryAge_policyTerm_premiumPay_key" ON "ProductPremiumRate"("productId", "entryAge", "policyTerm", "premiumPayingTerm");

-- CreateIndex
CREATE UNIQUE INDEX "ProductPremiumModeFactor_productId_premiumModeId_key" ON "ProductPremiumModeFactor"("productId", "premiumModeId");

-- CreateIndex
CREATE UNIQUE INDEX "RiderPremiumRate_riderId_entryAge_key" ON "RiderPremiumRate"("riderId", "entryAge");

-- CreateIndex
CREATE UNIQUE INDEX "ProductRider_productId_riderId_key" ON "ProductRider"("productId", "riderId");

-- AddForeignKey
ALTER TABLE "ProductPremiumRate" ADD CONSTRAINT "ProductPremiumRate_productId_fkey" FOREIGN KEY ("productId") REFERENCES "ProductMaster"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductSumAssuredRebate" ADD CONSTRAINT "ProductSumAssuredRebate_productId_fkey" FOREIGN KEY ("productId") REFERENCES "ProductMaster"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductPremiumModeFactor" ADD CONSTRAINT "ProductPremiumModeFactor_productId_fkey" FOREIGN KEY ("productId") REFERENCES "ProductMaster"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductPremiumModeFactor" ADD CONSTRAINT "ProductPremiumModeFactor_premiumModeId_fkey" FOREIGN KEY ("premiumModeId") REFERENCES "PremiumModeMaster"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiderPremiumRate" ADD CONSTRAINT "RiderPremiumRate_riderId_fkey" FOREIGN KEY ("riderId") REFERENCES "RiderMaster"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductRider" ADD CONSTRAINT "ProductRider_productId_fkey" FOREIGN KEY ("productId") REFERENCES "ProductMaster"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductRider" ADD CONSTRAINT "ProductRider_riderId_fkey" FOREIGN KEY ("riderId") REFERENCES "RiderMaster"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicalHistory" ADD CONSTRAINT "MedicalHistory_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "CustomerMaster"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicalHistoryRecord" ADD CONSTRAINT "MedicalHistoryRecord_medicalHistoryId_fkey" FOREIGN KEY ("medicalHistoryId") REFERENCES "MedicalHistory"("id") ON DELETE CASCADE ON UPDATE CASCADE;
