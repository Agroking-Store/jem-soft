import { PrismaClient } from "@prisma/client";
import legacyPlans from "./masterData/legacyPlans.json";

/**
 * Plan 849 (LIC Nivesh Plus) - Single Premium Unit-Linked Life Insurance Plan
 *
 * Launched: 02-Mar-2020.
 *
 * Characteristics:
 * 1. Unit-Linked Life Insurance Plan with Single Premium.
 * 2. Premium is customer-chosen: Minimum Single Premium is Rs. 1,00,000, no upper limit.
 * 3. Two Basic Sum Assured Options:
 *    - Option 1: 1.25 x Single Premium (Entry age: 90 days to 70 years)
 *    - Option 2: 10 x Single Premium (Entry age: 90 days to 35 years)
 * 4. Policy Term: 10 to 25 years.
 * 5. Premium Paying Term (PPT): 1 (Single Premium).
 * 6. Riders: Linked Accidental Death Benefit Rider (DAB).
 * 7. ULIP product: no tabular premium rates exist because the customer chooses their premium.
 *    Manual premium entry applies (similar to Plans 901, 902, 852).
 */
const PLAN_NUMBER = "849";

const ATTRIBUTES: [string, string][] = [
  ["GST_RATE", "0"],
  ["ALLOWED_PREMIUM_MODES", "Single"],
  ["MIN_SUM_ASSURED", "125000"],
  ["MIN_POLICY_TERM", "10"],
  ["MAX_POLICY_TERM", "25"],
  ["MIN_PPT", "1"],
  ["MAX_PPT", "1"],
  ["MIN_ENTRY_AGE", "0"],
  ["MAX_ENTRY_AGE", "70"],
  ["PPT_NOTES", "Single premium (PPT = 1). ULIP plan: enter premium manually."],
  [
    "PLAN_NOTES",
    "LIC Nivesh Plus (Plan 849, ULIP Single Premium). Customer chooses single premium (min Rs 1,00,000). Option 1: SA = 1.25x premium (min SA 1,25,000, max age 70). Option 2: SA = 10x premium (min SA 10,00,000, max age 35). Policy term 10-25 years. PPT = 1. Rider: DAB. No tabular rates - manual entry.",
  ],
];

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

export const seedPremiumRates849 = async (prisma: PrismaClient) => {
  const startedAt = Date.now();
  const product = await prisma.productMaster.findFirst({
    where: {
      OR: [
        { planNumber: PLAN_NUMBER },
        { productCode: "LEGACY-849" },
      ],
    },
    select: { id: true, productName: true },
  });

  if (!product) {
    console.warn(`  x Plan ${PLAN_NUMBER} not found (LEGACY-849); skipping rates`);
    return;
  }

  console.log(`  - Plan ${PLAN_NUMBER} (${product.productName}) ULIP parameters & attributes`);

  const plan849 = (legacyPlans as any[]).find((p) => p.planNumber === PLAN_NUMBER);
  if (plan849) {
    const attrMap: Record<string, string> = {};
    if (plan849.minEntryAge) attrMap.MIN_ENTRY_AGE = plan849.minEntryAge;
    if (plan849.maxEntryAge) attrMap.MAX_ENTRY_AGE = plan849.maxEntryAge;
    if (plan849.minPolicyTerm) attrMap.MIN_POLICY_TERM = plan849.minPolicyTerm;
    if (plan849.maxPolicyTerm) attrMap.MAX_POLICY_TERM = plan849.maxPolicyTerm;
    if (plan849.minPpt) attrMap.MIN_PPT = plan849.minPpt;
    if (plan849.maxPpt) attrMap.MAX_PPT = plan849.maxPpt;
    if (plan849.terms) attrMap.TERMS = plan849.terms;
    if (plan849.ppts) attrMap.PPTS = plan849.ppts;
    if (plan849.introDate) attrMap.INTRO_DATE = plan849.introDate;
    if (plan849.withdrawalDate) attrMap.WITHDRAWAL_DATE = plan849.withdrawalDate;
    if (plan849.minSumAssured) attrMap.MIN_SUM_ASSURED = String(plan849.minSumAssured);
    if (plan849.notes) attrMap.PLAN_NOTES = plan849.notes;

    for (const [code, value] of ATTRIBUTES) attrMap[code] = value;

    for (const [code, value] of Object.entries(attrMap)) {
      await upsertAttribute(prisma, product.id, code, value);
    }
  }

  // Ensure Single mode factor exists
  const singleMode = await prisma.premiumModeMaster.findFirst({
    where: { OR: [{ modeCode: "SIN" }, { modeCode: "O" }, { modeName: { contains: "Single", mode: "insensitive" } }] },
    select: { id: true },
  });

  if (singleMode) {
    await prisma.productPremiumModeFactor.upsert({
      where: {
        productId_premiumModeId: {
          productId: product.id,
          premiumModeId: singleMode.id,
        },
      },
      update: { factor: 1 },
      create: { productId: product.id, premiumModeId: singleMode.id, factor: 1 },
    });
  }

  console.log(`  ✓ Plan ${PLAN_NUMBER} seeded in ${Date.now() - startedAt}ms`);
};
