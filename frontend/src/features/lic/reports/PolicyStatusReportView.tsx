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
    const toastId = toast.loading("Generating PDF Document...");

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
      const imgWidth = pdfWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      pdf.addImage(imgData, "PNG", 0, 0, imgWidth, Math.min(imgHeight, pdfHeight));
      pdf.save(`Policy_Status_${formData.policyNumber || "Report"}.pdf`);
      toast.success("PDF Downloaded successfully", { id: toastId });
    } catch (error) {
      console.error("PDF generation failed:", error);
      toast.error("Failed to generate PDF", { id: toastId });
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Top Action Toolbar (Hidden on Print) */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs print:hidden">
        <button
          type="button"
          onClick={onBackToForm}
          className="flex items-center gap-2 text-xs font-semibold text-slate-700 hover:text-blue-600 transition"
        >
          <ArrowLeft size={16} />
          <span>Back to Policy Status Form</span>
        </button>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
          >
            <Printer size={15} />
            <span>Print Sheet</span>
          </button>
          <button
            type="button"
            disabled={isExporting}
            onClick={handleExportPDF}
            className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-[#02569B] to-[#014175] text-white rounded-xl text-xs font-bold uppercase tracking-wider hover:brightness-110 transition shadow-md disabled:opacity-50 cursor-pointer"
          >
            <Download size={15} />
            <span>{isExporting ? "Exporting..." : "Download PDF"}</span>
          </button>
        </div>
      </div>

      {/* Main Report Container matching sample PDF */}
      <div
        ref={reportRef}
        className="bg-white p-6 sm:p-10 rounded-2xl border border-slate-200 shadow-lg text-slate-900 print:border-none print:shadow-none print:p-0 max-w-4xl mx-auto space-y-4 text-xs font-sans"
      >
        {/* Header matching sample PDF */}
        <div className="space-y-0.5">
          <h2 className="text-base font-bold text-[#00008B] tracking-tight">
            Jayant Mahabole
          </h2>
          <div className="text-xs font-semibold text-[#B22222]">
            MBA in Insurance & Finance
          </div>
          <div className="text-[10px] text-slate-700">
            84/2, Darpan Bldg,. 201 Sarang Society, Sahakarnagar No. 2 Parvati Pune 411009, 9822452896
          </div>
          <div className="text-[10px] text-slate-700">
            office@jayantmahbole.com
          </div>
        </div>

        {/* Yellow/Beige Box Header matching sample PDF */}
        <div className="border border-black bg-[#FEF9E7] px-4 py-2">
          <h1 className="text-sm font-bold text-black uppercase tracking-wide">
            Policy Status
          </h1>
        </div>

        {/* Date */}
        <div className="text-[11px] font-semibold text-slate-900">
          Date : {formatDate(formData.reportDate)}
        </div>

        {/* Main Status Grid Table */}
        <div className="border border-black border-collapse">
          {/* Top 3 Full-Width Rows */}
          <div className="border-b border-black grid grid-cols-12 divide-x divide-black">
            <div className="col-span-3 p-1.5 font-bold bg-slate-50/50">Policy No.</div>
            <div className="col-span-9 p-1.5 font-bold font-mono text-slate-900 flex items-center gap-2">
              <span className="text-red-600 font-bold">
                {formData.paymentType.toUpperCase().startsWith("S") ? "S" : ""}
              </span>
              <span>{formData.policyNumber || "-"}</span>
            </div>
          </div>

          <div className="border-b border-black grid grid-cols-12 divide-x divide-black">
            <div className="col-span-3 p-1.5 font-bold bg-slate-50/50">Name</div>
            <div className="col-span-9 p-1.5 font-bold text-slate-900">
              {formData.clientName || "-"}
            </div>
          </div>

          <div className="border-b border-black grid grid-cols-12 divide-x divide-black">
            <div className="col-span-3 p-1.5 font-bold bg-slate-50/50">DOB</div>
            <div className="col-span-9 p-1.5 font-bold text-slate-900">
              {formatDate(formData.dob) || "-"}
            </div>
          </div>

          {/* 2-Column Split: Left = Policy Details, Right = Calculation Details */}
          <div className="grid grid-cols-12 divide-x divide-black">
            {/* Left Side Policy Details */}
            <div className="col-span-6 divide-y divide-black">
              <div className="grid grid-cols-6 p-1.5 divide-x divide-black">
                <div className="col-span-3 font-semibold">Comm. Date</div>
                <div className="col-span-3 pl-2 font-mono text-right">{formatDate(formData.commencementDate) || "-"}</div>
              </div>

              <div className="grid grid-cols-6 p-1.5 divide-x divide-black">
                <div className="col-span-3 font-semibold">Plan</div>
                <div className="col-span-3 pl-2 font-mono text-right">{formData.plan || "-"}</div>
              </div>

              <div className="grid grid-cols-6 p-1.5 divide-x divide-black">
                <div className="col-span-3 font-semibold">Term</div>
                <div className="col-span-3 pl-2 font-mono text-right">{formData.term || "-"}</div>
              </div>

              <div className="grid grid-cols-6 p-1.5 divide-x divide-black">
                <div className="col-span-3 font-semibold">Premium Term</div>
                <div className="col-span-3 pl-2 font-mono text-right">{formData.ppt || "-"}</div>
              </div>

              <div className="grid grid-cols-6 p-1.5 divide-x divide-black">
                <div className="col-span-3 font-semibold">Sum</div>
                <div className="col-span-3 pl-2 font-mono text-right">
                  {Number(formData.sumAssured).toLocaleString("en-IN")}
                </div>
              </div>

              <div className="grid grid-cols-6 p-1.5 divide-x divide-black">
                <div className="col-span-3 font-semibold">Premium</div>
                <div className="col-span-3 pl-2 font-mono text-right">
                  {Number(formData.premium).toFixed(2)}
                </div>
              </div>

              <div className="grid grid-cols-6 p-1.5 divide-x divide-black">
                <div className="col-span-3 font-semibold">Mode</div>
                <div className="col-span-3 pl-2 font-mono text-right">{formData.mode || "Y"}</div>
              </div>

              <div className="grid grid-cols-6 p-1.5 divide-x divide-black">
                <div className="col-span-3 font-semibold">D. A. B.</div>
                <div className="col-span-3 pl-2 font-mono text-right">{formData.dab || 0}</div>
              </div>

              <div className="grid grid-cols-6 p-1.5 divide-x divide-black">
                <div className="col-span-3 font-semibold">Deposit Amount</div>
                <div className="col-span-3 pl-2 font-mono text-right">
                  {Number(formData.depositAmount).toFixed(2)}
                </div>
              </div>

              <div className="grid grid-cols-6 p-1.5 divide-x divide-black">
                <div className="col-span-3 font-semibold">Branch</div>
                <div className="col-span-3 pl-2 font-mono text-right">{formData.branch || "-"}</div>
              </div>

              <div className="grid grid-cols-6 p-1.5 divide-x divide-black">
                <div className="col-span-3 font-semibold">F. U. P. Date</div>
                <div className="col-span-3 pl-2 font-mono text-right">{formatDate(formData.fupDate) || "-"}</div>
              </div>

              <div className="grid grid-cols-6 p-1.5 divide-x divide-black">
                <div className="col-span-3 font-semibold">Loan Taken</div>
                <div className="col-span-3 pl-2 font-mono text-right">{formData.loanTaken || 0}</div>
              </div>

              <div className="grid grid-cols-6 p-1.5 divide-x divide-black">
                <div className="col-span-3 font-semibold">Loan Date</div>
                <div className="col-span-3 pl-2 font-mono text-right">{formatDate(formData.loanDate) || "-"}</div>
              </div>

              <div className="grid grid-cols-6 p-1.5 divide-x divide-black">
                <div className="col-span-3 font-semibold">FULI Date</div>
                <div className="col-span-3 pl-2 font-mono text-right">{formatDate(formData.fuliDate) || "-"}</div>
              </div>

              <div className="grid grid-cols-6 p-1.5 divide-x divide-black">
                <div className="col-span-3 font-semibold">Payment Type</div>
                <div className="col-span-3 pl-2 font-mono text-right">{formData.paymentType || "Ordinary"}</div>
              </div>

              <div className="grid grid-cols-6 p-1.5 divide-x divide-black">
                <div className="col-span-3 font-semibold">Remarks</div>
                <div className="col-span-3 pl-2 font-mono text-right">{formData.remarks || "-"}</div>
              </div>
            </div>

            {/* Right Side Calculation Results */}
            <div className="col-span-6 divide-y divide-black">
              <div className="grid grid-cols-6 p-1.5 divide-x divide-black">
                <div className="col-span-4 font-semibold">Total Premiums Paid</div>
                <div className="col-span-2 pl-2 font-mono text-right">
                  {Number(formData.totalPremiumsPaid).toLocaleString("en-IN")}
                </div>
              </div>

              <div className="grid grid-cols-6 p-1.5 divide-x divide-black">
                <div className="col-span-4 font-semibold">Policy Status</div>
                <div className="col-span-2 pl-2 font-semibold text-right">{formData.policyStatus || "Inforce"}</div>
              </div>

              <div className="grid grid-cols-6 p-1.5 divide-x divide-black">
                <div className="col-span-4 font-semibold">Vested Bonus (S. V.)</div>
                <div className="col-span-2 pl-2 font-mono text-right">{formData.vestedBonusSV || 0}</div>
              </div>

              <div className="grid grid-cols-6 p-1.5 divide-x divide-black">
                <div className="col-span-4 font-semibold">Paid Up Value</div>
                <div className="col-span-2 pl-2 font-mono text-right">{formData.paidUpValueSV || 0}</div>
              </div>

              <div className="grid grid-cols-6 p-1.5 divide-x divide-black font-bold">
                <div className="col-span-4 font-bold">Total</div>
                <div className="col-span-2 pl-2 font-mono text-right">{formData.totalSV || 0}</div>
              </div>

              <div className="grid grid-cols-6 p-1.5 divide-x divide-black">
                <div className="col-span-4 font-semibold">Vested Bonus (Loan)</div>
                <div className="col-span-2 pl-2 font-mono text-right">{formData.vestedBonusLoan || 0}</div>
              </div>

              <div className="grid grid-cols-6 p-1.5 divide-x divide-black">
                <div className="col-span-4 font-semibold">Paid Up Value</div>
                <div className="col-span-2 pl-2 font-mono text-right">{formData.paidUpValueLoan || 0}</div>
              </div>

              <div className="grid grid-cols-6 p-1.5 divide-x divide-black font-bold">
                <div className="col-span-4 font-bold">Total</div>
                <div className="col-span-2 pl-2 font-mono text-right">{formData.totalLoan || 0}</div>
              </div>

              <div className="grid grid-cols-6 p-1.5 divide-x divide-black">
                <div className="col-span-4 font-semibold">S.V. Factor</div>
                <div className="col-span-2 pl-2 font-mono text-right">{formData.svFactor || "0.00"}</div>
              </div>

              <div className="grid grid-cols-6 p-1.5 divide-x divide-black">
                <div className="col-span-4 font-semibold">Surr. Value</div>
                <div className="col-span-2 pl-2 font-mono text-right">{formData.specialSurrenderValue || 0}</div>
              </div>

              <div className="grid grid-cols-6 p-1.5 divide-x divide-black">
                <div className="col-span-4 font-semibold">Guar. Surr. Value</div>
                <div className="col-span-2 pl-2 font-mono text-right">{formData.guaranteedSurrenderValue || 0}</div>
              </div>

              <div className="grid grid-cols-6 p-1.5 divide-x divide-black">
                <div className="col-span-4 font-semibold">Late Fee Interest</div>
                <div className="col-span-2 pl-2 font-mono text-right">{formData.lateFeeInterest || "0.00"}</div>
              </div>

              <div className="grid grid-cols-6 p-1.5 divide-x divide-black">
                <div className="col-span-4 font-semibold">Discounted Value</div>
                <div className="col-span-2 pl-2 font-mono text-right">{formData.discountedValue || 0}</div>
              </div>

              <div className="grid grid-cols-6 p-1.5 divide-x divide-black">
                <div className="col-span-4 font-semibold">Risk Cover</div>
                <div className="col-span-2 pl-2 font-mono text-right">{formData.riskCover || 0}</div>
              </div>

              <div className="grid grid-cols-6 p-1.5 divide-x divide-black">
                <div className="col-span-4 font-semibold">Loan Available</div>
                <div className="col-span-2 pl-2 font-mono text-right">{formData.loanAvailable || 0}</div>
              </div>

              <div className="p-1.5 bg-slate-50 min-h-[32px]"></div>
            </div>
          </div>
        </div>

        {/* Footer Legend matching sample PDF */}
        <div className="pt-4 border-t-2 border-black flex flex-col sm:flex-row items-center justify-between text-[9px] text-slate-700 font-medium">
          <div className="flex items-center gap-6">
            <span>
              <strong className="text-black">Y</strong> Policies with NACH mode
            </span>
            <span>
              <strong className="text-black">A</strong> Policies with APPS mode
            </span>
            <span>
              <strong className="text-black text-red-600">S</strong> : Cheque dishonoured/ Debit fail
            </span>
          </div>
          <div className="font-bold text-black tracking-wider">
            DSS000019899
          </div>
        </div>
      </div>
    </div>
  );
}
