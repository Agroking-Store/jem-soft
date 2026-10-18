/**
 * Crawls LIC's base premium rates keyed by HALF-YEAR age band.
 *
 * LIC does not key its rate table on completed years. Measuring the response
 * across many dates of birth shows the rate steps on a six-month boundary:
 *
 *   age band = floor(complete months from DOB to the calculation date / 6)
 *
 * Verified on plan 833: a customer born 1978-07-12 (456 months, band 80) gets
 * 103.25, while one born 1978-01-12 (486 months, band 81) gets 103.65 - both
 * are "40 years old". Flattening to a single integer age is wrong by up to 0.83%.
 *
 * This script probes each integer age twice - once 0 months into the age
 * (band 2A) and once 6 months in (band 2A + 1) - and writes both, so the
 * service can pick the right one once it knows the customer's date of birth.
 *
 * Usage:
 *   node_modules\.bin\tsx.cmd prisma\scripts\fetchLICRateBands.ts --plan=833
 */

import fs from "fs";
import path from "path";
import { prisma } from "../../src/config/database.js";
import { endpointFor } from "./licEndpoints";

const OUT_DIR = path.join(process.cwd(), "lic-rate-export");
const DELAY_MS = 300;
const CALC_DATE = "2018-07-12";
const REF_SA = 1000000;

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const parts = a.replace(/^--/, "").split("=");
    return [parts[0], parts[1] === undefined ? "true" : parts[1]];
  }),
);

function payload(overrides: Record<string, unknown>) {
  return {
    secondaryAge: 0,
    Rider: [],
    Age: 40,
    DOB: "1978-07-12",
    OtherDOB: "0001-01-01",
    Gender: "M",
    ExtraClass: { ExtraClassType: "None" },
    extraClassRate: 0,
    PlanNumb: "833",
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
    ...overrides,
  };
}

async function call(plan: string, o: Record<string, any>) {
  const { url, payload: fixed } = endpointFor(plan);
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          accept: "application/json",
          origin: "https://imagicbo.i-magic.in",
          referer: "https://imagicbo.i-magic.in/",
        },
        body: JSON.stringify(payload({ ...fixed, ...o })),
        signal: AbortSignal.timeout(30000),
      });
      const t = await res.text();
      if (!t || !t.trim()) throw new Error("empty body");
      return JSON.parse(t);
    } catch (e: any) {
      if (attempt === 3) return null;
      await new Promise((r) => setTimeout(r, 800 * attempt));
    }
  }
  return null;
}

/** Complete months from DOB to the calculation date. */
function monthsFrom(dob: string) {
  const b = new Date(dob + "T00:00:00Z");
  const c = new Date(CALC_DATE + "T00:00:00Z");
  let m = (c.getUTCFullYear() - b.getUTCFullYear()) * 12 + (c.getUTCMonth() - b.getUTCMonth());
  if (c.getUTCDate() < b.getUTCDate()) m--;
  return m;
}

function band(dob: string) {
  return Math.floor(monthsFrom(dob) / 6);
}

/** DOB giving exactly `age` whole years, and `age` years plus 6 months. */
function dobsFor(age: number) {
  const zero = new Date(Date.UTC(2018 - age, 6, 12)).toISOString().slice(0, 10);
  const half = new Date(Date.UTC(2018 - age, 0, 12)).toISOString().slice(0, 10);
  return { zero, half };
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const plan = args.plan ?? "833";

  const attrs = await prisma.productAttributeValue.findMany({
    where: { product: { planNumber: plan, productCode: { startsWith: "LEGACY-" } } },
    select: { value: true, attribute: { select: { attributeCode: true } } },
  });
  const A = new Map<string, string>(attrs.map((x) => [x.attribute.attributeCode, String(x.value ?? "")]));
  const minAge = Number(A.get("MIN_ENTRY_AGE")) || 18;
  const maxAge = Number(A.get("MAX_ENTRY_AGE")) || 60;
  const terms = [...new Set((A.get("TERMS") ?? "").split(",").map(Number).filter((n) => n > 0))].sort((a, b) => a - b);
  const offM = /term\s*-\s*(\d+)/i.exec(A.get("PPT_FORMULA") ?? "");
  const ages: number[] = [];
  for (let a = minAge; a <= maxAge; a++) ages.push(a);

  console.log(`plan ${plan}: ages ${minAge}..${maxAge}, terms ${terms[0]}..${terms[terms.length - 1]}`);
  console.log(`probing ${ages.length} x ${terms.length} x 2 halves = ${ages.length * terms.length * 2} calls\n`);

  const out = ["Plan Number,Entry Age,Age Band,Policy Term,PPT,Tabular Rate,Rebate Type1"];
  let rows = 0;
  let none = 0;

  for (const age of ages) {
    for (const term of terms) {
      const ppt = offM ? Math.max(1, term - Number(offM[1])) : term;
      const d = dobsFor(age);
      const pair: { band: number; rate: number }[] = [];
      for (const dob of [d.zero, d.half]) {
        const j: any = await call(plan, { PlanNumb: plan, DOB: dob, Age: age, Term: term, PPT: ppt, Sum: REF_SA });
        const rate = Number(j?.ylyPremium?.premiumRate ?? 0);
        if (rate <= 0) { none++; continue; }
        const rb = new Map<number, number>((j.rebate ?? []).map((r: any) => [Number(r.rebateType), Number(r.rebaRate)]));
        const b = band(dob);
        out.push([plan, age, b, term, ppt, rate.toFixed(2), (rb.get(1) ?? 0).toFixed(3)].join(","));
        pair.push({ band: b, rate });
        rows++;
        await new Promise((r) => setTimeout(r, DELAY_MS));
      }
      if (age === 18 || age === 25 || age === 30 || age === 38 || age === 45) {
        if (pair.length === 2) {
          const same = pair[0]!.rate === pair[1]!.rate;
          console.log(`   age ${age} T${term}: band ${pair[0]!.band} = ${pair[0]!.rate}   band ${pair[1]!.band} = ${pair[1]!.rate}   ${same ? "same" : "DIFFERS"}`);
        }
      }
    }
  }

  const file = path.join(OUT_DIR, "lic_rate_bands.csv");
  fs.writeFileSync(file, out.join("\n") + "\n");

  // how often do the halves actually differ
  const map = new Map<string, number>();
  for (const line of out.slice(1)) {
    const c = line.split(",");
    map.set(c[1]! + "|" + c[3]!, Number(c[5]));
  }
  let diff = 0;
  let total = 0;
  const lines = out.slice(1);
  for (const age of ages) {
    for (const term of terms) {
      const mine = lines.filter((l) => l.startsWith(plan + "," + age + ",") && l.split(",")[3] === String(term));
      if (mine.length !== 2) continue;
      total++;
      if (mine[0]!.split(",")[5] !== mine[1]!.split(",")[5]) diff++;
    }
  }

  console.log(`\nrows written   : ${rows}`);
  console.log(`no rate at LIC : ${none}`);
  console.log(`age/term where the two halves differ: ${diff} of ${total} (${total ? ((diff / total) * 100).toFixed(1) : "0"}%)`);
  console.log(`written: ${file}`);
  await prisma.$disconnect();
}

main().catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });