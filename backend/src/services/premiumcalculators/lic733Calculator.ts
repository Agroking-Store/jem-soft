import { calculateLIC714 } from "./lic714Calculator.js";

interface CalculatorInput {
  productId: string;
  premiumMode: string;
  age: number;
  policyTerm: number;
  sumAssured: number;
  tabularPremium: number;
  rate: number;
}

export async function calculateLIC733(data: CalculatorInput) {
  return calculateLIC714(data);
}