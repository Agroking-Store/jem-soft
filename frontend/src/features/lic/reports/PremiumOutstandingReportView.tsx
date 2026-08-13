"use client";

import { useRef, useState, useMemo, Fragment } from "react";
import { ArrowLeft, Download, FilterX } from "lucide-react";
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

      validDbPolicies.forEach((p, idx) => {
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
          p.premium?.installmentPremium || p.premium?.totalInstallmentPremium || p.premiumAmount || 0
        );
        const fupRaw = p.nextPremiumDueDate || p.fupDate;
        const fupDate = fupRaw ? new Date(fupRaw) : new Date(formData.fupDatesUpto || Date.now());

        const tier1Date = addDays(fupDate, TIER1_DAYS_AFTER_FUP);
        const tier2Date = addDays(fupDate, TIER2_DAYS_AFTER_FUP);
        const tier1Amount = installmentPremium + TIER1_LATE_FEE;
        const tier2Amount = installmentPremium + TIER2_LATE_FEE;

        mem.policies.push({
          policyNo: p.policyNumber || `PO-${idx + 1}`,
          agCd: p.agentCode || p.agency?.agencyCode || "—",
          commDate: fmtDate(p.commencementDate),
          planTermPpt: `${p.product?.planNumber || "—"}/${p.policyTerm || "—"}/${p.premiumPayingTerm || "—"}`,
          md: mode,
          brn: p.branch?.branchCode || "—",
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

    // 100% PURE DYNAMIC — No hardcoded/demo data. If nothing in DB matches
    // the applied filters, show an empty state instead of a fake statement.
    return [];
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
    const toastId = toast.loading("Generating Pristine Executive PDF...");

    const elem = reportRef.current;
    const originalWidth = elem.style.width;

    try {
      // Temporarily lock to strict A4 print width for crystal-clear, consistent scale
      elem.style.width = "820px";

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

      pdf.save(`Premium_Outstanding_${formData.reportDate || "Report"}.pdf`);
      toast.success("Executive PDF exported successfully!", { id: toastId });
    } catch (err: any) {
      console.error(err);
      elem.style.width = originalWidth;
      toast.error(err?.message || "Failed to generate PDF.", { id: toastId });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6 w-full">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-[#0B1220] p-4 rounded-2xl border border-slate-800 shadow-xl print:hidden w-full">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToForm}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-slate-300 bg-white/10 rounded-xl hover:bg-white/20 transition uppercase tracking-wider"
          >
            <ArrowLeft size={16} />
            <span>Edit Filters</span>
          </button>
          <span className="text-xs bg-[#B8873A]/20 text-[#E8C77A] font-bold px-3 py-1.5 rounded-full border border-[#B8873A]/40 uppercase tracking-wider">
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
            <span>{isExporting ? "Exporting PDF..." : "Download PDF"}</span>
          </button>
        </div>
      </div>

      {/* Main Printable Document Layout */}
      <div
        ref={reportRef}
        style={{ fontFamily: "Arial, Helvetica, sans-serif" }}
        className="w-full bg-white p-8 rounded-2xl border border-slate-300 shadow-2xl text-slate-900 space-y-6 print:p-0 print:border-none print:shadow-none"
      >
        {/* Advisor Letterhead */}
        <div style={{ borderBottom: "2px solid #0B1220" }} className="flex justify-between items-start pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-[#0B1220] tracking-tight">Jayant Mahabole</h1>
              <span className="text-[10px] bg-[#0B1220] text-[#E8C77A] font-bold px-2 py-0.5 rounded uppercase tracking-widest">
                LIC Authorized Advisor
              </span>
            </div>
            <p className="text-xs font-semibold text-[#B8873A]">MBA in Insurance & Finance</p>
            <p className="text-xs text-slate-600 max-w-md leading-relaxed">
              84/2, Darpan Bldg., 201 Sarang Society, Sahakarnagar No. 2 Parvati Pune 411009
            </p>
            <div className="flex items-center gap-4 text-xs font-medium text-slate-700 pt-1">
              <span>Phone: 9822452896</span>
              <span>Email: office@jayantmahbole.com</span>
            </div>
          </div>

          <div className="text-right space-y-1.5">
            <div className="inline-block bg-[#0B1220] text-[#E8C77A] px-4 py-2 rounded-xl text-right border border-[#B8873A]/40 shadow-sm">
              <p className="text-xs font-bold tracking-widest uppercase">Life Insurance Corporation</p>
              <p className="text-[10px] text-slate-300">Official Premium Outstanding Statement</p>
            </div>
            <p className="text-xs font-bold text-slate-700 pt-1">
              Date: {formData.reportDate ? fmtDate(formData.reportDate) : fmtDate(new Date())}
            </p>
          </div>
        </div>

        {/* Title Banner */}
        <div className="bg-[#0B1220] text-white rounded-xl px-5 py-3 flex items-center justify-between border-l-4 border-[#B8873A] shadow-sm">
          <h2 className="text-base font-bold text-[#E8C77A] uppercase tracking-wider">
            Premium Outstanding — {getReportHeaderTitle()}
          </h2>
          <div className="text-right text-xs text-[#E8C77A] font-bold">
            Groups: {groupData.length} | Policies: {grandTotalPolicies}
          </div>
        </div>

        {/* Report Meta Line */}
        <div className="text-[11px] font-semibold text-slate-800 px-1 space-y-0.5">
          <div className="flex justify-between">
            <span>
              Premium Outstanding between {fmtDate(windowFrom)} and {fmtDate(formData.fupDatesUpto)}
            </span>
            <span>Page 1 of 1</span>
          </div>
        </div>

        {/* Premium Outstanding Table —  14 columns throughout */}
        {groupData.length === 0 ? (
          <div className="p-12 text-center border-2 border-dashed border-slate-300 rounded-2xl space-y-3 bg-slate-50">
            <div className="inline-flex p-3 bg-red-100 text-red-600 rounded-full">
              <FilterX size={32} />
            </div>
            <h3 className="text-base font-bold text-slate-800">No Premium Outstanding Policies Match Your Selected Filters</h3>
            <p className="text-xs text-slate-600 max-w-md mx-auto">
              No policies in the database matched the combined filter criteria. Please adjust your filters or click "Edit Filters" to try again.
            </p>
            <button
              onClick={onBackToForm}
              className="px-5 py-2 bg-[#0B1220] text-[#E8C77A] font-bold text-xs rounded-xl hover:bg-slate-900 transition"
            >
              Modify Filter Selection
            </button>
          </div>
        ) : (
        <div className="space-y-4 rounded-xl border border-slate-300 overflow-hidden shadow-xs">
          <table className="w-full text-left text-[11px] border-collapse">
            <thead>
              <tr className="bg-slate-200 border-y border-slate-400 font-bold text-slate-900">
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
              <tr className="bg-slate-200 border-b border-slate-400 font-bold text-slate-900">
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
                    <td colSpan={14} className="p-0">
                      <div className="bg-[#0B1220] px-3 py-2 flex items-center gap-2 border-b border-[#B8873A]/40">
                        <span className="text-[10px] bg-[#B8873A] text-[#0B1220] font-bold px-2 py-0.5 rounded font-mono">
                          {group.groupCode}
                        </span>
                        <span className="font-bold text-xs text-[#E8C77A]">{group.groupHeadName}</span>
                      </div>
                    </td>
                  </tr>

                  {group.members.map((member: any) => (
                    <Fragment key={member.name}>
                      {/* Member Row */}
                      <tr>
                        <td colSpan={14} className="px-0 py-1">
                          <div className="mx-2 mt-1 px-2.5 py-1 font-bold text-[11px] text-slate-900 bg-slate-100 rounded-md border-l-4 border-[#0B1220]">
                            {member.name}
                          </div>
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
        )}

        {/* Summary Box */}
        {groupData.length > 0 && (
          <div className="pt-2 flex justify-end">
            <div className="w-full max-w-xl border-2 border-[#0B1220] rounded-xl overflow-hidden shadow-md">
              <div className="bg-[#0B1220] text-[#E8C77A] p-2.5 text-xs font-bold uppercase tracking-wider border-b border-[#B8873A]">
                Grand Premium Outstanding Summary
              </div>
              <table className="w-full text-left text-xs font-semibold border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-300 text-slate-900">
                    <th className="p-2.5 border-r border-slate-300"></th>
                    <th className="p-2.5 text-right border-r border-slate-300">Amount (without Latefee)</th>
                    <th className="p-2.5 text-right">Amount (with Latefee)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  <tr className="bg-[#0B1220] text-white font-bold border-t-2 border-[#B8873A]">
                    <td className="p-2.5 border-r border-slate-700 text-[#E8C77A]">Grand Total</td>
                    <td className="p-2.5 text-right font-mono border-r border-slate-700 text-[#E8C77A]">
                      {grandTotalTier1.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-2.5 text-right font-mono text-[#E8C77A]">
                      {grandTotalTier2.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                  <tr className="bg-slate-50 font-bold">
                    <td className="p-2.5 border-r border-slate-300 text-slate-800">Total No. of Policies</td>
                    <td colSpan={2} className="p-2.5 text-center font-mono text-sm text-[#0B1220]">
                      {grandTotalPolicies} Policies
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Legend Footer */}
        <div className="pt-6 border-t border-slate-300 space-y-2 text-[10px] text-slate-700 font-medium">
          <div className="flex flex-wrap gap-x-6 gap-y-1">
            <span><strong className="font-bold text-[#0B1220]">m :</strong> SSS Mode</span>
            <span><strong className="font-bold text-[#0B1220]">M :</strong> Monthly Mode</span>
            <span><strong className="font-bold text-[#0B1220]">Y :</strong> NACH Mode</span>
            <span><strong className="font-bold text-[#0B1220]">S :</strong> Cheque dishonoured/ Debit fail</span>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-1">
            <span><strong className="font-bold text-[#0B1220]">A :</strong> APPS Mode</span>
            <span><strong className="font-bold text-[#0B1220]">ρ :</strong> PAN Card Registered</span>
          </div>
          <div className="flex justify-between items-center pt-3 font-mono text-[9px] text-slate-500 border-t border-slate-200">
            <span>Statement Code: DSS000019899</span>
            <span>Generated via Premium Outstanding Engine</span>
          </div>
        </div>
      </div>
    </div>
  );
}