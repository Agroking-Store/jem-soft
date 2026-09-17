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

  // Link Plan 774 to Waiver of Premium Rider in ProductRider
  const product774 = await prisma.productMaster.findFirst({
    where: { planNumber: '774' },
  });
  const wopRider = await prisma.riderMaster.findFirst({
    where: { riderCode: 'WOP' },
  });
  if (product774 && wopRider) {
    await prisma.productRider.upsert({
      where: {
        productId_riderId: {
          productId: product774.id,
          riderId: wopRider.id,
        },
      },
      update: {},
      create: {
        productId: product774.id,
        riderId: wopRider.id,
      },
    });
    console.log('Linked Plan 774 to Waiver of Premium Rider');
  }
};