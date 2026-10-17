-- Add nomineeId column to Claim table
ALTER TABLE "Claim" ADD COLUMN "nomineeId" TEXT;

-- Add foreign key constraint
ALTER TABLE "Claim" ADD CONSTRAINT "Claim_nomineeId_fkey" FOREIGN KEY ("nomineeId") REFERENCES "Nominee"("id") ON DELETE SET NULL ON UPDATE CASCADE;