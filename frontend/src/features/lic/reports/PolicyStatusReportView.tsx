"use client";

import { useRef, useState } from "react";
import { ArrowLeft, Download, Printer } from "lucide-react";
import { PolicyStatusFormData } from "./PolicyStatusReportForm";
import html2canvas from "html2canvas-pro";
import jsPDF from "jspdf";
import toast from "react-hot-toast";

interface PolicyStatusReportViewProps {
  formData: PolicyStatusFormData;
  onBackToForm: () => void;
}

export default function PolicyStatusReportView({
  formData,
  onBackToForm,
}: PolicyStatusReportViewProps) {
  const reportRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  // Format date helper DD/MM/YYYY
  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return "";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const day = String(d.getDate()).padStart(2, "0");
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    } catch {
      return dateStr || "";
    }
  };

  // Handle PDF Export
  const handleExportPDF = async () => {
    if (!reportRef.current) return;
    setIsExporting(true);
    const toastId = toast.loading("Exporting Executive Policy Status PDF...");

    const elem = reportRef.current;
    const originalWidth = elem.style.width;

    try {
      elem.style.width = "950px";

      const canvas = await html2canvas(elem, {
        scale: 2,
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

      pdf.addImage(imgData, "PNG", 0, 0, imgWidth, Math.min(imgHeight, pageHeight));
      pdf.save(`Policy_Status_${formData.policyNumber || "Report"}.pdf`);
      toast.success("Executive PDF exported successfully!", { id: toastId });
    } catch (err: any) {
      console.error(err);
      elem.style.width = originalWidth;
      toast.error(err?.message || "Failed to generate PDF.", { id: toastId });
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 w-full">
      {/* Top Action Control Bar — FULL WIDTH */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-[#0B1220] p-4 rounded-2xl border border-slate-800 shadow-xl print:hidden w-full">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToForm}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-slate-300 bg-white/10 rounded-xl hover:bg-white/20 transition uppercase tracking-wider cursor-pointer"
          >
            <ArrowLeft size={16} />
            <span>Edit Policy</span>
          </button>
          <span className="text-xs bg-[#B8873A]/20 text-[#E8C77A] font-bold px-3 py-1.5 rounded-full border border-[#B8873A]/40 uppercase tracking-wider">
            Policy Status Statement
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-slate-300 bg-white/10 rounded-xl hover:bg-white/20 transition uppercase tracking-wider cursor-pointer"
          >
            <Printer size={16} />
            <span>Print</span>
          </button>
          <button
            onClick={handleExportPDF}
            disabled={isExporting}
            className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-[#B8873A] to-[#D9AE63] text-[#0B1220] font-bold text-xs rounded-xl shadow-lg hover:brightness-105 transition disabled:opacity-50 uppercase tracking-wider cursor-pointer"
          >
            <Download size={16} />
            <span>{isExporting ? "Exporting PDF..." : "Download PDF"}</span>
          </button>
        </div>
      </div>

      {/* Main Printable Document Canvas */}
      <div
        ref={reportRef}
        style={{ fontFamily: "Arial, Helvetica, sans-serif" }}
        className="w-full bg-white p-8 rounded-2xl border border-slate-300 shadow-2xl text-slate-900 space-y-5 print:p-0 print:border-none print:shadow-none max-w-4xl mx-auto"
      >
        {/* Advisor Letterhead Header */}
        <div
          style={{ borderBottom: "2px solid #0B1220" }}
          className="flex justify-between items-start pb-4"
        >
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-[#0B1220] tracking-tight">
                Jayant Mahabole
              </h1>
              <span className="text-[10px] bg-[#0B1220] text-[#E8C77A] font-bold px-2 py-0.5 rounded uppercase tracking-widest">
                LIC Authorized Advisor
              </span>
            </div>
            <p className="text-xs font-semibold text-[#B8873A]">
              MBA in Insurance & Finance
            </p>
            <p className="text-xs text-slate-600 max-w-md leading-relaxed">
              84/2, Darpan Bldg., 201 Sarang Society, Sahakarnagar No. 2 Parvati Pune 411009
            </p>
            <div className="flex items-center gap-4 text-xs font-medium text-slate-700 pt-1">
              <span>Phone: 9822452896</span>
              <span>Email: office@jayantmahbole.com</span>
            </div>
          </div>

          <div className="text-right space-y-1.5">
            <div className="inline-block bg-[#0B1220] text-[#E8C77A] px-4 py-2 rounded-xl text-right border border-[#B8873A]/40 shadow-sm">
              <p className="text-xs font-bold tracking-widest uppercase">
                Life Insurance Corporation
              </p>
              <p className="text-[10px] text-slate-300">
                Policy Status & Valuation Sheet
              </p>
            </div>
            <p className="text-xs font-bold text-slate-700 pt-1">
              Date: {formatDate(formData.reportDate)}
            </p>
          </div>
        </div>

        {/* Title Banner */}
        <div className="bg-[#0B1220] text-white rounded-xl px-5 py-2.5 flex items-center justify-between border-l-4 border-[#B8873A] shadow-sm">
          <div>
            <h2 className="text-sm font-bold text-[#E8C77A] uppercase tracking-wider">
              Policy Status Report
            </h2>
          </div>
          <div className="text-right text-xs text-[#E8C77A] font-bold">
            Policy No: {formData.policyNumber || "—"}
          </div>
        </div>

        {/* Main Status Grid Table */}
        <div className="border border-slate-300 rounded-xl overflow-hidden shadow-xs border-collapse text-xs">
          {/* Top 3 Full-Width Rows */}
          <div className="border-b border-slate-300 grid grid-cols-12 divide-x divide-slate-300">
            <div className="col-span-3 p-2 font-bold bg-slate-50 text-slate-700">Policy No.</div>
            <div className="col-span-9 p-2 font-bold font-mono text-slate-900 flex items-center gap-2">
              <span className="text-red-600 font-bold">
                {formData.paymentType.toUpperCase().startsWith("S") ? "S" : ""}
              </span>
              <span>{formData.policyNumber || "-"}</span>
            </div>
          </div>

          <div className="border-b border-slate-300 grid grid-cols-12 divide-x divide-slate-300">
            <div className="col-span-3 p-2 font-bold bg-slate-50 text-slate-700">Name</div>
            <div className="col-span-9 p-2 font-bold text-slate-900">
              {formData.clientName || "-"}
            </div>
          </div>

          <div className="border-b border-slate-300 grid grid-cols-12 divide-x divide-slate-300">
            <div className="col-span-3 p-2 font-bold bg-slate-50 text-slate-700">DOB</div>
            <div className="col-span-9 p-2 font-bold font-mono text-slate-900">
              {formatDate(formData.dob) || "-"}
            </div>
          </div>

          {/* 2-Column Split: Left = Policy Details, Right = Calculation Details */}
          <div className="grid grid-cols-12 divide-x divide-slate-300">
            {/* Left Side Policy Details */}
            <div className="col-span-6 divide-y divide-slate-200">
              <div className="grid grid-cols-6 p-2 divide-x divide-slate-200">
                <div className="col-span-3 font-semibold text-slate-700">Comm. Date</div>
                <div className="col-span-3 pl-2 font-mono text-right">{formatDate(formData.commencementDate) || "-"}</div>
              </div>

              <div className="grid grid-cols-6 p-2 divide-x divide-slate-200">
                <div className="col-span-3 font-semibold text-slate-700">Plan</div>
                <div className="col-span-3 pl-2 font-mono text-right">{formData.plan || "-"}</div>
              </div>

              <div className="grid grid-cols-6 p-2 divide-x divide-slate-200">
                <div className="col-span-3 font-semibold text-slate-700">Term</div>
                <div className="col-span-3 pl-2 font-mono text-right">{formData.term || "-"}</div>
              </div>

              <div className="grid grid-cols-6 p-2 divide-x divide-slate-200">
                <div className="col-span-3 font-semibold text-slate-700">Premium Term</div>
                <div className="col-span-3 pl-2 font-mono text-right">{formData.ppt || "-"}</div>
              </div>

              <div className="grid grid-cols-6 p-2 divide-x divide-slate-200">
                <div className="col-span-3 font-semibold text-slate-700">Sum</div>
                <div className="col-span-3 pl-2 font-mono text-right font-bold text-slate-900">
                  {Number(formData.sumAssured).toLocaleString("en-IN")}
                </div>
              </div>

              <div className="grid grid-cols-6 p-2 divide-x divide-slate-200">
                <div className="col-span-3 font-semibold text-slate-700">Premium</div>
                <div className="col-span-3 pl-2 font-mono text-right">
                  {Number(formData.premium).toFixed(2)}
                </div>
              </div>

              <div className="grid grid-cols-6 p-2 divide-x divide-slate-200">
                <div className="col-span-3 font-semibold text-slate-700">Mode</div>
                <div className="col-span-3 pl-2 font-mono text-right">{formData.mode || "Y"}</div>
              </div>

              <div className="grid grid-cols-6 p-2 divide-x divide-slate-200">
                <div className="col-span-3 font-semibold text-slate-700">D. A. B.</div>
                <div className="col-span-3 pl-2 font-mono text-right">{formData.dab || 0}</div>
              </div>

              <div className="grid grid-cols-6 p-2 divide-x divide-slate-200">
                <div className="col-span-3 font-semibold text-slate-700">Deposit Amount</div>
                <div className="col-span-3 pl-2 font-mono text-right">
                  {Number(formData.depositAmount).toFixed(2)}
                </div>
              </div>

              <div className="grid grid-cols-6 p-2 divide-x divide-slate-200">
                <div className="col-span-3 font-semibold text-slate-700">Branch</div>
                <div className="col-span-3 pl-2 font-mono text-right">{formData.branch || "-"}</div>
              </div>

              <div className="grid grid-cols-6 p-2 divide-x divide-slate-200">
                <div className="col-span-3 font-semibold text-slate-700">F. U. P. Date</div>
                <div className="col-span-3 pl-2 font-mono text-right">{formatDate(formData.fupDate) || "-"}</div>
              </div>

              <div className="grid grid-cols-6 p-2 divide-x divide-slate-200">
                <div className="col-span-3 font-semibold text-slate-700">Loan Taken</div>
                <div className="col-span-3 pl-2 font-mono text-right">{formData.loanTaken || 0}</div>
              </div>

              <div className="grid grid-cols-6 p-2 divide-x divide-slate-200">
                <div className="col-span-3 font-semibold text-slate-700">Loan Date</div>
                <div className="col-span-3 pl-2 font-mono text-right">{formatDate(formData.loanDate) || "-"}</div>
              </div>

              <div className="grid grid-cols-6 p-2 divide-x divide-slate-200">
                <div className="col-span-3 font-semibold text-slate-700">FULI Date</div>
                <div className="col-span-3 pl-2 font-mono text-right">{formatDate(formData.fuliDate) || "-"}</div>
              </div>

              <div className="grid grid-cols-6 p-2 divide-x divide-slate-200">
                <div className="col-span-3 font-semibold text-slate-700">Payment Type</div>
                <div className="col-span-3 pl-2 font-mono text-right">{formData.paymentType || "Ordinary"}</div>
              </div>

              <div className="grid grid-cols-6 p-2 divide-x divide-slate-200">
                <div className="col-span-3 font-semibold text-slate-700">Remarks</div>
                <div className="col-span-3 pl-2 font-mono text-right">{formData.remarks || "-"}</div>
              </div>
            </div>

            {/* Right Side Calculation Results */}
            <div className="col-span-6 divide-y divide-slate-200 bg-slate-50/40">
              <div className="grid grid-cols-6 p-2 divide-x divide-slate-200">
                <div className="col-span-4 font-semibold text-slate-700">Total Premiums Paid</div>
                <div className="col-span-2 pl-2 font-mono text-right font-bold text-slate-900">
                  {Number(formData.totalPremiumsPaid).toLocaleString("en-IN")}
                </div>
              </div>

              <div className="grid grid-cols-6 p-2 divide-x divide-slate-200">
                <div className="col-span-4 font-semibold text-slate-700">Policy Status</div>
                <div className="col-span-2 pl-2 font-bold text-emerald-700 text-right">{formData.policyStatus || "Inforce"}</div>
              </div>

              <div className="grid grid-cols-6 p-2 divide-x divide-slate-200">
                <div className="col-span-4 font-semibold text-slate-700">Vested Bonus (S. V.)</div>
                <div className="col-span-2 pl-2 font-mono text-right">{formData.vestedBonusSV || 0}</div>
              </div>

              <div className="grid grid-cols-6 p-2 divide-x divide-slate-200">
                <div className="col-span-4 font-semibold text-slate-700">Paid Up Value</div>
                <div className="col-span-2 pl-2 font-mono text-right">{formData.paidUpValueSV || 0}</div>
              </div>

              <div className="grid grid-cols-6 p-2 divide-x divide-slate-200 font-bold bg-[#B8873A]/10">
                <div className="col-span-4 font-bold text-slate-900">Total</div>
                <div className="col-span-2 pl-2 font-mono text-right text-slate-900">{formData.totalSV || 0}</div>
              </div>

              <div className="grid grid-cols-6 p-2 divide-x divide-slate-200">
                <div className="col-span-4 font-semibold text-slate-700">Vested Bonus (Loan)</div>
                <div className="col-span-2 pl-2 font-mono text-right">{formData.vestedBonusLoan || 0}</div>
              </div>

              <div className="grid grid-cols-6 p-2 divide-x divide-slate-200">
                <div className="col-span-4 font-semibold text-slate-700">Paid Up Value</div>
                <div className="col-span-2 pl-2 font-mono text-right">{formData.paidUpValueLoan || 0}</div>
              </div>

              <div className="grid grid-cols-6 p-2 divide-x divide-slate-200 font-bold bg-[#B8873A]/10">
                <div className="col-span-4 font-bold text-slate-900">Total</div>
                <div className="col-span-2 pl-2 font-mono text-right text-slate-900">{formData.totalLoan || 0}</div>
              </div>

              <div className="grid grid-cols-6 p-2 divide-x divide-slate-200">
                <div className="col-span-4 font-semibold text-slate-700">S.V. Factor</div>
                <div className="col-span-2 pl-2 font-mono text-right">{formData.svFactor || "0.00"}</div>
              </div>

              <div className="grid grid-cols-6 p-2 divide-x divide-slate-200">
                <div className="col-span-4 font-semibold text-slate-700">Surr. Value</div>
                <div className="col-span-2 pl-2 font-mono text-right">{formData.specialSurrenderValue || 0}</div>
              </div>

              <div className="grid grid-cols-6 p-2 divide-x divide-slate-200">
                <div className="col-span-4 font-semibold text-slate-700">Guar. Surr. Value</div>
                <div className="col-span-2 pl-2 font-mono text-right">{formData.guaranteedSurrenderValue || 0}</div>
              </div>

              <div className="grid grid-cols-6 p-2 divide-x divide-slate-200">
                <div className="col-span-4 font-semibold text-slate-700">Late Fee Interest</div>
                <div className="col-span-2 pl-2 font-mono text-right">{formData.lateFeeInterest || "0.00"}</div>
              </div>

              <div className="grid grid-cols-6 p-2 divide-x divide-slate-200">
                <div className="col-span-4 font-semibold text-slate-700">Discounted Value</div>
                <div className="col-span-2 pl-2 font-mono text-right">{formData.discountedValue || 0}</div>
              </div>

              <div className="grid grid-cols-6 p-2 divide-x divide-slate-200">
                <div className="col-span-4 font-semibold text-slate-700">Risk Cover</div>
                <div className="col-span-2 pl-2 font-mono text-right font-semibold text-slate-900">{formData.riskCover || 0}</div>
              </div>

              <div className="grid grid-cols-6 p-2 divide-x divide-slate-200">
                <div className="col-span-4 font-semibold text-slate-700">Loan Available</div>
                <div className="col-span-2 pl-2 font-mono text-right font-bold text-[#B8873A]">{formData.loanAvailable || 0}</div>
              </div>

              <div className="p-2 bg-slate-50 min-h-[32px]"></div>
            </div>
          </div>
        </div>

        {/* Footer Legend */}
        <div className="pt-4 border-t-2 border-slate-300 flex flex-col sm:flex-row items-center justify-between text-[10px] text-slate-700 font-medium">
          <div className="flex items-center gap-6">
            <span>
              <strong className="text-slate-900 font-bold">Y</strong> Policies with NACH mode
            </span>
            <span>
              <strong className="text-slate-900 font-bold">A</strong> Policies with APPS mode
            </span>
            <span>
              <strong className="text-red-600 font-bold">S</strong> : Cheque dishonoured / Debit fail
            </span>
          </div>
          <div className="font-bold text-slate-900 tracking-wider">
            DSS000019899
          </div>
        </div>
      </div>
    </div>
  );
}
