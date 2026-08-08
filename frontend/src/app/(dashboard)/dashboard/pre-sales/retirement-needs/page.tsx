import RetirementNeedsCalculator from "@/features/pre-sales/components/RetirementNeeds";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "JEM Soft",
  description: "Calculate retirement corpus requirements accounting for inflation and return rate.",
};

export default function RetirementNeedsPage() {
  return <RetirementNeedsCalculator />;
}
