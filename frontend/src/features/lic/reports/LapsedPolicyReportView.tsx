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

const BLACK = "#000";
const thStyle = {
  borderTop: `1px solid ${BLACK}`,
  borderBottom: `1px solid ${BLACK}`,
  verticalAlign: "bottom",
} as const;
const totalValueStyle = {
  display: "inline-block",
  borderTop: `1px solid ${BLACK}`,
  borderBottom: `3px double ${BLACK}`,
  padding: "1px 2px",
} as const;

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
      // isExplicitlyLapsed = true when the DB status itself is Lapsed/Reduced-Paid-Up
      const isExplicitlyLapsed =
        rawStatus.includes("laps") || rawCode.includes("laps") || rawStatus.includes("reduced paid");

      let isLapsed = isExplicitlyLapsed;
      if (!isLapsed && (rawStatus.includes("active") || rawStatus.includes("inforce"))) {
        const fup = p.fupDate || p.nextPremiumDueDate;
        if (fup) {
          const fupDateObj = new Date(fup);
          const diffDays = (interestCalcDate.getTime() - fupDateObj.getTime()) / (1000 * 3600 * 24);
          if (diffDays > 30) isLapsed = true;
        }
      }

      if (!isLapsed) return false;

      // Apply the "lapsed since" date filter ONLY for inferred lapses (active policies
      // that went overdue). Policies that are already explicitly marked Lapsed/Reduced-Paid-Up
      // in the DB must always appear regardless of nextPremiumDueDate age, because the
      // nextPremiumDueDate is not a reliable proxy for when an explicitly-lapsed policy
      // first lapsed (it may be years in the past).
      if (!isExplicitlyLapsed) {
        const lapsedDateRaw = p.lapsedDate || p.nextPremiumDueDate || p.fupDate;
        if (lapsedSince && lapsedDateRaw) {
          const ld = new Date(lapsedDateRaw);
          if (!isNaN(ld.getTime()) && ld < lapsedSince) return false;
        }
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

      const pdf = new jsPDF({ orientation: "l", unit: "mm", format: "a4", compress: true });
      const pageWidthMm = 297;
      const pageHeightMm = 210;
      const pxPerMm = canvas.width / pageWidthMm;
      const pageHeightPx = Math.floor(pageHeightMm * pxPerMm);

      // Each PDF page gets ONLY its own slice, compressed as JPEG (keeps file small)
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
        ctx.drawImage(canvas, 0, renderedPx, canvas.width, sliceHeightPx, 0, 0, canvas.width, sliceHeightPx);
        const imgData = pageCanvas.toDataURL("image/jpeg", 0.85);
        if (pageIndex > 0) pdf.addPage();
        pdf.addImage(imgData, "JPEG", 0, 0, pageWidthMm, sliceHeightPx / pxPerMm, undefined, "FAST");
        renderedPx += sliceHeightPx;
        pageIndex += 1;
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
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm print:hidden">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToForm}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-slate-500 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 transition uppercase tracking-wider"
          >
            <ArrowLeft size={16} />
            <span>Edit Filters</span>
          </button>
          <span className="text-xs bg-blue-50 text-[#1877F2] font-bold px-3 py-1 rounded-full border border-blue-200 uppercase tracking-wider">
            {getReportHeaderTitle()}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleDownloadPDF}
            disabled={isExporting}
            className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-[#5c67ff] to-[#3a47ff] text-white font-bold text-xs rounded-xl shadow-md shadow-blue-200 hover:brightness-110 transition disabled:opacity-50 uppercase tracking-wider"
          >
            <Download size={16} />
            <span>{isExporting ? "Exporting..." : "Download PDF"}</span>
          </button>
        </div>
      </div>

      {/* Printable Statement — plain LIC-style */}
      <div
        ref={reportRef}
        style={{ fontFamily: "Arial, Helvetica, sans-serif", color: BLACK }}
        className="bg-white px-6 py-6 border border-slate-300 shadow-xl max-w-6xl mx-auto text-[10px] leading-snug print:p-0 print:border-none print:shadow-none"
      >
        <div className="flex justify-between items-end pb-0.5 text-[11px] font-semibold">
          <span>
            Lapsed Policies Statement ({getReportHeaderTitle()}) as on {fmtDate(formData.reportDate) || fmtDate(new Date())}
          </span>
          <span>
            Lapsed since {fmtDate(formData.policiesLapsedSince)} · Revival interest upto {fmtDate(formData.revivalInterestCalculationDate)}
          </span>
        </div>

        {groupData.length === 0 ? (
          <div className="mt-6 py-16 text-center bg-slate-50 rounded-xl border border-slate-200 p-8 space-y-2">
            <h3 className="font-bold text-slate-800 text-sm">No Lapsed Policies Found</h3>
            <p className="text-xs text-slate-500">
              There are no lapsed policies in the database matching your selected criteria.
            </p>
          </div>
        ) : (
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="font-bold">
                {columns.map((col) => (
                  <th key={col.key} className={`px-1 py-1 ${alignClass(col.align)}`} style={thStyle}>
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {groupData.map((group) => (
                <Fragment key={group.groupCode}>
                  <tr>
                    <td colSpan={columns.length} className="pt-3 pb-1 text-center text-[13px] font-bold">
                      {group.groupCode}: {group.groupHeadName}
                    </td>
                  </tr>

                  {group.members.map((member: any) => (
                    <Fragment key={member.name}>
                      <tr>
                        <td colSpan={columns.length} className="pt-2 pb-0.5">
                          <div className="text-[11px] font-bold">{member.name}</div>
                          {(formData.reportOptions.address || formData.reportOptions.mobile || formData.reportOptions.email) && (
                            <div className="text-[10px]">
                              {[
                                formData.reportOptions.address && member.address && `Address : ${member.address}`,
                                formData.reportOptions.mobile && member.mobile && `Mobile : ${member.mobile}`,
                                formData.reportOptions.email && member.email && `Email : ${member.email}`,
                              ].filter(Boolean).join("   ")}
                            </div>
                          )}
                        </td>
                      </tr>

                      {member.policies.map((p: any) => (
                        <tr key={p.policyNo}>
                          {columns.map((col) => (
                            <td key={col.key} className={`px-1 py-0.5 whitespace-nowrap ${alignClass(col.align)}`}>
                              {col.render(p)}
                            </td>
                          ))}
                        </tr>
                      ))}

                      {/* Member total — label spans all but the last 3 financial columns */}
                      {member.policies.length > 1 && group.members.length > 1 && (
                        <tr className="font-bold">
                          <td colSpan={columns.length - 3} className="px-1 pt-1.5 pb-1 text-right pr-3">
                            Total :
                          </td>
                          <td className="px-1 pt-1.5 pb-1 text-right font-mono whitespace-nowrap">
                            <span style={totalValueStyle}>{member.totals.premiumDueForRevival.toFixed(2)}</span>
                          </td>
                          <td className="px-1 pt-1.5 pb-1 text-right font-mono whitespace-nowrap">
                            <span style={totalValueStyle}>{member.totals.revivalInterest.toFixed(2)}</span>
                          </td>
                          <td className="px-1 pt-1.5 pb-1 text-right font-mono whitespace-nowrap">
                            <span style={totalValueStyle}>{member.totals.totalRevivalAmount.toFixed(2)}</span>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}

                  {/* Group total */}
                  <tr className="font-bold">
                    <td colSpan={columns.length - 3} className="px-1 pt-1.5 pb-1">
                      <div className="flex justify-between">
                        <span>Total No. of Policies for this Group : {group.totalPolicies}</span>
                        <span className="pr-3">Group Total :</span>
                      </div>
                    </td>
                    <td className="px-1 pt-1.5 pb-1 text-right font-mono whitespace-nowrap">
                      <span style={totalValueStyle}>{group.totals.premiumDueForRevival.toFixed(2)}</span>
                    </td>
                    <td className="px-1 pt-1.5 pb-1 text-right font-mono whitespace-nowrap">
                      <span style={totalValueStyle}>{group.totals.revivalInterest.toFixed(2)}</span>
                    </td>
                    <td className="px-1 pt-1.5 pb-1 text-right font-mono whitespace-nowrap">
                      <span style={totalValueStyle}>{group.totals.totalRevivalAmount.toFixed(2)}</span>
                    </td>
                  </tr>
                  <tr>
                    <td colSpan={columns.length} style={{ borderBottom: `1px solid ${BLACK}`, height: 6 }}></td>
                  </tr>
                </Fragment>
              ))}
            </tbody>
          </table>
        )}

        {/* Grand summary */}
        {groupData.length > 0 && (
          <div className="pt-5 flex justify-end">
            <table className="w-full max-w-xl border-collapse text-[11px]">
              <thead>
                <tr className="font-bold">
                  <th className="px-1 py-1" style={thStyle}></th>
                  <th className="px-1 py-1 text-right" style={thStyle}>Premium Due for Revival</th>
                  <th className="px-1 py-1 text-right" style={thStyle}>Revival Interest</th>
                  <th className="px-1 py-1 text-right" style={thStyle}>Total Revival Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr className="font-bold">
                  <td className="px-1 pt-1.5 pb-1">Grand Total</td>
                  <td className="px-1 pt-1.5 pb-1 text-right font-mono">
                    <span style={totalValueStyle}>
                      {grandTotals.premiumDueForRevival.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                  </td>
                  <td className="px-1 pt-1.5 pb-1 text-right font-mono">
                    <span style={totalValueStyle}>
                      {grandTotals.revivalInterest.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                  </td>
                  <td className="px-1 pt-1.5 pb-1 text-right font-mono">
                    <span style={totalValueStyle}>
                      {grandTotals.totalRevivalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                  </td>
                </tr>
                <tr className="font-bold">
                  <td className="px-1 py-1">Total No. of Policies</td>
                  <td colSpan={3} className="px-1 py-1 text-right font-mono">{grandTotals.policies}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* Legend footer */}
        <div className="pt-5 mt-4 space-y-1 text-[9px]" style={{ borderTop: `1px solid ${BLACK}` }}>
          <div className="flex flex-wrap gap-x-5 gap-y-0.5">
            <span><strong>m :</strong> Policies with SSS Mode</span>
            <span><strong>M :</strong> Policies with Monthly Mode</span>
            <span><strong>Y :</strong> Policies with NACH Mode</span>
            <span><strong>S :</strong> Cheque dishonoured/ Debit fail</span>
            <span><strong>A :</strong> Policies with APPS Mode</span>
            <span><strong>ρ :</strong> Pan Card is register for the Policy</span>
          </div>
          <p>
            Revival interest is calculated at {(REVIVAL_INTEREST_RATE_PA * 100).toFixed(0)}% p.a. simple interest (placeholder — replace with your actual plan-wise revival rate table).
          </p>
          <div className="flex justify-between font-mono text-[8px] pt-1">
            <span>DSS000019899</span>
            <span>Generated via Lapsed Policies Engine</span>
          </div>
        </div>
      </div>
    </div>
  );
}