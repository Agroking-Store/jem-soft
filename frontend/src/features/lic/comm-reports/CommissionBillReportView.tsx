"use client";

import { useRef, useState, useMemo } from "react";
import {
  ArrowLeft,
  Download,
  Printer,
} from "lucide-react";
import html2canvas from "html2canvas-pro";
import jsPDF from "jspdf";
import toast from "react-hot-toast";
import {
  CommissionBillFormData,
  BillType,
  generateCommissionBillItems,
  calculateCommissionBillSummary,
  CommissionBillItem,
  CommissionCategory,
} from "./commissionBillData";

interface CommissionBillReportViewProps {
  formData: CommissionBillFormData;
  policies?: Array<Record<string, unknown>>;
  onBackToForm: () => void;
}

export default function CommissionBillReportView({
  formData,
  policies = [],
  onBackToForm,
}: CommissionBillReportViewProps) {
  const reportRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [activeBillType, setActiveBillType] = useState<BillType>(formData.billType);

  // Determine active agency display name
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

  // Generate commission bill items dynamically
  const billItems: CommissionBillItem[] = useMemo(() => {
    return generateCommissionBillItems(policies, selectedAgencyNames);
  }, [policies, selectedAgencyNames]);

  // Summary calculations
  const summary = useMemo(() => {
    return calculateCommissionBillSummary(billItems);
  }, [billItems]);

  // Grouped items for Agent Wise view
  const groupedItems = useMemo(() => {
    const groups: Record<
      CommissionCategory,
      { label: string; items: CommissionBillItem[]; totalPremium: number; totalComm: number }
    > = {
      "first-comm": { label: "First Comm.", items: [], totalPremium: 0, totalComm: 0 },
      "first-year": { label: "First Year", items: [], totalPremium: 0, totalComm: 0 },
      "second-third": { label: "Second/Third Year", items: [], totalPremium: 0, totalComm: 0 },
      subsequent: { label: "Subsequent Year", items: [], totalPremium: 0, totalComm: 0 },
    };

    billItems.forEach((item) => {
      const cat = item.category || "second-third";
      if (groups[cat]) {
        groups[cat].items.push(item);
        groups[cat].totalPremium += item.premiumAmount;
        groups[cat].totalComm += item.commissionAmount;
      }
    });

    return groups;
  }, [billItems]);

  const handleDownloadPDF = async () => {
    if (!reportRef.current) return;
    setIsExporting(true);
    const toastId = toast.loading("Generating Commission Bill PDF...");

    const elem = reportRef.current;
    const originalWidth = elem.style.width;

    try {
      elem.style.width = "900px";

      const canvas = await html2canvas(elem, {
        scale: 2.2,
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

      const fileLabel = activeBillType === "consolidated" ? "Consolidated" : "AgentWise";
      pdf.save(`Commission_Bill_${fileLabel}_${formData.billCode.replace("/", "_")}.pdf`);
      toast.success("Commission Bill PDF downloaded successfully!", { id: toastId });
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

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Top Action Control Bar (Print Hidden) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-xs print:hidden">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBackToForm}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
          >
            <ArrowLeft size={14} />
            Edit Bill Filters
          </button>

          {/* Bill Type Switcher */}
          <div className="flex rounded-lg border border-slate-200 bg-slate-100 p-0.5">
            <button
              type="button"
              onClick={() => setActiveBillType("consolidated")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition ${
                activeBillType === "consolidated"
                  ? "bg-white text-[#1877F2] shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Consolidated Bill
            </button>
            <button
              type="button"
              onClick={() => setActiveBillType("agent-wise")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition ${
                activeBillType === "agent-wise"
                  ? "bg-white text-[#1877F2] shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Agent Wise Bill
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
          >
            <Printer size={15} />
            Print
          </button>
          <button
            type="button"
            onClick={handleDownloadPDF}
            disabled={isExporting}
            className="inline-flex items-center gap-2 rounded-lg bg-[#1877F2] px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-600 active:scale-[0.98] transition disabled:opacity-60"
          >
            <Download size={15} />
            {isExporting ? "Exporting PDF..." : "Download PDF"}
          </button>
        </div>
      </div>

      {/* Summary KPI Cards (Print Hidden) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 print:hidden">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Total Policies
          </span>
          <div className="text-xl font-bold text-slate-900 mt-1">
            {billItems.length}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Total Premium
          </span>
          <div className="text-xl font-bold text-slate-900 mt-1">
            ₹ {summary.totalPremium.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Gross Commission
          </span>
          <div className="text-xl font-bold text-emerald-600 mt-1">
            ₹ {summary.totalCommission.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Net Payable
          </span>
          <div className="text-xl font-bold text-[#1877F2] mt-1">
            ₹ {summary.netBillAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      {/* Printable Report Canvas matching PDF Sample */}
      <div className="overflow-x-auto bg-slate-100 p-2 sm:p-6 rounded-2xl border border-slate-200 flex justify-center">
        <div
          ref={reportRef}
          style={{ width: "850px" }}
          className="bg-white p-8 shadow-md rounded-lg text-slate-900 font-sans space-y-4 print:shadow-none print:p-0 print:m-0"
        >
          {/* 1. Header Letterhead */}
          <div className="space-y-0.5 text-xs text-slate-800">
            <h1 className="text-base font-bold text-slate-900">
              {agencyDisplayName}
            </h1>
            <p className="font-semibold text-slate-700">MBA in Insurance & Finance</p>
            <p className="text-slate-600">
              84/2, Darpan Bldg., 201 Sarang Society,
            </p>
            <p className="text-slate-600">
              Sahakarnagar No. 2 Parvati Pune 411009,
            </p>
            <p className="text-slate-600">9822452896,</p>
            <p className="text-slate-600">office@jayantmahbole.com,</p>
          </div>

          {/* Top Divider */}
          <div className="border-b-2 border-slate-900 pt-2" />

          {/* 2. Report Title Bar */}
          <div className="flex justify-between items-center py-1">
            <div className="text-sm font-bold text-slate-900">
              Commission Bill for the period {formData.billCode}
            </div>
            <div className="text-sm font-bold text-slate-900">
              {activeBillType === "consolidated" ? "Consolidated" : "Agent wise Bill"}
            </div>
          </div>

          {/* Subheader */}
          <div className="border-t border-b border-slate-900 py-1 flex justify-between items-center text-xs font-semibold text-slate-900">
            <div>
              {activeBillType === "consolidated" ? (
                <span>Agencies : {agencyDisplayName}</span>
              ) : (
                <span>Date : {formData.reportDate}</span>
              )}
            </div>
            <div className="flex items-center gap-4">
              {activeBillType === "consolidated" && (
                <span>Date : {formData.reportDate}</span>
              )}
              <span>Page 1 of 1</span>
            </div>
          </div>

          {activeBillType === "agent-wise" && (
            <div className="text-xs font-bold text-slate-900 pt-0.5">
              {agencyDisplayName}
            </div>
          )}

          {/* 3. REPORT TABLES */}
          {activeBillType === "consolidated" ? (
            /* CONSOLIDATED BILL TABLE (Matches PDF 1) */
            <div className="overflow-hidden">
              <table className="w-full text-left text-[11px] border-collapse">
                <thead>
                  <tr className="border-b border-slate-900 text-slate-900 font-bold">
                    <th className="py-1 px-1">Policy No.</th>
                    <th className="py-1 px-1">Ag Cd</th>
                    <th className="py-1 px-1">Group Code</th>
                    <th className="py-1 px-1">Name of the Policy Holder</th>
                    <th className="py-1 px-1 text-center">Due Date</th>
                    <th className="py-1 px-1 text-right">Premium Amount</th>
                    <th className="py-1 px-1 text-right">Commission Amount</th>
                    <th className="py-1 px-1 text-center">Com Code</th>
                    <th className="py-1 px-1 text-center">Com Date</th>
                    <th className="py-1 px-1 text-center">Pl/Tm/Pt</th>
                    <th className="py-1 px-1 text-right">Date of Pay</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-normal">
                  {billItems.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50">
                      <td className="py-1 px-1 font-mono">{row.policyNo}</td>
                      <td className="py-1 px-1">{row.agentCode}</td>
                      <td className="py-1 px-1">{row.groupCode}</td>
                      <td className="py-1 px-1">{row.policyHolderName}</td>
                      <td className="py-1 px-1 text-center font-mono">{row.dueDate}</td>
                      <td className="py-1 px-1 text-right font-mono">
                        {row.premiumAmount.toFixed(2)}
                      </td>
                      <td className="py-1 px-1 text-right font-mono font-semibold">
                        {row.commissionAmount.toFixed(2)}
                      </td>
                      <td className="py-1 px-1 text-center font-mono">{row.comCode}</td>
                      <td className="py-1 px-1 text-center font-mono">{row.comDate}</td>
                      <td className="py-1 px-1 text-center font-mono">{row.planTermPpt}</td>
                      <td className="py-1 px-1 text-right font-mono">{row.dateOfPay}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-slate-900 font-bold text-slate-900">
                    <td colSpan={5} className="py-1 px-1 text-right">
                      Total :
                    </td>
                    <td className="py-1 px-1 text-right font-mono">
                      {summary.totalPremium.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-1 px-1 text-right font-mono">
                      {summary.totalCommission.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                    <td colSpan={4} />
                  </tr>
                </tfoot>
              </table>

              {/* Summary of Commission (Year wise) & Other Deduction (Matches PDF 1) */}
              <div className="flex flex-col sm:flex-row justify-between items-start gap-8 pt-6">
                {/* Left Box: Summary of Commission (Year wise) */}
                <div className="border border-slate-900 w-72 text-xs">
                  <div className="border-b border-slate-900 p-1.5 text-center font-bold">
                    Summary of Commission (Year wise)
                  </div>
                  <div className="p-2 space-y-1.5 font-mono">
                    <div className="flex justify-between">
                      <span className="font-sans font-medium">First Commission :</span>
                      <span className="font-bold">{summary.firstCommission.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-sans font-medium">First Year :</span>
                      <span className="font-bold">{summary.firstYear.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-sans font-medium">Second/Third Year :</span>
                      <span className="font-bold">{summary.secondThirdYear.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-sans font-medium">Subsequent Year :</span>
                      <span className="font-bold">{summary.subsequentYear.toFixed(2)}</span>
                    </div>
                    <div className="border-t border-slate-900 pt-1 flex justify-between font-bold">
                      <span className="font-sans">Total :</span>
                      <span>{summary.totalCommission.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Right Box: Other Deduction & Net Bill Amount */}
                <div className="space-y-4 w-72 text-xs">
                  <div className="border border-slate-900">
                    <div className="border-b border-slate-900 p-1.5 text-center font-bold">
                      Other Deduction
                    </div>
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-slate-900 font-bold">
                          <th className="p-1.5">Deduction Description</th>
                          <th className="p-1.5 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="font-mono">
                        <tr>
                          <td className="p-1.5 font-sans">Income Tax</td>
                          <td className="p-1.5 text-right">{summary.taxDeduction.toFixed(2)}</td>
                        </tr>
                      </tbody>
                      <tfoot>
                        <tr className="border-t border-slate-900 font-bold">
                          <td className="p-1.5 text-right font-sans">Total :</td>
                          <td className="p-1.5 text-right font-mono">{summary.taxDeduction.toFixed(2)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  <div className="border border-slate-900 p-2 font-bold flex justify-between items-center text-xs">
                    <span>Net Bill Amount :</span>
                    <span className="font-mono text-sm">
                      {summary.netBillAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* AGENT WISE BILL TABLE (Matches PDF 2) */
            <div className="overflow-hidden space-y-4">
              <table className="w-full text-left text-[11px] border-collapse">
                <thead>
                  <tr className="border-b border-slate-900 text-slate-900 font-bold">
                    <th className="py-1 px-1">Policy No.</th>
                    <th className="py-1 px-1">Group Code</th>
                    <th className="py-1 px-1">Policy Holder&apos;s Name</th>
                    <th className="py-1 px-1 text-center">Due Date</th>
                    <th className="py-1 px-1 text-right">Premium Amount</th>
                    <th className="py-1 px-1 text-right">Commission Amount</th>
                    <th className="py-1 px-1 text-center">Com Date</th>
                    <th className="py-1 px-1 text-center">Pl/Tm/Pt</th>
                    <th className="py-1 px-1 text-center">Date of Pay</th>
                    <th className="py-1 px-1">Recovery Cause</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {/* Category Groups */}
                  {(["first-comm", "first-year", "second-third", "subsequent"] as CommissionCategory[]).map(
                    (catKey) => {
                      const group = groupedItems[catKey];
                      if (!group || group.items.length === 0) return null;

                      return (
                        <tr key={catKey} className="contents">
                          {/* Group Title Header */}
                          <tr className="border-t border-b border-slate-300 bg-slate-50 font-bold text-center">
                            <td colSpan={10} className="py-1 text-center text-xs text-slate-900">
                              {group.label}
                            </td>
                          </tr>

                          {/* Group Rows */}
                          {group.items.map((row) => (
                            <tr key={row.id} className="hover:bg-slate-50 font-normal">
                              <td className="py-1 px-1 font-mono">{row.policyNo}</td>
                              <td className="py-1 px-1">{row.groupCode}</td>
                              <td className="py-1 px-1">{row.policyHolderName}</td>
                              <td className="py-1 px-1 text-center font-mono">{row.dueDate}</td>
                              <td className="py-1 px-1 text-right font-mono">
                                {row.premiumAmount.toFixed(2)}
                              </td>
                              <td className="py-1 px-1 text-right font-mono font-semibold">
                                {row.commissionAmount.toFixed(2)}
                              </td>
                              <td className="py-1 px-1 text-center font-mono">{row.comDate}</td>
                              <td className="py-1 px-1 text-center font-mono">{row.planTermPpt}</td>
                              <td className="py-1 px-1 text-center font-mono">{row.dateOfPay}</td>
                              <td className="py-1 px-1 text-slate-400">{row.recoveryCause || "-"}</td>
                            </tr>
                          ))}

                          {/* Group Sub-total */}
                          <tr className="font-bold border-t border-b border-slate-900 text-slate-900">
                            <td colSpan={4} className="py-1 px-1 text-right font-sans">
                              Total :
                            </td>
                            <td className="py-1 px-1 text-right font-mono">
                              {group.totalPremium.toFixed(2)}
                            </td>
                            <td className="py-1 px-1 text-right font-mono">
                              {group.totalComm.toFixed(2)}
                            </td>
                            <td colSpan={4} />
                          </tr>
                        </tr>
                      );
                    }
                  )}
                </tbody>
              </table>

              {/* Commission Bill Summary & Less Deduction (Matches PDF 2) */}
              <div className="space-y-4 pt-6">
                <div className="text-center font-bold text-xs uppercase tracking-wide">
                  Commission Bill Summary
                </div>

                {/* Summary Table with Received, Less Recoveries, Nett */}
                <div className="flex justify-center">
                  <table className="w-full max-w-xl text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-900 font-bold">
                        <th className="py-1 px-2 text-left">Category</th>
                        <th className="py-1 px-2 text-right">Received</th>
                        <th className="py-1 px-2 text-right">Less Recoveries</th>
                        <th className="py-1 px-2 text-right">Nett</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      {summary.categorySummaries.map((cat) => (
                        <tr key={cat.category}>
                          <td className="py-1 px-2 text-left font-sans font-medium">{cat.label}</td>
                          <td className="py-1 px-2 text-right">{cat.received.toFixed(2)}</td>
                          <td className="py-1 px-2 text-right">{cat.lessRecoveries.toFixed(2)}</td>
                          <td className="py-1 px-2 text-right font-bold">{cat.nett.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-b-2 border-slate-900 font-bold font-mono">
                        <td className="py-1 px-2 text-left font-sans">Total :</td>
                        <td className="py-1 px-2 text-right">{summary.totalCommission.toFixed(2)}</td>
                        <td className="py-1 px-2 text-right">0.00</td>
                        <td className="py-1 px-2 text-right">{summary.totalCommission.toFixed(2)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Less Deduction Section */}
                <div className="flex flex-col items-center pt-2 space-y-2">
                  <div className="font-bold text-xs">Less Deduction</div>
                  <div className="w-full max-w-md border border-slate-900 text-xs">
                    <div className="flex justify-between border-b border-slate-900 p-1.5 font-bold">
                      <span>Description</span>
                      <span>Amount</span>
                    </div>
                    <div className="flex justify-between p-1.5 font-mono">
                      <span className="font-sans">Income Tax :</span>
                      <span>{summary.taxDeduction.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between border-t border-slate-900 p-1.5 font-bold font-mono">
                      <span className="font-sans">Total :</span>
                      <span>{summary.taxDeduction.toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="w-full max-w-md border border-slate-900 p-2 font-bold flex justify-between text-xs">
                    <span>Net Commission :</span>
                    <span className="font-mono text-sm">
                      {summary.netBillAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Footer Bar Code Stamp matching PDF */}
          <div className="border-t-2 border-slate-900 pt-3 text-center text-xs font-bold font-mono tracking-widest text-slate-800">
            DSS000019899
          </div>
        </div>
      </div>
    </div>
  );
}
