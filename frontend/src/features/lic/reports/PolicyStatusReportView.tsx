"use client";

import { useRef, useState } from "react";
import { ArrowLeft, Download, Printer } from "lucide-react";
import { useSelector } from "react-redux";
import type { ReactNode } from "react";
import { PolicyStatusFormData } from "./PolicyStatusReportForm";
import html2canvas from "html2canvas-pro";
import jsPDF from "jspdf";
import toast from "react-hot-toast";
import type { RootState } from "@/store/store";

interface PolicyStatusReportViewProps {
  formData: PolicyStatusFormData;
  onBackToForm: () => void;
}

const BLACK = "#000";
const totalValueStyle = {
  display: "inline-block",
  borderTop: `1px solid ${BLACK}`,
  borderBottom: `3px double ${BLACK}`,
  padding: "1px 2px",
} as const;

function presentValue(value: ReactNode): ReactNode {
  if (value === null || value === undefined) return "—";
  if (typeof value === "string" && value.trim() === "") return "—";
  return value;
}

function StatusRow({
  label,
  value,
  rightLabel,
  rightValue,
  rightTotal,
  bold,
}: {
  label: string;
  value: ReactNode;
  rightLabel?: string;
  rightValue?: ReactNode;
  rightTotal?: boolean;
  bold?: boolean;
}) {
  return (
    <tr className={bold || rightTotal ? "font-bold" : ""}>
      <td className="border border-[#858585] bg-[#e8f8f1] px-2 py-[5px] align-middle">
        {label}
      </td>
      <td className="break-words border border-[#858585] px-2 py-[5px] text-right font-mono align-middle">
        {presentValue(value)}
      </td>
      <td className="border border-[#858585] bg-[#e8f8f1] px-2 py-[5px] align-middle">
        {rightLabel}
      </td>
      <td className="break-words border border-[#858585] px-2 py-[5px] text-right font-mono align-middle">
        {rightTotal ? (
          <span style={totalValueStyle}>{presentValue(rightValue)}</span>
        ) : (
          presentValue(rightValue)
        )}
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
  const user = useSelector((state: RootState) => state.auth.user);

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
    const toastId = toast.loading("Exporting Policy Status PDF...");

    const elem = reportRef.current;
    const originalWidth = elem.style.width;

    try {
      elem.style.width = "760px";

      const canvas = await html2canvas(elem, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
      });

      const pdf = new jsPDF({ orientation: "p", unit: "mm", format: "a4", compress: true });
      const pageWidthMm = pdf.internal.pageSize.getWidth();
      const pageHeightMm = pdf.internal.pageSize.getHeight();
      const marginMm = 12;
      const scale = Math.min(
        (pageWidthMm - marginMm * 2) / canvas.width,
        (pageHeightMm - marginMm * 2) / canvas.height,
      );
      const imageWidthMm = canvas.width * scale;
      const imageHeightMm = canvas.height * scale;
      const x = (pageWidthMm - imageWidthMm) / 2;
      const y = (pageHeightMm - imageHeightMm) / 2;
      pdf.addImage(canvas.toDataURL("image/png"), "PNG", x, y, imageWidthMm, imageHeightMm);

      pdf.save(`Policy_Status_${formData.policyNumber || "Report"}.pdf`);
      toast.success("Policy Status PDF exported successfully!", { id: toastId });
    } catch (err: unknown) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Failed to generate PDF.", { id: toastId });
    } finally {
      elem.style.width = originalWidth;
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

      {/* Printable policy status statement */}
      <div
        ref={reportRef}
        style={{ fontFamily: "Arial, Helvetica, sans-serif", color: BLACK }}
        className="mx-auto flex min-h-[900px] w-full max-w-[760px] flex-col bg-white px-8 py-8 text-[10px] leading-tight sm:px-11 sm:py-10"
      >
        <header className="mb-5 min-h-[70px] self-start text-[10px] leading-[1.25]">
          {user?.name && (
            <div className="mb-0.5 text-[13px] font-bold text-[#080f71]">
              {user.name}
            </div>
          )}
          {user?.email && <div>{user.email}</div>}
          {!user?.name && !user?.email && (
            <div className="text-slate-500">Advisor profile details unavailable</div>
          )}
        </header>

        <h1 className="border border-[#333] bg-[#f4e7c8] px-2 py-1 text-[14px] font-bold leading-tight">
          Policy Status
        </h1>
        <div className="my-1.5 text-center text-[10px]">
          Date : {formatDate(formData.reportDate) || "—"}
        </div>

        <div className="mx-auto w-full max-w-[550px]">
          <table className="w-full table-fixed border-collapse text-[9px] leading-[1.2] sm:text-[10px]">
            <colgroup>
              <col className="w-[22%]" />
              <col className="w-[28%]" />
              <col className="w-[34%]" />
              <col className="w-[16%]" />
            </colgroup>
            <tbody>
              <tr>
                <td className="border border-[#858585] bg-[#e8f8f1] px-2 py-[5px] font-bold">
                  Policy No.
                </td>
                <td colSpan={3} className="border border-[#858585] px-2 py-[5px] font-bold font-mono break-words">
                  {formData.paymentType.toUpperCase().startsWith("S") ? "S " : ""}
                  {formData.policyNumber || "—"}
                </td>
              </tr>
              <tr>
                <td className="border border-[#858585] bg-[#e8f8f1] px-2 py-[5px] font-bold">
                  Name
                </td>
                <td colSpan={3} className="border border-[#858585] px-2 py-[5px] font-bold break-words">
                  {formData.clientName || "—"}
                </td>
              </tr>
              <tr>
                <td className="border border-[#858585] bg-[#e8f8f1] px-2 py-[5px] font-bold">
                  DOB
                </td>
                <td colSpan={3} className="border border-[#858585] px-2 py-[5px] font-mono">
                  {formatDate(formData.dob) || "—"}
                </td>
              </tr>
              <StatusRow
                label="Comm. Date"
                value={formatDate(formData.commencementDate) || "—"}
                rightLabel="Total Premiums Paid"
                rightValue={Number(formData.totalPremiumsPaid).toLocaleString("en-IN")}
                bold
              />
              <StatusRow
                label="Plan"
                value={formData.plan || "—"}
                rightLabel="Policy Status"
                rightValue={formData.policyStatus || "Inforce"}
                bold
              />
              <StatusRow
                label="Term"
                value={formData.term || "—"}
                rightLabel="Vested Bonus (S. V.)"
                rightValue={formData.vestedBonusSV ?? "—"}
              />
              <StatusRow
                label="Premium Term"
                value={formData.ppt || "—"}
                rightLabel="Paid Up Value"
                rightValue={formData.paidUpValueSV ?? "—"}
              />
              <StatusRow
                label="Sum"
                value={Number(formData.sumAssured).toLocaleString("en-IN")}
                rightLabel="Total"
                rightValue={formData.totalSV ?? "—"}
                bold
                rightTotal
              />
              <StatusRow
                label="Premium"
                value={Number(formData.premium).toFixed(2)}
                rightLabel="Vested Bonus (Loan)"
                rightValue={formData.vestedBonusLoan ?? "—"}
              />
              <StatusRow
                label="Mode"
                value={formData.mode || "Y"}
                rightLabel="Paid Up Value"
                rightValue={formData.paidUpValueLoan ?? "—"}
              />
              <StatusRow
                label="D. A. B."
                value={formData.dab ?? "—"}
                rightLabel="Total"
                rightValue={formData.totalLoan ?? "—"}
                rightTotal
              />
              <StatusRow
                label="Deposit Amount"
                value={Number(formData.depositAmount).toFixed(2)}
                rightLabel="S. V. Factor"
                rightValue={formData.svFactor || "0.00"}
              />
              <StatusRow
                label="Branch"
                value={formData.branch || "—"}
                rightLabel="Surr. Value"
                rightValue={formData.specialSurrenderValue ?? "—"}
              />
              <StatusRow
                label="F. U. P. Date"
                value={formatDate(formData.fupDate) || "—"}
                rightLabel="Guar. Surr. Value"
                rightValue={formData.guaranteedSurrenderValue ?? "—"}
              />
              <StatusRow
                label="Loan Taken"
                value={formData.loanTaken ?? "—"}
                rightLabel="Late Fee Interest"
                rightValue={formData.lateFeeInterest || "0.00"}
              />
              <StatusRow
                label="Loan Date"
                value={formatDate(formData.loanDate) || "—"}
                rightLabel="Discounted Value"
                rightValue={formData.discountedValue ?? "—"}
              />
              <StatusRow
                label="FULI Date"
                value={formatDate(formData.fuliDate) || "—"}
                rightLabel="Risk Cover"
                rightValue={formData.riskCover ?? "—"}
                bold
              />
              <StatusRow
                label="Payment Type"
                value={formData.paymentType || "Ordinary"}
                rightLabel="Loan Available"
                rightValue={formData.loanAvailable ?? "—"}
                bold
              />
              <StatusRow
                label="Remarks"
                value={formData.remarks || "—"}
                rightLabel=""
                rightValue=""
              />
            </tbody>
          </table>
        </div>

        <footer className="mt-auto pt-4 text-[9px]">
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1 border-t border-black pt-2">
            <span><strong>Y</strong> — Policies with NACH mode</span>
            <span><strong>A</strong> — Policies with APPS mode</span>
            <span><strong>S</strong> — Cheque dishonoured / Debit fail</span>
          </div>
          <div className="pt-2 text-center font-mono text-[8px]">DSS000019899</div>
        </footer>
      </div>
    </div>
  );
}