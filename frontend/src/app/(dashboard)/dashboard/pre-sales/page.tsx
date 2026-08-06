import QuickHlvCalculator from "@/features/pre-sales/components/QuickHlvCalculator";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "JEM Soft",
  description:
    "Assess life insurance coverage and financial planning requirements with pre-sales calculators.",
};

export default function PreSalesDefaultPage() {
  return <QuickHlvCalculator />;
}