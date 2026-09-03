"use client";

import { useRef, useState, useMemo } from "react";
import {
  ArrowLeft,
  Download,
  Printer,
  FilterX,
  Building2,
  Calendar,
  IndianRupee,
  Shield,
  User,
  CheckCircle2,
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

const JAYANT_ADVISOR_CODES = ["a001", "a002", "a003"];
const MANISHA_ADVISOR_CODES = ["a004", "a005", "a006"];

export default function CommissionLedgerReportView({
  formData,
  policies = [],
  customers = [],
  onBackToForm,
}: CommissionLedgerReportViewProps) {
  const reportRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  // Agency filter matching
  const selectedAgencyFilters = useMemo(() => {
    return (formData.dataFilters || [])
      .filter((f) => f.type === "Agencies")
      .map((f) => f.name.toLowerCase().trim());
  }, [formData.dataFilters]);

  const isAgencyMatch = (p: any, agencyFilters: string[]) => {
    if (!agencyFilters || agencyFilters.length === 0) return true;

    const pAgCode = (p.agentCode || "").toLowerCase().trim();
    const pAdvCode = (p.advisor?.advisorCode || "").toLowerCase().trim();
    const pAdvName = (p.advisor?.advisorName || "").toLowerCase().trim();

    return agencyFilters.some((f) => {
      const fLower = f.toLowerCase().trim();
      if (!fLower) return true;

      // Jayant Mahabole (AG002)
      if (fLower.includes("jayant") || fLower.includes("ag002")) {
        return (
          JAYANT_ADVISOR_CODES.includes(pAgCode) ||
          JAYANT_ADVISOR_CODES.includes(pAdvCode) ||
          pAdvName.includes("jayant")
        );
      }

      // Manisha Y Mahabole (AG003)
      if (fLower.includes("manisha") || fLower.includes("ag003")) {
        return (
          MANISHA_ADVISOR_CODES.includes(pAgCode) ||
          MANISHA_ADVISOR_CODES.includes(pAdvCode) ||
          pAdvName.includes("manisha")
        );
      }

      // Other Agencies (AG001)
      if (fLower.includes("other") || fLower.includes("ag001")) {
        return (
          !JAYANT_ADVISOR_CODES.includes(pAgCode) &&
          !MANISHA_ADVISOR_CODES.includes(pAgCode) &&
          !JAYANT_ADVISOR_CODES.includes(pAdvCode) &&
          !MANISHA_ADVISOR_CODES.includes(pAdvCode)
        );
      }

      return pAgCode.includes(fLower) || pAdvCode.includes(fLower) || pAdvName.includes(fLower);
    });
  };

  // Derive filtered policies based on form data
  const {
    filteredData,
    grandTotalSumAssured,
    grandTotalPremium,
    grandTotalGrossCommission,
    grandTotalTds,
    grandTotalNetCommission,
    activeFiltersSummary,
    agencyDisplayName,
  } = useMemo(() => {
    const summaryList: string[] = [];

    // 1. Date Range
    if (formData.fromDate && formData.toDate) {
      summaryList.push(`Period: ${formData.fromDate} to ${formData.toDate}`);
    } else if (formData.fromDate) {
      summaryList.push(`From: ${formData.fromDate}`);
    } else if (formData.toDate) {
      summaryList.push(`To: ${formData.toDate}`);
    }

    // 2. Agency
    if (selectedAgencyFilters.length > 0) {
      summaryList.push(`Agency: ${formData.dataFilters.filter((f) => f.type === "Agencies").map((f) => f.name).join(", ")}`);
    } else {
      summaryList.push(`Agency: All Agencies`);
    }

    // 3. Policy Filter
    const selectedPolicyIds = formData.policyFilterSelection?.selectedIds || [];
    if (selectedPolicyIds.length > 0) {
      summaryList.push(`Policies: ${selectedPolicyIds.length} Selected`);
    }

    // Agency name display
    const agencyDisplayName =
      formData.dataFilters?.find((f) => f.type === "Agencies")?.name ||
      "Jayant Mahabole";

    // Filter policies
    const matchedPolicies = policies.filter((p) => {
      // Date Check (commencementDate or issueDate or createdAt)
      if (formData.fromDate || formData.toDate) {
        const rawDate = p.commencementDate || p.issueDate || p.createdAt;
        if (rawDate) {
          const dStr = new Date(rawDate).toISOString().split("T")[0];
          if (formData.fromDate && dStr < formData.fromDate) return false;
          if (formData.toDate && dStr > formData.toDate) return false;
        }
      }

      // Agency Check
      if (!isAgencyMatch(p, selectedAgencyFilters)) return false;

      // Policy Filter Selection Check
      if (selectedPolicyIds.length > 0) {
        const pId = String(p.id);
        if (!selectedPolicyIds.includes(pId)) return false;
      }

      return true;
    });

    let totalSum = 0;
    let totalPrem = 0;
    let totalGrossComm = 0;
    let totalTds = 0;
    let totalNetComm = 0;

    const reportData = matchedPolicies.map((p, idx) => {
      const polNo = p.policyNumber || p.policyNo || `POL-${idx + 1}`;
      const holder =
        getCustomerFullName(p.CustomerMaster) !== "-"
          ? getCustomerFullName(p.CustomerMaster)
          : p.customer?.groupName || p.customer?.name || "Customer";

      const groupCode = p.customer?.groupCode || "-";

      const agentLabel = p.advisor?.advisorName
        ? `${p.advisor.advisorName}${p.advisor.advisorCode ? ` (${p.advisor.advisorCode})` : ""}`
        : p.agentCode
        ? `Agent: ${p.agentCode}`
        : "Direct";

      const sumAssured = Number(p.premium?.sumAssured || p.sumAssured || 0);

      const premium = Number(
        p.premium?.installmentPremium ||
          p.premium?.totalInstallmentPremium ||
          p.premium?.totalYearlyPremium ||
          p.premiumAmount ||
          0
      );

      // Mode resolution
      const rawMode = (p.premiumMode?.modeName || p.mode || "Yearly").toUpperCase();
      const modeCode = rawMode.startsWith("M")
        ? "M"
        : rawMode.startsWith("Q")
        ? "Q"
        : rawMode.startsWith("H")
        ? "H"
        : rawMode.startsWith("S")
        ? "S"
        : "Y";

      // Commission calculations: 15% Standard First Year / Ledger rate
      const commRate = 15;
      const grossComm = Math.round(premium * (commRate / 100));
      const tdsAmount = Math.round(grossComm * 0.05); // Standard 5% TDS
      const netComm = grossComm - tdsAmount;

      totalSum += sumAssured;
      totalPrem += premium;
      totalGrossComm += grossComm;
      totalTds += tdsAmount;
      totalNetComm += netComm;

      const dateStr = p.commencementDate
        ? new Date(p.commencementDate).toLocaleDateString("en-GB")
        : "-";

      const planTermPpt = `${p.product?.planNumber || "—"}/${p.policyTerm || "—"}/${p.premiumPayingTerm || "—"}`;

      return {
        id: p.id || `temp-${idx}`,
        polNo,
        holder,
        groupCode,
        agentLabel,
        date: dateStr,
        planTermPpt,
        mode: modeCode,
        sumAssured,
        premium,
        commRate,
        grossCommission: grossComm,
        tdsAmount,
        netCommission: netComm,
      };
    });

    return {
      filteredData: reportData,
      grandTotalSumAssured: totalSum,
      grandTotalPremium: totalPrem,
      grandTotalGrossCommission: totalGrossComm,
      grandTotalTds: totalTds,
      grandTotalNetCommission: totalNetComm,
      activeFiltersSummary: summaryList.join(" | "),
      agencyDisplayName,
    };
  }, [formData, policies, selectedAgencyFilters]);

  const handleDownloadPDF = async () => {
    if (!reportRef.current) return;
    setIsExporting(true);
    const toastId = toast.loading("Generating Executive Commission PDF...");

    const elem = reportRef.current;
    const originalWidth = elem.style.width;

    try {
      // Fixed A4 scale width
      elem.style.width = "850px";

      const canvas = await html2canvas(elem, {
        scale: 2.5,
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

      pdf.save(`Commission_Ledger_${formData.fromDate || "start"}_to_${formData.toDate || "end"}.pdf`);
      toast.success("Commission Ledger PDF downloaded successfully!", { id: toastId });
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
    <div className="mx-auto max-w-7xl space-y-6 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-300">
      {/* Top Action Control Bar */}
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

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 print:hidden">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm flex items-center gap-3.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#1877F2]">
            <Shield size={20} />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Total Policies
            </span>
            <div className="text-lg font-bold text-slate-900 mt-0.5">
              {filteredData.length}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm flex items-center gap-3.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
            <Building2 size={20} />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Total Premium
            </span>
            <div className="text-lg font-bold text-slate-900 mt-0.5">
              ₹ {grandTotalPremium.toLocaleString("en-IN")}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm flex items-center gap-3.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <IndianRupee size={20} />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Gross Commission
            </span>
            <div className="text-lg font-bold text-emerald-600 mt-0.5">
              ₹ {grandTotalGrossCommission.toLocaleString("en-IN")}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm flex items-center gap-3.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#1877F2]">
            <CheckCircle2 size={20} />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Net Payable
            </span>
            <div className="text-lg font-bold text-[#1877F2] mt-0.5">
              ₹ {grandTotalNetCommission.toLocaleString("en-IN")}
            </div>
          </div>
        </div>
      </div>

      {/* Main Printable Document Canvas */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden overflow-x-auto print:border-none print:shadow-none">
        <div
          ref={reportRef}
          style={{ fontFamily: "Arial, Helvetica, sans-serif" }}
          className="min-w-[950px] p-8 bg-white text-slate-900 space-y-6"
        >
          {/* 1. Advisor Letterhead Header */}
          <div style={{ borderBottom: "2px solid #0f172a" }} className="flex justify-between items-start pb-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-[#0f172a] tracking-tight">
                  {agencyDisplayName}
                </h1>
                <span className="text-[10px] bg-blue-50 text-[#1877F2] border border-blue-200 font-bold px-2 py-0.5 rounded uppercase tracking-widest">
                  LIC Authorized Advisor
                </span>
              </div>
              <p className="text-xs font-semibold text-slate-600">MBA in Insurance & Finance</p>
              <p className="text-xs text-slate-500 max-w-md leading-relaxed">
                84/2, Darpan Bldg., 201 Sarang Society, Sahakarnagar No. 2 Parvati Pune 411009
              </p>
              <div className="flex items-center gap-4 text-xs font-medium text-slate-600 pt-0.5">
                <span>Phone: 9822452896</span>
                <span>Email: office@jayantmahabole.com</span>
              </div>
            </div>

            <div className="text-right space-y-1">
              <div className="text-sm font-bold uppercase tracking-wider text-[#1877F2]">
                Commission Ledger Report
              </div>
              <div className="text-xs font-semibold text-slate-800">
                Period: {formData.fromDate || "Start"} To {formData.toDate || "End"}
              </div>
              <div className="text-[11px] text-slate-500">
                Date: {new Date().toLocaleDateString("en-GB")} {new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
              </div>
            </div>
          </div>

          {/* 2. Filter Summary Bar */}
          <div className="flex items-center justify-between bg-slate-50 rounded-xl p-3 border border-slate-200 text-xs text-slate-700 font-medium">
            <div>
              <span className="text-slate-500">Filters: </span>
              <strong className="text-slate-900">{activeFiltersSummary}</strong>
            </div>
            <div>
              <span className="text-slate-500">Total Records: </span>
              <strong className="text-[#1877F2]">{filteredData.length} Policies</strong>
            </div>
          </div>

          {/* 3. Report Data Table */}
          <div className="rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-left text-xs text-slate-700 border-collapse">
              <thead className="bg-slate-100/90 border-b border-slate-200 text-slate-700 font-bold">
                <tr>
                  <th className="px-2.5 py-3 text-center w-10 border-r border-slate-200">Sr.</th>
                  <th className="px-2.5 py-3 border-r border-slate-200">Policy No</th>
                  <th className="px-2.5 py-3 border-r border-slate-200">Policy Holder Name</th>
                  <th className="px-2.5 py-3 border-r border-slate-200">Plan/Term/PPT</th>
                  <th className="px-2.5 py-3 border-r border-slate-200 text-center">DOC</th>
                  <th className="px-2.5 py-3 border-r border-slate-200 text-center w-10">Md</th>
                  <th className="px-2.5 py-3 border-r border-slate-200 text-right">Sum Assured (₹)</th>
                  <th className="px-2.5 py-3 border-r border-slate-200 text-right">Premium (₹)</th>
                  <th className="px-2.5 py-3 border-r border-slate-200 text-center w-12">Rate</th>
                  <th className="px-2.5 py-3 border-r border-slate-200 text-right">Gross Comm. (₹)</th>
                  <th className="px-2.5 py-3 border-r border-slate-200 text-right">TDS (5%) (₹)</th>
                  <th className="px-2.5 py-3 text-right">Net Comm. (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredData.length > 0 ? (
                  filteredData.map((row, idx) => (
                    <tr
                      key={row.id}
                      className={`hover:bg-blue-50/20 transition ${
                        idx % 2 === 0 ? "bg-white" : "bg-slate-50/40"
                      }`}
                    >
                      <td className="px-2.5 py-2.5 text-center font-medium text-slate-400 border-r border-slate-100">
                        {idx + 1}
                      </td>
                      <td className="px-2.5 py-2.5 font-bold font-mono text-slate-900 border-r border-slate-100">
                        {row.polNo}
                      </td>
                      <td className="px-2.5 py-2.5 font-semibold text-slate-900 border-r border-slate-100">
                        <div>{row.holder}</div>
                        {row.groupCode !== "-" && (
                          <div className="text-[10px] text-slate-400 font-normal">Grp: {row.groupCode}</div>
                        )}
                      </td>
                      <td className="px-2.5 py-2.5 text-slate-600 border-r border-slate-100 font-mono text-[11px]">
                        {row.planTermPpt}
                      </td>
                      <td className="px-2.5 py-2.5 text-center text-slate-600 border-r border-slate-100 whitespace-nowrap">
                        {row.date}
                      </td>
                      <td className="px-2.5 py-2.5 text-center font-semibold text-slate-700 border-r border-slate-100">
                        {row.mode}
                      </td>
                      <td className="px-2.5 py-2.5 text-right font-medium text-slate-700 border-r border-slate-100">
                        {row.sumAssured > 0 ? row.sumAssured.toLocaleString("en-IN") : "-"}
                      </td>
                      <td className="px-2.5 py-2.5 text-right font-semibold text-slate-900 border-r border-slate-100">
                        {row.premium > 0 ? row.premium.toLocaleString("en-IN") : "-"}
                      </td>
                      <td className="px-2.5 py-2.5 text-center text-slate-500 border-r border-slate-100 font-medium">
                        {row.commRate}%
                      </td>
                      <td className="px-2.5 py-2.5 text-right font-semibold text-slate-800 border-r border-slate-100">
                        {row.grossCommission.toLocaleString("en-IN")}
                      </td>
                      <td className="px-2.5 py-2.5 text-right text-rose-600 border-r border-slate-100">
                        {row.tdsAmount.toLocaleString("en-IN")}
                      </td>
                      <td className="px-2.5 py-2.5 text-right font-bold text-[#1877F2]">
                        {row.netCommission.toLocaleString("en-IN")}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={12} className="px-4 py-16 text-center text-slate-400 bg-slate-50/20">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <FilterX size={32} className="text-slate-300" />
                        <p className="font-semibold text-slate-600 text-sm">
                          No commission ledger records found
                        </p>
                        <p className="text-xs text-slate-400">
                          Try adjusting the date range or selecting a different agency in filters.
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>

              {filteredData.length > 0 && (
                <tfoot className="bg-[#f0f7ff] border-t-2 border-slate-300 font-bold text-slate-900">
                  <tr>
                    <td
                      colSpan={6}
                      className="px-3 py-3 text-right uppercase tracking-wider text-xs border-r border-blue-200"
                    >
                      Grand Total
                    </td>
                    <td className="px-2.5 py-3 text-right text-xs border-r border-blue-200">
                      ₹ {grandTotalSumAssured.toLocaleString("en-IN")}
                    </td>
                    <td className="px-2.5 py-3 text-right text-xs border-r border-blue-200">
                      ₹ {grandTotalPremium.toLocaleString("en-IN")}
                    </td>
                    <td className="px-2.5 py-3 border-r border-blue-200 text-center" />
                    <td className="px-2.5 py-3 text-right text-xs border-r border-blue-200">
                      ₹ {grandTotalGrossCommission.toLocaleString("en-IN")}
                    </td>
                    <td className="px-2.5 py-3 text-right text-xs text-rose-600 border-r border-blue-200">
                      ₹ {grandTotalTds.toLocaleString("en-IN")}
                    </td>
                    <td className="px-2.5 py-3 text-right text-xs text-[#1877F2]">
                      ₹ {grandTotalNetCommission.toLocaleString("en-IN")}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          {/* 4. Financial Breakdown Box & Signatory Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-200">
            {/* Left: Summary Breakdown */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-2 text-xs">
              <h3 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] mb-2">
                Executive Commission Summary
              </h3>
              <div className="flex justify-between text-slate-600">
                <span>Total Policies Evaluated:</span>
                <strong className="text-slate-900">{filteredData.length}</strong>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Total Sum Assured:</span>
                <strong className="text-slate-900">₹ {grandTotalSumAssured.toLocaleString("en-IN")}</strong>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Total Premium Amount:</span>
                <strong className="text-slate-900">₹ {grandTotalPremium.toLocaleString("en-IN")}</strong>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Gross Commission (15%):</span>
                <strong className="text-emerald-700">₹ {grandTotalGrossCommission.toLocaleString("en-IN")}</strong>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>TDS Deducted (5% u/s 194D):</span>
                <strong className="text-rose-600">- ₹ {grandTotalTds.toLocaleString("en-IN")}</strong>
              </div>
              <div className="flex justify-between border-t border-slate-300 pt-2 text-sm font-bold text-[#1877F2]">
                <span>Net Payable Commission:</span>
                <span>₹ {grandTotalNetCommission.toLocaleString("en-IN")}</span>
              </div>
            </div>

            {/* Right: Signatory & Disclaimer */}
            <div className="flex flex-col justify-between rounded-xl border border-slate-200 p-4 text-xs">
              <div className="space-y-1">
                <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                  Authentication Note
                </span>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  This document serves as an authentic commission ledger statement calculated as per LIC commission rules and applicable tax guidelines.
                </p>
              </div>

              <div className="pt-8 text-right space-y-1">
                <div className="font-bold text-slate-900">{agencyDisplayName}</div>
                <div className="text-[11px] text-slate-500">Authorized Signatory / Branch Manager</div>
              </div>
            </div>
          </div>

          {/* 5. Document Footer */}
          <div className="flex justify-between items-center text-[10px] font-medium text-slate-400 border-t border-slate-100 pt-3">
            <p>Generated on {new Date().toLocaleString("en-IN")} | System Admin</p>
            <p>LIC Commission Reports & Analytics Engine • Confidential</p>
          </div>
        </div>
      </div>
    </div>
  );
}
