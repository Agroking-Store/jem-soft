import type { PrismaClient } from "@prisma/client";
import legacyPlans from "./masterData/legacyPlans.json";
import rates854 from "./masterData/premiumRates854.json";

/**
 * LIC Plan 854 - Tech-Term (UIN 512N333V01).
 *
 * Non-par, non-linked, individual pure risk term plan. Entry age 18-65 last
 * birthday, maturity age at most 80, policy term 10-40, PPT single (1),
 * regular (term) or limited (term - 5 / term - 10). The plan offers Death
 * Benefit Option I (level) and Option II (increasing).
 *
 * Source: LIC's official English sales brochure, section 6 "Sample
 * Illustrative Premium" (page 2). The public brochure publishes only the
 * term-20, male non-smoker, Rs 1 crore sample at ages 20/30/40. This seeder
 * stores exactly those 24 tabular rates per Rs 1,000. It does not interpolate
 * or add third-party estimates: the full age x term grid is not public.
 *
 * The brochure's high sum assured rebate and 2% half-yearly loading are
 * applied by lic854Calculator, not stored as rebate rows.
 */
const PLAN_NUMBER = "854";

const ATTRIBUTES: [string, string][] = [
  ["GST_RATE", "18"],
  ["ALLOWED_PREMIUM_MODES", "Yearly,Half-Yearly,Single"],
  ["MAX_MATURITY_AGE", "80"],
  ["MIN_REGULAR_PREMIUM", "3000"],
  ["MIN_SINGLE_PREMIUM", "30000"],
];

const MODE_FACTORS: [string, number][] = [
  ["YLY", 1],
  ["HLY", 0.51],
  ["SIN", 1],
];

type RateRow = {
  entryAge: number;
  gender: string;
  smoker: boolean;
  policyTerm: number;
  premiumPayingTerm: number;
  option: number;
  tabularRate: number;
};

function buildRateRows(): RateRow[] {
  const source = rates854 as unknown as { rows?: RateRow[] };
  if (!Array.isArray(source.rows) || source.rows.length === 0) {
    throw new Error("Plan 854: premiumRates854.json has no rows");
  }
  return source.rows.map((row) => ({
    entryAge: Number(row.entryAge),
    gender: row.gender === "F" ? "F" : "M",
    smoker: row.smoker === true,
    policyTerm: Number(row.policyTerm),
    premiumPayingTerm: Number(row.premiumPayingTerm),
    option: Number(row.option),
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

async function seedRiders(prisma: PrismaClient, productId: string) {
  const riderDefs = [{ code: "ABR", rate: 0.5 }];

  const riders = await prisma.riderMaster.findMany({
    where: { riderCode: { in: riderDefs.map((r) => r.code) } },
    select: { id: true, riderCode: true, riderName: true },
  });
  const byCode = new Map(riders.map((r) => [r.riderCode, r]));

  const linked = await prisma.productRider.findMany({
    where: { productId },
    select: { riderId: true },
  });
  const targetIds = new Set(
    riderDefs.map((r) => byCode.get(r.code)?.id).filter(Boolean),
  );
  const staleIds = linked
    .map((r) => r.riderId)
    .filter((id) => !targetIds.has(id));

  if (staleIds.length > 0) {
    await prisma.riderPremiumRate.deleteMany({
      where: { productId, riderId: { in: staleIds } },
    });
    await prisma.productRider.deleteMany({
      where: { productId, riderId: { in: staleIds } },
    });
  }

  for (const def of riderDefs) {
    const rider = byCode.get(def.code);
    if (!rider) {
      console.warn(`  x Plan ${PLAN_NUMBER}: rider master ${def.code} not found`);
      continue;
    }

    await prisma.riderPremiumRate.deleteMany({
      where: { productId, riderId: rider.id },
    });

    // ABR is flat per Rs 1,000 of rider sum assured. Store every entry age and
    // rider term plus an age-less fallback, matching the other legacy plans.
    const rows: {
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

    for (let entryAge = 18; entryAge <= 65; entryAge++) {
      for (let riderTerm = 1; riderTerm <= 40; riderTerm++) {
        rows.push({
          riderId: rider.id,
          productId,
          entryAge,
          ageBand: null,
          riderTerm,
          premiumPayingTerm: null,
          option: null,
          gender: null,
          ratePerThousand: def.rate,
        });
      }
    }
    for (let riderTerm = 1; riderTerm <= 40; riderTerm++) {
      rows.push({
        riderId: rider.id,
        productId,
        entryAge: 0,
        ageBand: null,
        riderTerm,
        premiumPayingTerm: null,
        option: null,
        gender: null,
        ratePerThousand: def.rate,
      });
    }

    for (let offset = 0; offset < rows.length; offset += 1000) {
      await prisma.riderPremiumRate.createMany({
        data: rows.slice(offset, offset + 1000),
      });
    }

    await prisma.productRider.upsert({
      where: { productId_riderId: { productId, riderId: rider.id } },
      update: {},
      create: { productId, riderId: rider.id },
    });

    console.log(
      `    ✓ ${def.code} rider: ${rows.length} age/term rows at Rs ${def.rate.toFixed(2)} per 1,000`,
    );
  }
}

export const seedPremiumRates854 = async (prisma: PrismaClient) => {
  const startedAt = Date.now();
  const product = await prisma.productMaster.findFirst({
    where: { planNumber: PLAN_NUMBER, productCode: "LEGACY-854" },
    select: { id: true, productName: true },
  });

  if (!product) {
    console.warn(
      `  x Plan ${PLAN_NUMBER} not found (LEGACY-854); skipping rates`,
    );
    return;
  }

  console.log(
    `  - Plan ${PLAN_NUMBER} (${product.productName}) premium rates`,
  );

  const plan854 = (legacyPlans as any[]).find(
    (p) => p.planNumber === PLAN_NUMBER,
  );
  if (plan854) {
    const attrMap: Record<string, string> = {};
    if (plan854.minEntryAge) attrMap.MIN_ENTRY_AGE = plan854.minEntryAge;
    if (plan854.maxEntryAge) attrMap.MAX_ENTRY_AGE = plan854.maxEntryAge;
    if (plan854.minPolicyTerm) attrMap.MIN_POLICY_TERM = plan854.minPolicyTerm;
    if (plan854.maxPolicyTerm) attrMap.MAX_POLICY_TERM = plan854.maxPolicyTerm;
    if (plan854.minPpt) attrMap.MIN_PPT = plan854.minPpt;
    if (plan854.maxPpt) attrMap.MAX_PPT = plan854.maxPpt;
    if (plan854.terms) attrMap.TERMS = plan854.terms;
    // PPTS is intentionally empty; PPT_FORMULA below is term-specific.
    attrMap.PPTS = plan854.ppts ?? "";
    if (plan854.pptFormula) attrMap.PPT_FORMULA = plan854.pptFormula;
    if (plan854.pptNotes) attrMap.PPT_NOTES = plan854.pptNotes;
    if (plan854.introDate) attrMap.INTRO_DATE = plan854.introDate;
    if (plan854.withdrawalDate) attrMap.WITHDRAWAL_DATE = plan854.withdrawalDate;
    if (plan854.allowedRiders?.length) {
      attrMap.ALLOWED_RIDERS = plan854.allowedRiders.join(",");
    }
    if (plan854.minSumAssured) {
      attrMap.MIN_SUM_ASSURED = String(plan854.minSumAssured);
      attrMap.DEFAULT_SUM_ASSURED = String(plan854.minSumAssured);
    }
    if (plan854.notes) attrMap.PLAN_NOTES = plan854.notes;
    for (const [code, value] of ATTRIBUTES) attrMap[code] = value;

    for (const [code, value] of Object.entries(attrMap)) {
      await upsertAttribute(prisma, product.id, code, value);
    }

    // The plan has no maximum sum assured. Remove any stale cap left by the
    // old catalogue row (which incorrectly said Rs 50,00,000).
    if (plan854.maxSumAssured == null) {
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

  await seedRiders(prisma, product.id);

  const [rateCount, modeFactorCount, riderRateCount] = await Promise.all([
    prisma.productPremiumRate.count({ where: { productId: product.id } }),
    prisma.productPremiumModeFactor.count({ where: { productId: product.id } }),
    prisma.riderPremiumRate.count({ where: { productId: product.id } }),
  ]);

  console.log(
    `  ✓ Plan ${PLAN_NUMBER} (${product.productName}): ${rateCount} premium points, ` +
      `${modeFactorCount} mode factors, ${riderRateCount} rider points in ${Date.now() - startedAt}ms`,
  );
};
