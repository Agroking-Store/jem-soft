import { PrismaClient } from '@prisma/client';
import { paymentStatuses } from '../masterData/paymentStatuses';

export const seedPaymentStatuses = async (prisma: PrismaClient) => {
  console.log('Seeding payment statuses...');
  for (const status of paymentStatuses) {
    await prisma.paymentStatusMaster.upsert({
      where: { statusCode: status.statusCode },
      update: { statusName: status.statusName },
      create: status,
    });
    console.log(`Upserted payment status: ${status.statusName}`);
  }
};