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
  ["QRY", 0.2575],
  ["MTH", 0.08625],
  ["SIN", 1],
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
