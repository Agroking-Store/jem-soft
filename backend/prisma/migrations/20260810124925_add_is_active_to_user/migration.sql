-- AlterTable
ALTER TABLE "PolicyLoan" ADD COLUMN     "addDeposit" DOUBLE PRECISION,
ADD COLUMN     "bpiInterest" DOUBLE PRECISION,
ADD COLUMN     "chequeAmount" DOUBLE PRECISION,
ADD COLUMN     "fuliDate" TIMESTAMP(3),
ADD COLUMN     "hlyInterest" DOUBLE PRECISION,
ADD COLUMN     "loanRepaidAmount" DOUBLE PRECISION,
ADD COLUMN     "netAmount" DOUBLE PRECISION,
ADD COLUMN     "otherDeduction" DOUBLE PRECISION,
ADD COLUMN     "prevLoanInterestRate" DOUBLE PRECISION,
ADD COLUMN     "prevLoanTaken" DOUBLE PRECISION,
ADD COLUMN     "repaymentDate" TIMESTAMP(3),
ADD COLUMN     "repaymentRemarks" TEXT,
ADD COLUMN     "revivalDeduction" DOUBLE PRECISION,
ADD COLUMN     "totalLoanAmount" DOUBLE PRECISION,
ADD COLUMN     "totalLoanGranted" DOUBLE PRECISION,
ADD COLUMN     "xChargeDeduction" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true;
