/**
 * Regression guard for the legacy-plan work.
 *
 * Everything that was added for plan 833 must be inert for every other plan.
 * The sharpest test is that sending the new dateOfBirth / commencementDate pair
 * changes nothing on a plan that has no age-band rows: the service should fall
 * back to plain integer entry age and return an identical premium.
 *
 *   node_modules\.bin\tsx.cmd prisma\scripts\regressLegacyChange.ts
 */

import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const token = jwt.sign({ id: "521fcb3f-c52a-4cdf-a511-1ed7d9e4a7dd", role: "ADMIN", email: "admin@gmail.com" }, "jem_soft", { expiresIn: "1h" });
const H = { Authorization: `Bearer ${token}`, "content-type": "application/json" };

async function premium(body: Record<string, any>) {
  const res = await fetch("http://localhost:5000/api/policies/premium-preview", {
    method: "POST", headers: H, body: JSON.stringify(body),
  });
  const j: any = await res.json();
  return { status: res.status, d: j?.data };
}

async function riderPremium(body: Record<string, any>) {
  const res = await fetch("http://localhost:5000/api/policies/rider-premium-preview", {
    method: "POST", headers: H, body: JSON.stringify(body),
  });
  const j: any = await res.json();
  return { status: res.status, d: j?.data };
}

async function main() {
  let pass = 0;
  let fail = 0;
  const bad: string[] = [];

  // ---------------------------------------------------------------- 0
  console.log("=== 0. the age-band columns must be inert everywhere else ===\n");
  const leakedRate = await prisma.productPremiumRate.count({
    where: { ageBand: { not: null }, product: { NOT: { productCode: { startsWith: "LEGACY-" } } } },
  });
  const leakedRider = await prisma.riderPremiumRate.count({
    where: { ageBand: { not: null }, product: { NOT: { productCode: { startsWith: "LEGACY-" } } } },
  });
  const riderCodes = await prisma.riderPremiumRate.findMany({
    where: { product: { NOT: { productCode: { startsWith: "LEGACY-" } } } },
    select: { ratePerThousand: true },
  });
  const brokenRider = riderCodes.filter((r) => Number(r.ratePerThousand) <= 0);
  const checks: [string, number, number][] = [
    ["ProductPremiumRate rows carrying an ageBand outside legacy", leakedRate, 0],
    ["RiderPremiumRate rows carrying an ageBand outside legacy", leakedRider, 0],
    [`non-positive rider rates after the precision change (of ${riderCodes.length})`, brokenRider.length, 0],
  ];
  for (const [label, got, want] of checks) {
    got === want ? pass++ : fail++;
    if (got !== want) bad.push(`${label}: ${got}, expected ${want}`);
    console.log(`   ${label.padEnd(62)} ${got}  ${got === want ? "OK" : "PROBLEM"}`);
  }

  // ---------------------------------------------------------------- 1
  console.log("\n=== 1. does the new dateOfBirth parameter change any other plan's price? ===\n");
  console.log("   plan | code           | DOB sent: basic | no DOB: basic | same?");
  console.log("   " + "-".repeat(72));

  const products = await prisma.productMaster.findMany({
    where: { premiumRates: { some: {} } },
    select: {
      id: true, planNumber: true, productCode: true, productName: true,
      premiumRates: { select: { entryAge: true, policyTerm: true, premiumPayingTerm: true }, take: 1, orderBy: { entryAge: "asc" } },
    },
    take: 40,
  });

  for (const p of products) {
    const r = p.premiumRates[0];
    if (!r || r.entryAge == null) continue;
    const base: any = {
      productId: p.id, age: r.entryAge, policyTerm: r.policyTerm,
      premiumPayingTerm: r.premiumPayingTerm, sumAssured: 1000000,
      premiumMode: "Yearly", gender: "Male", smoker: false,
    };
    const withDob = await premium({ ...base, dateOfBirth: "1995-06-15", commencementDate: "2024-01-01" });
    const without = await premium(base);

    const a = Number(withDob.d?.premium?.basicYearlyPremium);
    const b = Number(without.d?.premium?.basicYearlyPremium);
    const identical = withDob.status === without.status && (Number.isNaN(a) ? Number.isNaN(b) : Math.abs(a - b) < 0.01);

    // Plans 833 and 123 are the positive controls: they are the only plans that
    // store half-year age bands, so their price SHOULD move when a date of birth
    // is supplied. Every other plan must be unaffected.
    const isControl = p.planNumber === "833" || p.planNumber === "123";
    const ok = isControl ? !identical : identical;
    ok ? pass++ : fail++;
    if (!ok) {
      bad.push(`plan ${p.planNumber} (${p.productCode}): with DOB ${a} vs without ${b}`);
    }
    console.log(
      `   ${String(p.planNumber).padStart(4)} | ${p.productCode.padEnd(14).slice(0, 14)} | ` +
      `${String(Number.isNaN(a) ? "manual" : a).padStart(17)} | ${String(Number.isNaN(b) ? "manual" : b).padStart(12)} | ` +
      `${isControl ? (identical ? "NO CHANGE (unexpected)" : "changed as designed") : (identical ? "OK" : "CHANGED!")}`,
    );
  }

  // ---------------------------------------------------------------- 2
  console.log("\n\n=== 2. can every plan with rates still be priced at all? ===\n");
  console.log("   (using a rate row with a real entry age, and passing the option,");
  console.log("    PPT and spouse age that the plan's own row specifies)\n");
  const broken: string[] = [];
  let priced = 0;
  let manual = 0;

  for (const p of products) {
    // Some of these plans store rows at entryAge 0, and the API rejects age 0.
    // Pick a row with a real age and echo back the option / secondary age it needs.
    const r = await prisma.productPremiumRate.findFirst({
      where: { productId: p.id, entryAge: { gt: 0 } },
      select: { entryAge: true, policyTerm: true, premiumPayingTerm: true, secondaryAge: true, option: true },
      orderBy: { entryAge: "asc" },
    });
    if (!r) { manual++; continue; }
    const body: any = {
      productId: p.id, age: r.entryAge, policyTerm: r.policyTerm,
      premiumPayingTerm: r.premiumPayingTerm, sumAssured: 1000000,
      premiumMode: "Yearly", gender: "Male", smoker: false,
    };
    if (r.secondaryAge != null) body.secondaryAge = r.secondaryAge;
    if (r.option != null) body.option = r.option;
    // Plans on the "usesPptLookup" list (714/745/771/883) refuse to price
    // without a PPT, and some of their rows store none. Borrow any PPT the
    // plan does use.
    if (r.premiumPayingTerm == null) {
      const withPpt = await prisma.productPremiumRate.findFirst({
        where: { productId: p.id, premiumPayingTerm: { not: null } },
        select: { premiumPayingTerm: true },
      });
      if (withPpt?.premiumPayingTerm) body.premiumPayingTerm = withPpt.premiumPayingTerm;
    }
    const res = await premium(body);
    if (res.status !== 200) { broken.push(`plan ${p.planNumber} (${p.productCode}): HTTP ${res.status} ${res.d?.message ?? ""}`); fail++; continue; }
    if (res.d?.premium && !res.d?.isManual) priced++;
    else manual++;
  }
  console.log(`   priced ${priced}, fell back to manual ${manual}, errored ${broken.length}`);
  if (broken.length) for (const b of broken) console.log(`     - ${b}`);
  else pass++;

  // ---------------------------------------------------------------- 3
  console.log("\n\n=== 3. rider premiums on non-legacy plans still resolve ===\n");
  const legacyIds = new Set(
    (await prisma.productMaster.findMany({ where: { productCode: { startsWith: "LEGACY-" } }, select: { id: true } })).map((x) => x.id),
  );
  const withRiders = await prisma.productMaster.findMany({
    where: { NOT: { id: { in: [...legacyIds] } }, riders: { some: {} }, riderPremiumRates: { some: {} } },
    select: {
      id: true, planNumber: true, productCode: true,
      // Pull a few rows: some plans store wildcard rider rates with entryAge 0
      // (the rate does not depend on age), and the endpoint rejects age 0 as a
      // missing value. Taking just the first row made this check depend on
      // physical row order, so it passed or failed at random after a re-seed.
      riderPremiumRates: { select: { entryAge: true, riderTerm: true, premiumPayingTerm: true, riderId: true }, take: 10 },
    },
    take: 15,
  });
  for (const p of withRiders) {
    const r = p.riderPremiumRates.find((x) => x.entryAge > 0) ?? p.riderPremiumRates[0];
    if (!r) continue;
    const res = await riderPremium({
      productId: p.id, riderId: r.riderId, age: r.entryAge, riderTerm: r.riderTerm,
      premiumPayingTerm: r.premiumPayingTerm, sumAssured: 1000000,
      premiumMode: "Yearly", gender: "Male",
      dateOfBirth: "1995-06-15", commencementDate: "2024-01-01",
    });
    const v = Number(res.d?.premium);
    const ok = res.status === 200 && Number.isFinite(v) && v > 0;
    ok ? pass++ : fail++;
    if (!ok) bad.push(`rider on plan ${p.planNumber} (${p.productCode}): ${res.status} ${res.d?.message ?? "no premium"}`);
    console.log(`   ${String(p.planNumber).padStart(4)} | ${p.productCode.padEnd(14).slice(0, 14)} | rider premium ${isNaN(v) ? "NONE" : v} ${ok ? "OK" : "XX " + (res.d?.message ?? "")}`);
  }

  // ---------------------------------------------------------------- 4
  console.log("\n\n=== 4. legacy plans other than 833 must be untouched by its seeding ===\n");
  const otherLegacy = await prisma.productMaster.findMany({
    where: { productCode: { startsWith: "LEGACY-" }, NOT: { planNumber: { in: ["833", "123"] } } },
    select: { id: true, planNumber: true, _count: { select: { premiumRates: true, riderPremiumRates: true, ageTermRebates: true } } },
  });
  const withAnything = otherLegacy.filter(
    (x) => x._count.premiumRates || x._count.riderPremiumRates || x._count.ageTermRebates,
  );
  console.log(`   legacy products other than 833: ${otherLegacy.length}`);
  console.log(`   of those holding any rate, rider or rebate row: ${withAnything.length}`);
  withAnything.length === 0 ? pass++ : fail++;
  if (withAnything.length) bad.push(`unexpected rows on ${withAnything.map((x) => x.planNumber).join(", ")}`);
  console.log(`   ${withAnything.length === 0 ? "OK - none of them was touched" : "PROBLEM"}`);

  console.log(`\n=== RESULT: PASS ${pass}   FAIL ${fail} ===`);
  if (bad.length) { console.log("\nproblems:"); for (const b of bad) console.log("  -", b); }

  await prisma.$disconnect();
  process.exitCode = fail ? 1 : 0;
}

main().catch(async (e) => { console.error(e.message); await prisma.$disconnect(); process.exit(1); });