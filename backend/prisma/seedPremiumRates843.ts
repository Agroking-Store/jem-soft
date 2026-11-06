import type { PrismaClient } from "@prisma/client";
import legacyPlans from "./masterData/legacyPlans.json";
import rates843 from "./masterData/premiumrates843.json";

/**
 * LIC Plan 844 (Aadhaar Shila) - limited premium endowment.
 * Terms 10-20, PPT = term. Entry age 8-55. Min/max SA Rs 1,00,000 (fixed).
 * Sample rate: age 33, term 10, ppt 10, rate 89.75 per Rs 1,000.
 * GST 4.5% first year. Riders: DAB (0.5 per Rs 1,000).
 */

const RIDER_CODE_BY_NAME: Record<string, string> = {
  "Double Accident Benefit": "DAB",
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
    where: { productId_attributeId: { productId, attributeId: master.id } },
    update: { value },
    create: { productId, attributeId: master.id, value },
  });
}

async function seedPlan(prisma: PrismaClient) {
  const planNumber = "843";
  const rates = rates843 as any;
  const productCode = "LEGACY-843";
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
    if (plan.terms) attrMap.TERMS = plan.terms;
    attrMap.PPTS = plan.ppts ?? "";
    if (plan.pptNotes) attrMap.PPT_NOTES = plan.pptNotes;
    if (plan.introDate) attrMap.INTRO_DATE = plan.introDate;
    if (plan.withdrawalDate) attrMap.WITHDRAWAL_DATE = plan.withdrawalDate;
    if (plan.allowedRiders?.length) attrMap.ALLOWED_RIDERS = plan.allowedRiders.join(",");
    if (plan.minSumAssured) {
      attrMap.MIN_SUM_ASSURED = String(plan.minSumAssured);
      attrMap.DEFAULT_SUM_ASSURED = String(plan.minSumAssured);
    }
    if (plan.maxSumAssured) {
      attrMap.MAX_SUM_ASSURED = String(plan.maxSumAssured);
    }
    if (plan.notes) attrMap.PLAN_NOTES = plan.notes;
    for (const [code, value] of ATTRIBUTES) attrMap[code] = value;

    for (const [code, value] of Object.entries(attrMap)) {
      await upsertAttribute(prisma, product.id, code, value);
    }
  }

  const rows = rates.rows.map((row: any) => ({
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

  const riderRows: any[] = [];
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
        ratePerThousand: Number((info as any).rate),
      });
    }
  }

  // DAB rider is age-independent at 0.5 per Rs 1,000 for all terms 10-20.
  const dabRider = riderByCode.get("DAB");
  if (dabRider) {
    for (let term = 10; term <= 20; term++) {
      riderRows.push({
        riderId: dabRider.id,
        productId: product.id,
        entryAge: 0,
        ageBand: null,
        riderTerm: term,
        premiumPayingTerm: term,
        option: null,
        gender: null,
        ratePerThousand: 0.5,
      });
    }
  }

  await prisma.$transaction(
    async (tx) => {
      await tx.productPremiumRate.deleteMany({ where: { productId: product.id } });
      if (rows.length) await tx.productPremiumRate.createMany({ data: rows });

      await tx.productSumAssuredRebate.deleteMany({ where: { productId: product.id } });
      if (rates.saRebateBands?.length) {
        await tx.productSumAssuredRebate.createMany({
          data: rates.saRebateBands.map(([min, max, rebate]: number[]) => ({
            productId: product.id,
            minSumAssured: min,
            maxSumAssured: max,
            rebatePerThousand: rebate,
          })),
        });
      }

      for (const [modeCode, factor] of MODE_FACTORS) {
        const premiumModeId = modeByCode.get(modeCode);
        if (!premiumModeId) continue;
        await tx.productPremiumModeFactor.upsert({
          where: { productId_premiumModeId: { productId: product.id, premiumModeId } },
          update: { factor },
          create: { productId: product.id, premiumModeId, factor },
        });
      }

      await tx.riderPremiumRate.deleteMany({ where: { productId: product.id } });
      await tx.productRider.deleteMany({ where: { productId: product.id } });

      if (riderRows.length) await tx.riderPremiumRate.createMany({ data: riderRows });

      for (const code of Object.values(RIDER_CODE_BY_NAME)) {
        const rider = riderByCode.get(code);
        if (!rider) continue;
        await tx.productRider.create({ data: { productId: product.id, riderId: rider.id } });
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

export const seedPremiumRates843 = async (prisma: PrismaClient) => {
  await seedPlan(prisma);
};

