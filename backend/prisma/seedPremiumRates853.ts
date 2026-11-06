import type { PrismaClient } from "@prisma/client";
import legacyPlans from "./masterData/legacyPlans.json";
import rates853 from "./masterData/premiumRates853.json";

const PLAN_NUMBER = "853";

const ATTRIBUTES: [string, string][] = [
  ["GST_RATE", "0"],
  ["ALLOWED_PREMIUM_MODES", "Yearly,Half-Yearly,Quarterly,Monthly,Single"],
  ["MAX_MATURITY_AGE", "80"],
  ["MIN_REGULAR_PREMIUM", "10035"],
  ["MIN_SINGLE_PREMIUM", "39415"],
];

const MODE_FACTORS: [string, number][] = [
  ["YLY", 1],
  ["HLY", 0.51],
  ["QLY", 0.2575],
  ["MLY", 0.08625],
  ["SIN", 1],
];

/**
 * Accident Benefit Rider (ABR) on plan 853 is age-independent and priced by
 * the policy term. i-Magic's Lookup/Riders returns these per-Rs-1,000 rates
 * (maxRiderSum Rs 1,00,00,000) at every age from 18 upward; ages below 18 are
 * not eligible for the rider.
 */
const ABR_RATES: [number, number][] = [
  [10, 1.8],
  [11, 1.9],
  [12, 2.05],
  [13, 2.15],
  [14, 2.25],
  [15, 2.35],
  [16, 2.45],
  [17, 2.55],
  [18, 2.65],
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
  const source = rates853 as unknown as { rows?: RateRow[] };
  if (!Array.isArray(source.rows) || source.rows.length === 0) {
    throw new Error("Plan 853: premiumRates853.json has no rows");
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

export const seedPremiumRates853 = async (prisma: PrismaClient) => {
  const startedAt = Date.now();
  const product = await prisma.productMaster.findFirst({
    where: { planNumber: PLAN_NUMBER, productCode: "LEGACY-853" },
    select: { id: true, productName: true },
  });

  if (!product) {
    console.warn(`  x Plan ${PLAN_NUMBER} not found (LEGACY-853); skipping rates`);
    return;
  }

  console.log(`  - Plan ${PLAN_NUMBER} (${product.productName}) premium rates`);

  const plan853 = (legacyPlans as any[]).find((p) => p.planNumber === PLAN_NUMBER);
  if (plan853) {
    const attrMap: Record<string, string> = {};
    if (plan853.minEntryAge) attrMap.MIN_ENTRY_AGE = plan853.minEntryAge;
    if (plan853.maxEntryAge) attrMap.MAX_ENTRY_AGE = plan853.maxEntryAge;
    if (plan853.minPolicyTerm) attrMap.MIN_POLICY_TERM = plan853.minPolicyTerm;
    if (plan853.maxPolicyTerm) attrMap.MAX_POLICY_TERM = plan853.maxPolicyTerm;
    if (plan853.minPpt) attrMap.MIN_PPT = plan853.minPpt;
    if (plan853.maxPpt) attrMap.MAX_PPT = plan853.maxPpt;
    if (plan853.terms) attrMap.TERMS = plan853.terms;
    attrMap.PPTS = plan853.ppts ?? "";
    if (plan853.pptFormula) attrMap.PPT_FORMULA = plan853.pptFormula;
    if (plan853.pptNotes) attrMap.PPT_NOTES = plan853.pptNotes;
    if (plan853.introDate) attrMap.INTRO_DATE = plan853.introDate;
    if (plan853.withdrawalDate) attrMap.WITHDRAWAL_DATE = plan853.withdrawalDate;
    if (plan853.allowedRiders?.length) {
      attrMap.ALLOWED_RIDERS = plan853.allowedRiders.join(",");
    }
    if (plan853.minSumAssured) {
      attrMap.MIN_SUM_ASSURED = String(plan853.minSumAssured);
      attrMap.DEFAULT_SUM_ASSURED = String(plan853.minSumAssured);
    }
    if (plan853.maxSumAssured) {
      attrMap.MAX_SUM_ASSURED = String(plan853.maxSumAssured);
    }
    if (plan853.notes) attrMap.PLAN_NOTES = plan853.notes;
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

  const abrRider = await prisma.riderMaster.findUnique({
    where: { riderCode: "ABR" },
    select: { id: true },
  });

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

      if (abrRider) {
        const riderRows = ABR_RATES.map(([riderTerm, ratePerThousand]) => ({
          riderId: abrRider.id,
          productId: product.id,
          // ABR is age-independent, so entryAge 0 is the fallback row the
          // rider-preview lookup uses for every eligible age.
          entryAge: 0,
          ageBand: null,
          riderTerm,
          premiumPayingTerm: null,
          option: null,
          gender: null,
          ratePerThousand,
        }));

        await tx.riderPremiumRate.deleteMany({
          where: { productId: product.id, riderId: abrRider.id },
        });
        await tx.productRider.deleteMany({
          where: { productId: product.id, riderId: abrRider.id },
        });
        await tx.riderPremiumRate.createMany({ data: riderRows });
        await tx.productRider.create({
          data: { productId: product.id, riderId: abrRider.id },
        });
      }
    },
    { timeout: 120000 },
  );

  const [rateCount, modeFactorCount, riderCount] = await Promise.all([
    prisma.productPremiumRate.count({ where: { productId: product.id } }),
    prisma.productPremiumModeFactor.count({ where: { productId: product.id } }),
    prisma.riderPremiumRate.count({ where: { productId: product.id } }),
  ]);

  console.log(
    `  ✓ Plan ${PLAN_NUMBER} (${product.productName}): ${rateCount} premium points, ${modeFactorCount} mode factors, ${riderCount} rider points in ${Date.now() - startedAt}ms`,
  );
};
