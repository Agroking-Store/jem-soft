import { PrismaClient } from '@prisma/client';
import { providersData } from '../masterData/insuranceProviders';

export const seedInsuranceProviders = async (prisma: PrismaClient) => {
  console.log('Seeding insurance providers...');
  for (const providerData of providersData) {
    await prisma.insuranceProvider.upsert({
      where: { code: providerData.code },
      update: {
        name: providerData.name,
        type: providerData.type,
      },
      create: providerData,
    });
    console.log(`Upserted provider: ${providerData.name}`);
  }
};