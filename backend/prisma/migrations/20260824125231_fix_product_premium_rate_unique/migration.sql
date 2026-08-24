/*
  Warnings:

  - You are about to drop the column `addDeposit` on the `PolicyLoan` table. All the data in the column will be lost.
  - You are about to drop the column `bpiInterest` on the `PolicyLoan` table. All the data in the column will be lost.
  - You are about to drop the column `chequeAmount` on the `PolicyLoan` table. All the data in the column will be lost.
  - You are about to drop the column `fuliDate` on the `PolicyLoan` table. All the data in the column will be lost.
  - You are about to drop the column `hlyInterest` on the `PolicyLoan` table. All the data in the column will be lost.
  - You are about to drop the column `loanNumber` on the `PolicyLoan` table. All the data in the column will be lost.
  - You are about to drop the column `loanRepaidAmount` on the `PolicyLoan` table. All the data in the column will be lost.
  - You are about to drop the column `loanTenure` on the `PolicyLoan` table. All the data in the column will be lost.
  - You are about to drop the column `netAmount` on the `PolicyLoan` table. All the data in the column will be lost.
  - You are about to drop the column `otherDeduction` on the `PolicyLoan` table. All the data in the column will be lost.
  - You are about to drop the column `prevLoanInterestRate` on the `PolicyLoan` table. All the data in the column will be lost.
  - You are about to drop the column `prevLoanTaken` on the `PolicyLoan` table. All the data in the column will be lost.
  - You are about to drop the column `revivalDeduction` on the `PolicyLoan` table. All the data in the column will be lost.
  - You are about to drop the column `totalLoanAmount` on the `PolicyLoan` table. All the data in the column will be lost.
  - You are about to drop the column `totalLoanGranted` on the `PolicyLoan` table. All the data in the column will be lost.
  - You are about to drop the column `xChargeDeduction` on the `PolicyLoan` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[productId,entryAge,secondaryAge,policyTerm,premiumPayingTerm,option]` on the table `ProductPremiumRate` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[riderId,entryAge,riderTerm]` on the table `RiderPremiumRate` will be added. If there are existing duplicate values, this will fail.
  - Made the column `interestRate` on table `PolicyLoan` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `riderTerm` to the `RiderPremiumRate` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "ProductPremiumRate_productId_entryAge_policyTerm_premiumPay_key";

-- DropIndex
DROP INDEX "RiderPremiumRate_riderId_entryAge_key";

-- AlterTable
ALTER TABLE "PolicyLoan" DROP COLUMN "addDeposit",
DROP COLUMN "bpiInterest",
DROP COLUMN "chequeAmount",
DROP COLUMN "fuliDate",
DROP COLUMN "hlyInterest",
DROP COLUMN "loanNumber",
DROP COLUMN "loanRepaidAmount",
DROP COLUMN "loanTenure",
DROP COLUMN "netAmount",
DROP COLUMN "otherDeduction",
DROP COLUMN "prevLoanInterestRate",
DROP COLUMN "prevLoanTaken",
DROP COLUMN "revivalDeduction",
DROP COLUMN "totalLoanAmount",
DROP COLUMN "totalLoanGranted",
DROP COLUMN "xChargeDeduction",
ADD COLUMN     "repayAmount" DECIMAL(65,30),
ADD COLUMN     "totalLoanInterestPaid" DECIMAL(65,30),
ADD COLUMN     "totalLoanRepaidAmount" DOUBLE PRECISION,
ALTER COLUMN "interestRate" SET NOT NULL;

-- AlterTable
ALTER TABLE "RiderPremiumRate" ADD COLUMN     "riderTerm" INTEGER NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "ProductPremiumRate_productId_entryAge_secondaryAge_policyTe_key" ON "ProductPremiumRate"("productId", "entryAge", "secondaryAge", "policyTerm", "premiumPayingTerm", "option");

-- CreateIndex
CREATE UNIQUE INDEX "RiderPremiumRate_riderId_entryAge_riderTerm_key" ON "RiderPremiumRate"("riderId", "entryAge", "riderTerm");
