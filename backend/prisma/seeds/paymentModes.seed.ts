import { PrismaClient } from '@prisma/client';
import { paymentModes } from '../masterData/paymentModes';

export const seedPaymentModes = async (prisma: PrismaClient) => {
  console.log('Seeding payment modes...');
  for (const mode of paymentModes) {
    await prisma.paymentModeMaster.upsert({
      where: { modeCode: mode.modeCode },
      update: {
        modeName: mode.modeName,
        description: mode.description,
      },
      create: mode,
    });
    console.log(`Upserted payment mode: ${mode.modeName}`);
  }
};