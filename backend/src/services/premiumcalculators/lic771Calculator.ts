import rebateService from "../rebateService.js";

interface CalculatorInput {
  productId: string;
  premiumMode: string;
  age: number;
  policyTerm: number;
  premiumPayingTerm: number;
  sumAssured: number;
  tabularPremium: number;
  rate: number;
}

export async function calculateLIC771(data: CalculatorInput) {
  const saRebate =
    await rebateService.calculateSumAssuredRebate(
      data.productId,
      data.sumAssured,
      data.tabularPremium
    );

  return {
    policyTerm: data.policyTerm,
    premiumPayingTerm: data.premiumPayingTerm,

    saRebateRate: saRebate.rebateRate,
    saRebateAmount: saRebate.rebateAmount,

    modeRebateRate: 0,
    modeRebateAmount: 0,

    basicYearlyPremium: saRebate.basicPremium,
  };
}