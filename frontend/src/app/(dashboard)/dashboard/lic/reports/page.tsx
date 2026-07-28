"use client";

import { BarChart3 } from "lucide-react";
import LicModuleNav from "@/features/lic/LicModuleNav";

export default function LICReportsPage() {
  return (
    <div className="space-y-6">
      <LicModuleNav />
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center bg-white border border-slate-200 rounded-2xl">
        <div className="p-3 rounded-full bg-slate-100 mb-4">
          <BarChart3 size={48} className="text-slate-300" />
        </div>
        <h2 className="text-xl font-semibold text-slate-700">LIC Reports</h2>
        <p className="text-sm text-slate-500 mt-2 max-w-md">
          LIC reports and analytics will be available here soon.
        </p>
      </div>
    </div>
  );
}

