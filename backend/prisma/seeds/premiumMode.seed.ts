import { PrismaClient } from '@prisma/client';
import { premiumModes } from '../masterData/premiumModes';

export const seedPremiumModes = async (prisma: PrismaClient) => {
  console.log('Seeding premium modes...');
  for (const mode of premiumModes) {
    await prisma.premiumModeMaster.upsert({
      where: { modeCode: mode.modeCode },
      update: {
        modeName: mode.modeName,
        months: mode.months,
        description: mode.description,
      },
      create: mode,
    });
    console.log(`Upserted premium mode: ${mode.modeName}`);
  }
};