import { AppError } from "../../utils/AppError.js";

interface LIC853CalculatorInput {
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

export interface LIC853EligibilityInput {
  premiumMode: string;
  age: number;
  policyTerm: number;
  premiumPayingTerm?: number | null;
  sumAssured: number;
  option?: number | null;
}

export interface LIC853Eligibility {
  isSingle: boolean;
  isHalfYearly: boolean;
  ppt: number;
}

const MIN_ENTRY_AGE = 0;
const MAX_ENTRY_AGE = 65;
const MIN_TERM = 10;
const MAX_TERM = 18;
const MAX_MATURITY_AGE = 80;

const MIN_SUM_ASSURED = 100000;

// High basic sum assured rebate (limited premium) per 1000
// SA 1L-1.8L: 0, 2L-4.8L: 5, 5L-9.75L: 7, 10L+: 9
function getModeRebatePer1000(sa: number): number {
  if (sa >= 1000000) return 9;
  if (sa >= 500000) return 7;
  if (sa >= 200000) return 5;
  return 0;
}

function modeKey(premiumMode: string): "Y" | "H" | "Q" | "M" | "S" | null {
  const mode = (premiumMode || "").trim().toUpperCase();
  if (["Y", "YEARLY", "YLY", "ANNUAL"].includes(mode)) return "Y";
  if (["H", "HALF-YEARLY", "HALFYEARLY", "HLY", "SEMI-ANNUAL"].includes(mode)) return "H";
  if (["Q", "QUARTERLY", "QRY"].includes(mode)) return "Q";
  if (["M", "MONTHLY", "MTH", "SSS", "NACH"].includes(mode)) return "M";
  if (["SINGLE", "SIN", "O", "S"].includes(mode)) return "S";
  return null;
}

export function validateLIC853Eligibility(data: LIC853EligibilityInput): LIC853Eligibility {
  const requestedMode = modeKey(data.premiumMode);

  if (!Number.isInteger(data.age) || data.age < MIN_ENTRY_AGE || data.age > MAX_ENTRY_AGE) {
    throw new AppError("LIC Plan 853 entry age must be between 0 and 65 years", 400);
  }

  if (!Number.isInteger(data.policyTerm) || data.policyTerm < MIN_TERM || data.policyTerm > MAX_TERM) {
    throw new AppError("LIC Plan 853 policy term must be between 10 and 18 years", 400);
  }

  if (data.age + data.policyTerm > MAX_MATURITY_AGE) {
    throw new AppError("LIC Plan 853 cover cannot extend beyond age 80", 400);
  }

  const requestedPpt = data.premiumPayingTerm ?? null;
  const isSingle = requestedPpt === 1 || requestedMode === "S";

  if (isSingle) {
    if (requestedMode !== "S" && requestedMode !== null) {
      throw new AppError("LIC Plan 853 single premium mode requires Single mode", 400);
    }
  } else {
    if (requestedMode !== "Y" && requestedMode !== "H" && requestedMode !== "Q" && requestedMode !== "M") {
      throw new AppError("LIC Plan 853 allows Yearly/Half-Yearly/Quarterly/Monthly (or Single for PPT 1)", 400);
    }
  }

  const ppt = isSingle ? 1 : (requestedPpt ?? 5);

  const sa = data.sumAssured;
  if (!Number.isFinite(sa) || sa < MIN_SUM_ASSURED) {
    throw new AppError("LIC Plan 853 basic sum assured must be at least Rs 1,00,000", 400);
  }

  return {
    isSingle,
    isHalfYearly: !isSingle && requestedMode === "H",
    ppt,
  };
}

export async function calculateLIC853(data: LIC853CalculatorInput) {
  const { isSingle, isHalfYearly } = validateLIC853Eligibility(data);
  const sa = data.sumAssured;

  const modeRebatePer1000 = getModeRebatePer1000(sa);
  const modeRebateRate = modeRebatePer1000 / 1000;
  const modeRebateAmount = Number((modeRebatePer1000 * sa / 1000).toFixed(2));

  // Modal loading for non-yearly modes
  const mode = modeKey(data.premiumMode);
  let modalLoading = 0;
  if (mode === "H") modalLoading = 0.02;
  else if (mode === "Q") modalLoading = 0.03;
  else if (mode === "M") modalLoading = 0.035;

  const basicAfterRebate = Number((data.tabularPremium - modeRebateAmount).toFixed(2));
  const modalLoadingAmount = Number((basicAfterRebate * modalLoading).toFixed(2));
  const basicYearlyPremium = Number((basicAfterRebate + modalLoadingAmount).toFixed(2));

  const installmentOverride = Math.round(basicYearlyPremium);

  return {
    saRebateRate: 0,
    saRebateAmount: modeRebateAmount,
    modeRebateRate: -modeRebateRate,
    modeRebateAmount: -modeRebateAmount,
    basicYearlyPremium,
    installmentOverride,
    gstRounding: "WHOLE" as const,
  };
}
