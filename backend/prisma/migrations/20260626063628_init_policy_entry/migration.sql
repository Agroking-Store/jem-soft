-- AlterTable
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'ADMIN';

-- CreateTable
CREATE TABLE "InsuranceProvider" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InsuranceProvider_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductCategory" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "categoryName" TEXT NOT NULL,
    "categoryCode" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductMaster" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "productCode" TEXT NOT NULL,
    "productType" TEXT,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductMaster_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductAttributeMaster" (
    "id" TEXT NOT NULL,
    "attributeName" TEXT NOT NULL,
    "attributeCode" TEXT NOT NULL,
    "dataType" TEXT NOT NULL,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductAttributeMaster_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductAttributeValue" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "attributeId" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductAttributeValue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PolicyStatusMaster" (
    "id" TEXT NOT NULL,
    "statusName" TEXT NOT NULL,
    "statusCode" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PolicyStatusMaster_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PremiumModeMaster" (
    "id" TEXT NOT NULL,
    "modeName" TEXT NOT NULL,
    "modeCode" TEXT NOT NULL,
    "months" INTEGER,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PremiumModeMaster_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RiderMaster" (
    "id" TEXT NOT NULL,
    "riderName" TEXT NOT NULL,
    "riderCode" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RiderMaster_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Policy" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "statusId" TEXT NOT NULL,
    "premiumModeId" TEXT NOT NULL,
    "advisorId" TEXT,
    "policyNumber" TEXT NOT NULL,
    "proposalNumber" TEXT,
    "issueDate" TIMESTAMP(3),
    "commencementDate" TIMESTAMP(3) NOT NULL,
    "maturityDate" TIMESTAMP(3),
    "policyTerm" INTEGER,
    "premiumPayingTerm" INTEGER,
    "nextPremiumDueDate" TIMESTAMP(3),
    "agentCode" TEXT,
    "branchCode" TEXT,
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Policy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PolicyAttribute" (
    "id" TEXT NOT NULL,
    "policyId" TEXT NOT NULL,
    "attributeId" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "PolicyAttribute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PolicyRider" (
    "id" TEXT NOT NULL,
    "policyId" TEXT NOT NULL,
    "riderId" TEXT NOT NULL,
    "riderAmount" DECIMAL(65,30),
    "riderPremium" DECIMAL(65,30),

    CONSTRAINT "PolicyRider_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Nominee" (
    "id" TEXT NOT NULL,
    "policyId" TEXT NOT NULL,
    "nomineeName" TEXT NOT NULL,
    "relationship" TEXT NOT NULL,
    "dateOfBirth" TIMESTAMP(3),
    "percentage" DECIMAL(65,30),
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Nominee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PremiumPayment" (
    "id" TEXT NOT NULL,
    "policyId" TEXT NOT NULL,
    "installmentNo" INTEGER,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "paidDate" TIMESTAMP(3),
    "premiumAmount" DECIMAL(65,30) NOT NULL,
    "lateFee" DECIMAL(65,30),
    "paymentMode" TEXT,
    "receiptNumber" TEXT,
    "paymentStatusId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PremiumPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PolicyLoan" (
    "id" TEXT NOT NULL,
    "policyId" TEXT NOT NULL,
    "loanNumber" TEXT,
    "loanAmount" DECIMAL(65,30) NOT NULL,
    "interestRate" DECIMAL(65,30),
    "loanDate" TIMESTAMP(3) NOT NULL,
    "loanStatusId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PolicyLoan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PolicyDocument" (
    "id" TEXT NOT NULL,
    "policyId" TEXT NOT NULL,
    "documentName" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PolicyDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Advisor" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "advisorCode" TEXT NOT NULL,
    "advisorName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "licenseNumber" TEXT,
    "panNumber" TEXT,
    "branchCode" TEXT,
    "designation" TEXT,
    "joiningDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Advisor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PolicyPremiumCalculation" (
    "id" TEXT NOT NULL,
    "policyId" TEXT NOT NULL,
    "sumAssured" DECIMAL(65,30) NOT NULL,
    "basicYearlyPremium" DECIMAL(65,30) NOT NULL,
    "totalYearlyPremium" DECIMAL(65,30) NOT NULL,
    "installmentPremium" DECIMAL(65,30) NOT NULL,
    "gst" DECIMAL(65,30),
    "extraClass" DECIMAL(65,30),
    "rebate" DECIMAL(65,30),
    "totalInstallmentPremium" DECIMAL(65,30) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PolicyPremiumCalculation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentStatusMaster" (
    "id" TEXT NOT NULL,
    "statusName" TEXT NOT NULL,
    "statusCode" TEXT NOT NULL,

    CONSTRAINT "PaymentStatusMaster_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoanStatusMaster" (
    "id" TEXT NOT NULL,
    "statusName" TEXT NOT NULL,
    "statusCode" TEXT NOT NULL,

    CONSTRAINT "LoanStatusMaster_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductAttributeOption" (
    "id" TEXT NOT NULL,
    "attributeId" TEXT NOT NULL,
    "optionLabel" TEXT NOT NULL,
    "optionValue" TEXT,
    "displayOrder" INTEGER,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductAttributeOption_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InsuranceProvider_code_key" ON "InsuranceProvider"("code");

-- CreateIndex
CREATE UNIQUE INDEX "ProductCategory_categoryCode_key" ON "ProductCategory"("categoryCode");

-- CreateIndex
CREATE UNIQUE INDEX "ProductMaster_providerId_productCode_key" ON "ProductMaster"("providerId", "productCode");

-- CreateIndex
CREATE UNIQUE INDEX "ProductAttributeMaster_attributeCode_key" ON "ProductAttributeMaster"("attributeCode");

-- CreateIndex
CREATE UNIQUE INDEX "ProductAttributeValue_productId_attributeId_key" ON "ProductAttributeValue"("productId", "attributeId");

-- CreateIndex
CREATE UNIQUE INDEX "PolicyStatusMaster_statusCode_key" ON "PolicyStatusMaster"("statusCode");

-- CreateIndex
CREATE UNIQUE INDEX "PremiumModeMaster_modeCode_key" ON "PremiumModeMaster"("modeCode");

-- CreateIndex
CREATE UNIQUE INDEX "RiderMaster_riderCode_key" ON "RiderMaster"("riderCode");

-- CreateIndex
CREATE UNIQUE INDEX "Policy_policyNumber_key" ON "Policy"("policyNumber");

-- CreateIndex
CREATE UNIQUE INDEX "PolicyAttribute_policyId_attributeId_key" ON "PolicyAttribute"("policyId", "attributeId");

-- CreateIndex
CREATE UNIQUE INDEX "PolicyRider_policyId_riderId_key" ON "PolicyRider"("policyId", "riderId");

-- CreateIndex
CREATE UNIQUE INDEX "Advisor_providerId_advisorCode_key" ON "Advisor"("providerId", "advisorCode");

-- CreateIndex
CREATE UNIQUE INDEX "PolicyPremiumCalculation_policyId_key" ON "PolicyPremiumCalculation"("policyId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentStatusMaster_statusCode_key" ON "PaymentStatusMaster"("statusCode");

-- CreateIndex
CREATE UNIQUE INDEX "LoanStatusMaster_statusCode_key" ON "LoanStatusMaster"("statusCode");

-- CreateIndex
CREATE UNIQUE INDEX "ProductAttributeOption_attributeId_optionLabel_key" ON "ProductAttributeOption"("attributeId", "optionLabel");

-- AddForeignKey
ALTER TABLE "ProductCategory" ADD CONSTRAINT "ProductCategory_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "InsuranceProvider"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductMaster" ADD CONSTRAINT "ProductMaster_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "InsuranceProvider"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductMaster" ADD CONSTRAINT "ProductMaster_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ProductCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductAttributeValue" ADD CONSTRAINT "ProductAttributeValue_productId_fkey" FOREIGN KEY ("productId") REFERENCES "ProductMaster"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductAttributeValue" ADD CONSTRAINT "ProductAttributeValue_attributeId_fkey" FOREIGN KEY ("attributeId") REFERENCES "ProductAttributeMaster"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Policy" ADD CONSTRAINT "Policy_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Policy" ADD CONSTRAINT "Policy_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "InsuranceProvider"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Policy" ADD CONSTRAINT "Policy_productId_fkey" FOREIGN KEY ("productId") REFERENCES "ProductMaster"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Policy" ADD CONSTRAINT "Policy_statusId_fkey" FOREIGN KEY ("statusId") REFERENCES "PolicyStatusMaster"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Policy" ADD CONSTRAINT "Policy_premiumModeId_fkey" FOREIGN KEY ("premiumModeId") REFERENCES "PremiumModeMaster"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Policy" ADD CONSTRAINT "Policy_advisorId_fkey" FOREIGN KEY ("advisorId") REFERENCES "Advisor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PolicyAttribute" ADD CONSTRAINT "PolicyAttribute_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "Policy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PolicyAttribute" ADD CONSTRAINT "PolicyAttribute_attributeId_fkey" FOREIGN KEY ("attributeId") REFERENCES "ProductAttributeMaster"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PolicyRider" ADD CONSTRAINT "PolicyRider_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "Policy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PolicyRider" ADD CONSTRAINT "PolicyRider_riderId_fkey" FOREIGN KEY ("riderId") REFERENCES "RiderMaster"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Nominee" ADD CONSTRAINT "Nominee_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "Policy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PremiumPayment" ADD CONSTRAINT "PremiumPayment_paymentStatusId_fkey" FOREIGN KEY ("paymentStatusId") REFERENCES "PaymentStatusMaster"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PremiumPayment" ADD CONSTRAINT "PremiumPayment_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "Policy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PolicyLoan" ADD CONSTRAINT "PolicyLoan_loanStatusId_fkey" FOREIGN KEY ("loanStatusId") REFERENCES "LoanStatusMaster"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PolicyLoan" ADD CONSTRAINT "PolicyLoan_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "Policy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PolicyDocument" ADD CONSTRAINT "PolicyDocument_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "Policy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Advisor" ADD CONSTRAINT "Advisor_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "InsuranceProvider"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PolicyPremiumCalculation" ADD CONSTRAINT "PolicyPremiumCalculation_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "Policy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductAttributeOption" ADD CONSTRAINT "ProductAttributeOption_attributeId_fkey" FOREIGN KEY ("attributeId") REFERENCES "ProductAttributeMaster"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
