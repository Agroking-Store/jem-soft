"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import QuotationCreatePage from "@/features/quotations/pages/QuotationCreatePage";
import { QuotationReportModal } from "@/features/quotations/components/QuotationReportModal";
import type { Quotation, QuotationProductType } from "@/features/quotations/types";

function CreateQuotationPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const productParam = searchParams.get("product");
  const productType: QuotationProductType =
    productParam === "PROTECT_AND_EARN" || productParam === "RETIRE_ENJOY_I"
      ? productParam
      : "LIFE_GUARD";

  const [reportQuotation, setReportQuotation] = useState<Quotation | null>(null);

  const handleBack = () => {
    router.push(`/dashboard/quotations?product=${productType}`);
  };

  const handleSaved = (quotation: Quotation, shouldViewReport: boolean) => {
    if (shouldViewReport) {
      setReportQuotation(quotation);
    } else {
      router.push(`/dashboard/quotations?product=${productType}`);
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-8">
      <QuotationCreatePage
        productType={productType}
        onClose={handleBack}
        onSaved={handleSaved}
      />

      {reportQuotation && (
        <QuotationReportModal
          isOpen={true}
          onClose={() => {
            setReportQuotation(null);
            router.push(`/dashboard/quotations?product=${productType}`);
          }}
          quotation={reportQuotation}
          reportOptions={reportQuotation.reportOptions}
        />
      )}
    </div>
  );
}

export default function CreateQuotationRoutePage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <CreateQuotationPageInner />
    </Suspense>
  );
}
