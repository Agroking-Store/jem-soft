/**
 * Measures LIC's premium mode factors for a plan.
 *
 * The system computes an instalment as
 *
 *     installment = basicYearlyPremium * modeFactor
 *
 * and when no ProductPremiumModeFactor row exists it falls back to hardcoded
 * constants (half-yearly 0.51, quarterly 0.26, monthly 0.088). Those constants
 * are wrong: measured against LIC's own basicInstPremium the real factors are
 * about 0.505 / 0.255 / 0.085, so a half-yearly policy is overcharged by
 * roughly 1% and a monthly one by roughly 3.4%.
 *
 * LIC reduces the rebate as well as the premium in non-yearly modes, which is
 * why the factor is not simply 1/n. This measures the ratio directly and
 * checks whether it is stable across age and term.
 *
 * Usage:
 *   node_modules\.bin\tsx.cmd prisma\scripts\fetchLICModeFactors.ts --plan=833
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
    const p = a.replace(/^--/, "").split("=");
    return [p[0], p[1] === undefined ? "true" : p[1]];
  }),
);

const MODES = ["Y", "H", "Q", "M"];

function payload(o: Record<string, unknown>) {
  return {
    secondaryAge: 0, Rider: [], Age: 40, DOB: "1978-07-12", OtherDOB: "0001-01-01",
    Gender: "M", ExtraClass: { ExtraClassType: "None" }, extraClassRate: 0,
    PlanNumb: "833", CommDate: CALC_DATE, CalcDate: CALC_DATE, FupDate: "2027-07-12",
    CompletionDate: CALC_DATE, Mode: "Y", Term: 13, PPT: 10, Sum: REF_SA,
    PreviousSum: 0, SBOption: 1, SBAmount: 0, ExistClient: false, Options: "0",
    IncludeGST: true, IsSmoker: false, id: "office@jayantmahabole.com", ...o,
  };
}

async function call(plan: string, o: Record<string, any>) {
  const { url, payload: fixed } = endpointFor(plan);
  for (let a = 1; a <= 3; a++) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "content-type": "application/json", accept: "application/json",
          origin: "https://imagicbo.i-magic.in", referer: "https://imagicbo.i-magic.in/",
        },
        body: JSON.stringify(payload({ ...fixed, ...o })),
        signal: AbortSignal.timeout(30000),
      });
      const t = await res.text();
      if (!t || !t.trim()) throw new Error("empty");
      return JSON.parse(t);
    } catch (e: any) {
      if (a === 3) return null;
      await new Promise((r) => setTimeout(r, 800 * a));
    }
  }
  return null;
}

const dobFor = (age: number) => new Date(Date.UTC(2018 - age, 6, 12)).toISOString().slice(0, 10);

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

  console.log(`plan ${plan}: measuring mode factors over ${ages.length} ages x ${terms.length} terms x 4 modes\n`);

  const results: Record<string, number[]> = { Y: [], H: [], Q: [], M: [] };

  for (const age of ages) {
    for (const term of terms) {
      const ppt = offM ? Math.max(1, term - Number(offM[1])) : term;
      const base: Record<string, number> = {};

      for (const m of MODES) {
        const j: any = await call(plan, { PlanNumb: plan, DOB: dobFor(age), Age: age, Term: term, PPT: ppt, Sum: REF_SA, Mode: m });
        const y = j?.ylyPremium;
        if (!y || Number(y.premiumRate ?? 0) <= 0) break;
        if (m === "Y") base.Y = Number(y.basicPremium);
        else {
          const inst = Number(j.basicInstPremium ?? 0);
          const annual = base.Y;
          if (annual > 0 && inst > 0) results[m].push(inst / annual);
        }
        await new Promise((r) => setTimeout(r, DELAY_MS));
      }
    }
    if (age % 5 === 0) {
      const fmt = (m: string) => {
        const v = results[m];
        return v.length ? `${(v.reduce((s, x) => s + x, 0) / v.length).toFixed(5)}` : "-";
      };
      console.log(`   through age ${String(age).padStart(2)}:  H=${fmt("H")}  Q=${fmt("Q")}  M=${fmt("M")}`);
    }
  }

  console.log(`\n=== measured mode factors for plan ${plan} ===\n`);
  const out = ["Plan Number,Mode,Mode Factor,Hardcoded Fallback,Samples"];
  const OURS: Record<string, number> = { Y: 1, H: 0.51, Q: 0.26, M: 0.088 };
  const NAME: Record<string, string> = { Y: "Yearly", H: "Half-Yearly", Q: "Quarterly", M: "Monthly" };

  for (const m of MODES) {
    const v = results[m];
    if (m === "Y" || !v.length) continue;
    const mean = v.reduce((s, x) => s + x, 0) / v.length;
    const min = Math.min(...v);
    const max = Math.max(...v);
    const overcharge = ((OURS[m] / mean - 1) * 100);
    console.log(`   ${NAME[m].padEnd(12)} measured ${mean.toFixed(5)}   (range ${min.toFixed(5)} - ${max.toFixed(5)}, ${v.length} samples)`);
    console.log(`   ${"".padEnd(12)} ours     ${OURS[m].toFixed(5)}   -> we overcharge by ${overcharge.toFixed(2)}%`);
    out.push([plan, m, mean.toFixed(5), OURS[m], v.length].join(","));
  }
  out.push([plan, "Y", "1.00000", 1, results.Y.length || 1].join(","));

  const file = path.join(OUT_DIR, "lic_mode_factors.csv");
  fs.writeFileSync(file, out.join("\n") + "\n");
  console.log(`\nwritten: ${file}`);
  await prisma.$disconnect();
}

main().catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });