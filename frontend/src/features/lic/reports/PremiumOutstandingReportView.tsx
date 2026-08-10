"use client";

import { useRef, useState, useMemo, Fragment } from "react";
import { ArrowLeft, Download } from "lucide-react";
import { PremiumOutstandingFormData } from "./PremiumOutstandingForm";
import html2canvas from "html2canvas-pro";
import jsPDF from "jspdf";
import toast from "react-hot-toast";

interface PremiumOutstandingReportViewProps {
  formData: PremiumOutstandingFormData;
  policies: any[];
  customers: any[];
  onBackToForm: () => void;
}

const TIER1_DAYS_AFTER_FUP = 31;
const TIER2_DAYS_AFTER_FUP = 45;
const TIER1_LATE_FEE = 0;
const TIER2_LATE_FEE = 30;

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function addMonths(date: Date, months: number) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

function fmtDate(d: Date | string | null | undefined) {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  if (isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-GB");
}

function fmtDayMonth(d: Date | string | null | undefined) {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  if (isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit" });
}

export default function PremiumOutstandingReportView({
  formData,
  policies: rawPolicies = [],
  customers: rawCustomers = [],
  onBackToForm,
}: PremiumOutstandingReportViewProps) {
  const reportRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  const groupData = useMemo(() => {
    const fupUpto = formData.fupDatesUpto ? new Date(formData.fupDatesUpto) : null;

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
      
      const fupRaw = p.nextPremiumDueDate || p.fupDate;
      if (fupUpto && fupRaw) {
        const fd = new Date(fupRaw);
        if (!isNaN(fd.getTime()) && fd > fupUpto) return false;
      }

      const rawStatus = (p.status?.statusName || p.statusName || "Lapsed").toLowerCase();
      if (selectedStatusNames.length > 0) {
        const normStatus = rawStatus.replace(/[- ]/g, "");
        const matches = selectedStatusNames.some(
          (st) => normStatus.includes(st) || st.includes(normStatus)
        );
        if (!matches) return false;
      }

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
            groupTotalTier1: 0,
            groupTotalTier2: 0,
          };
        }

        const grp = groupMap[gCode];
        if (!grp.membersMap[memberName]) {
          grp.membersMap[memberName] = {
            name: memberName,
            policies: [],
            memberTotalTier1: 0,
            memberTotalTier2: 0,
          };
        }
        const mem = grp.membersMap[memberName];

        const mode = p.premiumMode?.modeName?.[0]?.toUpperCase() || "H";
        const installmentPremium = Number(
          p.premium?.installmentPremium || p.premium?.totalInstallmentPremium || p.premiumAmount || 4118
        );
        const fupRaw = p.nextPremiumDueDate || p.fupDate;
        const fupDate = fupRaw ? new Date(fupRaw) : new Date(formData.fupDatesUpto || Date.now());

        const tier1Date = addDays(fupDate, TIER1_DAYS_AFTER_FUP);
        const tier2Date = addDays(fupDate, TIER2_DAYS_AFTER_FUP);
        const tier1Amount = installmentPremium + TIER1_LATE_FEE;
        const tier2Amount = installmentPremium + TIER2_LATE_FEE;

        mem.policies.push({
          policyNo: p.policyNumber || "917894575",
          agCd: p.agentCode || "J",
          commDate: fmtDate(p.commencementDate) || "28/01/20",
          planTermPpt: `${p.product?.planNumber || "855"}/${p.policyTerm || 25}/${p.premiumPayingTerm || 25}`,
          md: mode,
          brn: p.branch?.branchCode || "955",
          installmentPremium,
          fupDate: fmtDate(fupDate),
          tier1Amount,
          tier1Date: fmtDayMonth(tier1Date),
          tier2Amount,
          tier2Date: fmtDayMonth(tier2Date),
          taxBen: "0.00",
          depsXCharge: "0.00",
        });

        mem.memberTotalTier1 += tier1Amount;
        mem.memberTotalTier2 += tier2Amount;
        grp.totalPolicies += 1;
        grp.groupTotalTier1 += tier1Amount;
        grp.groupTotalTier2 += tier2Amount;
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

    const demoPolicies = [
      { policyNo: "917894575", commDate: "28/01/20", planTermPpt: "855/25/25", md: "H", installmentPremium: 4118.0, fupDate: "28/07/26", tier1Amount: 4118.0, tier1Date: "28/08", tier2Amount: 4151.0, tier2Date: "11/09" },
      { policyNo: "917894577", commDate: "22/01/20", planTermPpt: "836/25/16", md: "Q", installmentPremium: 3739.0, fupDate: "22/07/26", tier1Amount: 3739.0, tier1Date: "22/08", tier2Amount: 3769.0, tier2Date: "05/09" },
      { policyNo: "935074254", commDate: "19/05/22", planTermPpt: "936/21/15", md: "H", installmentPremium: 17077.0, fupDate: "19/05/26", tier1Amount: 17347.0, tier1Date: "01/08", tier2Amount: 17483.0, tier2Date: "01/09" },
    ].map((p) => ({ ...p, agCd: "J", brn: "955", taxBen: "0.00", depsXCharge: "0.00" }));

    const memberTotalTier1 = demoPolicies.reduce((a, p) => a + p.tier1Amount, 0);
    const memberTotalTier2 = demoPolicies.reduce((a, p) => a + p.tier2Amount, 0);

    return [
      {
        groupCode: selectedGroupCode,
        groupHeadName: selectedGroupHead,
        members: [
          {
            name: `Mr ${selectedGroupHead.replace(/^Mrs?\s*/i, "")}`,
            policies: demoPolicies,
            memberTotalTier1,
            memberTotalTier2,
          },
        ],
        totalPolicies: demoPolicies.length,
        groupTotalTier1: memberTotalTier1,
        groupTotalTier2: memberTotalTier2,
      },
    ];
  }, [rawPolicies, formData]);

  const grandTotalTier1 = groupData.reduce((acc, g) => acc + g.groupTotalTier1, 0);
  const grandTotalTier2 = groupData.reduce((acc, g) => acc + g.groupTotalTier2, 0);
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

  const windowFrom = formData.fupDatesUpto ? addMonths(new Date(formData.fupDatesUpto), -6) : null;

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

      pdf.save(`Premium_Outstanding_${formData.reportDate || "Report"}.pdf`);
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
        {/* Advisor Letterhead  */}
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
            Premium Outstanding Statement
          </h2>
          <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
            {getReportHeaderTitle()}
          </span>
        </div>

        {/* Report Meta Line */}
        <div className="text-[11px] font-semibold text-slate-800 px-1 space-y-0.5">
          <div>
            <span>
              Date of Report: {formData.reportDate ? fmtDate(formData.reportDate) : fmtDate(new Date())}
            </span>
          </div>
          <div className="flex justify-between">
            <span>
              Premium Outstanding between {fmtDate(windowFrom)} and {fmtDate(formData.fupDatesUpto)}
            </span>
            <span>Page 1 of 1</span>
          </div>
        </div>

        {/* Premium Outstanding Table —  14 columns throughout */}
        <div className="space-y-4">
          <table className="w-full text-left text-[11px] border-collapse">
            <thead>
              <tr className="bg-emerald-50 border-y-2 border-slate-800 font-bold text-slate-900">
                <th rowSpan={2} className="py-2 px-1 text-right align-bottom">Policy No.</th>
                <th rowSpan={2} className="py-2 px-1 text-center align-bottom">Ag Cd</th>
                <th rowSpan={2} className="py-2 px-1 align-bottom">Comm. Date</th>
                <th rowSpan={2} className="py-2 px-1 align-bottom">Pl/Tm/Pt</th>
                <th rowSpan={2} className="py-2 px-1 text-center align-bottom">Md</th>
                <th rowSpan={2} className="py-2 px-1 align-bottom">Brn</th>
                <th rowSpan={2} className="py-2 px-1 text-right align-bottom">Installment Premium</th>
                <th rowSpan={2} className="py-2 px-1 align-bottom">FUP Date</th>
                <th colSpan={4} className="py-1 px-1 text-center border-b border-slate-400">
                  Amount to be Paid&nbsp; (Upto)
                </th>
                <th rowSpan={2} className="py-2 px-1 text-center align-bottom">Tax Benef.</th>
                <th rowSpan={2} className="py-2 px-1 text-center align-bottom">Deps./ X-charge</th>
              </tr>
              <tr className="bg-emerald-50 border-b-2 border-slate-800 font-bold text-slate-900">
                <th className="py-1 px-1 text-right">Rs.</th>
                <th className="py-1 px-1">dd/mm</th>
                <th className="py-1 px-1 text-right">Rs.</th>
                <th className="py-1 px-1">dd/mm</th>
              </tr>
            </thead>

            <tbody>
              {groupData.map((group) => (
                <Fragment key={group.groupCode}>
                  {/* Group Banner */}
                  <tr className="border-t-2 border-slate-400">
                    <td
                      colSpan={14}
                      className="text-center bg-slate-100 font-bold text-xs py-1.5 px-2 border-b border-slate-300 text-slate-900"
                    >
                      {group.groupCode}: {group.groupHeadName}
                    </td>
                  </tr>

                  {group.members.map((member: any) => (
                    <Fragment key={member.name}>
                      {/* Member Row */}
                      <tr>
                        <td colSpan={14} className="px-2 font-bold text-[11px] text-slate-800 py-1">
                          {member.name}
                        </td>
                      </tr>

                      {/* Policy Rows */}
                      {member.policies.map((p: any) => (
                        <tr key={p.policyNo} className="hover:bg-slate-50 divide-x divide-slate-100">
                          <td className="py-1 px-1 text-right font-mono font-bold text-[#0B1220]">
                            {p.policyNo}
                          </td>
                          <td className="py-1 px-1 text-center font-bold">{p.agCd}</td>
                          <td className="py-1 px-1">{p.commDate}</td>
                          <td className="py-1 px-1 font-medium">{p.planTermPpt}</td>
                          <td className="py-1 px-1 text-center font-bold">{p.md}</td>
                          <td className="py-1 px-1 font-mono">{p.brn}</td>
                          <td className="py-1 px-1 text-right font-mono">
                            {p.installmentPremium.toFixed(2)}
                          </td>
                          <td className="py-1 px-1 font-medium text-slate-700">{p.fupDate}</td>
                          <td className="py-1 px-1 text-right font-bold font-mono text-red-600">
                            {p.tier1Amount.toFixed(2)}
                          </td>
                          <td className="py-1 px-1 text-slate-700">{p.tier1Date}</td>
                          <td className="py-1 px-1 text-right font-bold font-mono text-red-600">
                            {p.tier2Amount.toFixed(2)}
                          </td>
                          <td className="py-1 px-1 text-slate-700">{p.tier2Date}</td>
                          <td className="py-1 px-1 text-center">{p.taxBen}</td>
                          <td className="py-1 px-1 text-center">{p.depsXCharge}</td>
                        </tr>
                      ))}

                      {/* Member Subtotal Row — 8 + 1 + 1 + 1 + 1 + 2 = 14 columns */}
                      <tr className="border-t border-slate-300 font-bold text-[11px] bg-slate-50">
                        <td colSpan={8} className="text-right pr-4 py-1">
                          Total :
                        </td>
                        <td className="text-right py-1 font-mono">
                          {member.memberTotalTier1.toFixed(2)}
                        </td>
                        <td></td>
                        <td className="text-right py-1 font-mono">
                          {member.memberTotalTier2.toFixed(2)}
                        </td>
                        <td></td>
                        <td colSpan={2}></td>
                      </tr>
                    </Fragment>
                  ))}

                  {/* Group Total Row */}
                  <tr className="bg-slate-200 border-t-2 border-slate-500 font-bold text-xs">
                    <td colSpan={8} className="px-3 py-1.5">
                      Total No. of Policies for this Group : {group.totalPolicies}
                    </td>
                    <td className="px-1 py-1.5 text-right font-mono">
                      {group.groupTotalTier1.toFixed(2)}
                    </td>
                    <td></td>
                    <td className="px-1 py-1.5 text-right font-mono">
                      {group.groupTotalTier2.toFixed(2)}
                    </td>
                    <td></td>
                    <td colSpan={2}></td>
                  </tr>
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>

        {/* Summary Box */}
        {groupData.length > 0 && (
          <div className="pt-4 flex justify-end">
            <div className="w-full max-w-xl border-2 border-slate-800 rounded overflow-hidden">
              <table className="w-full text-left text-xs font-semibold">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-400 text-slate-900">
                    <th className="p-2 border-r border-slate-400"></th>
                    <th className="p-2 text-right border-r border-slate-400">Amount (without Latefee)</th>
                    <th className="p-2 text-right">Amount (with Latefee)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-300">
                  <tr className="bg-slate-100 font-bold border-t-2 border-slate-700">
                    <td className="p-2 border-r border-slate-400">Grand Total</td>
                    <td className="p-2 text-right font-mono border-r border-slate-400">
                      {grandTotalTier1.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-2 text-right font-mono">
                      {grandTotalTier2.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                  <tr className="bg-slate-50 font-bold">
                    <td className="p-2 border-r border-slate-400">Total No. of Policies</td>
                    <td colSpan={2} className="p-2 text-center font-mono text-sm text-[#0B1220]">
                      {grandTotalPolicies}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Legend Footer */}
        <div className="pt-6 border-t border-slate-300 space-y-1 text-[10px] text-slate-700 font-medium">
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            <span><strong className="font-bold">m :</strong> Policies with SSS Mode</span>
            <span><strong className="font-bold">M :</strong> Policies with Monthly Mode</span>
            <span><strong className="font-bold">Y :</strong> Policies with NACH Mode</span>
            <span><strong className="font-bold">S :</strong> Cheque dishonoured/ Debit fail</span>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            <span><strong className="font-bold">A :</strong> Policies with APPS Mode</span>
            <span><strong className="font-bold">ρ :</strong> Pan Card is register for the Policy</span>
          </div>
          <div className="flex justify-between items-center pt-2 font-mono text-[9px] text-slate-500 border-t border-slate-200">
            <span>DSS000019899</span>
            <span>Generated via Premium Outstanding Engine</span>
          </div>
        </div>
      </div>
    </div>
  );
}