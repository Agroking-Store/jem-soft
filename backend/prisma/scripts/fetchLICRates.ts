/**
 * LIC premium-rate crawler.
 *
 * Pulls the rate + rebate grid for legacy LIC plans from the i-magic
 * CalcPremium endpoint and writes two CSVs that can be replayed into the DB:
 *
 *   lic_rates.csv    -> ProductPremiumRate        (premiumRate per 1000 SA)
 *   lic_rebates.csv  -> ProductSumAssuredRebate   (rebate per 1000 SA per band)
 *
 * Why the API instead of brochures: the rebate is a function of
 * age + term + sumAssured, so it cannot be derived from the published
 * rate table alone. One API call yields rate + rebate together.
 *
 * Usage:
 *   node_modules\.bin\tsx.cmd prisma\scripts\fetchLICRates.ts --plans=833,836 --probe
 *   node_modules\.bin\tsx.cmd prisma\scripts\fetchLICRates.ts --plans=833,836,102
 *   node_modules\.bin\tsx.cmd prisma\scripts\fetchLICRates.ts --all --ageStep=5
 *   node_modules\.bin\tsx.cmd prisma\scripts\fetchLICRates.ts --all --ageStep=5 --resume
 *
 * Per-plan endpoints live in prisma/scripts/licEndpoints.ts - edit that file
 * when a plan needs its own URL, then re-run --probe to confirm.
 *
 * Notes:
 *  - Resumable: every response is appended to lic_rates_raw.jsonl, so an
 *    interrupted run continues from where it stopped.
 *  - Polite: a delay between calls. Do NOT remove it - this is a production
 *    third-party endpoint and rate limiting it can get the office blocked.
 */

import fs from "fs";
import path from "path";
import { endpointFor, needsEndpoint, LIC_ENDPOINTS, DEFAULT_URL } from "./licEndpoints";

const OUT_DIR = path.join(process.cwd(), "lic-rate-export");
const DELAY_MS = 250;

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, "").split("=");
    return [k, v ?? "true"];
  }),
);

const plans = args.plans ? args.plans.split(",").map((s) => s.trim()).filter(Boolean) : null;
const doAll = args.all === "true";
const ageStep = Number(args.ageStep ?? 1);
const resume = args.resume === "true";
const probe = args.probe === "true";
const limitAges = Number(args.limitAges ?? 0);

// age x term grid comes from the plan's own TERMS attribute
import { prisma } from "../../src/config/database.js";

type Attr = Map<string, string>;

function payload(overrides: Record<string, unknown>, o: Record<string, any> = {}) {
  return {
    secondaryAge: 0,
    Rider: [],
    Age: 40,
    DOB: "1979-01-04",
    OtherDOB: "0001-01-01",
    Gender: "M",
    ExtraClass: { ExtraClassType: "None" },
    extraClassRate: 0,
    PlanNumb: "833",
    CommDate: "2018-07-12",
    CalcDate: "2018-07-12",
    FupDate: "2027-07-12",
    CompletionDate: "2018-07-12",
    Mode: "Y",
    Term: 13,
    PPT: 10,
    Sum: 1000000,
    PreviousSum: 0,
    SBOption: 1,
    SBAmount: 0,
    ExistClient: false,
    Options: "0",
    IncludeGST: true,
    IsSmoker: false,
    id: "office@jayantmahabole.com",
    ...overrides,
    ...o,
  };
}

const dobFor = (age: number) =>
  new Date(Date.UTC(2018 - age, 6, 12)).toISOString().slice(0, 10);

async function call(plan: string, bodyObj: Record<string, any>) {
  const { url, payload: fixed } = endpointFor(plan);
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          accept: "application/json, text/plain, */*",
          origin: "https://imagicbo.i-magic.in",
          referer: "https://imagicbo.i-magic.in/",
        },
        body: JSON.stringify(payload(fixed, bodyObj)),
        signal: AbortSignal.timeout(30000),
      });
      const text = await res.text();
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return JSON.parse(text);
    } catch (e: any) {
      if (attempt === 3) return { __error: e?.message ?? "failed" };
      await new Promise((r) => setTimeout(r, 800 * attempt));
    }
  }
}

function read(j: any) {
  const y = j?.ylyPremium ?? {};
  const rebateByType = new Map<number, number>();
  let rebateTotal = 0;
  for (const r of j?.rebate ?? []) {
    const t = Number(r.rebateType ?? r.rebateCode);
    const v = Number(r.rebaRate ?? 0);
    rebateByType.set(t, v);
    rebateTotal += v;
  }
  return {
    rate: Number(y.premiumRate ?? 0),
    tabular: Number(y.tabularBasicPremium ?? 0),
    basic: Number(y.basicPremium ?? 0),
    gst: Number(y.gstAmt ?? 0),
    rebateTotal,
    rebateByType,
  };
}

/** PPT rules we already know from the legacy catalogue. */
function pptsFor(plan: string, term: number, attrs: Attr): number[] {
  const f = (attrs.get("PPT_FORMULA") ?? "").toLowerCase().replace(/\s+/g, " ");
  const raw = attrs.get("PPTS");
  if (raw) {
    const list = raw.split(",").map(Number).filter((n) => n > 0);
    if (list.length) return list;
  }
  if (f.includes("for")) {
    const m = f.match(new RegExp(`(\\d+)\\s*term\\s*:\\s*(\\d+)[^0-9]*${term}\\s*term\\s*:\\s*(\\d+)`));
    if (m) return [Number(m[3])];
    const any = [...f.matchAll(/(\d+)\s*term\s*:\s*(\d+)/g)];
    const hit = any.find((x) => Number(x[1]) === term);
    if (hit) return [Number(hit[2])];
    return [...new Set(any.map((x) => Number(x[2]!)))];
  }
  if (/term\s*-\s*(\d+)/.test(f)) {
    const off = Number(f.match(/term\s*-\s*(\d+)/)![1]);
    return [Math.max(0, term - off)];
  }
  if (/^\s*(\d+)\s*or\s*term/.test(f)) {
    const a = Number(f.match(/^\s*(\d+)/)![1]);
    const off = Number(f.match(/term\s*-\s*(\d+)/)?.[1] ?? 0);
    return Array.from(new Set([a, Math.max(0, term - off)])).filter((x) => x > 0).sort((x, y) => x - y);
  }
  return [term];
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const rawPath = path.join(OUT_DIR, "lic_rates_raw.jsonl");

  // ---- plan list ----
  let planNums: string[] = [];
  if (plans) planNums = plans;
  else if (doAll) {
    const rows = await prisma.productMaster.findMany({
      where: { productCode: { startsWith: "LEGACY-" } },
      select: { planNumber: true },
    });
    planNums = [...new Set(rows.map((r) => String(r.planNumber ?? "").trim()))]
      .filter((p) => { const l = p.match(/^\d+/); return l ? Number(l[0]) >= 101 : true; })
      .sort((a, b) => Number(a) - Number(b));
  } else {
    console.error("Pass --plans=833,836 or --all");
    process.exit(1);
  }

  // ---- terms per plan ----
  const termMap = new Map<string, number[]>();
  const pptRule = new Map<string, Attr>();
  for (const pn of planNums) {
    const p = await prisma.productMaster.findFirst({
      where: { planNumber: pn, productCode: { startsWith: "LEGACY-" } },
      select: {
        attributes: {
          select: { value: true, attribute: { select: { attributeCode: true } } },
        },
      },
    });
    const a = new Map<string, string>(
      (p?.attributes ?? []).map((x: any) => [x.attribute.attributeCode, String(x.value ?? "")]),
    );
    pptRule.set(pn, a);
    const terms = (a.get("TERMS") ?? "")
      .split(",").map(Number).filter((n) => n > 0);
    termMap.set(pn, terms.length ? terms : []);
  }

  // ---- resume support ----
  const done = new Set<string>();
  if (resume && fs.existsSync(rawPath)) {
    for (const line of fs.readFileSync(rawPath, "utf8").split("\n")) {
      if (!line.trim()) continue;
      try { const o = JSON.parse(line); if (o.plan && o.age != null && o.term != null) done.add(`${o.plan}|${o.age}|${o.term}|${o.sum}`); } catch { /* skip */ }
    }
    console.log(`Resume: ${done.size} combinations already fetched.`);
  }

  // ---- probe mode: one cheap call per plan, tells us exactly which plans work ----
  if (probe) {
    console.log(`\nPROBE MODE - 1 call per plan (${planNums.length} plans)\n`);
    const okPlans: string[] = [], deadPlans: string[] = [];
    for (const pn of planNums) {
      const terms = termMap.get(pn)!;
      const attrs = pptRule.get(pn)!;
      const rawMin = Number(attrs.get("MIN_ENTRY_AGE"));
      const rawMax = Number(attrs.get("MAX_ENTRY_AGE"));
      // Same fallbacks as the main loop: a missing/zero min age means a child
      // plan, not 18. 18 would be outside the window of any child plan.
      const minAge = Number.isFinite(rawMin) && rawMin > 0 ? rawMin : 1;
      const maxAge = Number.isFinite(rawMax) && rawMax > 0 ? rawMax : 60;

      // A single (age, term) probe gives false negatives: LIC drops combos
      // where term would push maturity past the allowed age (e.g. plan 102 at
      // entry age 1 has no terms below 19). Try several before giving up.
      const probeAges = [...new Set([minAge, Math.min(minAge + 5, maxAge), Math.round((minAge + maxAge) / 2)])];
      const probeTerms = [...new Set([terms[0], terms[Math.floor(terms.length / 2)], terms[terms.length - 1]].filter(Boolean))];
      const combos: [number, number][] = [];
      if (!probeTerms.length) {
        // Formula-driven plan: derive the term from the age.
        for (const a of probeAges) {
          const m = (attrs.get("TERM_FORMULA") ?? "").toLowerCase().match(/(\d+)\s*-\s*[^0-9]*?age/);
          const ft = m ? Number(m[1]) - a : 20;
          if (ft > 0) combos.push([a, ft]);
        }
      } else {
        for (const a of probeAges) for (const t of probeTerms) combos.push([a, t]);
      }

      let good = false, shownRate = 0, shown = "";
      for (const [age, term] of combos.slice(0, 6)) {
        const ppt = pptsFor(pn, term, attrs)[0] ?? term;
        const j: any = await call(pn, { PlanNumb: pn, Age: age, Term: term, PPT: ppt, Sum: 1000000, DOB: dobFor(age) });
        const d = j?.__error ? { rate: 0 } : read(j);
        shownRate = d.rate; shown = `age=${String(age).padStart(3)} term=${String(term).padStart(3)} rate=${String(d.rate).padStart(8)}${j?.__error ? " err=" + j.__error : ""}`;
        await new Promise((r) => setTimeout(r, DELAY_MS));
        if (d.rate > 0) { good = true; break; }
      }
      const cfg = endpointFor(pn);
      if (good) okPlans.push(pn); else deadPlans.push(pn);
      console.log(
        `  ${good ? "OK  " : "DEAD"} ${pn.padEnd(6)} ${shown.padEnd(46)} ` +
        `${cfg.custom ? "[custom endpoint]" : "[default]"}`,
      );
    }
    console.log(`\nWORKING (${okPlans.length}) : ${okPlans.join(", ") || "-"}`);
    console.log(`DEAD    (${deadPlans.length}) : ${deadPlans.join(", ") || "-"}`);
    const pending = needsEndpoint(deadPlans);
    if (pending.length) {
      console.log(`\n>>> Add these to prisma/scripts/licEndpoints.ts with their own URL:`);
      for (const p of pending) console.log(`    ${p}:`);
    }
    await prisma.$disconnect();
    return;
  }

  // Some plans cap sum assured (e.g. a child's plan maxes at ₹5L), so probe a
  // couple of values and keep the first one that returns a rate.
  const SA_PROBES = [1000000, 500000, 200000, 100000];
  let calls = 0, hits = 0, miss = 0, skipped = 0;
  const out = fs.createWriteStream(rawPath, { flags: resume ? "a" : "w" });
  const perPlan = new Map<string, { ok: number; bad: number; sa: number }>();
  const bump = (p: string, ok: boolean) => {
    if (!perPlan.has(p)) perPlan.set(p, { ok: 0, bad: 0, sa: SA_PROBES[0]! });
    const v = perPlan.get(p)!;
    if (ok) v.ok++; else v.bad++;
  };

  console.log(`Plans: ${planNums.length}   SA probes: ${SA_PROBES.join(", ")}   delay: ${DELAY_MS}ms\n`);

  for (const pn of planNums) {
    const attrs = pptRule.get(pn)!;
    // A missing / zero MIN_ENTRY_AGE means "child plan, age 0" in this dataset,
    // NOT 18. Defaulting to 18 would skip every child plan entirely.
    const rawMin = Number(attrs.get("MIN_ENTRY_AGE"));
    const rawMax = Number(attrs.get("MAX_ENTRY_AGE"));
    const minAge = Number.isFinite(rawMin) && rawMin > 0 ? rawMin : 1;
    const maxAge = Number.isFinite(rawMax) && rawMax > 0 ? rawMax : 60;
    const terms = termMap.get(pn)!;
    const termFormula = attrs.get("TERM_FORMULA");

    if (!terms.length && !termFormula) {
      console.warn(`  SKIP ${pn}: no TERMS and no TERM_FORMULA - cannot build a grid`);
      bump(pn, false);
      continue;
    }

    let ages: number[] = [];
    for (let a = minAge; a <= maxAge; a += ageStep) ages.push(a);
    if (limitAges > 0) ages = ages.slice(0, limitAges);

    for (const age of ages) {
      let termsForAge = terms;
      if (!terms.length && termFormula) {
        const m = termFormula.toLowerCase().match(/(\d+)\s*-\s*[^0-9]*?age/);
        if (m) { const t = Number(m[1]) - age; if (t > 0) termsForAge = [t]; }
      }
      for (const term of termsForAge) {
        for (const ppt of pptsFor(pn, term, attrs)) {
          let got = false;
          for (const sa of SA_PROBES) {
            const key = `${pn}|${age}|${term}|${ppt}|${sa}`;
            if (done.has(key)) { skipped++; got = true; break; }
            const j: any = await call(pn, { PlanNumb: pn, Age: age, Term: term, PPT: ppt, Sum: sa, DOB: dobFor(age) });
            calls++;
            if (j?.__error) { console.log(`  ERR ${key}: ${j.__error}`); break; }
            const d = read(j);
            if (d.rate > 0) {
              hits++; bump(pn, true); got = true;
              perPlan.get(pn)!.sa = sa;
              out.write(JSON.stringify({ plan: pn, age, term, ppt, sum: sa, ...d, rateMap: Object.fromEntries(d.rebateByType) }) + "\n");
              break;
            } else {
              miss++;
            }
          }
          if (!got) bump(pn, false);
          await new Promise((r) => setTimeout(r, DELAY_MS));
        }
      }
    }
    const v = perPlan.get(pn);
    process.stdout.write(`  ${pn}: ${v?.ok ?? 0} ok / ${v?.bad ?? 0} no (SA ${v?.sa ?? "-"})\r`);
  }
  out.end();

  // ---- build CSVs ----
  const rows = fs.readFileSync(rawPath, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
  const r3 = (n: number) => Math.round(n * 1000) / 1000;

  // Rates: one row per (plan, age, term, ppt)
  const ratesCsv = ["Plan Number,Entry Age,Policy Term,PPT,Tabular Rate (per 1000)"];
  // Rebate: full grid, because LIC's rebate varies with age AND term AND SA,
  // while ProductSumAssuredRebate only keys on (productId, minSumAssured).
  const rebateCsv = ["Plan Number,Entry Age,Policy Term,Sum Assured,Rebate Type1,Rebate Type2,Rebate Total per 1000"];

  for (const r of rows) {
    if (!(r.rate > 0)) continue;
    ratesCsv.push(`${r.plan},${r.age},${r.term},${r.ppt},${r.rate}`);
    rebateCsv.push(
      `${r.plan},${r.age},${r.term},${r.sum},${r3(r.rateMap?.[1] ?? 0)},${r3(r.rateMap?.[2] ?? 0)},${r3(r.rebateTotal)}`,
    );
  }

  fs.writeFileSync(path.join(OUT_DIR, "lic_rates.csv"), ratesCsv.join("\n"));
  fs.writeFileSync(path.join(OUT_DIR, "lic_rebates.csv"), rebateCsv.join("\n"));

  const withData = [...perPlan.entries()].filter(([, v]) => v.ok > 0).map(([p]) => p);
  const noData = [...perPlan.entries()].filter(([, v]) => v.ok === 0).map(([p]) => p);

  console.log(`\n\ncalls made        : ${calls}`);
  console.log(`combos skipped    : ${skipped}`);
  console.log(`rate found        : ${hits}`);
  console.log(`no rate (0)       : ${miss}`);
  console.log(`\nplans WITH data   : ${withData.sort((a, b) => Number(a) - Number(b)).join(", ") || "(none)"}`);
  console.log(`plans WITHOUT data: ${noData.sort((a, b) => Number(a) - Number(b)).join(", ") || "(none)"}`);
  console.log(`\nper plan:`);
  for (const [p, v] of [...perPlan.entries()].sort((a, b) => Number(a[0]) - Number(b[0])))
    console.log(`  ${p.padEnd(6)} ok=${String(v.ok).padStart(4)}  no=${String(v.bad).padStart(4)}  SA used=${v.sa}`);
  console.log(`\nwritten ->`);
  console.log(`  ${path.join(OUT_DIR, "lic_rates.csv")}   (${ratesCsv.length - 1} rows)`);
  console.log(`  ${path.join(OUT_DIR, "lic_rebates.csv")} (${rebateCsv.length - 1} rows)`);
  console.log(`  ${rawPath}  (raw, for resume)`);

  await prisma.$disconnect();
}

main().catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
