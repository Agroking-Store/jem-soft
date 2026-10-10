/*
  Warnings:

  - You are about to drop the `Client` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `CustomerMasterId` to the `Policy` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Policy" DROP CONSTRAINT "Policy_clientId_fkey";

-- AlterTable
ALTER TABLE "Policy" ADD COLUMN     "CustomerMasterId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "ProductMaster" ADD COLUMN     "planNumber" TEXT;

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'VIEWER';

-- DropTable
DROP TABLE "Client";

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "companyName" TEXT,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "groupCode" TEXT,
    "groupName" TEXT,
    "category" TEXT,
    "mobilePersonal" TEXT,
    "emailPersonal" TEXT,
    "mobileBusiness" TEXT,
    "emailBusiness" TEXT,
    "prefCommAddress" TEXT,
    "resAddressLine1" TEXT,
    "resAddressLine2" TEXT,
    "resAddressLine3" TEXT,
    "resAddressLine4" TEXT,
    "resCity" TEXT,
    "resPin" TEXT,
    "resState" TEXT,
    "resCountry" TEXT DEFAULT 'India',
    "resArea" TEXT,
    "offAddressLine1" TEXT,
    "offAddressLine2" TEXT,
    "offAddressLine3" TEXT,
    "offAddressLine4" TEXT,
    "offCity" TEXT,
    "offPin" TEXT,
    "offState" TEXT,
    "offCountry" TEXT DEFAULT 'India',
    "offArea" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerMaster" (
    "id" TEXT NOT NULL,
    "groupId" TEXT,
    "salutation" TEXT,
    "firstName" TEXT NOT NULL,
    "middleName" TEXT,
    "lastName" TEXT NOT NULL,
    "gender" TEXT,
    "dob" TIMESTAMP(3),
    "isGroupHead" BOOLEAN NOT NULL DEFAULT false,
    "customerType" TEXT,
    "panNumber" TEXT,
    "aadhaarNumber" TEXT,
    "guardianId" TEXT,
    "salutationLetter" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerMaster_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerContactInfo" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "mobile1" TEXT,
    "mobile2" TEXT,
    "landline1Std" TEXT,
    "landline1Number" TEXT,
    "landline2Std" TEXT,
    "landline2Number" TEXT,
    "faxStd" TEXT,
    "faxNumber" TEXT,
    "emailPersonal" TEXT,
    "emailBusiness" TEXT,
    "skypeId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerContactInfo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerAddress" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "addressType" TEXT NOT NULL,
    "addressLine1" TEXT,
    "addressLine2" TEXT,
    "addressLine3" TEXT,
    "addressLine4" TEXT,
    "city" TEXT,
    "pin" TEXT,
    "country" TEXT DEFAULT 'India',
    "state" TEXT,
    "area" TEXT,
    "useGroupAddress" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerAddress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerBankDetails" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "ifscCode" TEXT,
    "bankName" TEXT,
    "bankBranch" TEXT,
    "city" TEXT,
    "accountType" TEXT,
    "accountNumber" TEXT,
    "micrNumber" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerBankDetails_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerMiscInfo" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "relationToGroup" TEXT,
    "dobForGreetings" TIMESTAMP(3),
    "marriageDate" TIMESTAMP(3),
    "isMarried" BOOLEAN NOT NULL DEFAULT false,
    "demiseDate" TIMESTAMP(3),
    "isDead" BOOLEAN NOT NULL DEFAULT false,
    "fatherName" TEXT,
    "motherName" TEXT,
    "spouseName" TEXT,
    "nationality" TEXT DEFAULT 'Indian',
    "qualification" TEXT,
    "occupationType" TEXT,
    "occupation" TEXT,
    "employer" TEXT,
    "natureOfDuties" TEXT,
    "referredBy" TEXT,
    "heightFt" TEXT,
    "weightKg" TEXT,
    "incomeSlab" TEXT,
    "religion" TEXT,
    "crmGroups" TEXT,
    "passportNumber" TEXT,
    "passportExpiryDate" TIMESTAMP(3),
    "gstNumber" TEXT,
    "specialNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerMiscInfo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerServicePreferences" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "preferredCommAddress" TEXT,
    "smsMarketing" BOOLEAN NOT NULL DEFAULT true,
    "emailMarketing" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerServicePreferences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Customer_email_key" ON "Customer"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_groupCode_key" ON "Customer"("groupCode");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerContactInfo_customerId_key" ON "CustomerContactInfo"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerMiscInfo_customerId_key" ON "CustomerMiscInfo"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerServicePreferences_customerId_key" ON "CustomerServicePreferences"("customerId");

-- AddForeignKey
ALTER TABLE "Policy" ADD CONSTRAINT "Policy_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Policy" ADD CONSTRAINT "Policy_CustomerMasterId_fkey" FOREIGN KEY ("CustomerMasterId") REFERENCES "CustomerMaster"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerMaster" ADD CONSTRAINT "CustomerMaster_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerMaster" ADD CONSTRAINT "CustomerMaster_guardianId_fkey" FOREIGN KEY ("guardianId") REFERENCES "CustomerMaster"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerContactInfo" ADD CONSTRAINT "CustomerContactInfo_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "CustomerMaster"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerAddress" ADD CONSTRAINT "CustomerAddress_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "CustomerMaster"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerBankDetails" ADD CONSTRAINT "CustomerBankDetails_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "CustomerMaster"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerMiscInfo" ADD CONSTRAINT "CustomerMiscInfo_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "CustomerMaster"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerServicePreferences" ADD CONSTRAINT "CustomerServicePreferences_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "CustomerMaster"("id") ON DELETE CASCADE ON UPDATE CASCADE;
