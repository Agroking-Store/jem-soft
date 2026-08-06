import IncomeReplacement from "@/features/pre-sales/components/IncomeReplacement";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "JEM Soft",
  description:
    "Estimate the life cover required to replace your income for your family, based on future income growth and inflation.",
};

export default function IncomeReplacementPage() {
  return <IncomeReplacement />;
}