import type { PrismaClient } from "@prisma/client";
import legacyPlans from "./masterData/legacyPlans.json";

/**
 * LIC Plan 856 - Pradhan Mantri Vaya Vandana Yojana (PMVVY), Modified-2020
 * (UIN 512G336V01).
 *
 * Single-premium pension plan for entry ages 60-99, policy term 10 years.
 * The amount paid is the purchase price, not a mortality-rated premium:
 * LIC returns 100% of the purchase price on maturity (or to the nominee on
 * death). i-magic's CalcPremium engine confirms this by returning
 * premiumRate = 0 and basicPremium = sum assured, with GST 0. The rate grid
 * therefore stores one zero-rate row per entry age and the calculator uses the
 * sum assured as the purchase price.
 *
 * Pension per Rs 1,000 of purchase price per annum (brochure):
 *   yearly 76.60, half-yearly 75.20, quarterly 74.50, monthly 74.00
 * Pension instalments are rounded to the nearest rupee.
 *
 * Purchase-price limits by pension mode (brochure):
 *   yearly      1,56,658 - 14,49,086
 *   half-yearly 1,59,574 - 14,76,064
 *   quarterly   1,61,074 - 14,89,933
 *   monthly     1,62,162 - 15,00,000
 *
 * GST is 0 for PMVVY. There are no riders.
 */
const PLAN_NUMBER = "856";

const ATTRIBUTES: [string, string][] = [
  ["GST_RATE", "0"],
  ["ALLOWED_PREMIUM_MODES", "Yearly,Half-Yearly,Quarterly,Monthly"],
  ["MIN_SUM_ASSURED", "156658"],
  ["MAX_SUM_ASSURED", "1500000"],
  ["DEFAULT_SUM_ASSURED", "156658"],
  ["PENSION_RATE_YEARLY", "76.60"],
  ["PENSION_RATE_HALF_YEARLY", "75.20"],
  ["PENSION_RATE_QUARTERLY", "74.50"],
  ["PENSION_RATE_MONTHLY", "74.00"],
  ["MIN_PURCHASE_PRICE_YEARLY", "156658"],
  ["MAX_PURCHASE_PRICE_YEARLY", "1449086"],
  ["MIN_PURCHASE_PRICE_HALF_YEARLY", "159574"],
  ["MAX_PURCHASE_PRICE_HALF_YEARLY", "1476064"],
  ["MIN_PURCHASE_PRICE_QUARTERLY", "161074"],
  ["MAX_PURCHASE_PRICE_QUARTERLY", "1489933"],
  ["MIN_PURCHASE_PRICE_MONTHLY", "162162"],
  ["MAX_PURCHASE_PRICE_MONTHLY", "1500000"],
];

const PENSION_ATTRIBUTES: [string, string][] = [
  ["PENSION_RATE_YEARLY", "Pension rate per Rs 1,000 purchase price - yearly"],
  ["PENSION_RATE_HALF_YEARLY", "Pension rate per Rs 1,000 purchase price - half-yearly"],
  ["PENSION_RATE_QUARTERLY", "Pension rate per Rs 1,000 purchase price - quarterly"],
  ["PENSION_RATE_MONTHLY", "Pension rate per Rs 1,000 purchase price - monthly"],
  ["MIN_PURCHASE_PRICE_YEARLY", "Minimum purchase price - yearly pension"],
  ["MAX_PURCHASE_PRICE_YEARLY", "Maximum purchase price - yearly pension"],
  ["MIN_PURCHASE_PRICE_HALF_YEARLY", "Minimum purchase price - half-yearly pension"],
  ["MAX_PURCHASE_PRICE_HALF_YEARLY", "Maximum purchase price - half-yearly pension"],
  ["MIN_PURCHASE_PRICE_QUARTERLY", "Minimum purchase price - quarterly pension"],
  ["MAX_PURCHASE_PRICE_QUARTERLY", "Maximum purchase price - quarterly pension"],
  ["MIN_PURCHASE_PRICE_MONTHLY", "Minimum purchase price - monthly pension"],
  ["MAX_PURCHASE_PRICE_MONTHLY", "Maximum purchase price - monthly pension"],
];

const MODE_CODES = ["YLY", "HLY", "QLY", "MLY", "SIN"] as const;

async function upsertAttribute(
  prisma: PrismaClient,
  productId: string,
  attributeCode: string,
  value: string,
) {
  const master = await prisma.productAttributeMaster.findUnique({
    where: { attributeCode },
    select: { id: true },
  });
  if (!master) return;

  await prisma.productAttributeValue.upsert({
    where: {
      productId_attributeId: { productId, attributeId: master.id },
    },
    update: { value },
    create: { productId, attributeId: master.id, value },
  });
}

export const seedPremiumRates856 = async (prisma: PrismaClient) => {
  const startedAt = Date.now();
  const product = await prisma.productMaster.findFirst({
    where: { planNumber: PLAN_NUMBER, productCode: "LEGACY-856" },
    select: { id: true, productName: true },
  });

  if (!product) {
    console.warn(
      `  x Plan ${PLAN_NUMBER} not found (LEGACY-856); skipping rates`,
    );
    return;
  }

  console.log(
    `  - Plan ${PLAN_NUMBER} (${product.productName}) premium rates`,
  );

  // 1. Create the pension-specific attribute masters once, then write values.
  for (const [code, name] of PENSION_ATTRIBUTES) {
    await prisma.productAttributeMaster.upsert({
      where: { attributeCode: code },
      update: {},
      create: { attributeCode: code, attributeName: name, dataType: "Number" },
    });
  }

  const plan856 = (legacyPlans as any[]).find((p) => p.planNumber === PLAN_NUMBER);
  if (plan856) {
    const attrMap: Record<string, string> = {};
    if (plan856.minEntryAge) attrMap.MIN_ENTRY_AGE = plan856.minEntryAge;
    if (plan856.maxEntryAge) attrMap.MAX_ENTRY_AGE = plan856.maxEntryAge;
    if (plan856.minPolicyTerm) attrMap.MIN_POLICY_TERM = plan856.minPolicyTerm;
    if (plan856.maxPolicyTerm) attrMap.MAX_POLICY_TERM = plan856.maxPolicyTerm;
    if (plan856.minPpt) attrMap.MIN_PPT = plan856.minPpt;
    if (plan856.maxPpt) attrMap.MAX_PPT = plan856.maxPpt;
    if (plan856.terms) attrMap.TERMS = plan856.terms;
    if (plan856.ppts) attrMap.PPTS = plan856.ppts;
    if (plan856.introDate) attrMap.INTRO_DATE = plan856.introDate;
    if (plan856.withdrawalDate) attrMap.WITHDRAWAL_DATE = plan856.withdrawalDate;
    attrMap.ALLOWED_RIDERS = "";
    if (plan856.minSumAssured) {
      attrMap.MIN_SUM_ASSURED = String(plan856.minSumAssured);
      attrMap.DEFAULT_SUM_ASSURED = String(plan856.minSumAssured);
    }
    if (plan856.maxSumAssured) {
      attrMap.MAX_SUM_ASSURED = String(plan856.maxSumAssured);
    }
    if (plan856.pptNotes) attrMap.PPT_NOTES = plan856.pptNotes;
    if (plan856.notes) attrMap.PLAN_NOTES = plan856.notes;
    for (const [code, value] of ATTRIBUTES) attrMap[code] = value;

    for (const [code, value] of Object.entries(attrMap)) {
      await upsertAttribute(prisma, product.id, code, value);
    }
  }

  // 2. One zero-rate row per entry age; the calculator uses the sum assured as
  //    the purchase price, exactly as LIC's engine does.
  const rateRows = [];
  for (let entryAge = 60; entryAge <= 99; entryAge++) {
    rateRows.push({
      productId: product.id,
      entryAge,
      ageBand: null,
      policyTerm: 10,
      premiumPayingTerm: 1,
      option: null,
      gender: null,
      smoker: null,
      tabularRate: 0,
    });
  }

  // 3. Every pension mode has a premium factor of 1: the mode changes the
  //    pension payout, not the purchase price.
  const modes = await prisma.premiumModeMaster.findMany({
    where: { modeCode: { in: [...MODE_CODES] } },
    select: { id: true, modeCode: true },
  });
  const modeByCode = new Map(modes.map((mode) => [mode.modeCode, mode.id]));

  await prisma.$transaction(async (tx) => {
    await tx.productPremiumRate.deleteMany({
      where: { productId: product.id },
    });
    await tx.productPremiumRate.createMany({ data: rateRows });

    for (const modeCode of MODE_CODES) {
      const premiumModeId = modeByCode.get(modeCode);
      if (!premiumModeId) continue;
      await tx.productPremiumModeFactor.upsert({
        where: {
          productId_premiumModeId: {
            productId: product.id,
            premiumModeId,
          },
        },
        update: { factor: 1 },
        create: { productId: product.id, premiumModeId, factor: 1 },
      });
    }
  });

  // 4. PMVVY has no riders.
  await prisma.riderPremiumRate.deleteMany({
    where: { productId: product.id },
  });
  await prisma.productRider.deleteMany({
    where: { productId: product.id },
  });

  const [rateCount, modeFactorCount] = await Promise.all([
    prisma.productPremiumRate.count({ where: { productId: product.id } }),
    prisma.productPremiumModeFactor.count({ where: { productId: product.id } }),
  ]);

  console.log(
    `  ✓ Plan ${PLAN_NUMBER} (${product.productName}): ${rateCount} purchase-price points, ` +
      `${modeFactorCount} mode factors, 0 riders in ${Date.now() - startedAt}ms`,
  );
};
