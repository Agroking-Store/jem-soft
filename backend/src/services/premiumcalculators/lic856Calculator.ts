import { AppError } from "../../utils/AppError.js";

interface LIC856CalculatorInput {
  productId: string;
  premiumMode: string;
  age: number;
  policyTerm: number;
  premiumPayingTerm?: number | null;
  sumAssured: number;
  tabularPremium: number;
  rate: number;
}

export interface LIC856EligibilityInput {
  premiumMode: string;
  age: number;
  policyTerm: number;
  premiumPayingTerm?: number | null;
  sumAssured: number;
}

export interface LIC856Eligibility {
  modeKey: "Y" | "H" | "Q" | "M";
  minPurchasePrice: number;
  maxPurchasePrice: number;
}

const MIN_ENTRY_AGE = 60;
const MAX_ENTRY_AGE = 99;
const POLICY_TERM = 10;

/**
 * PMVVY purchase-price limits by pension mode (LIC PMVVY Modified-2020
 * brochure). The pension itself is calculated per Rs 1,000 of purchase price:
 * yearly 76.60, half-yearly 75.20, quarterly 74.50, monthly 74.00 p.a.
 */
const MODE_LIMITS: Record<
  "Y" | "H" | "Q" | "M",
  { minPurchasePrice: number; maxPurchasePrice: number }
> = {
  Y: { minPurchasePrice: 156658, maxPurchasePrice: 1449086 },
  H: { minPurchasePrice: 159574, maxPurchasePrice: 1476064 },
  Q: { minPurchasePrice: 161074, maxPurchasePrice: 1489933 },
  M: { minPurchasePrice: 162162, maxPurchasePrice: 1500000 },
};

function modeKey(premiumMode: string): "Y" | "H" | "Q" | "M" | null {
  const mode = (premiumMode || "").trim().toUpperCase();
  if (["Y", "YEARLY", "YLY", "ANNUAL", "SINGLE", "SIN", "O", "S"].includes(mode)) {
    return "Y";
  }
  if (["H", "HALF-YEARLY", "HALFYEARLY", "HLY", "SEMI-ANNUAL"].includes(mode)) {
    return "H";
  }
  if (["Q", "QUARTERLY", "QLY"].includes(mode)) return "Q";
  if (["M", "MONTHLY", "MLY"].includes(mode)) return "M";
  return null;
}

/**
 * LIC Plan 856 - Pradhan Mantri Vaya Vandana Yojana (PMVVY), Modified-2020
 * (UIN 512G336V01).
 *
 * Single-premium pension plan for entry ages 60-99, policy term 10 years.
 * The amount paid is the purchase price; it is not a mortality-rated premium.
 * LIC returns the full purchase price on maturity (or to the nominee on death),
 * so the premium calculation is simply:
 *
 *   tabular = purchase price (the engine stores a 0 rate and returns the sum)
 *   instalment = purchase price
 *   GST = 0 (PMVVY is exempt)
 *
 * The pension amount is mode-specific and is kept as product attributes, not
 * as part of the premium result. This calculator deliberately ignores the
 * premium mode for the purchase price: yearly/half-yearly/quarterly/monthly
 * only select how the pension is paid out, not how much the policy costs.
 */
export function validateLIC856Eligibility(
  data: LIC856EligibilityInput,
): LIC856Eligibility {
  const key = modeKey(data.premiumMode);
  if (!key) {
    throw new AppError(
      "LIC Plan 856 allows Yearly, Half-Yearly, Quarterly or Monthly pension mode",
      400,
    );
  }

  if (
    !Number.isInteger(data.age) ||
    data.age < MIN_ENTRY_AGE ||
    data.age > MAX_ENTRY_AGE
  ) {
    throw new AppError(
      "LIC Plan 856 entry age must be between 60 and 99 years",
      400,
    );
  }

  if (data.policyTerm !== POLICY_TERM) {
    throw new AppError("LIC Plan 856 policy term must be 10 years", 400);
  }

  if (data.premiumPayingTerm != null && data.premiumPayingTerm !== 1) {
    throw new AppError(
      "LIC Plan 856 is a single premium plan; premium paying term must be 1",
      400,
    );
  }

  const limits = MODE_LIMITS[key];
  const sa = data.sumAssured;
  if (!Number.isFinite(sa) || sa < limits.minPurchasePrice) {
    throw new AppError(
      `LIC Plan 856 minimum purchase price for ${key === "Y" ? "yearly" : key === "H" ? "half-yearly" : key === "Q" ? "quarterly" : "monthly"} pension is Rs ${limits.minPurchasePrice.toLocaleString("en-IN")}`,
      400,
    );
  }
  if (sa > limits.maxPurchasePrice) {
    throw new AppError(
      `LIC Plan 856 maximum purchase price for ${key === "Y" ? "yearly" : key === "H" ? "half-yearly" : key === "Q" ? "quarterly" : "monthly"} pension is Rs ${limits.maxPurchasePrice.toLocaleString("en-IN")}`,
      400,
    );
  }

  return { modeKey: key, ...limits };
}

export async function calculateLIC856(data: LIC856CalculatorInput) {
  validateLIC856Eligibility(data);

  // The rate row is stored as 0 (matching LIC's engine); the purchase price is
  // the sum assured, so override the generic rate x SA / 1000 tabular premium.
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
    gstAmountOverride: 0,
  };
}
