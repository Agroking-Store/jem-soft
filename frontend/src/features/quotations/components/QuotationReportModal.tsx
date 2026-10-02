"use client";

import React, { useRef, useState } from "react";
import {
  X,
  Printer,
  Download,
  ExternalLink,
  ShieldCheck,
  UserCheck,
  Calculator,
  FileSpreadsheet,
  CheckCircle2,
  TrendingUp,
  Landmark,
  BadgePercent,
  Loader2,
} from "lucide-react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import toast from "react-hot-toast";
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
  const [isDownloading, setIsDownloading] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);

  if (!isOpen || !quotation) return null;

  const handlePrint = () => {
    window.print();
  };

  // ── View PDF — opens the report in a new browser tab ──
  const handleViewPdf = async () => {
    if (!reportRef.current) return;
    setIsPreviewing(true);
    try {
      const element = reportRef.current;
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgHeight = (canvas.height * pdfWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, "PNG", 0, position, pdfWidth, imgHeight, undefined, "FAST");
      heightLeft -= pdfHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, pdfWidth, imgHeight, undefined, "FAST");
        heightLeft -= pdfHeight;
      }

      // Open in new tab (same pattern as pre-sales reports)
      const blobUrl = pdf.output("bloburl") as unknown as string;
      window.open(blobUrl, "_blank");
    } catch (err: any) {
      console.error("PDF preview failed:", err);
      toast.error("Failed to open PDF preview.", {
        id: "pdf-preview-error",
      });
    } finally {
      setIsPreviewing(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!reportRef.current) return;
    setIsDownloading(true);
    const toastId = toast.loading("Preparing PDF download...");

    try {
      const element = reportRef.current;
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgHeight = (canvas.height * pdfWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, "PNG", 0, position, pdfWidth, imgHeight, undefined, "FAST");
      heightLeft -= pdfHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, pdfWidth, imgHeight, undefined, "FAST");
        heightLeft -= pdfHeight;
      }

      pdf.save(`LIC_Quotation_${quotation.quotationRefNo || "Report"}.pdf`);
      toast.success("Quotation PDF downloaded successfully!", { id: toastId });
    } catch (err: any) {
      console.error("PDF generation failed:", err);
      toast.error("Failed to generate PDF. You can also use Print to Save as PDF.", {
        id: toastId,
      });
    } finally {
      setIsDownloading(false);
    }
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 print:p-0 overflow-y-auto backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl my-6 flex flex-col max-h-[94vh] border border-slate-200 print:border-none print:shadow-none print:max-h-none print:m-0 print:w-full">
        {/* Modal Header (Hidden during print) */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/80 rounded-t-2xl print:hidden">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-b from-[#1877F2] to-blue-700 text-white shadow-md shadow-blue-200">
              <FileSpreadsheet size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Quotation &amp; Benefits Illustration Report
              </h2>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-slate-500 font-medium">Ref No:</span>
                <span className="px-2 py-0.5 text-xs font-mono font-bold bg-blue-100 text-blue-800 rounded-md">
                  {quotation.quotationRefNo}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleViewPdf}
              disabled={isPreviewing}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg shadow-sm transition-all cursor-pointer"
            >
              {isPreviewing ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <ExternalLink size={16} />
              )}
              {isPreviewing ? "Opening..." : "View in Browser"}
            </button>

            <button
              onClick={handleDownloadPdf}
              disabled={isDownloading}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-lg shadow-sm transition-all cursor-pointer"
            >
              {isDownloading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Download size={16} />
              )}
              {isDownloading ? "Generating PDF..." : "Download PDF"}
            </button>

            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg shadow-sm transition-all cursor-pointer"
            >
              <Printer size={16} /> Print
            </button>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Printable & Downloadable Report Body */}
        <div
          ref={reportRef}
          className="flex-1 overflow-y-auto p-8 space-y-6 print:p-4 print:space-y-4 bg-white text-slate-800 font-sans"
        >
          {/* Header Brand Banner */}
          <div className="border-b-2 border-blue-600 pb-4 flex justify-between items-end">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center text-white font-black italic text-xs">
                  JEM
                </div>
                <span className="text-xl font-black text-blue-900 tracking-tight">
                  JEM SOFT INSURANCE SERVICES
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Life Insurance Corporation of India (LIC) Authorized Quote
              </p>
            </div>
            <div className="text-right">
              <span className="inline-block px-2.5 py-1 text-xs font-bold uppercase rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                {quotation.productType.replace(/_/g, " ")}
              </span>
              <p className="text-[11px] text-slate-400 mt-1">
                Generated: {formatDate(new Date().toISOString())}
              </p>
            </div>
          </div>

          {/* 1. Cover Page Section */}
          {reportOptions.coverPage && (
            <div className="rounded-xl border border-blue-100 bg-[#f0f7ff] p-5 shadow-xs">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div>
                  <span className="text-slate-500 block mb-0.5 font-medium">
                    Proposer / Life Assured
                  </span>
                  <span className="font-bold text-slate-900 text-sm">
                    {quotation.title} {quotation.proposerName}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block mb-0.5 font-medium">
                    Age / Gender
                  </span>
                  <span className="font-bold text-slate-900 text-sm">
                    {quotation.age} Yrs / {quotation.gender}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block mb-0.5 font-medium">
                    Quotation Date
                  </span>
                  <span className="font-bold text-slate-900 text-sm">
                    {formatDate(quotation.quotationDate)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block mb-0.5 font-medium">
                    Commencement Date
                  </span>
                  <span className="font-bold text-slate-900 text-sm">
                    {formatDate(quotation.commencementDate)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* 2. Key Plan & Premium Highlights Card */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <Calculator size={16} className="text-blue-600" /> Plan Details &amp; Premium Summary
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-500 block text-[11px]">Plan No / Term / PPT</span>
                <span className="font-bold text-slate-900 text-sm">
                  {quotation.planNumber || "714"} / {quotation.policyTerm} / {quotation.ppt || quotation.policyTerm} Yrs
                </span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-500 block text-[11px]">Sum Assured</span>
                <span className="font-bold text-blue-900 text-sm">
                  {formatCurrency(quotation.sumAssured)}
                </span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-500 block text-[11px]">Basic Yearly</span>
                <span className="font-bold text-slate-800 text-sm">
                  {formatCurrency(quotation.basicPremium)}
                </span>
              </div>
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                <span className="text-emerald-700 block text-[11px] font-semibold">
                  Installment ({quotation.premiumMode})
                </span>
                <span className="font-black text-emerald-800 text-sm">
                  {formatCurrency(quotation.installmentPremium || quotation.totalPremium)}
                </span>
              </div>
              <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
                <span className="text-blue-700 block text-[11px] font-semibold">
                  Est. Maturity Value
                </span>
                <span className="font-black text-blue-900 text-sm">
                  {formatCurrency(quotation.maturityAmount)}
                </span>
              </div>
            </div>
          </div>

          {/* 3. Tax Breakup Section */}
          {reportOptions.taxBreakup && (
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <BadgePercent size={16} className="text-emerald-600" /> Income Tax Savings (Section 80C &amp; 10(10D))
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs bg-emerald-50/50 p-4 rounded-xl border border-emerald-100">
                <div>
                  <span className="text-slate-600 block">Sec. 80C Investment Limit</span>
                  <span className="font-bold text-slate-900 text-sm">{formatCurrency(quotation.sec80CLimit)}</span>
                </div>
                <div>
                  <span className="text-slate-600 block">Tax Bracket / Slab</span>
                  <span className="font-bold text-slate-900 text-sm">{quotation.taxSlabPercentage}%</span>
                </div>
                <div>
                  <span className="text-slate-600 block">Annual Tax Savings Estimate</span>
                  <span className="font-black text-emerald-800 text-sm">
                    {formatCurrency(calcDetails?.taxSavingsAmount || (quotation.basicPremium * (quotation.taxSlabPercentage / 100)))}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* 4. Benefits Illustration Table */}
          {(reportOptions.benefitsIllustration || reportOptions.benefitsForecast) && (
            <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-xs">
              <div className="bg-slate-50/90 px-5 py-3 border-b border-slate-200 flex justify-between items-center">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                  <TrendingUp size={16} className="text-blue-600" /> Year-by-Year Benefit &amp; Risk Cover Illustration ({quotation.bonusScenario})
                </h3>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-gradient-to-r from-blue-50/60 to-indigo-50/60 border-b border-blue-100 text-blue-950 font-semibold">
                      <th className="py-2.5 px-3">Year</th>
                      <th className="py-2.5 px-3">Age</th>
                      <th className="py-2.5 px-3">Annual Premium</th>
                      <th className="py-2.5 px-3">Cumulative Paid</th>
                      <th className="py-2.5 px-3">Normal Life Cover</th>
                      <th className="py-2.5 px-3">Accidental Cover</th>
                      <th className="py-2.5 px-3">Surrender Value</th>
                      <th className="py-2.5 px-3 text-right">Returns / Maturity</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {yearlyRows.length > 0 ? (
                      yearlyRows.map((r) => (
                        <tr key={r.policyYear} className="hover:bg-blue-50/30 transition-colors">
                          <td className="py-2 px-3 font-mono font-medium">{r.policyYear}</td>
                          <td className="py-2 px-3">{r.age}</td>
                          <td className="py-2 px-3">{formatCurrency(r.premium)}</td>
                          <td className="py-2 px-3 text-slate-600">{formatCurrency(r.cumulativePremium)}</td>
                          <td className="py-2 px-3 font-semibold text-blue-900">{formatCurrency(r.normalCover)}</td>
                          <td className="py-2 px-3 font-semibold text-indigo-900">{formatCurrency(r.accidentalCover)}</td>
                          <td className="py-2 px-3 text-slate-600">{formatCurrency(r.surrenderValue)}</td>
                          <td className="py-2 px-3 text-right font-bold text-emerald-700">
                            {r.cashFlowReturns > 0 ? formatCurrency(r.cashFlowReturns) : "-"}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={8} className="py-6 text-center text-slate-400">
                          Illustration available for calculated scenarios.
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
              <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 text-xs space-y-2">
                <h4 className="font-bold text-slate-800 flex items-center gap-1.5">
                  <UserCheck size={16} className="text-blue-600" /> Medical &amp; Underwriting Requirements
                </h4>
                <p className="text-slate-600 leading-relaxed">
                  • Age: {quotation.age} Yrs | Sum Assured: {formatCurrency(quotation.sumAssured)}
                  <br />
                  • Standard non-medical eligibility applies for standard healthy lives.
                  <br />
                  • Smoker Status: {quotation.isSmoker ? "Smoker" : "Non-Smoker"}.
                </p>
              </div>
            )}

            {reportOptions.agentsCopy && (
              <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 text-xs space-y-2">
                <h4 className="font-bold text-slate-800 flex items-center gap-1.5">
                  <ShieldCheck size={16} className="text-blue-600" /> Confidential Agent Summary
                </h4>
                <p className="text-slate-600 leading-relaxed">
                  • Quotation Ref: {quotation.quotationRefNo}
                  <br />
                  • Proposer: {quotation.proposerName}
                  <br />
                  • Ready for direct conversion to official LIC proposal form.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between rounded-b-2xl print:hidden">
          <p className="text-xs text-slate-500 font-medium">
            Click "View in Browser" to open the report in a new tab, or "Download PDF" to save it.
          </p>
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg shadow-xs transition-all cursor-pointer"
          >
            Close Report
          </button>
        </div>
      </div>
    </div>
  );
};
