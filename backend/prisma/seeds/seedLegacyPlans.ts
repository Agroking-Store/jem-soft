import { PrismaClient } from '@prisma/client';
import legacyPlans from '../masterData/legacyPlans.json';

/**
 * Seeds the LIC legacy plan catalogue (master data only - NOT premium rates).
 *
 * Source of truth: prisma/masterData/legacyPlans.json
 *   (generated from legacy_plans_template.csv.xlsx; see scripts/buildLegacyPlansJson)
 *
 * Scope: all legacy LIC plans (plans 1-100 and 101+). Override with
 * LEGACY_PLAN_MIN if you want to restrict the plan band.
 */

const MIN_PLAN = Number(process.env.LEGACY_PLAN_MIN ?? '0');

interface LegacyPlan {
  planNumber: string;
  planName: string;
  introDate: string | null;
  withdrawalDate: string | null;
  minEntryAge: string | null;
  maxEntryAge: string | null;
  minPolicyTerm: string | null;
  maxPolicyTerm: string | null;
  minPpt: string | null;
  maxPpt: string | null;
  terms: string | null;       // comma separated, dropdown-ready
  ppts: string | null;        // comma separated, dropdown-ready
  termFormula: string | null; // resolved live from the customer's age
  pptFormula: string | null;
  pptNotes: string | null;
  allowedRiders: string[];
  minSumAssured: number | null;
  maxSumAssured: number | null;
  notes: string | null;
}

/**
 * Attribute codes this seeder owns. Rows for these codes are deleted and
 * rewritten on every run so the DB can never keep a stale value produced by an
 * older version of the parser (e.g. a PPTS list derived from a formula string).
 *
 * Safe because these rows only ever belong to LEGACY-* products, which this
 * seeder is the sole owner of.
 */
const MANAGED_CODES = [
  'MIN_ENTRY_AGE', 'MAX_ENTRY_AGE',
  'MIN_POLICY_TERM', 'MAX_POLICY_TERM', 'MIN_PPT', 'MAX_PPT',
  'TERMS', 'PPTS', 'TERM_FORMULA', 'PPT_FORMULA',
  'INTRO_DATE', 'WITHDRAWAL_DATE',
  'ALLOWED_RIDERS',
  'MIN_SUM_ASSURED', 'DEFAULT_SUM_ASSURED', 'MAX_SUM_ASSURED',
  'PPT_NOTES', 'PLAN_NOTES',
] as const;

export const seedLegacyPlans = async (prisma: PrismaClient) => {
  console.log(`\n=== Seeding LIC legacy plans (plan ${MIN_PLAN}+) ===`);

  // Scope rules:
  //  - "101"      -> numeric plans 101 and above
  //  - "27A"      -> leading digits 27  -> belongs to the 1-100 band, skipped
  //  - "122E"     -> leading digits 122 -> in scope
  //  - "ULIS"     -> no leading digits  -> in scope (it is a numbered-less plan)
  const inScope = (legacyPlans as LegacyPlan[]).filter((p) => {
    const plan = (p.planNumber ?? '').trim();
    if (!plan) return false;
    const leading = plan.match(/^\d+/);
    if (leading) return Number(leading[0]) >= MIN_PLAN;
    return true;
  });
  const skippedAlnum = (legacyPlans as LegacyPlan[])
    .filter((p) => {
      const leading = (p.planNumber ?? '').trim().match(/^\d+/);
      return leading && Number(leading[0]) < MIN_PLAN;
    })
    .map((p) => p.planNumber);
  console.log(`Source rows: ${(legacyPlans as LegacyPlan[]).length}, in scope: ${inScope.length}`);
  if (skippedAlnum.length) {
    console.log(`  held back (1-${MIN_PLAN - 1} band): ${skippedAlnum.join(', ')}`);
  }

  // attribute code -> value builder for one plan
  const attrMapFor = (p: LegacyPlan): Record<string, string> => {
    const m: Record<string, string> = {};

    // --- ages ---
    if (p.minEntryAge) m.MIN_ENTRY_AGE = p.minEntryAge;
    if (p.maxEntryAge) m.MAX_ENTRY_AGE = p.maxEntryAge;

    // --- raw min/max, kept verbatim so nothing is lost ---
    if (p.minPolicyTerm) m.MIN_POLICY_TERM = p.minPolicyTerm;
    if (p.maxPolicyTerm) m.MAX_POLICY_TERM = p.maxPolicyTerm;
    if (p.minPpt) m.MIN_PPT = p.minPpt;
    if (p.maxPpt) m.MAX_PPT = p.maxPpt;

    // --- dropdown-ready lists (what the frontend consumes) ---
    // A "0" list is the whole-life / annuity marker and is intentionally preserved.
    if (p.terms) m.TERMS = p.terms;
    if (p.ppts) m.PPTS = p.ppts;

    // --- live formulas, only when there is no concrete list ---
    if (!p.terms && p.termFormula) m.TERM_FORMULA = p.termFormula;
    if (!p.ppts && p.pptFormula) m.PPT_FORMULA = p.pptFormula;

    // --- validity window (calendar min/max) ---
    if (p.introDate) m.INTRO_DATE = p.introDate;
    if (p.withdrawalDate) m.WITHDRAWAL_DATE = p.withdrawalDate;

    // --- riders ---
    if (p.allowedRiders.length) m.ALLOWED_RIDERS = p.allowedRiders.join(',');

    // --- sum assured ---
    if (p.minSumAssured) {
      m.MIN_SUM_ASSURED = String(p.minSumAssured);
      m.DEFAULT_SUM_ASSURED = String(p.minSumAssured);
    }
    if (p.maxSumAssured && p.maxSumAssured !== p.minSumAssured) {
      m.MAX_SUM_ASSURED = String(p.maxSumAssured);
    }

    // --- free text kept for display only ---
    if (p.pptNotes) m.PPT_NOTES = p.pptNotes;
    if (p.notes) m.PLAN_NOTES = p.notes;

    return m;
  };

  // attribute code -> Prisma model + id, fetched once
  const attrMasters = await prisma.productAttributeMaster.findMany({
    select: { id: true, attributeCode: true },
  });
  const attrByCode = new Map(attrMasters.map((a) => [a.attributeCode, a.id]));
  const missingCodes = new Set<string>();
  for (const p of inScope) {
    for (const code of Object.keys(attrMapFor(p))) if (!attrByCode.has(code)) missingCodes.add(code);
  }
  if (missingCodes.size) {
    throw new Error(
      `Missing ProductAttributeMaster rows: ${[...missingCodes].join(', ')}. ` +
      `Run seedProductAttributes first (add them to masterData/productAttributesmaster.ts).`,
    );
  }

  const licProvider = await prisma.insuranceProvider.findFirst({ where: { code: 'LIC' } });
  const products = await prisma.productMaster.findMany({
    where: { providerId: licProvider?.id ?? undefined },
    select: { id: true, planNumber: true, productCode: true, productName: true },
    orderBy: { productCode: 'desc' }, // Ensures LEGACY-866 comes after non-legacy, or we sort explicitly
  });
  // Sort so LEGACY- products take precedence over non-legacy for duplicate plan numbers
  products.sort((a, b) => {
    const aLegacy = (a.productCode || '').startsWith('LEGACY-') ? 1 : 0;
    const bLegacy = (b.productCode || '').startsWith('LEGACY-') ? 1 : 0;
    return aLegacy - bLegacy;
  });
  const productByPlan = new Map(products.map((p) => [String(p.planNumber ?? '').trim(), p]));

  const riders = await prisma.riderMaster.findMany({ select: { id: true, riderCode: true } });
  const riderByCode = new Map(riders.map((r) => [r.riderCode, r.id]));

  const managedIds = MANAGED_CODES.map((c) => attrByCode.get(c)!).filter(Boolean);
  let clearedValues = 0;

  let attrValues = 0;
  let createdProducts = 0;
  let renamedProducts = 0;
  let riderLinks = 0;
  let staleRiderLinks = 0;
  let skippedRiderCodes = new Set<string>();
  let skippedPlans: string[] = [];

  for (const p of inScope) {
    let existing = productByPlan.get(p.planNumber);

    if (!existing) {
      // Only auto-create if the plan is not already present under another product code
      // (e.g. the live 849 / 852 ULIP products). Those keep their existing record.
      const dupe = await prisma.productMaster.findFirst({
        where: { providerId: licProvider?.id, planNumber: p.planNumber },
        select: { id: true, productCode: true },
      });
      if (dupe) {
        skippedPlans.push(`${p.planNumber} (already exists as ${dupe.productCode})`);
        continue;
      }
      if (!licProvider) {
        skippedPlans.push(`${p.planNumber} (no LIC provider)`);
        continue;
      }
      const newProduct = await prisma.productMaster.create({
        data: {
          productCode: `LEGACY-${p.planNumber}`,
          productName: p.planName || `LIC Plan ${p.planNumber}`,
          planNumber: p.planNumber,
          providerId: licProvider.id,
          isActive: true,
        },
      });
      existing = newProduct;
      productByPlan.set(p.planNumber, newProduct);
      createdProducts++;
    }

    if (p.planName && existing.productName !== p.planName) {
      await prisma.productMaster.update({
        where: { id: existing.id },
        data: { productName: p.planName },
      });
      renamedProducts++;
    }

    // Wipe the codes we own, then write the freshly derived set. Without this
    // an attribute the new parser no longer produces (e.g. PPTS for a plan whose
    // PPT is a formula) would survive forever from an earlier run.
    clearedValues += (await prisma.productAttributeValue.deleteMany({
      where: { productId: existing.id, attributeId: { in: managedIds } },
    })).count;

    const attrs = attrMapFor(p);
    for (const [code, value] of Object.entries(attrs)) {
      const attributeId = attrByCode.get(code)!;
      await prisma.productAttributeValue.create({
        data: { productId: existing.id, attributeId, value },
      });
      attrValues++;
    }

    for (const code of p.allowedRiders) {
      const riderId = riderByCode.get(code);
      if (!riderId) {
        skippedRiderCodes.add(code);
        continue;
      }
      await prisma.productRider.upsert({
        where: { productId_riderId: { productId: existing.id, riderId } },
        update: {},
        create: { productId: existing.id, riderId },
      });
      riderLinks++;
    }

    // Drop stale rider links so ProductRider exactly mirrors the JSON.
    // Earlier seeds mapped DAB -> ADDB and TRB -> TERM; now that DAB/TRB are real
    // rider codes, both the old and the new link would otherwise be present.
    const desired = new Set(
      p.allowedRiders.map(c => riderByCode.get(c)).filter((x): x is string => !!x),
    );
    if (desired.size) {
      const current = await prisma.productRider.findMany({
        where: { productId: existing.id },
        select: { id: true, riderId: true },
      });
      for (const link of current) {
        if (!desired.has(link.riderId)) {
          await prisma.productRider.delete({ where: { id: link.id } });
          staleRiderLinks++;
        }
      }
    }
  }

  // stats
  const termLists = inScope.filter((p) => p.terms).length;
  const termFormulas = inScope.filter((p) => !p.terms && p.termFormula).length;
  const pptLists = inScope.filter((p) => p.ppts).length;
  const pptFormulas = inScope.filter((p) => !p.ppts && p.pptFormula).length;
  const pptFallback = inScope.filter((p) => !p.ppts && !p.pptFormula).length;

  console.log(`attribute values cleared  : ${clearedValues}`);
  console.log(`attribute values written  : ${attrValues}`);
  console.log(`product names synced     : ${renamedProducts}`);
  console.log(`rider links created      : ${riderLinks}`);
  console.log(`stale rider links removed: ${staleRiderLinks}`);
  console.log(`term dropdown list       : ${termLists} | live formula: ${termFormulas}`);
  console.log(`ppt  dropdown list       : ${pptLists} | live formula: ${pptFormulas} | defaults to [1]: ${pptFallback}`);
  if (skippedRiderCodes.size) {
    console.log(`!! rider codes not in RiderMaster (add to masterData/riders.ts): ${[...skippedRiderCodes].join(', ')}`);
  }
  if (skippedPlans.length) {
    console.log(`!! plans skipped (${skippedPlans.length}): ${skippedPlans.slice(0, 15).join('; ')}`);
  }
};
