import type { PrismaClient } from "@prisma/client";
import { TRB_ROWS } from "./seedPremiumRates915";

/**
 * LIC Plan 770 (Bima Platinum).
 *
 * This intentionally seeds only published/quoted exact points, not an
 * interpolated actuarial table. LIC's brochure publishes sample annual
 * premiums for age-nearer-birthday 15/25/35/45, PPT 7/10/12/15/18, and term
 * 30 at BSA Rs 300,000, plus one full illustration at age 35, term 25, PPT 12.
 * The supplied quote adds one exact point at age 47, term 17, PPT 7.
 *
 * Source: LIC Bima Platinum Sales Brochure, pp. 15 and 33-34:
 * https://licindia.in/documents/20121/1860176/LIC+Bima+platinum+Sales+brochure.pdf/ae9590c9-2c2d-6dca-c180-5bbb3f956dab?t=1788330413553
 *
 * Rates are annual premium per Rs 1,000 BSA (brochure sample premium / 300).
 * Other age/term/PPT combinations are deliberately omitted: the linked
 * third-party calculator disclaims official rates and its listed terms conflict
 * with LIC's brochure. A missing rate will continue to fail lookup rather than
 * silently return an estimated premium.
 */
const PLAN_NUMBER = "770";

/** [entryAge, policyTerm, premiumPayingTerm, annualRatePerThousand] */
const RATE_ROWS: [number, number, number, number][] = [
  // Official brochure sample annual premium, BSA Rs 300,000, policy term 30.
  [15, 30, 7, 272.7],
  [15, 30, 10, 182.45],
  [15, 30, 12, 143.4],
  [15, 30, 15, 107.15],
  [15, 30, 18, 83.3],
  [25, 30, 7, 277.15],
  [25, 30, 10, 184.25],
  [25, 30, 12, 144.3],
  [25, 30, 15, 107.4],
  [25, 30, 18, 83.35],
  [35, 30, 7, 291.65],
  [35, 30, 10, 190.05],
  [35, 30, 12, 147.2],
  [35, 30, 15, 108.15],
  [35, 30, 18, 83.35],
  [45, 30, 7, 334.55],
  [45, 30, 10, 206.75],
  [45, 30, 12, 155.9],
  [45, 30, 15, 111.55],
  [45, 30, 18, 84.75],

  // Official brochure benefit illustration: Rs 146,650 / (Rs 1,000,000 / 1,000).
  [35, 25, 12, 146.65],

  // Exact point from the supplied calculation JSON: Rs 298,950 / 1,000,000 x 1,000.
  [47, 17, 7, 298.95],
];

// Official brochure premium conversion factors, applied to derived yearly premium.
const MODE_FACTORS = [
  ["YLY", 1],
  ["HLY", 0.509],
  ["QLY", 0.2568],
  ["MLY", 0.0861],
] as const;

export const seedRiderPremium770 = async (prisma: PrismaClient) => {
  const products = await prisma.productMaster.findMany({
    where: { planNumber: PLAN_NUMBER },
    select: { id: true, productName: true, productCode: true },
  });
  if (products.length === 0) return;

  const dab = await prisma.riderMaster.findFirst({
    where: { riderCode: "DAB" },
    select: { id: true },
  });
  const abr = await prisma.riderMaster.findFirst({
    where: { riderCode: "ABR" },
    select: { id: true },
  });
  const trb = await prisma.riderMaster.findFirst({
    where: { riderCode: "TRB" },
    select: { id: true },
  });

  for (const product of products) {
    await prisma.riderPremiumRate.deleteMany({ where: { productId: product.id } });

    const rows: any[] = [];

    // 1. Double Accident Benefit (DAB): Rs 0.50 per Rs 1,000 Sum Assured flat
    if (dab) {
      for (let entryAge = 18; entryAge <= 65; entryAge++) {
        const maxTerm = Math.min(35, 70 - entryAge);
        for (let riderTerm = 1; riderTerm <= maxTerm; riderTerm++) {
          rows.push({
            riderId: dab.id,
            productId: product.id,
            entryAge,
            ageBand: null,
            riderTerm,
            premiumPayingTerm: null,
            ratePerThousand: 0.5,
          });
        }
      }
      for (let riderTerm = 1; riderTerm <= 35; riderTerm++) {
        rows.push({
          riderId: dab.id,
          productId: product.id,
          entryAge: 0,
          ageBand: null,
          riderTerm,
          premiumPayingTerm: null,
          ratePerThousand: 0.5,
        });
      }
    }

    // 2. Accident Benefit Rider (ABR): Rs 0.50 per Rs 1,000 Sum Assured flat
    if (abr) {
      for (let entryAge = 18; entryAge <= 65; entryAge++) {
        const maxTerm = Math.min(35, 70 - entryAge);
        for (let riderTerm = 1; riderTerm <= maxTerm; riderTerm++) {
          rows.push({
            riderId: abr.id,
            productId: product.id,
            entryAge,
            ageBand: null,
            riderTerm,
            premiumPayingTerm: null,
            ratePerThousand: 0.5,
          });
        }
      }
      for (let riderTerm = 1; riderTerm <= 35; riderTerm++) {
        rows.push({
          riderId: abr.id,
          productId: product.id,
          entryAge: 0,
          ageBand: null,
          riderTerm,
          premiumPayingTerm: null,
          ratePerThousand: 0.5,
        });
      }
    }

    // 3. Term Rider Benefit (TRB)
    if (trb && TRB_ROWS && TRB_ROWS.length > 0) {
      rows.push(
        ...TRB_ROWS.map(([entryAge, riderTerm, ratePerThousand]) => ({
          riderId: trb.id,
          productId: product.id,
          entryAge,
          ageBand: null,
          riderTerm,
          premiumPayingTerm: null,
          ratePerThousand,
        })),
      );
    }

    if (rows.length > 0) {
      // Chunk inserts in batches of 1000
      for (let offset = 0; offset < rows.length; offset += 1000) {
        await prisma.riderPremiumRate.createMany({
          data: rows.slice(offset, offset + 1000),
        });
      }
    }

    // Link ProductRider
    for (const r of [dab, abr, trb]) {
      if (!r) continue;
      const exists = await prisma.productRider.findFirst({
        where: { productId: product.id, riderId: r.id },
      });
      if (!exists) {
        await prisma.productRider.create({
          data: { productId: product.id, riderId: r.id },
        });
      }
    }

    console.log(
      `  ✓ Plan ${PLAN_NUMBER} (${product.productCode}): seeded ${rows.length} rider rates (DAB + ABR + TRB)`,
    );
  }
};

export const seedPremiumRates770 = async (prisma: PrismaClient) => {
  const startedAt = Date.now();
  const product = await prisma.productMaster.findFirst({
    where: { planNumber: PLAN_NUMBER, productCode: "LEGACY-770" },
    select: { id: true, productName: true },
  });

  if (!product) {
    console.warn(`  x Plan ${PLAN_NUMBER} not found (LEGACY-770); skipping exact sample rates`);
    return;
  }

  const modes = await prisma.premiumModeMaster.findMany({
    where: { modeCode: { in: MODE_FACTORS.map(([code]) => code) } },
    select: { id: true, modeCode: true },
  });
  const modeByCode = new Map(modes.map((mode) => [mode.modeCode, mode.id]));
  const missingModes = MODE_FACTORS.map(([code]) => code).filter((code) => !modeByCode.has(code));
  if (missingModes.length) {
    throw new Error(`Plan ${PLAN_NUMBER}: missing premium mode masters ${missingModes.join(", ")}`);
  }

  // Replace only the rate rows owned by this seeder so repeated runs are safe.
  await prisma.$transaction(async (tx) => {
    await tx.productPremiumRate.deleteMany({ where: { productId: product.id } });
    for (let offset = 0; offset < RATE_ROWS.length; offset += 500) {
      const batch = RATE_ROWS.slice(offset, offset + 500);
      await tx.productPremiumRate.createMany({
        data: batch.map(([entryAge, policyTerm, premiumPayingTerm, tabularRate]) => ({
          productId: product.id,
          entryAge,
          policyTerm,
          premiumPayingTerm,
          tabularRate,
        })),
      });
    }
    for (const [modeCode, factor] of MODE_FACTORS) {
      const premiumModeId = modeByCode.get(modeCode)!;
      await tx.productPremiumModeFactor.upsert({
        where: { productId_premiumModeId: { productId: product.id, premiumModeId } },
        update: { factor },
        create: { productId: product.id, premiumModeId, factor },
      });
    }
  });

  const [rateCount, modeFactorCount] = await Promise.all([
    prisma.productPremiumRate.count({ where: { productId: product.id } }),
    prisma.productPremiumModeFactor.count({ where: { productId: product.id } }),
  ]);
  console.log(
    `  ✓ Plan ${PLAN_NUMBER} (${product.productName}): ${rateCount} exact premium points, ` +
      `${modeFactorCount} mode factors in ${Date.now() - startedAt}ms`,
  );
  console.warn(
    `  ! Plan ${PLAN_NUMBER}: sparse exact-point coverage only; unpublished combinations are not interpolated.`,
  );

  // Seed riders for Plan 770
  await seedRiderPremium770(prisma);
};
