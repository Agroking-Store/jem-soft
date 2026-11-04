import { AppError } from "../../utils/AppError.js";
import rebateService from "../rebateService.js";

type PlanNumber = "847" | "848";

interface LIC847848Input {
  planNumber: PlanNumber;
  productId: string;
  premiumMode: string;
  age: number;
  policyTerm: number;
  premiumPayingTerm?: number | null;
  sumAssured: number;
  tabularPremium: number;
  rate: number;
}

const TERMS = [14, 16, 18, 20] as const;

/**
 * Eligibility rules from the LIC sales brochures:
 *   - Jeevan Shiromani (847), sec.4: min basic SA Rs 1 crore, multiples of
 *     Rs 5 lakh, no maximum, entry age 18; max 55/51/48/45 for terms
 *     14/16/18/20.
 *   - Bima Shree (848), sec.4: min basic SA Rs 10 lakh, multiples of Rs 1
 *     lakh, no maximum, entry age 8; the same term-dependent maximums.
 *   - Both: policy term 14/16/18/20 and PPT = term - 4.
 */
const RULES = {
  "847": {
    name: "Jeevan Shiromani",
    minEntryAge: 18,
    minSumAssured: 10000000,
    sumAssuredStep: 500000,
  },
  "848": {
    name: "Bima Shree",
    minEntryAge: 8,
    minSumAssured: 1000000,
    sumAssuredStep: 100000,
  },
} as const;

const MAX_ENTRY_AGE_BY_TERM: Record<number, number> = {
  14: 55,
  16: 51,
  18: 48,
  20: 45,
};

function modeInfo(premiumMode: string) {
  const mode = (premiumMode || "").trim().toUpperCase();
  if (["Y", "YEARLY", "YLY", "ANNUAL"].includes(mode)) {
    return { divisor: 1, rebatePct: 0.02 };
  }
  if (
    ["H", "HALF-YEARLY", "HALFYEARLY", "HLY", "SEMI-ANNUAL"].includes(mode)
  ) {
    return { divisor: 2, rebatePct: 0.01 };
  }
  if (["Q", "QUARTERLY", "QLY"].includes(mode)) {
    return { divisor: 4, rebatePct: 0 };
  }
  if (["M", "MONTHLY", "MLY"].includes(mode)) {
    return { divisor: 12, rebatePct: 0 };
  }
  return null;
}

export interface LIC847848EligibilityInput {
  premiumMode: string;
  age: number;
  policyTerm: number;
  premiumPayingTerm?: number | null;
  sumAssured: number;
}

export function validateLIC847848Eligibility(
  planNumber: PlanNumber,
  data: LIC847848EligibilityInput,
) {
  const rule = RULES[planNumber];
  const mode = modeInfo(data.premiumMode);
  if (!mode) {
    throw new AppError(
      `LIC Plan ${planNumber} (${rule.name}) allows Yearly, Half-Yearly, ` +
        `Quarterly or Monthly premium mode`,
      400,
    );
  }

  if (
    !Number.isInteger(data.age) ||
    data.age < rule.minEntryAge ||
    data.age > 55
  ) {
    throw new AppError(
      `LIC Plan ${planNumber} (${rule.name}) entry age must be between ` +
        `${rule.minEntryAge} and 55 years`,
      400,
    );
  }

  if (
    !Number.isInteger(data.policyTerm) ||
    !(TERMS as readonly number[]).includes(data.policyTerm)
  ) {
    throw new AppError(
      `LIC Plan ${planNumber} (${rule.name}) policy term must be one of ` +
        `14, 16, 18 or 20 years`,
      400,
    );
  }

  const maxAge = MAX_ENTRY_AGE_BY_TERM[data.policyTerm]!;
  if (data.age > maxAge) {
    throw new AppError(
      `LIC Plan ${planNumber} (${rule.name}) maximum entry age for a ` +
        `${data.policyTerm}-year term is ${maxAge} years`,
      400,
    );
  }

  const ppt = data.policyTerm - 4;
  if (
    data.premiumPayingTerm != null &&
    Number(data.premiumPayingTerm) !== ppt
  ) {
    throw new AppError(
      `LIC Plan ${planNumber} (${rule.name}) premium paying term must be ` +
        `${ppt} years (policy term minus 4)`,
      400,
    );
  }

  const sa = data.sumAssured;
  if (!Number.isFinite(sa) || sa < rule.minSumAssured) {
    throw new AppError(
      `LIC Plan ${planNumber} (${rule.name}) basic sum assured must be at ` +
        `least Rs ${rule.minSumAssured.toLocaleString("en-IN")}`,
      400,
    );
  }
  if (sa % rule.sumAssuredStep !== 0) {
    throw new AppError(
      `LIC Plan ${planNumber} (${rule.name}) basic sum assured must be in ` +
        `multiples of Rs ${rule.sumAssuredStep.toLocaleString("en-IN")}`,
      400,
    );
  }

  return { ppt, mode };
}

/**
 * Plans 847 (Jeevan Shiromani) and 848 (Bima Shree).
 *
 *   tabular  = rate x sum assured / 1000
 *   basic    = tabular - high-SA rebate - mode rebate
 *   mode     = 2% yearly, 1% half-yearly, nil quarterly/monthly
 *   instalment = basic / 1, 2, 4 or 12, collected in whole rupees
 *   GST      = 4.5% first year
 *
 * The high sum assured rebate is stored in ProductSumAssuredRebate and read
 * through rebateService, so the slabs stay data-driven instead of being
 * duplicated in code.
 */
export async function calculateLIC847848(data: LIC847848Input) {
  const { mode } = validateLIC847848Eligibility(data.planNumber, data);

  const saRebate = await rebateService.calculateSumAssuredRebate(
    data.productId,
    data.sumAssured,
    data.tabularPremium,
  );

  const modeRebateRate = Number((data.rate * mode.rebatePct).toFixed(4));
  const modeRebateAmount = Number(
    ((data.sumAssured / 1000) * modeRebateRate).toFixed(2),
  );

  const basicYearlyPremium = Number(
    (saRebate.basicPremium - modeRebateAmount).toFixed(2),
  );

  // LIC keeps paise on the yearly premium but rounds the half-yearly,
  // quarterly and monthly instalments to whole rupees before adding GST.
  const installmentOverride =
    mode.divisor === 1
      ? Math.round(basicYearlyPremium)
      : Math.round(basicYearlyPremium / mode.divisor);

  return {
    saRebateRate: saRebate.rebateRate,
    saRebateAmount: saRebate.rebateAmount,
    modeRebateRate,
    modeRebateAmount,
    basicYearlyPremium,
    installmentOverride,
    gstRounding: (mode.divisor === 1 ? "PAISE" : "WHOLE") as
      | "PAISE"
      | "WHOLE",
  };
}
