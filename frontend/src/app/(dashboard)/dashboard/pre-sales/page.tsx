import RetirementNeedsCalculator from "@/features/pre-sales/components/RetirementNeeds";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Retirement Needs Calculator | Pre-Sales Tools",
  description:
    "Project your cost of living at retirement and the corpus required today to sustain it, based on inflation.",
};

export default function RetirementNeedsPage() {
  return <RetirementNeedsCalculator />;
}