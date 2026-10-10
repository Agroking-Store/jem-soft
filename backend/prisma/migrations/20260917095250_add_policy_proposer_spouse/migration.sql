-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'PREMIUM_PAID';
ALTER TYPE "NotificationType" ADD VALUE 'PREMIUM_UPDATED';
ALTER TYPE "NotificationType" ADD VALUE 'PREMIUM_DELETED';

-- AlterTable
ALTER TABLE "Policy" ADD COLUMN     "proposerId" TEXT,
ADD COLUMN     "spouseId" TEXT;

-- AddForeignKey
ALTER TABLE "Policy" ADD CONSTRAINT "Policy_proposerId_fkey" FOREIGN KEY ("proposerId") REFERENCES "CustomerMaster"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Policy" ADD CONSTRAINT "Policy_spouseId_fkey" FOREIGN KEY ("spouseId") REFERENCES "CustomerMaster"("id") ON DELETE SET NULL ON UPDATE CASCADE;
