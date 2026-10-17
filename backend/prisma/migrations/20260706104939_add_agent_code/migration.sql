-- AlterTable
ALTER TABLE "Policy" ADD COLUMN     "agentCode" TEXT;

-- CreateTable
CREATE TABLE "FamilyHistory" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FamilyHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FamilyHistoryRecord" (
    "id" TEXT NOT NULL,
    "familyHistoryId" TEXT NOT NULL,
    "relation" TEXT NOT NULL,
    "age" INTEGER NOT NULL,
    "stateOfHealth" TEXT NOT NULL,
    "isDead" BOOLEAN NOT NULL DEFAULT false,
    "ageAtDeath" INTEGER,
    "causeOfDeath" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FamilyHistoryRecord_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "FamilyHistory" ADD CONSTRAINT "FamilyHistory_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FamilyHistory" ADD CONSTRAINT "FamilyHistory_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "CustomerMaster"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FamilyHistoryRecord" ADD CONSTRAINT "FamilyHistoryRecord_familyHistoryId_fkey" FOREIGN KEY ("familyHistoryId") REFERENCES "FamilyHistory"("id") ON DELETE CASCADE ON UPDATE CASCADE;
