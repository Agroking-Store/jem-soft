/*
  Warnings:

  - You are about to drop the column `branchCode` on the `Advisor` table. All the data in the column will be lost.
  - You are about to drop the column `agentCode` on the `Policy` table. All the data in the column will be lost.
  - You are about to drop the column `branchCode` on the `Policy` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Advisor" DROP COLUMN "branchCode",
ADD COLUMN     "agencyId" TEXT;

-- AlterTable
ALTER TABLE "Policy" DROP COLUMN "agentCode",
DROP COLUMN "branchCode",
ADD COLUMN     "branchId" TEXT;

-- CreateTable
CREATE TABLE "LicBranch" (
    "id" TEXT NOT NULL,
    "branchCode" TEXT NOT NULL,
    "branchName" TEXT NOT NULL,
    "division" TEXT,
    "address" TEXT,
    "state" TEXT,
    "pincode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LicBranch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Agency" (
    "id" TEXT NOT NULL,
    "agencyCode" TEXT NOT NULL,
    "agencyName" TEXT NOT NULL,
    "licenseNo" TEXT,
    "branchId" TEXT,
    "address" TEXT,
    "contactNo" TEXT,
    "email" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Agency_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LicBranch_branchCode_key" ON "LicBranch"("branchCode");

-- CreateIndex
CREATE UNIQUE INDEX "Agency_agencyCode_key" ON "Agency"("agencyCode");

-- AddForeignKey
ALTER TABLE "Policy" ADD CONSTRAINT "Policy_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "LicBranch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Advisor" ADD CONSTRAINT "Advisor_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Agency" ADD CONSTRAINT "Agency_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "LicBranch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
