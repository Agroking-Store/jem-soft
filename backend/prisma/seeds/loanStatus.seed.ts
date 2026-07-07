import { PrismaClient } from '@prisma/client';
import { loanStatuses } from '../masterData/loanStatuses';

export const seedLoanStatuses = async (prisma: PrismaClient) => {
  console.log('Seeding loan statuses...');
  for (const status of loanStatuses) {
    await prisma.loanStatusMaster.upsert({
      where: { statusCode: status.statusCode },
      update: { statusName: status.statusName },
      create: status,
    });
    console.log(`Upserted loan status: ${status.statusName}`);
  }
};