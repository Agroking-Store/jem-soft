import { AppError } from "../errors/AppError.js";

interface LIC850CalculatorInput {
  productId: string;
  premiumMode: string;
  age: number;
  policyTerm: number;
  premiumPayingTerm?: number | null;
  sumAssured: number;
  tabularPremium?: number;
  rate?: number;
}

const MIN_ENTRY_AGE = 30;
const MAX_ENTRY_AGE = 100;
const POLICY_TERM = 1;
const MIN_PURCHASE_PRICE = 150000;

export function validateLIC850Eligibility(data: {
  premiumMode: string;
  age: number;
  policyTerm: number;
  premiumPayingTerm?: number | null;
  sumAssured: number;
}) {
  const m = String(data.premiumMode || "").trim().toUpperCase();
  const isSingle =
    m === "SINGLE" ||
    m === "SIN" ||
    m === "O" ||
    m === "S" ||
    m === "1";

  if (!isSingle) {
    throw new AppError(
      "LIC Plan 850 (Jeevan Shanti) is an annuity plan; only Single premium mode is allowed",
      400,
    );
  }

  if (
    !Number.isInteger(data.age) ||
    data.age < MIN_ENTRY_AGE ||
    data.age > MAX_ENTRY_AGE
  ) {
    throw new AppError(
      "LIC Plan 850 entry age must be between 30 and 100 years",
      400,
    );
  }

  if (data.policyTerm !== POLICY_TERM) {
    throw new AppError("LIC Plan 850 policy term must be 1 year", 400);
  }

  if (data.premiumPayingTerm != null && data.premiumPayingTerm !== 1) {
    throw new AppError(
      "LIC Plan 850 is a single premium plan; premium paying term must be 1",
      400,
    );
  }

  const sa = data.sumAssured;
  if (!Number.isFinite(sa) || sa < MIN_PURCHASE_PRICE) {
    throw new AppError(
      `LIC Plan 850 minimum purchase price is Rs ${MIN_PURCHASE_PRICE.toLocaleString("en-IN")}`,
      400,
    );
  }

  return { isSingle: true, minPurchasePrice: MIN_PURCHASE_PRICE };
}

export async function calculateLIC850(data: LIC850CalculatorInput) {
  validateLIC850Eligibility(data);

  // For Jeevan Shanti (Plan 850), purchase price is the sum assured.
  // Basic premium equals the purchase price.
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
