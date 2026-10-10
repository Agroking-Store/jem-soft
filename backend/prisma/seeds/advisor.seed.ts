import { PrismaClient } from '@prisma/client';
import { advisorsData } from '../masterData/advisors';

export const seedAdvisors = async (prisma: PrismaClient) => {
  console.log('Seeding advisors...');
  const dbProviders = await prisma.insuranceProvider.findMany({ select: { id: true, code: true } });
  const dbAgencies = await prisma.agency.findMany({ select: { id: true, agencyCode: true } });

  for (const advisorData of advisorsData) {
    const provider = dbProviders.find(p => p.code === advisorData.providerCode);
    const agency = dbAgencies.find(a => a.agencyCode === advisorData.agencyCode);

    if (!provider) {
      console.warn(`Provider ${advisorData.providerCode} not found for advisor ${advisorData.advisorName}. Skipping.`);
      continue;
    }

    await prisma.advisor.upsert({
      where: { providerId_advisorCode: { providerId: provider.id, advisorCode: advisorData.advisorCode } },
      update: {
        advisorName: advisorData.advisorName,
        agencyId: agency?.id,
      },
      create: {
        providerId: provider.id,
        advisorName: advisorData.advisorName,
        advisorCode: advisorData.advisorCode,
        agencyId: agency?.id,
      },
    });
    console.log(`Upserted advisor: ${advisorData.advisorName}`);
  }
};