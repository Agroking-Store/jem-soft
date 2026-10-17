import { PrismaClient } from '@prisma/client';
import { LicBranchesData } from '../masterData/licBranches';

export const seedLicBranches = async (prisma: PrismaClient) => {
  console.log('Seeding LIC branches...');
  for (const branchData of LicBranchesData) {
    await prisma.licBranch.upsert({
      where: { branchCode: branchData.branchCode },
      update: branchData,
      create: branchData,
    });
    console.log(`Upserted LIC Branch: ${branchData.branchName}`);
  }
};