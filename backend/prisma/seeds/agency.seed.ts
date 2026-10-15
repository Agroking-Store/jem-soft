import { PrismaClient } from '@prisma/client';
import { agenciesData } from '../masterData/agencies';

export const seedAgencies = async (prisma: PrismaClient) => {
  console.log('Seeding agencies...');
  const dbBranches = await prisma.licBranch.findMany({ select: { id: true, branchCode: true } });

  for (const agencyData of agenciesData) {
    const branch = dbBranches.find(b => b.branchCode === agencyData.branchCode);
    if (!branch) {
      console.warn(`Branch ${agencyData.branchCode} not found for agency ${agencyData.agencyName}. Skipping.`);
      continue;
    }

    const { branchCode, ...createData } = agencyData;

    await prisma.agency.upsert({
      where: { agencyCode: agencyData.agencyCode },
      update: { ...createData, branchId: branch.id },
      create: { ...createData, branchId: branch.id },
    });
    console.log(`Upserted agency: ${agencyData.agencyName}`);
  }
};