import QuickHlvCalculator from "@/features/pre-sales/components/QuickHlvCalculator";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Human Life Value Calculator | Pre-Sales Tools",
  description:
    "Calculate Human Life Value (HLV) to assess life insurance coverage requirements based on future income replacement and inflation.",
};

export default function PreSalesDefaultPage() {
  return <QuickHlvCalculator />;
}