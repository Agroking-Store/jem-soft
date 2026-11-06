import { AppError } from "../../utils/AppError.js";

interface LIC842Input {
  productId: string;
  premiumMode: string;
  age: number;
  policyTerm: number;
  premiumPayingTerm?: number | null;
  sumAssured: number;
  tabularPremium: number;
  rate: number;
}

const MIN_ENTRY_AGE = 60;
const MAX_ENTRY_AGE = 99;
const POLICY_TERM = 10;
const MIN_PURCHASE_PRICE = 150000;

export function validateLIC842Eligibility(data: {
  premiumMode: string;
  age: number;
  policyTerm: number;
  premiumPayingTerm?: number | null;
  sumAssured: number;
}) {
  const m = String(data.premiumMode || "").trim().toUpperCase();
  const isSingle =
    m === "SINGLE" || m === "SIN" || m === "O" || m === "S" || m === "1" ||
    m === "YEARLY" || m === "Y" || m === "YLY" || m === "ANNUAL";

  if (!isSingle) {
    throw new AppError("LIC Plan 842 (PMVVY) is a single premium plan; only Single premium mode is allowed", 400);
  }
  if (!Number.isInteger(data.age) || data.age < MIN_ENTRY_AGE || data.age > MAX_ENTRY_AGE) {
    throw new AppError(`LIC Plan 842 entry age must be between ${MIN_ENTRY_AGE} and ${MAX_ENTRY_AGE} years`, 400);
  }
  if (data.policyTerm !== POLICY_TERM) {
    throw new AppError("LIC Plan 842 policy term must be 10 years", 400);
  }
  if (data.premiumPayingTerm != null && data.premiumPayingTerm !== 1) {
    throw new AppError("LIC Plan 842 is a single premium plan; premium paying term must be 1", 400);
  }
  const sa = data.sumAssured;
  if (!Number.isFinite(sa) || sa < MIN_PURCHASE_PRICE) {
    throw new AppError(`LIC Plan 842 minimum purchase price is Rs ${MIN_PURCHASE_PRICE.toLocaleString("en-IN")}`, 400);
  }
  return { isSingle: true, minPurchasePrice: MIN_PURCHASE_PRICE };
}

export async function calculateLIC842(data: LIC842Input) {
  validateLIC842Eligibility(data);
  const purchasePrice = data.sumAssured;
  return {
    saRebateRate: 0,
    saRebateAmount: 0,
    modeRebateRate: 0,
    modeRebateAmount: 0,
    basicYearlyPremium: purchasePrice,
    installmentOverride: purchasePrice,
    tabularPremiumOverride: purchasePrice,
    gstRounding: "WHOLE" as const,
  };
}
