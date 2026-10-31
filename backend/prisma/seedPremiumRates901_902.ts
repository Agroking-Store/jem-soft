import type { PrismaClient } from "@prisma/client";

/**
 * Plans 901 (Health Plus) and 902 (Health Protection Plus) are ULIP health plans.
 * They have NO tabular mortality/health rates — premium is policyholder-chosen.
 *
 * This seeder ensures:
 * - Allowed premium modes (Yearly, Half-Yearly, Monthly) and mode factors
 * - GST rate = 0 (pre-GST withdrawn unit-linked products)
 * - Accurate term/PPT formula notes and plan notes from the sales literature
 */

const PLANS = [
  {
    planNumber: "901",
    attributes: [
      ["MIN_ENTRY_AGE", "18"],
      ["MAX_ENTRY_AGE", "55"],
      ["MIN_POLICY_TERM", "10"],
      ["MAX_POLICY_TERM", "47"],
      ["TERM_FORMULA", "65-entry age"],
      ["PPT_FORMULA", "65-entry age"],
      ["PPT_NOTES", "PPT = Term = 65 minus entry age. ULIP plan: enter premium manually."],
      ["GST_RATE", "0"],
      ["ALLOWED_PREMIUM_MODES", "Yearly,Half-Yearly,Monthly"],
      ["INTRO_DATE", "2008-02-04"],
      ["WITHDRAWAL_DATE", "2009-12-31"],
      [
        "PLAN_NOTES",
        "LIC Health Plus (ULIP). HCB: Rs 250–2,500/day (multiples of 50). MSB = 200x HCB. Min annual premium = higher of Rs 5,000 or 6x PI HCB (single life), Rs 7,500 or 6x PI + 3x other HCB (2 lives), Rs 10,000 or sum of 6x PI + 3x each other HCB (3+ lives). Modes: Yearly/Half-Yearly/Monthly(ECS). No GST. Enter premium manually.",
      ],
    ],
    modes: [
      ["Yearly", 1],
      ["Half-Yearly", 0.5],
      ["Monthly", 0.083333],
    ],
  },
  {
    planNumber: "902",
    attributes: [
      ["MIN_ENTRY_AGE", "18"],
      ["MAX_ENTRY_AGE", "55"],
      ["MIN_POLICY_TERM", "20"],
      ["MAX_POLICY_TERM", "57"],
      ["TERM_FORMULA", "75-entry age"],
      ["PPT_FORMULA", "65-entry age"],
      ["MIN_PPT", "10"],
      ["MAX_PPT", "47"],
      ["PPT_NOTES", "Term = 75 minus entry age; PPT = 65 minus entry age. ULIP plan: enter premium manually."],
      ["GST_RATE", "0"],
      ["ALLOWED_PREMIUM_MODES", "Yearly,Half-Yearly,Monthly"],
      ["INTRO_DATE", "2009-04-29"],
      ["WITHDRAWAL_DATE", "2013-10-01"],
      [
        "PLAN_NOTES",
        "LIC Health Protection Plus (ULIP). HCB: Rs 250–2,500/day (multiples of 50). MSB = 200x HCB. Min annual premium = higher of Rs 5,000 or 6x PI HCB (single life), Rs 7,500 or sum formula (2 lives), Rs 10,000 or sum formula (3+ lives). Modes: Yearly/Half-Yearly/Monthly(ECS). No GST. Enter premium manually.",
      ],
    ],
    modes: [
      ["Yearly", 1],
      ["Half-Yearly", 0.5],
      ["Monthly", 0.083333],
    ],
  },
];

export const seedPremiumRates901_902 = async (prisma: PrismaClient) => {
  for (const plan of PLANS) {
    const product = await prisma.productMaster.findFirst({
      where: { planNumber: plan.planNumber },
      select: { id: true, productCode: true, productName: true },
    });
    if (!product) continue;

    const attrMasters = await prisma.productAttributeMaster.findMany({
      where: { attributeCode: { in: plan.attributes.map(([code]) => code) } },
      select: { id: true, attributeCode: true },
    });

    for (const [code, value] of plan.attributes) {
      const master = attrMasters.find((m) => m.attributeCode === code);
      if (!master) continue;
      await prisma.productAttributeValue.upsert({
        where: { productId_attributeId: { productId: product.id, attributeId: master.id } },
        update: { value },
        create: { productId: product.id, attributeId: master.id, value },
      });
    }

    for (const [modeName, factor] of plan.modes) {
      const modeRecord = await prisma.premiumModeMaster.findFirst({
        where: { modeName: { equals: modeName, mode: "insensitive" } },
        select: { id: true },
      });
      if (!modeRecord) continue;
      await prisma.productPremiumModeFactor.upsert({
        where: { productId_premiumModeId: { productId: product.id, premiumModeId: modeRecord.id } },
        update: { factor },
        create: { productId: product.id, premiumModeId: modeRecord.id, factor },
      });
    }

    console.log(`      Plan ${plan.planNumber} (${product.productCode}): attributes + mode factors configured`);
  }
};
