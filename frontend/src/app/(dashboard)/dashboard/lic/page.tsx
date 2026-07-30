import { Suspense } from "react";
import LicModuleNav from "@/features/lic/LicModuleNav";
import LICPoliciesPage from "./policies/page";

export default function LICPage() {
  return (
    <div className="space-y-6">
      <LicModuleNav />
      <LICPoliciesPage />
    </div>
  );
}

