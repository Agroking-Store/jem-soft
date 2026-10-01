"use client";

import React, { useState } from "react";
import { QuotationNavTabs } from "@/features/quotations/components/QuotationNavTabs";
import { QuotationList } from "@/features/quotations/components/QuotationList";
import { LifeGuardForm } from "@/features/quotations/components/LifeGuardForm";
import { ProtectAndEarnForm } from "@/features/quotations/components/ProtectAndEarnForm";
import { RetireEnjoyForm } from "@/features/quotations/components/RetireEnjoyForm";
import { QuotationReportModal } from "@/features/quotations/components/QuotationReportModal";
import {
  Quotation,
  QuotationProductType,
  ReportOptionsState,
} from "@/features/quotations/types";

export default function QuotationsPage() {
  const [productType, setProductType] = useState<QuotationProductType>("LIFE_GUARD");
  const [activeView, setActiveView] = useState<"list" | "new">("list");

  // Report Modal State
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [selectedQuotationForReport, setSelectedQuotationForReport] =
    useState<Quotation | null>(null);
  const [reportOptions, setReportOptions] = useState<ReportOptionsState | undefined>(
    undefined
  );

  const handleAddNew = () => {
    setActiveView("new");
  };

  const handleCancelForm = () => {
    setActiveView("list");
  };

  const handleQuotationSaved = (quotation: Quotation, shouldViewReport: boolean) => {
    if (shouldViewReport) {
      setSelectedQuotationForReport(quotation);
      setReportOptions(quotation.reportOptions);
      setIsReportOpen(true);
    }
    setActiveView("list");
  };

  const handleViewReportFromList = (
    quotation: Quotation,
    options: ReportOptionsState
  ) => {
    setSelectedQuotationForReport(quotation);
    setReportOptions(options);
    setIsReportOpen(true);
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 pb-12">
      {/* Top Navigation Tabs */}
      <QuotationNavTabs
        productType={productType}
        activeView={activeView}
        onChangeProductType={(type) => {
          setProductType(type);
        }}
        onChangeView={(view) => {
          setActiveView(view);
        }}
      />

      {/* Main Content Area */}
      {activeView === "list" ? (
        <QuotationList
          productType={productType}
          onAddNew={handleAddNew}
          onViewReport={handleViewReportFromList}
        />
      ) : (
        <>
          {productType === "LIFE_GUARD" && (
            <LifeGuardForm
              onCancel={handleCancelForm}
              onSaved={handleQuotationSaved}
            />
          )}

          {productType === "PROTECT_AND_EARN" && (
            <ProtectAndEarnForm
              onCancel={handleCancelForm}
              onSaved={handleQuotationSaved}
            />
          )}

          {productType === "RETIRE_ENJOY_I" && (
            <RetireEnjoyForm
              onCancel={handleCancelForm}
              onSaved={handleQuotationSaved}
            />
          )}
        </>
      )}

      {/* Quotation Report Modal */}
      <QuotationReportModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        quotation={selectedQuotationForReport}
        reportOptions={reportOptions}
      />
    </div>
  );
}
