"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import LoanForm from "../LoanForm";

function NewLoanContent() {
  const searchParams = useSearchParams();
  const policyId = searchParams.get("policyId") || undefined;

  return (
    <div className="w-full">
      <LoanForm mode="create" initialPolicyId={policyId} />
    </div>
  );
}

export default function NewLoanPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500">Loading form...</div>}>
      <NewLoanContent />
    </Suspense>
  );
}