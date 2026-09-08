"use client";

import { useRef, useState, useMemo } from "react";
import {
  ArrowLeft,
  Download,
  Printer,
  PieChart,
  IndianRupee,
  ShieldCheck,
  TrendingDown,
  Layers,
} from "lucide-react";
import html2canvas from "html2canvas-pro";
import jsPDF from "jspdf";
import toast from "react-hot-toast";
import {
  CommissionSummaryFormData,
  CommissionSummaryRow,
  generateCommissionSummaryRows,
  calculateCommissionSummaryTotals,
} from "./commissionSummaryData";

interface CommissionSummaryReportViewProps {
  formData: CommissionSummaryFormData;
  policies?: any[];
  onBackToForm: () => void;
}

export default function CommissionSummaryReportView({
  formData,
  policies = [],
  onBackToForm,
}: CommissionSummaryReportViewProps) {
  const reportRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  // Active agency display name
  const agencyDisplayName = useMemo(() => {
    const agencyFilter = formData.dataFilters?.find((f) => f.type === "Agencies");
    if (agencyFilter) {
      return agencyFilter.name;
    }
    return "Jayant Mahabole";
  }, [formData.dataFilters]);

  // Selected agency filter list
  const selectedAgencyNames = useMemo(() => {
    return (formData.dataFilters || [])
      .filter((f) => f.type === "Agencies")
      .map((f) => f.name);
  }, [formData.dataFilters]);

  // Generate commission summary rows
  const summaryRows: CommissionSummaryRow[] = useMemo(() => {
    return generateCommissionSummaryRows(policies, selectedAgencyNames, formData);
  }, [policies, selectedAgencyNames, formData]);

  // Grand totals
  const totals = useMemo(() => {
    return calculateCommissionSummaryTotals(summaryRows);
  }, [summaryRows]);

  const handleDownloadPDF = async () => {
    if (!reportRef.current) return;
    setIsExporting(true);
    const toastId = toast.loading("Generating Commission Summary PDF...");

    const elem = reportRef.current;
    const originalWidth = elem.style.width;

    try {
      elem.style.width = "950px";

      const canvas = await html2canvas(elem, {
        scale: 2.2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        logging: false,
      });

      elem.style.width = originalWidth;

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("l", "mm", "a4"); // Landscape for multi-column summary
      const imgWidth = 297;
      const pageHeight = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 5) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      const fileMode = formData.reportMode === "bill-code" ? "BillCode" : "ReceiptDate";
      pdf.save(`Commission_Summary_${fileMode}_${formData.dateFrom.replace(/\//g, "-")}.pdf`);
      toast.success("Commission Summary PDF downloaded successfully!", { id: toastId });
    } catch (err: unknown) {
      console.error(err);
      elem.style.width = originalWidth;
      toast.error((err as Error)?.message || "Failed to generate PDF.", { id: toastId });
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Top Action Control Bar (Blue and White theme, Print Hidden) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-2xl border border-blue-100 bg-white p-5 shadow-xs print:hidden">
        <button
          type="button"
          onClick={onBackToForm}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
        >
          <ArrowLeft size={15} />
          Edit Report Filters
        </button>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
          >
            <Printer size={15} />
            Print
          </button>
          <button
            type="button"
            onClick={handleDownloadPDF}
            disabled={isExporting}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#5c67ff] to-[#3a47ff] px-6 py-2.5 text-xs font-semibold text-white shadow-md shadow-blue-200 hover:brightness-110 active:scale-[0.98] transition disabled:opacity-60"
          >
            <Download size={15} />
            {isExporting ? "Exporting PDF..." : "Download PDF"}
          </button>
        </div>
      </div>

      {/* Summary KPI Cards (Blue and White theme, Print Hidden) */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 print:hidden">
        <div className="rounded-2xl border border-blue-100 bg-white p-4 shadow-xs flex items-center gap-3.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#1877F2]">
            <Layers size={20} />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Total Settlements
            </span>
            <div className="text-lg font-bold text-slate-900 mt-0.5">
              {summaryRows.length} Cycles
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-blue-100 bg-white p-4 shadow-xs flex items-center gap-3.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <IndianRupee size={20} />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Gross Commission
            </span>
            <div className="text-lg font-bold text-emerald-600 mt-0.5">
              ₹ {totals.total.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-blue-100 bg-white p-4 shadow-xs flex items-center gap-3.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
            <TrendingDown size={20} />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Total Deductions (TDS)
            </span>
            <div className="text-lg font-bold text-rose-600 mt-0.5">
              ₹ {totals.totDedAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-blue-100 bg-white p-4 shadow-xs flex items-center gap-3.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#1877F2]">
            <ShieldCheck size={20} />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Net Commission Paid
            </span>
            <div className="text-lg font-bold text-[#1877F2] mt-0.5">
              ₹ {totals.netAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </div>
          </div>
        </div>
      </div>

      {/* Printable Report Canvas Matching Image 2 Sample PDF */}
      <div className="overflow-x-auto bg-slate-50 p-2 sm:p-6 rounded-2xl border border-blue-100 flex justify-center">
        <div
          ref={reportRef}
          style={{ width: "950px" }}
          className="bg-white p-8 shadow-sm rounded-lg text-slate-900 font-sans space-y-4 print:shadow-none print:p-0 print:m-0 relative"
        >
          {/* Header Pink Geometric Accent Banner (as seen in Image 2) */}
          <div className="absolute top-0 right-0 w-64 h-24 pointer-events-none overflow-hidden">
            <div className="w-full h-full bg-[#fbe8eb] -skew-y-12 transform origin-top-right rounded-bl-3xl opacity-70" />
          </div>

          {/* 1. Agency Letterhead */}
          <div className="relative z-10 space-y-0.5 text-xs text-slate-800">
            <h1 className="text-base font-bold text-slate-900">
              {agencyDisplayName}
            </h1>
            <p className="font-semibold text-slate-700">MBA in Insurance & Finance</p>
            <p className="text-slate-600">84/2, Darpan Bldg., 201 Sarang Society,</p>
            <p className="text-slate-600">Sahakarnagar No. 2 Parvati Pune 411009,</p>
            <p className="text-slate-600">9822452896,</p>
            <p className="text-slate-600">office@jayantmahbole.com,</p>
          </div>

          {/* Divider */}
          <div className="border-b-2 border-slate-900 pt-2" />

          {/* 2. Report Title Band Matching Image 2 */}
          <div className="bg-[#f5ebd9] border border-slate-300 px-3 py-1.5 flex justify-between items-center text-xs font-bold text-slate-900">
            <span className="text-sm">Commission Summary</span>
            <span>
              {formData.reportMode === "bill-code"
                ? "Bill Codewise"
                : "Receipt Datewise"}
            </span>
          </div>

          {/* 3. Agency & Date Sub-header */}
          <div className="space-y-1 text-xs font-semibold text-slate-900">
            <div>Agency : {agencyDisplayName}</div>
            <div>Date : {formData.reportDate}</div>
            <div className="flex justify-between items-center border-t border-b border-slate-900 py-1 font-bold">
              <span>
                Commission Summary (
                {formData.reportMode === "bill-code" ? "Bill Code" : "Receipt Date"} wise)
                between {formData.dateFrom} and {formData.dateTo}
              </span>
              <span>Page 1 of 1</span>
            </div>
          </div>

          {/* 4. Multi-column Summary Table Matching Image 2 */}
          <div className="overflow-x-auto pt-1">
            <table className="w-full text-left text-[11px] border-collapse">
              <thead>
                <tr className="border-b border-slate-900 text-slate-900 font-bold">
                  <th rowSpan={2} className="py-1 px-1 align-bottom text-left border-r border-slate-200">
                    Receipt Date
                  </th>
                  <th rowSpan={2} className="py-1 px-1 align-bottom text-left border-r border-slate-200">
                    Bill Code
                  </th>
                  <th colSpan={7} className="py-0.5 px-1 text-center border-b border-slate-400 border-r border-slate-200">
                    Commission Received
                  </th>
                  <th rowSpan={2} className="py-1 px-1 align-bottom text-right border-r border-slate-200">
                    Total
                  </th>
                  <th rowSpan={2} className="py-1 px-1 align-bottom text-right border-r border-slate-200">
                    Tot. Ded. Amount
                  </th>
                  <th rowSpan={2} className="py-1 px-1 align-bottom text-right">
                    Net Amount
                  </th>
                </tr>
                <tr className="border-b border-slate-900 text-slate-800 font-bold text-[10px]">
                  <th className="py-1 px-1 text-right">1st Comm.</th>
                  <th className="py-1 px-1 text-right">1st Year</th>
                  <th className="py-1 px-1 text-right">2nd/3rd Year</th>
                  <th className="py-1 px-1 text-right">Sub-Year</th>
                  <th className="py-1 px-1 text-right">Bon. Comn.</th>
                  <th className="py-1 px-1 text-right">Misc. Rcpt.</th>
                  <th className="py-1 px-1 text-right border-r border-slate-200">Recoverie</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-normal">
                {summaryRows.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-1 px-1 font-mono border-r border-slate-100 text-left">
                      {row.receiptDate}
                    </td>
                    <td className="py-1 px-1 font-mono border-r border-slate-100 text-left">
                      {row.billCode}
                    </td>
                    <td className="py-1 px-1 text-right font-mono">
                      {row.firstComm.toFixed(2)}
                    </td>
                    <td className="py-1 px-1 text-right font-mono">
                      {row.firstYear.toFixed(2)}
                    </td>
                    <td className="py-1 px-1 text-right font-mono">
                      {row.secondThirdYear.toFixed(2)}
                    </td>
                    <td className="py-1 px-1 text-right font-mono">
                      {row.subYear.toFixed(2)}
                    </td>
                    <td className="py-1 px-1 text-right font-mono">
                      {row.bonusComm.toFixed(2)}
                    </td>
                    <td className="py-1 px-1 text-right font-mono">
                      {row.miscRcpt.toFixed(2)}
                    </td>
                    <td className="py-1 px-1 text-right font-mono border-r border-slate-100 text-rose-600">
                      {row.recoveries.toFixed(2)}
                    </td>
                    <td className="py-1 px-1 text-right font-mono font-semibold border-r border-slate-100">
                      {row.total.toFixed(2)}
                    </td>
                    <td className="py-1 px-1 text-right font-mono text-rose-600 border-r border-slate-100">
                      {row.totDedAmount.toFixed(2)}
                    </td>
                    <td className="py-1 px-1 text-right font-mono font-bold text-[#1877F2]">
                      {row.netAmount.toFixed(2)}
                    </td>
                  </tr>
                ))}

                {formData.showDescription && (
                  summaryRows.map((row) => row.description ? (
                    <tr key={`desc-${row.id}`} className="bg-blue-50/30 text-[10px] text-slate-600 italic">
                      <td colSpan={12} className="py-1 px-2 border-b border-slate-100">
                        ↳ Details for {row.receiptDate} ({row.billCode}): {row.description}
                      </td>
                    </tr>
                  ) : null)
                )}
              </tbody>
              <tfoot>
                {/* Double-underline Accounting Style Totals matching Image 2 */}
                <tr className="border-t-2 border-slate-900 border-b-4 border-double border-slate-900 font-bold text-slate-900">
                  <td colSpan={2} className="py-1.5 px-1 text-right border-r border-slate-300">
                    Total :
                  </td>
                  <td className="py-1.5 px-1 text-right font-mono">
                    {totals.firstComm.toFixed(2)}
                  </td>
                  <td className="py-1.5 px-1 text-right font-mono">
                    {totals.firstYear.toFixed(2)}
                  </td>
                  <td className="py-1.5 px-1 text-right font-mono">
                    {totals.secondThirdYear.toFixed(2)}
                  </td>
                  <td className="py-1.5 px-1 text-right font-mono">
                    {totals.subYear.toFixed(2)}
                  </td>
                  <td className="py-1.5 px-1 text-right font-mono">
                    {totals.bonusComm.toFixed(2)}
                  </td>
                  <td className="py-1.5 px-1 text-right font-mono">
                    {totals.miscRcpt.toFixed(2)}
                  </td>
                  <td className="py-1.5 px-1 text-right font-mono border-r border-slate-300 text-rose-600">
                    {totals.recoveries.toFixed(2)}
                  </td>
                  <td className="py-1.5 px-1 text-right font-mono border-r border-slate-300">
                    {totals.total.toFixed(2)}
                  </td>
                  <td className="py-1.5 px-1 text-right font-mono border-r border-slate-300 text-rose-600">
                    {totals.totDedAmount.toFixed(2)}
                  </td>
                  <td className="py-1.5 px-1 text-right font-mono text-[#1877F2]">
                    {totals.netAmount.toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Bottom Footnote */}
          <div className="pt-4 flex justify-between items-center text-[10px] text-slate-400 border-t border-slate-100">
            <span>Generated from LIC Agency Portal - Subject to branch verification</span>
            <span>TDS deducted under Section 194D of Income Tax Act 1961</span>
          </div>
        </div>
      </div>
    </div>
  );
}
