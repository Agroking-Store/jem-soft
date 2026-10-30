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
 * Tabular single premium rates per Rs 1,000 Basic Sum Assured (exclusive of GST).
 *
 * The complete age x term x option grid was crawled from LIC's live i-Magic
 * calculator on 2026-10-30 (commencement 2026-10-06). The engine confirms the
 * rate does not vary by gender, smoking status or sum assured. Option 2 is not
 * offered above entry age 40 (Term 10) or 35 (Term 15), so those combinations
 * are absent by design.
 *
 * [entryAge, policyTerm, premiumPayingTerm, option, tabularRate]
 */
const PLAN_NUMBER = "866";

const RATE_GRID: [number, number, number, number, number][] = [
  // T10 Opt1
  [8, 10, 1, 1, 953.1],
  [9, 10, 1, 1, 953.3],
  [10, 10, 1, 1, 953.5],
  [11, 10, 1, 1, 953.7],
  [12, 10, 1, 1, 953.9],
  [13, 10, 1, 1, 954.05],
  [14, 10, 1, 1, 954.2],
  [15, 10, 1, 1, 954.35],
  [16, 10, 1, 1, 954.4],
  [17, 10, 1, 1, 954.5],
  [18, 10, 1, 1, 954.5],
  [19, 10, 1, 1, 954.55],
  [20, 10, 1, 1, 954.55],
  [21, 10, 1, 1, 954.55],
  [22, 10, 1, 1, 954.6],
  [23, 10, 1, 1, 954.6],
  [24, 10, 1, 1, 954.65],
  [25, 10, 1, 1, 954.7],
  [26, 10, 1, 1, 954.75],
  [27, 10, 1, 1, 954.8],
  [28, 10, 1, 1, 954.9],
  [29, 10, 1, 1, 955.05],
  [30, 10, 1, 1, 955.2],
  [31, 10, 1, 1, 955.35],
  [32, 10, 1, 1, 955.55],
  [33, 10, 1, 1, 955.8],
  [34, 10, 1, 1, 956.1],
  [35, 10, 1, 1, 956.4],
  [36, 10, 1, 1, 956.75],
  [37, 10, 1, 1, 957.15],
  [38, 10, 1, 1, 957.6],
  [39, 10, 1, 1, 958.15],
  [40, 10, 1, 1, 958.8],
  [41, 10, 1, 1, 959.5],
  [42, 10, 1, 1, 960.3],
  [43, 10, 1, 1, 961.25],
  [44, 10, 1, 1, 962.3],
  [45, 10, 1, 1, 963.55],
  [46, 10, 1, 1, 964.9],
  [47, 10, 1, 1, 966.4],
  [48, 10, 1, 1, 968.1],
  [49, 10, 1, 1, 969.9],
  [50, 10, 1, 1, 971.8],
  [51, 10, 1, 1, 973.85],
  [52, 10, 1, 1, 976.05],
  [53, 10, 1, 1, 978.3],
  [54, 10, 1, 1, 980.7],
  [55, 10, 1, 1, 983.2],
  [56, 10, 1, 1, 985.9],
  [57, 10, 1, 1, 988.75],
  [58, 10, 1, 1, 991.85],
  [59, 10, 1, 1, 995.25],
  [60, 10, 1, 1, 999],
  // T10 Opt2
  [8, 10, 1, 2, 790.4],
  [9, 10, 1, 2, 795.65],
  [10, 10, 1, 2, 801.1],
  [11, 10, 1, 2, 806.45],
  [12, 10, 1, 2, 811.5],
  [13, 10, 1, 2, 815.95],
  [14, 10, 1, 2, 819.75],
  [15, 10, 1, 2, 822.75],
  [16, 10, 1, 2, 825.05],
  [17, 10, 1, 2, 826.65],
  [18, 10, 1, 2, 827.7],
  [19, 10, 1, 2, 828.4],
  [20, 10, 1, 2, 828.85],
  [21, 10, 1, 2, 829.2],
  [22, 10, 1, 2, 829.65],
  [23, 10, 1, 2, 830.35],
  [24, 10, 1, 2, 831.3],
  [25, 10, 1, 2, 832.75],
  [26, 10, 1, 2, 834.65],
  [27, 10, 1, 2, 837.15],
  [28, 10, 1, 2, 840.35],
  [29, 10, 1, 2, 844.25],
  [30, 10, 1, 2, 848.95],
  [31, 10, 1, 2, 854.6],
  [32, 10, 1, 2, 861.2],
  [33, 10, 1, 2, 868.9],
  [34, 10, 1, 2, 877.9],
  [35, 10, 1, 2, 888.4],
  [36, 10, 1, 2, 900.75],
  [37, 10, 1, 2, 915.25],
  [38, 10, 1, 2, 932.55],
  [39, 10, 1, 2, 953.25],
  [40, 10, 1, 2, 978.25],
  // T15 Opt1
  [3, 15, 1, 1, 882.8],
  [4, 15, 1, 1, 882.95],
  [5, 15, 1, 1, 883.1],
  [6, 15, 1, 1, 883.3],
  [7, 15, 1, 1, 883.55],
  [8, 15, 1, 1, 883.85],
  [9, 15, 1, 1, 884.05],
  [10, 15, 1, 1, 884.3],
  [11, 15, 1, 1, 884.55],
  [12, 15, 1, 1, 884.75],
  [13, 15, 1, 1, 884.9],
  [14, 15, 1, 1, 885.05],
  [15, 15, 1, 1, 885.2],
  [16, 15, 1, 1, 885.3],
  [17, 15, 1, 1, 885.35],
  [18, 15, 1, 1, 885.4],
  [19, 15, 1, 1, 885.45],
  [20, 15, 1, 1, 885.5],
  [21, 15, 1, 1, 885.5],
  [22, 15, 1, 1, 885.55],
  [23, 15, 1, 1, 885.6],
  [24, 15, 1, 1, 885.7],
  [25, 15, 1, 1, 885.8],
  [26, 15, 1, 1, 885.95],
  [27, 15, 1, 1, 886.1],
  [28, 15, 1, 1, 886.3],
  [29, 15, 1, 1, 886.5],
  [30, 15, 1, 1, 886.75],
  [31, 15, 1, 1, 887.1],
  [32, 15, 1, 1, 887.45],
  [33, 15, 1, 1, 887.85],
  [34, 15, 1, 1, 888.35],
  [35, 15, 1, 1, 888.9],
  [36, 15, 1, 1, 889.5],
  [37, 15, 1, 1, 890.25],
  [38, 15, 1, 1, 891.05],
  [39, 15, 1, 1, 892],
  [40, 15, 1, 1, 893.05],
  [41, 15, 1, 1, 894.3],
  [42, 15, 1, 1, 895.65],
  [43, 15, 1, 1, 897.2],
  [44, 15, 1, 1, 898.95],
  [45, 15, 1, 1, 900.85],
  [46, 15, 1, 1, 902.9],
  [47, 15, 1, 1, 905.2],
  [48, 15, 1, 1, 907.65],
  [49, 15, 1, 1, 910.35],
  [50, 15, 1, 1, 913.2],
  [51, 15, 1, 1, 916.25],
  [52, 15, 1, 1, 919.5],
  [53, 15, 1, 1, 922.95],
  [54, 15, 1, 1, 926.7],
  [55, 15, 1, 1, 930.75],
  [56, 15, 1, 1, 935.15],
  [57, 15, 1, 1, 939.95],
  [58, 15, 1, 1, 945.25],
  [59, 15, 1, 1, 951.2],
  [60, 15, 1, 1, 957.9],
  // T15 Opt2
  [3, 15, 1, 2, 693.95],
  [4, 15, 1, 2, 697.1],
  [5, 15, 1, 2, 700.85],
  [6, 15, 1, 2, 705],
  [7, 15, 1, 2, 710.8],
  [8, 15, 1, 2, 717.15],
  [9, 15, 1, 2, 722.35],
  [10, 15, 1, 2, 727.6],
  [11, 15, 1, 2, 732.7],
  [12, 15, 1, 2, 737.4],
  [13, 15, 1, 2, 741.6],
  [14, 15, 1, 2, 745.2],
  [15, 15, 1, 2, 748.15],
  [16, 15, 1, 2, 750.45],
  [17, 15, 1, 2, 752.3],
  [18, 15, 1, 2, 753.8],
  [19, 15, 1, 2, 755.05],
  [20, 15, 1, 2, 756.3],
  [21, 15, 1, 2, 757.65],
  [22, 15, 1, 2, 759.35],
  [23, 15, 1, 2, 761.4],
  [24, 15, 1, 2, 764.05],
  [25, 15, 1, 2, 767.4],
  [26, 15, 1, 2, 771.55],
  [27, 15, 1, 2, 776.6],
  [28, 15, 1, 2, 782.7],
  [29, 15, 1, 2, 790],
  [30, 15, 1, 2, 798.7],
  [31, 15, 1, 2, 809.05],
  [32, 15, 1, 2, 821.4],
  [33, 15, 1, 2, 836.1],
  [34, 15, 1, 2, 853.75],
  [35, 15, 1, 2, 874.95],
];

/**
 * 866 is priced on the nearer birthday, so one row per age is enough. The
 * service derives the nearest age from DOB + commencement (licNearestAge).
 */
const rateRows = RATE_GRID.map(
  ([entryAge, policyTerm, premiumPayingTerm, option, tabularRate]) => ({
    entryAge,
    ageBand: null,
    policyTerm,
    premiumPayingTerm,
    option,
    tabularRate,
  }),
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
