// services/premiumCalculators/lic717Calculator.ts

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

export async function calculateLIC717(data: CalculatorInput) {
  // Step 1 : Sum Assured Rebate
  const saRebate = await rebateService.calculateSumAssuredRebate(
    data.productId,
    data.sumAssured,
    data.tabularPremium
  );

  // Step 2 : No Mode Rebate for Plan 717
  const modeRebateRate = 0;
  const modeRebateAmount = 0;

  // Step 3 : Basic Premium
  const basicYearlyPremium = saRebate.basicPremium;

  return {
    saRebateRate: saRebate.rebateRate,
    saRebateAmount: saRebate.rebateAmount,

    modeRebateRate,
    modeRebateAmount,

    basicYearlyPremium,
  };
}