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

const BLACK = "#000";
const thStyle = {
  borderTop: `1px solid ${BLACK}`,
  borderBottom: `1px solid ${BLACK}`,
  verticalAlign: "bottom",
} as const;
const totalValueStyle = {
  display: "inline-block",
  borderTop: `1px solid ${BLACK}`,
  borderBottom: `3px double ${BLACK}`,
  padding: "1px 2px",
} as const;

function StatusRow({
  label,
  value,
  bold,
  total,
}: {
  label: string;
  value: string | number;
  bold?: boolean;
  total?: boolean;
}) {
  return (
    <tr className={bold || total ? "font-bold" : ""}>
      <td className="py-0.5 pr-2">{label}</td>
      <td className="py-0.5 text-right font-mono whitespace-nowrap">
        {total ? <span style={totalValueStyle}>{value}</span> : value}
      </td>
    </tr>
  );
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
        scale: 1.25,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        logging: false,
      });

      elem.style.width = originalWidth;

      const pdf = new jsPDF({ orientation: "p", unit: "mm", format: "a4", compress: true });
      const pageWidthMm = 210;
      const pageHeightMm = 297;
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
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm print:hidden w-full">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToForm}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-slate-500 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 transition uppercase tracking-wider cursor-pointer"
          >
            <ArrowLeft size={16} />
            <span>Edit Policy</span>
          </button>
          <span className="text-xs bg-blue-50 text-[#1877F2] font-bold px-3 py-1 rounded-full border border-blue-200 uppercase tracking-wider">
            Policy Status Statement
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-slate-500 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 transition uppercase tracking-wider cursor-pointer"
          >
            <Printer size={16} />
            <span>Print</span>
          </button>
          <button
            onClick={handleExportPDF}
            disabled={isExporting}
            className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-[#5c67ff] to-[#3a47ff] text-white font-bold text-xs rounded-xl shadow-md shadow-blue-200 hover:brightness-110 transition disabled:opacity-50 uppercase tracking-wider cursor-pointer"
          >
            <Download size={16} />
            <span>{isExporting ? "Exporting PDF..." : "Download PDF"}</span>
          </button>
        </div>
      </div>

      {/* Printable Statement — plain LIC-style */}
      <div
        ref={reportRef}
        style={{ fontFamily: "Arial, Helvetica, sans-serif", color: BLACK }}
        className="w-full bg-white px-6 py-6 border border-slate-300 shadow-xl text-[11px] leading-snug print:p-0 print:border-none print:shadow-none max-w-4xl mx-auto"
      >
        <div className="flex justify-between items-end pb-1 text-[11px] font-semibold">
          <span>Policy Status Report as on {formatDate(formData.reportDate)}</span>
          <span>Policy No : {formData.policyNumber || "—"}</span>
        </div>
        <div style={{ borderTop: `1px solid ${BLACK}` }} />

        {/* Policy header lines */}
        <div className="pt-3 pb-2 space-y-0.5 text-[12px]">
          <div className="flex gap-3">
            <span className="w-24 font-bold">Policy No.</span>
            <span className="font-bold font-mono">
              {formData.paymentType.toUpperCase().startsWith("S") ? "S " : ""}
              {formData.policyNumber || "-"}
            </span>
          </div>
          <div className="flex gap-3">
            <span className="w-24 font-bold">Name</span>
            <span className="font-bold">{formData.clientName || "-"}</span>
          </div>
          <div className="flex gap-3">
            <span className="w-24 font-bold">DOB</span>
            <span className="font-mono">{formatDate(formData.dob) || "-"}</span>
          </div>
        </div>
        <div style={{ borderTop: `1px solid ${BLACK}` }} />

        {/* Two columns: policy details | calculation results */}
        <div className="grid grid-cols-2 gap-10 pt-3">
          <table className="w-full border-collapse">
            <tbody>
              <StatusRow label="Comm. Date" value={formatDate(formData.commencementDate) || "-"} />
              <StatusRow label="Plan" value={formData.plan || "-"} />
              <StatusRow label="Term" value={formData.term || "-"} />
              <StatusRow label="Premium Term" value={formData.ppt || "-"} />
              <StatusRow label="Sum" value={Number(formData.sumAssured).toLocaleString("en-IN")} bold />
              <StatusRow label="Premium" value={Number(formData.premium).toFixed(2)} />
              <StatusRow label="Mode" value={formData.mode || "Y"} />
              <StatusRow label="D. A. B." value={formData.dab || 0} />
              <StatusRow label="Deposit Amount" value={Number(formData.depositAmount).toFixed(2)} />
              <StatusRow label="Branch" value={formData.branch || "-"} />
              <StatusRow label="F. U. P. Date" value={formatDate(formData.fupDate) || "-"} />
              <StatusRow label="Loan Taken" value={formData.loanTaken || 0} />
              <StatusRow label="Loan Date" value={formatDate(formData.loanDate) || "-"} />
              <StatusRow label="FULI Date" value={formatDate(formData.fuliDate) || "-"} />
              <StatusRow label="Payment Type" value={formData.paymentType || "Ordinary"} />
              <StatusRow label="Remarks" value={formData.remarks || "-"} />
            </tbody>
          </table>

          <table className="w-full border-collapse">
            <tbody>
              <StatusRow label="Total Premiums Paid" value={Number(formData.totalPremiumsPaid).toLocaleString("en-IN")} bold />
              <StatusRow label="Policy Status" value={formData.policyStatus || "Inforce"} bold />
              <StatusRow label="Vested Bonus (S. V.)" value={formData.vestedBonusSV || 0} />
              <StatusRow label="Paid Up Value" value={formData.paidUpValueSV || 0} />
              <StatusRow label="Total" value={formData.totalSV || 0} total />
              <StatusRow label="Vested Bonus (Loan)" value={formData.vestedBonusLoan || 0} />
              <StatusRow label="Paid Up Value" value={formData.paidUpValueLoan || 0} />
              <StatusRow label="Total" value={formData.totalLoan || 0} total />
              <StatusRow label="S.V. Factor" value={formData.svFactor || "0.00"} />
              <StatusRow label="Surr. Value" value={formData.specialSurrenderValue || 0} />
              <StatusRow label="Guar. Surr. Value" value={formData.guaranteedSurrenderValue || 0} />
              <StatusRow label="Late Fee Interest" value={formData.lateFeeInterest || "0.00"} />
              <StatusRow label="Discounted Value" value={formData.discountedValue || 0} />
              <StatusRow label="Risk Cover" value={formData.riskCover || 0} bold />
              <StatusRow label="Loan Available" value={formData.loanAvailable || 0} bold />
            </tbody>
          </table>
        </div>

        <div style={{ borderTop: `1px solid ${BLACK}` }} className="mt-4" />

        {/* Footer legend */}
        <div className="pt-2 flex items-center justify-between text-[9px]">
          <div className="flex items-center gap-5">
            <span><strong>Y</strong> Policies with NACH mode</span>
            <span><strong>A</strong> Policies with APPS mode</span>
            <span><strong>S</strong> : Cheque dishonoured / Debit fail</span>
          </div>
          <div className="font-mono text-[8px]">DSS000019899</div>
        </div>
      </div>
    </div>
  );
}
