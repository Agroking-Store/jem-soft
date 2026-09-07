"use client";

import { useRef, useState, useMemo } from "react";
import {
  ArrowLeft,
  Download,
  Printer,
  Shield,
  IndianRupee,
  ReceiptText,
  Percent,
} from "lucide-react";
import html2canvas from "html2canvas-pro";
import jsPDF from "jspdf";
import toast from "react-hot-toast";
import {
  DeductionSummaryFormData,
  generateDeductionItems,
  calculateDeductionSummaryTotals,
  DeductionItem,
} from "./deductionSummaryData";

interface DeductionSummaryReportViewProps {
  formData: DeductionSummaryFormData;
  policies?: any[];
  onBackToForm: () => void;
}

export default function DeductionSummaryReportView({
  formData,
  policies = [],
  onBackToForm,
}: DeductionSummaryReportViewProps) {
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

  // Generate deduction items dynamically
  const deductionItems: DeductionItem[] = useMemo(() => {
    return generateDeductionItems(policies, selectedAgencyNames, formData.advanceType);
  }, [policies, selectedAgencyNames, formData.advanceType]);

  // Totals calculations
  const totals = useMemo(() => {
    return calculateDeductionSummaryTotals(deductionItems);
  }, [deductionItems]);

  const handleDownloadPDF = async () => {
    if (!reportRef.current) return;
    setIsExporting(true);
    const toastId = toast.loading("Generating Deduction Summary PDF...");

    const elem = reportRef.current;
    const originalWidth = elem.style.width;

    try {
      elem.style.width = "900px";

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

      pdf.save(`Deduction_Summary_${formData.dateFrom.replace(/\//g, "-")}_to_${formData.dateTo.replace(/\//g, "-")}.pdf`);
      toast.success("Deduction Summary PDF downloaded successfully!", { id: toastId });
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
      {/* Top Action Control Bar (Commission Ledger Style, Print Hidden) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm print:hidden">
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

      {/* Summary KPI Cards (Commission Ledger Style, Print Hidden) */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 print:hidden">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm flex items-center gap-3.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#1877F2]">
            <ReceiptText size={20} />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Total Deductions
            </span>
            <div className="text-lg font-bold text-slate-900 mt-0.5">
              {totals.totalDeductionsCount} Records
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm flex items-center gap-3.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
            <Percent size={20} />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Income Tax (TDS)
            </span>
            <div className="text-lg font-bold text-rose-600 mt-0.5">
              ₹ {totals.incomeTaxTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm flex items-center gap-3.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
            <Shield size={20} />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Advances / Recoveries
            </span>
            <div className="text-lg font-bold text-slate-900 mt-0.5">
              ₹ {totals.advanceRecoveriesTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm flex items-center gap-3.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
            <IndianRupee size={20} />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Grand Total Amount
            </span>
            <div className="text-lg font-bold text-indigo-700 mt-0.5">
              ₹ {totals.totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </div>
          </div>
        </div>
      </div>

      {/* Printable Report Sheet matching Image 2 */}
      <div className="overflow-x-auto bg-slate-100 p-2 sm:p-6 rounded-2xl border border-slate-200 flex justify-center">
        <div
          ref={reportRef}
          style={{ width: "850px" }}
          className="bg-white p-8 shadow-md rounded-lg text-slate-900 font-sans space-y-4 print:shadow-none print:p-0 print:m-0"
        >
          {/* 1. Header Letterhead with decorative shape (Matches Image 2) */}
          <div className="relative overflow-hidden rounded-md p-4 bg-gradient-to-r from-pink-50 via-pink-50/70 to-white border border-pink-100/60">
            <div className="space-y-0.5 text-xs text-slate-800">
              <h1 className="text-base font-bold text-[#1e1b4b]">
                {agencyDisplayName}
              </h1>
              <p className="font-semibold text-rose-900/80">MBA in Insurance & Finance</p>
              <p className="text-slate-600">
                84/2, Darpan Bldg., 201 Sarang Society,
              </p>
              <p className="text-slate-600">
                Sahakarnagar No. 2 Parvati Pune 411009,
              </p>
              <p className="text-slate-600">9822452896,</p>
              <p className="text-slate-600">office@jayantmahbole.com,</p>
            </div>
          </div>

          {/* 2. Golden / Beige Title Bar matching Image 2 */}
          <div className="border border-slate-900 bg-[#faedd0] px-4 py-2 text-sm font-bold text-slate-900 tracking-wide">
            Deduction Summary
          </div>

          {/* 3. Subheader Details */}
          <div className="space-y-1 text-xs text-slate-900 pt-1">
            <div className="font-medium">
              Date : {formData.dateOfReport}
            </div>
            <div className="flex justify-between items-center font-medium border-b border-slate-900 pb-1">
              <span>
                Deduction Summary between {formData.dateFrom} and {formData.dateTo}
              </span>
              <span>Page 1 of 1</span>
            </div>
          </div>

          {/* 4. Table matching Image 2 with Light Mint-Green Header */}
          <div className="overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#e6f4ea] border-b border-slate-900 text-slate-900 font-bold">
                  <th className="py-2.5 px-3">Deduction Description</th>
                  <th className="py-2.5 px-3 text-center">Bill Rec. Date</th>
                  <th className="py-2.5 px-3 text-center">Bill Code</th>
                  <th className="py-2.5 px-3 text-right">Amount</th>
                  <th className="py-2.5 px-3 text-center">Ag. Cd.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {deductionItems.length > 0 ? (
                  deductionItems.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50 transition font-normal">
                      <td className="py-2 px-3 font-medium text-slate-900">{item.description}</td>
                      <td className="py-2 px-3 text-center font-mono text-slate-800">{item.billRecDate || "-"}</td>
                      <td className="py-2 px-3 text-center font-mono text-slate-800">{item.billCode || "-"}</td>
                      <td className="py-2 px-3 text-right font-mono font-semibold text-slate-900">
                        {item.amount.toFixed(2)}
                      </td>
                      <td className="py-2 px-3 text-center font-mono text-slate-800">{item.agentCode || "-"}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      No deduction records found for the selected criteria.
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-900 font-bold text-slate-900 bg-slate-50">
                  <td colSpan={3} className="py-2 px-3 text-right font-sans uppercase tracking-wider text-[11px]">
                    Total Deductions :
                  </td>
                  <td className="py-2 px-3 text-right font-mono text-xs font-bold text-rose-700">
                    {totals.totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-2 px-3" />
                </tr>
              </tfoot>
            </table>
          </div>

          {/* 5. Executive Verification Stamp matching previous reports */}
          <div className="border-t-2 border-slate-900 pt-3 flex justify-between items-center text-xs text-slate-600">
            <div>
              Agency: <strong>{agencyDisplayName}</strong> | Advance Type: <strong>{formData.advanceType}</strong>
            </div>
            <div className="font-mono font-bold tracking-widest text-slate-800">
              DSS000019899
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
