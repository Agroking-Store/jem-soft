import { PrismaClient } from '@prisma/client';
import { policyStatuses } from '../masterData/policyStatuses';

export const seedPolicyStatuses = async (prisma: PrismaClient) => {
  console.log('Seeding policy statuses...');
  for (const status of policyStatuses) {
    await prisma.policyStatusMaster.upsert({
      where: { statusCode: status.statusCode },
      update: {
        statusName: status.statusName,
        description: status.description,
      },
      create: status,
    });
    console.log(`Upserted policy status: ${status.statusName}`);
  }
};