/**
 * Verifies a seeded LIC legacy plan against LIC's live APIs.
 *
 * Every expected value is read from LIC at test time, so a wrong stored value
 * cannot pass. Nothing is hardcoded except the two endpoints.
 *
 *   node_modules\.bin\tsx.cmd prisma\scripts\verifyLegacyPlan.ts --plan=833
 *   node_modules\.bin\tsx.cmd prisma\scripts\verifyLegacyPlan.ts --plan=833 --sample=50
 *
 * Plans LIC's CalcPremium endpoint does not serve (894 returns 0) are verified
 * from published LIC values instead of from the live API:
 *
 *   node_modules\.bin\tsx.cmd prisma\scripts\verifyLegacyPlan.ts --plan=894 \
 *     --fixture=prisma\masterData\premiumRates894.json
 *
 * The fixture is per-plan data (expected premiums plus the inputs to produce
 * them); this script stays plan-agnostic and just compares our API against it.
 * A rate file may carry that data under a "verification" key, or the file may
 * be a fixture on its own with "cases" at the top level.
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
import { readFileSync } from "node:fs";
import { endpointFor } from "./licEndpoints";

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const p = a.replace(/^--/, "").split("=");
    return [p[0], p[1] === undefined ? "true" : p[1]];
  }),
);

const PLAN = args.plan ?? "833";
const SAMPLE = args.sample && args.sample !== "all" ? Number(args.sample) : Infinity;
// Plans launched after 2018 (874 and 915) return no rate on
// the 2018 default, so the date is overridable.
const CALC_DATE =
  args.date ??
  (PLAN === "874"
    ? "2026-10-06"
    : PLAN === "866"
      ? "2023-02-01"
      : PLAN === "855"
        ? "2022-10-06"
        : "2018-07-12");
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
function dobForBand(band: number): string | null {
  const months = band * 6;
  const date = new Date(`${CALC_DATE}T00:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() - months);
  const iso = date.toISOString().slice(0, 10);
  return monthsBetween(iso, CALC_DATE) === months ? iso : null;
}

const take = <T,>(arr: T[], n: number): T[] =>
  n >= arr.length ? arr : Array.from({ length: n }, (_, i) => arr[Math.floor((i * arr.length) / n)]!);

async function forEachLimit<T>(rows: T[], limit: number, fn: (row: T) => Promise<void>) {
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(limit, rows.length) }, async () => {
    while (next < rows.length) {
      const row = rows[next++];
      await fn(row!);
    }
  }));
}

/**
 * LIC's rider lookup names riders without the trailing " Rider" that
 * RiderMaster carries - it returns "Double Accident Benefit" where the master
 * record says "Double Accident Benefit Rider" - so the two cannot be compared
 * verbatim.
 */
const normRider = (s: string) =>
  s
    .toLowerCase()
    .replace(/\brider\b/g, "")
    .replace(/\boption\b/g, "")
    .replace(/[^a-z0-9]/g, "");

/**
 * LIC names option-based riders "Critical Illness Rider - Option 1/2" while the
 * master record may say "Critical Illness Rider" and "Critical Illness Rider 2".
 * Normalising the option suffix away and defaulting a missing number to 1 makes
 * the three shapes comparable.
 */
const riderKey = (s: string) => {
  const key = normRider(s);
  return /[0-9]$/.test(key) ? key : `${key}1`;
};
const sameRider = (a: string, b: string) => riderKey(a) === riderKey(b);

// ---------------------------------------------------------------- fixture mode

type FixtureCase = {
  description: string;
  input: Record<string, any>;
  /** What LIC itself published for this case, for the record. */
  official?: string;
  /** Expected fields of the premium-preview payload. */
  expect?: Record<string, number>;
  /** Substring of the message a rejected input must produce (HTTP 4xx). */
  expectError?: string;
};

/**
 * Compares our own /policies/premium-preview against a per-plan JSON file of
 * values published by LIC, instead of against i-magic - whose CalcPremium
 * endpoint answers 0 for plan 894 and the other plans registered with an
 * empty url. The expected numbers (and their sources) live in the fixture, so
 * this runner stays plan-agnostic: `--fixture=<file>` selects the data.
 */
async function runFixture(P: string, fixturePath: string) {
  const fixture = JSON.parse(readFileSync(fixturePath, "utf8"));
  // Either a standalone fixture file or a rate file that carries the expected
  // values under a "verification" key.
  const meta = fixture.verification ?? fixture;
  const cases: FixtureCase[] = meta.cases ?? [];

  console.log(`=== verifying plan ${PLAN} against ${fixturePath} ===`);
  if (meta.planName) console.log(`   ${meta.planName}`);
  for (const s of meta.sources ?? []) console.log(`   - ${s}`);
  console.log("");

  let pass = 0;
  let fail = 0;
  const bad: string[] = [];

  for (const c of cases) {
    const res = await fetch(API + "/policies/premium-preview", {
      method: "POST",
      headers: H,
      body: JSON.stringify({ productId: P, ...c.input }),
    });
    const text = await res.text();
    let body: any = null;
    try {
      body = JSON.parse(text);
    } catch {
      /* non-JSON body - reported below */
    }
    const pr = body?.data?.premium;

    if (c.expectError) {
      const ok = !res.ok && text.includes(c.expectError);
      ok ? pass++ : fail++;
      if (ok) {
        console.log(`  ok   rejects: ${c.description}`);
      } else {
        console.log(`  FAIL rejects: ${c.description}`);
        bad.push(
          `${c.description}: wanted 4xx containing "${c.expectError}", got HTTP ${res.status} ${text.slice(0, 160)}`,
        );
      }
      continue;
    }

    if (!res.ok || !pr) {
      fail++;
      console.log(`  FAIL ${c.description}`);
      bad.push(`${c.description}: HTTP ${res.status} ${text.slice(0, 200)}`);
      continue;
    }

    const diffs: string[] = [];
    for (const [field, want] of Object.entries(c.expect ?? {})) {
      const got = Number(pr[field]);
      if (!Number.isFinite(got) || Math.abs(got - Number(want)) > 0.01) {
        diffs.push(`${field}: ours ${pr[field]} vs expected ${want}`);
      }
    }
    if (diffs.length) {
      fail++;
      console.log(`  FAIL ${c.description}`);
      bad.push(`${c.description}: ${diffs.join("; ")}`);
    } else {
      pass++;
      console.log(
        `  ok   ${c.description}` + (c.official ? `  [${c.official}]` : ""),
      );
    }
  }

  console.log(`\n=== RESULT: PASS ${pass}   FAIL ${fail} ===`);
  if (bad.length) {
    console.log("\nfailures:");
    for (const b of bad.slice(0, 25)) console.log("  -", b);
    if (bad.length > 25) console.log(`  ...and ${bad.length - 25} more`);
  }
  process.exitCode = fail ? 1 : 0;
}

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

  if (args.fixture) {
    await runFixture(P, args.fixture);
    await prisma.$disconnect();
    return;
  }

  const baseRows = await prisma.productPremiumRate.findMany({
    where: { productId: P, ageBand: null },
    select: { entryAge: true, policyTerm: true, premiumPayingTerm: true, option: true, gender: true, smoker: true, tabularRate: true },
  });
  const bandRows = await prisma.productPremiumRate.findMany({
    where: { productId: P, ageBand: { not: null } },
    select: { entryAge: true, ageBand: true, policyTerm: true, premiumPayingTerm: true, option: true, gender: true, smoker: true, tabularRate: true },
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
  const licOption = (option: number | null) => {
    if (PLAN === "874") return { SBOption: option ?? 1, Options: "1" };
    if (PLAN === "866" || PLAN === "855") return { Options: String(option ?? 1) };
    return {};
  };
  const appOption = (option: number | null) =>
    PLAN === "874" || PLAN === "866" || PLAN === "855" ? { option: option ?? 1 } : {};

  // ---- 1 & 2 & 3: rates and rebates -------------------------------------
  console.log("--- 1. integer-age rate rows ---");
  await forEachLimit(tBase, 4, async (r) => {
    const j: any = await licQuote({ DOB: dobFor(r.entryAge), Age: r.entryAge, Term: r.policyTerm, PPT: r.premiumPayingTerm ?? r.policyTerm, Gender: r.gender ?? "M", IsSmoker: r.smoker ?? false, ...licOption(r.option) });
    const licRate = Number(j?.ylyPremium?.premiumRate ?? 0);
    if (licRate === 0) { skip++; return; }
    const ok = Math.abs(Number(r.tabularRate) - licRate) < 0.01;
    ok ? pass++ : fail++;
    if (!ok) bad.push(`rate age ${r.entryAge} T${r.policyTerm}: stored ${r.tabularRate} vs LIC ${licRate}`);
    await new Promise((x) => setTimeout(x, 280));
  });
  console.log(`   ${pass} pass, ${fail} fail, ${skip} no-rate-at-LIC`);

  console.log("\n--- 2 & 3. half-year band rates, with the rebate and basic premium ---");
  let bPass = 0, bFail = 0, bSkip = 0, rPass = 0, rFail = 0;
  await forEachLimit(tBand, 4, async (r) => {
    const dob = dobForBand(r.ageBand!);
    if (!dob) { bSkip++; return; }
    const j: any = await licQuote({ DOB: dob, Age: r.entryAge, Term: r.policyTerm, PPT: r.premiumPayingTerm ?? r.policyTerm, Gender: r.gender ?? "M", IsSmoker: r.smoker ?? false, ...licOption(r.option) });
    const licRate = Number(j?.ylyPremium?.premiumRate ?? 0);
    if (licRate === 0) { bSkip++; return; }

    const ok = Math.abs(Number(r.tabularRate) - licRate) < 0.01;
    ok ? bPass++ : bFail++;
    if (!ok) bad.push(`rate band ${r.ageBand} (age ${r.entryAge}) T${r.policyTerm}: stored ${r.tabularRate} vs LIC ${licRate}`);

    const rb = new Map<number, number>((j.rebate ?? []).map((x: any) => [Number(x.rebateType), Number(x.rebaRate)]));
    const licRebate = (rb.get(1) ?? 0) + (rb.get(2) ?? 0);
    const licBasic = Number(j.ylyPremium.basicPremium ?? 0);
    const ours: any = await ourPost("/policies/premium-preview", {
      productId: P, age: r.entryAge, policyTerm: r.policyTerm,
      premiumPayingTerm: r.premiumPayingTerm, sumAssured: REF_SA, ...appOption(r.option),
      premiumMode: "Yearly", gender: r.gender ?? "Male", smoker: r.smoker ?? false,
      dateOfBirth: dob, commencementDate: CALC_DATE,
    });
    const pr = ours?.premium;
    const rbOk =
      Math.abs(Number(pr?.saRebateRate) - licRebate) < 0.002 &&
      Math.abs(Number(pr?.basicYearlyPremium) - licBasic) < 0.05;
    rbOk ? rPass++ : rFail++;
    if (!rbOk) bad.push(`rebate band ${r.ageBand} T${r.policyTerm}: ours ${pr?.saRebateRate}/${pr?.basicYearlyPremium} vs LIC ${licRebate}/${licBasic}`);
    await new Promise((x) => setTimeout(x, 280));
  });
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
      ? dobForBand(bandMid.ageBand)
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
