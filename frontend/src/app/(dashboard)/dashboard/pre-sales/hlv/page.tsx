import QuickHlvCalculator from "@/features/pre-sales/components/QuickHlvCalculator";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "JEM Soft",
  description:
    "Calculate Human Life Value (HLV) to assess life insurance coverage requirements based on future income replacement and inflation.",
};

export default function HlvCalculatorPage() {
  return <QuickHlvCalculator />;
}