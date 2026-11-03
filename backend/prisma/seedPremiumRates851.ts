import type { PrismaClient } from "@prisma/client";
import legacyPlans from "./masterData/legacyPlans.json";
import rates851 from "./masterData/premiumRates851.json";

const PLAN_NUMBER = "851";

const ATTRIBUTES: [string, string][] = [
  ["GST_RATE", "0"],
  ["ALLOWED_PREMIUM_MODES", "Yearly,Half-Yearly"],
  ["MAX_MATURITY_AGE", "70"],
  ["MIN_REGULAR_PREMIUM", "2524"],
];

const MODE_FACTORS: [string, number][] = [
  ["YLY", 0.98],  // 2% rebate
  ["HLY", 0.495], // 1% rebate, half of yearly
];

type RateRow = {
  entryAge: number;
  gender: string;
  smoker: boolean;
  policyTerm: number;
  premiumPayingTerm: number;
  option: number | null;
  tabularRate: number;
};

function buildRateRows(): RateRow[] {
  const source = rates851 as unknown as { rows?: RateRow[] };
  if (!Array.isArray(source.rows) || source.rows.length === 0) {
    throw new Error("Plan 851: premiumRates851.json has no rows");
  }
  return source.rows.map((row) => ({
    entryAge: Number(row.entryAge),
    gender: row.gender === "F" ? "F" : "M",
    smoker: row.smoker === true,
    policyTerm: Number(row.policyTerm),
    premiumPayingTerm: Number(row.premiumPayingTerm),
    option: row.option != null ? Number(row.option) : null,
    tabularRate: Number(row.tabularRate),
  }));
}

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

export const seedPremiumRates851 = async (prisma: PrismaClient) => {
  const startedAt = Date.now();
  const product = await prisma.productMaster.findFirst({
    where: { planNumber: PLAN_NUMBER, productCode: "LEGACY-851" },
    select: { id: true, productName: true },
  });

  if (!product) {
    console.warn(`  x Plan ${PLAN_NUMBER} not found (LEGACY-851); skipping rates`);
    return;
  }

  console.log(`  - Plan ${PLAN_NUMBER} (${product.productName}) premium rates`);

  const plan851 = (legacyPlans as any[]).find((p) => p.planNumber === PLAN_NUMBER);
  if (plan851) {
    const attrMap: Record<string, string> = {};
    if (plan851.minEntryAge) attrMap.MIN_ENTRY_AGE = plan851.minEntryAge;
    if (plan851.maxEntryAge) attrMap.MAX_ENTRY_AGE = plan851.maxEntryAge;
    if (plan851.minPolicyTerm) attrMap.MIN_POLICY_TERM = plan851.minPolicyTerm;
    if (plan851.maxPolicyTerm) attrMap.MAX_POLICY_TERM = plan851.maxPolicyTerm;
    if (plan851.minPpt) attrMap.MIN_PPT = plan851.minPpt;
    if (plan851.maxPpt) attrMap.MAX_PPT = plan851.maxPpt;
    if (plan851.terms) attrMap.TERMS = plan851.terms;
    attrMap.PPTS = plan851.ppts ?? "";
    if (plan851.pptFormula) attrMap.PPT_FORMULA = plan851.pptFormula;
    if (plan851.pptNotes) attrMap.PPT_NOTES = plan851.pptNotes;
    if (plan851.introDate) attrMap.INTRO_DATE = plan851.introDate;
    if (plan851.withdrawalDate) attrMap.WITHDRAWAL_DATE = plan851.withdrawalDate;
    if (plan851.allowedRiders?.length) {
      attrMap.ALLOWED_RIDERS = plan851.allowedRiders.join(",");
    }
    if (plan851.minSumAssured) {
      attrMap.MIN_SUM_ASSURED = String(plan851.minSumAssured);
      attrMap.DEFAULT_SUM_ASSURED = String(plan851.minSumAssured);
    }
    if (plan851.maxSumAssured) {
      attrMap.MAX_SUM_ASSURED = String(plan851.maxSumAssured);
    }
    if (plan851.notes) attrMap.PLAN_NOTES = plan851.notes;
    for (const [code, value] of ATTRIBUTES) attrMap[code] = value;

    for (const [code, value] of Object.entries(attrMap)) {
      await upsertAttribute(prisma, product.id, code, value);
    }
  }

  const rows = buildRateRows();

  const modes = await prisma.premiumModeMaster.findMany({
    where: { modeCode: { in: MODE_FACTORS.map(([code]) => code) } },
    select: { id: true, modeCode: true },
  });
  const modeByCode = new Map(modes.map((mode) => [mode.modeCode, mode.id]));

  await prisma.$transaction(
    async (tx) => {
      await tx.productPremiumRate.deleteMany({
        where: { productId: product.id },
      });
      for (let offset = 0; offset < rows.length; offset += 1000) {
        await tx.productPremiumRate.createMany({
          data: rows.slice(offset, offset + 1000).map((r) => ({
            productId: product.id,
            ageBand: null,
            ...r,
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
    },
    { timeout: 120000 },
  );

  const [rateCount, modeFactorCount] = await Promise.all([
    prisma.productPremiumRate.count({ where: { productId: product.id } }),
    prisma.productPremiumModeFactor.count({ where: { productId: product.id } }),
  ]);

  console.log(
    `  ✓ Plan ${PLAN_NUMBER} (${product.productName}): ${rateCount} premium points, ${modeFactorCount} mode factors in ${Date.now() - startedAt}ms`,
  );
};
