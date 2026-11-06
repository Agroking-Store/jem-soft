import type { PrismaClient } from "@prisma/client";
import legacyPlans from "./masterData/legacyPlans.json";
import rates842 from "./masterData/premiumRates842.json";

/**
 * LIC Plan 842 (PMVVY) - single premium pension plan.
 * Purchase price = sum assured. GST 0. No riders. Term 10, PPT 1.
 * Age 60-99. Min/max SA Rs 1,50,000 (fixed).
 */

const ATTRIBUTES: [string, string][] = [
  ["GST_RATE", "0"],
  ["ALLOWED_PREMIUM_MODES", "Single"],
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
  const planNumber = "842";
  const rates = rates842 as any;
  const productCode = "LEGACY-842";
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
    if (plan.ppts) attrMap.PPTS = plan.ppts;
    if (plan.introDate) attrMap.INTRO_DATE = plan.introDate;
    if (plan.withdrawalDate) attrMap.WITHDRAWAL_DATE = plan.withdrawalDate;
    if (plan.allowedRiders?.length) attrMap.ALLOWED_RIDERS = plan.allowedRiders.join(",");
    if (plan.minSumAssured) {
      attrMap.MIN_SUM_ASSURED = String(plan.minSumAssured);
      attrMap.DEFAULT_SUM_ASSURED = String(plan.minSumAssured);
      attrMap.MAX_SUM_ASSURED = String(plan.minSumAssured);
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

  await prisma.$transaction(
    async (tx) => {
      await tx.productPremiumRate.deleteMany({ where: { productId: product.id } });
      if (rows.length) await tx.productPremiumRate.createMany({ data: rows });
    },
    { timeout: 120000 },
  );

  const rateCount = await prisma.productPremiumRate.count({ where: { productId: product.id } });
  console.log(`  ✓ Plan ${planNumber} (${product.productName}): ${rateCount} premium points in ${Date.now() - startedAt}ms`);
}

export const seedPremiumRates842 = async (prisma: PrismaClient) => {
  await seedPlan(prisma);
};
