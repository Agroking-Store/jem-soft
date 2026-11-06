import type { PrismaClient } from "@prisma/client";
import legacyPlans from "./masterData/legacyPlans.json";
import rates890 from "./masterData/premiumRates890.json";

/**
 * LIC Plan 890 - LIC's New Bima Jyoti (UIN 512N395V01).
 *
 * Non-par, non-linked, individual, limited premium endowment savings plan with
 * guaranteed additions. Term 15-20 years, premium paying term = term - 5.
 *
 * Tabular annual premium rates per Rs 1,000 Basic Sum Assured. LIC prices the
 * plan on entry age and policy term only - the rate does not move with the sum
 * assured, gender or smoking status - so the grid is a single table:
 *
 *   age 3..60  x term 15     age 2..59 x term 16   age 2..58 x term 17
 *   age 0..57  x term 18     age 0..56 x term 19   age 0..55 x term 20
 *
 * Sources:
 * 1. LIC sales brochure (sec.2 / sec.9 / sec.10 / sec.22):
 *    https://licindia.in/documents/20121/1850013/New+Bima+Jyoti+Sales+Brochure_English.pdf
 *    - Eligibility: entry age 30 days to 60, maturity 18 to 75, term 15-20,
 *      PPT = term - 5, minimum BSA Rs 1,25,000 (5,000 multiples up to 2,75,000,
 *      25,000 above)
 *    - Premium conversion factors (sec.9): yearly 1.0000, half-yearly 0.5090,
 *      quarterly 0.2568, monthly 0.0861
 *    - Sample illustration (sec.22): age 35, term 20, PPT 15, BSA 10,00,000,
 *      yearly = Rs 84,700 - reproduced exactly by this grid
 *    - GST: "GST rate shall be as applicable from time to time. Currently it is
 *      exempted." => GST_RATE 0
 *    - The high sum assured / online sale incentives (sec.10) raise the rate of
 *      Guaranteed Additions; they are NOT premium rebates, so no rebate rows
 *      are seeded for this plan.
 * 2. Rate grid: masterData/premiumRates890.json, crawled from LIC's CalcPremium
 *    (i-magic) on 2026-10-28. Unlike plan 894 the endpoint prices 890, so the
 *    grid is LIC's own engine output rather than a third-party table.
 * 3. Riders (brochure sec.6): Double Accident Benefit (Rs 1.35 per 1,000 at
 *    term 15, falling to Rs 1.20 at term 20), Accident Benefit Rider (flat
 *    Rs 0.50 per 1,000), Term Rider Benefit and the Critical Illness Health
 *    Rider options 1 and 2 (age x term x gender). All crawled from LIC's
 *    Lookup/Riders endpoint. Premium Waiver Benefit is not priced by LIC's
 *    engine (it only applies where the life assured is a minor), so it is not
 *    linked.
 */
const PLAN_NUMBER = "890";

const ATTRIBUTES: [string, string][] = [
  ["GST_RATE", "0"],
  ["ALLOWED_PREMIUM_MODES", "Yearly,Half-Yearly,Quarterly,Monthly"],
  ["MAX_MATURITY_AGE", "75"],
];

/** LIC premium conversion factors, brochure sec.9. */
const MODE_FACTORS = [
  ["YLY", 1],
  ["HLY", 0.509],
  ["QLY", 0.2568],
  ["MLY", 0.0861],
] as const;

type BaseRow = {
  entryAge: number;
  ageBand: null;
  policyTerm: number;
  premiumPayingTerm: number;
  tabularRate: number;
  gender: null;
  smoker: null;
};

/**
 * Expands the crawled matrices (term -> age -> rate) into rate rows.
 *
 * Both half-year bands of every age year were crawled and priced identically,
 * so the plan is rated on whole (nearest-birthday) years and the rows carry no
 * age band.
 */
function buildBaseRows(): BaseRow[] {
  const matrices = (rates890 as any).matrices as Record<
    string,
    { entryAge: Record<string, number> }
  >;

  const rows: BaseRow[] = [];
  for (const [termStr, table] of Object.entries(matrices)) {
    const policyTerm = Number(termStr);
    for (const [ageStr, tabularRate] of Object.entries(table.entryAge)) {
      rows.push({
        entryAge: Number(ageStr),
        ageBand: null,
        policyTerm,
        premiumPayingTerm: policyTerm - 5,
        tabularRate,
        gender: null,
        smoker: null,
      });
    }
  }
  return rows;
}

type RiderRow = {
  entryAge: number;
  ageBand: number | null;
  riderTerm: number;
  premiumPayingTerm: null;
  option: null;
  gender: "MALE" | "FEMALE" | null;
  ratePerThousand: number;
};

const RIDER_ORDER = ["DAB", "ABR", "TRB", "CIR", "CIR2"] as const;

/** Rider rates crawled from LIC's Lookup/Riders endpoint. */
function buildRiderRows(): Record<string, RiderRow[]> {
  const crawled = (rates890 as any).riders as Record<
    string,
    {
      entryAge: number;
      ageBand: number | null;
      riderTerm: number;
      ppt: number | null;
      gender?: string;
      rate: number;
    }[]
  >;

  const out: Record<string, RiderRow[]> = {};
  for (const code of RIDER_ORDER) {
    out[code] = (crawled[code] ?? [])
      // The Term Rider Benefit prices the same in both halves of an age year,
      // so its duplicate band rows are dropped; CIR/CIR2 keep them because LIC
      // quotes a different premium either side of the birthday.
      .filter((r) => code !== "TRB" || r.ageBand == null)
      .map((r) => ({
        entryAge: r.entryAge,
        ageBand: r.ageBand,
        riderTerm: r.riderTerm,
        // The premium paying term is implied by the rider term (term - 5), so
        // it is left empty: the rider endpoint then matches a request that
        // carries a PPT as well as one that does not.
        premiumPayingTerm: null,
        option: null,
        gender: r.gender === "M" ? "MALE" : r.gender === "F" ? "FEMALE" : null,
        ratePerThousand: r.rate,
      }));
  }
  return out;
}

export const seedRiderPremium890 = async (
  prisma: PrismaClient,
  productId: string,
) => {
  const masters = await prisma.riderMaster.findMany({
    where: { riderCode: { in: [...RIDER_ORDER] } },
    select: { id: true, riderCode: true },
  });
  const byCode = new Map(masters.map((m) => [m.riderCode, m.id]));

  const missing = RIDER_ORDER.filter((code) => !byCode.has(code));
  if (missing.length > 0) {
    console.warn(`  x Plan ${PLAN_NUMBER}: rider master missing ${missing.join(", ")}`);
  }

  // Remove any rider this plan never offered (and its rates).
  const keep = new Set([...byCode.values()]);
  const linked = await prisma.productRider.findMany({
    where: { productId },
    select: { riderId: true },
  });
  const stale = linked.map((r) => r.riderId).filter((id) => !keep.has(id));
  if (stale.length > 0) {
    await prisma.riderPremiumRate.deleteMany({
      where: { productId, riderId: { in: stale } },
    });
    await prisma.productRider.deleteMany({
      where: { productId, riderId: { in: stale } },
    });
    console.log(
      `  - Plan ${PLAN_NUMBER}: removed ${stale.length} rider link(s) this plan does not offer`,
    );
  }

  const rows = buildRiderRows();

  for (const code of RIDER_ORDER) {
    const riderId = byCode.get(code);
    if (!riderId) continue;

    await prisma.riderPremiumRate.deleteMany({ where: { productId, riderId } });

    const data = rows[code]!.map((r) => ({
      riderId,
      productId,
      entryAge: r.entryAge,
      ageBand: r.ageBand,
      riderTerm: r.riderTerm,
      premiumPayingTerm: r.premiumPayingTerm,
      option: r.option,
      gender: r.gender,
      ratePerThousand: r.ratePerThousand,
    }));

    for (let offset = 0; offset < data.length; offset += 1000) {
      await prisma.riderPremiumRate.createMany({
        data: data.slice(offset, offset + 1000),
      });
    }

    await prisma.productRider.upsert({
      where: { productId_riderId: { productId, riderId } },
      update: {},
      create: { productId, riderId },
    });

    console.log(`  OK Plan ${PLAN_NUMBER}: ${data.length} ${code} rider rates`);
  }
};

export const seedPremiumRates890 = async (prisma: PrismaClient) => {
  const startedAt = Date.now();
  const product = await prisma.productMaster.findFirst({
    where: { planNumber: PLAN_NUMBER, productCode: "LEGACY-890" },
    select: { id: true, productName: true },
  });

  if (!product) {
    console.warn(`  x Plan ${PLAN_NUMBER} not found (LEGACY-890); skipping rates`);
    return;
  }

  // 1. Product attributes: legacyPlans.json metadata plus the attributes that
  //    only this plan's own documents give us (GST, allowed modes).
  const plan890 = (legacyPlans as any[]).find((p) => p.planNumber === PLAN_NUMBER);
  if (plan890) {
    const attrMasters = await prisma.productAttributeMaster.findMany({
      select: { id: true, attributeCode: true },
    });
    const attrByCode = new Map(attrMasters.map((a) => [a.attributeCode, a.id]));

    const attrMap: Record<string, string> = {};
    if (plan890.minEntryAge != null) attrMap.MIN_ENTRY_AGE = String(plan890.minEntryAge);
    if (plan890.maxEntryAge) attrMap.MAX_ENTRY_AGE = plan890.maxEntryAge;
    if (plan890.minPolicyTerm) attrMap.MIN_POLICY_TERM = plan890.minPolicyTerm;
    if (plan890.maxPolicyTerm) attrMap.MAX_POLICY_TERM = plan890.maxPolicyTerm;
    if (plan890.minPpt) attrMap.MIN_PPT = plan890.minPpt;
    if (plan890.maxPpt) attrMap.MAX_PPT = plan890.maxPpt;
    if (plan890.terms) attrMap.TERMS = plan890.terms;
    if (plan890.ppts) attrMap.PPTS = plan890.ppts;
    if (plan890.introDate) attrMap.INTRO_DATE = plan890.introDate;
    if (plan890.withdrawalDate) attrMap.WITHDRAWAL_DATE = plan890.withdrawalDate;
    if (plan890.allowedRiders?.length)
      attrMap.ALLOWED_RIDERS = plan890.allowedRiders.join(",");
    if (plan890.minSumAssured) {
      attrMap.MIN_SUM_ASSURED = String(plan890.minSumAssured);
      attrMap.DEFAULT_SUM_ASSURED = String(plan890.minSumAssured);
    }
    if (plan890.maxSumAssured) {
      attrMap.MAX_SUM_ASSURED = String(plan890.maxSumAssured);
    }
    if (plan890.pptNotes) attrMap.PPT_NOTES = plan890.pptNotes;
    if (plan890.notes) attrMap.PLAN_NOTES = plan890.notes;
    for (const [code, value] of ATTRIBUTES) attrMap[code] = value;

    for (const [code, value] of Object.entries(attrMap)) {
      const attributeId = attrByCode.get(code);
      if (!attributeId) continue;
      await prisma.productAttributeValue.upsert({
        where: { productId_attributeId: { productId: product.id, attributeId } },
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

  // 3. Tabular rates and mode factors
  const rows = buildBaseRows();

  await prisma.$transaction(async (tx) => {
    await tx.productPremiumRate.deleteMany({ where: { productId: product.id } });
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
  await seedRiderPremium890(prisma, product.id);

  const [rateCount, modeFactorCount] = await Promise.all([
    prisma.productPremiumRate.count({ where: { productId: product.id } }),
    prisma.productPremiumModeFactor.count({ where: { productId: product.id } }),
  ]);

  console.log(
    `  OK Plan ${PLAN_NUMBER} (${product.productName}): ${rateCount} premium points, ` +
      `${modeFactorCount} mode factors in ${Date.now() - startedAt}ms`,
  );
};
