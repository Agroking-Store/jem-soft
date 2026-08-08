import { calculateLIC714 } from "./lic714Calculator.js";

export async function calculateLIC751(data: any) {
  const result = await calculateLIC714(data);

  return {
    ...result,

    // Hide mode rebate like client
    modeRebateRate: 0,
    modeRebateAmount: 0,
  };
}