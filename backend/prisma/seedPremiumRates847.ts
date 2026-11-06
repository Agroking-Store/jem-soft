import type { PrismaClient } from "@prisma/client";
import legacyPlans from "./masterData/legacyPlans.json";
import rates847 from "./masterData/premiumRates847.json";

/**
 * LIC Plans 847 (Jeevan Shiromani) and 848 (Bima Shree).
 *
 * Both are limited-premium endowment plans with a premium paying term of
 * policy term minus 4, sold only for terms 14/16/18/20. LIC's public brochure
 * publishes a small sample table (ages 20/30/40/50), and the supplied i-Magic
 * data adds the age-33 term-14 point. This seeder stores exactly those tabular
 * rates per Rs 1,000 - no interpolation and no estimates.
 *
 * Premium formula (brochure sections 8/9):
 *   tabular  = rate x sum assured / 1000
 *   basic    = tabular - high-SA rebate - mode rebate
 *   mode     = 2% yearly, 1% half-yearly, nil quarterly/monthly
 *   GST      = 4.5% first year
 *
 * Rider rates come from i-Magic's Lookup/Riders endpoint at a rider sum of
 * Rs 10,00,000 and are stored per Rs 1,000. i-Magic returns no rider data for
 * age 40 / term 16, so that combination stays manual rather than guessed.
 */

const RIDER_CODE_BY_NAME: Record<string, string> = {
  "Double Accident Benefit": "DAB",
  "Accident Benefit Rider": "ABR",
  "Term Rider Benefit": "TRB",
  "Critical Illness Rider": "CIR",
};

const MODE_FACTORS: [string, number][] = [
  ["YLY", 1],
  ["HLY", 0.5],
  ["QLY", 0.25],
  ["MLY", 0.083333],
];

const ATTRIBUTES: [string, string][] = [
  ["GST_RATE", "4.5"],
  ["ALLOWED_PREMIUM_MODES", "Yearly,Half-Yearly,Quarterly,Monthly"],
];

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

async function seedPlan(prisma: PrismaClient) {
  const planNumber = "847";
  const rates = rates847;
  const productCode = "LEGACY-847";
  const startedAt = Date.now();

  const product = await prisma.productMaster.findFirst({
    where: { planNumber, productCode },
    select: { id: true, productName: true },
  });

  if (!product) {
    console.warn(`  x Plan ${planNumber} not found (${productCode}); skipping rates`);
    return;
  }

  console.log(`  - Plan ${planNumber} (${product.productName}) premium rates`);

  const plan = (legacyPlans as any[]).find((p) => p.planNumber === planNumber);
  if (plan) {
    const attrMap: Record<string, string> = {};
    if (plan.minEntryAge) attrMap.MIN_ENTRY_AGE = plan.minEntryAge;
    if (plan.maxEntryAge) attrMap.MAX_ENTRY_AGE = plan.maxEntryAge;
    if (plan.minPolicyTerm) attrMap.MIN_POLICY_TERM = plan.minPolicyTerm;
    if (plan.maxPolicyTerm) attrMap.MAX_POLICY_TERM = plan.maxPolicyTerm;
    if (plan.minPpt) attrMap.MIN_PPT = plan.minPpt;
    if (plan.maxPpt) attrMap.MAX_PPT = plan.maxPpt;
    if (plan.terms) attrMap.TERMS = plan.terms;
    // PPTS is intentionally empty; PPT_FORMULA below is term-specific.
    attrMap.PPTS = plan.ppts ?? "";
    if (plan.pptFormula) attrMap.PPT_FORMULA = plan.pptFormula;
    if (plan.pptNotes) attrMap.PPT_NOTES = plan.pptNotes;
    if (plan.introDate) attrMap.INTRO_DATE = plan.introDate;
    if (plan.withdrawalDate) attrMap.WITHDRAWAL_DATE = plan.withdrawalDate;
    if (plan.allowedRiders?.length) {
      attrMap.ALLOWED_RIDERS = plan.allowedRiders.join(",");
    }
    if (plan.minSumAssured) {
      attrMap.MIN_SUM_ASSURED = String(plan.minSumAssured);
      attrMap.DEFAULT_SUM_ASSURED = String(plan.minSumAssured);
    }
    if (plan.notes) attrMap.PLAN_NOTES = plan.notes;
    for (const [code, value] of ATTRIBUTES) attrMap[code] = value;

    for (const [code, value] of Object.entries(attrMap)) {
      await upsertAttribute(prisma, product.id, code, value);
    }

    // Neither plan has a maximum sum assured. Remove any stale cap left by the
    // old catalogue row (which incorrectly repeated the minimum).
    if (plan.maxSumAssured == null) {
      const maxSa = await prisma.productAttributeMaster.findUnique({
        where: { attributeCode: "MAX_SUM_ASSURED" },
        select: { id: true },
      });
      if (maxSa) {
        await prisma.productAttributeValue.deleteMany({
          where: { productId: product.id, attributeId: maxSa.id },
        });
      }
    }
  }

  const rows = rates.rows.map((row) => ({
    productId: product.id,
    entryAge: Number(row.entryAge),
    ageBand: null,
    gender: row.gender ?? null,
    smoker: row.smoker ?? null,
    policyTerm: Number(row.policyTerm),
    premiumPayingTerm: Number(row.premiumPayingTerm),
    option: row.option ?? null,
    tabularRate: Number(row.tabularRate),
  }));

  const modes = await prisma.premiumModeMaster.findMany({
    where: { modeCode: { in: MODE_FACTORS.map(([code]) => code) } },
    select: { id: true, modeCode: true },
  });
  const modeByCode = new Map(modes.map((mode) => [mode.modeCode, mode.id]));

  const riderMasters = await prisma.riderMaster.findMany({
    where: { riderCode: { in: Object.values(RIDER_CODE_BY_NAME) } },
    select: { id: true, riderCode: true },
  });
  const riderByCode = new Map(riderMasters.map((r) => [r.riderCode, r]));

  const riderRows: {
    riderId: string;
    productId: string;
    entryAge: number;
    ageBand: number | null;
    riderTerm: number;
    premiumPayingTerm: number | null;
    option: null;
    gender: null;
    ratePerThousand: number;
  }[] = [];

  for (const entry of rates.riders ?? []) {
    for (const [riderName, info] of Object.entries(entry.riders)) {
      const code = RIDER_CODE_BY_NAME[riderName];
      const rider = code ? riderByCode.get(code) : undefined;
      if (!rider) continue;
      riderRows.push({
        riderId: rider.id,
        productId: product.id,
        entryAge: Number(entry.age),
        ageBand: null,
        riderTerm: Number(entry.term),
        premiumPayingTerm: Number(entry.ppt),
        option: null,
        gender: null,
        ratePerThousand: Number(info.rate),
      });
    }
  }

  await prisma.$transaction(
    async (tx) => {
      await tx.productPremiumRate.deleteMany({ where: { productId: product.id } });
      if (rows.length) {
        await tx.productPremiumRate.createMany({ data: rows });
      }

      await tx.productSumAssuredRebate.deleteMany({
        where: { productId: product.id },
      });
      if (rates.saRebateBands.length) {
        await tx.productSumAssuredRebate.createMany({
          data: rates.saRebateBands.map(([minSumAssured, maxSumAssured, rebatePerThousand]) => ({
            productId: product.id,
            minSumAssured,
            maxSumAssured,
            rebatePerThousand,
          })),
        });
      }

      for (const [modeCode, factor] of MODE_FACTORS) {
        const premiumModeId = modeByCode.get(modeCode);
        if (!premiumModeId) continue;
        await tx.productPremiumModeFactor.upsert({
          where: {
            productId_premiumModeId: { productId: product.id, premiumModeId },
          },
          update: { factor },
          create: { productId: product.id, premiumModeId, factor },
        });
      }

      await tx.riderPremiumRate.deleteMany({ where: { productId: product.id } });
      await tx.productRider.deleteMany({ where: { productId: product.id } });

      if (riderRows.length) {
        await tx.riderPremiumRate.createMany({ data: riderRows });
      }

      for (const code of Object.values(RIDER_CODE_BY_NAME)) {
        const rider = riderByCode.get(code);
        if (!rider) continue;
        await tx.productRider.create({
          data: { productId: product.id, riderId: rider.id },
        });
      }
    },
    { timeout: 120000 },
  );

  const [rateCount, rebateCount, modeFactorCount, riderRateCount, riderLinkCount] =
    await Promise.all([
      prisma.productPremiumRate.count({ where: { productId: product.id } }),
      prisma.productSumAssuredRebate.count({ where: { productId: product.id } }),
      prisma.productPremiumModeFactor.count({ where: { productId: product.id } }),
      prisma.riderPremiumRate.count({ where: { productId: product.id } }),
      prisma.productRider.count({ where: { productId: product.id } }),
    ]);

  console.log(
    `  ✓ Plan ${planNumber} (${product.productName}): ${rateCount} premium points, ` +
      `${rebateCount} rebate slabs, ${modeFactorCount} mode factors, ` +
      `${riderRateCount} rider points, ${riderLinkCount} linked riders in ${Date.now() - startedAt}ms`,
  );
}

export const seedPremiumRates847 = async (prisma: PrismaClient) => {
  await seedPlan(prisma);
};


