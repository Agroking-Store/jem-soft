import { PrismaClient } from "@prisma/client";
import legacyPlans from "./masterData/legacyPlans.json";

/**
 * Plan 850 (LIC Jeevan Shanti) - Single Premium Annuity Plan
 *
 * Launched: 11-Sep-2018. Withdrawn: 21-Oct-2020.
 *
 * Characteristics:
 * 1. Single Premium Non-Linked Non-Participating Annuity Plan.
 * 2. Purchase Price = Sum Assured.
 *    Minimum purchase price: Rs 1,50,000 (no maximum).
 * 3. Entry age: 30 to 100 years (Option F allows up to age 100, others 30-85).
 * 4. Policy Term: 1 year (annuity contract).
 * 5. Premium Paying Term (PPT): 1 (Single Premium).
 * 6. GST: 1.8% on the purchase price (Single Premium Annuity rule).
 *    In i-Magic verified data:
 *    Basic = Purchase Price = SA (e.g., Rs 10,00,000)
 *    GST = 1.8% = Rs 18,000
 *    Total Installment = Rs 10,18,000
 *    Zero tabular rate rows are stored per entry age (30 to 100) exactly as done for PMVVY (856).
 */
const PLAN_NUMBER = "850";

const ATTRIBUTES: [string, string][] = [
  ["GST_RATE", "1.8"],
  ["ALLOWED_PREMIUM_MODES", "Single"],
  ["MIN_SUM_ASSURED", "150000"],
  ["MIN_POLICY_TERM", "1"],
  ["MAX_POLICY_TERM", "1"],
  ["MIN_PPT", "1"],
  ["MAX_PPT", "1"],
  ["MIN_ENTRY_AGE", "30"],
  ["MAX_ENTRY_AGE", "100"],
  ["PPT_NOTES", "Single premium annuity (PPT = 1). Purchase price = Sum Assured."],
  [
    "PLAN_NOTES",
    "LIC Jeevan Shanti (Plan 850). Single-premium annuity plan. Basic premium equals purchase price (min Rs 1,50,000). GST is 1.8% on purchase price. Entry age 30 to 100. Term 1, PPT 1.",
  ],
];

const MODE_CODES = ["SIN", "O"] as const;

async function upsertAttribute(
  prisma: PrismaClient,
  productId: string,
  attributeCode: string,
  value: string,
) {
  let master = await prisma.productAttributeMaster.findFirst({
    where: { attributeCode },
  });
  if (!master) {
    master = await prisma.productAttributeMaster.create({
      data: {
        attributeCode,
        attributeName: attributeCode,
        dataType: "String",
      },
    });
  }

  await prisma.productAttributeValue.upsert({
    where: {
      productId_attributeId: {
        productId,
        attributeId: master.id,
      },
    },
    update: { value },
    create: { productId, attributeId: master.id, value },
  });
}

export const seedPremiumRates850 = async (prisma: PrismaClient) => {
  const startedAt = Date.now();
  const product = await prisma.productMaster.findFirst({
    where: {
      OR: [
        { planNumber: PLAN_NUMBER },
        { productCode: "LEGACY-850" },
      ],
    },
    select: { id: true, productName: true },
  });

  if (!product) {
    console.warn(`  x Plan ${PLAN_NUMBER} not found (LEGACY-850); skipping rates`);
    return;
  }

  console.log(`  - Plan ${PLAN_NUMBER} (${product.productName}) annuity premium rates & attributes`);

  const plan850 = (legacyPlans as any[]).find((p) => p.planNumber === PLAN_NUMBER);
  if (plan850) {
    const attrMap: Record<string, string> = {};
    if (plan850.minEntryAge) attrMap.MIN_ENTRY_AGE = plan850.minEntryAge;
    if (plan850.maxEntryAge) attrMap.MAX_ENTRY_AGE = plan850.maxEntryAge;
    if (plan850.minPolicyTerm) attrMap.MIN_POLICY_TERM = plan850.minPolicyTerm;
    if (plan850.maxPolicyTerm) attrMap.MAX_POLICY_TERM = plan850.maxPolicyTerm;
    if (plan850.minPpt) attrMap.MIN_PPT = plan850.minPpt;
    if (plan850.maxPpt) attrMap.MAX_PPT = plan850.maxPpt;
    if (plan850.terms) attrMap.TERMS = plan850.terms;
    if (plan850.ppts) attrMap.PPTS = plan850.ppts;
    if (plan850.introDate) attrMap.INTRO_DATE = plan850.introDate;
    if (plan850.withdrawalDate) attrMap.WITHDRAWAL_DATE = plan850.withdrawalDate;
    if (plan850.minSumAssured) attrMap.MIN_SUM_ASSURED = String(plan850.minSumAssured);
    if (plan850.notes) attrMap.PLAN_NOTES = plan850.notes;

    for (const [code, value] of ATTRIBUTES) attrMap[code] = value;

    for (const [code, value] of Object.entries(attrMap)) {
      await upsertAttribute(prisma, product.id, code, value);
    }
  }

  // Rate rows: zero rate per entry age 30 to 100, exactly like PMVVY (856)
  const rateRows = [];
  for (let entryAge = 30; entryAge <= 100; entryAge++) {
    rateRows.push({
      productId: product.id,
      entryAge,
      ageBand: null,
      policyTerm: 1,
      premiumPayingTerm: 1,
      option: null,
      gender: null,
      smoker: null,
      tabularRate: 0,
    });
  }

  const modes = await prisma.premiumModeMaster.findMany({
    where: {
      OR: [
        { modeCode: { in: [...MODE_CODES] } },
        { modeName: { contains: "Single", mode: "insensitive" } },
      ],
    },
    select: { id: true, modeCode: true },
  });

  await prisma.$transaction(async (tx) => {
    await tx.productPremiumRate.deleteMany({
      where: { productId: product.id },
    });
    await tx.productPremiumRate.createMany({ data: rateRows });

    for (const mode of modes) {
      await tx.productPremiumModeFactor.upsert({
        where: {
          productId_premiumModeId: {
            productId: product.id,
            premiumModeId: mode.id,
          },
        },
        update: { factor: 1 },
        create: { productId: product.id, premiumModeId: mode.id, factor: 1 },
      });
    }
  });

  console.log(`  ✓ Plan ${PLAN_NUMBER} seeded in ${Date.now() - startedAt}ms`);
};
