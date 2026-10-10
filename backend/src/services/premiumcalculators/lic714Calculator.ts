import rebateService from "../rebateService.js";

interface CalculatorInput {
  productId: string;
  premiumMode: string;
  age: number;
  policyTerm: number;
  sumAssured: number;
  tabularPremium: number;
  rate: number; // Premium Rate
}

export async function calculateLIC714(data: CalculatorInput) {
  // ==========================
  // Sum Assured Rebate
  // ==========================
  const saRebate = await rebateService.calculateSumAssuredRebate(
    data.productId,
    data.sumAssured,
    data.tabularPremium
  );

  // ==========================
  // Mode Rebate (2% of Premium Rate)
  // ==========================
  const modeRebateRate = Number((data.rate * 0.02).toFixed(3));

  const modeRebateAmount = Number(
    ((data.sumAssured / 1000) * modeRebateRate).toFixed(2)
  );

  // ==========================
  // Basic Premium
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