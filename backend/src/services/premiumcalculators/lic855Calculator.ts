import { AppError } from "../../utils/AppError.js";

interface LIC855CalculatorInput {
  productId: string;
  premiumMode: string;
  age: number;
  policyTerm: number;
  premiumPayingTerm?: number | null;
  sumAssured: number;
  tabularPremium: number;
  rate: number;
  option?: number | null;
}

export interface LIC855EligibilityInput {
  premiumMode: string;
  age: number;
  policyTerm: number;
  premiumPayingTerm?: number | null;
  sumAssured: number;
  option?: number | null;
}

export interface LIC855Eligibility {
  isSingle: boolean;
  isHalfYearly: boolean;
  /** Premium paying term LIC uses for this quote. */
  ppt: number;
  /** Death Benefit Option: 1 = level, 2 = increasing. */
  option: 1 | 2;
}

const MIN_ENTRY_AGE = 18;
const MAX_ENTRY_AGE = 65;
const MIN_TERM = 10;
const MAX_TERM = 40;
const MAX_MATURITY_AGE = 80;

const MIN_SUM_ASSURED = 2500000;
const SA_STEP_BOUNDARY = 4000000;

const MIN_REGULAR_PREMIUM = 3000;
const MIN_SINGLE_PREMIUM = 30000;

const SA_REBATE_BAND_1 = 5000000; // Rs 50 lakh
const SA_REBATE_BAND_2 = 10000000; // Rs 1 crore

/**
 * High Sum Assured rebate as a percentage of the tabular premium
 * (Jeevan Amar brochure, "Rebates" section). Index 0 is below Rs 50 lakh,
 * index 1 is Rs 50 lakh to below Rs 1 crore, index 2 is Rs 1 crore and above.
 * Age bands are last-birthday: up to 30, 31 to 50, 51 and above.
 */
const SA_REBATE: Record<
  1 | 2,
  { young: [number, number, number]; middle: [number, number, number]; older: [number, number, number] }
> = {
  1: {
    young: [0, 0.12, 0.2],
    middle: [0, 0.1, 0.15],
    older: [0, 0.05, 0.07],
  },
  2: {
    young: [0, 0.1, 0.18],
    middle: [0, 0.08, 0.13],
    older: [0, 0.04, 0.06],
  },
};

function modeKey(premiumMode: string): "Y" | "H" | "S" | null {
  const mode = (premiumMode || "").trim().toUpperCase();
  if (["Y", "YEARLY", "YLY", "ANNUAL"].includes(mode)) return "Y";
  if (["H", "HALF-YEARLY", "HALFYEARLY", "HLY", "SEMI-ANNUAL"].includes(mode)) {
    return "H";
  }
  if (["SINGLE", "SIN", "O", "S"].includes(mode)) return "S";
  return null;
}

/**
 * LIC Plan 855 - Jeevan Amar (UIN 512N332V01).
 *
 * Non-par, non-linked, individual pure risk term plan. Entry age 18-65 last
 * birthday, maturity age at most 80, policy term 10-40. Premium paying terms:
 * single (1), regular (same as the term), or limited (term - 5 / term - 10,
 * with a minimum PPT of 5). Regular and limited premiums may be paid yearly or
 * half-yearly; single premium is paid once. The plan offers Death Benefit
 * Option I (level sum assured) and Option II (increasing sum assured).
 *
 * LIC's rate tables are separate for male/female and smoker/non-smoker, so the
 * caller looks up the exact row; this calculator applies the high sum assured
 * rebate and the modal loading:
 *
 *   tabular = rate x sum assured / 1000
 *   annual  = tabular - SA rebate + (half-yearly ? 2% of tabular : 0)
 *   yearly      instalment = annual
 *   half-yearly instalment = annual / 2, rounded to the nearest rupee
 *   single      instalment = annual
 *
 * GST (18%) is applied by the calculation service. LIC keeps paise on the
 * yearly/single premium, but rounds the half-yearly instalment and its GST to
 * whole rupees; the service supports both through the overrides below.
 */
export function validateLIC855Eligibility(
  data: LIC855EligibilityInput,
): LIC855Eligibility {
  const requestedMode = modeKey(data.premiumMode);
  const option = data.option;

  if (option !== 1 && option !== 2) {
    throw new AppError(
      "LIC Plan 855 requires a Death Benefit Option: 1 (level) or 2 (increasing)",
      400,
    );
  }

  if (
    !Number.isInteger(data.age) ||
    data.age < MIN_ENTRY_AGE ||
    data.age > MAX_ENTRY_AGE
  ) {
    throw new AppError(
      "LIC Plan 855 entry age must be between 18 and 65 years (last birthday)",
      400,
    );
  }

  if (
    !Number.isInteger(data.policyTerm) ||
    data.policyTerm < MIN_TERM ||
    data.policyTerm > MAX_TERM
  ) {
    throw new AppError(
      "LIC Plan 855 policy term must be between 10 and 40 years",
      400,
    );
  }

  if (data.age + data.policyTerm > MAX_MATURITY_AGE) {
    throw new AppError(
      "LIC Plan 855 cover cannot extend beyond age 80",
      400,
    );
  }

  const requestedPpt = data.premiumPayingTerm ?? null;
  const isSingle = requestedPpt === 1 || requestedMode === "S";
  if (requestedMode === "S" && requestedPpt != null && requestedPpt !== 1) {
    throw new AppError(
      "LIC Plan 855 single premium mode requires premium paying term 1",
      400,
    );
  }

  if (!isSingle && requestedMode !== "Y" && requestedMode !== "H") {
    throw new AppError(
      "LIC Plan 855 allows Yearly or Half-Yearly premium mode (or Single for PPT 1)",
      400,
    );
  }

  const ppt = isSingle ? 1 : (requestedPpt ?? data.policyTerm);
  const validPpts = new Set<number>([1, data.policyTerm]);
  if (data.policyTerm - 5 >= 5) validPpts.add(data.policyTerm - 5);
  if (data.policyTerm >= 15) validPpts.add(data.policyTerm - 10);

  if (!validPpts.has(ppt)) {
    throw new AppError(
      `LIC Plan 855 premium paying term must be one of ${[...validPpts]
        .sort((a, b) => a - b)
        .join(", ")} for a ${data.policyTerm}-year term`,
      400,
    );
  }

  const sa = data.sumAssured;
  if (!Number.isFinite(sa) || sa < MIN_SUM_ASSURED) {
    throw new AppError(
      "LIC Plan 855 basic sum assured must be at least Rs 25,00,000",
      400,
    );
  }
  const step = sa <= SA_STEP_BOUNDARY ? 100000 : 1000000;
  if (sa % step !== 0) {
    throw new AppError(
      sa <= SA_STEP_BOUNDARY
        ? "LIC Plan 855 sum assured up to Rs 40,00,000 must be in multiples of Rs 1,00,000"
        : "LIC Plan 855 sum assured above Rs 40,00,000 must be in multiples of Rs 10,00,000",
      400,
    );
  }

  return {
    isSingle,
    isHalfYearly: !isSingle && requestedMode === "H",
    ppt,
    option,
  };
}

/** LIC rounds half-yearly instalments with the midpoint going down. */
function roundHalfDown(value: number): number {
  return Math.ceil(value - 0.5);
}

export async function calculateLIC855(data: LIC855CalculatorInput) {
  const { isSingle, isHalfYearly, option } = validateLIC855Eligibility(data);
  const sa = data.sumAssured;

  const ageBand =
    data.age <= 30 ? "young" : data.age <= 50 ? "middle" : "older";
  const saBand =
    sa < SA_REBATE_BAND_1 ? 0 : sa < SA_REBATE_BAND_2 ? 1 : 2;
  const rebatePct = SA_REBATE[option][ageBand][saBand]!;

  // tabularPremium is rate x SA / 1000, already computed by the caller.
  const saRebateRate = Number((data.rate * rebatePct).toFixed(4));
  const saRebateAmount = Number((data.tabularPremium * rebatePct).toFixed(2));

  // The 2% half-yearly loading is a percentage of the tabular annual premium,
  // not of the premium after the sum-assured rebate.
  const modeLoading = isHalfYearly
    ? Number((data.tabularPremium * 0.02).toFixed(2))
    : 0;

  const basicYearlyPremium = Number(
    (data.tabularPremium - saRebateAmount + modeLoading).toFixed(2),
  );

  // LIC's published minimum-premium rule is a sales eligibility check, not a
  // rating input. Keep computing the premium for any sum assured so the form
  // can autofill; the policy-creation layer can enforce the minimum separately.
  void (isSingle ? MIN_SINGLE_PREMIUM : MIN_REGULAR_PREMIUM);

  const installmentOverride = isSingle
    ? basicYearlyPremium
    : isHalfYearly
      ? roundHalfDown(basicYearlyPremium / 2)
      : basicYearlyPremium;

  // LIC's half-yearly quote keeps the instalment and GST in whole rupees;
  // yearly and single premiums keep paise. The service uses PAISE for the
  // latter and this explicit override for the former.
  const gstAmountOverride = isHalfYearly
    ? Math.round(installmentOverride * 0.18)
    : undefined;

  return {
    saRebateRate,
    saRebateAmount,
    // The half-yearly loading is reported as a negative mode rebate, matching
    // LIC's rebate payload (rebateType 1 = -2% of the tabular rate).
    modeRebateRate: isHalfYearly
      ? -Number((data.rate * 0.02).toFixed(4))
      : 0,
    modeRebateAmount: isHalfYearly
      ? -Number((data.tabularPremium * 0.02).toFixed(2))
      : 0,
    basicYearlyPremium,
    installmentOverride,
    gstRounding: isHalfYearly ? ("WHOLE" as const) : ("PAISE" as const),
    gstAmountOverride,
  };
}
