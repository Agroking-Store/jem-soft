import {calculateLIC720} from "./lic720Calculator.js";

interface CalculatorInput {
  productId: string;
  premiumMode: string;
  age: number;
  policyTerm: number;
  sumAssured: number;
  tabularPremium: number;
  rate: number;
}       

export async function calculateLIC721(data: CalculatorInput) {
  return calculateLIC720(data);
}