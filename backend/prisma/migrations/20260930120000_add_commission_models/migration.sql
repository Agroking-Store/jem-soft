-- CreateTable
CREATE TABLE "CommissionBill" (
    "id" TEXT NOT NULL,
    "billNumber" TEXT NOT NULL,
    "billDate" TIMESTAMP(3) NOT NULL,
    "agencyId" TEXT,
    "advisorId" TEXT,
    "agencyCode" TEXT,
    "billType" TEXT NOT NULL DEFAULT 'consolidated',
    "totalPremium" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "grossCommission" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "taxDeduction" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "netPayable" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fileName" TEXT,
    "fileUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommissionBill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommissionRecord" (
    "id" TEXT NOT NULL,
    "policyId" TEXT,
    "policyNumber" TEXT NOT NULL,
    "policyHolderName" TEXT,
    "groupCode" TEXT,
    "advisorId" TEXT,
    "agentCode" TEXT,
    "agencyId" TEXT,
    "billId" TEXT,
    "dueDate" TEXT,
    "dateOfPayment" TEXT,
    "premiumAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "commissionAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "commissionCode" INTEGER NOT NULL DEFAULT 1,
    "commissionDate" TEXT,
    "planTermPpt" TEXT,
    "category" TEXT NOT NULL DEFAULT 'first-comm',
    "recoveryCause" TEXT,
    "status" TEXT NOT NULL DEFAULT 'RECEIVED',
    "expectedAmount" DOUBLE PRECISION,
    "differenceAmount" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommissionRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommissionRule" (
    "id" TEXT NOT NULL,
    "planCode" TEXT,
    "minPpt" INTEGER NOT NULL DEFAULT 15,
    "maxPpt" INTEGER NOT NULL DEFAULT 99,
    "policyYearFrom" INTEGER NOT NULL DEFAULT 1,
    "policyYearTo" INTEGER NOT NULL DEFAULT 1,
    "commissionCode" INTEGER NOT NULL DEFAULT 1,
    "baseRate" DOUBLE PRECISION NOT NULL,
    "bonusRate" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommissionRule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CommissionBill_agencyId_idx" ON "CommissionBill"("agencyId");
CREATE INDEX "CommissionBill_advisorId_idx" ON "CommissionBill"("advisorId");

-- CreateIndex
CREATE INDEX "CommissionRecord_policyNumber_idx" ON "CommissionRecord"("policyNumber");
CREATE INDEX "CommissionRecord_status_idx" ON "CommissionRecord"("status");
CREATE INDEX "CommissionRecord_billId_idx" ON "CommissionRecord"("billId");
CREATE INDEX "CommissionRecord_advisorId_idx" ON "CommissionRecord"("advisorId");
CREATE INDEX "CommissionRecord_agencyId_idx" ON "CommissionRecord"("agencyId");

-- AddForeignKey
ALTER TABLE "CommissionBill" ADD CONSTRAINT "CommissionBill_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CommissionBill" ADD CONSTRAINT "CommissionBill_advisorId_fkey" FOREIGN KEY ("advisorId") REFERENCES "Advisor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionRecord" ADD CONSTRAINT "CommissionRecord_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "Policy"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CommissionRecord" ADD CONSTRAINT "CommissionRecord_advisorId_fkey" FOREIGN KEY ("advisorId") REFERENCES "Advisor"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CommissionRecord" ADD CONSTRAINT "CommissionRecord_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CommissionRecord" ADD CONSTRAINT "CommissionRecord_billId_fkey" FOREIGN KEY ("billId") REFERENCES "CommissionBill"("id") ON DELETE CASCADE ON UPDATE CASCADE;
