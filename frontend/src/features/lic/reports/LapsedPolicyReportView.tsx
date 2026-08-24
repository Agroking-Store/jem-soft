"use client";

import { useRef, useState, useMemo, Fragment, ReactNode } from "react";
import { ArrowLeft, Download } from "lucide-react";
import { LapsedPolicyFormData } from "./LapsedPolicyForm";
import html2canvas from "html2canvas-pro";
import jsPDF from "jspdf";
import toast from "react-hot-toast";

interface LapsedPolicyReportViewProps {
  formData: LapsedPolicyFormData;
  policies: any[];
  customers: any[];
  onBackToForm: () => void;
}

// Revival-interest placeholder constants — LIC's actual revival interest rate
// varies by plan/UIN and is usually compounded, not flat simple interest.
// This is a reasonable stand-in until you wire in the real slab/rate table.
const REVIVAL_INTEREST_RATE_PA = 0.09; // 9% p.a., simple interest
const MODE_MONTHS: Record<string, number> = { Y: 12, H: 6, Q: 3, M: 1, S: 12 };

function fmtDate(d: Date | string | null | undefined) {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  if (isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-GB");
}

function computeRevival(lapsedDate: Date, calcDate: Date, installmentPremium: number, mode: string) {
  const modeMonths = MODE_MONTHS[mode] || 12;
  const monthsSinceLapse = Math.max(
    0,
    (calcDate.getFullYear() - lapsedDate.getFullYear()) * 12 +
      (calcDate.getMonth() - lapsedDate.getMonth())
  );
  const unpaidPremiums = Math.max(1, Math.ceil(monthsSinceLapse / modeMonths) || 1);
  const premiumDueForRevival = unpaidPremiums * installmentPremium;
  const daysSinceLapse = Math.max(
    0,
    Math.round((calcDate.getTime() - lapsedDate.getTime()) / (1000 * 60 * 60 * 24))
  );
  const revivalInterest = premiumDueForRevival * REVIVAL_INTEREST_RATE_PA * (daysSinceLapse / 365);
  const totalRevivalAmount = premiumDueForRevival + revivalInterest;
  return { unpaidPremiums, premiumDueForRevival, revivalInterest, totalRevivalAmount };
}

interface ColumnDef {
  key: string;
  label: string;
  align?: "left" | "right" | "center";
  render: (p: any) => ReactNode;
}

export default function LapsedPolicyReportView({
  formData,
  policies: rawPolicies = [],
  customers: rawCustomers = [],
  onBackToForm,
}: LapsedPolicyReportViewProps) {
  const reportRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  // Column definitions driven by reportOptions
  const columns: ColumnDef[] = useMemo(() => {
    const cols: ColumnDef[] = [
      { key: "policyNo", label: "Policy No", align: "right", render: (p) => p.policyNo },
      { key: "agCd", label: "Ag Cd", align: "center", render: (p) => p.agCd },
      { key: "comDate", label: "Comm. Date", render: (p) => p.comDate },
      { key: "planTermPpt", label: "Pl/Tm/Pt", render: (p) => p.planTermPpt },
      { key: "md", label: "Md", align: "center", render: (p) => p.md },
      { key: "brn", label: "Brn", render: (p) => p.brn },
      { key: "lapsedDate", label: "Lapsed Date", render: (p) => p.lapsedDate },
    ];

    if (formData.reportOptions.dob) {
      cols.push({ key: "dob", label: "D.O.B", align: "center", render: (p) => p.dob || "—" });
    }

    if (formData.reportOptions.pan) {
      cols.push({ key: "pan", label: "PAN No.", align: "center", render: (p) => p.pan || "—" });
    }

    cols.push(
      {
        key: "sumAssured",
        label: "Sum Assured",
        align: "right",
        render: (p) => p.sumAssured.toLocaleString("en-IN"),
      },
      {
        key: "installmentPremium",
        label: "Installment Premium",
        align: "right",
        render: (p) => p.installmentPremium.toFixed(2),
      },
      { key: "unpaidPremiums", label: "Unpaid Prems", align: "center", render: (p) => p.unpaidPremiums }
    );

    if (formData.reportOptions.loanSbAvailable) {
      cols.push({
        key: "loanSb",
        label: "Loan/SB Avail.",
        align: "center",
        render: (p) => (p.loanSbAvailable ? "Yes" : "No"),
      });
    }

    if (formData.reportOptions.commissionReceivable) {
      cols.push({
        key: "commissionReceivable",
        label: "Commission Receivable",
        align: "right",
        render: (p) => p.commissionReceivable.toFixed(2),
      });
    }

    // Financial columns stay last for subtotal calculation
    cols.push(
      {
        key: "premiumDueForRevival",
        label: "Premium Due for Revival",
        align: "right",
        render: (p) => p.premiumDueForRevival.toFixed(2),
      },
      {
        key: "revivalInterest",
        label: "Revival Interest",
        align: "right",
        render: (p) => p.revivalInterest.toFixed(2),
      },
      {
        key: "totalRevivalAmount",
        label: "Total Revival Amount",
        align: "right",
        render: (p) => <span className="font-bold">{p.totalRevivalAmount.toFixed(2)}</span>,
      }
    );

    return cols;
  }, [formData.reportOptions]);

  const alignClass = (a?: "left" | "right" | "center") =>
    a === "right" ? "text-right" : a === "center" ? "text-center" : "text-left";

  const groupData = useMemo(() => {
    const lapsedSince = formData.policiesLapsedSince ? new Date(formData.policiesLapsedSince) : null;
    const interestCalcDate = formData.revivalInterestCalculationDate
      ? new Date(formData.revivalInterestCalculationDate)
      : new Date();

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
      const rawStatus = (p.status?.statusName || p.statusName || "").toLowerCase();
      const rawCode = (p.status?.statusCode || p.statusCode || "").toLowerCase();

      // Check if policy is lapsed or overdue past grace period
      let isLapsed = rawStatus.includes("laps") || rawCode.includes("laps") || rawStatus.includes("reduced paid");
      if (!isLapsed && (rawStatus.includes("active") || rawStatus.includes("inforce"))) {
        const fup = p.fupDate || p.nextPremiumDueDate;
        if (fup) {
          const fupDateObj = new Date(fup);
          const diffDays = (interestCalcDate.getTime() - fupDateObj.getTime()) / (1000 * 3600 * 24);
          if (diffDays > 30) isLapsed = true;
        }
      }

      if (!isLapsed) return false;

      const lapsedDateRaw = p.lapsedDate || p.nextPremiumDueDate || p.fupDate;
      if (lapsedSince && lapsedDateRaw) {
        const ld = new Date(lapsedDateRaw);
        if (!isNaN(ld.getTime()) && ld < lapsedSince) return false;
      }

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

    if (validDbPolicies.length === 0) {
      return [];
    }

    const groupMap: { [key: string]: any } = {};

    validDbPolicies.forEach((p) => {
      const custMaster = p.CustomerMaster;
      const custObj = p.customer;
      const gCode = custObj?.groupCode || `L${(p.clientId || "01").toString().padStart(3, "0")}`;
      const gHeadName = custObj?.groupName || custObj?.name || "Customer Group";

      if (selectedGroupCodesOrNames.length > 0) {
        const matches = selectedGroupCodesOrNames.some(
          (sc) => gCode.toLowerCase().includes(sc) || gHeadName.toLowerCase().includes(sc)
        );
        if (!matches) return;
      }

      const memberName = custMaster
        ? [custMaster.salutation, custMaster.firstName, custMaster.middleName, custMaster.lastName].filter(Boolean).join(" ")
        : custObj?.name || "Policy Holder";

      const memberMobile = custMaster?.contactInfo?.mobile1 || custObj?.mobile || custObj?.mobile1 || "";
      const memberEmail = custMaster?.contactInfo?.emailPersonal || custObj?.email || "";
      const memberPan = custMaster?.panNumber || custObj?.pan || "";
      const memberDob = fmtDate(custMaster?.dob || custObj?.dob);

      let memberAddress = "";
      if (custMaster?.addresses && custMaster.addresses.length > 0) {
        const addr = custMaster.addresses[0];
        memberAddress = [addr.addressLine1, addr.addressLine2, addr.city, addr.state, addr.pin].filter(Boolean).join(", ");
      } else if (custObj?.address) {
        memberAddress = custObj.address;
      }

      if (!groupMap[gCode]) {
        groupMap[gCode] = {
          groupCode: gCode,
          groupHeadName: gHeadName,
          membersMap: {},
          totalPolicies: 0,
          totals: { premiumDueForRevival: 0, revivalInterest: 0, totalRevivalAmount: 0 },
        };
      }

      const grp = groupMap[gCode];
      if (!grp.membersMap[memberName]) {
        grp.membersMap[memberName] = {
          name: memberName,
          mobile: memberMobile,
          email: memberEmail,
          pan: memberPan,
          dob: memberDob,
          address: memberAddress,
          policies: [],
          totals: { premiumDueForRevival: 0, revivalInterest: 0, totalRevivalAmount: 0 },
        };
      }
      const mem = grp.membersMap[memberName];

      const mode = p.premiumMode?.modeName?.[0]?.toUpperCase() || "Y";
      const sumAssured = Number(p.premium?.sumAssured || p.sumAssured || 0);
      const installmentPremium = Number(
        p.premium?.installmentPremium || p.premium?.totalInstallmentPremium || p.premiumAmount || 0
      );
      const lapsedDateRaw = p.lapsedDate || p.nextPremiumDueDate || p.fupDate;
      const lapsedDate = lapsedDateRaw ? new Date(lapsedDateRaw) : new Date();

      const revival = computeRevival(lapsedDate, interestCalcDate, installmentPremium, mode);

      const policyRow = {
        policyNo: p.policyNumber || "—",
        agCd: p.agentCode || "—",
        comDate: fmtDate(p.commencementDate) || "—",
        planTermPpt: `${p.product?.planNumber || "—"}/${p.policyTerm || "—"}/${p.premiumPayingTerm || "—"}`,
        md: mode,
        brn: p.branch?.branchCode || p.branchNo || "—",
        lapsedDate: fmtDate(lapsedDate),
        dob: memberDob,
        pan: memberPan,
        sumAssured,
        installmentPremium,
        loanSbAvailable: Boolean(p.loanAvailable || p.hasSurrenderValue),
        commissionReceivable: Number(p.commissionReceivable || installmentPremium * 0.05),
        ...revival,
      };

      mem.policies.push(policyRow);
      mem.totals.premiumDueForRevival += revival.premiumDueForRevival;
      mem.totals.revivalInterest += revival.revivalInterest;
      mem.totals.totalRevivalAmount += revival.totalRevivalAmount;

      grp.totalPolicies += 1;
      grp.totals.premiumDueForRevival += revival.premiumDueForRevival;
      grp.totals.revivalInterest += revival.revivalInterest;
      grp.totals.totalRevivalAmount += revival.totalRevivalAmount;
    });

    return Object.values(groupMap).map((grp: any) => ({
      ...grp,
      members: Object.values(grp.membersMap),
    }));
  }, [rawPolicies, formData]);

  const grandTotals = groupData.reduce(
    (acc, g) => ({
      premiumDueForRevival: acc.premiumDueForRevival + g.totals.premiumDueForRevival,
      revivalInterest: acc.revivalInterest + g.totals.revivalInterest,
      totalRevivalAmount: acc.totalRevivalAmount + g.totals.totalRevivalAmount,
      policies: acc.policies + g.totalPolicies,
    }),
    { premiumDueForRevival: 0, revivalInterest: 0, totalRevivalAmount: 0, policies: 0 }
  );

  const getReportHeaderTitle = () => {
    switch (formData.sortingOption) {
      case "groupMemberwise":
        return "Memberwise";
      case "areaWise":
        return "Areawise";
      case "subAreaWise":
        return "Sub-Areawise";
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
      const pdf = new jsPDF("l", "mm", "a4"); // landscape — this table is wide
      const imgWidth = 297;
      const pageHeight = 210;
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

      pdf.save(`Lapsed_Policies_${formData.reportDate || "Report"}.pdf`);
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
        className="bg-white p-8 rounded-2xl border border-slate-300 shadow-xl text-slate-900 font-sans max-w-6xl mx-auto space-y-4 print:p-0 print:border-none print:shadow-none"
      >
        {/* Advisor Letterhead */}
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
            Lapsed Policies Statement
          </h2>
          <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
            {getReportHeaderTitle()}
          </span>
        </div>

        {/* Report Meta Line */}
        <div className="text-[11px] font-semibold text-slate-800 px-1 space-y-0.5">
          <div className="flex justify-between">
            <span>Date of Report: {fmtDate(formData.reportDate) || fmtDate(new Date())}</span>
            <span>Page 1 of 1</span>
          </div>
          <div>
            <span>
              Policies Lapsed since {fmtDate(formData.policiesLapsedSince)} · Revival Interest
              calculated upto {fmtDate(formData.revivalInterestCalculationDate)}
            </span>
          </div>
        </div>

        {/* Lapsed Policies Table */}
        <div className="space-y-4 overflow-x-auto">
          {groupData.length === 0 ? (
            <div className="py-16 text-center bg-slate-50 rounded-xl border border-slate-200 p-8 space-y-2">
              <h3 className="font-bold text-slate-800 text-sm">No Lapsed Policies Found</h3>
              <p className="text-xs text-slate-500">
                There are no lapsed policies in the database matching your selected criteria.
              </p>
            </div>
          ) : (
            <table className="w-full text-left text-[11px] border-collapse min-w-[900px]">
              <thead>
                <tr className="bg-slate-100 border-y-2 border-slate-800 font-bold text-slate-900">
                  {columns.map((col) => (
                    <th key={col.key} className={`py-2 px-1 ${alignClass(col.align)}`}>
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {groupData.map((group) => (
                  <Fragment key={group.groupCode}>
                    {/* Group Banner */}
                    <tr className="border-t-2 border-slate-400">
                      <td
                        colSpan={columns.length}
                        className="text-center bg-slate-100 font-bold text-xs py-1.5 px-2 border-b border-slate-300 text-slate-900"
                      >
                        {group.groupCode}: {group.groupHeadName}
                      </td>
                    </tr>

                    {group.members.map((member: any) => (
                      <Fragment key={member.name}>
                        <tr>
                          <td colSpan={columns.length} className="px-2 font-bold text-[11px] text-slate-800 py-1 bg-slate-50/40 border-b border-slate-200">
                            <div className="flex items-center justify-between">
                              <span>{member.name}</span>
                            </div>
                            {(formData.reportOptions.address || formData.reportOptions.mobile || formData.reportOptions.email) && (
                              <div className="text-[10px] text-slate-500 font-normal mt-0.5">
                                {[
                                  formData.reportOptions.address && member.address && `Address: ${member.address}`,
                                  formData.reportOptions.mobile && member.mobile && `Mobile: ${member.mobile}`,
                                  formData.reportOptions.email && member.email && `Email: ${member.email}`,
                                ].filter(Boolean).join(" | ")}
                              </div>
                            )}
                          </td>
                        </tr>

                        {member.policies.map((p: any) => (
                          <tr key={p.policyNo} className="hover:bg-slate-50 divide-x divide-slate-100">
                            {columns.map((col) => (
                              <td key={col.key} className={`py-1 px-1 ${alignClass(col.align)}`}>
                                {col.render(p)}
                              </td>
                            ))}
                          </tr>
                        ))}

                        {/* Member Subtotal — label spans every column except the last 3 (financial) ones */}
                        <tr className="border-t border-slate-300 font-bold text-[11px] bg-slate-50">
                          <td colSpan={columns.length - 3} className="text-right pr-4 py-1">
                            Total :
                          </td>
                          <td className="text-right py-1 font-mono">
                            {member.totals.premiumDueForRevival.toFixed(2)}
                          </td>
                          <td className="text-right py-1 font-mono">
                            {member.totals.revivalInterest.toFixed(2)}
                          </td>
                          <td className="text-right py-1 font-mono text-[#0B1220]">
                            {member.totals.totalRevivalAmount.toFixed(2)}
                          </td>
                        </tr>
                      </Fragment>
                    ))}

                    {/* Group Total Row */}
                    <tr className="bg-slate-200 border-t-2 border-slate-500 font-bold text-xs">
                      <td colSpan={columns.length - 3} className="px-3 py-1.5">
                        Total No. of Policies for this Group : {group.totalPolicies}
                      </td>
                      <td className="px-1 py-1.5 text-right font-mono">
                        {group.totals.premiumDueForRevival.toFixed(2)}
                      </td>
                      <td className="px-1 py-1.5 text-right font-mono">
                        {group.totals.revivalInterest.toFixed(2)}
                      </td>
                      <td className="px-1 py-1.5 text-right font-mono text-[#0B1220]">
                        {group.totals.totalRevivalAmount.toFixed(2)}
                      </td>
                    </tr>
                  </Fragment>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Summary Box */}
        {groupData.length > 0 && (
          <div className="pt-4 flex justify-end">
            <div className="w-full max-w-xl border-2 border-slate-800 rounded overflow-hidden">
              <table className="w-full text-left text-xs font-semibold">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-400 text-slate-900">
                    <th className="p-2 border-r border-slate-400"></th>
                    <th className="p-2 text-right border-r border-slate-400">Premium Due for Revival</th>
                    <th className="p-2 text-right border-r border-slate-400">Revival Interest</th>
                    <th className="p-2 text-right">Total Revival Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-300">
                  <tr className="bg-slate-100 font-bold border-t-2 border-slate-700">
                    <td className="p-2 border-r border-slate-400">Grand Total</td>
                    <td className="p-2 text-right font-mono border-r border-slate-400">
                      {grandTotals.premiumDueForRevival.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-2 text-right font-mono border-r border-slate-400">
                      {grandTotals.revivalInterest.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-2 text-right font-mono">
                      {grandTotals.totalRevivalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                  <tr className="bg-slate-50 font-bold">
                    <td className="p-2 border-r border-slate-400">Total No. of Policies</td>
                    <td colSpan={3} className="p-2 text-center font-mono text-sm text-[#0B1220]">
                      {grandTotals.policies}
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
            <span>
              Revival interest is calculated at {(REVIVAL_INTEREST_RATE_PA * 100).toFixed(0)}% p.a. simple
              interest (placeholder — replace with your actual plan-wise revival rate table).
            </span>
          </div>

          <div className="flex justify-between items-center pt-2 font-mono text-[9px] text-slate-500 border-t border-slate-200">
            <span>DSS000019899</span>
            <span>Generated via Lapsed Policies Engine</span>
          </div>
        </div>
      </div>
    </div>
  );
}