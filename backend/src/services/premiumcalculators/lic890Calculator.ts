import { AppError } from "../../utils/AppError.js";

interface LIC890CalculatorInput {
  productId: string;
  premiumMode: string;
  age: number;
  policyTerm: number;
  premiumPayingTerm?: number | null;
  sumAssured: number;
  tabularPremium: number;
  rate: number;
}

/** Basic Sum Assured: Rs 1,25,000 minimum, no maximum (brochure sec.2 h/i). */
const SA_MIN = 125000;
/** Multiples: 5,000 up to 2,75,000, then 25,000 (brochure sec.2 j). */
const SA_LOW_STEP = 5000;
const SA_HIGH_STEP = 25000;
const SA_STEP_BOUNDARY = 275000;

const MIN_ENTRY_AGE = 0;
const MAX_ENTRY_AGE = 60;
const MIN_TERM = 15;
const MAX_TERM = 20;
const MIN_MATURITY_AGE = 18;
const MAX_MATURITY_AGE = 75;

/**
 * LIC's premium conversion factors (brochure sec.9). The factor is applied to
 * the yearly premium and the result is collected in whole rupees, so the
 * half-yearly instalment of an annual 1,05,87.50 is 5,389 (not 5,389.04).
 */
const MODE_FACTORS: Record<string, number> = {
  YLY: 1,
  HLY: 0.509,
  QLY: 0.2568,
  MLY: 0.0861,
};

export interface LIC890EligibilityInput {
  premiumMode: string;
  age: number;
  policyTerm: number;
  premiumPayingTerm?: number | null;
  sumAssured: number;
}

export interface LIC890Eligibility {
  /** Premium paying term LIC uses for this quote: policy term minus 5. */
  ppt: number;
  /** Premium conversion factor for the requested mode. */
  modeFactor: number;
}

function modeKey(premiumMode: string): string | null {
  const mode = (premiumMode || "").trim().toUpperCase();
  if (["Y", "YEARLY", "YLY"].includes(mode)) return "YLY";
  if (["H", "HALF-YEARLY", "HALFYEARLY", "HLY"].includes(mode)) return "HLY";
  if (["Q", "QUARTERLY", "QLY"].includes(mode)) return "QLY";
  if (["M", "MONTHLY", "MLY"].includes(mode)) return "MLY";
  return null;
}

/**
 * LIC's eligibility rules for plan 890 (brochure sec.2).
 *
 * Runs before the rate lookup, so an impossible quote is rejected with the rule
 * it broke instead of falling through to the "manual premium" path that exists
 * for a genuinely missing rate row.
 */
export function validateLIC890Eligibility(
  data: LIC890EligibilityInput,
): LIC890Eligibility {
  const mode = modeKey(data.premiumMode);
  if (!mode) {
    throw new AppError(
      "LIC Plan 890 allows Yearly, Half-Yearly, Quarterly or Monthly premium mode",
      400,
    );
  }

  if (!Number.isInteger(data.age) || data.age < MIN_ENTRY_AGE || data.age > MAX_ENTRY_AGE) {
    throw new AppError(
      "LIC Plan 890 entry age must be between 0 and 60 years",
      400,
    );
  }
  if (
    !Number.isInteger(data.policyTerm) ||
    data.policyTerm < MIN_TERM ||
    data.policyTerm > MAX_TERM
  ) {
    throw new AppError("LIC Plan 890 policy term must be between 15 and 20 years", 400);
  }

  const maturityAge = data.age + data.policyTerm;
  if (maturityAge < MIN_MATURITY_AGE) {
    throw new AppError("LIC Plan 890 maturity age cannot be below 18 years", 400);
  }
  if (maturityAge > MAX_MATURITY_AGE) {
    throw new AppError("LIC Plan 890 maturity age cannot exceed 75 years", 400);
  }

  // Premium paying term is fixed by the product: term minus 5 (brochure sec.2 g).
  const ppt = data.policyTerm - 5;
  if (
    data.premiumPayingTerm != null &&
    Number(data.premiumPayingTerm) !== ppt
  ) {
    throw new AppError(
      `LIC Plan 890 premium paying term must be ${ppt} years (policy term minus 5)`,
      400,
    );
  }

  const sa = data.sumAssured;
  if (!Number.isFinite(sa) || sa < SA_MIN) {
    throw new AppError(
      "LIC Plan 890 basic sum assured must be at least Rs 1,25,000",
      400,
    );
  }
  const step = sa > SA_STEP_BOUNDARY ? SA_HIGH_STEP : SA_LOW_STEP;
  if (sa % step !== 0) {
    throw new AppError(
      sa > SA_STEP_BOUNDARY
        ? "LIC Plan 890 sum assured above Rs 2,75,000 must be in multiples of Rs 25,000"
        : "LIC Plan 890 sum assured must be in multiples of Rs 5,000",
      400,
    );
  }

  return { ppt, modeFactor: MODE_FACTORS[mode]! };
}

/**
 * LIC rounds the collected premium to whole rupees with the midpoint going
 * down: the engine prices 82.50 x 125 = 10,312.50 as 10,312, 84.70 x 125 =
 * 10,587.50 as 10,587, while 82.55 x 125 = 10,318.75 becomes 10,319.
 */
function roundHalfDown(value: number): number {
  return Math.ceil(value - 0.5);
}

/**
 * LIC Plan 890 - New Bima Jyoti (UIN 512N395V01).
 *
 * Non-par, non-linked, limited premium endowment. LIC prices it on entry age
 * and policy term only - the rate is the same for every sum assured, for both
 * genders and for smokers and non-smokers (verified against the engine across
 * ages 0-60 and all six terms). So this calculator applies no rebate:
 *
 *   annual      = rate x sum assured / 1000
 *   instalment  = round(annual x premium conversion factor)
 *
 * The high sum assured / online sale "incentives" in brochure sec.10 are
 * increases in the Guaranteed Addition rate, not premium rebates, so they must
 * not touch the premium.
 *
 * GST comes from the plan's GST_RATE attribute (0 - the brochure states GST is
 * currently exempt).
 */
export async function calculateLIC890(data: LIC890CalculatorInput) {
  const { modeFactor } = validateLIC890Eligibility(data);

  // Same arithmetic order as LIC's engine, so the midpoint rounding matches.
  const rawAnnual = (data.rate * data.sumAssured) / 1000;
  const basicYearlyPremium = Number(rawAnnual.toFixed(2));
  const installmentOverride = roundHalfDown(rawAnnual * modeFactor);

  return {
    saRebateRate: 0,
    saRebateAmount: 0,
    modeRebateRate: 0,
    modeRebateAmount: 0,
    basicYearlyPremium,
    installmentOverride,
  };
}
