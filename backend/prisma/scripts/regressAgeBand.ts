/**
 * Regression guard for the age-band change.
 *
 * The band columns are nullable and the lookups prefer ageBand only when a
 * band-specific row exists, so every non-legacy plan must behave exactly as
 * before. This checks:
 *   1. plans that still have prices reachable
 *   2. the same 833 request with and without a date of birth - without it the
 *      integer-age row must be used, with it the band row
 *   3. legacy plans other than 833 are untouched by 833's seeding
 */

import jwt from "jsonwebtoken";
import { prisma } from "../../src/config/database.js";

const token = jwt.sign({ id: "521fcb3f-c52a-4cdf-a511-1ed7d9e4a7dd", role: "ADMIN", email: "admin@gmail.com" }, "jem_soft", { expiresIn: "1h" });
const H = { Authorization: `Bearer ${token}`, "content-type": "application/json" };

async function preview(body: any) {
  const res = await fetch("http://localhost:5000/api/policies/premium-preview", {
    method: "POST", headers: H, body: JSON.stringify(body),
  });
  return { status: res.status, data: (await res.json())?.data };
}

async function main() {
  console.log("=== 1. did the age-band columns leak onto non-legacy plans? ===\n");
  const leaked = await prisma.productPremiumRate.findMany({
    where: { ageBand: { not: null }, product: { NOT: { productCode: { startsWith: "LEGACY-" } } } },
    select: { ageBand: true, product: { select: { planNumber: true, productCode: true } } },
    take: 5,
  });
  console.log(`   non-legacy rate rows carrying an ageBand: ${leaked.length} ${leaked.length ? "(LEAK)" : "(clean)"}`);

  const leakedReb = await prisma.productAgeTermRebate.count({ where: { ageBand: { not: null } } });
  const leakedRider = await prisma.riderPremiumRate.count({ where: { ageBand: { not: null } } });
  console.log(`   rebate rows with ageBand: ${leakedReb}   rider rows with ageBand: ${leakedRider}   (both should belong to 833 only)`);

  console.log("\n=== 2. the 7-series plans still price? ===\n");
  const sample = await prisma.productMaster.findMany({
    where: { productCode: { not: { startsWith: "LEGACY-" } }, premiumRates: { some: {} } },
    select: { id: true, planNumber: true, productName: true, premiumRates: { select: { entryAge: true, policyTerm: true, premiumPayingTerm: true }, take: 1, orderBy: { entryAge: "asc" } } },
    take: 6,
  });
  let ok = 0, bad = 0;
  for (const p of sample) {
    const r = p.premiumRates[0];
    if (!r) continue;
    const res = await preview({
      productId: p.id, age: r.entryAge, policyTerm: r.policyTerm,
      premiumPayingTerm: r.premiumPayingTerm, sumAssured: 1000000,
      premiumMode: "Yearly", gender: "Male", smoker: false,
    });
    const has = !!res.data?.premium && !res.data?.isManual;
    has ? ok++ : bad++;
    console.log(`   plan ${String(p.planNumber).padStart(4)} ${String(p.productName).slice(0, 28).padEnd(28)} age ${r.entryAge} T${r.policyTerm} -> ${has ? "priced " + res.data.premium.rate : (res.data?.message ?? "no price")}`);
  }
  console.log(`\n   ${ok} priced, ${bad} without a price`);

  console.log("\n=== 3. 833 with and without a date of birth ===\n");
  const p833 = await prisma.productMaster.findFirst({
    where: { planNumber: "833", productCode: { startsWith: "LEGACY-" } }, select: { id: true },
  });
  const base = {
    productId: p833!.id, age: 38, policyTerm: 13, premiumPayingTerm: 10,
    sumAssured: 1000000, premiumMode: "Yearly", gender: "Male", smoker: false,
  };
  const noDob = await preview(base);
  const firstHalf = await preview({ ...base, dateOfBirth: "1980-07-12", commencementDate: "2018-07-12" });
  const secondHalf = await preview({ ...base, dateOfBirth: "1980-01-12", commencementDate: "2018-07-12" });

  console.log(`   no DOB          : rate ${noDob.data?.premium?.rate}   (integer-age fallback)`);
  console.log(`   DOB 1980-07-12  : rate ${firstHalf.data?.premium?.rate}  band 76`);
  console.log(`   DOB 1980-01-12  : rate ${secondHalf.data?.premium?.rate}  band 77`);
  console.log(`\n   the two halves differ? ${firstHalf.data?.premium?.rate !== secondHalf.data?.premium?.rate ? "YES - band is being applied" : "NO - band not applied"}`);

  console.log("\n=== 4. other legacy plans were not disturbed by 833's seeding ===\n");
  const others = await prisma.productPremiumRate.groupBy({
    by: ["ageBand"],
    where: { product: { productCode: { startsWith: "LEGACY-" }, NOT: { planNumber: "833" } } },
    _count: { _all: true },
  });
  console.log(`   band rows on legacy plans other than 833: ${others.reduce((s, o) => s + o._count._all, 0)}`);

  await prisma.$disconnect();
}
main().catch((e) => { console.error(e.message); process.exit(1); });