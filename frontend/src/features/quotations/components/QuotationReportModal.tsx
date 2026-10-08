"use client";

import React, { useRef, useState } from "react";
import {
  X,
  Download,
  ExternalLink,
  FileSpreadsheet,
  Loader2,
} from "lucide-react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import toast from "react-hot-toast";
import { Quotation, ReportOptionsState } from "../types";

interface QuotationReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  quotation: Quotation | null;
  reportOptions?: ReportOptionsState;
}

function formatCurrency(val?: number | null) {
  if (val === undefined || val === null) return "₹ 0";
  return `₹ ${Number(val).toLocaleString("en-IN")}`;
}

function formatDate(dateStr?: string | null) {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export const QuotationReportModal: React.FC<QuotationReportModalProps> = ({
  isOpen,
  onClose,
  quotation,
  reportOptions = {
    coverPage: true,
    benefitsIllustration: true,
    agentsCopy: true,
    taxBreakup: true,
    medicalRequirement: true,
    yield: true,
  },
}) => {
  const reportRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  if (!isOpen || !quotation) return null;

  const calcDetails = quotation.calculationDetails;
  const yearlyRows = calcDetails?.yearlyIllustration || [];

  // ── Build PDF using html2canvas (same pattern as Policy Register) ──
  const buildPdf = async (): Promise<jsPDF | null> => {
    if (!reportRef.current) return null;

    const elem = reportRef.current;
    const originalWidth = elem.style.width;

    try {
      // Fixed width for consistent rendering
      elem.style.width = "900px";

      const canvas = await html2canvas(elem, {
        scale: 2,
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
        ctx.drawImage(
          canvas,
          0, renderedPx, canvas.width, sliceHeightPx,
          0, 0, canvas.width, sliceHeightPx
        );

        const imgData = pageCanvas.toDataURL("image/jpeg", 0.85);
        if (pageIndex > 0) pdf.addPage();
        pdf.addImage(
          imgData,
          "JPEG",
          0,
          0,
          pageWidthMm,
          sliceHeightPx / pxPerMm,
          undefined,
          "FAST"
        );

        renderedPx += sliceHeightPx;
        pageIndex += 1;
      }

      return pdf;
    } catch (err: any) {
      console.error("PDF build failed:", err);
      elem.style.width = originalWidth;
      return null;
    }
  };

  // ── View PDF — opens in new browser tab ──
  const handleViewPdf = async () => {
    setIsGenerating(true);
    try {
      const pdf = await buildPdf();
      if (!pdf) {
        toast.error("Failed to generate PDF.");
        return;
      }
      const blobUrl = pdf.output("bloburl") as unknown as string;
      window.open(blobUrl, "_blank");
    } catch (err: any) {
      console.error("PDF view failed:", err);
      toast.error("Failed to open PDF.");
    } finally {
      setIsGenerating(false);
    }
  };

  // ── Download PDF ──
  const handleDownloadPdf = async () => {
    setIsGenerating(true);
    const toastId = toast.loading("Preparing PDF download...");
    try {
      const pdf = await buildPdf();
      if (!pdf) {
        toast.error("Failed to generate PDF.", { id: toastId });
        return;
      }
      pdf.save(`LIC_Quotation_${quotation.quotationRefNo || "Report"}.pdf`);
      toast.success("Quotation PDF downloaded successfully!", { id: toastId });
    } catch (err: any) {
      console.error("PDF download failed:", err);
      toast.error("Failed to generate PDF.", { id: toastId });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/80 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-b from-[#1877F2] to-blue-700 text-white shadow-md shadow-blue-200">
              <FileSpreadsheet size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Quotation Report
              </h2>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-slate-500 font-medium">Ref No:</span>
                <span className="px-2 py-0.5 text-xs font-mono font-bold bg-blue-100 text-blue-800 rounded-md">
                  {quotation.quotationRefNo}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <p className="text-sm text-slate-600 leading-relaxed">
            Click <strong>"View in Browser"</strong> to open the report in a new tab, or{" "}
            <strong>"Download PDF"</strong> to save it to your device.
          </p>

          <div className="space-y-3">
            <button
              onClick={handleViewPdf}
              disabled={isGenerating}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl shadow-sm transition-all cursor-pointer"
            >
              {isGenerating ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <ExternalLink size={16} />
              )}
              {isGenerating ? "Generating..." : "View in Browser"}
            </button>

            <button
              onClick={handleDownloadPdf}
              disabled={isGenerating}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-xl shadow-sm transition-all cursor-pointer"
            >
              {isGenerating ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Download size={16} />
              )}
              {isGenerating ? "Generating..." : "Download PDF"}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-center rounded-b-2xl">
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg shadow-xs transition-all cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>

      {/* Hidden report content for PDF capture — black & white, clear fonts */}
      <div
        ref={reportRef}
        style={{
          position: "absolute",
          left: "-9999px",
          top: 0,
          width: "900px",
          background: "#ffffff",
          color: "#000000",
          fontFamily: "Arial, Helvetica, sans-serif",
          padding: "40px",
          fontSize: "12px",
          lineHeight: "1.5",
        }}
      >
        {/* Header */}
        <div style={{ borderBottom: "2px solid #000", paddingBottom: "16px", marginBottom: "24px", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div>
            <div style={{ fontSize: "20px", fontWeight: "bold", color: "#000" }}>
              JEM SOFT INSURANCE SERVICES
            </div>
            <div style={{ fontSize: "10px", color: "#333", marginTop: "4px" }}>
              Life Insurance Corporation of India (LIC) Authorized Quote
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "10px", fontWeight: "bold", textTransform: "uppercase", border: "1px solid #000", padding: "4px 8px", display: "inline-block" }}>
              {quotation.productType.replace(/_/g, " ")}
            </div>
            <div style={{ fontSize: "9px", color: "#333", marginTop: "4px" }}>
              Generated: {formatDate(new Date().toISOString())}
            </div>
          </div>
        </div>

        {/* 1. Proposer Details */}
        {reportOptions.coverPage && (
          <div style={{ border: "1px solid #000", padding: "16px", marginBottom: "20px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "12px" }}>
              <div>
                <div style={{ fontSize: "9px", color: "#333", marginBottom: "4px" }}>Proposer / Life Assured</div>
                <div style={{ fontSize: "13px", fontWeight: "bold" }}>{quotation.title} {quotation.proposerName}</div>
              </div>
              <div>
                <div style={{ fontSize: "9px", color: "#333", marginBottom: "4px" }}>Age / Gender</div>
                <div style={{ fontSize: "13px", fontWeight: "bold" }}>{quotation.age} Yrs / {quotation.gender}</div>
              </div>
              <div>
                <div style={{ fontSize: "9px", color: "#333", marginBottom: "4px" }}>Quotation Date</div>
                <div style={{ fontSize: "13px", fontWeight: "bold" }}>{formatDate(quotation.quotationDate)}</div>
              </div>
              <div>
                <div style={{ fontSize: "9px", color: "#333", marginBottom: "4px" }}>Commencement Date</div>
                <div style={{ fontSize: "13px", fontWeight: "bold" }}>{formatDate(quotation.commencementDate)}</div>
              </div>
            </div>
          </div>
        )}

        {/* 2. Plan & Premium Summary */}
        <div style={{ border: "1px solid #000", padding: "16px", marginBottom: "20px" }}>
          <div style={{ fontSize: "11px", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "12px", borderBottom: "1px solid #000", paddingBottom: "8px" }}>
            Plan Details & Premium Summary
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "8px" }}>
            <div style={{ border: "1px solid #000", padding: "8px" }}>
              <div style={{ fontSize: "8px", color: "#333", marginBottom: "4px" }}>Plan No / Term / PPT</div>
              <div style={{ fontSize: "11px", fontWeight: "bold" }}>
                {quotation.planNumber || "714"} / {quotation.policyTerm} / {quotation.ppt || quotation.policyTerm} Yrs
              </div>
            </div>
            <div style={{ border: "1px solid #000", padding: "8px" }}>
              <div style={{ fontSize: "8px", color: "#333", marginBottom: "4px" }}>Sum Assured</div>
              <div style={{ fontSize: "11px", fontWeight: "bold" }}>{formatCurrency(quotation.sumAssured)}</div>
            </div>
            <div style={{ border: "1px solid #000", padding: "8px" }}>
              <div style={{ fontSize: "8px", color: "#333", marginBottom: "4px" }}>Basic Yearly</div>
              <div style={{ fontSize: "11px", fontWeight: "bold" }}>{formatCurrency(quotation.basicPremium)}</div>
            </div>
            <div style={{ border: "1px solid #000", padding: "8px" }}>
              <div style={{ fontSize: "8px", color: "#333", marginBottom: "4px" }}>Installment ({quotation.premiumMode})</div>
              <div style={{ fontSize: "11px", fontWeight: "bold" }}>{formatCurrency(quotation.installmentPremium || quotation.totalPremium)}</div>
            </div>
            <div style={{ border: "1px solid #000", padding: "8px" }}>
              <div style={{ fontSize: "8px", color: "#333", marginBottom: "4px" }}>Est. Maturity Value</div>
              <div style={{ fontSize: "11px", fontWeight: "bold" }}>{formatCurrency(quotation.maturityAmount)}</div>
            </div>
          </div>
        </div>

        {/* 3. Tax Breakup */}
        {reportOptions.taxBreakup && (
          <div style={{ border: "1px solid #000", padding: "16px", marginBottom: "20px" }}>
            <div style={{ fontSize: "11px", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "12px", borderBottom: "1px solid #000", paddingBottom: "8px" }}>
              Income Tax Savings (Section 80C & 10(10D))
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
              <div>
                <div style={{ fontSize: "9px", color: "#333", marginBottom: "4px" }}>Sec. 80C Investment Limit</div>
                <div style={{ fontSize: "12px", fontWeight: "bold" }}>{formatCurrency(quotation.sec80CLimit)}</div>
              </div>
              <div>
                <div style={{ fontSize: "9px", color: "#333", marginBottom: "4px" }}>Tax Bracket / Slab</div>
                <div style={{ fontSize: "12px", fontWeight: "bold" }}>{quotation.taxSlabPercentage}%</div>
              </div>
              <div>
                <div style={{ fontSize: "9px", color: "#333", marginBottom: "4px" }}>Annual Tax Savings Estimate</div>
                <div style={{ fontSize: "12px", fontWeight: "bold" }}>
                  {formatCurrency(calcDetails?.taxSavingsAmount || (quotation.basicPremium * (quotation.taxSlabPercentage / 100)))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 4. Yearly Illustration Table */}
        {(reportOptions.benefitsIllustration || reportOptions.benefitsForecast) && (
          <div style={{ border: "1px solid #000", marginBottom: "20px" }}>
            <div style={{ padding: "12px 16px", borderBottom: "1px solid #000", fontSize: "11px", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "1px" }}>
              Year-by-Year Benefit & Risk Cover Illustration ({quotation.bonusScenario})
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "10px" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #000" }}>
                  <th style={{ padding: "8px 6px", textAlign: "left", fontWeight: "bold" }}>Year</th>
                  <th style={{ padding: "8px 6px", textAlign: "left", fontWeight: "bold" }}>Age</th>
                  <th style={{ padding: "8px 6px", textAlign: "right", fontWeight: "bold" }}>Annual Premium</th>
                  <th style={{ padding: "8px 6px", textAlign: "right", fontWeight: "bold" }}>Cumulative Paid</th>
                  <th style={{ padding: "8px 6px", textAlign: "right", fontWeight: "bold" }}>Normal Life Cover</th>
                  <th style={{ padding: "8px 6px", textAlign: "right", fontWeight: "bold" }}>Accidental Cover</th>
                  <th style={{ padding: "8px 6px", textAlign: "right", fontWeight: "bold" }}>Surrender Value</th>
                  <th style={{ padding: "8px 6px", textAlign: "right", fontWeight: "bold" }}>Returns / Maturity</th>
                </tr>
              </thead>
              <tbody>
                {yearlyRows.length > 0 ? (
                  yearlyRows.map((r) => (
                    <tr key={r.policyYear} style={{ borderBottom: "1px solid #ddd" }}>
                      <td style={{ padding: "6px", fontFamily: "monospace" }}>{r.policyYear}</td>
                      <td style={{ padding: "6px" }}>{r.age}</td>
                      <td style={{ padding: "6px", textAlign: "right" }}>{formatCurrency(r.premium)}</td>
                      <td style={{ padding: "6px", textAlign: "right" }}>{formatCurrency(r.cumulativePremium)}</td>
                      <td style={{ padding: "6px", textAlign: "right", fontWeight: "bold" }}>{formatCurrency(r.normalCover)}</td>
                      <td style={{ padding: "6px", textAlign: "right", fontWeight: "bold" }}>{formatCurrency(r.accidentalCover)}</td>
                      <td style={{ padding: "6px", textAlign: "right" }}>{formatCurrency(r.surrenderValue)}</td>
                      <td style={{ padding: "6px", textAlign: "right", fontWeight: "bold" }}>
                        {r.policyYear === quotation.policyTerm
                          ? formatCurrency(r.cashFlowReturns || 0)
                          : r.surrenderValue > 0
                            ? formatCurrency(r.surrenderValue)
                            : "—"}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} style={{ padding: "24px", textAlign: "center", color: "#666" }}>
                      Illustration available for calculated scenarios.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* 5. Medical & Agent's Copy */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "20px" }}>
          {reportOptions.medicalRequirement && (
            <div style={{ border: "1px solid #000", padding: "12px" }}>
              <div style={{ fontSize: "10px", fontWeight: "bold", marginBottom: "8px" }}>Medical & Underwriting Requirements</div>
              <div style={{ fontSize: "10px", color: "#333", lineHeight: "1.6" }}>
                • Age: {quotation.age} Yrs | Sum Assured: {formatCurrency(quotation.sumAssured)}
                <br />
                • Standard non-medical eligibility applies for standard healthy lives.
                <br />
                • Smoker Status: {quotation.isSmoker ? "Smoker" : "Non-Smoker"}.
              </div>
            </div>
          )}
          {reportOptions.agentsCopy && (
            <div style={{ border: "1px solid #000", padding: "12px" }}>
              <div style={{ fontSize: "10px", fontWeight: "bold", marginBottom: "8px" }}>Confidential Agent Summary</div>
              <div style={{ fontSize: "10px", color: "#333", lineHeight: "1.6" }}>
                • Quotation Ref: {quotation.quotationRefNo}
                <br />
                • Proposer: {quotation.proposerName}
                <br />
                • Ready for direct conversion to official LIC proposal form.
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ borderTop: "1px solid #000", paddingTop: "12px", fontSize: "9px", color: "#666", textAlign: "center" }}>
          This is a computer-generated illustration and does not constitute a policy contract.
        </div>
      </div>
    </div>
  );
};
