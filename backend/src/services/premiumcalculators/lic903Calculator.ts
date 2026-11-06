import { AppError } from "../../utils/AppError.js";

interface Calculator903Input {
  premiumMode: string;
  age: number;
  sumAssured: number;
  tabularPremium: number;
  rate?: number;
  option?: number | null;
}

const VALID_SUM_ASSURED = new Set([100000, 200000, 300000, 400000]);
const HCB_REBATE_PI: Record<number, number> = { 1000: 0, 2000: 500, 3000: 1000, 4000: 1500 };
const HCB_REBATE_OTHER: Record<number, number> = { 1000: 0, 2000: 250, 3000: 500, 4000: 750 };

/** LIC Plan 903's premium is quoted annually per Rs 1,000 HCB. */
export async function calculateLIC903(data: Calculator903Input) {
  const mode = data.premiumMode.trim().toUpperCase();
  const modeDetails: Record<string, { divisor: number; rebatePct: number }> = {
    Y: { divisor: 1, rebatePct: 2 },
    YEARLY: { divisor: 1, rebatePct: 2 },
    YLY: { divisor: 1, rebatePct: 2 },
    H: { divisor: 2, rebatePct: 1 },
    "HALF-YEARLY": { divisor: 2, rebatePct: 1 },
    HALFYEARLY: { divisor: 2, rebatePct: 1 },
    HLY: { divisor: 2, rebatePct: 1 },
    Q: { divisor: 4, rebatePct: 0 },
    QUARTERLY: { divisor: 4, rebatePct: 0 },
    M: { divisor: 12, rebatePct: 0 },
    MONTHLY: { divisor: 12, rebatePct: 0 },
  };
  const terms = modeDetails[mode];
  if (!terms) {
    throw new AppError("LIC Plan 903 allows yearly, half-yearly, quarterly, or monthly mode", 400);
  }
  if (!VALID_SUM_ASSURED.has(data.sumAssured)) {
    throw new AppError("LIC Plan 903 sum assured must be Rs 1,00,000, 2,00,000, 3,00,000, or 4,00,000", 400);
  }

  const idb = data.sumAssured / 100;
  const insuredType = data.age < 18 || data.option === 2 ? 2 : 1;
  const hcbRebate = (insuredType === 1 ? HCB_REBATE_PI : HCB_REBATE_OTHER)[idb] ?? 0;
  // data.tabularPremium is already scaled by (sumAssured / 100,000) in premiumCalculationService.
  // If data.rate is passed, compute directly as rate * (idb / 1000).
  const tabularPremium = data.rate !== undefined
    ? Number((data.rate * (idb / 1000)).toFixed(2))
    : Number(data.tabularPremium.toFixed(2));
  const modeRebateAmount = Number((tabularPremium * terms.rebatePct / 100).toFixed(2));
  const basicYearlyPremium = Number((tabularPremium - modeRebateAmount - hcbRebate).toFixed(2));
  const rawInstallment = basicYearlyPremium / terms.divisor;
  const totalOverride = Math.round(rawInstallment * 1.18);
  const installmentOverride = Number(rawInstallment.toFixed(2));
  const gstAmountOverride = Number((totalOverride - installmentOverride).toFixed(2));

  return {
    saRebateRate: 0,
    saRebateAmount: hcbRebate,
    modeRebateRate: terms.rebatePct,
    modeRebateAmount,
    basicYearlyPremium,
    tabularPremiumOverride: tabularPremium,
    installmentOverride,
    gstAmountOverride,
    totalOverride,
    gstRounding: "WHOLE" as const,
  };
}
