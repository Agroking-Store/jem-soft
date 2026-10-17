"use client";

import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  ArrowLeft,
  FileText,
  Calculator,
  TrendingUp,
  User,
} from "lucide-react";
import { AppDispatch, RootState } from "@/store/store";
import { fetchQuotationById } from "@/features/quotations/quotationSlice";
import type { Quotation } from "@/features/quotations/types";
import { QuotationSectionCard } from "@/features/quotations/components/QuotationUi";
import { QuotationReportModal } from "@/features/quotations/components/QuotationReportModal";
import type { QuotationModalEntry } from "@/features/quotations/components/QuotationModalStack";

interface QuotationDetailsPageProps {
  quotationId: string;
  onClose: () => void;
  onOpenModal: (type: QuotationModalEntry["type"], id?: string) => void;
  modalStackLength?: number;
  initialTab?: string;
}

function formatCurrency(val?: number | null) {
  if (val === undefined || val === null) return "₹ 0";
  return `₹ ${Number(val).toLocaleString("en-IN")}`;
}

function formatDate(dateStr?: string | null) {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function QuotationDetailsPage({
  quotationId,
  onClose,
  onOpenModal,
  modalStackLength = 1,
  initialTab,
}: QuotationDetailsPageProps) {
  const dispatch = useDispatch<AppDispatch>();
  const { currentQuotation, isLoading } = useSelector(
    (state: RootState) => state.quotations
  );
  const [isReportOpen, setIsReportOpen] = useState(false);

  useEffect(() => {
    dispatch(fetchQuotationById(quotationId));
  }, [dispatch, quotationId]);

  if (isLoading || !currentQuotation) {
    return (
      <div className="flex min-h-[20rem] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-[#1877F2]" />
      </div>
    );
  }

  const q = currentQuotation;
  const calcDetails = q.calculationDetails;
  const yearlyRows = calcDetails?.yearlyIllustration || [];

  // If initialTab is "report", show ONLY the report modal (not the details page)
  if (initialTab === "report") {
    return (
      <QuotationReportModal
        isOpen={true}
        onClose={onClose}
        quotation={q}
        reportOptions={q.reportOptions}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition-all hover:border-blue-200 hover:bg-blue-50 hover:text-[#1877F2] cursor-pointer"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Quotation Details
            </h3>
            <p className="text-xs text-slate-500">
              Ref: <span className="font-mono font-bold text-blue-700">{q.quotationRefNo}</span>
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setIsReportOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#5c67ff] to-[#3a47ff] px-4 py-2 text-sm font-semibold text-white shadow-md shadow-blue-200 transition-all hover:brightness-110 cursor-pointer"
        >
          <FileText size={14} />
          View Report
        </button>
      </div>

      {/* Proposer Info */}
      <QuotationSectionCard title="Proposer Details" icon={User}>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Name</span>
            <p className="mt-1 text-sm font-semibold text-slate-900">{q.title} {q.proposerName}</p>
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Age / Gender</span>
            <p className="mt-1 text-sm font-semibold text-slate-900">{q.age} Yrs / {q.gender}</p>
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Date of Birth</span>
            <p className="mt-1 text-sm font-semibold text-slate-900">{formatDate(q.dateOfBirth)}</p>
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Smoker</span>
            <p className="mt-1 text-sm font-semibold text-slate-900">{q.isSmoker ? "Yes" : "No"}</p>
          </div>
        </div>
      </QuotationSectionCard>

      {/* Plan Details */}
      <QuotationSectionCard title="Plan & Premium Summary" icon={Calculator}>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
          <div className="rounded-xl bg-slate-50 p-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Plan</span>
            <p className="mt-1 text-sm font-bold text-slate-900">{q.planNumber || "-"}</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Term / PPT</span>
            <p className="mt-1 text-sm font-bold text-slate-900">{q.policyTerm} / {q.ppt || q.policyTerm} Yrs</p>
          </div>
          <div className="rounded-xl bg-blue-50 p-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-500">Sum Assured</span>
            <p className="mt-1 text-sm font-bold text-blue-900">{formatCurrency(q.sumAssured)}</p>
          </div>
          <div className="rounded-xl bg-emerald-50 p-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Installment</span>
            <p className="mt-1 text-sm font-black text-emerald-800">{formatCurrency(q.installmentPremium)}</p>
          </div>
          <div className="rounded-xl bg-indigo-50 p-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-500">Maturity</span>
            <p className="mt-1 text-sm font-black text-indigo-900">{formatCurrency(q.maturityAmount)}</p>
          </div>
        </div>
      </QuotationSectionCard>

      {/* Yearly Illustration */}
      {yearlyRows.length > 0 && (
        <QuotationSectionCard title="Yearly Illustration" icon={TrendingUp}>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-2 pr-3 font-semibold">Year</th>
                  <th className="py-2 pr-3 font-semibold">Age</th>
                  <th className="py-2 pr-3 font-semibold">Premium</th>
                  <th className="py-2 pr-3 font-semibold">Cumulative</th>
                  <th className="py-2 pr-3 font-semibold">Normal Cover</th>
                  <th className="py-2 pr-3 font-semibold">Accidental Cover</th>
                  <th className="py-2 pr-3 font-semibold">Surrender Value</th>
                  <th className="py-2 font-semibold text-right">Returns</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {yearlyRows.map((r) => (
                  <tr key={r.policyYear} className="hover:bg-slate-50">
                    <td className="py-2 pr-3 font-mono">{r.policyYear}</td>
                    <td className="py-2 pr-3">{r.age}</td>
                    <td className="py-2 pr-3">{formatCurrency(r.premium)}</td>
                    <td className="py-2 pr-3 text-slate-500">{formatCurrency(r.cumulativePremium)}</td>
                    <td className="py-2 pr-3 font-semibold text-blue-900">{formatCurrency(r.normalCover)}</td>
                    <td className="py-2 pr-3 font-semibold text-indigo-900">{formatCurrency(r.accidentalCover)}</td>
                    <td className="py-2 pr-3 text-slate-500">{formatCurrency(r.surrenderValue)}</td>
                    <td className="py-2 text-right font-bold text-emerald-700">
                      {r.cashFlowReturns > 0 ? formatCurrency(r.cashFlowReturns) : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </QuotationSectionCard>
      )}

      {/* Report Modal */}
      <QuotationReportModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        quotation={q}
        reportOptions={q.reportOptions}
      />
    </div>
  );
}
