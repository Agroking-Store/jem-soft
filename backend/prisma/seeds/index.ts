import { PrismaClient } from '@prisma/client';
import { seedPolicyStatuses } from './policyStatus.seed';
import { seedPremiumModes } from './premiumMode.seed';
import { seedInsuranceProviders } from './insuranceProvider.seed';
import { seedLicBranches } from './licBranch.seed';
import { seedAgencies } from './agency.seed';
import { seedProductCategories } from './productCategory.seed';
import { seedProducts } from './product.seed';
import { seedAdvisors } from './advisor.seed';
import { seedRiders } from './rider.seed';
import { seedPaymentStatuses } from './paymentStatus.seed';
import { seedLoanStatuses } from './loanStatus.seed';

export const runSeeders = async (prisma: PrismaClient) => {
  await seedPolicyStatuses(prisma);
  await seedPremiumModes(prisma);
  await seedInsuranceProviders(prisma);
  await seedLicBranches(prisma);
  await seedAgencies(prisma);
  await seedProductCategories(prisma);
  await seedProducts(prisma);
  await seedAdvisors(prisma);
  await seedRiders(prisma);
  await seedPaymentStatuses(prisma);
  await seedLoanStatuses(prisma);
};

