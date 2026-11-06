import type { PrismaClient } from "@prisma/client";
import { TRB_ROWS } from "./seedPremiumRates915";

/**
 * LIC Plan 904 - LIC's Jeevan Arogya (UIN 512N266V02 / 512N266V03).
 *
 * Health plan. The premium table below is LIC's published age/gender table for
 * an Initial Daily Benefit (IDB) of Rs 1,000 per day:
 *
 *   - Principal Insured (PI): age 18..79, male/female
 *   - Other insured (spouse/parent/child): age 0..79, male/female
 *     (children 0..17 are unisex, so both columns carry the same value)
 *
 * Unlike the life plans, tabularRate is NOT a rate per Rs 1,000 sum assured.
 * It is the annual premium for IDB 1,000 (MSB Rs 1,00,000). lic904Calculator
 * scales it by IDB/1,000 and applies LIC's mode and HCB rebates.
 *
 * Sum assured is the Major Surgical Benefit (MSB) = 100 x IDB, so the valid
 * sums assured are 1,00,000 / 2,00,000 / 3,00,000 / 4,00,000.
 */
const PLAN_NUMBER = "904";

// Annual premium for IDB 1,000, before mode/HCB rebate and before GST.
const PI_RATES: Record<number, { M: number; F: number }> = {
  18: { M: 1866.25, F: 1672.15 },
  19: { M: 1895.8, F: 1698.3 },
  20: { M: 1922.65, F: 1723.65 },
  21: { M: 1948.9, F: 1750 },
  22: { M: 1976.85, F: 1778.75 },
  23: { M: 2005.75, F: 1807.15 },
  24: { M: 2036.85, F: 1835.75 },
  25: { M: 2066.1, F: 1864.95 },
  26: { M: 2094.15, F: 1898.65 },
  27: { M: 2124.7, F: 1934.05 },
  28: { M: 2159.85, F: 1969.7 },
  29: { M: 2199.75, F: 2005.5 },
  30: { M: 2242.9, F: 2044.5 },
  31: { M: 2286.4, F: 2084.7 },
  32: { M: 2331.25, F: 2127.75 },
  33: { M: 2376.75, F: 2172.35 },
  34: { M: 2424.4, F: 2219.9 },
  35: { M: 2475.85, F: 2269.15 },
  36: { M: 2530.75, F: 2320.45 },
  37: { M: 2591.1, F: 2373.15 },
  38: { M: 2656.1, F: 2427.85 },
  39: { M: 2725.45, F: 2480.85 },
  40: { M: 2799.7, F: 2538.65 },
  41: { M: 2878.7, F: 2597.15 },
  42: { M: 2962.55, F: 2654.85 },
  43: { M: 3051.3, F: 2706.9 },
  44: { M: 3139.75, F: 2758.25 },
  45: { M: 3229.75, F: 2812.95 },
  46: { M: 3324.65, F: 2870.4 },
  47: { M: 3428.4, F: 2933.1 },
  48: { M: 3538.75, F: 2995.65 },
  49: { M: 3651.6, F: 3067.3 },
  50: { M: 3768, F: 3134.7 },
  51: { M: 3881.85, F: 3202 },
  52: { M: 4001.5, F: 3261.1 },
  53: { M: 4127.45, F: 3315.8 },
  54: { M: 4254.6, F: 3378.15 },
  55: { M: 4383.85, F: 3442.6 },
  56: { M: 4509.4, F: 3516.75 },
  57: { M: 4647.95, F: 3592.35 },
  58: { M: 4769.7, F: 3671.4 },
  59: { M: 4897.05, F: 3744.45 },
  60: { M: 5027.5, F: 3818.6 },
  61: { M: 5159.6, F: 3903.65 },
  62: { M: 5285.85, F: 3979.7 },
  63: { M: 5398.4, F: 4053.45 },
  64: { M: 5538.3, F: 4099.1 },
  65: { M: 5686.8, F: 4167.95 },
  66: { M: 5852.65, F: 4241.25 },
  67: { M: 6001.2, F: 4314.85 },
  68: { M: 6155.85, F: 4390.2 },
  69: { M: 6331.1, F: 4455.15 },
  70: { M: 6473.65, F: 4555.75 },
  71: { M: 6621.35, F: 4646.3 },
  72: { M: 6741.95, F: 4796.65 },
  73: { M: 6964.7, F: 4997.15 },
  74: { M: 7270, F: 5283.8 },
  75: { M: 7764.9, F: 5583.65 },
  76: { M: 8431.25, F: 5963.15 },
  77: { M: 9437.7, F: 6718.25 },
  78: { M: 11206.5, F: 8223.95 },
  79: { M: 18090.85, F: 14192.65 },
};

const OTHER_RATES: Record<number, { M: number; F: number }> = {
  0: { M: 792, F: 792 },
  1: { M: 792, F: 792 },
  2: { M: 792, F: 792 },
  3: { M: 792.5, F: 792.5 },
  4: { M: 793.4, F: 793.4 },
  5: { M: 794.75, F: 794.75 },
  6: { M: 796.7, F: 796.7 },
  7: { M: 799.25, F: 799.25 },
  8: { M: 802.6, F: 802.6 },
  9: { M: 806.9, F: 806.9 },
  10: { M: 812.35, F: 812.35 },
  11: { M: 819.35, F: 819.35 },
  12: { M: 828.15, F: 828.15 },
  13: { M: 839.15, F: 839.15 },
  14: { M: 853.05, F: 853.05 },
  15: { M: 870.75, F: 870.75 },
  16: { M: 893.85, F: 893.85 },
  17: { M: 924.2, F: 924.2 },
  18: { M: 1532.5, F: 1338.35 },
  19: { M: 1563.65, F: 1366.15 },
  20: { M: 1592.15, F: 1393.15 },
  21: { M: 1620.05, F: 1421.15 },
  22: { M: 1649.65, F: 1451.6 },
  23: { M: 1680.25, F: 1481.65 },
  24: { M: 1713, F: 1511.9 },
  25: { M: 1743.9, F: 1542.75 },
  26: { M: 1773.65, F: 1578.15 },
  27: { M: 1805.9, F: 1615.2 },
  28: { M: 1842.7, F: 1652.5 },
  29: { M: 1884.3, F: 1690.05 },
  30: { M: 1929.05, F: 1730.65 },
  31: { M: 1974.25, F: 1772.5 },
  32: { M: 2020.7, F: 1817.2 },
  33: { M: 2067.85, F: 1863.45 },
  34: { M: 2117.1, F: 1912.6 },
  35: { M: 2170.15, F: 1963.45 },
  36: { M: 2226.65, F: 2016.35 },
  37: { M: 2288.55, F: 2070.6 },
  38: { M: 2355.1, F: 2126.85 },
  39: { M: 2425.95, F: 2181.35 },
  40: { M: 2501.7, F: 2240.6 },
  41: { M: 2582.15, F: 2300.6 },
  42: { M: 2667.45, F: 2359.7 },
  43: { M: 2757.55, F: 2413.15 },
  44: { M: 2847.35, F: 2465.8 },
  45: { M: 2938.6, F: 2521.85 },
  46: { M: 3034.75, F: 2580.5 },
  47: { M: 3139.7, F: 2644.35 },
  48: { M: 3251.15, F: 2708.05 },
  49: { M: 3365.05, F: 2780.75 },
  50: { M: 3482.4, F: 2849.1 },
  51: { M: 3597.2, F: 2917.3 },
  52: { M: 3717.65, F: 2977.25 },
  53: { M: 3844.3, F: 3032.7 },
  54: { M: 3972.1, F: 3095.65 },
  55: { M: 4101.85, F: 3160.65 },
  56: { M: 4227.8, F: 3235.15 },
  57: { M: 4366.65, F: 3311.05 },
  58: { M: 4488.45, F: 3390.15 },
  59: { M: 4615.7, F: 3463.1 },
  60: { M: 4745.8, F: 3536.9 },
  61: { M: 4877.35, F: 3621.35 },
  62: { M: 5002.7, F: 3696.55 },
  63: { M: 5114.1, F: 3769.15 },
  64: { M: 5252.4, F: 3813.2 },
  65: { M: 5398.95, F: 3880.1 },
  66: { M: 5562.3, F: 3950.9 },
  67: { M: 5707.55, F: 4021.2 },
  68: { M: 5858.1, F: 4092.45 },
  69: { M: 6028.3, F: 4152.3 },
  70: { M: 6164.45, F: 4246.55 },
  71: { M: 6303.95, F: 4328.95 },
  72: { M: 6414, F: 4468.65 },
  73: { M: 6622.5, F: 4655 },
  74: { M: 6908.1, F: 4921.95 },
  75: { M: 7374, F: 5192.7 },
  76: { M: 8431.25, F: 5963.15 },
  77: { M: 9437.7, F: 6718.25 },
  78: { M: 11206.5, F: 8223.95 },
  79: { M: 18090.85, F: 14192.65 },
};

const TERMS = Array.from({ length: 48 }, (_, i) => 15 + i).join(",");

const ATTRIBUTES: [string, string][] = [
  ["GST_RATE", "18"],
  ["MIN_ENTRY_AGE", "18"],
  ["MAX_ENTRY_AGE", "65"],
  ["MIN_POLICY_TERM", "15"],
  ["MAX_POLICY_TERM", "62"],
  ["TERMS", TERMS],
  ["MIN_SUM_ASSURED", "100000"],
  ["MAX_SUM_ASSURED", "400000"],
  ["DEFAULT_SUM_ASSURED", "100000"],
  ["MAX_MATURITY_AGE", "80"],
  ["ALLOWED_PREMIUM_MODES", "Yearly,Half-Yearly"],
  ["ALLOWED_RIDERS", "DAB,TRB"],
  ["INTRO_DATE", "2013-11-16"],
  ["WITHDRAWAL_DATE", "2021-07-11"],
  ["PPT_NOTES", "Term is not used in pricing; cover runs to age 80"],
  [
    "PLAN_NOTES",
    "LIC's Jeevan Arogya health plan (UIN 512N266V02/V03). IDB Rs 1,000/2,000/3,000/4,000 per day; MSB = 100 x IDB (Rs 1L-4L). Premium table: LIC official chart, annual premium for IDB 1,000. GST 18%; mode rebate 2% yearly / 1% half-yearly; HCB rebate Rs 500/1,000/1,500 (PI) and Rs 250/500/750 (other). Only yearly and half-yearly modes. Brochure riders: Term Assurance + Accident Benefit (Rs 0.50 per Rs 1,000); rider rates not seeded because LIC's Term Assurance table is not in the brochure.",
  ],
];

const MODE_FACTORS: [string, number][] = [
  ["Yearly", 1],
  ["Half-Yearly", 0.5],
];

export const seedPremiumRates904 = async (prisma: PrismaClient) => {
  const products = await prisma.productMaster.findMany({
    where: { planNumber: PLAN_NUMBER },
    select: { id: true, productName: true, productCode: true },
  });
  if (products.length === 0) {
    console.log(`  x Plan ${PLAN_NUMBER} not found`);
    return;
  }
  console.log(`  - Plan ${PLAN_NUMBER} premium rates (${products.length} products)`);

  const rows = [
    ...Object.entries(PI_RATES).flatMap(([age, rate]) => [
      { entryAge: Number(age), gender: "M", option: 1, tabularRate: rate.M },
      { entryAge: Number(age), gender: "F", option: 1, tabularRate: rate.F },
    ]),
    ...Object.entries(OTHER_RATES).flatMap(([age, rate]) => [
      { entryAge: Number(age), gender: "M", option: 2, tabularRate: rate.M },
      { entryAge: Number(age), gender: "F", option: 2, tabularRate: rate.F },
    ]),
  ];

  const masters = await prisma.productAttributeMaster.findMany({
    where: { attributeCode: { in: ATTRIBUTES.map(([code]) => code) } },
    select: { id: true, attributeCode: true },
  });

  const dabRider = await prisma.riderMaster.findFirst({ where: { riderCode: "DAB" } });
  const trbRider = await prisma.riderMaster.findFirst({ where: { riderCode: "TRB" } });

  for (const product of products) {
    await prisma.productPremiumRate.deleteMany({ where: { productId: product.id } });
    await prisma.productPremiumRate.createMany({
      data: rows.map((r) => ({
        productId: product.id,
        entryAge: r.entryAge,
        ageBand: null,
        gender: r.gender,
        smoker: null,
        policyTerm: 15,
        premiumPayingTerm: 15,
        option: r.option,
        tabularRate: r.tabularRate,
      })),
    });

    await prisma.productSumAssuredRebate.deleteMany({ where: { productId: product.id } });

    for (const [code, value] of ATTRIBUTES) {
      const master = masters.find((m) => m.attributeCode === code);
      if (!master) continue;
      await prisma.productAttributeValue.upsert({
        where: {
          productId_attributeId: { productId: product.id, attributeId: master.id },
        },
        update: { value },
        create: { productId: product.id, attributeId: master.id, value },
      });
    }

    // Link the 2 riders (DAB, TRB) to this product
    for (const r of [dabRider, trbRider]) {
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
  }

  console.log(
    `      ${rows.length} rates per product (PI ${Object.keys(PI_RATES).length * 2}, other ${Object.keys(OTHER_RATES).length * 2})`,
  );
};

export const seedModeFactors904 = async (prisma: PrismaClient) => {
  const products = await prisma.productMaster.findMany({
    where: { planNumber: PLAN_NUMBER },
    select: { id: true },
  });
  if (products.length === 0) return;

  const modes = await prisma.premiumModeMaster.findMany({
    where: { modeName: { in: MODE_FACTORS.map((m) => m[0]) } },
    select: { id: true, modeName: true },
  });

  for (const product of products) {
    for (const mode of modes) {
      const factor = MODE_FACTORS.find((m) => m[0] === mode.modeName)?.[1];
      if (factor === undefined) continue;
      await prisma.productPremiumModeFactor.upsert({
        where: {
          productId_premiumModeId: { productId: product.id, premiumModeId: mode.id },
        },
        update: { factor },
        create: { productId: product.id, premiumModeId: mode.id, factor },
      });
    }
  }
  console.log(`      ${MODE_FACTORS.length} mode factors per product`);
};

export const seedRiderPremium904 = async (prisma: PrismaClient) => {
  const products = await prisma.productMaster.findMany({
    where: { planNumber: PLAN_NUMBER },
    select: { id: true, productName: true, productCode: true },
  });
  if (products.length === 0) return;

  const dab = await prisma.riderMaster.findFirst({
    where: { riderCode: "DAB" },
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
      // Also add fallback entryAge: 0 row so any unexpected term still returns 0.50
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

    // 2. Term Rider Benefit (TRB): LIC standard term assurance rider rates
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
      await prisma.riderPremiumRate.createMany({ data: rows });
    }

    // Ensure ProductRider relations are linked
    for (const r of [dab, trb]) {
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
      `      Plan 904 (${product.productCode}): seeded ${rows.length} rider rates (DAB + TRB)`,
    );
  }
};
