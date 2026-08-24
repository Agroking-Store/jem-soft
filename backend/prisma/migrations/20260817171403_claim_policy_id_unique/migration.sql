/*
  Warnings:

  - A unique constraint covering the columns `[policyId]` on the table `Claim` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Claim_policyId_key" ON "Claim"("policyId");
