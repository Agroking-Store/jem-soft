import { AppError } from "../../utils/AppError.js";
import rebateService from "../rebateService.js";

interface LIC843Input {
  productId: string;
  premiumMode: string;
  age: number;
  policyTerm: number;
  premiumPayingTerm?: number | null;
  sumAssured: number;
  tabularPremium: number;
  rate: number;
}

const TERMS = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20] as const;

const RULES = {
  name: "AADHAR Stambh",
  minEntryAge: 8,
  maxEntryAge: 55,
  minSumAssured: 75000,
  maxSumAssured: 300000,
  sumAssuredStep: 5000,
} as const;

function modeInfo(premiumMode: string) {
  const mode = (premiumMode || "").trim().toUpperCase();
  if (["Y", "YEARLY", "YLY", "ANNUAL"].includes(mode)) return { divisor: 1, rebatePct: 0 };
  if (["H", "HALF-YEARLY", "HALFYEARLY", "HLY", "SEMI-ANNUAL"].includes(mode)) return { divisor: 2, rebatePct: 0 };
  if (["Q", "QUARTERLY", "QLY"].includes(mode)) return { divisor: 4, rebatePct: 0 };
  if (["M", "MONTHLY", "MLY"].includes(mode)) return { divisor: 12, rebatePct: 0 };
  return null;
}

export interface LIC843EligibilityInput {
  premiumMode: string;
  age: number;
  policyTerm: number;
  premiumPayingTerm?: number | null;
  sumAssured: number;
}

export function validateLIC843Eligibility(data: LIC843EligibilityInput) {
  const rule = RULES;
  const mode = modeInfo(data.premiumMode);
  if (!mode) {
    throw new AppError(`LIC Plan 843 (${rule.name}) allows Yearly, Half-Yearly, Quarterly or Monthly premium mode`, 400);
  }
  if (!Number.isInteger(data.age) || data.age < rule.minEntryAge || data.age > rule.maxEntryAge) {
    throw new AppError(`LIC Plan 843 (${rule.name}) entry age must be between ${rule.minEntryAge} and ${rule.maxEntryAge} years`, 400);
  }
  if (!Number.isInteger(data.policyTerm) || !(TERMS as readonly number[]).includes(data.policyTerm)) {
    throw new AppError(`LIC Plan 843 (${rule.name}) policy term must be between 10 and 20 years`, 400);
  }
  const ppt = data.policyTerm;
  if (data.premiumPayingTerm != null && Number(data.premiumPayingTerm) !== ppt) {
    throw new AppError(`LIC Plan 843 (${rule.name}) premium paying term must be ${ppt} years (equal to policy term)`, 400);
  }
  const sa = data.sumAssured;
  if (!Number.isFinite(sa) || sa < rule.minSumAssured || sa > rule.maxSumAssured) {
    throw new AppError(`LIC Plan 843 (${rule.name}) basic sum assured must be Rs ${rule.minSumAssured.toLocaleString("en-IN")}`, 400);
  }
  return { ppt, mode };
}

export async function calculateLIC843(data: LIC843Input) {
  const { mode } = validateLIC843Eligibility(data);
  const saRebate = await rebateService.calculateSumAssuredRebate(data.productId, data.sumAssured, data.tabularPremium);

  // 843 mode rebate is 0 (SA is fixed at Rs 1 lakh, below the 5 lakh threshold).
  const modeRebateRate = 0;
  const modeRebateAmount = 0;

  const basicYearlyPremium = Number((saRebate.basicPremium - modeRebateAmount).toFixed(2));

  // 843 floors the basic premium to whole rupees before adding GST in every mode.
  const installmentOverride = Math.floor(basicYearlyPremium / mode.divisor);

  return {
    saRebateRate: saRebate.rebateRate,
    saRebateAmount: saRebate.rebateAmount,
    modeRebateRate,
    modeRebateAmount,
    basicYearlyPremium,
    installmentOverride,
    gstRounding: (mode.divisor === 1 ? "PAISE" : "WHOLE") as "PAISE" | "WHOLE",
    gstAmountOverride:
      mode.divisor === 1
        ? Math.round(installmentOverride * 4.5) / 100
        : undefined,
  };
}

