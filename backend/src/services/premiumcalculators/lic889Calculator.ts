import rebateService from "../rebateService.js";

interface CalculatorInput {
  productId: string;
  premiumMode: string;
  age: number;
  secondaryAge: number;
  policyTerm: number;
  premiumPayingTerm: number;
  option: number;
  sumAssured: number;
  tabularPremium: number;
  rate: number;
}

export async function calculateLIC889(
  data: CalculatorInput
) {
  // ==========================================
  // Sum Assured Rebate
  // ==========================================

  const saRebate =
    await rebateService.calculateSumAssuredRebate(
      data.productId,
      data.sumAssured,
      data.tabularPremium
    );

  // ==========================================
  // Basic Premium
  // ==========================================

  const basicYearlyPremium = Number(
    saRebate.basicPremium.toFixed(2)
  );

  return {
    saRebateRate: saRebate.rebateRate,
    saRebateAmount: saRebate.rebateAmount,

    modeRebateRate: 0,
    modeRebateAmount: 0,

    basicYearlyPremium,
  };
}