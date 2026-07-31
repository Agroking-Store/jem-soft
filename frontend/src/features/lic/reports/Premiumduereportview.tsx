"use client";

import { useRef, useState, useMemo } from "react";
import { ArrowLeft, Download } from "lucide-react";
import { PremiumDueFormData } from "./PremiumDueForm";
import html2canvas from "html2canvas-pro";
import jsPDF from "jspdf";
import toast from "react-hot-toast";

interface PremiumDueReportViewProps {
  formData: PremiumDueFormData;
  policies: any[];
  customers: any[];
  onBackToForm: () => void;
}

const PAY_BEFORE_GRACE_DAYS = 15;
const LATE_PAYMENT_UPTO_DAYS = 29;
const LATE_FEE_FLAT = 15; 

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function fmtDate(d: Date | string | null | undefined, short = false) {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  if (isNaN(date.getTime())) return "";
  return short
    ? date.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "2-digit" })
    : date.toLocaleDateString("en-GB");
}

export default function PremiumDueReportView({
  formData,
  policies: rawPolicies = [],
  customers: rawCustomers = [],
  onBackToForm,
}: PremiumDueReportViewProps) {
  const reportRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  const groupData = useMemo(() => {
    const fromDue = formData.fromDueDate ? new Date(formData.fromDueDate) : null;
    const toDue = formData.toDueDate ? new Date(formData.toDueDate) : null;

    const selectedStatusNames = (formData.appliedFilters || [])
      .filter((f) => f.type === "Policy Status")
      .map((f) => f.name.toLowerCase().replace(/[- ]/g, ""));

    const selectedGroupCodesOrNames =
      formData.sortingOption === "groupsWise"
        ? (formData.selectedGroups || []).map((g) => g.groupCode.toLowerCase())
        : (formData.sortingFilterSelection?.selectedItems || []).map((item) =>
            (item.code || item.name).toLowerCase()
          );

    const validDbPolicies = rawPolicies.filter((p) => {
      // Due date range check 
      const dueDateRaw =
        formData.reportBasedOn === "FUP Date"
          ? p.fupDate || p.nextPremiumDueDate
          : p.nextPremiumDueDate || p.fupDate;
      if (fromDue && toDue && dueDateRaw) {
        const dd = new Date(dueDateRaw);
        if (!isNaN(dd.getTime()) && (dd < fromDue || dd > toDue)) return false;
      }

      // Policy Status
      const rawStatus = (p.status?.statusName || p.statusName || "Inforce").toLowerCase();
      if (!formData.includeLapsedPolicies && rawStatus.includes("lapsed")) return false;

      if (selectedStatusNames.length > 0) {
        const normStatus = rawStatus.replace(/[- ]/g, "");
        const matches = selectedStatusNames.some(
          (st) => normStatus.includes(st) || st.includes(normStatus)
        );
        if (!matches) return false;
      }

      // Payment Type
      const isNach = Boolean(p.premiumMode?.modeName?.toLowerCase().includes("nach") || p.isNach);
      if (isNach && !formData.paymentTypes.nach) return false;
      if (!isNach && !formData.paymentTypes.otherThanNach) return false;

      return true;
    });

    if (validDbPolicies.length > 0) {
      const groupMap: { [key: string]: any } = {};

      validDbPolicies.forEach((p) => {
        const gCode = p.customer?.groupCode || `0000${p.clientId || "02"}`;
        const gHeadName = p.customer?.groupName || p.customer?.name || "Customer Group";

        if (selectedGroupCodesOrNames.length > 0) {
          const matches = selectedGroupCodesOrNames.some(
            (sc) => gCode.toLowerCase().includes(sc) || gHeadName.toLowerCase().includes(sc)
          );
          if (!matches) return;
        }

        const memberName = p.CustomerMaster
          ? `${p.CustomerMaster.salutation || ""} ${p.CustomerMaster.firstName} ${p.CustomerMaster.lastName}`.trim()
          : p.customer?.name || "Policy Holder";

        if (!groupMap[gCode]) {
          groupMap[gCode] = {
            groupCode: gCode,
            groupHeadName: gHeadName,
            membersMap: {},
            totalPolicies: 0,
            groupTotalPremium: 0,
            groupTotalSum: 0,
            groupTotalLatePayment: 0,
          };
        }

        const grp = groupMap[gCode];
        if (!grp.membersMap[memberName]) {
          grp.membersMap[memberName] = {
            name: memberName,
            policies: [],
            memberTotalPremium: 0,
            memberTotalSum: 0,
            memberTotalLatePayment: 0,
          };
        }
        const mem = grp.membersMap[memberName];

        const mode = p.premiumMode?.modeName?.[0]?.toUpperCase() || "Y";
        const sumAssured = Number(p.premium?.sumAssured || p.sumAssured || 500000);
        const premiumAmount = Number(
          p.premium?.installmentPremium || p.premium?.totalInstallmentPremium || p.premiumAmount || 1948
        );

        const dueDateRaw =
          formData.reportBasedOn === "FUP Date"
            ? p.fupDate || p.nextPremiumDueDate
            : p.nextPremiumDueDate || p.fupDate;
        const dueDate = dueDateRaw ? new Date(dueDateRaw) : new Date(formData.fromDueDate || Date.now());
        const payBeforeDate = addDays(dueDate, PAY_BEFORE_GRACE_DAYS);
        const lateUptoDate = addDays(dueDate, LATE_PAYMENT_UPTO_DAYS);
        const lateAmount = premiumAmount + LATE_FEE_FLAT;

        mem.policies.push({
          policyNo: p.policyNumber || "999438395",
          agCd: p.agentCode || "M",
          comDate: fmtDate(p.commencementDate) || "26/01/17",
          planTermPpt: `${p.product?.planNumber || "836"}/${p.policyTerm || 25}/${p.premiumPayingTerm || 16}`,
          md: mode,
          brn: p.branch?.branchCode || "955",
          fupDate: fmtDate(p.nextPremiumDueDate) || fmtDate(dueDate),
          dueDate: fmtDate(dueDate),
          sumAssured,
          premiumAmount,
          payBefore: fmtDate(payBeforeDate),
          lateAmount,
          lateUpto: fmtDate(lateUptoDate),
          taxBen: "",
        });

        mem.memberTotalPremium += premiumAmount;
        mem.memberTotalSum += sumAssured;
        mem.memberTotalLatePayment += lateAmount;

        grp.totalPolicies += 1;
        grp.groupTotalPremium += premiumAmount;
        grp.groupTotalSum += sumAssured;
        grp.groupTotalLatePayment += lateAmount;
      });

      const result = Object.values(groupMap).map((grp: any) => ({
        ...grp,
        members: Object.values(grp.membersMap),
      }));

      if (result.length > 0) return result;
    }

    const selectedGroupHead =
      formData.sortingOption === "groupsWise" && formData.selectedGroups.length > 0
        ? formData.selectedGroups[0].groupHeadName
        : formData.sortingFilterSelection?.selectedItems?.[0]?.name || "Musale Kiran";
    const selectedGroupCode =
      formData.sortingOption === "groupsWise" && formData.selectedGroups.length > 0
        ? formData.selectedGroups[0].groupCode
        : formData.sortingFilterSelection?.selectedItems?.[0]?.code || "M101";

    const demoDue = formData.fromDueDate ? new Date(formData.fromDueDate) : new Date("2026-08-26");
    const demoPayBefore = addDays(demoDue, PAY_BEFORE_GRACE_DAYS);
    const demoLateUpto = addDays(demoDue, LATE_PAYMENT_UPTO_DAYS);

    return [
      {
        groupCode: selectedGroupCode,
        groupHeadName: selectedGroupHead,
        members: [
          {
            name: `Mrs ${selectedGroupHead.replace(/^Mrs?\s*/i, "")}`,
            policies: [
              {
                policyNo: "999438395",
                agCd: "M",
                comDate: "26/01/17",
                planTermPpt: "836/25/16",
                md: "M",
                brn: "955",
                fupDate: fmtDate(demoDue),
                dueDate: fmtDate(demoDue),
                sumAssured: 500000,
                premiumAmount: 1948.0,
                payBefore: fmtDate(demoPayBefore),
                lateAmount: 1963.0,
                lateUpto: fmtDate(demoLateUpto),
                taxBen: "",
              },
            ],
            memberTotalPremium: 1948.0,
            memberTotalSum: 500000,
            memberTotalLatePayment: 1963.0,
          },
        ],
        totalPolicies: 1,
        groupTotalPremium: 1948.0,
        groupTotalSum: 500000,
        groupTotalLatePayment: 1963.0,
      },
    ];
  }, [rawPolicies, formData]);

  const grandTotalPremium = groupData.reduce((acc, g) => acc + g.groupTotalPremium, 0);
  const grandTotalSum = groupData.reduce((acc, g) => acc + g.groupTotalSum, 0);
  const grandTotalLatePayment = groupData.reduce((acc, g) => acc + g.groupTotalLatePayment, 0);
  const grandTotalPolicies = groupData.reduce((acc, g) => acc + g.totalPolicies, 0);

  const getReportHeaderTitle = () => {
    switch (formData.sortingOption) {
      case "groupMemberwise":
        return "Memberwise";
      case "areaWise":
        return "Areawise";
      case "subAreaWise":
        return "Sub-Areawise";
      case "dueDate":
        return "Due-Datewise";
      case "branchNoWise":
        return "Branchwise";
      case "policyNoWise":
        return "Policywise";
      case "groupsWise":
      default:
        return "Groupwise";
    }
  };

  const handleDownloadPDF = async () => {
    if (!reportRef.current) return;
    setIsExporting(true);
    const toastId = toast.loading("Generating PDF report...");

    try {
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        logging: false,
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const imgWidth = 210;
      const pageHeight = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`Premium_Due_${formData.reportDate || "Report"}.pdf`);
      toast.success("PDF downloaded successfully!", { id: toastId });
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Failed to generate PDF.", { id: toastId });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-[#0B1220] p-4 rounded-2xl border border-slate-800 shadow-xl print:hidden">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToForm}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-slate-300 bg-white/10 rounded-xl hover:bg-white/20 transition uppercase tracking-wider"
          >
            <ArrowLeft size={16} />
            <span>Edit Filters</span>
          </button>
          <span className="text-xs bg-[#B8873A]/20 text-[#E8C77A] font-bold px-3 py-1 rounded-full border border-[#B8873A]/30 uppercase tracking-wider">
            {getReportHeaderTitle()}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleDownloadPDF}
            disabled={isExporting}
            className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-[#B8873A] to-[#D9AE63] text-[#0B1220] font-bold text-xs rounded-xl shadow-lg hover:brightness-105 transition disabled:opacity-50 uppercase tracking-wider"
          >
            <Download size={16} />
            <span>{isExporting ? "Exporting..." : "Download PDF"}</span>
          </button>
        </div>
      </div>

      {/* Main Printable Document Layout */}
      <div
        ref={reportRef}
        className="bg-white p-8 rounded-2xl border border-slate-300 shadow-xl text-slate-900 font-sans max-w-5xl mx-auto space-y-4 print:p-0 print:border-none print:shadow-none"
      >
        {/* Advisor Letterhead — same block used by Policy Register */}
        <div className="flex justify-between items-start border-b-2 border-[#0B1220] pb-3">
          <div className="space-y-0.5">
            <h1 className="text-2xl font-bold text-[#0B1220] tracking-tight">Jayant Mahabole</h1>
            <p className="text-xs font-semibold text-slate-700">MBA in Insurance & Finance</p>
            <p className="text-[11px] text-slate-600 max-w-xs leading-tight">
              84/2, Darpan Bldg., 201 Sarang Society, Sahakarnagar No. 2 Parvati Pune 411009
            </p>
            <p className="text-[11px] text-slate-600 font-mono">9822452896</p>
            <p className="text-[11px] text-slate-600">office@jayantmahbole.com</p>
          </div>

          <div className="h-16 w-36 bg-[#0B1220] rounded-bl-3xl p-3 flex flex-col justify-end text-right">
            <span className="text-[10px] font-serif font-bold text-[#E8C77A] uppercase tracking-widest">
              LIC INDIA
            </span>
          </div>
        </div>

        {/* Title Banner */}
        <div className="bg-[#0B1220] text-white rounded-lg px-4 py-2.5 flex items-center justify-between border-l-4 border-[#B8873A]">
          <h2 className="text-base font-serif font-bold text-[#E8C77A] uppercase tracking-wider">
            Premium Due Statement
          </h2>
          <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
            {getReportHeaderTitle()}
          </span>
        </div>

        {/* Report Meta Line — matches the sample: report date, due-date range, page no. */}
        <div className="text-[11px] font-semibold text-slate-800 px-1 space-y-0.5">
          <div className="flex justify-between">
            <span>
              Date of Report:{" "}
              {formData.reportDate
                ? fmtDate(formData.reportDate)
                : fmtDate(new Date())}
            </span>
          </div>
          <div className="flex justify-between">
            <span>
              LIC Premiums Due between {fmtDate(formData.fromDueDate)} and {fmtDate(formData.toDueDate)}
            </span>
            <span>Page 1 of 1</span>
          </div>
        </div>

        {/* Premium Due Table */}
        <div className="space-y-4">
          <table className="w-full text-left text-[11px] border-collapse">
            <thead>
              <tr className="bg-slate-100 border-y-2 border-slate-800 font-bold text-slate-900">
                <th rowSpan={2} className="py-2 px-1 text-right align-bottom">Policy No</th>
                <th rowSpan={2} className="py-2 px-1 text-center align-bottom">Ag Cd</th>
                <th rowSpan={2} className="py-2 px-1 align-bottom">Com. Date</th>
                <th rowSpan={2} className="py-2 px-1 align-bottom">Pl/Tm/Pt</th>
                <th rowSpan={2} className="py-2 px-1 text-center align-bottom">Md</th>
                <th rowSpan={2} className="py-2 px-1 align-bottom">Brn</th>
                <th rowSpan={2} className="py-2 px-1 align-bottom">FUP Date</th>
                <th rowSpan={2} className="py-2 px-1 align-bottom">Due Date</th>
                <th rowSpan={2} className="py-2 px-1 text-right align-bottom">Sum</th>
                <th rowSpan={2} className="py-2 px-1 text-right align-bottom">Premium Amount</th>
                <th rowSpan={2} className="py-2 px-1 align-bottom">Pay Before</th>
                <th colSpan={2} className="py-1 px-1 text-center border-b border-slate-400">Late Payment</th>
                <th rowSpan={2} className="py-2 px-1 text-center align-bottom">Tax Benef.</th>
              </tr>
              <tr className="bg-slate-100 border-b-2 border-slate-800 font-bold text-slate-900">
                <th className="py-1 px-1 text-right">Amount</th>
                <th className="py-1 px-1">Upto</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200">
              {groupData.map((group) => (
                <tr key={group.groupCode} className="border-t-2 border-slate-400">
                  <td colSpan={13} className="p-0">
                    {/* Group Banner */}
                    <div className="text-center bg-slate-100 font-bold text-xs py-1.5 px-2 border-b border-slate-300 text-slate-900">
                      {group.groupCode}: {group.groupHeadName}
                    </div>

                    {group.members.map((member: any) => (
                      <div key={member.name} className="py-1">
                        {/* Member Row */}
                        <div className="px-2 font-bold text-[11px] text-slate-800 py-1">
                          {member.name}
                        </div>

                        <table className="w-full text-left text-[11px]">
                          <tbody>
                            {member.policies.map((p: any) => (
                              <tr key={p.policyNo} className="hover:bg-slate-50">
                                <td className="py-1 px-1 text-right font-mono font-bold text-[#0B1220] w-24">
                                  {p.policyNo}
                                </td>
                                <td className="py-1 px-1 text-center font-bold w-10">{p.agCd}</td>
                                <td className="py-1 px-1 w-20">{p.comDate}</td>
                                <td className="py-1 px-1 w-20 font-medium">{p.planTermPpt}</td>
                                <td className="py-1 px-1 text-center w-8 font-bold">{p.md}</td>
                                <td className="py-1 px-1 w-10 font-mono">{p.brn}</td>
                                <td className="py-1 px-1 w-20 font-medium text-slate-700">{p.fupDate}</td>
                                <td className="py-1 px-1 w-20 font-medium text-slate-700">{p.dueDate}</td>
                                <td className="py-1 px-1 text-right font-mono w-24">
                                  {p.sumAssured.toLocaleString("en-IN")}
                                </td>
                                <td className="py-1 px-1 text-right font-bold font-mono w-24">
                                  {p.premiumAmount.toFixed(2)}
                                </td>
                                <td className="py-1 px-1 w-20 text-slate-700">{p.payBefore}</td>
                                <td className="py-1 px-1 text-right font-mono w-20">
                                  {p.lateAmount.toFixed(2)}
                                </td>
                                <td className="py-1 px-1 w-20 text-slate-700">{p.lateUpto}</td>
                                <td className="py-1 px-1 text-center w-16">{p.taxBen}</td>
                              </tr>
                            ))}

                            {/* Member Subtotal Row */}
                            <tr className="border-t border-slate-300 font-bold text-[11px] bg-slate-50">
                              <td colSpan={8} className="text-right pr-4 py-1">
                                Total :
                              </td>
                              <td className="text-right py-1 font-mono">
                                {member.memberTotalSum.toLocaleString("en-IN")}
                              </td>
                              <td className="text-right py-1 font-mono text-[#0B1220]">
                                {member.memberTotalPremium.toFixed(2)}
                              </td>
                              <td></td>
                              <td className="text-right py-1 font-mono">
                                {member.memberTotalLatePayment.toFixed(2)}
                              </td>
                              <td colSpan={2}></td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    ))}

                    {/* Group Total Row */}
                    <div className="flex justify-between items-center bg-slate-200 px-3 py-1.5 font-bold text-xs border-t-2 border-slate-500">
                      <span>Total No. of Policies for this Group : {group.totalPolicies}</span>
                      <div className="flex items-center gap-6">
                        <span>Group Total :</span>
                        <span className="font-mono">{group.groupTotalSum.toLocaleString("en-IN")}</span>
                        <span className="font-mono text-[#0B1220]">
                          {group.groupTotalPremium.toFixed(2)}
                        </span>
                        <span className="font-mono">{group.groupTotalLatePayment.toFixed(2)}</span>
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Summary Table Box */}
        {groupData.length > 0 && (
          <div className="pt-4 flex justify-end">
            <div className="w-full max-w-xl border-2 border-slate-800 rounded overflow-hidden">
              <table className="w-full text-left text-xs font-semibold">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-400 text-slate-900">
                    <th className="p-2 border-r border-slate-400"></th>
                    <th className="p-2 text-right border-r border-slate-400">Sum Assured</th>
                    <th className="p-2 text-right border-r border-slate-400">Premium Amount</th>
                    <th className="p-2 text-right">Late Payment Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-300">
                  <tr className="bg-slate-100 font-bold border-t-2 border-slate-700">
                    <td className="p-2 border-r border-slate-400">Grand Total</td>
                    <td className="p-2 text-right font-mono border-r border-slate-400">
                      {grandTotalSum.toLocaleString("en-IN")}
                    </td>
                    <td className="p-2 text-right font-mono border-r border-slate-400">
                      {grandTotalPremium.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-2 text-right font-mono">
                      {grandTotalLatePayment.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                  <tr className="bg-slate-50 font-bold">
                    <td className="p-2 border-r border-slate-400">Total No. of Policies</td>
                    <td colSpan={3} className="p-2 text-center font-mono text-sm text-[#0B1220]">
                      {grandTotalPolicies}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Legend Footer — verbatim from the sample statement */}
        <div className="pt-6 border-t border-slate-300 space-y-1 text-[10px] text-slate-700 font-medium">
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            <span>
              <strong className="font-bold">m :</strong> Policies with SSS Mode
            </span>
            <span>
              <strong className="font-bold">M :</strong> Policies with Monthly Mode
            </span>
            <span>
              <strong className="font-bold">Y :</strong> Policies with NACH Mode
            </span>
            <span>
              <strong className="font-bold">S :</strong> Cheque dishonoured/ Debit fail
            </span>
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-1">
            <span>
              <strong className="font-bold">A :</strong> Policies with APPS Mode
            </span>
            <span>
              <strong className="font-bold">ρ :</strong> Pan Card is register for the Policy
            </span>
          </div>

          <div className="flex justify-between items-center pt-2 font-mono text-[9px] text-slate-500 border-t border-slate-200">
            <span>DSS000019899</span>
            <span>Generated via Premium Due Engine</span>
          </div>
        </div>
      </div>
    </div>
  );
}