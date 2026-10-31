import { AppError } from "../../utils/AppError.js";

interface Calculator904Input {
  productId: string;
  premiumMode: string;
  age: number;
  policyTerm: number;
  sumAssured: number;
  tabularPremium: number;
  rate: number;
  option?: number | null;
}

const VALID_IDB = new Set([1000, 2000, 3000, 4000]);

// LIC's Hospital Cash Benefit rebate, in rupees, for IDB 1,000/2,000/3,000/4,000.
const HCB_REBATE_PI: Record<number, number> = {
  1000: 0,
  2000: 500,
  3000: 1000,
  4000: 1500,
};
const HCB_REBATE_OTHER: Record<number, number> = {
  1000: 0,
  2000: 250,
  3000: 500,
  4000: 750,
};

/**
 * Plan 904 - LIC's Jeevan Arogya (UIN 512N266V02 / 512N266V03).
 *
 * Health plan, so the premium is not a rate per 1,000 sum assured. LIC's table
 * gives the annual premium for IDB 1,000, and the four sums assured are the
 * Major Surgical Benefit = 100 x IDB (1,00,000 .. 4,00,000). LIC then applies:
 *
 *   yearly      = table * IDB/1,000 * (1 - 2%) - HCB rebate
 *   half-yearly = table * IDB/1,000 * (1 - 1%) - HCB rebate, divided by 2
 *   total       = ROUND(installment * 1.18)
 *
 * The HCB rebate is a flat annual amount and is subtracted before the mode
 * divisor, exactly as in LIC's calculator. Only yearly and half-yearly modes
 * are allowed for this plan.
 */
export async function calculateLIC904(data: Calculator904Input) {
  const mode = data.premiumMode.trim().toUpperCase();
  const isYearly = ["Y", "YEARLY", "YLY"].includes(mode);
  const isHalfYearly = ["H", "HALF-YEARLY", "HLY", "HALFYEARLY"].includes(mode);

  if (!isYearly && !isHalfYearly) {
    throw new AppError(
      "LIC Plan 904 allows only Yearly or Half-Yearly premium mode",
      400,
    );
  }

  const idb = data.sumAssured / 100;
  if (!VALID_IDB.has(idb)) {
    throw new AppError(
      "LIC Plan 904 sum assured must be 100000, 200000, 300000 or 400000 (IDB 1000-4000)",
      400,
    );
  }

  // Option 1 is the principal insured, option 2 is a spouse/parent/child.
  // Children below 18 only exist in the "other insured" table. The legacy
  // form sends 0 when no option is selected, which means the principal
  // insured, so only an explicit 2 selects the other-insured table.
  const insuredType = data.age < 18 ? 2 : data.option === 2 ? 2 : 1;
  const hcbRebate =
    (insuredType === 1 ? HCB_REBATE_PI : HCB_REBATE_OTHER)[idb] ?? 0;

  const divisor = isHalfYearly ? 2 : 1;
  const modeRebatePct = isHalfYearly ? 1 : 2;

  // tabularRate is the annual IDB-1,000 table premium, so scale by IDB/1,000.
  const tabularPremium = Number((data.rate * (idb / 1000)).toFixed(2));
  const basicYearlyRaw =
    tabularPremium * (1 - modeRebatePct / 100) - hcbRebate;
  const rawInstallment = basicYearlyRaw / divisor;

  // LIC rounds the total collected premium to the nearest rupee; the GST is
  // whatever remains after subtracting the pre-tax installment.
  const totalOverride = Math.round(rawInstallment * 1.18);
  const installmentOverride = Number(rawInstallment.toFixed(2));
  const gstAmountOverride = Number(
    (totalOverride - installmentOverride).toFixed(2),
  );

  return {
    saRebateRate: 0,
    saRebateAmount: 0,
    modeRebateRate: 0,
    modeRebateAmount: Number(
      (tabularPremium * (modeRebatePct / 100)).toFixed(2),
    ),
    basicYearlyPremium: Number(basicYearlyRaw.toFixed(2)),
    tabularPremiumOverride: tabularPremium,
    installmentOverride,
    gstAmountOverride,
    totalOverride,
    gstRounding: "WHOLE" as const,
  };
}
