"use client";

import React, { useRef } from "react";
import { X, Printer, Download, ShieldCheck, UserCheck, Calculator } from "lucide-react";
import { Quotation, ReportOptionsState } from "../types";

interface QuotationReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  quotation: Quotation | null;
  reportOptions?: ReportOptionsState;
}

export const QuotationReportModal: React.FC<QuotationReportModalProps> = ({
  isOpen,
  onClose,
  quotation,
  reportOptions = {
    coverPage: true,
    benefitsIllustration: true,
    agentsCopy: true,
    taxBreakup: true,
    medicalRequirement: true,
    yield: true,
  },
}) => {
  const reportRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !quotation) return null;

  const handlePrint = () => {
    window.print();
  };

  const formatCurrency = (val?: number | null) => {
    if (val === undefined || val === null) return "₹ 0";
    return `₹ ${Number(val).toLocaleString("en-IN")}`;
  };

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const calcDetails = quotation.calculationDetails;
  const yearlyRows = calcDetails?.yearlyIllustration || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 print:p-0 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl my-8 flex flex-col max-h-[92vh] border border-slate-300 print:border-none print:shadow-none print:max-h-none print:m-0 print:w-full">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50 print:hidden">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-800">
              Quotation &amp; Benefits Illustration Report
            </h2>
            <span className="px-2.5 py-0.5 text-xs font-mono font-semibold bg-blue-100 text-blue-800 rounded-full">
              Ref: {quotation.quotationRefNo}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded shadow-sm transition-all"
            >
              <Printer size={16} /> Print / Save PDF
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Printable Report Content */}
        <div
          ref={reportRef}
          className="flex-1 overflow-y-auto p-8 space-y-8 print:p-4 print:space-y-6 text-slate-800 font-sans"
        >
          {/* 1. Cover Page Section */}
          {reportOptions.coverPage && (
            <div className="border border-blue-200 rounded-xl p-6 bg-gradient-to-br from-blue-50/60 to-indigo-50/40 print:border-slate-300">
              <div className="flex justify-between items-start border-b border-blue-200 pb-4 mb-4">
                <div>
                  <h1 className="text-2xl font-black text-blue-900 tracking-tight uppercase">
                    LIC Insurance Quotation
                  </h1>
                  <p className="text-sm font-semibold text-slate-600">
                    Product: {quotation.productType.replace(/_/g, " ")} | Plan: {quotation.planNumber || "714"}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-xs text-slate-500">Quotation Date</div>
                  <div className="font-bold text-sm text-slate-800">{formatDate(quotation.quotationDate)}</div>
                  <div className="text-xs text-slate-500 mt-1">Commencement Date</div>
                  <div className="font-bold text-sm text-slate-800">{formatDate(quotation.commencementDate)}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div>
                  <span className="text-slate-500 block">Proposer Name</span>
                  <span className="font-bold text-slate-900 text-sm">
                    {quotation.title} {quotation.proposerName}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Age / Gender</span>
                  <span className="font-bold text-slate-900">
                    {quotation.age} Yrs / {quotation.gender}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Sum Assured</span>
                  <span className="font-bold text-blue-800 text-sm">
                    {formatCurrency(quotation.sumAssured)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Term / PPT</span>
                  <span className="font-bold text-slate-900">
                    {quotation.policyTerm} Yrs / {quotation.ppt || quotation.policyTerm} Yrs
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* 2. Premium & Plan Summary */}
          <div className="border border-slate-200 rounded-xl p-5 bg-white shadow-sm space-y-3">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-1.5">
              <Calculator size={18} className="text-blue-600" /> Premium Summary &amp; Investment Details
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <span className="text-slate-500 block">Basic Premium</span>
                <span className="font-bold text-slate-800 text-sm">
                  {formatCurrency(quotation.basicPremium)}
                </span>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <span className="text-slate-500 block">GST (First Year)</span>
                <span className="font-bold text-slate-800 text-sm">
                  {formatCurrency(quotation.gst)}
                </span>
              </div>
              <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-100">
                <span className="text-emerald-700 font-semibold block">Installment Premium ({quotation.premiumMode})</span>
                <span className="font-black text-emerald-800 text-sm">
                  {formatCurrency(quotation.installmentPremium || quotation.totalPremium)}
                </span>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                <span className="text-blue-700 font-semibold block">Estimated Maturity</span>
                <span className="font-black text-blue-900 text-sm">
                  {formatCurrency(quotation.maturityAmount)}
                </span>
              </div>
            </div>
          </div>

          {/* 3. Tax Breakup Section */}
          {reportOptions.taxBreakup && (
            <div className="border border-slate-200 rounded-xl p-5 bg-white shadow-sm space-y-3">
              <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
                Income Tax Benefit (Section 80C)
              </h3>
              <div className="grid grid-cols-3 gap-4 text-xs">
                <div>
                  <span className="text-slate-500 block">Sec. 80C Limit</span>
                  <span className="font-bold text-slate-800">{formatCurrency(quotation.sec80CLimit)}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Applicable Tax Slab</span>
                  <span className="font-bold text-slate-800">{quotation.taxSlabPercentage}%</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Estimated Annual Tax Savings</span>
                  <span className="font-bold text-emerald-700 text-sm">
                    {formatCurrency(calcDetails?.taxSavingsAmount || (quotation.basicPremium * 0.309))}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* 4. Benefits Illustration Table */}
          {(reportOptions.benefitsIllustration || reportOptions.benefitsForecast) && (
            <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
              <div className="bg-slate-100 px-4 py-2.5 border-b border-slate-200">
                <h3 className="text-sm font-bold text-slate-900">
                  Year-by-Year Cash Flow &amp; Risk Cover Illustration ({quotation.bonusScenario})
                </h3>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold">
                      <th className="py-2 px-3">Year</th>
                      <th className="py-2 px-3">Age</th>
                      <th className="py-2 px-3">Annual Premium</th>
                      <th className="py-2 px-3">Cumulative Premium</th>
                      <th className="py-2 px-3">Normal Life Cover</th>
                      <th className="py-2 px-3">Accidental Cover</th>
                      <th className="py-2 px-3">Surrender Value</th>
                      <th className="py-2 px-3 text-right">Cash Return / Maturity</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {yearlyRows.length > 0 ? (
                      yearlyRows.map((r) => (
                        <tr key={r.policyYear} className="hover:bg-slate-50">
                          <td className="py-2 px-3 font-mono">{r.policyYear}</td>
                          <td className="py-2 px-3">{r.age}</td>
                          <td className="py-2 px-3">{formatCurrency(r.premium)}</td>
                          <td className="py-2 px-3 text-slate-600">{formatCurrency(r.cumulativePremium)}</td>
                          <td className="py-2 px-3 font-medium text-blue-900">{formatCurrency(r.normalCover)}</td>
                          <td className="py-2 px-3 font-medium text-indigo-900">{formatCurrency(r.accidentalCover)}</td>
                          <td className="py-2 px-3 text-slate-600">{formatCurrency(r.surrenderValue)}</td>
                          <td className="py-2 px-3 text-right font-bold text-emerald-700">
                            {r.cashFlowReturns > 0 ? formatCurrency(r.cashFlowReturns) : "-"}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={8} className="py-6 text-center text-slate-400">
                          Illustration details available upon process calculation.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 5. Medical Requirement & Agent's Copy */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {reportOptions.medicalRequirement && (
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 text-xs space-y-2">
                <h4 className="font-bold text-slate-800 flex items-center gap-1.5">
                  <UserCheck size={16} className="text-blue-600" /> Medical &amp; Underwriting Requirements
                </h4>
                <p className="text-slate-600 leading-relaxed">
                  For Age {quotation.age} &amp; Sum Assured {formatCurrency(quotation.sumAssured)}:
                  <br />
                  • Standard FMR (Full Medical Report) may be required if SA &gt; ₹50 Lakhs.
                  <br />
                  • Non-medical (Special) limit applies for standard lives.
                </p>
              </div>
            )}

            {reportOptions.agentsCopy && (
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 text-xs space-y-2">
                <h4 className="font-bold text-slate-800 flex items-center gap-1.5">
                  <ShieldCheck size={16} className="text-blue-600" /> Agent&apos;s Confidential Notes
                </h4>
                <p className="text-slate-600 leading-relaxed">
                  • Quote Reference: {quotation.quotationRefNo}
                  <br />
                  • Client Linked: {quotation.proposerName} {quotation.groupCode ? `(Group: ${quotation.groupCode})` : ""}
                  <br />
                  • This illustration is an estimate for client presentation.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-end print:hidden">
          <button
            onClick={onClose}
            className="px-5 py-1.5 text-sm font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded shadow-sm transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
