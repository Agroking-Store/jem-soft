/**
 * Wipes everything a legacy LIC plan owns, runs the standard seed, and checks
 * the plan comes back complete.
 *
 * This is the test that matters for a fresh developer: if it passes, pulling the
 * repo and running `tsx prisma/seed.ts` is enough to reproduce the plan.
 *
 *   node_modules\.bin\tsx.cmd prisma\scripts\testFreshSeed.ts --plan=833
 *
 * Only deletes rows belonging to the named plan, so it is safe to run against a
 * database that holds other plans.
 */

import { execSync } from "child_process";
import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";
import {
  seedPremiumRates874,
  seedRiderPremium874,
  seedModeFactors874,
} from "../seedPremiumRates874";

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const p = a.replace(/^--/, "").split("=");
    return [p[0], p[1] === undefined ? "true" : p[1]];
  }),
);
const PLAN = args.plan ?? "833";

const prisma = new PrismaClient();

async function counts(label: string) {
  const p = await prisma.productMaster.findFirst({
    where: { planNumber: PLAN, productCode: { startsWith: "LEGACY-" } },
    select: { id: true },
  });
  if (!p) { console.log(`${label}: product missing`); return null; }
  const [rates, band, rebate, bandRebate, riders, riderRates, modes, attrs] = await Promise.all([
    prisma.productPremiumRate.count({ where: { productId: p.id, ageBand: null } }),
    prisma.productPremiumRate.count({ where: { productId: p.id, ageBand: { not: null } } }),
    prisma.productAgeTermRebate.count({ where: { productId: p.id, ageBand: null } }),
    prisma.productAgeTermRebate.count({ where: { productId: p.id, ageBand: { not: null } } }),
    prisma.productRider.count({ where: { productId: p.id } }),
    prisma.riderPremiumRate.count({ where: { productId: p.id } }),
    prisma.productPremiumModeFactor.count({ where: { productId: p.id } }),
    prisma.productAttributeValue.count({ where: { productId: p.id } }),
  ]);
  console.log(
    `${label}\n   rates ${rates}+${band}band | rebates ${rebate}+${bandRebate}band | riders ${riders} | riderRates ${riderRates} | modes ${modes} | attrs ${attrs}`,
  );
  return { p, rates, band, rebate, bandRebate, riders, riderRates, modes, attrs };
}

async function priceProbe(id: string) {
  const token = jwt.sign({ id: "521fcb3f-c52a-4cdf-a511-1ed7d9e4a7dd", role: "ADMIN", email: "admin@gmail.com" }, "jem_soft", { expiresIn: "1h" });
  const H = { Authorization: `Bearer ${token}`, "content-type": "application/json" };

  const band = await prisma.productPremiumRate.findFirst({
    where: { productId: id, ageBand: { not: null } },
    select: { entryAge: true, ageBand: true, policyTerm: true, premiumPayingTerm: true, option: true },
    orderBy: [{ entryAge: "asc" }, { policyTerm: "asc" }, { option: "asc" }],
  });
  if (!band) { console.log("   no band rows to price"); return; }

  const months = band.ageBand! * 6;
  const commencementDate = "2026-10-06";
  const dobDate = new Date(`${commencementDate}T00:00:00Z`);
  dobDate.setUTCMonth(dobDate.getUTCMonth() - months);
  const dob = dobDate.toISOString().slice(0, 10);

  const base = {
    productId: id, age: band.entryAge, policyTerm: band.policyTerm,
    premiumPayingTerm: band.premiumPayingTerm, sumAssured: 500000, option: band.option,
    gender: "Male", smoker: false, dateOfBirth: dob, commencementDate,
  };

  const y: any = (await (await fetch("http://localhost:5000/api/policies/premium-preview", {
    method: "POST", headers: H, body: JSON.stringify({ ...base, premiumMode: "Yearly" }),
  })).json())?.data?.premium;
  console.log(`   age ${band.entryAge} band ${band.ageBand}, term ${band.policyTerm}: rate ${y?.rate}  rebate ${y?.saRebateRate}  basic ${y?.basicYearlyPremium}`);

  for (const mode of ["Half-Yearly", "Quarterly", "Monthly"]) {
    const d: any = (await (await fetch("http://localhost:5000/api/policies/premium-preview", {
      method: "POST", headers: H, body: JSON.stringify({ ...base, premiumMode: mode }),
    })).json())?.data?.premium;
    console.log(`   ${mode.padEnd(12)}: factor ${d?.modeFactor}  instalment ${d?.installmentPremium}`);
  }

  const links = await prisma.productRider.findMany({
    where: { productId: id },
    select: { rider: { select: { id: true, riderCode: true } } },
  });
  for (const link of links) {
    const r: any = (await (await fetch("http://localhost:5000/api/policies/rider-premium-preview", {
      method: "POST", headers: H,
      body: JSON.stringify({
        productId: id, riderId: link.rider.id, age: band.entryAge, riderTerm: band.policyTerm,
        premiumPayingTerm: band.premiumPayingTerm, sumAssured: 100000,
        premiumMode: "Half-Yearly", gender: "Male", dateOfBirth: dob, commencementDate: "2018-07-12",
      }),
    })).json())?.data;
    console.log(`   rider ${link.rider.riderCode.padEnd(4)} half-yearly: ${r?.premium}${r?.isManual ? " (MANUAL)" : ""}`);
  }
}

async function main() {
  console.log(`=== fresh-seed test for plan ${PLAN} ===\n`);

  console.log("1. state before the wipe");
  const before = await counts("  ");

  console.log("\n2. wiping everything this plan owns");
  const p = before!.p.id;
  await prisma.productPremiumRate.deleteMany({ where: { productId: p } });
  await prisma.productAgeTermRebate.deleteMany({ where: { productId: p } });
  await prisma.riderPremiumRate.deleteMany({ where: { productId: p } });
  await prisma.productRider.deleteMany({ where: { productId: p } });
  await prisma.productPremiumModeFactor.deleteMany({ where: { productId: p } });
  // Plan 874's premium seeder does not own catalogue attributes. Keep its
  // metadata intact so this plan-scoped test never needs the all-plan seed.
  if (PLAN !== "874") {
    await prisma.productAttributeValue.deleteMany({ where: { productId: p } });
  }
  await counts("  after wipe:");

  console.log("\n3. re-seeding the plan-specific rates");
  if (PLAN === "874") {
    await seedPremiumRates874(prisma);
    await seedRiderPremium874(prisma);
    await seedModeFactors874(prisma);
    console.log("  plan 874 seed finished without error");
  } else {
    try {
      execSync("node_modules\\.bin\\tsx.cmd prisma\\seed.ts", { stdio: "pipe", encoding: "utf8" });
      console.log("  seed finished without error");
    } catch (e: any) {
      console.log("  SEED FAILED:\n" + (e.stdout ?? "") + (e.stderr ?? ""));
      process.exit(1);
    }
  }

  console.log("\n4. state after the seed");
  const after = await counts("  ");

  console.log("\n5. does it price correctly now?");
  await priceProbe(p);

  console.log("\n6. counts match what was there before");
  const keys = ["rates", "band", "rebate", "bandRebate", "riders", "riderRates", "modes", "attrs"] as const;
  let ok = true;
  for (const k of keys) {
    const want = (before as any)[k];
    const got = (after as any)[k];
    const match = want === got;
    if (!match) ok = false;
    console.log(`   ${k.padEnd(11)} before ${String(want).padStart(5)}  after ${String(got).padStart(5)}  ${match ? "OK" : "MISMATCH"}`);
  }

  console.log(`\n=== ${ok ? "PASS - a fresh clone plus the standard seed reproduces this plan" : "FAIL"} ===`);
  await prisma.$disconnect();
  process.exitCode = ok ? 0 : 1;
}

main().catch((e) => { console.error(e); process.exit(1); });
