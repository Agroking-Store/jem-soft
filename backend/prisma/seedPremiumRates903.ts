import { PrismaClient } from "@prisma/client";

const PLAN_NUMBER = "903";

// LIC's Plan 903 brochure table: annual premium per Rs 1,000 Initial Daily
// Hospital Cash Benefit. The PI/other-member rates and child rates below are
// copied from the full Plan 903 Annexure-I table. Its listed sample rows match
// LIC's published brochure figures and the user's supplied excerpt.
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
  78: { M: 11404.85, F: 8369.5 },
  79: { M: 20221.65, F: 15864.3 },
};

// Children are unisex (0-17); ages 18-75 are other major members.
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
};

const POLICY_TERMS = Array.from({ length: 48 }, (_, index) => index + 15);
const MODE_FACTORS: [string, number][] = [
  ["Yearly", 1],
  ["Half-Yearly", 0.5],
  ["Quarterly", 0.25],
  ["Monthly", 0.083333],
];

export const seedPremiumRates903 = async (prisma: PrismaClient) => {
  const product = await prisma.productMaster.findFirst({
    where: { planNumber: PLAN_NUMBER, productCode: { startsWith: "LEGACY-" } },
    select: { id: true, productName: true },
  });
  if (!product) {
    console.log(`  x Plan ${PLAN_NUMBER} LEGACY product not found`);
    return;
  }

  const rows: {
    entryAge: number;
    gender: string;
    option: number;
    policyTerm: number;
    premiumPayingTerm: number;
    tabularRate: number;
  }[] = [];
  for (const [ageText, rates] of Object.entries(PI_RATES)) {
    const entryAge = Number(ageText);
    for (const policyTerm of POLICY_TERMS) {
      for (const gender of ["M", "F"] as const) {
        rows.push({ entryAge, gender, option: 1, policyTerm, premiumPayingTerm: policyTerm, tabularRate: rates[gender] });
      }
    }
  }
  for (const [ageText, rates] of Object.entries(OTHER_RATES)) {
    const entryAge = Number(ageText);
    // Plan 903's printed table is by last birthday, not half-year age band.
    // Keep unisex child rates in both gender keys because the form may supply
    // either gender; the adult other-member table has separate M/F premiums.
    for (const policyTerm of POLICY_TERMS) {
      for (const gender of ["M", "F"] as const) {
        rows.push({ entryAge, gender, option: 2, policyTerm, premiumPayingTerm: policyTerm, tabularRate: rates[gender] });
      }
    }
  }

  await prisma.productPremiumRate.deleteMany({ where: { productId: product.id } });
  await prisma.productPremiumRate.createMany({
    data: rows.map((row) => ({ productId: product.id, ...row, ageBand: null, secondaryAge: null, smoker: null })),
  });

  // LIC's Plan 903 rebates are two distinct rules: mode percentage rebates
  // (captured in the mode factors) and fixed-rupee HCB rebates by member role.
  // ProductAgeTermRebate has neither a member-role key nor a flat-rupee field,
  // so there are no truthful rows to put in it. Clear stale values scoped to
  // this product; the Plan 903 calculator applies the published HCB rebates.
  await prisma.productAgeTermRebate.deleteMany({ where: { productId: product.id } });
  await prisma.productSumAssuredRebate.deleteMany({ where: { productId: product.id } });

  const gstMaster = await prisma.productAttributeMaster.findFirst({ where: { attributeCode: "GST_RATE" } });
  if (gstMaster) {
    await prisma.productAttributeValue.upsert({
      where: { productId_attributeId: { productId: product.id, attributeId: gstMaster.id } },
      update: { value: "18" },
      create: { productId: product.id, attributeId: gstMaster.id, value: "18" },
    });
  }

  console.log(`      ${rows.length} rates; printed last-birthday ages (no invented half-year rates)`);
};

export const seedRiderPremium903 = async (prisma: PrismaClient) => {
  const product = await prisma.productMaster.findFirst({
    where: { planNumber: PLAN_NUMBER, productCode: { startsWith: "LEGACY-" } },
    select: { id: true, productName: true },
  });
  if (!product) return;

  // The Plan 903 catalogue metadata allows only DAB. LIC's live Riders lookup
  // returned Rs 0.50 per Rs 1,000 DAB sum assured and a 20-year rider term at
  // age 40, consistent with cover to age 60. Seed flat age-independent price
  // records for the available rider term at each eligible adult entry age.
  const dab = await prisma.riderMaster.findFirst({ where: { riderCode: "DAB" }, select: { id: true } });
  await prisma.productRider.deleteMany({ where: { productId: product.id } });
  await prisma.riderPremiumRate.deleteMany({ where: { productId: product.id } });
  if (!dab) {
    console.log("      0 DAB rider rates (DAB rider master record not found)");
    return;
  }

  const rows = [];
  for (let entryAge = 18; entryAge < 60; entryAge++) {
    const maxRiderTerm = Math.min(35, 60 - entryAge);
    for (let riderTerm = 1; riderTerm <= maxRiderTerm; riderTerm++) {
      rows.push({
        riderId: dab.id,
        productId: product.id,
        entryAge,
        ageBand: null,
        riderTerm,
        premiumPayingTerm: riderTerm,
        option: null,
        gender: null,
        ratePerThousand: 0.5,
      });
    }
  }
  await prisma.productRider.create({ data: { productId: product.id, riderId: dab.id } });
  await prisma.riderPremiumRate.createMany({ data: rows });
  console.log(`      DAB: ${rows.length} flat-rate term rows (Rs 0.50 per Rs 1,000)`);
};

export const seedModeFactors903 = async (prisma: PrismaClient) => {
  const product = await prisma.productMaster.findFirst({
    where: { planNumber: PLAN_NUMBER, productCode: { startsWith: "LEGACY-" } },
    select: { id: true },
  });
  if (!product) return;

  await prisma.productPremiumModeFactor.deleteMany({ where: { productId: product.id } });

  const modes = await prisma.premiumModeMaster.findMany({
    where: { modeName: { in: MODE_FACTORS.map(([modeName]) => modeName) } },
    select: { id: true, modeName: true },
  });
  for (const mode of modes) {
    const factor = MODE_FACTORS.find(([modeName]) => modeName === mode.modeName)?.[1];
    if (factor === undefined) continue;
    await prisma.productPremiumModeFactor.upsert({
      where: { productId_premiumModeId: { productId: product.id, premiumModeId: mode.id } },
      update: { factor },
      create: { productId: product.id, premiumModeId: mode.id, factor },
    });
  }
  console.log(`      ${modes.length} mode factors upserted (Y/H/Q/M)`);
};
