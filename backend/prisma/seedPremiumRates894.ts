import type { PrismaClient } from "@prisma/client";
import legacyPlans from "./masterData/legacyPlans.json";
import rates894 from "./masterData/premiumRates894.json";

/**
 * LIC Plan 894 - LIC's Jeevan Raksha (UIN: 512N368V01).
 *
 * Non-Par, Non-Linked, Individual, Pure Risk Term Plan. On sale from
 * 07 Sep 2026 (launch announced 01 Sep 2026, LIC press release).
 *
 * Tabular Annual Premium rates per Rs 1,000 Basic Sum Assured. LIC prices this
 * plan on 16 separate tables (Gender x Smoker x premium payment option), so
 * every row carries gender, smoker, policy term and premium paying term.
 *
 * Sources:
 * 1. LIC sales brochure (both versions, sec. 2 / 5 / 7 / 8):
 *    https://licindia.in/lic-s-jeevan-raksha
 *    - Eligibility: entry age 18-45, maturity age 33-60, term 15-42 yrs
 *    - PPT: single (1), limited (10 and 15), regular (same as term);
 *      limited-15 needs policy term >= 20
 *    - Modes: Yearly or Half-Yearly only; half-yearly conversion rate 2% / 2
 *    - High Sum Assured rebate: 3%-18% of tabular premium (sec.8)
 *    - Sample premiums (sec.7, Male/Non-Smoker, BSA 5,00,000, term 20):
 *      age 20:  Regular 2,290 / Lim-15 2,555 / Lim-10 3,150 / Single 19,035
 *      age 30:  Regular 2,730 / Lim-15 3,070 / Lim-10 3,825 / Single 23,805
 *      age 40:  Regular 4,435 / Lim-15 5,035 / Lim-10 6,390 / Single 41,770
 *    - Accident Benefit Rider: Rs 0.50 per Rs 1,000 AB sum assured
 *      (launch circular sec.8), Regular/Limited premium only
 * 2. Rate grid: masterData/premiumRates894.json - the 16 tables LIC files as
 *    "Annexure 1" to its launch circular but does not publish. Taken from the
 *    published licplancalc.com client-side engine and validated 14/14 against
 *    the brochure samples above plus the user's own i-magic quotes
 *    (Female/Non-Smoker, age 39, term 21: PPT 10 = 10.56, PPT 1 = 68.07).
 *    i-magic's CalcPremium endpoint returns 0 for plan 894, so it cannot be
 *    crawled - see prisma/scripts/licEndpoints.ts.
 * 3. GST: 18% of the premium (Government of India GST on first-year life
 *    insurance premium; single premium policies are taxed at 18% as well).
 *    The backend only ever computes a policy's first premium, so a single
 *    GST_RATE of 18 is correct for every calculation it performs.
 */
const PLAN_NUMBER = "894";

const ATTRIBUTES: [string, string][] = [
  ["GST_RATE", "18"],
  ["ALLOWED_PREMIUM_MODES", "Yearly,Half-Yearly"],
  ["MAX_MATURITY_AGE", "60"],
];

// Mode conversion (LIC brochure sec.8 iii): yearly = 1, half-yearly = 2%
// conversion rate over 2 installments => 1.02 / 2 = 0.51 of the annual premium.
const MODE_FACTORS = [
  ["YLY", 1],
  ["HLY", 0.51],
] as const;

type RateRow = {
  entryAge: number;
  gender: string;
  smoker: boolean;
  policyTerm: number;
  premiumPayingTerm: number;
  tabularRate: number;
};

/** Expands the 16 stored matrices into productPremiumRate rows. */
function buildRateRows(): RateRow[] {
  const matrices = rates894 as unknown as {
    matrices: Record<string, Record<string, Record<string, number>>>;
  };

  const rows: RateRow[] = [];

  for (const [key, ages] of Object.entries(matrices.matrices)) {
    const [genderToken, smokerToken, ...optionParts] = key.split("_");
    const gender = genderToken === "female" ? "F" : "M";
    const smoker = smokerToken === "s";
    const option = optionParts.join("_"); // regular | limited_10 | limited_15 | single

    if (!["regular", "limited_10", "limited_15", "single"].includes(option)) {
      throw new Error(`Plan ${PLAN_NUMBER}: unexpected rate matrix "${key}"`);
    }

    for (const [ageStr, terms] of Object.entries(ages)) {
      const entryAge = Number(ageStr);
      for (const [termStr, tabularRate] of Object.entries(terms)) {
        const policyTerm = Number(termStr);
        const premiumPayingTerm =
          option === "regular"
            ? policyTerm
            : option === "single"
              ? 1
              : Number(option.split("_")[1]);

        rows.push({
          entryAge,
          gender,
          smoker,
          policyTerm,
          premiumPayingTerm,
          tabularRate,
        });
      }
    }
  }

  return rows;
}

/**
 * LIC's Accident Benefit Rider at Rs 0.50 per Rs 1,000 accident benefit sum
 * assured, flat for every age (launch circular sec.8). The plan does not offer
 * any other rider, so DAB / TERM links are removed from this product.
 */
export const seedRiderPremium894 = async (
  prisma: PrismaClient,
  productId: string,
) => {
  const abr = await prisma.riderMaster.findFirst({
    where: { riderCode: "ABR" },
    select: { id: true },
  });

  // Drop riders this plan never offered (only LIC's Accident Benefit Rider).
  const linkedRiders = await prisma.productRider.findMany({
    where: { productId },
    select: { riderId: true },
  });
  const staleRiderIds = linkedRiders
    .map((r) => r.riderId)
    .filter((id) => id !== abr?.id);
  if (staleRiderIds.length > 0) {
    await prisma.riderPremiumRate.deleteMany({
      where: { productId, riderId: { in: staleRiderIds } },
    });
    await prisma.productRider.deleteMany({
      where: { productId, riderId: { in: staleRiderIds } },
    });
    console.log(
      `  - Plan ${PLAN_NUMBER}: removed ${staleRiderIds.length} rider link(s) this plan does not offer`,
    );
  }

  if (!abr) {
    console.warn(`  x Plan ${PLAN_NUMBER}: rider master ABR not found`);
    return;
  }

  await prisma.riderPremiumRate.deleteMany({
    where: { productId, riderId: abr.id },
  });

  const rows: {
    riderId: string;
    productId: string;
    entryAge: number;
    ageBand: null;
    riderTerm: number;
    premiumPayingTerm: null;
    ratePerThousand: number;
  }[] = [];

  // Rider is available up to age 55 (circular sec.4), while the base plan
  // caps entry age at 45; both ranges are covered.
  for (let entryAge = 18; entryAge <= 55; entryAge++) {
    const maxTerm = Math.min(42, 60 - entryAge);
    for (let riderTerm = 1; riderTerm <= maxTerm; riderTerm++) {
      rows.push({
        riderId: abr.id,
        productId,
        entryAge,
        ageBand: null,
        riderTerm,
        premiumPayingTerm: null,
        ratePerThousand: 0.5,
      });
    }
  }

  // Fallback entryAge so an unexpected age still resolves to the flat rate.
  for (let riderTerm = 1; riderTerm <= 42; riderTerm++) {
    rows.push({
      riderId: abr.id,
      productId,
      entryAge: 0,
      ageBand: null,
      riderTerm,
      premiumPayingTerm: null,
      ratePerThousand: 0.5,
    });
  }

  for (let offset = 0; offset < rows.length; offset += 1000) {
    await prisma.riderPremiumRate.createMany({
      data: rows.slice(offset, offset + 1000),
    });
  }

  await prisma.productRider.upsert({
    where: { productId_riderId: { productId, riderId: abr.id } },
    update: {},
    create: { productId, riderId: abr.id },
  });

  console.log(
    `  ✓ Plan ${PLAN_NUMBER}: seeded ABR rider rates (Rs 0.50 per 1,000)`,
  );
};

export const seedPremiumRates894 = async (prisma: PrismaClient) => {
  const startedAt = Date.now();
  const product = await prisma.productMaster.findFirst({
    where: { planNumber: PLAN_NUMBER, productCode: "LEGACY-894" },
    select: { id: true, productName: true },
  });

  if (!product) {
    console.warn(
      `  x Plan ${PLAN_NUMBER} not found (LEGACY-894); skipping rates`,
    );
    return;
  }

  // 1. Product attributes: legacyPlans.json metadata plus the attributes that
  //    are only known from this plan's own documents (GST, allowed modes).
  const plan894 = (legacyPlans as any[]).find((p) => p.planNumber === PLAN_NUMBER);
  if (plan894) {
    const attrMasters = await prisma.productAttributeMaster.findMany({
      select: { id: true, attributeCode: true },
    });
    const attrByCode = new Map(attrMasters.map((a) => [a.attributeCode, a.id]));

    const attrMap: Record<string, string> = {};
    if (plan894.minEntryAge) attrMap.MIN_ENTRY_AGE = plan894.minEntryAge;
    if (plan894.maxEntryAge) attrMap.MAX_ENTRY_AGE = plan894.maxEntryAge;
    if (plan894.minPolicyTerm) attrMap.MIN_POLICY_TERM = plan894.minPolicyTerm;
    if (plan894.maxPolicyTerm) attrMap.MAX_POLICY_TERM = plan894.maxPolicyTerm;
    if (plan894.minPpt) attrMap.MIN_PPT = plan894.minPpt;
    if (plan894.maxPpt) attrMap.MAX_PPT = plan894.maxPpt;
    if (plan894.terms) attrMap.TERMS = plan894.terms;
    if (plan894.ppts) attrMap.PPTS = plan894.ppts;
    if (plan894.introDate) attrMap.INTRO_DATE = plan894.introDate;
    if (plan894.withdrawalDate) attrMap.WITHDRAWAL_DATE = plan894.withdrawalDate;
    if (plan894.allowedRiders?.length)
      attrMap.ALLOWED_RIDERS = plan894.allowedRiders.join(",");
    if (plan894.minSumAssured) {
      attrMap.MIN_SUM_ASSURED = String(plan894.minSumAssured);
      attrMap.DEFAULT_SUM_ASSURED = String(plan894.minSumAssured);
    }
    if (plan894.maxSumAssured) {
      attrMap.MAX_SUM_ASSURED = String(plan894.maxSumAssured);
    }
    if (plan894.pptNotes) attrMap.PPT_NOTES = plan894.pptNotes;
    if (plan894.notes) attrMap.PLAN_NOTES = plan894.notes;
    for (const [code, value] of ATTRIBUTES) attrMap[code] = value;

    for (const [code, value] of Object.entries(attrMap)) {
      const attributeId = attrByCode.get(code);
      if (!attributeId) continue;
      await prisma.productAttributeValue.upsert({
        where: {
          productId_attributeId: { productId: product.id, attributeId },
        },
        update: { value },
        create: { productId: product.id, attributeId, value },
      });
    }
  }

  // 2. Mode ids
  const modes = await prisma.premiumModeMaster.findMany({
    where: { modeCode: { in: MODE_FACTORS.map(([code]) => code) } },
    select: { id: true, modeCode: true },
  });
  const modeByCode = new Map(modes.map((mode) => [mode.modeCode, mode.id]));

  // 3. Tabular rates (all 16 tables) and mode factors
  const rows = buildRateRows();

  await prisma.$transaction(async (tx) => {
    await tx.productPremiumRate.deleteMany({
      where: { productId: product.id },
    });
    for (let offset = 0; offset < rows.length; offset += 1000) {
      await tx.productPremiumRate.createMany({
        data: rows.slice(offset, offset + 1000).map((r) => ({
          productId: product.id,
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
  });

  // 4. Riders
  await seedRiderPremium894(prisma, product.id);

  const [rateCount, modeFactorCount] = await Promise.all([
    prisma.productPremiumRate.count({ where: { productId: product.id } }),
    prisma.productPremiumModeFactor.count({ where: { productId: product.id } }),
  ]);

  console.log(
    `  ✓ Plan ${PLAN_NUMBER} (${product.productName}): ${rateCount} premium points, ` +
      `${modeFactorCount} mode factors in ${Date.now() - startedAt}ms`,
  );
};
