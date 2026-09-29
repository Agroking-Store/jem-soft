"use client";

import { useRef, useState, useMemo, Fragment, ReactNode } from "react";
import { ArrowLeft, Download } from "lucide-react";
import { LastPremiumStatementFormData } from "./LastPremiumStatementForm";
import html2canvas from "html2canvas-pro";
import jsPDF from "jspdf";
import toast from "react-hot-toast";

interface LastPremiumStatementReportViewProps {
  formData: LastPremiumStatementFormData;
  policies: any[];
  customers: any[];
  onBackToForm: () => void;
}

// Loyalty Addition / F.A.B. rate placeholders — same convention as the Policy
// Maturity report. Replace with your declared bonus rate table for accurate figures.
const LOYALTY_ADDITION_RATE_PER_1000_PA = 45;
const FAB_RATE_PER_1000 = 15;

function fmtDate(d: Date | string | null | undefined) {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  if (isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-GB");
}

// LIC premium modes repeat on a fixed interval — used to derive a "last premium
// paid" date from the next-due date when the DB doesn't store the receipt date
// directly. Replace with a real premium-receipt field when available.
const MODE_INTERVAL_MONTHS: Record<string, number> = {
  Y: 12,
  H: 6,
  Q: 3,
  M: 1,
  S: 0,
};

function getModeCode(p: any): string {
  const raw = (p.premiumMode?.modeName || p.mode || "Y").toString();
  const first = raw[0]?.toUpperCase() || "Y";
  return ["Y", "H", "Q", "M", "S"].includes(first) ? first : "Y";
}

function getLastPremiumDate(p: any): Date | null {
  if (p.lastPremiumPaidDate) {
    const d = new Date(p.lastPremiumPaidDate);
    if (!isNaN(d.getTime())) return d;
  }
  if (p.nextPremiumDueDate) {
    const due = new Date(p.nextPremiumDueDate);
    if (!isNaN(due.getTime())) {
      const modeCode = getModeCode(p);
      const months = MODE_INTERVAL_MONTHS[modeCode] ?? 12;
      const last = new Date(due);
      last.setMonth(last.getMonth() - months);
      return last;
    }
  }
  return null;
}

interface ColumnDef {
  key: string;
  label: string;
  align?: "left" | "right" | "center";
  render: (p: any) => ReactNode;
}

// Index of the "Last Premium Amt" column — totals are printed under it
const LAST_PREMIUM_AMT_IDX = 7;
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

export default function LastPremiumStatementReportView({
  formData,
  policies: rawPolicies = [],
  onBackToForm,
}: LastPremiumStatementReportViewProps) {
  const reportRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  const columns: ColumnDef[] = useMemo(() => {
    const cols: ColumnDef[] = [
      { key: "policyNo", label: "Policy No", align: "right", render: (p) => p.policyNo },
      { key: "agCd", label: "Ag Cd", align: "center", render: (p) => p.agCd },
      { key: "comDate", label: "Comm. Date", render: (p) => p.comDate },
      { key: "planTermPpt", label: "Pl/Tm/Pt", render: (p) => p.planTermPpt },
      { key: "md", label: "Md", align: "center", render: (p) => p.md },
      { key: "brn", label: "Brn", render: (p) => p.brn },
      { key: "lastPremiumDate", label: "Last Premium Date", render: (p) => p.lastPremiumDate },
      { key: "lastPremiumAmount", label: "Last Premium Amt", align: "right", render: (p) => p.lastPremiumAmount.toLocaleString("en-IN") },
      { key: "nextDueDate", label: "Next Due Date", render: (p) => p.nextDueDate },
    ];
    if (formData.calculationOptions.loyaltyAddition) {
      cols.push({ key: "loyaltyAddition", label: "Loyalty Addn.", align: "right", render: (p) => p.loyaltyAddition.toLocaleString("en-IN") });
    }
    if (formData.calculationOptions.fab) {
      cols.push({ key: "fab", label: "F.A.B", align: "right", render: (p) => p.fab.toLocaleString("en-IN") });
    }
    return cols;
  }, [formData.calculationOptions.loyaltyAddition, formData.calculationOptions.fab]);

  const alignClass = (a?: "left" | "right" | "center") =>
    a === "right" ? "text-right" : a === "center" ? "text-center" : "text-left";

  const groupData = useMemo(() => {
    const fromDate = formData.fromDate ? new Date(formData.fromDate) : null;
    const toDate = formData.toDate ? new Date(formData.toDate) : null;
    if (fromDate) fromDate.setHours(0, 0, 0, 0);
    if (toDate) toDate.setHours(23, 59, 59, 999);

    const selectedGroupCodesOrNames =
      formData.sortingOption === "groupsWise"
        ? (formData.selectedGroups || []).map((g) => g.groupCode.toLowerCase())
        : (formData.sortingFilterSelection?.selectedItems || []).map((item) => (item.code || item.name).toLowerCase());

    const { nonMonthly, monthly } = formData.modeToInclude;
    const modeFilterActive = nonMonthly || monthly;

    const buildRow = (p: any, lastPremiumDate: Date) => {
      const custMaster = p.CustomerMaster;
      const custObj = p.customer;
      const modeCode = getModeCode(p);
      const modeLabel = modeCode === "M" ? "M" : modeCode;
      const sumAssured = Number(p.premium?.sumAssured || p.sumAssured || 0);
      const comDate = p.commencementDate ? new Date(p.commencementDate) : new Date();
      const completedYears = Math.max(
        1,
        Math.floor((lastPremiumDate.getTime() - comDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000))
      );
      const loyaltyAddition = Math.round((sumAssured / 1000) * LOYALTY_ADDITION_RATE_PER_1000_PA * completedYears);
      const fab = Math.round((sumAssured / 1000) * FAB_RATE_PER_1000);
      const lastPremiumAmount = Number(
        p.premium?.installmentPremium || p.premium?.totalInstallmentPremium || p.premiumAmount || 0
      );

      return {
        policyNo: p.policyNumber || "—",
        agCd: p.agentCode || "—",
        comDate: fmtDate(comDate) || "—",
        planTermPpt: `${p.product?.planNumber || "—"}/${p.policyTerm || "—"}/${p.premiumPayingTerm || "—"}`,
        md: modeLabel,
        brn: p.branch?.branchCode || p.branchNo || "—",
        lastPremiumDate: fmtDate(lastPremiumDate),
        lastPremiumAmount,
        nextDueDate: fmtDate(p.nextPremiumDueDate) || "—",
        loyaltyAddition,
        fab,
        _modeCode: modeCode,
      };
    };

    const validDbPolicies = rawPolicies.filter((p) => {
      const lastPremiumDate = getLastPremiumDate(p);
      if (!lastPremiumDate) return false;
      if (fromDate && lastPremiumDate < fromDate) return false;
      if (toDate && lastPremiumDate > toDate) return false;

      if (modeFilterActive) {
        const modeCode = getModeCode(p);
        const isMonthly = modeCode === "M";
        if (isMonthly && !monthly) return false;
        if (!isMonthly && !nonMonthly) return false;
      }

      return true;
    });

    if (validDbPolicies.length === 0) return [];

    const groupMap: { [key: string]: any } = {};
    validDbPolicies.forEach((p) => {
      const custMaster = p.CustomerMaster;
      const custObj = p.customer;
      const gCode = custObj?.groupCode || `M${(p.clientId || "01").toString().padStart(3, "0")}`;
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
      let memberAddress = "";
      if (custMaster?.addresses && custMaster.addresses.length > 0) {
        const addr = custMaster.addresses[0];
        memberAddress = [addr.addressLine1, addr.addressLine2, addr.city, addr.state, addr.pin].filter(Boolean).join(", ");
      } else if (custObj?.address) {
        memberAddress = custObj.address;
      }

      const lastPremiumDate = getLastPremiumDate(p) || new Date();

      if (!groupMap[gCode]) {
        groupMap[gCode] = { groupCode: gCode, groupHeadName: gHeadName, membersMap: {}, totalPolicies: 0, totalLastPremium: 0 };
      }
      const grp = groupMap[gCode];

      if (!grp.membersMap[memberName]) {
        grp.membersMap[memberName] = {
          name: memberName,
          mobile: memberMobile,
          email: memberEmail,
          address: memberAddress,
          policies: [],
          totalLastPremium: 0,
        };
      }
      const mem = grp.membersMap[memberName];

      const row = buildRow(p, lastPremiumDate);
      mem.policies.push(row);
      mem.totalLastPremium += row.lastPremiumAmount;
      grp.totalPolicies += 1;
      grp.totalLastPremium += row.lastPremiumAmount;
    });

    return Object.values(groupMap).map((grp: any) => ({ ...grp, members: Object.values(grp.membersMap) }));
  }, [rawPolicies, formData]);

  const grandTotal = groupData.reduce((acc, g) => acc + g.totalLastPremium, 0);
  const grandPolicies = groupData.reduce((acc, g) => acc + g.totalPolicies, 0);

  const getReportHeaderTitle = () => {
    switch (formData.sortingOption) {
      case "groupMemberwise":
        return "Memberwise";
      case "subAreaWise":
        return "Sub-Area Wise";
      case "dueDate":
        return "Due-Date Wise";
      case "branchNoWise":
        return "Branchwise";
      case "policyNoWise":
        return "Policywise";
      case "pincode":
        return "Pincode Wise";
      default:
        return "Groupwise";
    }
  };

  const handleDownloadPDF = async () => {
    if (!reportRef.current) return;
    setIsExporting(true);
    const toastId = toast.loading("Generating PDF report...");
    try {
      const canvas = await html2canvas(reportRef.current, { scale: 2, useCORS: true, allowTaint: true, backgroundColor: "#ffffff", logging: false });
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

      pdf.save(`Last_Premium_Statement_${formData.reportDate || "Report"}.pdf`);
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
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm print:hidden">
        <div className="flex items-center gap-3">
          <button onClick={onBackToForm} className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-slate-500 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 transition uppercase tracking-wider">
            <ArrowLeft size={16} />
            <span>Edit Filters</span>
          </button>
          <span className="text-xs bg-blue-50 text-[#1877F2] font-bold px-3 py-1 rounded-full border border-blue-200 uppercase tracking-wider">{getReportHeaderTitle()}</span>
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
        className="bg-white px-6 py-6 border border-slate-300 shadow-xl max-w-6xl mx-auto text-[11px] leading-snug print:p-0 print:border-none print:shadow-none"
      >
        <div className="flex justify-between items-end pb-1 text-[11px] font-semibold">
          <span>
            Last Premium Statement ({getReportHeaderTitle()}) as on {fmtDate(formData.reportDate) || fmtDate(new Date())}
          </span>
          <span>
            Last premium paid between {fmtDate(formData.fromDate)} and {fmtDate(formData.toDate)}
          </span>
        </div>

        {groupData.length === 0 ? (
          <div className="mt-6 py-16 text-center bg-slate-50 rounded-xl border border-slate-200 p-8 space-y-2">
            <h3 className="font-bold text-slate-800 text-sm">No Matching Premium Records Found</h3>
            <p className="text-xs text-slate-500">
              There are no policies with a last premium payment in the selected date range matching your filter criteria.
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
                          {(formData.reportOptions.printAddress || formData.reportOptions.printTelNo) && (
                            <div className="text-[10px]">
                              {[
                                formData.reportOptions.printAddress && member.address && `Address : ${member.address}`,
                                formData.reportOptions.printTelNo && member.mobile && `Tel/Mob : ${member.mobile}`,
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
                      {member.policies.length > 1 && group.members.length > 1 && (
                        <tr className="font-bold">
                          <td colSpan={LAST_PREMIUM_AMT_IDX} className="px-1 pt-1.5 pb-1 text-right pr-3">
                            Member Total :
                          </td>
                          <td className="px-1 pt-1.5 pb-1 text-right font-mono whitespace-nowrap">
                            <span style={totalValueStyle}>{member.totalLastPremium.toLocaleString("en-IN")}</span>
                          </td>
                          <td colSpan={columns.length - LAST_PREMIUM_AMT_IDX - 1}></td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                  <tr className="font-bold">
                    <td colSpan={LAST_PREMIUM_AMT_IDX} className="px-1 pt-1.5 pb-1">
                      <div className="flex justify-between">
                        <span>Total No. of Policies for this Group : {group.totalPolicies}</span>
                        <span className="pr-3">Group Total :</span>
                      </div>
                    </td>
                    <td className="px-1 pt-1.5 pb-1 text-right font-mono whitespace-nowrap">
                      <span style={totalValueStyle}>{group.totalLastPremium.toLocaleString("en-IN")}</span>
                    </td>
                    <td colSpan={columns.length - LAST_PREMIUM_AMT_IDX - 1}></td>
                  </tr>
                  <tr>
                    <td colSpan={columns.length} style={{ borderBottom: `1px solid ${BLACK}`, height: 6 }}></td>
                  </tr>
                </Fragment>
              ))}
            </tbody>
          </table>
        )}

        {groupData.length > 0 && (
          <div className="pt-4 flex justify-end">
            <table className="w-full max-w-sm border-collapse text-[11px]">
              <tbody>
                <tr className="font-bold">
                  <td className="px-1 pt-1.5 pb-1">Grand Total (Last Premium)</td>
                  <td className="px-1 pt-1.5 pb-1 text-right font-mono">
                    <span style={totalValueStyle}>{grandTotal.toLocaleString("en-IN")}</span>
                  </td>
                </tr>
                <tr className="font-bold">
                  <td className="px-1 py-1">Total No. of Policies</td>
                  <td className="px-1 py-1 text-right font-mono">{grandPolicies}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        <div className="pt-5 mt-4 space-y-1 text-[9px]" style={{ borderTop: `1px solid ${BLACK}` }}>
          <div className="flex flex-wrap gap-x-5 gap-y-0.5">
            <span><strong>Y :</strong> Yearly Mode</span>
            <span><strong>H :</strong> Half-Yearly Mode</span>
            <span><strong>Q :</strong> Quarterly Mode</span>
            <span><strong>M :</strong> Monthly Mode</span>
            <span><strong>S :</strong> Single Premium</span>
          </div>
          <p>
            Last Premium Date is derived from the next-due date and premium mode where a direct receipt date isn&apos;t stored. Loyalty Addition &amp; F.A.B are estimated at placeholder rates (₹{LOYALTY_ADDITION_RATE_PER_1000_PA}/1000 SA p.a. and ₹{FAB_RATE_PER_1000}/1000 SA) — replace with your declared bonus rate table for accurate figures.
          </p>
          <div className="flex justify-between font-mono text-[8px] pt-1">
            <span>DSS000019899</span>
            <span>Generated via Last Premium Statement Engine</span>
          </div>
        </div>
      </div>
    </div>
  );
}