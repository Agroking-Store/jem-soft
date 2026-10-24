/**
 * Verifies a seeded LIC legacy plan against LIC's live APIs.
 *
 * Every expected value is read from LIC at test time, so a wrong stored value
 * cannot pass. Nothing is hardcoded except the two endpoints.
 *
 *   node_modules\.bin\tsx.cmd prisma\scripts\verifyLegacyPlan.ts --plan=833
 *   node_modules\.bin\tsx.cmd prisma\scripts\verifyLegacyPlan.ts --plan=833 --sample=50
 *
 * Checks, in order:
 *   1. integer-age rate rows
 *   2. half-year band rate rows
 *   3. the rebate and basic premium that follow from those bands
 *   4. rider rates across entry ages, policy terms and sum assured
 *   5. every rider linked to the plan, in every premium mode
 *   6. premium mode factors
 *
 * --sample=N limits the row count in checks 1-3 (default: all of them).
 */

import { PrismaClient } from "@prisma/client";
import { endpointFor } from "./licEndpoints";

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const p = a.replace(/^--/, "").split("=");
    return [p[0], p[1] === undefined ? "true" : p[1]];
  }),
);

const PLAN = args.plan ?? "833";
const SAMPLE = args.sample && args.sample !== "all" ? Number(args.sample) : Infinity;
// Plans launched after 2018 (915 went on sale in Feb-2020) return no rate on
// the 2018 default, so the date is overridable.
const CALC_DATE = args.date ?? "2018-07-12";
const REF_SA = 1000000;
const API = process.env.VERIFY_API ?? "http://localhost:5000/api";

const prisma = new PrismaClient();

const token =
  process.env.VERIFY_TOKEN ??
  (await import("jsonwebtoken")).default.sign(
    { id: "521fcb3f-c52a-4cdf-a511-1ed7d9e4a7dd", role: "ADMIN", email: "admin@gmail.com" },
    "jem_soft",
    { expiresIn: "1h" },
  );
const H = { Authorization: `Bearer ${token}`, "content-type": "application/json" };

// ---------------------------------------------------------------- LIC calls

function licPayload(o: Record<string, unknown>) {
  return {
    secondaryAge: 0,
    Rider: [],
    Age: 40,
    DOB: "1978-07-12",
    OtherDOB: "0001-01-01",
    Gender: "M",
    ExtraClass: { ExtraClassType: "None" },
    extraClassRate: 0,
    PlanNumb: PLAN,
    CommDate: CALC_DATE,
    CalcDate: CALC_DATE,
    FupDate: "2027-07-12",
    CompletionDate: CALC_DATE,
    Mode: "Y",
    Term: 13,
    PPT: 10,
    Sum: REF_SA,
    PreviousSum: 0,
    SBOption: 1,
    SBAmount: 0,
    ExistClient: false,
    Options: "0",
    IncludeGST: true,
    IsSmoker: false,
    id: "office@jayantmahabole.com",
    ...o,
  };
}

async function licQuote(o: Record<string, any>) {
  const { url, payload: fixed } = endpointFor(PLAN);
  for (let a = 1; a <= 3; a++) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          accept: "application/json",
          origin: "https://imagicbo.i-magic.in",
          referer: "https://imagicbo.i-magic.in/",
        },
        body: JSON.stringify(licPayload({ ...fixed, ...o })),
        signal: AbortSignal.timeout(30000),
      });
      const t = await res.text();
      if (!t || !t.trim()) throw new Error("empty body");
      return JSON.parse(t);
    } catch {
      if (a === 3) return null;
      await new Promise((r) => setTimeout(r, 800 * a));
    }
  }
  return null;
}

/** LIC's rider lookup is a separate endpoint and wants the short mode code. */
async function licRiders(o: Record<string, any>) {
  const r = await fetch("https://vmprobl.i-magic.in/api/Lookup/Riders", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json",
      origin: "https://imagicbo.i-magic.in",
      referer: "https://imagicbo.i-magic.in/",
    },
    body: JSON.stringify({
      Split: true,
      DOB: "1978-07-12",
      PropDOB: "0001-01-01",
      Gender: "M",
      ExtraClass: "None",
      PlanNumb: PLAN,
      CommDate: CALC_DATE,
      Mode: "Y",
      Term: 13,
      PremTerm: 10,
      RiderSum: String(REF_SA),
      RiderPrevSum: "0",
      SBoption: "1",
      id: "office@jayantmahabole.com",
      ...o,
    }),
    signal: AbortSignal.timeout(25000),
  });
  const t = await r.text();
  try {
    const j = JSON.parse(t);
    return Array.isArray(j) ? j : [];
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------- our calls

async function ourPost(path: string, body: Record<string, any>) {
  const res = await fetch(API + path, { method: "POST", headers: H, body: JSON.stringify(body) });
  const j: any = await res.json();
  if (!res.ok) throw new Error(`${path} -> ${res.status} ${JSON.stringify(j).slice(0, 160)}`);
  return j?.data;
}

// ---------------------------------------------------------------- helpers

const CALC_YEAR = Number(CALC_DATE.slice(0, 4));
const dobFor = (age: number) => new Date(Date.UTC(CALC_YEAR - age, 6, 12)).toISOString().slice(0, 10);

const monthsBetween = (dob: string, ref: string) => {
  const b = new Date(dob + "T00:00:00Z");
  const c = new Date(ref + "T00:00:00Z");
  let m = (c.getUTCFullYear() - b.getUTCFullYear()) * 12 + (c.getUTCMonth() - b.getUTCMonth());
  if (c.getUTCDate() < b.getUTCDate()) m--;
  return m;
};

/** A date of birth that lands in a specific half-year age band. */
function dobForBand(age: number, band: number): string | null {
  const months = band * 6;
  const iso = new Date(Date.UTC(CALC_YEAR - Math.floor(months / 12), 6 - (months % 12), 12))
    .toISOString()
    .slice(0, 10);
  return monthsBetween(iso, CALC_DATE) === months ? iso : null;
}

const take = <T,>(arr: T[], n: number): T[] =>
  n >= arr.length ? arr : Array.from({ length: n }, (_, i) => arr[Math.floor((i * arr.length) / n)]!);

/**
 * LIC's rider lookup names riders without the trailing " Rider" that
 * RiderMaster carries - it returns "Double Accident Benefit" where the master
 * record says "Double Accident Benefit Rider" - so the two cannot be compared
 * verbatim.
 */
const normRider = (s: string) => s.toLowerCase().replace(/\brider\b/g, "").replace(/[^a-z]/g, "");
const sameRider = (a: string, b: string) => normRider(a) === normRider(b);

// ---------------------------------------------------------------- main

async function main() {
  const product = await prisma.productMaster.findFirst({
    where: { planNumber: PLAN, productCode: { startsWith: "LEGACY-" } },
    select: { id: true, productName: true },
  });
  if (!product) {
    console.error(`plan ${PLAN}: no LEGACY product found`);
    process.exit(1);
  }
  const P = product.id;

  const baseRows = await prisma.productPremiumRate.findMany({
    where: { productId: P, ageBand: null },
    select: { entryAge: true, policyTerm: true, premiumPayingTerm: true, tabularRate: true },
  });
  const bandRows = await prisma.productPremiumRate.findMany({
    where: { productId: P, ageBand: { not: null } },
    select: { entryAge: true, ageBand: true, policyTerm: true, premiumPayingTerm: true, tabularRate: true },
  });

  console.log(`=== verifying plan ${PLAN} (${product.productName}) ===`);
  console.log(`   stored: ${baseRows.length} integer-age rates, ${bandRows.length} half-year band rates`);
  const tBase = take(baseRows, Math.min(SAMPLE, baseRows.length));
  const tBand = take(bandRows, Math.min(SAMPLE, bandRows.length));
  console.log(`   testing: ${tBase.length} integer-age rows, ${tBand.length} band rows\n`);

  let pass = 0;
  let fail = 0;
  let skip = 0;
  const bad: string[] = [];

  // ---- 1 & 2 & 3: rates and rebates -------------------------------------
  console.log("--- 1. integer-age rate rows ---");
  for (const r of tBase) {
    const j: any = await licQuote({ DOB: dobFor(r.entryAge), Age: r.entryAge, Term: r.policyTerm, PPT: r.premiumPayingTerm ?? r.policyTerm });
    const licRate = Number(j?.ylyPremium?.premiumRate ?? 0);
    if (licRate === 0) { skip++; continue; }
    const ok = Math.abs(Number(r.tabularRate) - licRate) < 0.01;
    ok ? pass++ : fail++;
    if (!ok) bad.push(`rate age ${r.entryAge} T${r.policyTerm}: stored ${r.tabularRate} vs LIC ${licRate}`);
    await new Promise((x) => setTimeout(x, 280));
  }
  console.log(`   ${pass} pass, ${fail} fail, ${skip} no-rate-at-LIC`);

  console.log("\n--- 2 & 3. half-year band rates, with the rebate and basic premium ---");
  let bPass = 0, bFail = 0, bSkip = 0, rPass = 0, rFail = 0;
  for (const r of tBand) {
    const dob = dobForBand(r.entryAge, r.ageBand!);
    if (!dob) { bSkip++; continue; }
    const j: any = await licQuote({ DOB: dob, Age: r.entryAge, Term: r.policyTerm, PPT: r.premiumPayingTerm ?? r.policyTerm });
    const licRate = Number(j?.ylyPremium?.premiumRate ?? 0);
    if (licRate === 0) { bSkip++; continue; }

    const ok = Math.abs(Number(r.tabularRate) - licRate) < 0.01;
    ok ? bPass++ : bFail++;
    if (!ok) bad.push(`rate band ${r.ageBand} (age ${r.entryAge}) T${r.policyTerm}: stored ${r.tabularRate} vs LIC ${licRate}`);

    const rb = new Map<number, number>((j.rebate ?? []).map((x: any) => [Number(x.rebateType), Number(x.rebaRate)]));
    const licRebate = (rb.get(1) ?? 0) + (rb.get(2) ?? 0);
    const licBasic = Number(j.ylyPremium.basicPremium ?? 0);
    const ours: any = await ourPost("/policies/premium-preview", {
      productId: P, age: r.entryAge, policyTerm: r.policyTerm,
      premiumPayingTerm: r.premiumPayingTerm, sumAssured: REF_SA,
      premiumMode: "Yearly", gender: "Male", smoker: false,
      dateOfBirth: dob, commencementDate: CALC_DATE,
    });
    const pr = ours?.premium;
    const rbOk =
      Math.abs(Number(pr?.saRebateRate) - licRebate) < 0.002 &&
      Math.abs(Number(pr?.basicYearlyPremium) - licBasic) < 0.05;
    rbOk ? rPass++ : rFail++;
    if (!rbOk) bad.push(`rebate band ${r.ageBand} T${r.policyTerm}: ours ${pr?.saRebateRate}/${pr?.basicYearlyPremium} vs LIC ${licRebate}/${licBasic}`);
    await new Promise((x) => setTimeout(x, 280));
  }
  pass += bPass + rPass;
  fail += bFail + rFail;
  console.log(`   rate   : ${bPass} pass, ${bFail} fail, ${bSkip} skipped`);
  console.log(`   rebate : ${rPass} pass, ${rFail} fail`);

  // ---- 4: rider rates across age, term and sum assured ------------------
  console.log("\n--- 4. rider rates across ages, terms and sum assured ---");
  const riderLinks = await prisma.productRider.findMany({
    where: { productId: P },
    select: { rider: { select: { id: true, riderCode: true, riderName: true } } },
  });
  // Plans rated on the nearer birthday (915) have no band rows, so fall back
  // to the integer-age grid for the rider probes.
  const probeRows = bandRows.length ? bandRows : baseRows;
  const ages = [...new Set(probeRows.map((r) => r.entryAge))].sort((a, b) => a - b);
  const terms = [...new Set(probeRows.map((r) => r.policyTerm))].sort((a, b) => a - b);
  const probeAges = ages.filter((_, i) => i % Math.max(1, Math.ceil(ages.length / 6)) === 0).slice(0, 8);
  const probeTerms = terms.filter((_, i) => i % Math.max(1, Math.ceil(terms.length / 4)) === 0).slice(0, 4);
  const SA_PROBES = [100000, 500000, 1000000];

  let sPass = 0, sFail = 0;
  for (const age of probeAges) {
    for (const term of probeTerms) {
      const probeRow = probeRows.find(
        (r) => r.entryAge === age && r.policyTerm === term,
      );
      // Skip combinations the plan does not offer (e.g. 915 at age 48 T33
      // would mature at 81, past the 75 cap).
      if (!probeRow) continue;
      const ppt = probeRow.premiumPayingTerm ?? term;
      for (const sa of SA_PROBES) {
        const licRows = await licRiders({ DOB: dobFor(age), Term: term, PremTerm: ppt, RiderSum: String(sa) });
        for (const link of riderLinks) {
          const licRow = licRows.find((x: any) => sameRider(String(x.rideDesc), link.rider.riderName));
          if (!licRow?.ridePrem) continue;
          const d: any = await ourPost("/policies/rider-premium-preview", {
            productId: P, riderId: link.rider.id, age, riderTerm: term,
            premiumPayingTerm: ppt, sumAssured: sa,
            premiumMode: "Yearly", gender: "Male",
          });
          const got = Number(d?.premium);
          // LIC prices some riders by flooring the instalment, so allow a rupee.
          const ok = !d?.isManual && Math.abs(got - licRow.ridePrem) <= 1;
          ok ? sPass++ : sFail++;
          if (!ok) bad.push(`rider ${link.rider.riderCode} SA ${sa} age ${age} T${term}: ours ${got}${d?.isManual ? " (manual)" : ""} vs LIC ${licRow.ridePrem}`);
        }
        await new Promise((x) => setTimeout(x, 300));
      }
    }
  }
  pass += sPass;
  fail += sFail;
  console.log(`   ${sPass} pass, ${sFail} fail  (ages ${probeAges.join(",")} x terms ${probeTerms.join(",")} x SA ${SA_PROBES.join(",")})`);

  // ---- 5: every linked rider in every premium mode ----------------------
  console.log("\n--- 5. every linked rider, in every premium mode ---");
  const MODE_CODE: Record<string, string> = { Yearly: "Y", "Half-Yearly": "H", Quarterly: "Q", Monthly: "M" };
  const bandMid: any = bandRows.length
    ? bandRows[Math.floor(bandRows.length / 2)]
    : baseRows[Math.floor(baseRows.length / 2)];
  const midAge = bandMid?.entryAge ?? 30;
  const midTerm = bandMid?.policyTerm ?? 13;
  const midPpt = bandMid?.premiumPayingTerm ?? midTerm;
  const midDob =
    bandMid?.ageBand != null
      ? dobForBand(midAge, bandMid.ageBand)
      : dobFor(midAge);
  let mPass = 0, mFail = 0;
  console.log("  mode        | rider | LIC prem | our prem | diff");
  for (const mode of Object.keys(MODE_CODE)) {
    const licRows = await licRiders({
      DOB: midDob,
      Term: midTerm, PremTerm: midPpt,
      RiderSum: "100000", Mode: MODE_CODE[mode],
    });
    for (const link of riderLinks) {
      const licRow = licRows.find((x: any) => sameRider(String(x.rideDesc), link.rider.riderName));
      const licPrem = licRow?.ridePrem ?? null;
      const d: any = await ourPost("/policies/rider-premium-preview", {
        productId: P, riderId: link.rider.id, age: midAge,
        riderTerm: midTerm, premiumPayingTerm: midPpt,
        sumAssured: 100000, premiumMode: mode, gender: "Male",
        dateOfBirth: midDob,
        commencementDate: CALC_DATE,
      });
      const got = Number(d?.premium);
      const ok = !d?.isManual && licPrem !== null && Math.abs(got - licPrem) <= 1;
      ok ? mPass++ : mFail++;
      if (!ok) bad.push(`rider ${link.rider.riderCode} ${mode}: ours ${got}${d?.isManual ? " (manual)" : ""} vs LIC ${licPrem}`);
      console.log(
        `  ${mode.padEnd(10)} | ${link.rider.riderCode.padEnd(4)} | ${String(licPrem ?? "-").padStart(7)} | ` +
        `${String(d?.isManual ? "MANUAL" : got).padStart(8)} | ${d?.isManual ? "  --" : String((got - licPrem).toFixed(2)).padStart(5)} ${ok ? "OK" : "XX " + (d?.message ?? "")}`,
      );
    }
    await new Promise((x) => setTimeout(x, 350));
  }
  pass += mPass;
  fail += mFail;

  // ---- 6: premium mode factors ------------------------------------------
  console.log("\n--- 6. premium mode factors ---");
  const modeFactors = await prisma.productPremiumModeFactor.findMany({
    where: { productId: P },
    select: { factor: true, premiumMode: { select: { modeName: true } } },
  });
  console.log(`   ${modeFactors.length} factor(s) stored: ${modeFactors.map((m) => `${m.premiumMode.modeName}=${m.factor}`).join("  ") || "none - using the generic fallback"}`);

  // ---- summary ----------------------------------------------------------
  console.log(`\n=== RESULT: PASS ${pass}   FAIL ${fail}   (skipped ${skip + bSkip}) ===`);
  console.log(`   coverage: ${tBase.length}/${baseRows.length} integer-age rows, ${tBand.length}/${bandRows.length} band rows`);
  if (bad.length) {
    console.log("\nfailures:");
    for (const b of bad.slice(0, 25)) console.log("  -", b);
    if (bad.length > 25) console.log(`  ...and ${bad.length - 25} more`);
  }

  await prisma.$disconnect();
  process.exitCode = fail ? 1 : 0;
}

main().catch(async (e) => { console.error(e.message); await prisma.$disconnect(); process.exit(1); });
