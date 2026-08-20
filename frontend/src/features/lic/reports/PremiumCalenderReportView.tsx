"use client";

import { useRef, useState, useMemo } from "react";
import { ArrowLeft, Download, FilterX } from "lucide-react";
import { PremiumCalendarFormData } from "./PremiumCalendarForm";
import html2canvas from "html2canvas-pro";
import jsPDF from "jspdf";
import toast from "react-hot-toast";

interface PremiumCalendarReportViewProps {
  formData: PremiumCalendarFormData;
  policies: any[];
  customers: any[];
  onBackToForm: () => void;
}

// Loan interest placeholder rate — same caveat as other reports: replace with your real rate table.
const LOAN_INTEREST_RATE = 0.1; // 10% p.a. approx, only applied when a loan amount exists

function fmtDate(d: Date | string | null | undefined, withYear2 = false) {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  if (isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: withYear2 ? "2-digit" : "numeric",
  });
}

function getMemberName(policy: any): string {
  if (policy.lifeAssured) {
    const la = policy.lifeAssured;
    if (typeof la === "string") return la;
    const sal = la.salutation ? `${la.salutation} ` : "";
    const full = [la.firstName, la.middleName, la.lastName].filter(Boolean).join(" ");
    if (full.trim()) return `${sal}${full.trim()}`;
    if (la.name) return la.name;
  }
  if (policy.CustomerMaster) {
    const cm = policy.CustomerMaster;
    const sal = cm.salutation ? `${cm.salutation} ` : "";
    const full = [cm.firstName, cm.middleName, cm.lastName].filter(Boolean).join(" ");
    if (full.trim()) return `${sal}${full.trim()}`;
    if (cm.name) return cm.name;
  }
  if (policy.lifeAssuredName) return policy.lifeAssuredName;
  if (policy.customer?.name) return policy.customer.name;
  return "Policy Holder";
}

function getMemberDOB(policy: any) {
  return policy.CustomerMaster?.dob || policy.lifeAssured?.dob || policy.dob || null;
}

function getMemberPAN(policy: any) {
  return (
    policy.CustomerMaster?.panNumber ||
    policy.lifeAssured?.panNumber ||
    policy.customer?.panNumber ||
    policy.panNumber ||
    ""
  );
}

function getMemberMobile(policy: any) {
  return (
    policy.lifeAssured?.mobile ||
    policy.CustomerMaster?.contactInfo?.mobile1 ||
    policy.customer?.mobile ||
    policy.customer?.mobile1 ||
    ""
  );
}

function getMemberAddress(policy: any) {
  return policy.customer?.address || policy.CustomerMaster?.address || "";
}

function modeAbbrev(modeName: string) {
  const m = (modeName || "").toLowerCase();
  if (m.includes("month")) return "Mly.";
  if (m.includes("quarter")) return "Qly.";
  if (m.includes("half") || m.includes("semi")) return "Hly.";
  if (m.includes("single")) return "SP";
  return "Yly.";
}

function modeFreqPerYear(modeName: string) {
  const m = (modeName || "").toLowerCase();
  if (m.includes("month")) return 12;
  if (m.includes("quarter")) return 4;
  if (m.includes("half") || m.includes("semi")) return 2;
  return 1;
}

function addMonths(date: Date, months: number) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

// Generate every premium due-date occurrence (anniversary of commencement date, stepped
// by the mode frequency) that falls within [fromDate, toDate].
function generateDueDates(commDate: Date, stepMonths: number, fromDate: Date, toDate: Date) {
  const dates: Date[] = [];
  let d = new Date(commDate);
  let guard = 0;
  while (d < fromDate && guard < 2000) {
    d = addMonths(d, stepMonths);
    guard++;
  }
  guard = 0;
  while (d <= toDate && guard < 2000) {
    dates.push(new Date(d));
    d = addMonths(d, stepMonths);
    guard++;
  }
  return dates;
}

export default function PremiumCalendarReportView({
  formData,
  policies: rawPolicies = [],
  onBackToForm,
}: PremiumCalendarReportViewProps) {
  const reportRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const isType2 = formData.reportType === "type2";

  const { groupData, summaryRows, monthKeys, monthlyTotals, grandTotal } = useMemo(() => {
    const fromDate = formData.dateFrom ? new Date(formData.dateFrom) : null;
    const toDate = formData.dateTo ? new Date(formData.dateTo) : null;
    if (fromDate) fromDate.setHours(0, 0, 0, 0);
    if (toDate) toDate.setHours(23, 59, 59, 999);

    if (!fromDate || !toDate) {
      return { groupData: [], summaryRows: [], monthKeys: [], monthlyTotals: {}, grandTotal: 0 };
    }

    const selectedStatuses = (formData.appliedFilters || [])
      .filter((f) => f.type === "Policy Status")
      .map((f) => f.name.toLowerCase().replace(/[- ]/g, ""));

    const selectedGroupCodes = (formData.selectedGroups || []).map((g) =>
      g.groupCode.toLowerCase()
    );

    const { nach, other } = formData.paymentTypes;
    const paymentFilterActive = (nach || other) && !(nach && other);

    // Build ordered month buckets ("January 2026", "February 2026", ...) spanning the range
    const monthBuckets: string[] = [];
    let cursor = new Date(fromDate.getFullYear(), fromDate.getMonth(), 1);
    const endCursor = new Date(toDate.getFullYear(), toDate.getMonth(), 1);
    while (cursor <= endCursor) {
      monthBuckets.push(
        cursor.toLocaleDateString("en-GB", { month: "long", year: "numeric" })
      );
      cursor = addMonths(cursor, 1);
    }

    const usable = rawPolicies.filter((p) => {
      const rawStatus = (p.status?.statusName || p.statusName || "Inforce")
        .toLowerCase()
        .replace(/[- ]/g, "");
      if (selectedStatuses.length > 0 && !selectedStatuses.some((st) => rawStatus.includes(st) || st.includes(rawStatus)))
        return false;

      if (selectedGroupCodes.length > 0) {
        const gCode = (p.customer?.groupCode || "").toLowerCase();
        if (!selectedGroupCodes.includes(gCode)) return false;
      }

      if (paymentFilterActive) {
        const raw = (p.premiumMode?.paymentMode || p.paymentType || p.premiumMode?.modeName || "").toLowerCase();
        const isNach = Boolean(p.isNach) || raw.includes("nach") || raw.includes("ecs");
        if (nach && !isNach) return false;
        if (other && isNach) return false;
      }

      if (!p.commencementDate) return false;
      const cd = new Date(p.commencementDate);
      if (isNaN(cd.getTime())) return false;

      return true;
    });

    const groupMap: { [key: string]: any } = {};
    const summaryMap: { [key: string]: any } = {};
    const monthTotalsAcc: { [key: string]: number } = {};
    monthBuckets.forEach((mb) => (monthTotalsAcc[mb] = 0));
    let grand = 0;

    usable.forEach((p, idx) => {
      const commDate = new Date(p.commencementDate);
      const modeName = p.premiumMode?.modeName || "Yearly";
      const stepMonths = 12 / modeFreqPerYear(modeName);
      const installmentPremium = Number(
        p.premium?.installmentPremium || p.premium?.totalInstallmentPremium || 0
      );
      const sumAssured = Number(p.premium?.sumAssured || 0);
      const loanAmount = Number(p.loanAmount || p.loanDetails?.amount || 0);
      const loanInterestPerDue =
        formData.includeLoanInterest && loanAmount > 0
          ? Math.round((loanAmount * LOAN_INTEREST_RATE) / modeFreqPerYear(modeName))
          : 0;
      const brn = p.branchNo || p.branch?.branchCode || "-";
      const planNo = p.product?.planNumber || "-";
      const term = p.policyTerm || "-";
      const ppt = p.premiumPayingTerm || "-";

      const dueDates = generateDueDates(commDate, stepMonths, fromDate, toDate);
      if (dueDates.length === 0) return;

      const memberName = getMemberName(p);
      const gCode = p.customer?.groupCode || `A-${(p.clientId || String(idx + 1)).toString().padStart(3, "0")}`;
      const gHeadName = p.customer?.groupName || p.customer?.name || memberName;

      if (!groupMap[gCode]) {
        groupMap[gCode] = {
          groupCode: gCode,
          groupHeadName: gHeadName,
          address: getMemberAddress(p),
          mobile: getMemberMobile(p),
          email: p.customer?.email || "",
          months: {}, // monthLabel -> rows[]
        };
      }
      const grp = groupMap[gCode];

      const summaryKey = `${gCode}::${memberName}`;
      if (!summaryMap[summaryKey]) {
        summaryMap[summaryKey] = {
          name: memberName,
          pan: getMemberPAN(p),
          dob: getMemberDOB(p),
          totalPremium: 0,
        };
      }

      dueDates.forEach((due) => {
        const monthLabel = due.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
        if (!grp.months[monthLabel]) grp.months[monthLabel] = [];
        grp.months[monthLabel].push({
          dueDate: due,
          memberName,
          policyNo: p.policyNumber || "-",
          commDate,
          modeLabel: modeAbbrev(modeName),
          planTermPptMode: `${planNo}/${term}/${ppt}${modeAbbrev(modeName)}`,
          sum: sumAssured,
          premium: installmentPremium,
          loanInterest: loanInterestPerDue,
          brn,
        });

        summaryMap[summaryKey].totalPremium += installmentPremium;
        monthTotalsAcc[monthLabel] = (monthTotalsAcc[monthLabel] || 0) + installmentPremium;
        grand += installmentPremium;
      });
    });

    // Sort rows within each month by due date, and merge consecutive same-holder
    // rows into a "Policy Holder Total" on the last row of that holder (Type 1 style).
    Object.values(groupMap).forEach((grp: any) => {
      Object.keys(grp.months).forEach((monthLabel) => {
        const rows = grp.months[monthLabel].sort(
          (a: any, b: any) => a.dueDate.getTime() - b.dueDate.getTime()
        );
        for (let i = 0; i < rows.length; i++) {
          const isLastOfHolder =
            i === rows.length - 1 || rows[i + 1].memberName !== rows[i].memberName;
          if (isLastOfHolder) {
            let start = i;
            while (start > 0 && rows[start - 1].memberName === rows[i].memberName) start--;
            const holderTotal = rows
              .slice(start, i + 1)
              .reduce((s: number, r: any) => s + r.premium, 0);
            rows[i].holderTotal = holderTotal;
          }
        }
        grp.months[monthLabel] = rows;
      });
    });

    const finalGroups = Object.values(groupMap).map((grp: any) => ({
      ...grp,
      monthList: monthBuckets
        .filter((mb) => grp.months[mb] && grp.months[mb].length > 0)
        .map((mb) => ({
          label: mb,
          rows: grp.months[mb],
          total: grp.months[mb].reduce((s: number, r: any) => s + r.premium, 0),
          loanTotal: grp.months[mb].reduce((s: number, r: any) => s + r.loanInterest, 0),
        })),
    }));

    return {
      groupData: finalGroups,
      summaryRows: Object.values(summaryMap),
      monthKeys: monthBuckets,
      monthlyTotals: monthTotalsAcc,
      grandTotal: grand,
    };
  }, [rawPolicies, formData]);

  const handleDownloadPDF = async () => {
    if (!reportRef.current) return;
    setIsExporting(true);
    const toastId = toast.loading("Generating PDF report...");
    try {
      const canvas = await html2canvas(reportRef.current, {
        scale: 2, useCORS: true, allowTaint: true, backgroundColor: "#ffffff", logging: false,
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
      pdf.save(`Premium_Calendar_${formData.reportDate || "Report"}.pdf`);
      toast.success("PDF downloaded successfully!", { id: toastId });
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Failed to generate PDF.", { id: toastId });
    } finally {
      setIsExporting(false);
    }
  };

  const maxMonthAmount = Math.max(1, ...Object.values(monthlyTotals) as number[]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-[#0B1220] p-4 rounded-2xl border border-slate-800 shadow-xl print:hidden">
        <button
          onClick={onBackToForm}
          className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-slate-300 bg-white/10 rounded-xl hover:bg-white/20 transition uppercase tracking-wider"
        >
          <ArrowLeft size={16} />
          <span>Edit Filters</span>
        </button>
        <button
          onClick={handleDownloadPDF}
          disabled={isExporting}
          className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-[#B8873A] to-[#D9AE63] text-[#0B1220] font-bold text-xs rounded-xl shadow-lg hover:brightness-105 transition disabled:opacity-50 uppercase tracking-wider"
        >
          <Download size={16} />
          <span>{isExporting ? "Exporting..." : "Download PDF"}</span>
        </button>
      </div>

      <div
        ref={reportRef}
        className="bg-white p-8 rounded-2xl border border-slate-300 shadow-xl text-slate-900 font-sans max-w-6xl mx-auto space-y-4 print:p-0 print:border-none print:shadow-none"
      >
        {/* Letterhead */}
        <div className="flex justify-between items-start border-b-2 border-[#0B1220] pb-3">
          <div className="space-y-0.5">
            <h1 className="text-2xl font-bold text-[#0B1220] tracking-tight">Jayant Mahabole</h1>
            <p className="text-xs font-semibold text-slate-700">MBA in Insurance & Finance</p>
            <p className="text-[11px] text-slate-600 max-w-xs leading-tight">84/2, Darpan Bldg., 201 Sarang Society, Sahakarnagar No. 2 Parvati Pune 411009</p>
            <p className="text-[11px] text-slate-600 font-mono">9822452896</p>
            <p className="text-[11px] text-slate-600">office@jayantmahbole.com</p>
          </div>
          <div className="h-16 w-36 bg-[#0B1220] rounded-bl-3xl p-3 flex flex-col justify-end text-right">
            <span className="text-[10px] font-serif font-bold text-[#E8C77A] uppercase tracking-widest">LIC INDIA</span>
          </div>
        </div>

        {/* Title */}
        <div className="bg-[#0B1220] text-white rounded-lg px-4 py-2.5 flex items-center justify-between border-l-4 border-[#B8873A]">
          <h2 className="text-base font-serif font-bold text-[#E8C77A] uppercase tracking-wider">Premium Calendar</h2>
          <span className="text-xs font-bold text-slate-200">{fmtDate(new Date())}</span>
        </div>

        <div className="text-[11px] font-semibold text-slate-800 px-1">
          Premium Calendar between {fmtDate(formData.dateFrom)} and {fmtDate(formData.dateTo)}
        </div>

        {groupData.length === 0 ? (
          <div className="p-12 text-center border-2 border-dashed border-slate-300 rounded-2xl space-y-3 bg-slate-50">
            <div className="inline-flex p-3 bg-red-100 text-red-600 rounded-full">
              <FilterX size={32} />
            </div>
            <h3 className="text-base font-bold text-slate-800">No Policies Match Your Selected Filters</h3>
            <p className="text-xs text-slate-600 max-w-md mx-auto">
              No policies in the database had premium due dates within the selected range and filters. Try adjusting the date range, status filters, or groups.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {groupData.map((group: any) => (
              <div key={group.groupCode} className="space-y-2 rounded-xl border border-slate-300 p-4 bg-white shadow-xs">
                <div className="text-center">
                  <h3 className="text-sm font-bold text-slate-900">
                    {group.groupHeadName} [ {group.groupCode} ]
                  </h3>
                  <p className="text-[10px] text-slate-500">
                    {group.address}
                    {group.address && (group.mobile || group.email) ? " — " : ""}
                    {[group.mobile, group.email].filter(Boolean).join(" / ")}
                  </p>
                </div>

                {group.monthList.map((month: any) => (
                  <div key={month.label} className="space-y-1">
                    <table className="w-full text-left text-[10.5px] border-collapse">
                      <thead>
                        <tr>
                          <td colSpan={isType2 ? 11 : 9} className="text-center font-bold text-slate-800 py-1 uppercase tracking-wider bg-slate-50">
                            {month.label}
                          </td>
                        </tr>
                        <tr className="border-y border-slate-300 font-bold text-slate-700 uppercase text-[9.5px]">
                          <th className="py-1 px-1 text-left">Name of Policy Holder</th>
                          <th className="py-1 px-1 text-left">Due Date</th>
                          <th className="py-1 px-1 text-left">Policy No</th>
                          <th className="py-1 px-1 text-left">Com Date</th>
                          <th className="py-1 px-1 text-left">{isType2 ? "Pl/Tm/Pt Md" : "Md"}</th>
                          <th className="py-1 px-1 text-right">Sum</th>
                          <th className="py-1 px-1 text-right">Premium</th>
                          {!isType2 && <th className="py-1 px-1 text-right">Policy Holder Total</th>}
                          {formData.includeLoanInterest && <th className="py-1 px-1 text-right">Loan Interest</th>}
                          <th className="py-1 px-1 text-center">Brn</th>
                          {isType2 && (
                            <>
                              <th className="py-1 px-1 text-center">Tax Ben</th>
                              <th className="py-1 px-1 text-center">Date of Pay</th>
                              <th className="py-1 px-1 text-left">Details</th>
                            </>
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {month.rows.map((row: any, i: number) => (
                          <tr key={i}>
                            <td className="py-1 px-1 font-semibold text-slate-800">{row.memberName}</td>
                            <td className="py-1 px-1 font-mono">{fmtDate(row.dueDate, true)}</td>
                            <td className="py-1 px-1 font-mono">{row.policyNo}</td>
                            <td className="py-1 px-1 font-mono">{fmtDate(row.commDate, true)}</td>
                            <td className="py-1 px-1 font-mono">{isType2 ? row.planTermPptMode : row.modeLabel}</td>
                            <td className="py-1 px-1 text-right font-mono">{row.sum.toLocaleString("en-IN")}</td>
                            <td className="py-1 px-1 text-right font-mono">{row.premium.toLocaleString("en-IN")}</td>
                            {!isType2 && (
                              <td className="py-1 px-1 text-right font-mono font-bold">
                                {row.holderTotal !== undefined ? row.holderTotal.toLocaleString("en-IN") : ""}
                              </td>
                            )}
                            {formData.includeLoanInterest && (
                              <td className="py-1 px-1 text-right font-mono">{row.loanInterest}</td>
                            )}
                            <td className="py-1 px-1 text-center font-mono">{row.brn}</td>
                            {isType2 && (
                              <>
                                <td className="py-1 px-1 text-center"></td>
                                <td className="py-1 px-1 text-center"></td>
                                <td className="py-1 px-1"></td>
                              </>
                            )}
                          </tr>
                        ))}
                        <tr className="border-t-2 border-slate-700 font-bold">
                          <td colSpan={isType2 ? 6 : 7} className="text-right py-1 px-1 text-slate-700 uppercase tracking-wider text-[9.5px]">
                            Month Total
                          </td>
                          <td className="text-right py-1 px-1 font-mono text-[#0B1220]">
                            {isType2 ? month.total.toLocaleString("en-IN") : month.total.toLocaleString("en-IN")}
                          </td>
                          {formData.includeLoanInterest && (
                            <td className="text-right py-1 px-1 font-mono text-[#0B1220]">
                              {month.loanTotal.toLocaleString("en-IN")}
                            </td>
                          )}
                          <td colSpan={isType2 ? 4 : 1}></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        {/* Show Graph */}
        {formData.showGraph && groupData.length > 0 && (
          <div className="pt-4 overflow-x-auto">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Monthwise Premium Due</h3>
            <svg viewBox={`0 0 ${Math.max(500, monthKeys.length * 60 + 40)} 220`} className="w-full max-w-4xl h-auto">
              {monthKeys.map((mk, i) => {
                const amt = monthlyTotals[mk] || 0;
                const barHeight = Math.max(2, (amt / maxMonthAmount) * 150);
                const x = 20 + i * 60;
                const label = mk.split(" ")[0].slice(0, 3);
                const formattedValue = amt >= 100000 ? `${(amt / 100000).toFixed(1)}L` : `${Math.round(amt / 1000)}k`;
                return (
                  <g key={mk}>
                    <rect x={x} y={190 - barHeight} width={34} height={barHeight} fill="#B8873A" rx={2} />
                    <text x={x + 17} y={205} textAnchor="middle" fontSize="8" fill="#334155" fontWeight="600">
                      {label}
                    </text>
                    {amt > 0 && (
                      <text x={x + 17} y={183 - barHeight} textAnchor="middle" fontSize="7" fill="#0B1220" fontWeight="bold">
                        {formattedValue}
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>
        )}

        {/* Statement with PAN — Premium Summary */}
        {formData.printOptions.statementWithPan && summaryRows.length > 0 && (
          <div className="pt-4 space-y-2">
            <div className="bg-[#0B1220] text-white px-4 py-2 rounded-lg border-l-4 border-[#B8873A]">
              <h3 className="text-xs font-bold text-[#E8C77A] uppercase tracking-wider">Premium Summary</h3>
            </div>
            <table className="w-full text-left text-[11px] border-collapse">
              <thead>
                <tr className="bg-slate-100 border-y-2 border-slate-800 font-bold text-slate-900">
                  <th className="py-1.5 px-2">Name</th>
                  <th className="py-1.5 px-2">PAN No.</th>
                  <th className="py-1.5 px-2">Date of Birth</th>
                  <th className="py-1.5 px-2 text-right">Account Premium</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {summaryRows.map((s: any, i: number) => (
                  <tr key={i}>
                    <td className="py-1 px-2 font-semibold">{s.name}</td>
                    <td className="py-1 px-2 font-mono">{s.pan || "-"}</td>
                    <td className="py-1 px-2 font-mono">{fmtDate(s.dob) || "-"}</td>
                    <td className="py-1 px-2 text-right font-mono">{s.totalPremium.toLocaleString("en-IN")}</td>
                  </tr>
                ))}
                <tr className="bg-slate-100 border-t-2 border-slate-700 font-bold">
                  <td colSpan={3} className="py-1.5 px-2">Total</td>
                  <td className="py-1.5 px-2 text-right font-mono">{grandTotal.toLocaleString("en-IN")}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* Mailing Labels */}
        {formData.printOptions.mailingLabels && groupData.length > 0 && (
          <div className="pt-4 space-y-2 print:break-before-page">
            <div className="bg-[#0B1220] text-white px-4 py-2 rounded-lg border-l-4 border-[#B8873A]">
              <h3 className="text-xs font-bold text-[#E8C77A] uppercase tracking-wider">Mailing Labels</h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {groupData.map((group: any) => (
                <div key={group.groupCode} className="border border-slate-300 rounded-lg p-3 text-[11px] space-y-0.5">
                  <p className="font-bold text-slate-900">{group.groupHeadName}</p>
                  <p className="text-slate-600">{group.address || "Address not on file"}</p>
                  {group.mobile && <p className="text-slate-600 font-mono">{group.mobile}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Despatch List */}
        {formData.printOptions.despatchList && groupData.length > 0 && (
          <div className="pt-4 space-y-2 print:break-before-page">
            <div className="bg-[#0B1220] text-white px-4 py-2 rounded-lg border-l-4 border-[#B8873A]">
              <h3 className="text-xs font-bold text-[#E8C77A] uppercase tracking-wider">Despatch List</h3>
            </div>
            <table className="w-full text-left text-[11px] border-collapse">
              <thead>
                <tr className="bg-slate-100 border-y-2 border-slate-800 font-bold text-slate-900">
                  <th className="py-1.5 px-2 w-10">Sr.</th>
                  <th className="py-1.5 px-2">Policy Holder / Group</th>
                  <th className="py-1.5 px-2">Address</th>
                  <th className="py-1.5 px-2">Purpose</th>
                  <th className="py-1.5 px-2 text-right">Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {groupData.map((group: any, i: number) => (
                  <tr key={group.groupCode}>
                    <td className="py-1 px-2 font-mono">{i + 1}</td>
                    <td className="py-1 px-2 font-semibold">{group.groupHeadName}</td>
                    <td className="py-1 px-2">{group.address || "-"}</td>
                    <td className="py-1 px-2">{formData.purpose || "-"}</td>
                    <td className="py-1 px-2 text-right font-mono">{formData.costPerDespatch || "0"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="pt-6 border-t border-slate-300 space-y-1 text-[10px] text-slate-700 font-medium">
          <p>
            Y : Policies with {formData.paymentTypes.nach ? "NACH" : "ECS"} mode &nbsp; S : Cheque dishonoured/ Debit fail &nbsp; A : Policies with APPS mode &nbsp; ρ : PAN Card registered for the Policy
          </p>
          <p>All total payable premiums quoted above are inclusive of GST on applicable plans.</p>
          <div className="flex justify-between items-center pt-2 font-mono text-[9px] text-slate-500 border-t border-slate-200">
            <span>Generated via Premium Calendar Engine</span>
            <span>Report Date: {fmtDate(formData.reportDate)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}