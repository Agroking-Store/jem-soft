import type { PrismaClient } from "@prisma/client";

/**
 * LIC Plan 866 - Dhan Varsha (UIN 512N349V01).
 *
 * Single-premium, non-linked, non-participating, individual savings life insurance plan.
 * Available from 2022-10-17 to 2023-03-31.
 *
 * Terms: 10 or 15 years.
 * Premium Paying Term (PPT): 1 (Single Premium).
 * Mode: Single ("O" / "Single").
 *
 * Sum Assured on Death Options:
 * - Option 1: 1.25 times of Tabular Premium for the chosen Basic Sum Assured.
 * - Option 2: 10 times of Tabular Premium for the chosen Basic Sum Assured.
 *
 * Tabular single premium rates per Rs 1,000 Basic Sum Assured (exclusive of GST):
 * - From official LIC sales brochure (Section 5 - Sample Illustrative Premium) & confirmed i-Magic JSON payload.
 *
 * [entryAge, policyTerm, premiumPayingTerm, option, tabularRate]
 */
const PLAN_NUMBER = "866";

const RATE_GRID: [number, number, number, number, number][] = [
  // Age 4 from verified i-Magic calculation response
  [4, 15, 1, 1, 882.8],
  [4, 15, 1, 2, 882.8],

  // Age 10: Brochure Page 5
  [10, 10, 1, 1, 953.5],
  [10, 15, 1, 1, 884.3],
  [10, 10, 1, 2, 801.1],
  [10, 15, 1, 2, 727.6],

  // Age 20: Brochure Page 5
  [20, 10, 1, 1, 954.55],
  [20, 15, 1, 1, 885.5],
  [20, 10, 1, 2, 828.85],
  [20, 15, 1, 2, 756.3],

  // Age 30: Brochure Page 5 & Benefit Illustrations Page 8 & 9
  [30, 10, 1, 1, 955.2],
  [30, 15, 1, 1, 886.75],
  [30, 10, 1, 2, 848.95],
  [30, 15, 1, 2, 798.7],

  // Age 40: Brochure Page 6
  [40, 10, 1, 1, 958.8],
  [40, 15, 1, 1, 893.05],
  [40, 10, 1, 2, 978.25],

  // Age 50: Brochure Page 6 (Option 1 only)
  [50, 10, 1, 1, 971.8],
  [50, 15, 1, 1, 913.2],

  // Age 60: Brochure Page 6 (Option 1 only)
  [60, 10, 1, 1, 999.0],
  [60, 15, 1, 1, 957.9],
];

const rateRows = RATE_GRID.flatMap(
  ([entryAge, policyTerm, premiumPayingTerm, option, tabularRate]) =>
    [null, entryAge * 2, entryAge * 2 + 1].map((ageBand) => ({
      entryAge,
      ageBand,
      policyTerm,
      premiumPayingTerm,
      option,
      tabularRate,
    })),
);

export const seedPremiumRates866 = async (prisma: PrismaClient) => {
  const product = await prisma.productMaster.findFirst({
    where: { planNumber: PLAN_NUMBER },
    select: { id: true, productName: true },
  });
  if (!product) {
    console.log("  x Plan " + PLAN_NUMBER + " not found");
    return;
  }

  console.log("  - Plan " + PLAN_NUMBER + " (" + product.productName + ") premium rates");
  await prisma.productPremiumRate.deleteMany({ where: { productId: product.id } });
  await prisma.productPremiumRate.createMany({
    data: rateRows.map((r) => ({ productId: product.id, ...r })),
  });

  // Ensure GST_RATE attribute (4.5% on single premium) is set
  const gstAttrMaster = await prisma.productAttributeMaster.findFirst({
    where: { attributeCode: "GST_RATE" },
    select: { id: true },
  });
  if (gstAttrMaster) {
    await prisma.productAttributeValue.upsert({
      where: {
        productId_attributeId: {
          productId: product.id,
          attributeId: gstAttrMaster.id,
        },
      },
      update: { value: "4.5" },
      create: {
        productId: product.id,
        attributeId: gstAttrMaster.id,
        value: "4.5",
      },
    });
  }

  console.log("      " + rateRows.length + " rates seeded");
};

export const seedRiderPremium866 = async (prisma: PrismaClient) => {
  const product = await prisma.productMaster.findFirst({
    where: { planNumber: PLAN_NUMBER },
    select: { id: true },
  });
  if (!product) return;

  await prisma.riderPremiumRate.deleteMany({ where: { productId: product.id } });
  await prisma.productRider.deleteMany({ where: { productId: product.id } });
  console.log("      0 rider rates for Plan 866");
};

export const seedModeFactors866 = async (prisma: PrismaClient) => {
  const product = await prisma.productMaster.findFirst({
    where: { planNumber: PLAN_NUMBER },
    select: { id: true },
  });
  if (!product) return;

  const singleMode = await prisma.premiumModeMaster.findFirst({
    where: {
      OR: [
        { modeName: { equals: "Single", mode: "insensitive" } },
        { modeCode: { in: ["SIN", "O", "S"] } },
      ],
    },
    select: { id: true },
  });

  if (singleMode) {
    await prisma.productPremiumModeFactor.upsert({
      where: {
        productId_premiumModeId: {
          productId: product.id,
          premiumModeId: singleMode.id,
        },
      },
      update: { factor: 1.0 },
      create: {
        productId: product.id,
        premiumModeId: singleMode.id,
        factor: 1.0,
      },
    });
    console.log("      1 mode factor (Single = 1.0) seeded");
  }
};
