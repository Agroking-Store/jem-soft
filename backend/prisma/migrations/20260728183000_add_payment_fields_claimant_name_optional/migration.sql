-- AlterTable: Make claimantName optional
ALTER TABLE "Claim" ALTER COLUMN "claimantName" DROP NOT NULL;

-- AlterTable: Add payment fields
ALTER TABLE "Claim" ADD COLUMN "paymentType" TEXT;
ALTER TABLE "Claim" ADD COLUMN "chequeNumber" TEXT;
ALTER TABLE "Claim" ADD COLUMN "chequeDate" TIMESTAMP(3);
ALTER TABLE "Claim" ADD COLUMN "bankName" TEXT;
ALTER TABLE "Claim" ADD COLUMN "branchName" TEXT;
ALTER TABLE "Claim" ADD COLUMN "chequeAmount" DOUBLE PRECISION;
ALTER TABLE "Claim" ADD COLUMN "accountHolderName" TEXT;
ALTER TABLE "Claim" ADD COLUMN "accountNumber" TEXT;
ALTER TABLE "Claim" ADD COLUMN "ifscCode" TEXT;