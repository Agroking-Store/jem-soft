/*
  Warnings:

  - You are about to drop the column `repayAmount` on the `PolicyLoan` table. All the data in the column will be lost.
  - You are about to drop the column `repaymentDate` on the `PolicyLoan` table. All the data in the column will be lost.
  - You are about to drop the column `repaymentRemarks` on the `PolicyLoan` table. All the data in the column will be lost.
  - You are about to drop the column `totalLoanInterestPaid` on the `PolicyLoan` table. All the data in the column will be lost.
  - You are about to drop the column `totalLoanRepaidAmount` on the `PolicyLoan` table. All the data in the column will be lost.
  - You are about to drop the column `receiptNumber` on the `PremiumPayment` table. All the data in the column will be lost.
  - Added the required column `paymentModeId` to the `Policy` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "TemplateCategory" AS ENUM ('PREMIUM_DUE', 'POLICY_LAPSED', 'BIRTHDAY', 'ANNIVERSARY', 'MARKETING', 'CUSTOM');

-- CreateEnum
CREATE TYPE "CommunicationChannel" AS ENUM ('SMS', 'EMAIL', 'IN_APP', 'ALL');

-- CreateEnum
CREATE TYPE "DeliveryStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'SKIPPED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'PREMIUM_DUE';
ALTER TYPE "NotificationType" ADD VALUE 'POLICY_LAPSED';
ALTER TYPE "NotificationType" ADD VALUE 'BIRTHDAY';
ALTER TYPE "NotificationType" ADD VALUE 'MARKETING';
ALTER TYPE "NotificationType" ADD VALUE 'GENERAL';

-- AlterTable
ALTER TABLE "Policy" ADD COLUMN     "paymentModeId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "PolicyLoan" DROP COLUMN "repayAmount",
DROP COLUMN "repaymentDate",
DROP COLUMN "repaymentRemarks",
DROP COLUMN "totalLoanInterestPaid",
DROP COLUMN "totalLoanRepaidAmount";

-- AlterTable
ALTER TABLE "PremiumPayment" DROP COLUMN "receiptNumber",
ADD COLUMN     "paymentDetails" TEXT;

-- CreateTable
CREATE TABLE "PaymentModeMaster" (
    "id" TEXT NOT NULL,
    "modeName" TEXT NOT NULL,
    "modeCode" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentModeMaster_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoanRepayment" (
    "id" TEXT NOT NULL,
    "loanId" TEXT NOT NULL,
    "repaymentDate" TIMESTAMP(3) NOT NULL,
    "repaymentAmount" DECIMAL(65,30) NOT NULL,
    "principalComponent" DECIMAL(65,30) NOT NULL,
    "interestComponent" DECIMAL(65,30) NOT NULL,
    "paymentMode" TEXT NOT NULL,
    "referenceNumber" TEXT,
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoanRepayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationTemplate" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "TemplateCategory" NOT NULL DEFAULT 'PREMIUM_DUE',
    "channel" "CommunicationChannel" NOT NULL DEFAULT 'ALL',
    "subject" TEXT,
    "smsBody" TEXT,
    "emailBody" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "variables" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunicationLog" (
    "id" TEXT NOT NULL,
    "customerId" TEXT,
    "customerName" TEXT,
    "policyId" TEXT,
    "policyNumber" TEXT,
    "channel" "CommunicationChannel" NOT NULL,
    "recipient" TEXT NOT NULL,
    "subject" TEXT,
    "content" TEXT NOT NULL,
    "status" "DeliveryStatus" NOT NULL DEFAULT 'SENT',
    "errorMessage" TEXT,
    "triggerType" TEXT NOT NULL,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommunicationLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketingCampaign" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "channel" "CommunicationChannel" NOT NULL DEFAULT 'ALL',
    "templateId" TEXT,
    "customSubject" TEXT,
    "customMessage" TEXT,
    "targetCriteria" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "scheduledAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "totalRecipients" INTEGER NOT NULL DEFAULT 0,
    "successfulCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketingCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReminderSetting" (
    "id" TEXT NOT NULL,
    "isAutoReminderEnabled" BOOLEAN NOT NULL DEFAULT true,
    "dueDaysBefore" TEXT NOT NULL DEFAULT '30,15,7,1,0',
    "sendSms" BOOLEAN NOT NULL DEFAULT true,
    "sendEmail" BOOLEAN NOT NULL DEFAULT true,
    "sendInApp" BOOLEAN NOT NULL DEFAULT true,
    "isBirthdayWishesEnabled" BOOLEAN NOT NULL DEFAULT true,
    "cronScheduleTime" TEXT NOT NULL DEFAULT '09:00',
    "lastRunAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReminderSetting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PaymentModeMaster_modeCode_key" ON "PaymentModeMaster"("modeCode");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationTemplate_code_key" ON "NotificationTemplate"("code");

-- CreateIndex
CREATE INDEX "CommunicationLog_customerId_idx" ON "CommunicationLog"("customerId");

-- CreateIndex
CREATE INDEX "CommunicationLog_policyId_idx" ON "CommunicationLog"("policyId");

-- CreateIndex
CREATE INDEX "CommunicationLog_createdAt_idx" ON "CommunicationLog"("createdAt");

-- CreateIndex
CREATE INDEX "CommunicationLog_status_idx" ON "CommunicationLog"("status");

-- AddForeignKey
ALTER TABLE "Policy" ADD CONSTRAINT "Policy_paymentModeId_fkey" FOREIGN KEY ("paymentModeId") REFERENCES "PaymentModeMaster"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoanRepayment" ADD CONSTRAINT "LoanRepayment_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "PolicyLoan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketingCampaign" ADD CONSTRAINT "MarketingCampaign_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "NotificationTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
