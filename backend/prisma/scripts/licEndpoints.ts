/**
 * Per-plan endpoint registry for the LIC rate crawler.
 *
 * LIC's CalcPremium endpoint is not one single service - each plan (or plan
 * family) is exposed behind its own URL. Anything listed here overrides the
 * default endpoint for that plan. Plans absent from this map fall back to
 * DEFAULT_URL, and the crawler reports them as "needs an endpoint" when the
 * default returns nothing.
 *
 * To add a plan:
 *   1. Open the premium calculator, select the plan, go to Network tab
 *   2. Copy as cURL
 *   3. Add an entry below with the url and any payload fields that differ
 *   4. Run:  fetchLICRates.ts --plans=<plan> --probe
 */

export interface EndpointCfg {
  url: string;
  /** Fields that differ from the standard payload (merged over the defaults). */
  payload?: Record<string, unknown>;
  /** Free-text note, helps whoever maintains this next. */
  note?: string;
}

export const DEFAULT_URL = "https://vmprobl.i-magic.in/api/Calc/CalcPremium";

export const LIC_ENDPOINTS: Record<string, EndpointCfg> = {
  // --- verified working on the default endpoint ---
  "833": { url: DEFAULT_URL, note: "Jeevan Lakshya - verified 2026-10-17" },
  "836": { url: DEFAULT_URL, note: "Jeevan Labh - verified 2026-10-17" },
  "102": { url: DEFAULT_URL, note: "Jeevan Kishore - verified 2026-10-17" },
  "184": { url: DEFAULT_URL, note: "Child Career Plan - verified 2026-10-17" },
  "915": { url: DEFAULT_URL, note: "LIC's New Jeevan Anand V02 - verified 2026-10-23" },
  "917": { url: DEFAULT_URL, note: "Single Premium Endowment - verified 2026-10-23" },
  "890": {
    url: DEFAULT_URL,
    note:
      "New Bima Jyoti - verified 2026-10-28. PPT = term-5; riders come from Lookup/Riders " +
      "(3=DAB, 9=ABR, 2=TRB, 10=CIR option 1, 11=CIR option 2); CIR is gender specific and " +
      "moves on the half-year age band.",
  },
  "866": {
    url: DEFAULT_URL,
    note:
      "Dhan Varsha - complete age x term x option grid verified 2026-10-30. " +
      "Single premium (PPT 1); term 10 ages 8-60, term 15 ages 3-60; " +
      "Option 2 only up to age 40 (T10) / 35 (T15).",
  },
  "874": {
    url: DEFAULT_URL,
    note:
      "Amritbaal V01 - complete age x term x PPT x SBOption grid verified 2026-10-29 " +
      "(commencement 2026-10-06).",
  },

  // --- returned 0 on the default endpoint, need their own URL ---
  "110": { url: "", note: "Asha Deep-I - default endpoint returns 0" },
  "112": { url: "", note: "Jeevan Shree - default endpoint returns 0" },
  "173": { url: "", note: "Jeevan Plus - default endpoint returns 0" },

  /**
   * TEMPLATE - copy, paste, fill in:
   *
   *   "836": { url: "https://<host>/api/Calc/CalcPremium", note: "..." },
   *
   * If the new endpoint needs different body fields, list them in `payload`:
   *
   *   "836": {
   *     url: "https://<host>/api/Calc/CalcPremium",
   *     payload: { ExtraClass: { ExtraClassType: "None" }, Options: "0" },
   *   },
   */
};

export function endpointFor(plan: string): { url: string; payload: Record<string, unknown>; custom: boolean } {
  const cfg = LIC_ENDPOINTS[plan];
  if (cfg?.url) {
    return { url: cfg.url, payload: cfg.payload ?? {}, custom: cfg.url !== DEFAULT_URL };
  }
  return { url: DEFAULT_URL, payload: {}, custom: false };
}

/** Plans that are known to exist but have no working endpoint yet. */
export function needsEndpoint(plans: string[]): string[] {
  return plans.filter((p) => !LIC_ENDPOINTS[p]?.url);
}
