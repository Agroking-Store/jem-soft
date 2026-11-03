import { AppError } from "../../utils/AppError.js";

interface LIC849CalculatorInput {
  productId: string;
  premiumMode: string;
  age: number;
  policyTerm: number;
  premiumPayingTerm?: number | null;
  sumAssured: number;
  tabularPremium?: number;
  rate?: number;
  option?: number | string | null;
}

const MIN_ENTRY_AGE = 0;
const MAX_ENTRY_AGE = 70;
const MIN_TERM = 10;
const MAX_TERM = 25;
const MIN_PREMIUM = 100000;

export function validateLIC849Eligibility(data: {
  premiumMode: string;
  age: number;
  policyTerm: number;
  premiumPayingTerm?: number | null;
  sumAssured: number;
  option?: number | string | null;
}) {
  const m = String(data.premiumMode || "").trim().toUpperCase();
  const isSingle =
    m === "SINGLE" ||
    m === "SIN" ||
    m === "O" ||
    m === "S" ||
    m === "1" ||
    m === "YEARLY" ||
    m === "Y" ||
    m === "YLY" ||
    m === "ANNUAL";

  if (!isSingle) {
    throw new AppError(
      "LIC Plan 849 (Nivesh Plus) is a single premium plan; only Single premium mode is allowed",
      400,
    );
  }

  if (
    !Number.isInteger(data.age) ||
    data.age < MIN_ENTRY_AGE ||
    data.age > MAX_ENTRY_AGE
  ) {
    throw new AppError(
      "LIC Plan 849 entry age must be between 90 days (0) and 70 years",
      400,
    );
  }

  const opt = String(data.option ?? "1").trim();
  if (opt === "2" && data.age > 35) {
    throw new AppError(
      "LIC Plan 849 Option 2 maximum entry age is 35 years",
      400,
    );
  }

  if (data.policyTerm < MIN_TERM || data.policyTerm > MAX_TERM) {
    throw new AppError(
      `LIC Plan 849 policy term must be between ${MIN_TERM} and ${MAX_TERM} years`,
      400,
    );
  }

  if (data.premiumPayingTerm != null && data.premiumPayingTerm !== 1) {
    throw new AppError(
      "LIC Plan 849 is a single premium plan; premium paying term must be 1",
      400,
    );
  }

  return { isSingle: true };
}

export async function calculateLIC849(data: LIC849CalculatorInput) {
  validateLIC849Eligibility(data);

  const opt = String(data.option ?? "1").trim();
  const sa = data.sumAssured;

  // In Nivesh Plus (Plan 849):
  // Option 1: Sum Assured = 1.25 x Single Premium -> Single Premium = SA / 1.25
  // Option 2: Sum Assured = 10 x Single Premium -> Single Premium = SA / 10
  // If user entered single premium directly as sumAssured (< 125000), minimum is 100000.
  let singlePremium: number;
  if (opt === "2") {
    singlePremium = Math.round(sa / 10);
  } else {
    if (sa < 125000) {
      singlePremium = sa;
    } else {
      singlePremium = Math.round(sa / 1.25);
    }
  }

  if (singlePremium < MIN_PREMIUM) {
    singlePremium = MIN_PREMIUM;
  }

  return {
    saRebateRate: 0,
    saRebateAmount: 0,
    modeRebateRate: 0,
    modeRebateAmount: 0,
    basicYearlyPremium: singlePremium,
    installmentOverride: singlePremium,
    tabularPremiumOverride: singlePremium,
    gstRounding: "WHOLE" as const,
    gstAmountOverride: 0,
  };
}
