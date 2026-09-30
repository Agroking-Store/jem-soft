"use client";

import { useRef, useState, useMemo } from "react";
import { ArrowLeft, Download, FilterX } from "lucide-react";
import { PremiumCalendarFormData } from "./PremiumCalenderForm";
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
      const pdf = new jsPDF({ orientation: "p", unit: "mm", format: "a4", compress: true });
      const pageWidthMm = 210;
      const pageHeightMm = 297;
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
            Premium Calendar
          </span>
        </div>
        <button
          onClick={handleDownloadPDF}
          disabled={isExporting}
          className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-[#5c67ff] to-[#3a47ff] text-white font-bold text-xs rounded-xl shadow-md shadow-blue-200 hover:brightness-110 transition disabled:opacity-50 uppercase tracking-wider"
        >
          <Download size={16} />
          <span>{isExporting ? "Exporting..." : "Download PDF"}</span>
        </button>
      </div>

      {/* Printable Statement — plain LIC-style */}
      <div
        ref={reportRef}
        style={{ fontFamily: "Arial, Helvetica, sans-serif", color: BLACK }}
        className="bg-white px-6 py-6 border border-slate-300 shadow-xl max-w-6xl mx-auto text-[10px] leading-snug print:p-0 print:border-none print:shadow-none"
      >
        <div className="flex justify-between items-end pb-0.5 text-[11px] font-semibold">
          <span>
            Premium Calendar between {fmtDate(formData.dateFrom)} and {fmtDate(formData.dateTo)}
          </span>
          <span>As on {fmtDate(formData.reportDate) || fmtDate(new Date())}</span>
        </div>

        {groupData.length === 0 ? (
          <div className="mt-6 p-12 text-center border-2 border-dashed border-slate-300 rounded-2xl space-y-3 bg-slate-50">
            <div className="inline-flex p-3 bg-red-100 text-red-600 rounded-full">
              <FilterX size={32} />
            </div>
            <h3 className="text-base font-bold text-slate-800">No Policies Match Your Selected Filters</h3>
            <p className="text-xs text-slate-600 max-w-md mx-auto">
              No policies in the database had premium due dates within the selected range and filters. Try adjusting the date range, status filters, or groups.
            </p>
          </div>
        ) : (
          <div>
            {groupData.map((group: any) => (
              <div key={group.groupCode} className="pt-3">
                {/* Centered group heading */}
                <div className="text-center pb-1">
                  <div className="text-[13px] font-bold">
                    {group.groupCode}: {group.groupHeadName}
                  </div>
                  {(group.mobile || group.email) && (
                    <div>{[group.mobile && `Mobile : ${group.mobile}`, group.email && `Email : ${group.email}`].filter(Boolean).join("   ")}</div>
                  )}
                  {group.address && <div>Address : {group.address}</div>}
                </div>

                {group.monthList.map((month: any) => (
                  <table key={month.label} className="w-full border-collapse text-left mb-2">
                    <thead>
                      <tr>
                        <td colSpan={isType2 ? 11 : 9} className="pt-1 pb-0.5 text-center font-bold text-[11px] uppercase">
                          {month.label}
                        </td>
                      </tr>
                      <tr className="font-bold">
                        <th className="px-1 py-1 text-left" style={thStyle}>Name of<br />Policy Holder</th>
                        <th className="px-1 py-1 text-left" style={thStyle}>Due<br />Date</th>
                        <th className="px-1 py-1 text-left" style={thStyle}>Policy No</th>
                        <th className="px-1 py-1 text-left" style={thStyle}>Com<br />Date</th>
                        <th className="px-1 py-1 text-left" style={thStyle}>{isType2 ? "Pl/Tm/Pt Md" : "Md"}</th>
                        <th className="px-1 py-1 text-right" style={thStyle}>Sum</th>
                        <th className="px-1 py-1 text-right" style={thStyle}>Premium</th>
                        {!isType2 && <th className="px-1 py-1 text-right" style={thStyle}>Policy Holder<br />Total</th>}
                        {formData.includeLoanInterest && <th className="px-1 py-1 text-right" style={thStyle}>Loan<br />Interest</th>}
                        <th className="px-1 py-1 text-center" style={thStyle}>Brn</th>
                        {isType2 && (
                          <>
                            <th className="px-1 py-1 text-center" style={thStyle}>Tax<br />Ben</th>
                            <th className="px-1 py-1 text-center" style={thStyle}>Date of<br />Pay</th>
                            <th className="px-1 py-1 text-left" style={thStyle}>Details</th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {month.rows.map((row: any, i: number) => (
                        <tr key={i}>
                          <td className="px-1 py-0.5 font-semibold">{row.memberName}</td>
                          <td className="px-1 py-0.5 whitespace-nowrap">{fmtDate(row.dueDate, true)}</td>
                          <td className="px-1 py-0.5 font-mono whitespace-nowrap">{row.policyNo}</td>
                          <td className="px-1 py-0.5 whitespace-nowrap">{fmtDate(row.commDate, true)}</td>
                          <td className="px-1 py-0.5 whitespace-nowrap">{isType2 ? row.planTermPptMode : row.modeLabel}</td>
                          <td className="px-1 py-0.5 text-right whitespace-nowrap">{row.sum.toLocaleString("en-IN")}</td>
                          <td className="px-1 py-0.5 text-right whitespace-nowrap">{row.premium.toLocaleString("en-IN")}</td>
                          {!isType2 && (
                            <td className="px-1 py-0.5 text-right font-bold whitespace-nowrap">
                              {row.holderTotal !== undefined ? row.holderTotal.toLocaleString("en-IN") : ""}
                            </td>
                          )}
                          {formData.includeLoanInterest && (
                            <td className="px-1 py-0.5 text-right whitespace-nowrap">{row.loanInterest}</td>
                          )}
                          <td className="px-1 py-0.5 text-center">{row.brn}</td>
                          {isType2 && (
                            <>
                              <td className="px-1 py-0.5"></td>
                              <td className="px-1 py-0.5"></td>
                              <td className="px-1 py-0.5"></td>
                            </>
                          )}
                        </tr>
                      ))}
                      <tr className="font-bold">
                        <td colSpan={isType2 ? 6 : 7} className="px-1 pt-1.5 pb-1 text-right pr-3">
                          Month Total :
                        </td>
                        <td className="px-1 pt-1.5 pb-1 text-right font-mono whitespace-nowrap">
                          <span style={totalValueStyle}>{month.total.toLocaleString("en-IN")}</span>
                        </td>
                        {formData.includeLoanInterest && (
                          <td className="px-1 pt-1.5 pb-1 text-right font-mono whitespace-nowrap">
                            <span style={totalValueStyle}>{month.loanTotal.toLocaleString("en-IN")}</span>
                          </td>
                        )}
                        <td colSpan={isType2 ? 4 : 1}></td>
                      </tr>
                    </tbody>
                  </table>
                ))}
                <div style={{ borderBottom: `1px solid ${BLACK}` }} />
              </div>
            ))}
          </div>
        )}

        {/* Graph */}
        {formData.showGraph && groupData.length > 0 && (
          <div className="pt-5 overflow-x-auto">
            <h3 className="text-[11px] font-bold mb-2">Monthwise Premium Due</h3>
            <svg viewBox={`0 0 ${Math.max(500, monthKeys.length * 60 + 40)} 220`} className="w-full max-w-4xl h-auto">
              <line x1={10} y1={190} x2={Math.max(500, monthKeys.length * 60 + 40) - 10} y2={190} stroke="#000" strokeWidth={1} />
              {monthKeys.map((mk, i) => {
                const amt = monthlyTotals[mk] || 0;
                const barHeight = Math.max(2, (amt / maxMonthAmount) * 150);
                const x = 20 + i * 60;
                const label = mk.split(" ")[0].slice(0, 3);
                const formattedValue = amt >= 100000 ? `${(amt / 100000).toFixed(1)}L` : `${Math.round(amt / 1000)}k`;
                return (
                  <g key={mk}>
                    <rect x={x} y={190 - barHeight} width={34} height={barHeight} fill="#4b5563" />
                    <text x={x + 17} y={205} textAnchor="middle" fontSize="8" fill="#000" fontWeight="600">
                      {label}
                    </text>
                    {amt > 0 && (
                      <text x={x + 17} y={183 - barHeight} textAnchor="middle" fontSize="7" fill="#000" fontWeight="bold">
                        {formattedValue}
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>
        )}

        {/* Premium Summary (statement with PAN) */}
        {formData.printOptions.statementWithPan && summaryRows.length > 0 && (
          <div className="pt-5">
            <div className="text-[11px] font-bold pb-0.5">Premium Summary</div>
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="font-bold">
                  <th className="px-1 py-1" style={thStyle}>Name</th>
                  <th className="px-1 py-1" style={thStyle}>PAN No.</th>
                  <th className="px-1 py-1" style={thStyle}>Date of Birth</th>
                  <th className="px-1 py-1 text-right" style={thStyle}>Account Premium</th>
                </tr>
              </thead>
              <tbody>
                {summaryRows.map((s: any, i: number) => (
                  <tr key={i}>
                    <td className="px-1 py-0.5 font-semibold">{s.name}</td>
                    <td className="px-1 py-0.5 font-mono">{s.pan || "-"}</td>
                    <td className="px-1 py-0.5">{fmtDate(s.dob) || "-"}</td>
                    <td className="px-1 py-0.5 text-right font-mono">{s.totalPremium.toLocaleString("en-IN")}</td>
                  </tr>
                ))}
                <tr className="font-bold">
                  <td colSpan={3} className="px-1 pt-1.5 pb-1">Total :</td>
                  <td className="px-1 pt-1.5 pb-1 text-right font-mono">
                    <span style={totalValueStyle}>{grandTotal.toLocaleString("en-IN")}</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* Mailing Labels */}
        {formData.printOptions.mailingLabels && groupData.length > 0 && (
          <div className="pt-5 print:break-before-page">
            <div className="text-[11px] font-bold pb-1" style={{ borderBottom: `1px solid ${BLACK}` }}>Mailing Labels</div>
            <div className="grid grid-cols-2 gap-3 pt-2">
              {groupData.map((group: any) => (
                <div key={group.groupCode} className="p-2 text-[11px] space-y-0.5" style={{ border: `1px solid ${BLACK}` }}>
                  <p className="font-bold">{group.groupHeadName}</p>
                  <p>{group.address || "Address not on file"}</p>
                  {group.mobile && <p className="font-mono">{group.mobile}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Despatch List */}
        {formData.printOptions.despatchList && groupData.length > 0 && (
          <div className="pt-5 print:break-before-page">
            <div className="text-[11px] font-bold pb-0.5">Despatch List</div>
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="font-bold">
                  <th className="px-1 py-1 w-10" style={thStyle}>Sr.</th>
                  <th className="px-1 py-1" style={thStyle}>Policy Holder / Group</th>
                  <th className="px-1 py-1" style={thStyle}>Address</th>
                  <th className="px-1 py-1" style={thStyle}>Purpose</th>
                  <th className="px-1 py-1 text-right" style={thStyle}>Cost</th>
                </tr>
              </thead>
              <tbody>
                {groupData.map((group: any, i: number) => (
                  <tr key={group.groupCode}>
                    <td className="px-1 py-0.5">{i + 1}</td>
                    <td className="px-1 py-0.5 font-semibold">{group.groupHeadName}</td>
                    <td className="px-1 py-0.5">{group.address || "-"}</td>
                    <td className="px-1 py-0.5">{formData.purpose || "-"}</td>
                    <td className="px-1 py-0.5 text-right font-mono">{formData.costPerDespatch || "0"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ borderBottom: `1px solid ${BLACK}` }} />
          </div>
        )}

        {/* Footer */}
        <div className="pt-4 mt-4 space-y-1 text-[9px]" style={{ borderTop: `1px solid ${BLACK}` }}>
          <p>
            Y : Policies with {formData.paymentTypes.nach ? "NACH" : "ECS"} mode &nbsp; S : Cheque dishonoured/ Debit fail &nbsp; A : Policies with APPS mode &nbsp; ρ : PAN Card registered for the Policy
          </p>
          <p>All total payable premiums quoted above are inclusive of GST on applicable plans.</p>
          <div className="flex justify-between font-mono text-[8px] pt-1">
            <span>Generated via Premium Calendar Engine</span>
            <span>Report Date: {fmtDate(formData.reportDate)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}