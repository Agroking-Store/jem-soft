"use client";

import { useRef, useState, useMemo } from "react";
import {
  ArrowLeft,
  Download,
  Printer,
  ChevronLeft,
  ChevronRight,
  IndianRupee,
  Activity,
  FileSpreadsheet,
  CheckCircle2,
} from "lucide-react";
import html2canvas from "html2canvas-pro";
import jsPDF from "jspdf";
import toast from "react-hot-toast";
import {
  ShortCommissionFormData,
  ShortCommissionItem,
  generateShortCommissionItems,
  calculateShortCommissionTotals,
  formatNetReceivable,
} from "./shortCommissionData";

interface ShortCommissionReportViewProps {
  formData: ShortCommissionFormData;
  policies?: any[];
  onBackToForm: () => void;
}

const ITEMS_PER_PAGE = 45; // Approximately 45-50 rows per page matching LIC statement

export default function ShortCommissionReportView({
  formData,
  policies = [],
  onBackToForm,
}: ShortCommissionReportViewProps) {
  const reportRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // Agency display name
  const agencyDisplayName = useMemo(() => {
    const agencyFilter = formData.dataFilters?.find((f) => f.type === "Agencies");
    if (agencyFilter) {
      return agencyFilter.name;
    }
    return "Jayant Mahabole";
  }, [formData.dataFilters]);

  // Selected agency names
  const selectedAgencyNames = useMemo(() => {
    return (formData.dataFilters || [])
      .filter((f) => f.type === "Agencies")
      .map((f) => f.name);
  }, [formData.dataFilters]);

  // Items generated based on filters and options
  const allItems: ShortCommissionItem[] = useMemo(() => {
    return generateShortCommissionItems(policies, selectedAgencyNames, formData);
  }, [policies, selectedAgencyNames, formData]);

  // Grand totals of all matching records
  const totals = useMemo(() => {
    return calculateShortCommissionTotals(allItems);
  }, [allItems]);

  // Total pages
  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(allItems.length / ITEMS_PER_PAGE));
  }, [allItems]);

  // Current page items
  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return allItems.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [allItems, currentPage]);

  const isLastPage = currentPage === totalPages;

  const handleDownloadPDF = async () => {
    if (!reportRef.current) return;
    setIsExporting(true);
    const toastId = toast.loading("Generating Short/Excess Commission Statement PDF...");

    const elem = reportRef.current;
    const originalWidth = elem.style.width;

    try {
      elem.style.width = "1000px";

      const canvas = await html2canvas(elem, {
        scale: 2.2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        logging: false,
      });

      elem.style.width = originalWidth;

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const imgWidth = 210;
      const pageHeight = 297;
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

      const sortLabel = formData.sortingOption === "policy-wise" ? "PolicyWise" : "AgentBillWise";
      pdf.save(`Short_Excess_Commission_${sortLabel}_${formData.reportDate.replace(/\//g, "-")}.pdf`);
      toast.success("Short Commission Statement PDF downloaded successfully!", { id: toastId });
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
      {/* Top Action Control Bar (Print Hidden) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm print:hidden">
        <button
          type="button"
          onClick={onBackToForm}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
        >
          <ArrowLeft size={15} />
          Edit Report Filters
        </button>

        {/* Summary Metric Chips */}
        <div className="hidden lg:flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-50 border border-blue-100 text-xs font-semibold text-[#1877F2]">
            <Activity size={14} />
            <span>Total Records: <strong>{totals.totalCount}</strong></span>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700">
            <span>Comsn. Recble: <strong>₹{totals.totalComsnRecble.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</strong></span>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700">
            <span>Comsn. Recvd: <strong>₹{totals.totalComsnRecvd.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</strong></span>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-xs font-semibold text-amber-900">
            <span>Net Recble: <strong>{formatNetReceivable(totals.totalNetRecble)}</strong></span>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-xs"
          >
            <Printer size={15} />
            Print
          </button>

          <button
            type="button"
            onClick={handleDownloadPDF}
            disabled={isExporting}
            className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#1877F2] to-[#2563eb] px-4 py-2.5 text-xs font-semibold text-white shadow-md shadow-blue-200 hover:brightness-110 active:scale-[0.98] transition disabled:opacity-50"
          >
            <Download size={15} />
            {isExporting ? "Exporting..." : "Download PDF"}
          </button>
        </div>
      </div>

      {/* Pagination Bar (Print Hidden) */}
      <div className="flex items-center justify-between bg-white px-5 py-3 rounded-xl border border-slate-200 shadow-xs print:hidden text-xs">
        <span className="text-slate-500 font-medium">
          Showing Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong> ({allItems.length} total entries)
        </span>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            disabled={currentPage <= 1}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition"
            title="Previous Page"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="px-3 py-1 rounded-md bg-blue-50 text-[#1877F2] font-bold">
            {currentPage}
          </span>
          <button
            type="button"
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition"
            title="Next Page"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Printable Statement Container */}
      <div
        ref={reportRef}
        className="mx-auto max-w-[950px] bg-white border border-slate-200 p-8 shadow-sm rounded-lg text-slate-900 font-sans print:border-none print:shadow-none print:p-2"
        style={{ minHeight: "1150px" }}
      >
        {/* Page 1 Official Agency Header */}
        {currentPage === 1 ? (
          <div className="space-y-4 mb-4">
            <div className="text-left text-xs leading-tight text-slate-800 space-y-0.5">
              <h2 className="text-base font-bold text-slate-900 tracking-tight">
                {agencyDisplayName}
              </h2>
              <p className="font-semibold text-slate-700">MBA in Insurance & Finance</p>
              <p className="text-slate-600">84/2, Darpan Bldg,. 201 Sarang Society,</p>
              <p className="text-slate-600">Sahakarnagar No. 2 Parvati Pune 411009,</p>
              <p className="text-slate-600">9822452896,</p>
              <p className="text-slate-600">office@jayantmahabole.com,</p>
            </div>

            {/* Statement Boxed Title Bar */}
            <div className="border border-slate-900 py-2 px-3 flex items-center justify-between text-xs font-bold tracking-tight">
              <span className="text-sm">
                Short/Excess Commission Statement {formData.sortingOption === "policy-wise" ? "Policy No.wise" : "Agent Bill wise"}
              </span>
              <span className="text-sm font-extrabold">
                {formData.sortingOption === "policy-wise" ? "Policy No. Wise" : "Agent Bill Wise"}
              </span>
            </div>

            {/* Statement Date & Page Number Row */}
            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-800 pt-1">
              <span>Date : {formData.reportDate}</span>
              <span>Page {currentPage} of {totalPages}</span>
            </div>
          </div>
        ) : (
          /* Continuation Header for Page 2+ */
          <div className="mb-4">
            <div className="flex items-center justify-between text-[11px] font-bold border-b border-slate-300 pb-1.5 text-slate-800">
              <span>
                Short Commission Statement ({formData.sortingOption === "policy-wise" ? "Policy wise" : "Agent Bill wise"}) Continue ..........
              </span>
              <span>Page {currentPage} of {totalPages}</span>
            </div>
          </div>
        )}

        {/* Authentic Tabular Statement */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[10.5px]">
            <thead>
              <tr className="border-t border-b border-slate-800 text-[10px] font-bold text-slate-900 leading-tight">
                <th className="py-2 px-1 text-left whitespace-nowrap">Policy No.</th>
                <th className="py-2 px-1 text-center whitespace-nowrap">Ag<br/>Cd</th>
                <th className="py-2 px-1 text-left whitespace-nowrap">Group<br/>Code</th>
                <th className="py-2 px-1 text-left">Name of the Policy Holder</th>
                <th className="py-2 px-1 text-center whitespace-nowrap">Due<br/>Date</th>
                <th className="py-2 px-1 text-right whitespace-nowrap">Premium<br/>Amount</th>
                <th className="py-2 px-1 text-center whitespace-nowrap">Pl/Tm/Pt</th>
                <th className="py-2 px-1 text-center whitespace-nowrap">Bill Date</th>
                <th className="py-2 px-1 text-right whitespace-nowrap">Comsn.<br/>Recble.</th>
                <th className="py-2 px-1 text-right whitespace-nowrap">Comsn.<br/>Recvd.</th>
                <th className="py-2 px-1 text-right whitespace-nowrap">Net<br/>Recble.</th>
                <th className="py-2 px-1 text-right whitespace-nowrap">Com.<br/>Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-[10px]">
              {paginatedItems.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-1 px-1 text-left font-bold text-slate-900 whitespace-nowrap">
                    {item.policyNo}
                  </td>
                  <td className="py-1 px-1 text-center text-slate-800 font-sans">
                    {item.agCd}
                  </td>
                  <td className="py-1 px-1 text-left text-slate-800 font-sans">
                    {item.groupCode}
                  </td>
                  <td className="py-1 px-1 text-left font-sans text-slate-900 truncate max-w-[170px]" title={item.holderName}>
                    {item.holderName}
                  </td>
                  <td className="py-1 px-1 text-center text-slate-700">
                    {item.dueDate}
                  </td>
                  <td className="py-1 px-1 text-right text-slate-900">
                    {item.premiumAmount.toFixed(2)}
                  </td>
                  <td className="py-1 px-1 text-center text-slate-700 whitespace-nowrap">
                    {item.planTermPpt}
                  </td>
                  <td className="py-1 px-1 text-center text-slate-700 whitespace-nowrap">
                    {item.billDate}
                  </td>
                  <td className="py-1 px-1 text-right text-slate-900">
                    {item.comsnRecble.toFixed(2)}
                  </td>
                  <td className="py-1 px-1 text-right text-slate-900">
                    {item.comsnRecvd.toFixed(2)}
                  </td>
                  <td className={`py-1 px-1 text-right font-bold ${item.netRecble < 0 ? "text-slate-900" : "text-slate-900"}`}>
                    {formatNetReceivable(item.netRecble)}
                  </td>
                  <td className="py-1 px-1 text-right text-slate-800 font-sans">
                    {item.comRate.toFixed(2)}
                  </td>
                </tr>
              ))}

              {/* Grand Total Row on Last Page */}
              {isLastPage && (
                <tr className="border-t-2 border-b-2 border-slate-900 font-bold text-[10.5px] bg-slate-50/50">
                  <td colSpan={8} className="py-2 px-1 text-right font-sans uppercase tracking-wider text-slate-800">
                    Grand Totals:
                  </td>
                  <td className="py-2 px-1 text-right text-slate-900">
                    {totals.totalComsnRecble.toFixed(2)}
                  </td>
                  <td className="py-2 px-1 text-right text-slate-900">
                    {totals.totalComsnRecvd.toFixed(2)}
                  </td>
                  <td className="py-2 px-1 text-right text-slate-900 font-extrabold">
                    {formatNetReceivable(totals.totalNetRecble)}
                  </td>
                  <td></td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Bottom Page Footer code matching PDF */}
        <div className="mt-8 pt-3 border-t border-slate-300 flex items-center justify-between text-[10px] text-slate-600 font-mono">
          <span>DSS000019899</span>
          <span className="font-sans">Page {currentPage} of {totalPages}</span>
        </div>
      </div>
    </div>
  );
}
