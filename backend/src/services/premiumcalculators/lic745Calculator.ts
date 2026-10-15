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

export async function calculateLIC745(data: CalculatorInput) {
  const saRebate =
    await rebateService.calculateSumAssuredRebate(
      data.productId,
      data.sumAssured,
      data.tabularPremium
    );

  const modeRebateRate = Number(
    (data.rate * 0.02).toFixed(3)
  );

  const modeRebateAmount = Number(
    (
      (data.sumAssured / 1000) *
      modeRebateRate
    ).toFixed(2)
  );

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