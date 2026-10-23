import rebateService from "../rebateService.js";

interface CalculatorInput {
  productId: string;
  premiumMode: string;
  age: number;
  policyTerm: number;
  sumAssured: number;
  tabularPremium: number;
  rate: number;
}

/**
 * LIC's .NET service rounds an installment to the nearest rupee but sends a
 * half-rupee down (39,150.5 -> 39,150 and 36,989.5 -> 36,989). That is neither
 * Math.round (half up) nor banker's rounding (half to even), so reproduce it
 * explicitly.
 */
function roundHalfDown(value: number): number {
  const floor = Math.floor(value);
  return value - floor > 0.5 + 1e-9 ? floor + 1 : floor;
}

/**
 * Plan 915 - LIC's New Jeevan Anand (UIN 512N279V02), withdrawn 30-Sep-2024.
 *
 * LIC quotes the mode rebate as a percentage of the tabular rate itself: 2%
 * for yearly, 1% for half-yearly and nil for quarterly/monthly. Both rebates
 * are per 1000 sum assured, so
 *
 *   yearly basic = tabular - (sumAssured / 1000) * (saRebate + modeRebate)
 *
 * The installment is that figure divided by 1/2/4/12 and rounded to a rupee.
 * A single mode factor cannot reproduce this because the rebate is taken off
 * the rate before the division, so the exact installment is handed back through
 * `installmentOverride` and the engine uses it verbatim.
 */
export async function calculateLIC915(data: CalculatorInput) {
  const saRebate = await rebateService.calculateSumAssuredRebate(
    data.productId,
    data.sumAssured,
    data.tabularPremium,
  );

  const mode = data.premiumMode.trim().toUpperCase();
  const divisor = mode.startsWith("H")
    ? 2
    : mode.startsWith("Q")
      ? 4
      : mode.startsWith("M")
        ? 12
        : 1;
  const modeRebatePct = divisor === 2 ? 0.01 : divisor === 1 ? 0.02 : 0;

  const modeRebateRate = Number((data.rate * modeRebatePct).toFixed(4));
  const modeRebateAmount = Number(
    ((data.sumAssured / 1000) * modeRebateRate).toFixed(2),
  );

  const basicYearlyPremium = Number(
    (saRebate.basicPremium - modeRebateAmount).toFixed(2),
  );

  return {
    saRebateRate: saRebate.rebateRate,
    saRebateAmount: saRebate.rebateAmount,
    modeRebateRate,
    modeRebateAmount,
    basicYearlyPremium,
    installmentOverride: roundHalfDown(basicYearlyPremium / divisor),
    // LIC keeps paise on the yearly premium and collects the other modes in
    // whole rupees.
    gstRounding: (divisor === 1 ? "PAISE" : "WHOLE") as "PAISE" | "WHOLE",
  };
}
