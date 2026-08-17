"use client";

import { useRef, useState, useMemo } from "react";
import { ArrowLeft, Download } from "lucide-react";
import { CashFlowChartFormData } from "./CashFlowChartForm";
import html2canvas from "html2canvas-pro";
import jsPDF from "jspdf";
import toast from "react-hot-toast";

interface CashFlowChartReportViewProps {
  formData: CashFlowChartFormData;
  policies: any[];
  customers: any[];
  onBackToForm: () => void;
}

// Bonus placeholders — same caveat as the other reports: replace with your real rate table.
const LOYALTY_ADDITION_RATE_PER_1000 = 20;
const FAB_RATE_PER_1000 = 15;

function fmtDate(d: Date | string | null | undefined) {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  if (isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-GB");
}

export default function CashFlowChartReportView({
  formData,
  policies: rawPolicies = [],
  onBackToForm,
}: CashFlowChartReportViewProps) {
  const reportRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  const yearRows = useMemo(() => {
    const fromDate = formData.cashFlowFromDate ? new Date(formData.cashFlowFromDate) : null;
    const toDate = formData.cashFlowToDate ? new Date(formData.cashFlowToDate) : null;
    if (fromDate) fromDate.setHours(0, 0, 0, 0);
    if (toDate) toDate.setHours(23, 59, 59, 999);

    const selectedAgencies = (formData.appliedFilters || []).filter((f) => f.type === "Agencies").map((f) => f.name.toLowerCase());
    const selectedStatuses = (formData.appliedFilters || []).filter((f) => f.type === "Policy Status").map((f) => f.name.toLowerCase());
    const selectedModes = (formData.appliedFilters || []).filter((f) => f.type === "Payment Modes").map((f) => f.name.toLowerCase());

    const selectedGroupCodesOrNames =
      formData.sortingOption === "groupsWise"
        ? (formData.selectedGroups || []).map((g) => g.groupCode.toLowerCase())
        : (formData.sortingFilterSelection?.selectedItems || []).map((item) => (item.code || item.name).toLowerCase());

    const usable = rawPolicies.filter((p) => {
      const rawStatus = (p.status?.statusName || p.statusName || "Inforce").toLowerCase();
      if (selectedStatuses.length > 0 && !selectedStatuses.some((st) => rawStatus.includes(st))) return false;

      const agencyName = (p.agentCode || p.agency?.agencyName || p.agencyName || "").toLowerCase();
      if (selectedAgencies.length > 0 && !selectedAgencies.some((ag) => agencyName.includes(ag))) return false;

      const modeName = (p.premiumMode?.modeName || "").toLowerCase();
      if (selectedModes.length > 0 && !selectedModes.some((m) => modeName.includes(m))) return false;

      const isRecordOnly = Boolean(p.isRecordOnly);
      if (isRecordOnly && !formData.printOptions.includeRecordOnlyPolicies) return false;

      // Group/Sorting Filter match
      if (selectedGroupCodesOrNames.length > 0) {
        const gCode = (p.customer?.groupCode || "").toLowerCase();
        const gHeadName = (p.customer?.groupName || p.customer?.name || "").toLowerCase();
        const polNo = (p.policyNumber || "").toLowerCase();
        const planNo = (p.product?.planNumber || "").toLowerCase();
        const brnCode = (p.branch?.branchCode || p.branchNo || "").toLowerCase();

        const matches = selectedGroupCodesOrNames.some(
          (sc) => gCode.includes(sc) || gHeadName.includes(sc) || polNo.includes(sc) || planNo.includes(sc) || brnCode.includes(sc)
        );
        if (!matches) return false;
      }

      // Filter by maturity date falling within the cash flow date range (if specified)
      const maturityRaw = p.maturityDate;
      if (!maturityRaw) return false;
      const md = new Date(maturityRaw);
      if (isNaN(md.getTime())) return false;
      if (fromDate && md < fromDate) return false;
      if (toDate && md > toDate) return false;

      return true;
    });

    if (usable.length === 0) return [];

    const yearMap: { [year: string]: number } = {};
    usable.forEach((p) => {
      const md = new Date(p.maturityDate);

      const sumAssured = Number(p.premium?.sumAssured || p.sumAssured || 0);
      const policyTermYears = Number(p.policyTerm || 20);
      const bonusRate = formData.calculationOptions.includeLoyaltyAddition ? LOYALTY_ADDITION_RATE_PER_1000 : 0;
      const fabRate = formData.calculationOptions.includeFab ? FAB_RATE_PER_1000 : 0;
      const projectedValue = sumAssured + Math.round((sumAssured / 1000) * (bonusRate + fabRate) * policyTermYears);

      const yearKey =
        formData.yearBasis === "financialYear"
          ? `FY ${md.getMonth() >= 3 ? md.getFullYear() : md.getFullYear() - 1}-${(md.getMonth() >= 3 ? md.getFullYear() + 1 : md.getFullYear()).toString().slice(-2)}`
          : md.getFullYear().toString();

      yearMap[yearKey] = (yearMap[yearKey] || 0) + projectedValue;
    });

    return Object.entries(yearMap)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([year, amount]) => ({ year, amount }));
  }, [rawPolicies, formData]);

  const grandTotal = yearRows.reduce((acc, r) => acc + r.amount, 0);
  const maxAmount = Math.max(1, ...yearRows.map((r) => r.amount));

  const handleDownloadPDF = async () => {
    if (!reportRef.current) return;
    setIsExporting(true);
    const toastId = toast.loading("Generating PDF report...");
    try {
      const canvas = await html2canvas(reportRef.current, { scale: 2, useCORS: true, allowTaint: true, backgroundColor: "#ffffff", logging: false });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("l", "mm", "a4");
      const imgWidth = 297;
      const pageHeight = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;
      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      pdf.save(`Cash_Flow_Chart_${formData.reportDate || "Report"}.pdf`);
      toast.success("PDF downloaded successfully!", { id: toastId });
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Failed to generate PDF.", { id: toastId });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-[#0B1220] p-4 rounded-2xl border border-slate-800 shadow-xl print:hidden">
        <button onClick={onBackToForm} className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-slate-300 bg-white/10 rounded-xl hover:bg-white/20 transition uppercase tracking-wider">
          <ArrowLeft size={16} />
          <span>Edit Filters</span>
        </button>
        <button
          onClick={handleDownloadPDF}
          disabled={isExporting || yearRows.length === 0}
          className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-[#B8873A] to-[#D9AE63] text-[#0B1220] font-bold text-xs rounded-xl shadow-lg hover:brightness-105 transition disabled:opacity-50 uppercase tracking-wider"
        >
          <Download size={16} />
          <span>{isExporting ? "Exporting..." : "Download PDF"}</span>
        </button>
      </div>

      <div ref={reportRef} className="bg-white p-8 rounded-2xl border border-slate-300 shadow-xl text-slate-900 font-sans max-w-5xl mx-auto space-y-4 print:p-0 print:border-none print:shadow-none">
        <div className="flex justify-between items-start border-b-2 border-[#0B1220] pb-3">
          <div className="space-y-0.5">
            <h1 className="text-2xl font-bold text-[#0B1220] tracking-tight">Jayant Mahabole</h1>
            <p className="text-xs font-semibold text-slate-700">MBA in Insurance & Finance</p>
            <p className="text-[11px] text-slate-600 max-w-xs leading-tight">84/2, Darpan Bldg., 201 Sarang Society, Sahakarnagar No. 2 Parvati Pune 411009</p>
            <p className="text-[11px] text-slate-600 font-mono">9822452896</p>
            <p className="text-[11px] text-slate-600">office@jayantmahbole.com</p>
          </div>
          <div className="h-16 w-36 bg-[#0B1220] rounded-bl-3xl p-3 flex flex-col justify-end text-right">
            <span className="text-[10px] font-serif font-bold text-[#E8C77A] uppercase tracking-widest">LIC INDIA</span>
          </div>
        </div>

        <div className="bg-[#0B1220] text-white rounded-lg px-4 py-2.5 flex items-center justify-between border-l-4 border-[#B8873A]">
          <h2 className="text-base font-serif font-bold text-[#E8C77A] uppercase tracking-wider">Cash Flow Chart</h2>
          <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
            {formData.yearBasis === "financialYear" ? "Financial Year" : "Calendar Year"}
          </span>
        </div>

        <div className="text-[11px] font-semibold text-slate-800 px-1 flex justify-between">
          <span>As on {fmtDate(formData.reportDate) || fmtDate(new Date())}</span>
          <span>Maturity from {fmtDate(formData.cashFlowFromDate)} to {fmtDate(formData.cashFlowToDate)}</span>
        </div>

        {yearRows.length === 0 ? (
          <div className="py-16 text-center bg-slate-50 rounded-xl border border-slate-200 p-8 space-y-2">
            <h3 className="font-bold text-slate-800 text-sm">No Policies Found</h3>
            <p className="text-xs text-slate-500">
              No policies with maturity dates in the selected date range were found. Please adjust your filter criteria.
            </p>
          </div>
        ) : (
          <>
            <table className="w-full text-left text-[11px] border-collapse">
              <thead>
                <tr className="bg-slate-100 border-y-2 border-slate-800 font-bold text-slate-900">
                  <th className="py-2 px-2">Year</th>
                  <th className="py-2 px-2 text-right">Projected Cash Inflow (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {yearRows.map((row) => (
                  <tr key={row.year}>
                    <td className="py-1.5 px-2 font-semibold">{row.year}</td>
                    <td className="py-1.5 px-2 text-right font-mono">{row.amount.toLocaleString("en-IN")}</td>
                  </tr>
                ))}
                <tr className="bg-slate-100 border-t-2 border-slate-700 font-bold">
                  <td className="py-2 px-2">Grand Total</td>
                  <td className="py-2 px-2 text-right font-mono text-[#0B1220]">{grandTotal.toLocaleString("en-IN")}</td>
                </tr>
              </tbody>
            </table>

            {formData.printOptions.showGraphs && (
              <div className="pt-4 overflow-x-auto">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Yearwise Cash Flow</h3>
                <svg viewBox={`0 0 ${Math.max(500, yearRows.length * 75 + 40)} 220`} className="w-full max-w-3xl h-auto">
                  {yearRows.map((row, i) => {
                    const barHeight = Math.max(4, (row.amount / maxAmount) * 150);
                    const x = 25 + i * 75;
                    const formattedValue = row.amount >= 100000 ? `${(row.amount / 100000).toFixed(1)}L` : `${(row.amount / 1000).toFixed(0)}k`;
                    return (
                      <g key={row.year}>
                        <rect x={x} y={190 - barHeight} width={42} height={barHeight} fill="#B8873A" rx={3} />
                        <text x={x + 21} y={205} textAnchor="middle" fontSize="9" fill="#334155" fontWeight="600">
                          {row.year}
                        </text>
                        <text x={x + 21} y={183 - barHeight} textAnchor="middle" fontSize="8" fill="#0B1220" fontWeight="bold">
                          {formattedValue}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>
            )}
          </>
        )}

        <div className="pt-6 border-t border-slate-300 space-y-1 text-[10px] text-slate-700 font-medium">
          <p>
            Loyalty Addition &amp; F.A.B figures are estimated based on bonus rates (₹{LOYALTY_ADDITION_RATE_PER_1000}/1000 SA LA and ₹{FAB_RATE_PER_1000}/1000 SA FAB) — replace with your declared bonus rate table for accurate figures.
          </p>
          <div className="flex justify-between items-center pt-2 font-mono text-[9px] text-slate-500 border-t border-slate-200">
            <span>Generated via Cash Flow Chart Engine</span>
            <span>Report Date: {fmtDate(formData.reportDate)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}