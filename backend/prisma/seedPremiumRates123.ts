/**
 * LIC Plan 123 - Jeevan Sanchay 12 Yrs (1997-01-16 to 2002-03-15).
 *
 * Every figure below was measured off LIC's own quote endpoint:
 *
 *   premium rates and rebates   POST https://vmprobl.i-magic.in/api/Calc/CalcPremium
 *   premium mode factors        measured off the same quote endpoint
 *
 * Three things make this plan different from the 7-series seeders.
 *
 * 1. It is rated on a HALF-YEAR age band, like plan 833:
 *
 *        ageBand = floor(complete months from DOB to the commencement date / 6)
 *
 *    Unlike 833 the rate steps are perfectly regular: the band 2A row and the
 *    band 2A-1 row always carry the same rate, so the printed integer-age table
 *    is enough to rebuild the whole grid. Rows are stored twice - once with
 *    ageBand set, once with ageBand null for callers that only know an integer
 *    age. The service prefers the band row when it has a date of birth.
 *
 * 2. The rebate is a formula, not a table:
 *
 *        rebate per 1000 = 3% of the tabular rate  +  2 flat
 *
 *    The flat 2 is LIC's mode rebate for yearly mode. The 3% part is the
 *    age-dependent half. Both are summed here because ProductAgeTermRebate
 *    stores one combined per-thousand figure. Rebates are identical across
 *    every sum-assured band, so a single min=0 / max=null slab covers all.
 *
 * 3. The plan has no riders. seedRiderPremium123 clears anything stale rather
 *    than inserting rates, so a re-run cannot leave an orphan rider behind.
 *
 * Mode factors: LIC reduces the rebate as well as the premium in non-yearly
 * modes, so the factor is not 1/n. Measured over every entry age 14-58 the
 * factor creeps down as the rate rises (it absorbs the flat 2 per 1000):
 *
 *   half-yearly 0.507870 at age 15 -> 0.507847 at age 58
 *   quarterly   0.257872 at age 15 -> 0.257854 at age 58
 *   monthly     0.090332 at age 15 -> 0.090314 at age 58
 *
 * Only one value fits per (plan, mode), so the midpoint of each range is stored
 * at six decimals. That leaves at most about 1.5 rupees on a ten lakh policy.
 */
import { PrismaClient } from "@prisma/client";

const PLAN_NUMBER = "123";

/** [entryAge, ageBand, policyTerm, premiumPayingTerm, tabularRatePer1000] */
const RATE_ROWS: [number, number | null, number, number, number][] = [
  [14, null, 12, 12, 115.15],
  [14, 28, 12, 12, 115.15],
  [14, 29, 12, 12, 115.15],
  [15, null, 12, 12, 115.15],
  [15, 30, 12, 12, 115.15],
  [15, 31, 12, 12, 115.15],
  [16, null, 12, 12, 115.15],
  [16, 32, 12, 12, 115.15],
  [16, 33, 12, 12, 115.15],
  [17, null, 12, 12, 115.15],
  [17, 34, 12, 12, 115.15],
  [17, 35, 12, 12, 115.15],
  [18, null, 12, 12, 115.15],
  [18, 36, 12, 12, 115.15],
  [18, 37, 12, 12, 115.15],
  [19, null, 12, 12, 115.15],
  [19, 38, 12, 12, 115.15],
  [19, 39, 12, 12, 115.15],
  [20, null, 12, 12, 115.15],
  [20, 40, 12, 12, 115.15],
  [20, 41, 12, 12, 115.15],
  [21, null, 12, 12, 115.15],
  [21, 42, 12, 12, 115.15],
  [21, 43, 12, 12, 115.15],
  [22, null, 12, 12, 115.15],
  [22, 44, 12, 12, 115.15],
  [22, 45, 12, 12, 115.15],
  [23, null, 12, 12, 115.15],
  [23, 46, 12, 12, 115.15],
  [23, 47, 12, 12, 115.15],
  [24, null, 12, 12, 115.15],
  [24, 48, 12, 12, 115.15],
  [24, 49, 12, 12, 115.20],
  [25, null, 12, 12, 115.20],
  [25, 50, 12, 12, 115.20],
  [25, 51, 12, 12, 115.20],
  [26, null, 12, 12, 115.20],
  [26, 52, 12, 12, 115.20],
  [26, 53, 12, 12, 115.30],
  [27, null, 12, 12, 115.30],
  [27, 54, 12, 12, 115.30],
  [27, 55, 12, 12, 115.35],
  [28, null, 12, 12, 115.35],
  [28, 56, 12, 12, 115.35],
  [28, 57, 12, 12, 115.45],
  [29, null, 12, 12, 115.45],
  [29, 58, 12, 12, 115.45],
  [29, 59, 12, 12, 115.55],
  [30, null, 12, 12, 115.55],
  [30, 60, 12, 12, 115.55],
  [30, 61, 12, 12, 115.65],
  [31, null, 12, 12, 115.65],
  [31, 62, 12, 12, 115.65],
  [31, 63, 12, 12, 115.85],
  [32, null, 12, 12, 115.85],
  [32, 64, 12, 12, 115.85],
  [32, 65, 12, 12, 115.95],
  [33, null, 12, 12, 115.95],
  [33, 66, 12, 12, 115.95],
  [33, 67, 12, 12, 116.10],
  [34, null, 12, 12, 116.10],
  [34, 68, 12, 12, 116.10],
  [34, 69, 12, 12, 116.30],
  [35, null, 12, 12, 116.30],
  [35, 70, 12, 12, 116.30],
  [35, 71, 12, 12, 116.55],
  [36, null, 12, 12, 116.55],
  [36, 72, 12, 12, 116.55],
  [36, 73, 12, 12, 116.85],
  [37, null, 12, 12, 116.85],
  [37, 74, 12, 12, 116.85],
  [37, 75, 12, 12, 117.15],
  [38, null, 12, 12, 117.15],
  [38, 76, 12, 12, 117.15],
  [38, 77, 12, 12, 117.50],
  [39, null, 12, 12, 117.50],
  [39, 78, 12, 12, 117.50],
  [39, 79, 12, 12, 117.90],
  [40, null, 12, 12, 117.90],
  [40, 80, 12, 12, 117.90],
  [40, 81, 12, 12, 118.40],
  [41, null, 12, 12, 118.40],
  [41, 82, 12, 12, 118.40],
  [41, 83, 12, 12, 118.95],
  [42, null, 12, 12, 118.95],
  [42, 84, 12, 12, 118.95],
  [42, 85, 12, 12, 119.55],
  [43, null, 12, 12, 119.55],
  [43, 86, 12, 12, 119.55],
  [43, 87, 12, 12, 120.20],
  [44, null, 12, 12, 120.20],
  [44, 88, 12, 12, 120.20],
  [44, 89, 12, 12, 120.95],
  [45, null, 12, 12, 120.95],
  [45, 90, 12, 12, 120.95],
  [45, 91, 12, 12, 121.80],
  [46, null, 12, 12, 121.80],
  [46, 92, 12, 12, 121.80],
  [46, 93, 12, 12, 122.70],
  [47, null, 12, 12, 122.70],
  [47, 94, 12, 12, 122.70],
  [47, 95, 12, 12, 123.70],
  [48, null, 12, 12, 123.70],
  [48, 96, 12, 12, 123.70],
  [48, 97, 12, 12, 124.75],
  [49, null, 12, 12, 124.75],
  [49, 98, 12, 12, 124.75],
  [49, 99, 12, 12, 125.95],
  [50, null, 12, 12, 125.95],
  [50, 100, 12, 12, 125.95],
  [50, 101, 12, 12, 127.25],
  [51, null, 12, 12, 127.25],
  [51, 102, 12, 12, 127.25],
  [51, 103, 12, 12, 128.70],
  [52, null, 12, 12, 128.70],
  [52, 104, 12, 12, 128.70],
  [52, 105, 12, 12, 130.25],
  [53, null, 12, 12, 130.25],
  [53, 106, 12, 12, 130.25],
  [53, 107, 12, 12, 131.95],
  [54, null, 12, 12, 131.95],
  [54, 108, 12, 12, 131.95],
  [54, 109, 12, 12, 133.80],
  [55, null, 12, 12, 133.80],
  [55, 110, 12, 12, 133.80],
  [55, 111, 12, 12, 135.80],
  [56, null, 12, 12, 135.80],
  [56, 112, 12, 12, 135.80],
  [56, 113, 12, 12, 137.95],
  [57, null, 12, 12, 137.95],
  [57, 114, 12, 12, 137.95],
  [57, 115, 12, 12, 140.30],
  [58, null, 12, 12, 140.30],
  [58, 116, 12, 12, 140.30],
];

/** [entryAge, ageBand, policyTerm, rebatePerThousand] = 3% of rate + 2 flat */
const REBATE_ROWS: [number, number | null, number, number][] = [
  [14, null, 12, 5.4545],
  [14, 28, 12, 5.4545],
  [14, 29, 12, 5.4545],
  [15, null, 12, 5.4545],
  [15, 30, 12, 5.4545],
  [15, 31, 12, 5.4545],
  [16, null, 12, 5.4545],
  [16, 32, 12, 5.4545],
  [16, 33, 12, 5.4545],
  [17, null, 12, 5.4545],
  [17, 34, 12, 5.4545],
  [17, 35, 12, 5.4545],
  [18, null, 12, 5.4545],
  [18, 36, 12, 5.4545],
  [18, 37, 12, 5.4545],
  [19, null, 12, 5.4545],
  [19, 38, 12, 5.4545],
  [19, 39, 12, 5.4545],
  [20, null, 12, 5.4545],
  [20, 40, 12, 5.4545],
  [20, 41, 12, 5.4545],
  [21, null, 12, 5.4545],
  [21, 42, 12, 5.4545],
  [21, 43, 12, 5.4545],
  [22, null, 12, 5.4545],
  [22, 44, 12, 5.4545],
  [22, 45, 12, 5.4545],
  [23, null, 12, 5.4545],
  [23, 46, 12, 5.4545],
  [23, 47, 12, 5.4545],
  [24, null, 12, 5.4545],
  [24, 48, 12, 5.4545],
  [24, 49, 12, 5.4560],
  [25, null, 12, 5.4560],
  [25, 50, 12, 5.4560],
  [25, 51, 12, 5.4560],
  [26, null, 12, 5.4560],
  [26, 52, 12, 5.4560],
  [26, 53, 12, 5.4590],
  [27, null, 12, 5.4590],
  [27, 54, 12, 5.4590],
  [27, 55, 12, 5.4605],
  [28, null, 12, 5.4605],
  [28, 56, 12, 5.4605],
  [28, 57, 12, 5.4635],
  [29, null, 12, 5.4635],
  [29, 58, 12, 5.4635],
  [29, 59, 12, 5.4665],
  [30, null, 12, 5.4665],
  [30, 60, 12, 5.4665],
  [30, 61, 12, 5.4695],
  [31, null, 12, 5.4695],
  [31, 62, 12, 5.4695],
  [31, 63, 12, 5.4755],
  [32, null, 12, 5.4755],
  [32, 64, 12, 5.4755],
  [32, 65, 12, 5.4785],
  [33, null, 12, 5.4785],
  [33, 66, 12, 5.4785],
  [33, 67, 12, 5.4830],
  [34, null, 12, 5.4830],
  [34, 68, 12, 5.4830],
  [34, 69, 12, 5.4890],
  [35, null, 12, 5.4890],
  [35, 70, 12, 5.4890],
  [35, 71, 12, 5.4965],
  [36, null, 12, 5.4965],
  [36, 72, 12, 5.4965],
  [36, 73, 12, 5.5055],
  [37, null, 12, 5.5055],
  [37, 74, 12, 5.5055],
  [37, 75, 12, 5.5145],
  [38, null, 12, 5.5145],
  [38, 76, 12, 5.5145],
  [38, 77, 12, 5.5250],
  [39, null, 12, 5.5250],
  [39, 78, 12, 5.5250],
  [39, 79, 12, 5.5370],
  [40, null, 12, 5.5370],
  [40, 80, 12, 5.5370],
  [40, 81, 12, 5.5520],
  [41, null, 12, 5.5520],
  [41, 82, 12, 5.5520],
  [41, 83, 12, 5.5685],
  [42, null, 12, 5.5685],
  [42, 84, 12, 5.5685],
  [42, 85, 12, 5.5865],
  [43, null, 12, 5.5865],
  [43, 86, 12, 5.5865],
  [43, 87, 12, 5.6060],
  [44, null, 12, 5.6060],
  [44, 88, 12, 5.6060],
  [44, 89, 12, 5.6285],
  [45, null, 12, 5.6285],
  [45, 90, 12, 5.6285],
  [45, 91, 12, 5.6540],
  [46, null, 12, 5.6540],
  [46, 92, 12, 5.6540],
  [46, 93, 12, 5.6810],
  [47, null, 12, 5.6810],
  [47, 94, 12, 5.6810],
  [47, 95, 12, 5.7110],
  [48, null, 12, 5.7110],
  [48, 96, 12, 5.7110],
  [48, 97, 12, 5.7425],
  [49, null, 12, 5.7425],
  [49, 98, 12, 5.7425],
  [49, 99, 12, 5.7785],
  [50, null, 12, 5.7785],
  [50, 100, 12, 5.7785],
  [50, 101, 12, 5.8175],
  [51, null, 12, 5.8175],
  [51, 102, 12, 5.8175],
  [51, 103, 12, 5.8610],
  [52, null, 12, 5.8610],
  [52, 104, 12, 5.8610],
  [52, 105, 12, 5.9075],
  [53, null, 12, 5.9075],
  [53, 106, 12, 5.9075],
  [53, 107, 12, 5.9585],
  [54, null, 12, 5.9585],
  [54, 108, 12, 5.9585],
  [54, 109, 12, 6.0140],
  [55, null, 12, 6.0140],
  [55, 110, 12, 6.0140],
  [55, 111, 12, 6.0740],
  [56, null, 12, 6.0740],
  [56, 112, 12, 6.0740],
  [56, 113, 12, 6.1385],
  [57, null, 12, 6.1385],
  [57, 114, 12, 6.1385],
  [57, 115, 12, 6.2090],
  [58, null, 12, 6.2090],
  [58, 116, 12, 6.2090],
];

/** [modeName, factor] */
const MODE_FACTORS: [string, number][] = [
  ["Yearly", 1],
  ["Half-Yearly", 0.507859],
  ["Quarterly", 0.257863],
  ["Monthly", 0.090323],
];

export const seedPremiumRates123 = async (prisma: PrismaClient) => {
  const product = await prisma.productMaster.findFirst({
    where: { planNumber: PLAN_NUMBER, productCode: { startsWith: "LEGACY-" } },
    select: { id: true, productName: true },
  });
  if (!product) {
    console.log(`  x Plan ${PLAN_NUMBER} not found`);
    return;
  }
  console.log(`  - Plan ${PLAN_NUMBER} (${product.productName}) premium rates`);

  // Scoped to this product only - never touches another plan's rows.
  await prisma.productPremiumRate.deleteMany({ where: { productId: product.id } });
  await prisma.productPremiumRate.createMany({
    data: RATE_ROWS.map(([entryAge, ageBand, policyTerm, premiumPayingTerm, tabularRate]) => ({
      productId: product.id,
      entryAge,
      ageBand,
      policyTerm,
      premiumPayingTerm,
      tabularRate,
    })),
  });

  await prisma.productAgeTermRebate.deleteMany({ where: { productId: product.id } });
  await prisma.productAgeTermRebate.createMany({
    data: REBATE_ROWS.map(([entryAge, ageBand, policyTerm, rebatePerThousand]) => ({
      productId: product.id,
      entryAge,
      ageBand,
      policyTerm,
      // LIC's rebate is flat across sum-assured bands for this plan.
      minSumAssured: 0,
      maxSumAssured: null,
      rebatePerThousand,
    })),
  });

  console.log(`      ${RATE_ROWS.length} rates, ${REBATE_ROWS.length} rebates`);
};

export const seedRiderPremium123 = async (prisma: PrismaClient) => {
  const product = await prisma.productMaster.findFirst({
    where: { planNumber: PLAN_NUMBER, productCode: { startsWith: "LEGACY-" } },
    select: { id: true },
  });
  if (!product) return;

  // Plan 123 has no riders. Clear anything a previous run or the sheet left.
  await prisma.riderPremiumRate.deleteMany({ where: { productId: product.id } });
  await prisma.productRider.deleteMany({ where: { productId: product.id } });
  console.log("      0 rider rates (plan has no riders)");
};

export const seedModeFactors123 = async (prisma: PrismaClient) => {
  const product = await prisma.productMaster.findFirst({
    where: { planNumber: PLAN_NUMBER, productCode: { startsWith: "LEGACY-" } },
    select: { id: true },
  });
  if (!product) return;

  const modes = await prisma.premiumModeMaster.findMany({
    where: { modeName: { in: MODE_FACTORS.map((m) => m[0]) } },
    select: { id: true, modeName: true },
  });

  for (const mode of modes) {
    const factor = MODE_FACTORS.find((m) => m[0] === mode.modeName)?.[1];
    if (factor === undefined) continue;
    await prisma.productPremiumModeFactor.upsert({
      where: { productId_premiumModeId: { productId: product.id, premiumModeId: mode.id } },
      update: { factor },
      create: { productId: product.id, premiumModeId: mode.id, factor },
    });
  }
  console.log(`      ${MODE_FACTORS.length} mode factors`);
};
