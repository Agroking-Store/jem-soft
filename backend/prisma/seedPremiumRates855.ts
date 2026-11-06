import type { PrismaClient } from "@prisma/client";
import legacyPlans from "./masterData/legacyPlans.json";
import rates855 from "./masterData/premiumRates855.json";
import riderRates855 from "./masterData/premiumRiderRates855.json";

/**
 * LIC Plan 855 - Jeevan Amar (UIN 512N332V01).
 *
 * Non-par, non-linked, individual pure risk term plan. Entry age 18-65 last
 * birthday, maturity age at most 80, policy term 10-40, PPT single (1),
 * regular (term) or limited (term - 5 / term - 10). The rate grid is keyed by
 * entry age, gender, smoking status, policy term, PPT and Death Benefit Option
 * (1 = level, 2 = increasing). It is a whole-year table: LIC does not use the
 * half-year age band for this plan.
 *
 * Source: the complete grid was crawled from LIC's live i-magic CalcPremium
 * engine on 2026-10-30. The brochure's published samples (age 40, term 20,
 * male non-smoker, Option I: Rs 11,475 on Rs 50 lakh after the 10% high sum
 * assured rebate) match the engine exactly. The crawl covers ages 18-65,
 * every valid term up to maturity 80, all four PPT shapes, both options,
 * both genders and both smoking statuses.
 *
 * High Sum Assured rebate and the 2% half-yearly loading are applied by
 * lic855Calculator, not stored as rebate rows: both are percentages of the
 * tabular premium, so a row per rate combination would duplicate the grid.
 */
const PLAN_NUMBER = "855";

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
  const source = rates855 as unknown as { rows?: RateRow[] };
  if (!Array.isArray(source.rows) || source.rows.length === 0) {
    throw new Error("Plan 855: premiumRates855.json has no rows");
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
  const riderDefs = [
    { code: "DAB", rate: 1.0 },
    { code: "ABR", rate: 0.5 },
  ];

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

    if (def.code === "DAB") {
      // DAB is NOT flat: LIC prices it per (entry age, premium paying term).
      // The rider term is shortened by LIC (DAB to age 69) but the premium
      // does not depend on the rider term, so every term 1..40 is stored for
      // each crawled (age, PPT) combination.
      const dabBands = (riderRates855 as any).dabBands as {
        age: number;
        rt: number;
        ppt: number;
        band: number;
        rate: number;
      }[];
      const dabWhole = (riderRates855 as any).dabWhole as {
        age: number;
        rt: number;
        ppt: number;
        rate: number;
      }[];

      // Half-year age-band rows: entryAge 0 so the controller's band lookup
      // (entryAge: undefined, ageBand: band) resolves to them.
      for (const r of dabBands) {
        rows.push({
          riderId: rider.id,
          productId,
          entryAge: 0,
          ageBand: r.band,
          riderTerm: r.rt,
          premiumPayingTerm: r.ppt,
          option: null,
          gender: null,
          ratePerThousand: r.rate,
        });
      }

      // Whole-year fallback rows for callers without a date of birth.
      for (const r of dabWhole) {
        rows.push({
          riderId: rider.id,
          productId,
          entryAge: r.age,
          ageBand: null,
          riderTerm: r.rt,
          premiumPayingTerm: r.ppt,
          option: null,
          gender: null,
          ratePerThousand: r.rate,
        });
      }

      // Last-resort fallback for an unexpected age.
      for (let riderTerm = 1; riderTerm <= 40; riderTerm++) {
        rows.push({
          riderId: rider.id,
          productId,
          entryAge: 0,
          ageBand: null,
          riderTerm,
          premiumPayingTerm: 10,
          option: null,
          gender: null,
          ratePerThousand: 1.0,
        });
      }
    } else {
      // ABR is flat per Rs 1,000 of rider sum assured.
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
      `    ✓ ${def.code} rider: ${rows.length} age/PPT/term rows` +
        (def.code === "DAB" ? " (rates crawled per PPT)" : ` at Rs ${def.rate.toFixed(2)} per 1,000`),
    );
  }
}

export const seedPremiumRates855 = async (prisma: PrismaClient) => {
  const startedAt = Date.now();
  const product = await prisma.productMaster.findFirst({
    where: { planNumber: PLAN_NUMBER, productCode: "LEGACY-855" },
    select: { id: true, productName: true },
  });

  if (!product) {
    console.warn(
      `  x Plan ${PLAN_NUMBER} not found (LEGACY-855); skipping rates`,
    );
    return;
  }

  console.log(
    `  - Plan ${PLAN_NUMBER} (${product.productName}) premium rates`,
  );

  const plan855 = (legacyPlans as any[]).find((p) => p.planNumber === PLAN_NUMBER);
  if (plan855) {
    const attrMap: Record<string, string> = {};
    if (plan855.minEntryAge) attrMap.MIN_ENTRY_AGE = plan855.minEntryAge;
    if (plan855.maxEntryAge) attrMap.MAX_ENTRY_AGE = plan855.maxEntryAge;
    if (plan855.minPolicyTerm) attrMap.MIN_POLICY_TERM = plan855.minPolicyTerm;
    if (plan855.maxPolicyTerm) attrMap.MAX_POLICY_TERM = plan855.maxPolicyTerm;
    if (plan855.minPpt) attrMap.MIN_PPT = plan855.minPpt;
    if (plan855.maxPpt) attrMap.MAX_PPT = plan855.maxPpt;
    if (plan855.terms) attrMap.TERMS = plan855.terms;
    // PPTS is intentionally empty; PPT_FORMULA below is term-specific.
    attrMap.PPTS = plan855.ppts ?? "";
    if (plan855.pptFormula) attrMap.PPT_FORMULA = plan855.pptFormula;
    if (plan855.pptNotes) attrMap.PPT_NOTES = plan855.pptNotes;
    if (plan855.introDate) attrMap.INTRO_DATE = plan855.introDate;
    if (plan855.withdrawalDate) attrMap.WITHDRAWAL_DATE = plan855.withdrawalDate;
    if (plan855.allowedRiders?.length) {
      attrMap.ALLOWED_RIDERS = plan855.allowedRiders.join(",");
    }
    if (plan855.minSumAssured) {
      attrMap.MIN_SUM_ASSURED = String(plan855.minSumAssured);
      attrMap.DEFAULT_SUM_ASSURED = String(plan855.minSumAssured);
    }
    if (plan855.notes) attrMap.PLAN_NOTES = plan855.notes;
    for (const [code, value] of ATTRIBUTES) attrMap[code] = value;

    for (const [code, value] of Object.entries(attrMap)) {
      await upsertAttribute(prisma, product.id, code, value);
    }

    // The plan has no maximum sum assured. Remove any stale cap left by the
    // old catalogue row (which incorrectly said Rs 25,00,000).
    if (plan855.maxSumAssured == null) {
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
