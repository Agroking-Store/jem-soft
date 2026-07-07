import { PrismaClient } from '@prisma/client';
import { ridersData } from '../masterData/riders';

export const seedRiders = async (prisma: PrismaClient) => {
  console.log('Seeding riders...');
  for (const riderData of ridersData) {
    await prisma.riderMaster.upsert({
      where: { riderCode: riderData.riderCode },
      update: {
        riderName: riderData.riderName,
        description: riderData.description,
      },
      create: riderData,
    });
    console.log(`Upserted rider: ${riderData.riderName}`);
  }
};