"use client";

import { useRef, useState, useMemo } from "react";
import {
  ArrowLeft,
  Download,
  Printer,
  FileSpreadsheet,
  FilterX,
  Building2,
  Calendar,
  IndianRupee,
  Shield,
  User,
} from "lucide-react";
import html2canvas from "html2canvas-pro";
import jsPDF from "jspdf";
import toast from "react-hot-toast";
import { CommissionLedgerFormData } from "./CommissionLedgerForm";
import { getCustomerFullName } from "./commReportsUtils";

interface CommissionLedgerReportViewProps {
  formData: CommissionLedgerFormData;
  policies: any[];
  customers?: any[];
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
  const { filteredData, grandTotalPremium, grandTotalCommission, activeFiltersSummary } =
    useMemo(() => {
      const summaryList: string[] = [];

      // 1. Date Range
      if (formData.fromDate && formData.toDate) {
        summaryList.push(`Period: ${formData.fromDate} to ${formData.toDate}`);
      } else if (formData.fromDate) {
        summaryList.push(`From: ${formData.fromDate}`);
      } else if (formData.toDate) {
        summaryList.push(`To: ${formData.toDate}`);
      }

      // 2. Agent
      if (formData.selectedAgentId && formData.selectedAgentId !== "ALL") {
        summaryList.push(`Agent: ${formData.selectedAgentName}`);
      } else {
        summaryList.push(`Agent: All Agents`);
      }

      // 3. Policy Filter
      const selectedPolicyIds = formData.policyFilterSelection?.selectedIds || [];
      if (selectedPolicyIds.length > 0) {
        summaryList.push(`Policies: ${selectedPolicyIds.length} Selected`);
      }

      const targetAgent =
        formData.selectedAgentId && formData.selectedAgentId !== "ALL"
          ? formData.selectedAgentId.toLowerCase().trim()
          : null;

      // Filter policies
      const matchedPolicies = policies.filter((p) => {
        // Date Check (check commencementDate, issueDate, or createdAt)
        if (formData.fromDate || formData.toDate) {
          const rawDate = p.commencementDate || p.issueDate || p.createdAt;
          if (rawDate) {
            const dStr = new Date(rawDate).toISOString().split("T")[0];
            if (formData.fromDate && dStr < formData.fromDate) return false;
            if (formData.toDate && dStr > formData.toDate) return false;
          }
        }

        // Agent Check
        if (targetAgent) {
          const pAdvisorId = p.advisorId ? String(p.advisorId).toLowerCase().trim() : "";
          const pAgentCode = p.agentCode ? String(p.agentCode).toLowerCase().trim() : "";
          const advName = p.advisor?.advisorName ? String(p.advisor.advisorName).toLowerCase().trim() : "";
          const advCode = p.advisor?.advisorCode ? String(p.advisor.advisorCode).toLowerCase().trim() : "";
          const agencyId = p.advisor?.agencyId ? String(p.advisor.agencyId).toLowerCase().trim() : "";

          const isMatch =
            pAdvisorId === targetAgent ||
            pAgentCode === targetAgent ||
            advCode === targetAgent ||
            advName === targetAgent ||
            agencyId === targetAgent ||
            (advName && advName.includes(targetAgent));

          if (!isMatch) return false;
        }

        // Policy Filter Selection Check
        if (selectedPolicyIds.length > 0) {
          const pId = String(p.id);
          if (!selectedPolicyIds.includes(pId)) return false;
        }

        return true;
      });

      let totalPrem = 0;
      let totalComm = 0;

      const reportData = matchedPolicies.map((p, idx) => {
        const polNo = p.policyNumber || p.policyNo || `POL-${idx + 1}`;
        const holder =
          getCustomerFullName(p.CustomerMaster) !== "-"
            ? getCustomerFullName(p.CustomerMaster)
            : p.customer?.groupName || p.customer?.name || "Customer";

        const agentLabel = p.advisor?.advisorName
          ? `${p.advisor.advisorName}${p.advisor.advisorCode ? ` (${p.advisor.advisorCode})` : ""}`
          : p.agentCode
          ? `Agent: ${p.agentCode}`
          : "Direct";

        const premium = Number(
          p.premium?.installmentPremium ||
            p.premium?.totalInstallmentPremium ||
            p.premium?.totalYearlyPremium ||
            p.premiumAmount ||
            0
        );

        // Standard LIC commission rate calculation (default 15% for first year / general ledger)
        const commRate = 15;
        const commAmount = Math.round(premium * (commRate / 100));

        totalPrem += premium;
        totalComm += commAmount;

        const dateStr = p.commencementDate
          ? new Date(p.commencementDate).toLocaleDateString("en-GB")
          : "-";

        const planStr = p.product?.planNumber
          ? `Table ${p.product.planNumber}`
          : p.product?.productName || "-";

        return {
          id: p.id || `temp-${idx}`,
          polNo,
          holder,
          agentLabel,
          date: dateStr,
          plan: planStr,
          premium,
          commRate,
          commission: commAmount,
        };
      });

      return {
        filteredData: reportData,
        grandTotalPremium: totalPrem,
        grandTotalCommission: totalComm,
        activeFiltersSummary: summaryList.join(" | "),
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

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-300">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
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
            onClick={handleExportPDF}
            disabled={isExporting}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#5c67ff] to-[#3a47ff] px-6 py-2.5 text-xs font-semibold text-white shadow-md shadow-blue-200 hover:brightness-110 active:scale-[0.98] transition disabled:opacity-60"
          >
            <Download size={15} />
            {isExporting ? "Exporting PDF..." : "Download PDF"}
          </button>
        </div>
      </div>

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#1877F2]">
            <Shield size={22} />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Policies
            </span>
            <div className="text-xl font-bold text-slate-900 mt-0.5">
              {filteredData.length}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
            <Building2 size={22} />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Premium
            </span>
            <div className="text-xl font-bold text-slate-900 mt-0.5">
              ₹ {grandTotalPremium.toLocaleString("en-IN")}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <IndianRupee size={22} />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Commission
            </span>
            <div className="text-xl font-bold text-emerald-600 mt-0.5">
              ₹ {grandTotalCommission.toLocaleString("en-IN")}
            </div>
          </div>
        </div>
      </div>

      {/* Printable Report Document Card */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden overflow-x-auto">
        <div ref={reportRef} className="min-w-[950px] p-8 bg-white text-slate-900">
          {/* Report Sheet Header */}
          <div className="text-center pb-6 border-b border-slate-200 space-y-1.5">
            <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-[#1877F2]">
              LIC Commission Ledger Statement
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Commission Ledger Report
            </h1>
            <p className="text-xs font-medium text-slate-500">
              {activeFiltersSummary}
            </p>
          </div>

          {/* Report Data Table */}
          <div className="mt-6 rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-left text-xs text-slate-700 border-collapse">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500">
                <tr>
                  <th className="px-3 py-3 font-bold uppercase tracking-wider text-center w-12 border-r border-slate-200">
                    Sr.
                  </th>
                  <th className="px-3 py-3 font-bold uppercase tracking-wider border-r border-slate-200">
                    Policy No
                  </th>
                  <th className="px-3 py-3 font-bold uppercase tracking-wider border-r border-slate-200">
                    Policy Holder
                  </th>
                  <th className="px-3 py-3 font-bold uppercase tracking-wider border-r border-slate-200">
                    Agent / Advisor
                  </th>
                  <th className="px-3 py-3 font-bold uppercase tracking-wider border-r border-slate-200">
                    Plan
                  </th>
                  <th className="px-3 py-3 font-bold uppercase tracking-wider border-r border-slate-200 text-center">
                    Comm. Date
                  </th>
                  <th className="px-3 py-3 font-bold uppercase tracking-wider text-right border-r border-slate-200">
                    Premium (₹)
                  </th>
                  <th className="px-3 py-3 font-bold uppercase tracking-wider text-center border-r border-slate-200 w-16">
                    Rate
                  </th>
                  <th className="px-3 py-3 font-bold uppercase tracking-wider text-right">
                    Commission (₹)
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredData.length > 0 ? (
                  filteredData.map((row, idx) => (
                    <tr
                      key={row.id}
                      className={`hover:bg-blue-50/30 transition ${
                        idx % 2 === 0 ? "bg-white" : "bg-slate-50/30"
                      }`}
                    >
                      <td className="px-3 py-3 text-center font-medium text-slate-400 border-r border-slate-100">
                        {idx + 1}
                      </td>
                      <td className="px-3 py-3 font-bold font-mono text-slate-900 border-r border-slate-100">
                        {row.polNo}
                      </td>
                      <td className="px-3 py-3 font-semibold text-slate-900 border-r border-slate-100">
                        {row.holder}
                      </td>
                      <td className="px-3 py-3 text-slate-600 border-r border-slate-100">
                        {row.agentLabel}
                      </td>
                      <td className="px-3 py-3 text-slate-600 border-r border-slate-100">
                        {row.plan}
                      </td>
                      <td className="px-3 py-3 text-center text-slate-600 border-r border-slate-100 whitespace-nowrap">
                        {row.date}
                      </td>
                      <td className="px-3 py-3 text-right font-medium text-slate-800 border-r border-slate-100">
                        {row.premium > 0 ? row.premium.toLocaleString("en-IN") : "-"}
                      </td>
                      <td className="px-3 py-3 text-center text-slate-500 border-r border-slate-100">
                        {row.commRate}%
                      </td>
                      <td className="px-3 py-3 text-right font-bold text-slate-900">
                        ₹ {row.commission.toLocaleString("en-IN")}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={9} className="px-4 py-16 text-center text-slate-400 bg-slate-50/20">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <FilterX size={32} className="text-slate-300" />
                        <p className="font-semibold text-slate-600 text-sm">
                          No policies match the selected criteria
                        </p>
                        <p className="text-xs text-slate-400">
                          Try adjusting the date range or selecting a different agent.
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>

              {filteredData.length > 0 && (
                <tfoot className="bg-[#f0f7ff] border-t-2 border-slate-300 font-bold">
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-3.5 text-right uppercase tracking-wider text-xs text-slate-700 border-r border-blue-200"
                    >
                      Grand Total
                    </td>
                    <td className="px-3 py-3.5 text-right text-xs text-slate-900 border-r border-blue-200">
                      ₹ {grandTotalPremium.toLocaleString("en-IN")}
                    </td>
                    <td className="px-3 py-3.5 border-r border-blue-200" />
                    <td className="px-3 py-3.5 text-right text-sm text-[#1877F2]">
                      ₹ {grandTotalCommission.toLocaleString("en-IN")}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          {/* Report Footer Note */}
          <div className="mt-8 flex justify-between items-center text-[11px] font-medium text-slate-400 border-t border-slate-100 pt-4">
            <p>Generated on {new Date().toLocaleString("en-IN")}</p>
            <p>LIC Commission Reports & Analytics Engine</p>
          </div>
        </div>
      </div>
    </div>
  );
}
