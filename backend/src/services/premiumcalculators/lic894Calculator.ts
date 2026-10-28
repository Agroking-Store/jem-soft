import { AppError } from "../../utils/AppError.js";

interface LIC894CalculatorInput {
  productId: string;
  premiumMode: string;
  age: number;
  policyTerm: number;
  premiumPayingTerm?: number | null;
  sumAssured: number;
  tabularPremium: number;
  rate: number;
}

/** Basic Sum Assured bands (LIC brochure sec.2): 50k steps up to 7L, 1L above. */
const SA_MIN = 500000;
const SA_MAX = 2400000;

/**
 * High Sum Assured rebate as a percentage of the tabular premium
 * (LIC brochure sec.8 / launch circular sec.10). Index 0 applies from
 * Rs 7 lakh, then 10 / 15 / 20 lakh; below 7 lakh there is no rebate.
 */
const SA_BANDS = [700000, 1000000, 1500000, 2000000];
const REBATE_REGULAR_LIMITED = {
  // age band 18 to 30 (last birthday)
  young: [0.05, 0.1, 0.15, 0.18],
  // age band 31 to 45 (last birthday)
  older: [0.03, 0.06, 0.1, 0.14],
} as const;
const REBATE_SINGLE = {
  young: [0.04, 0.09, 0.14, 0.17],
  older: [0.02, 0.05, 0.08, 0.11],
} as const;

export interface LIC894EligibilityInput {
  premiumMode: string;
  age: number;
  policyTerm: number;
  premiumPayingTerm?: number | null;
  sumAssured: number;
}

export interface LIC894Eligibility {
  isSingle: boolean;
  isHalfYearly: boolean;
  /** Premium paying term the plan actually uses for this quote. */
  ppt: number;
}

/**
 * LIC's eligibility rules for plan 894 (brochure sec.2 and sec.5).
 *
 * The calculation service runs this before it looks a rate up, so an
 * impossible quote is rejected with a reason instead of falling through to the
 * "manual premium" path that exists for a genuinely missing rate row.
 */
export function validateLIC894Eligibility(
  data: LIC894EligibilityInput,
): LIC894Eligibility {
  const mode = (data.premiumMode || "").trim().toUpperCase();
  const isYearly = ["Y", "YEARLY", "YLY"].includes(mode);
  const isHalfYearly = ["H", "HALF-YEARLY", "HLY", "HALFYEARLY"].includes(mode);
  const isSingle =
    data.premiumPayingTerm === 1 || ["SINGLE", "SIN", "O", "S"].includes(mode);

  if (!isSingle && !isYearly && !isHalfYearly) {
    throw new AppError(
      "LIC Plan 894 allows only Yearly or Half-Yearly premium mode",
      400,
    );
  }

  if (data.age < 18 || data.age > 45) {
    throw new AppError(
      "LIC Plan 894 entry age must be between 18 and 45 years",
      400,
    );
  }
  if (data.policyTerm < 15 || data.policyTerm > 42) {
    throw new AppError(
      "LIC Plan 894 policy term must be between 15 and 42 years",
      400,
    );
  }
  if (data.age + data.policyTerm > 60) {
    throw new AppError("LIC Plan 894 cover cannot extend beyond age 60", 400);
  }

  // Premium paying term: single pay (1), limited pay (10 or 15) or regular pay
  // equal to the policy term. Limited 15 needs a policy term of at least 20.
  const ppt = data.premiumPayingTerm ?? data.policyTerm;
  if (![1, 10, 15, data.policyTerm].includes(ppt)) {
    throw new AppError(
      `LIC Plan 894 premium paying term must be 1 (single), 10, 15 or the policy term (${data.policyTerm})`,
      400,
    );
  }
  if (ppt === 15 && data.policyTerm < 20) {
    throw new AppError(
      "LIC Plan 894 Limited Premium 15 requires a policy term of at least 20 years",
      400,
    );
  }

  const sa = data.sumAssured;
  if (sa < SA_MIN || sa > SA_MAX) {
    throw new AppError(
      "LIC Plan 894 basic sum assured must be between Rs 5,00,000 and Rs 24,00,000",
      400,
    );
  }
  const step = sa > 700000 ? 100000 : 50000;
  if (sa % step !== 0) {
    throw new AppError(
      sa > 700000
        ? "LIC Plan 894 sum assured above Rs 7,00,000 must be in multiples of Rs 1,00,000"
        : "LIC Plan 894 sum assured must be in multiples of Rs 50,000",
      400,
    );
  }

  return { isSingle, isHalfYearly, ppt };
}

/**
 * LIC Plan 894 - Jeevan Raksha (UIN 512N368V01).
 *
 * Pure risk term plan sold from 07 Sep 2026. Pricing inputs are age at entry,
 * Basic Sum Assured, smoking status, gender, policy term and premium paying
 * term (brochure sec.5) - gender and smoking status are already baked into the
 * tabular rate row the caller looked up, so this calculator only has to apply
 * the high sum assured rebate and the modal conversion:
 *
 *   annual = tabular(rate x SA / 1000) x (1 - high sum assured rebate)
 *   yearly      installment = annual
 *   half-yearly installment = annual x (1 + 2% conversion rate) / 2
 *   single      installment = annual (one-time premium)
 *
 * GST of 18% is applied by the calculation service from the GST_RATE
 * attribute.
 */
export async function calculateLIC894(data: LIC894CalculatorInput) {
  const { isSingle, isHalfYearly } = validateLIC894Eligibility(data);
  const sa = data.sumAssured;

  // ---- high sum assured rebate ----
  const ageBand = data.age <= 30 ? "young" : "older";
  const rebateTable = isSingle ? REBATE_SINGLE : REBATE_REGULAR_LIMITED;
  const bands = rebateTable[ageBand];

  let rebatePct = 0;
  for (let i = SA_BANDS.length - 1; i >= 0; i--) {
    if (sa >= SA_BANDS[i]!) {
      rebatePct = bands[i]!;
      break;
    }
  }

  // tabularPremium is rate x SA / 1000, already computed by the caller.
  const saRebateRate = Number((data.rate * rebatePct).toFixed(4));
  const saRebateAmount = Number(
    (data.tabularPremium * rebatePct).toFixed(2),
  );
  const basicYearlyPremium = Number(
    (data.tabularPremium - saRebateAmount).toFixed(2),
  );

  // ---- modal premium (brochure sec.8 iii: 2% conversion rate / 2) ----
  // Whole rupees: LIC collects the installment rounded to the nearest rupee,
  // the half-yearly figure LIC publishes for this plan (annual x 1.02 / 2)
  // only lands on that value when rounded rather than truncated.
  const installmentOverride = Math.round(
    isHalfYearly ? (basicYearlyPremium * 1.02) / 2 : basicYearlyPremium,
  );

  return {
    saRebateRate,
    saRebateAmount,
    // The 2% half-yearly conversion is a loading, not a rebate; it is already
    // inside installmentOverride, so nothing to report as a mode rebate.
    modeRebateRate: 0,
    modeRebateAmount: 0,
    basicYearlyPremium,
    installmentOverride,
  };
}
