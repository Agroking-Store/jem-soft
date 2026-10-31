/**
 * Crawls rider premium rates from LIC's /api/Lookup/Riders endpoint.
 *
 * Unlike the base rate table, rider rates are NOT flat:
 *   DAB  - varies with policy term only (constant across entry ages)
 *   TRB  - varies with entry age AND policy term
 *
 * Verified findings for plan 833:
 *   TRB age 20 -> 178 , age 50 -> 1188   (SA 1,00,000, term 13)
 *   TRB term 13 -> 412 , term 25 -> 577  (SA 1,00,000, age 38)
 *   DAB term 13 -> 125 , term 25 -> 110  (constant across ages)
 *
 * Rider premium is linear in RiderSum, so the per-1000 rate is measured once
 * at the reference sum assured and applied to any sum.
 *
 * Usage:
 *   node_modules\.bin\tsx.cmd prisma\scripts\fetchLICRiderRates.ts --plan=833
 *   node_modules\.bin\tsx.cmd prisma\scripts\fetchLICRiderRates.ts --all
 */

import fs from "fs";
import path from "path";
import { prisma } from "../../src/config/database.js";

const OUT_DIR = path.join(process.cwd(), "lic-rate-export");
const DELAY_MS = 300;
const LOOKUP_URL = "https://vmprobl.i-magic.in/api/Lookup/Riders";
const CALC_DATE = "2018-07-12";

/**
 * Rider premium is linear in the rider sum, but LIC rounds the premium to whole
 * rupees. Measuring at a small sum therefore loses precision - at 1,00,000 a
 * Term Rider Benefit premium of 412 implies 4.1200 per 1000, while at 10,00,000
 * the same age/term returns 4116, i.e. the true rate is 4.116. Every value in
 * between is consistent with 4.116 once the rounding is applied.
 *
 * So the rate is measured at 10,00,000 where the rounding error is at most
 * half a rupee per ten lakh, i.e. 0.00005 per 1000.
 */
const REF_SA = 1000000;

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, "").split("=");
    return [k, v ?? "true"];
  }),
);

/** Rider codes as LIC reports them. */
const RIDERS: Record<number, { code: string; name: string }> = {
  2: { code: "TRB", name: "Term Rider Benefit" },
  3: { code: "DAB", name: "Double Accident Benefit" },
};

function payload(plan: string, o: Record<string, any>) {
  return {
    Split: true,
    DOB: "1980-07-12",
    PropDOB: "0001-01-01",
    Gender: "M",
    ExtraClass: "None",
    PlanNumb: plan,
    CommDate: "2018-07-12",
    Mode: "Y",
    Term: 13,
    PremTerm: 10,
    RiderSum: String(REF_SA),
    RiderPrevSum: "0",
    SBoption: "1",
    id: "office@jayantmahabole.com",
    ...o,
  };
}

async function lookup(plan: string, o: Record<string, any>) {
  for (let a = 1; a <= 3; a++) {
    try {
      const res = await fetch(LOOKUP_URL, {
        method: "POST",
        headers: {
          "content-type": "application/json", accept: "application/json",
          origin: "https://imagicbo.i-magic.in", referer: "https://imagicbo.i-magic.in/",
        },
        body: JSON.stringify(payload(plan, o)),
        signal: AbortSignal.timeout(30000),
      });
      const text = await res.text();
      if (!text || !text.trim()) throw new Error(`empty body HTTP ${res.status}`);
      const j = JSON.parse(text);
      if (j?.errors) throw new Error(JSON.stringify(j.errors).slice(0, 120));
      return Array.isArray(j) ? j : [];
    } catch (e: any) {
      if (a === 3) return null;
      await new Promise((r) => setTimeout(r, 800 * a));
    }
  }
  return null;
}

/** DOB that makes the customer exactly `age` whole years old on the comm date. */
const dobFor = (age: number) => new Date(Date.UTC(2018 - age, 6, 12)).toISOString().slice(0, 10);

/**
 * Rider rates move on the same half-year boundary as the base rate: on plan 833
 * a Term Rider Benefit at age 38 costs 4116 per 10 lakh when the customer is in
 * the first half of the age year and 4508 in the second, a 9.5% jump. So every
 * integer age is probed at both ends of its year.
 */
function completeMonths(dob: string) {
  const b = new Date(dob + "T00:00:00Z");
  const c = new Date(CALC_DATE + "T00:00:00Z");
  let m = (c.getUTCFullYear() - b.getUTCFullYear()) * 12 + (c.getUTCMonth() - b.getUTCMonth());
  if (c.getUTCDate() < b.getUTCDate()) m--;
  return m;
}
const bandOf = (dob: string) => Math.floor(completeMonths(dob) / 6);

function probesFor(age: number) {
  const firstHalf = new Date(Date.UTC(2018 - age, 6, 12)).toISOString().slice(0, 10);
  const secondHalf = new Date(Date.UTC(2018 - age, 0, 12)).toISOString().slice(0, 10);
  return [firstHalf, secondHalf];
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  let planNums: string[];
  if (args.plan) planNums = args.plan.split(",").map((s) => s.trim());
  else if (args.all) {
    const rows = await prisma.productMaster.findMany({
      where: { productCode: { startsWith: "LEGACY-" } },
      select: { planNumber: true },
    });
    planNums = [...new Set(rows.map((r) => String(r.planNumber ?? "").trim()))]
      .filter((p) => { const m = p.match(/^\d+/); return m ? Number(m[0]) >= 101 : true; })
      .sort((a, b) => Number(a) - Number(b));
  } else {
    planNums = ["833"];
  }

  const out = ["Plan Number,Entry Age,Age Band,Policy Term,PPT,Rider Code,Rider Name,Rider Premium,Rider Sum,Rate Per 1000"];
  let total = 0, failures = 0;

  for (const plan of planNums) {
    const attrs = await prisma.productAttributeValue.findMany({
      where: { product: { planNumber: plan, productCode: { startsWith: "LEGACY-" } } },
      select: { value: true, attribute: { select: { attributeCode: true } } },
    });
    const A = new Map<string, string>(attrs.map((x) => [x.attribute.attributeCode, String(x.value ?? "")]));

    const minAgeRaw = Number(A.get("MIN_ENTRY_AGE"));
    const maxAgeRaw = Number(A.get("MAX_ENTRY_AGE"));
    const minAge = Number.isFinite(minAgeRaw) && minAgeRaw > 0 ? minAgeRaw : 18;
    const maxAge = Number.isFinite(maxAgeRaw) && maxAgeRaw > 0 ? maxAgeRaw : 60;
    const ages: number[] = [];
    for (let a = minAge; a <= maxAge; a++) ages.push(a);

    let terms = (A.get("TERMS") ?? "").split(",").map(Number).filter((n) => n > 0);
    if (terms.length === 0) {
      const m = (A.get("TERM_FORMULA") ?? "").toLowerCase().match(/(\d+)\s*-\s*[^0-9]*?age/);
      if (m) for (let t = Number(m[1]) - maxAge; t < Number(m[1]); t++) if (t > 0) terms.push(t);
    }
    terms = [...new Set(terms)].sort((x, y) => x - y);

    console.log(`\nplan ${plan}: ages ${minAge}..${maxAge} (${ages.length}), terms ${terms[0]}..${terms[terms.length - 1]} (${terms.length})`);
    let planRows = 0;

    for (const term of terms) {
      // PPT follows the plan's own rule; LIC mostly uses term-3 for legacy plans
      const pptFormula = A.get("PPT_FORMULA") ?? "";
      const off = /term\s*-\s*(\d+)/i.exec(pptFormula);
      const ppt = off ? Math.max(1, term - Number(off[1])) : term;

      for (const age of ages) {
        for (const dob of probesFor(age)) {
          const res = await lookup(plan, { DOB: dob, Term: term, PremTerm: ppt });
          if (!res) { failures++; continue; }

          for (const r of res) {
            const meta = RIDERS[Number(r.rideCode)];
            if (!meta || !r.ridePrem) continue;
            out.push(
              [plan, age, bandOf(dob), term, ppt, meta.code, meta.name, r.ridePrem, r.rideSum ?? REF_SA,
                (r.ridePrem / (REF_SA / 1000)).toFixed(3)].join(",")
            );
            planRows++;
          }
          await new Promise((r) => setTimeout(r, DELAY_MS));
        }
      }
    }
    total += planRows;
    console.log(`  plan ${plan}: ${planRows} rider rate rows`);
  }

  const file = path.join(OUT_DIR, "lic_rider_rates.csv");
  fs.writeFileSync(file, out.join("\n") + "\n");
  console.log(`\nTOTAL rider rate rows: ${total}   failed lookups: ${failures}`);
  console.log(`written: ${file}`);
  await prisma.$disconnect();
}

main().catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });