"use client";

import { useRef, useState } from "react";
import { ArrowLeft, Download, Printer, Shield } from "lucide-react";
import { LoanSurrenderQuotationFormData } from "./LoanSurrenderQuotationForm";
import html2canvas from "html2canvas-pro";
import jsPDF from "jspdf";
import toast from "react-hot-toast";

interface LoanSurrenderQuotationReportViewProps {
  formData: LoanSurrenderQuotationFormData;
  onBackToForm: () => void;
}

export default function LoanSurrenderQuotationReportView({
  formData,
  onBackToForm,
}: LoanSurrenderQuotationReportViewProps) {
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

  const isLoanQuotation = formData.quotationType === "loan";

  // Handle PDF Export
  const handleExportPDF = async () => {
    if (!reportRef.current) return;
    setIsExporting(true);
    const toastId = toast.loading("Exporting Executive Value Quotation PDF...");

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

      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });
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

      pdf.save(
        `${isLoanQuotation ? "Loan_Quotation" : "Surrender_Value_Quotation"}_${
          formData.policyNumber || "Report"
        }.pdf`
      );
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
            <span>Edit Quotation</span>
          </button>
          <span className="text-xs bg-blue-50 text-[#1877F2] font-bold px-3 py-1 rounded-full border border-blue-200 uppercase tracking-wider">
            {isLoanQuotation
              ? "Official Loan Quotation Statement"
              : "Official Surrender Value Quotation Statement"}
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

      {/* Main Printable Document Canvas — Plain LIC-style register */}
      <div
        ref={reportRef}
        style={{ fontFamily: "Arial, Helvetica, sans-serif", color: "#000" }}
        className="w-full bg-white px-6 py-6 border border-slate-300 shadow-xl text-[10px] leading-snug print:p-0 print:border-none print:shadow-none"
      >
        {/* Report title line */}
        <div className="flex justify-between items-end pb-0.5 text-[11px] font-semibold">
          <span>
            {isLoanQuotation ? "Loan Value Quotation" : "Surrender Value Quotation"} as on {formatDate(formData.dateOfCalculation)}
          </span>
          <span>Policy No: {formData.policyNumber || "—"}</span>
        </div>
        <div className="pb-1 text-[9px] font-normal">
          {isLoanQuotation ? "Loan Value Quotation Statement" : "Surrender & Maturity Value Calculation"}
        </div>

        {/* Policy & Client Details — Plain table */}
        <table className="w-full text-left text-[10px] border-collapse">
          <tbody>
            <tr>
              <td className="py-1 pr-2 font-semibold w-[18%]">Policy Number</td>
              <td className="py-1 pr-6 font-mono font-bold w-[32%]">{formData.policyNumber || "-"}</td>
              <td className="py-1 pr-2 font-semibold w-[18%]">Client Name</td>
              <td className="py-1 font-bold">{formData.clientName || "-"}</td>
            </tr>
            <tr>
              <td className="py-1 pr-2 font-semibold">Date of Birth</td>
              <td className="py-1 pr-6 font-mono">{formatDate(formData.dob) || "-"}</td>
              <td className="py-1 pr-2 font-semibold">Commencement Date</td>
              <td className="py-1 font-mono">{formatDate(formData.commencementDate) || "-"}</td>
            </tr>
            <tr>
              <td className="py-1 pr-2 font-semibold">Plan / Term / PPT</td>
              <td className="py-1 pr-6 font-mono font-bold">
                {formData.plan || "14"} / {formData.term || 20} / {formData.ppt || 20}
              </td>
              <td className="py-1 pr-2 font-semibold">Premium Mode</td>
              <td className="py-1 font-mono">{formData.mode || "Y"}</td>
            </tr>
          </tbody>
        </table>

        {/* Financial Parameters & Valuation — Plain table */}
        <table className="w-full text-left text-[10px] border-collapse mt-2">
          <tbody>
            <tr>
              <td className="py-1 pr-2 font-semibold w-[25%]">Sum Assured</td>
              <td className="py-1 pr-6 font-mono text-right font-bold w-[25%]">{Number(formData.sumAssured).toLocaleString("en-IN")}</td>
              <td className="py-1 pr-2 font-semibold w-[25%]">Vested Bonus (S.V.)</td>
              <td className="py-1 font-mono text-right w-[25%]">{Number(formData.vestedBonusSV).toLocaleString("en-IN")}</td>
            </tr>
            <tr>
              <td className="py-1 pr-2 font-semibold">Basic Premium</td>
              <td className="py-1 pr-6 font-mono text-right">{Number(formData.basicPremium).toFixed(2)}</td>
              <td className="py-1 pr-2 font-semibold">Paid Up Value</td>
              <td className="py-1 font-mono text-right">{Number(formData.paidUpValueSV).toLocaleString("en-IN")}</td>
            </tr>
            <tr>
              <td className="py-1 pr-2 font-semibold">Rider Premium</td>
              <td className="py-1 pr-6 font-mono text-right">{Number(formData.riderPremium).toFixed(2)}</td>
              <td className="py-1 pr-2 font-semibold">S.V. Factor</td>
              <td className="py-1 font-mono text-right">{formData.svFactor || "0.00"}</td>
            </tr>
            <tr>
              <td className="py-1 pr-2 font-semibold">Installment Premium</td>
              <td className="py-1 pr-6 font-mono text-right font-bold">{Number(formData.premium).toFixed(2)}</td>
              <td className="py-1 pr-2 font-semibold">Special Surrender Value</td>
              <td className="py-1 font-mono text-right">{Number(formData.specialSurrenderValue).toLocaleString("en-IN")}</td>
            </tr>
            <tr>
              <td className="py-1 pr-2 font-semibold">F.U.P. Date</td>
              <td className="py-1 pr-6 font-mono text-right">{formatDate(formData.fupDate) || "-"}</td>
              <td className="py-1 pr-2 font-semibold">Guaranteed Surrender Value</td>
              <td className="py-1 font-mono text-right">{Number(formData.guaranteedSurrenderValue).toLocaleString("en-IN")}</td>
            </tr>
            <tr>
              <td className="py-1 pr-2 font-semibold">Loan Taken Outstanding</td>
              <td className="py-1 pr-6 font-mono text-right">{Number(formData.loanTaken).toLocaleString("en-IN")}</td>
              <td className="py-1 pr-2 font-semibold">No. of Years Paid</td>
              <td className="py-1 font-mono text-right font-bold">{formData.yearsPremiumsPaid || 0}</td>
            </tr>
            <tr>
              <td className="py-1 pr-2 font-semibold">No. of Years Elapsed</td>
              <td className="py-1 pr-6 font-mono text-right">{formData.yearsElapsed || 0}</td>
              <td className="py-1 pr-2 font-semibold"></td>
              <td className="py-1"></td>
            </tr>
          </tbody>
        </table>

        {/* Valuation Results — Plain table with borders */}
        <table className="w-full text-left text-[10px] border-collapse mt-2">
          <tbody>
            <tr>
              <td className="py-1 pr-2 font-semibold w-[25%]">Total Value (Paid Up + Bonus)</td>
              <td className="py-1 pr-6 font-mono text-right font-bold w-[25%]">{Number(formData.totalSV).toLocaleString("en-IN")}</td>
              <td className="py-1 pr-2 font-semibold w-[25%]">Projected Maturity Amount</td>
              <td className="py-1 font-mono text-right w-[25%]">{Number(formData.projectedMaturityAmount).toLocaleString("en-IN")}</td>
            </tr>
            <tr className="font-bold">
              <td className="py-1 pr-2 font-bold" colSpan={2}>Surrender Value Payable</td>
              <td className="py-1 font-mono text-right font-bold" colSpan={2}>
                <span className="inline-block border-t border-b border-black px-1">
                  {Number(formData.surrenderValuePayable).toLocaleString("en-IN")}
                </span>
              </td>
            </tr>
            <tr className="font-bold">
              <td className="py-1 pr-2 font-bold" colSpan={2}>Max Loan Available</td>
              <td className="py-1 font-mono text-right font-bold" colSpan={2}>
                <span className="inline-block border-t border-b border-black px-1">
                  {Number(formData.loanAvailable).toLocaleString("en-IN")}
                </span>
              </td>
            </tr>
          </tbody>
        </table>

        {/* Remarks */}
        <div className="pt-2 text-[9px]">
          Remarks: {formData.remarks || "Standard quotation generated."}
        </div>

        {/* Legend footer */}
        <div className="pt-4 mt-4 space-y-1 text-[9px]" style={{ borderTop: "1px solid #000" }}>
          <div className="flex flex-wrap gap-x-5 gap-y-0.5">
            <span><strong>Y :</strong> NACH Mode</span>
            <span><strong>M :</strong> Monthly Mode</span>
            <span><strong>Q :</strong> Quarterly Mode</span>
            <span><strong>H :</strong> Half-Yearly Mode</span>
            <span><strong>S :</strong> Single Mode</span>
          </div>
          <div className="flex justify-between font-mono text-[8px] pt-1">
            <span>Statement Code: DSS000019899</span>
            <span>LIC OFFICIAL QUOTATION REF: LQ{formData.policyNumber || "001"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
