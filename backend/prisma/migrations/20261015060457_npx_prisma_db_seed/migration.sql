/*
  Warnings:

  - Made the column `groupCode` on table `Customer` required. This step will fail if there are existing NULL values in that column.
  - Made the column `groupName` on table `Customer` required. This step will fail if there are existing NULL values in that column.
  - Made the column `groupId` on table `CustomerMaster` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterEnum
ALTER TYPE "CommunicationChannel" ADD VALUE 'WHATSAPP';

-- DropForeignKey
ALTER TABLE "CustomerMaster" DROP CONSTRAINT "CustomerMaster_groupId_fkey";

-- AlterTable
ALTER TABLE "Customer" ALTER COLUMN "name" DROP NOT NULL,
ALTER COLUMN "email" DROP NOT NULL,
ALTER COLUMN "phone" DROP NOT NULL,
ALTER COLUMN "password" DROP NOT NULL,
ALTER COLUMN "groupCode" SET NOT NULL,
ALTER COLUMN "groupName" SET NOT NULL;

-- AlterTable
ALTER TABLE "CustomerMaster" ALTER COLUMN "groupId" SET NOT NULL,
ALTER COLUMN "lastName" DROP NOT NULL;

-- CreateTable
CREATE TABLE "Quotation" (
    "id" TEXT NOT NULL,
    "quotationRefNo" TEXT NOT NULL,
    "productType" TEXT NOT NULL,
    "quotationDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "commencementDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "customerId" TEXT,
    "memberId" TEXT,
    "groupCode" TEXT,
    "title" TEXT DEFAULT 'Mr.',
    "proposerName" TEXT NOT NULL,
    "gender" TEXT DEFAULT 'Male',
    "dateOfBirth" TIMESTAMP(3),
    "age" INTEGER NOT NULL,
    "isSmoker" BOOLEAN NOT NULL DEFAULT false,
    "extraPremiumClass" TEXT DEFAULT 'None',
    "sec80CLimit" DOUBLE PRECISION NOT NULL DEFAULT 150000,
    "taxSlabPercentage" DOUBLE PRECISION NOT NULL DEFAULT 30.9,
    "bonusScenario" TEXT NOT NULL DEFAULT 'LAST_DECLARED',
    "planId" TEXT,
    "planNumber" TEXT,
    "basis" TEXT DEFAULT 'Sum',
    "budget" DOUBLE PRECISION DEFAULT 0,
    "coverRequired" DOUBLE PRECISION DEFAULT 0,
    "premiumMode" TEXT NOT NULL DEFAULT 'Yearly',
    "policyTerm" INTEGER,
    "ppt" INTEGER,
    "sumAssured" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "basicPremium" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "gst" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "installmentPremium" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalPremium" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "maturityAmount" DOUBLE PRECISION DEFAULT 0,
    "calculationDetails" JSONB,
    "reportOptions" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Quotation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Quotation_quotationRefNo_key" ON "Quotation"("quotationRefNo");

-- AddForeignKey
ALTER TABLE "CustomerMaster" ADD CONSTRAINT "CustomerMaster_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quotation" ADD CONSTRAINT "Quotation_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quotation" ADD CONSTRAINT "Quotation_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "CustomerMaster"("id") ON DELETE SET NULL ON UPDATE CASCADE;
