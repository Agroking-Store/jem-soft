import { AppError } from "../../utils/AppError.js";
import rebateService from "../rebateService.js";

interface LIC845Input {
  productId: string;
  premiumMode: string;
  age: number;
  policyTerm: number;
  premiumPayingTerm?: number | null;
  sumAssured: number;
  tabularPremium: number;
  rate: number;
}

function modeInfo(premiumMode: string) {
  const mode = (premiumMode || "").trim().toUpperCase();
  if (["Y", "YEARLY", "YLY", "ANNUAL"].includes(mode)) return { divisor: 1, rebatePct: 0 };
  if (["H", "HALF-YEARLY", "HALFYEARLY", "HLY", "SEMI-ANNUAL"].includes(mode)) return { divisor: 2, rebatePct: 0 };
  if (["Q", "QUARTERLY", "QLY"].includes(mode)) return { divisor: 4, rebatePct: 0 };
  if (["M", "MONTHLY", "MLY"].includes(mode)) return { divisor: 12, rebatePct: 0 };
  return null;
}

// Mode rebate per Rs 1,000 by sum assured (from i-Magic data).
function modeRebatePer1000(sumAssured: number): number {
  if (sumAssured >= 2500000) return 2;
  if (sumAssured >= 1000000) return 1.75;
  if (sumAssured >= 500000) return 1.25;
  return 0;
}

export interface LIC845EligibilityInput {
  premiumMode: string;
  age: number;
  policyTerm: number;
  premiumPayingTerm?: number | null;
  sumAssured: number;
}

export function validateLIC845Eligibility(data: LIC845EligibilityInput) {
  const mode = modeInfo(data.premiumMode);
  if (!mode) {
    throw new AppError("LIC Plan 845 (Jeevan Umang) allows Yearly, Half-Yearly, Quarterly or Monthly premium mode", 400);
  }
  const age = data.age;
  if (!Number.isInteger(age) || age < 0 || age > 55) {
    throw new AppError("LIC Plan 845 (Jeevan Umang) entry age must be between 0 and 55 years", 400);
  }
  const expectedTerm = 100 - age;
  if (data.policyTerm !== expectedTerm) {
    throw new AppError(`LIC Plan 845 (Jeevan Umang) policy term must be ${expectedTerm} years (100 - age)`, 400);
  }
  const ppt = Number(data.premiumPayingTerm);
  if (![15, 20, 25, 30].includes(ppt)) {
    throw new AppError("LIC Plan 845 (Jeevan Umang) premium paying term must be 15, 20, 25 or 30 years", 400);
  }
  const sa = data.sumAssured;
  if (!Number.isFinite(sa) || sa < 200000) {
    throw new AppError("LIC Plan 845 (Jeevan Umang) basic sum assured must be at least Rs 2,00,000", 400);
  }
  return { ppt, mode };
}

export async function calculateLIC845(data: LIC845Input) {
  const { mode } = validateLIC845Eligibility(data);
  const saRebate = await rebateService.calculateSumAssuredRebate(data.productId, data.sumAssured, data.tabularPremium);

  const modeRebateRatePer1000 = modeRebatePer1000(data.sumAssured);
  const modeRebateAmt = Number((modeRebateRatePer1000 * data.sumAssured / 1000).toFixed(2));

  const basicYearlyPremium = Number((saRebate.basicPremium - modeRebateAmt).toFixed(2));

  const installmentOverride =
    mode.divisor === 1
      ? Math.round(basicYearlyPremium)
      : Math.round(basicYearlyPremium / mode.divisor);

  const gstRounding = mode.divisor === 1 ? "PAISE" : "WHOLE";

  return {
    saRebateRate: saRebate.rebateRate,
    saRebateAmount: saRebate.rebateAmount,
    modeRebateRate: modeRebateRatePer1000 / 1000,
    modeRebateAmount: modeRebateAmt,
    basicYearlyPremium,
    installmentOverride,
    gstRounding: gstRounding as "PAISE" | "WHOLE",
    gstAmountOverride: mode.divisor === 1 ? Math.round(installmentOverride * 4.5) / 100 : undefined,
  };
}
