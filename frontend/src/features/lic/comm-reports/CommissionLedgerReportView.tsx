"use client";

import { useRef, useState, useMemo } from "react";
import { ArrowLeft, Download, FilterX } from "lucide-react";
import html2canvas from "html2canvas-pro";
import jsPDF from "jspdf";
import toast from "react-hot-toast";
import { CommissionLedgerFormData } from "./CommissionLedgerForm";

interface CommissionLedgerReportViewProps {
  formData: CommissionLedgerFormData;
  policies: any[];
  customers: any[];
  onBackToForm: () => void;
}

export default function CommissionLedgerReportView({
  formData,
  policies = [],
  customers = [],
  onBackToForm,
}: CommissionLedgerReportViewProps) {
  const reportRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  // Derive filtered policies based on form data
  const { filteredData, grandTotalCommission, activeFiltersSummary } = useMemo(() => {
    // 1. Data Filter (e.g. Agencies)
    const selectedAgencyFilters = (formData.dataFilters || [])
      .filter((f) => f.type === "Agencies")
      .map((f) => f.name.toLowerCase().trim());

    // 2. Policy Filter Selection
    const selectedPolicyItems = formData.policyFilterSelection?.selectedItems || [];
    const policyFilterType = formData.policyFilterSelection?.filterType;

    const activeFiltersSummaryList: string[] = [];
    if (selectedAgencyFilters.length > 0) {
      activeFiltersSummaryList.push(`Agency: ${formData.dataFilters.map(f => f.name).join(", ")}`);
    }
    if (selectedPolicyItems.length > 0) {
      activeFiltersSummaryList.push(`${policyFilterType}: ${selectedPolicyItems.length} selected`);
    }
    
    activeFiltersSummaryList.push(`Date: ${formData.fromDate || 'Start'} to ${formData.toDate || 'End'}`);

    // Helpers
    const JAYANT_ADVISOR_CODES = ["a001", "a002", "a003"];
    const MANISHA_ADVISOR_CODES = ["a004", "a005", "a006"];
    const isAgencyMatch = (p: any, agencyFilters: string[]) => {
      if (!agencyFilters || agencyFilters.length === 0) return true;
      const pAgCode = (p.agentCode || "").toLowerCase().trim();
      return agencyFilters.some((f) => {
        const fLower = f.toLowerCase().trim();
        if (!fLower) return true;
        if (fLower.includes("jayant") || fLower.includes("ag002")) return JAYANT_ADVISOR_CODES.includes(pAgCode);
        if (fLower.includes("manisha") || fLower.includes("ag003")) return MANISHA_ADVISOR_CODES.includes(pAgCode);
        if (fLower.includes("other") || fLower.includes("ag001")) return !JAYANT_ADVISOR_CODES.includes(pAgCode) && !MANISHA_ADVISOR_CODES.includes(pAgCode);
        return pAgCode.includes(fLower) || fLower.includes(pAgCode);
      });
    };

    // Filter policies
    let validPolicies = policies.filter((p) => {
      // Date Check (mocking with commencementDate if no actual commission date)
      if (formData.fromDate || formData.toDate) {
        const dStr = p.commencementDate ? new Date(p.commencementDate).toISOString().split("T")[0] : null;
        if (dStr) {
          if (formData.fromDate && dStr < formData.fromDate) return false;
          if (formData.toDate && dStr > formData.toDate) return false;
        }
      }

      // Agency Check
      if (!isAgencyMatch(p, selectedAgencyFilters)) return false;

      // Policy Selection Check
      if (policyFilterType === "Policies" && selectedPolicyItems.length > 0) {
        if (!selectedPolicyItems.some(i => i.id === p.id)) return false;
      }
      
      return true;
    });

    let totalComm = 0;
    
    // Map to view models
    const reportData = validPolicies.map((p, idx) => {
      const polNo = p.policyNo || "-";
      const holder = p.CustomerMaster?.name || "-";
      const premium = p.premiumAmount || 0; 
      const comm = Math.round(premium * 0.15); // Mock 15% commission if actual not available
      totalComm += comm;
      
      return {
        id: p.id || `temp-${idx}`,
        polNo,
        holder,
        date: p.commencementDate ? new Date(p.commencementDate).toLocaleDateString("en-GB") : "-",
        plan: p.planNo || "-",
        premium,
        commission: comm,
      };
    });

    return {
      filteredData: reportData,
      grandTotalCommission: totalComm,
      activeFiltersSummary: activeFiltersSummaryList.join(" | "),
    };
  }, [formData, policies]);

  const handleExportPDF = async () => {
    if (!reportRef.current) return;
    try {
      setIsExporting(true);
      toast.loading("Generating PDF...", { id: "pdf-export" });
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
      });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
      });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Commission_Ledger_${new Date().toISOString().split("T")[0]}.pdf`);
      toast.success("PDF generated successfully!", { id: "pdf-export" });
    } catch (error) {
      console.error("PDF Export Error:", error);
      toast.error("Failed to generate PDF.", { id: "pdf-export" });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <button
          onClick={onBackToForm}
          className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
        >
          <ArrowLeft size={16} />
          Edit Filters
        </button>
        <button
          onClick={handleExportPDF}
          disabled={isExporting}
          className="flex items-center gap-2 px-6 py-2 text-sm font-bold text-[#0B1220] bg-gradient-to-r from-[#B8873A] to-[#D9AE63] hover:brightness-105 rounded-lg shadow-md transition disabled:opacity-70 disabled:cursor-not-allowed"
        >
          <Download size={16} />
          {isExporting ? "Exporting..." : "Download PDF"}
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden overflow-x-auto">
        <div ref={reportRef} className="min-w-[1000px] p-8 bg-white text-slate-900">
          <div className="text-center mb-6 space-y-2 border-b border-slate-800 pb-6">
            <h1 className="text-2xl font-bold font-serif uppercase tracking-widest text-[#0B1220]">
              Commission Ledger Report
            </h1>
            <p className="text-sm font-bold text-slate-600">
              {activeFiltersSummary || "All Data"}
            </p>
          </div>

          <div className="border border-slate-800 rounded-lg overflow-hidden">
            <table className="w-full text-sm text-left border-collapse">
              <thead className="bg-[#0B1220] text-white">
                <tr>
                  <th className="px-4 py-3 font-bold border-r border-white/20 w-16 text-center">Sr.</th>
                  <th className="px-4 py-3 font-bold border-r border-white/20">Policy No</th>
                  <th className="px-4 py-3 font-bold border-r border-white/20">Policy Holder</th>
                  <th className="px-4 py-3 font-bold border-r border-white/20">Date</th>
                  <th className="px-4 py-3 font-bold border-r border-white/20">Plan</th>
                  <th className="px-4 py-3 font-bold border-r border-white/20 text-right">Premium (₹)</th>
                  <th className="px-4 py-3 font-bold text-right">Commission (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-300">
                {filteredData.length > 0 ? (
                  filteredData.map((row, idx) => (
                    <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-2 border-r border-slate-300 text-center font-medium">
                        {idx + 1}
                      </td>
                      <td className="px-4 py-2 border-r border-slate-300 font-bold text-[#0B1220]">
                        {row.polNo}
                      </td>
                      <td className="px-4 py-2 border-r border-slate-300">
                        {row.holder}
                      </td>
                      <td className="px-4 py-2 border-r border-slate-300 whitespace-nowrap">
                        {row.date}
                      </td>
                      <td className="px-4 py-2 border-r border-slate-300">
                        {row.plan}
                      </td>
                      <td className="px-4 py-2 border-r border-slate-300 text-right">
                        {row.premium.toLocaleString("en-IN")}
                      </td>
                      <td className="px-4 py-2 font-bold text-[#0B1220] text-right">
                        {row.commission.toLocaleString("en-IN")}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-500 font-medium bg-slate-50">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <FilterX size={32} className="text-slate-400" />
                        <p>No records found matching the current filters.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
              {filteredData.length > 0 && (
                <tfoot className="bg-[#F4F7FB] border-t-2 border-slate-800">
                  <tr>
                    <td colSpan={6} className="px-4 py-3 font-bold text-right border-r border-slate-300 uppercase tracking-wider text-[#0B1220]">
                      Grand Total Commission
                    </td>
                    <td className="px-4 py-3 font-bold text-right text-lg text-[#0B1220]">
                      ₹ {grandTotalCommission.toLocaleString("en-IN")}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
          
          <div className="mt-8 flex justify-between items-center text-xs font-bold text-slate-500 uppercase tracking-wider border-t border-slate-200 pt-4">
            <p>Generated on {new Date().toLocaleString("en-IN")}</p>
            <p>LIC Commission Reports & Analytics Engine</p>
          </div>
        </div>
      </div>
    </div>
  );
}
