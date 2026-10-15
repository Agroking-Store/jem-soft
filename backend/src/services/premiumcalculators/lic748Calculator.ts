// services/premiumCalculators/lic748Calculator.ts

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

export async function calculateLIC748(data: CalculatorInput) {
  // ==========================
  // Step 1 : High Sum Assured Rebate
  // ==========================
  const saRebate = await rebateService.calculateSumAssuredRebate(
    data.productId,
    data.sumAssured,
    data.tabularPremium
  );

  // ==========================
  // Step 2 : Mode Rebate
  // As per LIC Brochure
  // Yearly      -> 2%
  // Half-Yearly -> 1%
  // Quarterly   -> Nil
  // Monthly     -> Nil
  // ==========================

  let modeRebatePercent = 0;

  switch (data.premiumMode.toUpperCase()) {
    case "Y":
    case "YEARLY":
      modeRebatePercent = 2;
      break;

    case "H":
    case "HALF-YEARLY":
      modeRebatePercent = 1;
      break;

    default:
      modeRebatePercent = 0;
  }

  const modeRebateAmount = Number(
    (
      saRebate.basicPremium *
      (modeRebatePercent / 100)
    ).toFixed(2)
  );

  // For API response only
  const modeRebateRate = Number(
    (
      modeRebateAmount /
      (data.sumAssured / 1000)
    ).toFixed(3)
  );

  // ==========================
  // Step 3 : Basic Premium
  // ==========================

  const basicYearlyPremium = Number(
    (
      saRebate.basicPremium -
      modeRebateAmount
    ).toFixed(2)
  );

  return {
    saRebateRate: saRebate.rebateRate,
    saRebateAmount: saRebate.rebateAmount,

    modeRebateRate,
    modeRebateAmount,

    basicYearlyPremium,
  };
}