import ChildEducationNeeds from "@/features/pre-sales/components/ChildEducationNeeds";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Child Education Needs Calculator | Pre-Sales Tools",
  description: "Project future education costs and the lumpsum corpus required today, based on education inflation and saving rate.",
};

export default function ChildEducationNeedsPage() {
  return <ChildEducationNeeds />;
}