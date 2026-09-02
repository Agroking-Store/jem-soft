import { PrismaClient } from "@prisma/client";
import { seedPremiumRatesStandard } from "./seedPremiumRatesStandard";
import { seedPremiumRates881 } from "./seedPremiumRates881";
import { seedPremiumRates774 } from "./seedPremiumRates774";
import { seedPremiumRates888 } from "./seedPremiumRates888";
import { seedPremiumRates889 } from "./seedPremiumRates889";
import { seedPlan912PremiumRates } from "./seedPremiumRate912";

export const seedPremiumRates = async (prisma: PrismaClient) => {
  console.log("Starting Premium Rates seeding...");

  await seedPremiumRatesStandard(prisma);
  await seedPremiumRates881(prisma);
  await seedPremiumRates774(prisma);
  await seedPremiumRates888(prisma);
  await seedPremiumRates889(prisma);
  await seedPlan912PremiumRates(prisma);

  console.log("Finished Premium Rates seeding.");
};