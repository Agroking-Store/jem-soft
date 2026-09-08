"use client";

import { useRef, useState, useMemo } from "react";
import {
  ArrowLeft,
  Download,
  Printer,
  Shield,
  IndianRupee,
  AlertCircle,
  Building2,
  CheckCircle2,
} from "lucide-react";
import html2canvas from "html2canvas-pro";
import jsPDF from "jspdf";
import toast from "react-hot-toast";
import {
  CommissionOutstandingFormData,
  CommissionOutstandingItem,
  generateCommissionOutstandingItems,
  calculateCommissionOutstandingTotals,
} from "./commissionOutstandingData";

interface CommissionOutstandingReportViewProps {
  formData: CommissionOutstandingFormData;
  policies?: any[];
  onBackToForm: () => void;
}

export default function CommissionOutstandingReportView({
  formData,
  policies = [],
  onBackToForm,
}: CommissionOutstandingReportViewProps) {
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

  // Generate outstanding items
  const outstandingItems: CommissionOutstandingItem[] = useMemo(() => {
    return generateCommissionOutstandingItems(policies, selectedAgencyNames, formData);
  }, [policies, selectedAgencyNames, formData]);

  // Grand totals
  const totals = useMemo(() => {
    return calculateCommissionOutstandingTotals(outstandingItems);
  }, [outstandingItems]);

  // Group items if branch-wise or payment-datewise
  const groupedData = useMemo(() => {
    if (formData.sortingOption === "branch-wise") {
      const map: { [key: string]: { label: string; items: CommissionOutstandingItem[]; subTotalPrem: number; subTotalComm: number; subTotalNet: number } } = {};
      outstandingItems.forEach((it) => {
        const key = `${it.branchCode} - ${it.branchName}`;
        if (!map[key]) {
          map[key] = { label: `Branch ${key}`, items: [], subTotalPrem: 0, subTotalComm: 0, subTotalNet: 0 };
        }
        map[key].items.push(it);
        map[key].subTotalPrem += it.premiumAmount;
        map[key].subTotalComm += it.grossCommission;
        map[key].subTotalNet += it.netOutstanding;
      });
      return Object.values(map);
    }

    if (formData.sortingOption === "payment-datewise") {
      const map: { [key: string]: { label: string; items: CommissionOutstandingItem[]; subTotalPrem: number; subTotalComm: number; subTotalNet: number } } = {};
      outstandingItems.forEach((it) => {
        const key = it.payDate;
        if (!map[key]) {
          map[key] = { label: `Payment Date: ${key}`, items: [], subTotalPrem: 0, subTotalComm: 0, subTotalNet: 0 };
        }
        map[key].items.push(it);
        map[key].subTotalPrem += it.premiumAmount;
        map[key].subTotalComm += it.grossCommission;
        map[key].subTotalNet += it.netOutstanding;
      });
      return Object.values(map);
    }

    // Default policy-wise: single group
    return [
      {
        label: "All Policies (Policy Number Order)",
        items: outstandingItems,
        subTotalPrem: totals.totalPremium,
        subTotalComm: totals.totalGrossCommission,
        subTotalNet: totals.totalNetOutstanding,
      },
    ];
  }, [outstandingItems, formData.sortingOption, totals]);

  const handleDownloadPDF = async () => {
    if (!reportRef.current) return;
    setIsExporting(true);
    const toastId = toast.loading("Generating Commission Outstanding PDF...");

    const elem = reportRef.current;
    const originalWidth = elem.style.width;

    try {
      elem.style.width = "1050px";

      const canvas = await html2canvas(elem, {
        scale: 2.2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        logging: false,
      });

      elem.style.width = originalWidth;

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("l", "mm", "a4"); // Landscape for broad columns
      const imgWidth = 297;
      const pageHeight = 210;
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

      pdf.save(`Commission_Outstanding_${formData.dateFrom.replace(/\//g, "-")}_to_${formData.dateTo.replace(/\//g, "-")}.pdf`);
      toast.success("Commission Outstanding PDF downloaded successfully!", { id: toastId });
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

  const getSortingLabel = () => {
    if (formData.sortingOption === "branch-wise") return "Branch No. Wise";
    if (formData.sortingOption === "policy-wise") return "Policy No. Wise";
    return "Payment Datewise";
  };

  const getCommissionTypeLabel = () => {
    if (formData.commissionType === "first-year") return "First Year Commission";
    if (formData.commissionType === "renewal") return "Renewal Commission";
    return "All Commissions";
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Top Action Control Bar (Blue and White theme, Print Hidden) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-2xl border border-blue-100 bg-white p-5 shadow-xs print:hidden">
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

      {/* Summary KPI Cards (Blue and White theme, Print Hidden) */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 print:hidden">
        <div className="rounded-2xl border border-blue-100 bg-white p-4 shadow-xs flex items-center gap-3.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#1877F2]">
            <Shield size={20} />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Outstanding Policies
            </span>
            <div className="text-lg font-bold text-slate-900 mt-0.5">
              {totals.totalPolicies} Policies
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-blue-100 bg-white p-4 shadow-xs flex items-center gap-3.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
            <Building2 size={20} />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Total Premium
            </span>
            <div className="text-lg font-bold text-slate-900 mt-0.5">
              ₹ {totals.totalPremium.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-blue-100 bg-white p-4 shadow-xs flex items-center gap-3.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
            <AlertCircle size={20} />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Gross Comm. Outstanding
            </span>
            <div className="text-lg font-bold text-amber-600 mt-0.5">
              ₹ {totals.totalGrossCommission.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-blue-100 bg-white p-4 shadow-xs flex items-center gap-3.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#1877F2]">
            <CheckCircle2 size={20} />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Net Payable (Post-TDS)
            </span>
            <div className="text-lg font-bold text-[#1877F2] mt-0.5">
              ₹ {totals.totalNetOutstanding.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </div>
          </div>
        </div>
      </div>

      {/* Printable Report Canvas */}
      <div className="overflow-x-auto bg-slate-50 p-2 sm:p-6 rounded-2xl border border-blue-100 flex justify-center">
        <div
          ref={reportRef}
          style={{ width: "1050px" }}
          className="bg-white p-8 shadow-sm rounded-lg text-slate-900 font-sans space-y-4 print:shadow-none print:p-0 print:m-0 relative"
        >
          {/* Header Accent Band */}
          <div className="space-y-0.5 text-xs text-slate-800">
            <h1 className="text-base font-bold text-slate-900">
              {agencyDisplayName}
            </h1>
            <p className="font-semibold text-slate-700">MBA in Insurance & Finance</p>
            <p className="text-slate-600">84/2, Darpan Bldg., 201 Sarang Society,</p>
            <p className="text-slate-600">Sahakarnagar No. 2 Parvati Pune 411009,</p>
            <p className="text-slate-600">9822452896, office@jayantmahbole.com</p>
          </div>

          {/* Divider */}
          <div className="border-b-2 border-slate-900 pt-2" />

          {/* Title Band */}
          <div className="bg-[#f5ebd9] border border-slate-300 px-3 py-1.5 flex justify-between items-center text-xs font-bold text-slate-900">
            <span className="text-sm">Commissions Outstanding Report</span>
            <span>{getSortingLabel()}</span>
          </div>

          {/* Subheader */}
          <div className="space-y-1 text-xs font-semibold text-slate-900">
            <div className="flex justify-between items-center">
              <span>Agency : {agencyDisplayName}</span>
              <span>Report Date : {formData.reportDate}</span>
            </div>
            <div className="flex justify-between items-center border-t border-b border-slate-900 py-1 font-bold">
              <span>
                Commissions Outstanding from {formData.dateFrom} to {formData.dateTo} (Include Payment till {formData.includePaymentTill})
              </span>
              <span>Type: {getCommissionTypeLabel()} | Page 1 of 1</span>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto pt-1">
            <table className="w-full text-left text-[11px] border-collapse">
              <thead>
                <tr className="border-b-2 border-slate-900 text-slate-900 font-bold bg-slate-50/70">
                  <th className="py-1.5 px-1 text-center">Sr.</th>
                  <th className="py-1.5 px-1">Policy No.</th>
                  <th className="py-1.5 px-1">Policy Holder Name</th>
                  <th className="py-1.5 px-1 text-center">Plan/Term/PPT</th>
                  <th className="py-1.5 px-1 text-center">Due Date</th>
                  <th className="py-1.5 px-1 text-center">Pay Date</th>
                  <th className="py-1.5 px-1 text-center">Mode</th>
                  <th className="py-1.5 px-1">Branch</th>
                  <th className="py-1.5 px-1 text-right">Premium (₹)</th>
                  <th className="py-1.5 px-1 text-center">Type</th>
                  <th className="py-1.5 px-1 text-right">Rate %</th>
                  <th className="py-1.5 px-1 text-right">Gross Comm. (₹)</th>
                  <th className="py-1.5 px-1 text-right">TDS 5% (₹)</th>
                  <th className="py-1.5 px-1 text-right">Net Due (₹)</th>
                  <th className="py-1.5 px-1 text-center">Status</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 font-normal">
                {groupedData.map((group, gIdx) => (
                  <tr key={`group-${gIdx}`} className="contents">
                    {formData.sortingOption !== "policy-wise" && (
                      <tr className="bg-blue-50/50 font-bold text-xs text-[#1877F2]">
                        <td colSpan={15} className="py-1.5 px-2 border-t border-b border-blue-100">
                          {group.label} ({group.items.length} Policies)
                        </td>
                      </tr>
                    )}

                    {group.items.map((row) => (
                      <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-1 px-1 text-center font-mono text-slate-500">
                          {row.srNo}
                        </td>
                        <td className="py-1 px-1 font-mono font-semibold text-slate-900">
                          {row.policyNo}
                        </td>
                        <td className="py-1 px-1 text-slate-800 font-medium truncate max-w-[150px]">
                          {row.holderName}
                        </td>
                        <td className="py-1 px-1 text-center font-mono text-slate-600">
                          {row.planTermPpt}
                        </td>
                        <td className="py-1 px-1 text-center font-mono text-slate-600">
                          {row.dueDate}
                        </td>
                        <td className="py-1 px-1 text-center font-mono text-slate-800 font-semibold">
                          {row.payDate}
                        </td>
                        <td className="py-1 px-1 text-center font-bold text-slate-700">
                          {row.mode}
                        </td>
                        <td className="py-1 px-1 text-slate-600 text-[10px]">
                          {row.branchCode} ({row.branchName})
                        </td>
                        <td className="py-1 px-1 text-right font-mono">
                          {row.premiumAmount.toFixed(2)}
                        </td>
                        <td className="py-1 px-1 text-center font-semibold text-[10px] text-slate-700">
                          {row.commissionType}
                        </td>
                        <td className="py-1 px-1 text-right font-mono">
                          {row.commissionRate.toFixed(1)}%
                        </td>
                        <td className="py-1 px-1 text-right font-mono font-semibold text-slate-900">
                          {row.grossCommission.toFixed(2)}
                        </td>
                        <td className="py-1 px-1 text-right font-mono text-rose-600">
                          {row.tdsAmount.toFixed(2)}
                        </td>
                        <td className="py-1 px-1 text-right font-mono font-bold text-[#1877F2]">
                          {row.netOutstanding.toFixed(2)}
                        </td>
                        <td className="py-1 px-1 text-center">
                          <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-800">
                            {row.status}
                          </span>
                        </td>
                      </tr>
                    ))}

                    {formData.sortingOption !== "policy-wise" && (
                      <tr className="bg-slate-50 font-bold text-[10px] text-slate-800 border-b border-slate-300">
                        <td colSpan={8} className="py-1 px-2 text-right">
                          Sub-Total ({group.label}) :
                        </td>
                        <td className="py-1 px-1 text-right font-mono">
                          {group.subTotalPrem.toFixed(2)}
                        </td>
                        <td colSpan={2} />
                        <td className="py-1 px-1 text-right font-mono">
                          {group.subTotalComm.toFixed(2)}
                        </td>
                        <td />
                        <td className="py-1 px-1 text-right font-mono text-[#1877F2]">
                          {group.subTotalNet.toFixed(2)}
                        </td>
                        <td />
                      </tr>
                    )}
                  </tr>
                ))}
              </tbody>

              <tfoot>
                {/* Double-underline Accounting Style Grand Totals */}
                <tr className="border-t-2 border-slate-900 border-b-4 border-double border-slate-900 font-bold text-slate-900 bg-slate-50/50">
                  <td colSpan={8} className="py-2 px-2 text-right text-xs">
                    Grand Total :
                  </td>
                  <td className="py-2 px-1 text-right font-mono text-xs">
                    {totals.totalPremium.toFixed(2)}
                  </td>
                  <td colSpan={2} />
                  <td className="py-2 px-1 text-right font-mono text-xs">
                    {totals.totalGrossCommission.toFixed(2)}
                  </td>
                  <td className="py-2 px-1 text-right font-mono text-xs text-rose-600">
                    {totals.totalTds.toFixed(2)}
                  </td>
                  <td className="py-2 px-1 text-right font-mono text-xs text-[#1877F2]">
                    {totals.totalNetOutstanding.toFixed(2)}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Footnote */}
          <div className="pt-4 flex justify-between items-center text-[10px] text-slate-400 border-t border-slate-100">
            <span>LIC Outstanding Commission Ledger - Generated for Agency Reconciliation</span>
            <span>TDS calculated at statutory 5% under Section 194D</span>
          </div>
        </div>
      </div>
    </div>
  );
}
