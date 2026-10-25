import { PrismaClient } from "@prisma/client";
import { seedPremiumRatesStandard } from "./seedPremiumRatesStandard";
import { seedPremiumRates881 } from "./seedPremiumRates881";
import { seedPremiumRates774 } from "./seedPremiumRates774";
import { seedPremiumRates888 } from "./seedPremiumRates888";
import { seedPremiumRates889 } from "./seedPremiumRates889";
import { seedPremiumRates880 } from "./seedPremiumRates880";
import { seedPlan912PremiumRates } from "./seedPremiumRate912";
import { seedPremiumRates887 } from "./seedPremiumRates887";
import { seedRiderPremium714 } from "./seedRider714Rates";
import { seedRiderPremium715 } from "./seedRider715Rates";
import { seedRiderPremium717 } from "./seedRider717Rates";
import { seedRiderPremium720 } from "./seedRider720Rates";
import { seedRiderPremium721 } from "./seedRider721Rates";
import { seedRiderPremium733 } from "./seedRider733Rates";
import { seedRiderPremium736 } from "./seedRider736Rates";
import { seedRiderPremium745 } from "./seedRider745Rates";
import { seedRiderPremium748 } from "./seedRider748Rates";
import { seedRiderPremium760 } from "./seedRider760Rates";
import { seedRiderPremium771 } from "./seedRider771Rates";
import { seedRiderPremium881 } from "./seedRider881Rates";
import { seedRiderPremium883 } from "./seedRider883Rates";
import { seedRiderPremium888 } from "./seedRider888Rates";
import { seedRiderPremium889 } from "./seedRider889Rates";
import { seedRiderPremium912 } from "./seedRider912Rates";
import { seedRiderPremiumCIR } from "./seedRiderCIR";
import { seedRiderPremiumCIR889 } from "./seed889CIR";
import { seedPPT714 } from "./seedPPT714";
import { seedPPT715 } from "./seedPPT715";
import { seedPPT717 } from "./seedPPT717";
import { seedPPT733 } from "./seedPPT733";
import { seedPPT736 } from "./seedPPT736";
import { seedPPT760 } from "./seedPPT760";
import { seedPPT888 } from "./seedPPT888";
import { seedPPT748 } from "./seedPPT748";
import { seedPPT720 } from "./seedPPT720";
import { seedPPT721 } from "./seedPPT721";
import { seedPPT881 } from "./seedPPT881";
import { seedPPT745 } from "./seedPPT745";
import { seedPPT771 } from "./seedPPT771";
import { seedPPT883 } from "./seedPPT883";
import { seedPPT887 } from "./seedPPT887";
import { seedPPT751 } from "./seedPPT751";
import { seedPPT880 } from "./seedPPT880";
import { seedADDB717 } from "./seedADDB717";
import { seedADDB733 } from "./seedADDB733";
import { seedADDB736 } from "./seedADDB736";
import { seedADDB745 } from "./seedADDB745";
import { seedADDB760 } from "./seedADDB760";
import { seedADDB771 } from "./seedADDB771";
import { seedADDB881 } from "./seedADDBB881";
import { seedADDB883 } from "./seedADDB883";
import { seedADDB888 } from "./seedADDB888";
import { seedADDB912 } from "./seedADDB912";
import {
  seedPremiumRates833,
  seedRiderPremium833,
  seedModeFactors833,
} from "./seedPremiumRates833";
import {
  seedPremiumRates903,
  seedRiderPremium903,
  seedModeFactors903,
} from "./seedPremiumRates903";
import {
  seedPremiumRates123,
  seedRiderPremium123,
  seedModeFactors123,
} from "./seedPremiumRates123";
import {
  seedPremiumRates917,
  seedRiderPremium917,
  seedModeFactors917,
} from "./seedPremiumRates917";
import {
  seedPremiumRates915,
  seedRiderPremium915,
  seedModeFactors915,
} from "./seedPremiumRates915";

import {
  seedPremiumRates904,
  seedRiderPremium904,
  seedModeFactors904,
} from "./seedPremiumRates904";

export const seedPremiumRates = async (prisma: PrismaClient) => {
  console.log("Starting Premium Rates seeding...");

  await seedPremiumRatesStandard(prisma);
  await seedPremiumRates881(prisma);
  await seedPremiumRates774(prisma);
  await seedPremiumRates888(prisma);
  await seedPremiumRates889(prisma);
  await seedPremiumRates880(prisma);
  await seedPlan912PremiumRates(prisma);
  await seedPremiumRates887(prisma);
  await seedRiderPremium714(prisma);
  await seedRiderPremium715(prisma);
  await seedRiderPremium717(prisma);
  await seedRiderPremium720(prisma);
  await seedRiderPremium721(prisma);
  await seedRiderPremium733(prisma);
  await seedRiderPremium736(prisma);
  await seedRiderPremium745(prisma);
  await seedRiderPremium748(prisma);
  await seedRiderPremium760(prisma);
  await seedRiderPremium771(prisma);
  await seedRiderPremium881(prisma);
  await seedRiderPremium883(prisma);
  await seedRiderPremium888(prisma);
  await seedRiderPremium889(prisma);
  await seedRiderPremium912(prisma);
  await seedRiderPremiumCIR(prisma);
  await seedRiderPremiumCIR889(prisma);
  await seedPPT714(prisma);
  await seedPPT715(prisma);
  await seedPPT717(prisma);
  await seedPPT733(prisma);
  await seedPPT736(prisma);
  await seedPPT760(prisma);
  await seedPPT888(prisma);
  await seedPPT748(prisma);
  await seedPPT720(prisma);
  await seedPPT721(prisma);
  await seedPPT881(prisma);
  await seedPPT745(prisma);
  await seedPPT771(prisma);
  await seedPPT883(prisma);
  await seedPPT887(prisma);
  await seedPPT751(prisma);
  await seedPPT880(prisma);
  await seedADDB717(prisma);
  await seedADDB733(prisma);
  await seedADDB736(prisma);
  await seedADDB745(prisma);
  await seedADDB760(prisma);
  await seedADDB771(prisma);
  await seedADDB881(prisma);
  await seedADDB883(prisma);
  await seedADDB888(prisma);
  await seedADDB912(prisma);

  // Plan 833 (Jeevan Lakshya) - LIC legacy plan. Rated on a half-year age band
  // rather than completed years, so it carries its own seeder rather than
  // fitting the standard shape.
  await seedPremiumRates833(prisma);
  await seedRiderPremium833(prisma);
  await seedModeFactors833(prisma);

  // Plan 903 (Jeevan Arogya) - published annual HCB rates, four payment
  // modes, and the DAB rider present in the legacy plan catalogue.
  await seedPremiumRates903(prisma);
  await seedRiderPremium903(prisma);
  await seedModeFactors903(prisma);

  // Plan 123 (Jeevan Sanchay 12 Yrs) - LIC legacy plan. Half-year age band, a
  // formula rebate (3% of the rate plus 2 flat) and no riders at all.
  await seedPremiumRates123(prisma);
  await seedRiderPremium123(prisma);
  await seedModeFactors123(prisma);

  // Plan 917 (Single Premium Endowment) - 16 terms, single premium, GST 4.5%
  // and two riders (DAB + Term Rider Benefit). The high sum assured rebate
  // depends on sum assured only, so it lives in the plain SA table.
  await seedPremiumRates917(prisma);
  await seedRiderPremium917(prisma);
  await seedModeFactors917(prisma);

  // Plan 915 (LIC's New Jeevan Anand V02) - the predecessor of 715. Rated on
  // the nearer birthday (no half-year band), 2%/1% rate-based mode rebate and
  // three riders (DAB, TRB, CIR).
  await seedPremiumRates915(prisma);
  await seedRiderPremium915(prisma);
  await seedModeFactors915(prisma);

  // Plan 904 (LIC's Jeevan Arogya) - health plan. IDB 1,000/2,000/3,000/4,000
  // per day and MSB = 100 x IDB. tabularRate is the annual IDB-1,000 table
  // premium; lic904Calculator scales it and applies the mode/HCB rebates.
  await seedPremiumRates904(prisma);
  await seedRiderPremium904(prisma);
  await seedModeFactors904(prisma);

  console.log("Finished Premium Rates seeding.");
};
