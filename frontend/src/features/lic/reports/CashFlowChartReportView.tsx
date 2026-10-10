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
      const canvas = await html2canvas(reportRef.current, { scale: 1.25, useCORS: true, allowTaint: true, backgroundColor: "#ffffff", logging: false });
      const pdf = new jsPDF({ orientation: "l", unit: "mm", format: "a4", compress: true });
      const pageWidthMm = 297;
      const pageHeightMm = 210;
      const pxPerMm = canvas.width / pageWidthMm;
      const pageHeightPx = Math.floor(pageHeightMm * pxPerMm);

      // Each PDF page gets ONLY its own slice, compressed as JPEG (keeps file small)
      let renderedPx = 0;
      let pageIndex = 0;
      while (renderedPx < canvas.height - 5) {
        const sliceHeightPx = Math.min(pageHeightPx, canvas.height - renderedPx);
        const pageCanvas = document.createElement("canvas");
        pageCanvas.width = canvas.width;
        pageCanvas.height = sliceHeightPx;
        const ctx = pageCanvas.getContext("2d");
        if (!ctx) throw new Error("Canvas context not available");
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
        ctx.drawImage(canvas, 0, renderedPx, canvas.width, sliceHeightPx, 0, 0, canvas.width, sliceHeightPx);
        const imgData = pageCanvas.toDataURL("image/jpeg", 0.75);
        if (pageIndex > 0) pdf.addPage();
        pdf.addImage(imgData, "JPEG", 0, 0, pageWidthMm, sliceHeightPx / pxPerMm, undefined, "FAST");
        renderedPx += sliceHeightPx;
        pageIndex += 1;
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

  const BLACK = "#000";
  const thStyle = {
    borderTop: `1px solid ${BLACK}`,
    borderBottom: `1px solid ${BLACK}`,
    verticalAlign: "bottom",
  };
  const totalValueStyle = {
    display: "inline-block",
    borderTop: `1px solid ${BLACK}`,
    borderBottom: `3px double ${BLACK}`,
    padding: "1px 2px",
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm print:hidden">
        <div className="flex items-center gap-3">
          <button onClick={onBackToForm} className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-slate-500 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 transition uppercase tracking-wider">
            <ArrowLeft size={16} />
            <span>Edit Filters</span>
          </button>
          <span className="text-xs bg-blue-50 text-[#1877F2] font-bold px-3 py-1 rounded-full border border-blue-200 uppercase tracking-wider">
            Cash Flow Chart
          </span>
        </div>
        <button
          onClick={handleDownloadPDF}
          disabled={isExporting || yearRows.length === 0}
          className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-[#5c67ff] to-[#3a47ff] text-white font-bold text-xs rounded-xl shadow-md shadow-blue-200 hover:brightness-110 transition disabled:opacity-50 uppercase tracking-wider"
        >
          <Download size={16} />
          <span>{isExporting ? "Exporting..." : "Download PDF"}</span>
        </button>
      </div>

      {/* Printable Statement — plain LIC-style */}
      <div
        ref={reportRef}
        style={{ fontFamily: "Arial, Helvetica, sans-serif", color: BLACK }}
        className="bg-white px-6 py-6 border border-slate-300 shadow-xl max-w-5xl mx-auto text-[11px] leading-snug print:p-0 print:border-none print:shadow-none"
      >
        {/* Title line */}
        <div className="flex justify-between items-end pb-1 text-[11px] font-semibold">
          <span>
            Cash Flow Chart ({formData.yearBasis === "financialYear" ? "Financial Year" : "Calendar Year"}) as on{" "}
            {fmtDate(formData.reportDate) || fmtDate(new Date())}
          </span>
          <span>
            Maturity between {fmtDate(formData.cashFlowFromDate)} and {fmtDate(formData.cashFlowToDate)}
          </span>
        </div>

        {yearRows.length === 0 ? (
          <div className="mt-6 py-16 text-center bg-slate-50 rounded-xl border border-slate-200 p-8 space-y-2">
            <h3 className="font-bold text-slate-800 text-sm">No Policies Found</h3>
            <p className="text-xs text-slate-500">
              No policies with maturity dates in the selected date range were found. Please adjust your filter criteria.
            </p>
          </div>
        ) : (
          <>
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="font-bold">
                  <th className="px-2 py-1.5" style={thStyle}>Year</th>
                  <th className="px-2 py-1.5 text-right" style={thStyle}>Projected Cash Inflow (₹)</th>
                </tr>
              </thead>
              <tbody>
                {yearRows.map((row) => (
                  <tr key={row.year}>
                    <td className="px-2 py-1 font-semibold">{row.year}</td>
                    <td className="px-2 py-1 text-right font-mono">{row.amount.toLocaleString("en-IN")}</td>
                  </tr>
                ))}
                <tr className="font-bold">
                  <td className="px-2 pt-2 pb-1">Grand Total :</td>
                  <td className="px-2 pt-2 pb-1 text-right font-mono">
                    <span style={totalValueStyle}>{grandTotal.toLocaleString("en-IN")}</span>
                  </td>
                </tr>
                <tr>
                  <td colSpan={2} style={{ borderBottom: `1px solid ${BLACK}`, height: 6 }}></td>
                </tr>
              </tbody>
            </table>

            {formData.printOptions.showGraphs && (
              <div className="pt-5 overflow-x-auto">
                <h3 className="text-[11px] font-bold mb-2">Yearwise Cash Flow</h3>
                <svg viewBox={`0 0 ${Math.max(500, yearRows.length * 75 + 40)} 220`} className="w-full max-w-3xl h-auto">
                  <line x1={15} y1={190} x2={Math.max(500, yearRows.length * 75 + 40) - 10} y2={190} stroke="#000" strokeWidth={1} />
                  {yearRows.map((row, i) => {
                    const barHeight = Math.max(4, (row.amount / maxAmount) * 150);
                    const x = 25 + i * 75;
                    const formattedValue = row.amount >= 100000 ? `${(row.amount / 100000).toFixed(1)}L` : `${(row.amount / 1000).toFixed(0)}k`;
                    return (
                      <g key={row.year}>
                        <rect x={x} y={190 - barHeight} width={42} height={barHeight} fill="#4b5563" />
                        <text x={x + 21} y={205} textAnchor="middle" fontSize="9" fill="#000" fontWeight="600">
                          {row.year}
                        </text>
                        <text x={x + 21} y={183 - barHeight} textAnchor="middle" fontSize="8" fill="#000" fontWeight="bold">
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

        <div className="pt-5 mt-4 space-y-1 text-[9px]" style={{ borderTop: `1px solid ${BLACK}` }}>
          <p>
            Loyalty Addition &amp; F.A.B figures are estimated based on bonus rates (₹{LOYALTY_ADDITION_RATE_PER_1000}/1000 SA LA and ₹{FAB_RATE_PER_1000}/1000 SA FAB) — replace with your declared bonus rate table for accurate figures.
          </p>
          <div className="flex justify-between font-mono text-[8px] pt-1">
            <span>Generated via Cash Flow Chart Engine</span>
            <span>Report Date: {fmtDate(formData.reportDate)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
