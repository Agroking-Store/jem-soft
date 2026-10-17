"use client";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import PremiumPaymentForm from "@/features/premiumPayments/PremiumPaymentForm";

function NewPaymentContent() {
  const searchParams = useSearchParams();
  const policyId = searchParams.get("policyId") || undefined;
  return <PremiumPaymentForm mode="create" initialPolicyId={policyId} />;
}

export default function NewPremiumPaymentPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500">Loading form...</div>}>
      <NewPaymentContent />
    </Suspense>
  );
}
