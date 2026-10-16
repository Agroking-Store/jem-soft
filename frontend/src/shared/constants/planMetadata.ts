"use client";

/**
 * LIC legacy plan metadata.
 *
 * All legacy plan master data now lives in the database (attributes on
 * ProductMaster, riders via ProductRider). This module turns that raw data into
 * the shapes the policy form needs: dropdown option lists, live age-based
 * formulas and the plan validity window used by the calendar.
 *
 * Attributes consumed (seeded by backend/prisma/seeds/seedLegacyPlans.ts):
 *   TERMS / PPTS              comma separated, dropdown-ready
 *   TERM_FORMULA / PPT_FORMULA  resolved live from the customer's age
 *   INTRO_DATE / WITHDRAWAL_DATE  calendar min/max
 *   MIN_ENTRY_AGE / MAX_ENTRY_AGE  age validation
 *   DEFAULT_SUM_ASSURED       autofill value
 *   ALLOWED_RIDERS            canonical rider codes
 *   PPT_NOTES / PLAN_NOTES    display-only hints
 */

import { useMemo } from "react";
import { useSelector } from "react-redux";
import type { RootState } from "@/store/store";

export interface LegacyPlanMeta {
  planNumber: string;
  planName: string;
  /** Entry-age window; 0 means "not specified", so validation is skipped. */
  minEntryAge: number;
  maxEntryAge: number;
  /** Concrete term options. A single "0" marks whole-life / annuity plans. */
  terms: number[];
  /** Concrete PPT options. Empty means "not in the data" -> defaults to [1]. */
  ppts: number[];
  termFormula: string;
  pptFormula: string;
  introDate: string;
  withdrawalDate: string;
  minSumAssured: number;
  defaultSumAssured: number;
  maxSumAssured: number;
  allowedRiders: string[];
  pptNotes: string;
  notes: string;
}

/** "16,21,25" -> [16, 21, 25]. Returns [] for anything unparseable. */
export const parseNumberList = (raw?: string | null): number[] => {
  if (!raw) return [];
  const cleaned = raw.replace(/\band\b/gi, ",").replace(/[^\d,.\-]/g, "");
  const parts = cleaned
    .split(/[,.\s]+/)
    .map((s) => Number(s))
    .filter((n) => Number.isFinite(n));
  return Array.from(new Set(parts)).sort((a, b) => a - b);
};

/**
 * Resolve a formula such as "100- age at entry" or "26 minus the child's age
 * at entry" against the customer's age.
 *
 * Returns [] when the expression cannot be understood, so the caller can fall
 * back to free text input instead of showing a wrong number.
 */
/**
 * Normalise the odd dashes and wordings that appear in the source catalogue
 * (U+2212 minus sign, en/em dashes, "minus", "N-entry age", "N-age of child").
 */
const normaliseFormula = (raw: string) =>
  String(raw)
    .toLowerCase()
    .replace(/[\u2212\u2013\u2014\u2012\uFF0D]/g, "-") // − – — ‒ ？
    .replace(/\bminus\b/g, "-")
    .replace(/\s+/g, " ")
    .trim();

/**
 * Resolve a formula such as "100- age at entry", "25-entry age",
 * "26 minus the child's age at entry" or "13 (age 17: 30 - 17)" against the
 * customer's age.
 *
 * Returns [] when the expression cannot be understood or the result is not a
 * positive term, so the caller can fall back to free text input rather than
 * showing a wrong number.
 */
export const resolveTermFormula = (
  formula: string | null | undefined,
  age: number | null | undefined
): number[] => {
  if (!formula || age === null || age === undefined || !Number.isFinite(age) || age <= 0) return [];
  const f = normaliseFormula(formula);

  // "13 (age 17: 30 - 17)"  ->  maturity age 30 minus entry age
  const paren = f.match(/\(\s*age\s*\d+\s*:\s*(\d+)\s*-\s*\d+\s*\)/);
  if (paren) {
    const value = Number(paren[1]) - age;
    return value > 0 ? [value] : [];
  }

  // "<base> - <anything without a digit> age"  covers
  //   "100 - age", "25 - entry age", "18 - age of child",
  //   "26 - the child's age at entry", "fixed exactly at 50 - age at entry"
  const m = f.match(/(\d+)\s*-\s*[^0-9]*?age/);
  if (m) {
    const value = Number(m[1]) - age;
    return value > 0 ? [value] : [];
  }

  return [];
};

/**
 * PPT resolution. Given the selected term, a formula like "term-3",
 * "term -5 or term- 10" or the plan-836 style
 * "for 16 term: 10 ppt, for 21 term: 15 ppt" is turned into a concrete list.
 */
export const resolvePptFormula = (
  formula: string | null | undefined,
  term: number | null | undefined
): number[] => {
  if (!formula) return [];
  const f = normaliseFormula(formula);

  // "for 16 term: 10 ppt, for 21 term: 15 ppt, for 25 term: 16 ppt"
  const mapped = [...f.matchAll(/(\d+)\s*term\s*:\s*(\d+)/g)];
  if (mapped.length) {
    const all = new Set<number>();
    for (const m of mapped) {
      const t = Number(m[1]);
      const p = Number(m[2]);
      if (!term) { all.add(p); continue; }
      if (t === term) return [p];
    }
    return term ? [] : [...all].sort((a, b) => a - b);
  }

  // "term 5: ppt of 1, 2, or 3; t 10: ppt 1,2,3,4 or 6" (plan 112)
  const block = [...f.matchAll(/t(?:erm)?\s*(\d+)\s*:\s*ppt\s*(?:of\s*)?([\d,\s or]+)/g)];
  if (block.length && term) {
    for (const m of block) {
      if (Number(m[1]) !== term) continue;
      const ppts = [...m[2]!.matchAll(/\d+/g)].map(x => Number(x[0]));
      if (ppts.length) return Array.from(new Set(ppts)).sort((a, b) => a - b);
    }
  }
  if (block.length && !term) {
    const all = new Set<number>();
    for (const m of block) for (const p of m[2]!.matchAll(/\d+/g)) all.add(Number(p[0]));
    return [...all].sort((a, b) => a - b);
  }

  // "6 or term - 5" -> both options, PPT follows the term
  const orTerm = f.match(/^\s*(\d+)\s*or\s*term\s*-\s*(\d+)/);
  if (orTerm && term) {
    const a = Number(orTerm[1]);
    const b = term - Number(orTerm[2]);
    return Array.from(new Set([a, b].filter(x => x > 0))).sort((x, y) => x - y);
  }

  // "term-3", "term-4", "term-5"
  const tOff = f.match(/^\s*term\s*-\s*(\d+)/);
  if (tOff && term) {
    const v = term - Number(tOff[1]);
    return v > 0 ? [v] : [];
  }
  return [];
};

/** Is this age acceptable for the plan? Ages of 0 mean "not specified". */
export const isAgeEligibleForPlan = (
  age: number | null | undefined,
  meta: LegacyPlanMeta | null | undefined
): { ok: boolean; message?: string } => {
  if (!meta || age === null || age === undefined || Number.isNaN(age)) return { ok: true };
  const min = meta.minEntryAge ?? 0;
  const max = meta.maxEntryAge ?? 0;
  if (min <= 0 && max <= 0) return { ok: true };
  if (min > 0 && age < min)
    return { ok: false, message: `Minimum entry age for this plan is ${min} years.` };
  if (max > 0 && age > max)
    return { ok: false, message: `Maximum entry age for this plan is ${max} years.` };
  return { ok: true };
};

/** Is this commencement date inside the plan's validity window? */
export const isDateWithinPlanValidity = (
  dateStr: string | null | undefined,
  meta: LegacyPlanMeta | null | undefined
): { ok: boolean; message?: string; range?: string } => {
  if (!meta) return { ok: true };
  const { introDate, withdrawalDate } = meta;
  if (!introDate && !withdrawalDate) return { ok: true };
  const range = `Allowed: ${introDate || "any"} to ${withdrawalDate || "any"}`;
  if (!dateStr) return { ok: true, range };
  const d = dateStr.slice(0, 10);
  if (introDate && d < introDate)
    return { ok: false, range, message: `This plan was introduced on ${introDate}.` };
  if (withdrawalDate && d > withdrawalDate)
    return { ok: false, range, message: `This plan was withdrawn on ${withdrawalDate}.` };
  return { ok: true, range };
};

/**
 * Builds the legacy-plan lookup from Redux state.
 * Only LEGACY-* products are included, keyed by upper-cased plan number, so a
 * modern plan that reuses the same number keeps its own DB-driven behaviour.
 */
export const useLegacyPlanMetadata = () => {
  const products = useSelector((s: RootState) => s.products?.products ?? []);
  const attributeValues = useSelector(
    (s: RootState) => s.productAttributeValues?.values ?? []
  );

  return useMemo(() => {
    const byProduct = new Map<string, Map<string, string>>();
    for (const av of attributeValues) {
      if (!av?.productId || !av?.attribute?.attributeCode) continue;
      let m = byProduct.get(av.productId);
      if (!m) { m = new Map(); byProduct.set(av.productId, m); }
      m.set(av.attribute.attributeCode, String(av.value ?? ""));
    }

    const toNum = (v?: string | null) => {
      if (v === null || v === undefined || v === "") return 0;
      const n = Number(String(v).replace(/[^\d.-]/g, ""));
      return Number.isFinite(n) ? n : 0;
    };

    const map = new Map<string, LegacyPlanMeta>();
    for (const p of products) {
      if (!p?.productCode || !String(p.productCode).startsWith("LEGACY-")) continue;
      const planNumber = String(p.planNumber ?? "").trim();
      if (!planNumber) continue;
      const key = planNumber.toUpperCase();
      if (map.has(key)) continue;
      const attrs = byProduct.get(p.id) ?? new Map<string, string>();
      const g = (c: string) => attrs.get(c) ?? "";

      map.set(key, {
        planNumber,
        planName: String(p.productName ?? ""),
        minEntryAge: toNum(g("MIN_ENTRY_AGE")),
        maxEntryAge: toNum(g("MAX_ENTRY_AGE")),
        terms: parseNumberList(g("TERMS")),
        ppts: parseNumberList(g("PPTS")),
        termFormula: g("TERM_FORMULA"),
        pptFormula: g("PPT_FORMULA"),
        introDate: g("INTRO_DATE"),
        withdrawalDate: g("WITHDRAWAL_DATE"),
        minSumAssured: toNum(g("MIN_SUM_ASSURED")),
        defaultSumAssured: toNum(g("DEFAULT_SUM_ASSURED")) || toNum(g("MIN_SUM_ASSURED")),
        maxSumAssured: toNum(g("MAX_SUM_ASSURED")),
        allowedRiders: parseNumberList(g("ALLOWED_RIDERS")).length
          ? g("ALLOWED_RIDERS").split(",").map((s) => s.trim()).filter(Boolean)
          : (g("RIDERS_ALLOWED") || "").split(",").map((s) => s.trim()).filter(Boolean),
        pptNotes: g("PPT_NOTES"),
        notes: g("PLAN_NOTES"),
      });
    }

    return {
      planMap: map,
      getLegacyPlanByNumber: (n?: string | null) =>
        n ? map.get(String(n).trim().toUpperCase()) ?? null : null,
      /** Terms for the dropdown: concrete list, or a live value from the formula. */
      getTerms: (n?: string | null, age?: number | null) => {
        const m = n ? map.get(String(n).trim().toUpperCase()) : undefined;
        if (!m) return [] as number[];
        if (m.terms.length) return m.terms;
        const live = resolveTermFormula(m.termFormula, age);
        return live;
      },
      /** Ppts for the dropdown; falls back to [1] (single premium) when absent. */
      getPpts: (n?: string | null, term?: number | null) => {
        const m = n ? map.get(String(n).trim().toUpperCase()) : undefined;
        if (!m) return [] as number[];
        if (m.ppts.length) return m.ppts;
        const live = resolvePptFormula(m.pptFormula, term);
        if (live.length) return live;
        // No PPT data at all -> single premium (user decision).
        return [1];
      },
    };
  }, [products, attributeValues]);
};
