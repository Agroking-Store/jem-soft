"use client";

import { useRef, useState, useMemo, Fragment } from "react";
import { ArrowLeft, Download } from "lucide-react";
import { LoanInterestDueFormData } from "./LoanInterestDueForm";
import html2canvas from "html2canvas-pro";
import jsPDF from "jspdf";
import toast from "react-hot-toast";

interface LoanInterestDueReportViewProps {
  formData: LoanInterestDueFormData;
  policies?: any[];
  customers?: any[];
  loans?: any[];
  onBackToForm: () => void;
}

function fmtDate(d: Date | string | null | undefined) {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  if (isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-GB");
}

function getPolicyMemberName(loanOrPolicy: any): string {
  const custMaster = loanOrPolicy.policy?.CustomerMaster || loanOrPolicy.CustomerMaster;
  if (custMaster) {
    const salutation = custMaster.salutation ? `${custMaster.salutation} ` : "";
    const fullName = [custMaster.firstName, custMaster.middleName, custMaster.lastName]
      .filter(Boolean)
      .join(" ");
    if (fullName.trim()) return `${salutation}${fullName.trim()}`;
    if (custMaster.name) return custMaster.name;
  }

  const lifeAssured = loanOrPolicy.policy?.lifeAssured || loanOrPolicy.lifeAssured;
  if (lifeAssured) {
    if (typeof lifeAssured === "string") return lifeAssured;
    const salutation = lifeAssured.salutation ? `${lifeAssured.salutation} ` : "";
    const fullName = [lifeAssured.firstName, lifeAssured.middleName, lifeAssured.lastName]
      .filter(Boolean)
      .join(" ");
    if (fullName.trim()) return `${salutation}${fullName.trim()}`;
    if (lifeAssured.name) return lifeAssured.name;
  }

  const custObj = loanOrPolicy.policy?.customer || loanOrPolicy.customer;
  if (custObj?.name) return custObj.name;

  return "Policy Holder";
}

function getNextInterestDueDate(loanDateStr: string | null | undefined, asOf: Date): Date {
  if (!loanDateStr) return asOf;
  const lDate = new Date(loanDateStr);
  if (isNaN(lDate.getTime())) return asOf;
  const d = new Date(lDate);
  while (d < asOf) {
    d.setMonth(d.getMonth() + 6);
  }
  return d;
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

export default function LoanInterestDueReportView({
  formData,
  policies: rawPolicies = [],
  customers: rawCustomers = [],
  loans = [],
  onBackToForm,
}: LoanInterestDueReportViewProps) {
  const reportRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  const groupData = useMemo(() => {
    const asOfDate = formData.reportDate ? new Date(formData.reportDate) : new Date();
    asOfDate.setHours(23, 59, 59, 999);

    const fromDate = formData.dateFrom ? new Date(formData.dateFrom) : null;
    const toDate = formData.dateTo ? new Date(formData.dateTo) : null;
    if (fromDate) fromDate.setHours(0, 0, 0, 0);
    if (toDate) toDate.setHours(23, 59, 59, 999);

    // Target calculation date for interest computation
    const calcDate = toDate && toDate > asOfDate ? toDate : asOfDate;

    // Filter selections
    const selectedAgencies = (formData.appliedFilters || [])
      .filter((f) => f.type === "Agencies")
      .map((f) => (f.name || f.id).toLowerCase().trim());

    const selectedStatuses = (formData.appliedFilters || [])
      .filter((f) => f.type === "Policy Status")
      .map((f) => (f.name || f.id).toLowerCase().trim());

    const selectedBranches = (formData.appliedFilters || [])
      .filter((f) => f.type === "Branches")
      .map((f) => (f.name || f.id).toLowerCase().trim());

    const selectedGroupsFromFilter = (formData.appliedFilters || [])
      .filter((f) => f.type === "Groups")
      .map((f) => (f.id || f.name).toLowerCase().trim());

    const selectedAreas = (formData.appliedFilters || [])
      .filter((f) => f.type === "Areas")
      .map((f) => (f.name || f.id).toLowerCase().trim());

    const selectedGroupCodesModal = (formData.selectedGroups || []).map((g) =>
      (g.groupCode || g.groupName || "").toLowerCase().trim()
    );

    const sortingFilterItems = (formData.sortingFilterSelection?.selectedItems || []).map(
      (item: any) => (item.name || item.code || item.id || "").toLowerCase().trim()
    );

    // Build raw source items
    let sourceItems: any[] = [];

    if (loans && loans.length > 0) {
      sourceItems = loans.map((loan) => {
        const policyObj = loan.policy || {};
        const custMaster = policyObj.CustomerMaster || {};
        const custObj = policyObj.customer || {};

        const repayments = loan.repayments || [];
        const totalPrincipalRepaid = repayments.reduce(
          (sum: number, r: any) => sum + Number(r.principalComponent || 0),
          0
        );
        const totalInterestPaid = repayments.reduce(
          (sum: number, r: any) => sum + Number(r.interestComponent || 0),
          0
        );
        const outstandingPrincipal = Math.max(
          0,
          Number(loan.loanAmount || 0) - totalPrincipalRepaid
        );

        const lastPaymentDate =
          repayments.length > 0 && repayments[0]?.repaymentDate
            ? new Date(repayments[0].repaymentDate)
            : new Date(loan.loanDate);

        const validLastDate = isNaN(lastPaymentDate.getTime())
          ? new Date(loan.loanDate)
          : lastPaymentDate;

        const daysSince = isNaN(validLastDate.getTime())
          ? 0
          : Math.max(
              0,
              Math.floor((calcDate.getTime() - validLastDate.getTime()) / (1000 * 60 * 60 * 24))
            );

        const annualRate = Number(loan.interestRate || 0);
        const interestDue =
          outstandingPrincipal > 0 && loan.loanStatus?.statusCode !== "PAID_OFF"
            ? Math.round(((outstandingPrincipal * annualRate * daysSince) / 36500) * 100) / 100
            : 0;

        const nextDueDate = getNextInterestDueDate(loan.loanDate, calcDate);

        return {
          id: loan.id,
          policyNumber: policyObj.policyNumber || "N/A",
          policy: policyObj,
          customer: custObj,
          CustomerMaster: custMaster,
          planName: policyObj.product?.productName || "Life Insurance Policy",
          loanDate: loan.loanDate ? new Date(loan.loanDate) : new Date(),
          loanAmount: Number(loan.loanAmount || 0),
          interestRate: annualRate,
          outstandingPrincipal,
          totalPrincipalRepaid,
          totalInterestPaid,
          interestDue,
          lastPaymentDate: validLastDate,
          nextDueDate,
          loanStatus: loan.loanStatus?.statusName || "Active",
          agencyName:
            policyObj.advisor?.advisorName ||
            policyObj.advisor?.name ||
            policyObj.advisor?.advisorCode ||
            policyObj.agentCode ||
            "",
          branchName:
            policyObj.branch?.branchName || policyObj.branch?.branchCode || "",
          statusName:
            policyObj.status?.statusName ||
            loan.loanStatus?.statusName ||
            "Inforce",
        };
      });
    } else {
      sourceItems = rawPolicies
        .filter((p) => p.loans?.length > 0 || Number(p.loanAmount) > 0)
        .map((p, idx) => {
          const loanAmt = Number(p.loanAmount || 50000);
          const annualRate = 9.5;
          const loanDate = new Date(p.commencementDate || new Date());
          const daysSince = Math.max(
            0,
            Math.floor((calcDate.getTime() - loanDate.getTime()) / (1000 * 60 * 60 * 24))
          );
          const interestDue = Math.round(((loanAmt * annualRate * daysSince) / 36500) * 100) / 100;
          return {
            id: `mock-${idx}`,
            policyNumber: p.policyNumber || `98${1000000 + idx}`,
            policy: p,
            customer: p.customer || {},
            CustomerMaster: p.CustomerMaster || {},
            planName: p.product?.productName || "Endowment Plan",
            loanDate,
            loanAmount: loanAmt,
            interestRate: annualRate,
            outstandingPrincipal: loanAmt,
            totalPrincipalRepaid: 0,
            totalInterestPaid: 0,
            interestDue,
            lastPaymentDate: loanDate,
            nextDueDate: getNextInterestDueDate(loanDate.toISOString(), calcDate),
            loanStatus: "Active",
            agencyName: p.agentCode || p.agency?.agencyName || "",
            branchName: p.branch?.branchName || "",
            statusName: p.status?.statusName || "Inforce",
          };
        });
    }

    // Filter items
    const validItems = sourceItems.filter((item) => {
      // Must have positive outstanding principal
      if (item.outstandingPrincipal <= 0) return false;

      // Date Range Filter: loan must have been disbursed on or before toDate/calcDate
      if (toDate && item.loanDate > toDate) return false;

      // Status filter
      if (selectedStatuses.length > 0) {
        const sName = (item.statusName || "Inforce").toLowerCase();
        const matches = selectedStatuses.some(
          (st) => sName.includes(st) || st.includes(sName)
        );
        if (!matches) return false;
      }

      // Agency filter
      if (selectedAgencies.length > 0) {
        const ag = (item.agencyName || "").toLowerCase();
        const matches = selectedAgencies.some(
          (sel) => ag.includes(sel) || sel.includes(ag)
        );
        if (!matches) return false;
      }

      // Branch filter
      if (selectedBranches.length > 0) {
        const br = (item.branchName || "").toLowerCase();
        const matches = selectedBranches.some(
          (sel) => br.includes(sel) || sel.includes(br)
        );
        if (!matches) return false;
      }

      // Customer Groups from Modal
      const gCode = (item.customer?.groupCode || "").toLowerCase();
      const gName = (item.customer?.groupName || "").toLowerCase();
      if (selectedGroupCodesModal.length > 0) {
        const matches = selectedGroupCodesModal.some(
          (sc) =>
            (gCode && (gCode.includes(sc) || sc.includes(gCode))) ||
            (gName && (gName.includes(sc) || sc.includes(gName)))
        );
        if (!matches) return false;
      }

      // Customer Groups from Filter Modal
      if (selectedGroupsFromFilter.length > 0) {
        const matches = selectedGroupsFromFilter.some(
          (sc) =>
            (gCode && (gCode.includes(sc) || sc.includes(gCode))) ||
            (gName && (gName.includes(sc) || sc.includes(gName)))
        );
        if (!matches) return false;
      }

      // Area filter
      if (selectedAreas.length > 0) {
        const area = (item.customer?.resArea || "").toLowerCase();
        const city = (item.customer?.resCity || "").toLowerCase();
        const matches = selectedAreas.some(
          (sel) =>
            (area && (area.includes(sel) || sel.includes(area))) ||
            (city && (city.includes(sel) || sel.includes(city)))
        );
        if (!matches) return false;
      }

      // Sorting Selection Filter (Area / Branch / SubArea)
      if (sortingFilterItems.length > 0) {
        if (formData.sortingOption === "areaWise") {
          const area = (item.customer?.resArea || "").toLowerCase();
          if (!sortingFilterItems.some((s) => area.includes(s) || s.includes(area))) {
            return false;
          }
        } else if (formData.sortingOption === "subAreaWise") {
          const city = (item.customer?.resCity || "").toLowerCase();
          if (!sortingFilterItems.some((s) => city.includes(s) || s.includes(city))) {
            return false;
          }
        } else if (formData.sortingOption === "branchNoWise") {
          const br = (item.branchName || "").toLowerCase();
          if (!sortingFilterItems.some((s) => br.includes(s) || s.includes(br))) {
            return false;
          }
        }
      }

      return true;
    });

    const groupMap: { [key: string]: any } = {};

    validItems.forEach((item, idx) => {
      const custObj = item.customer;
      const custMaster = item.CustomerMaster;

      let gCode = custObj?.groupCode || `A-${(idx + 1).toString().padStart(3, "0")}`;
      let gHeadName = custObj?.groupName || custObj?.name || "Loan Holder Group";
      const memberName = getPolicyMemberName(item);

      const contact = custMaster?.contactInfo;
      const memberMobile =
        contact?.mobile1 || custObj?.phone || custObj?.mobilePersonal || "";
      const addresses = custMaster?.addresses;
      const memberAddress =
        custObj?.resArea ||
        custObj?.resCity ||
        (addresses && addresses.length > 0
          ? `${addresses[0].addressLine1 || ""} ${addresses[0].city || ""}`.trim()
          : "");
      const memberDOB = custMaster?.dob || custObj?.dob || "";

      if (formData.sortingOption === "groupMemberwise") {
        gCode = `${gCode}_${memberName}`;
        gHeadName = memberName;
      } else if (formData.sortingOption === "areaWise") {
        gCode = custObj?.resArea || "General Area";
        gHeadName = `Area: ${custObj?.resArea || "General Area"}`;
      } else if (formData.sortingOption === "subAreaWise") {
        gCode = custObj?.resCity || "General Sub-Area";
        gHeadName = `City/Sub-Area: ${custObj?.resCity || "General Sub-Area"}`;
      } else if (formData.sortingOption === "branchNoWise") {
        gCode = item.branchName || "Default Branch";
        gHeadName = `Branch: ${item.branchName || "Default Branch"}`;
      }

      if (!groupMap[gCode]) {
        groupMap[gCode] = {
          groupCode: gCode,
          groupHeadName: gHeadName,
          membersMap: {},
          totalOutstanding: 0,
          totalInterestDue: 0,
        };
      }

      const grp = groupMap[gCode];
      if (!grp.membersMap[memberName]) {
        grp.membersMap[memberName] = {
          name: memberName,
          mobile: memberMobile,
          address: memberAddress,
          dob: memberDOB,
          policies: [],
          totalOutstanding: 0,
          totalInterestDue: 0,
        };
      }

      const mem = grp.membersMap[memberName];

      const row = {
        sr: idx + 1,
        policyNo: item.policyNumber,
        memberName,
        planName: item.planName,
        loanAmount: item.loanAmount,
        outstandingPrincipal: item.outstandingPrincipal,
        interestRate: item.interestRate,
        interestFromDate: fmtDate(item.lastPaymentDate),
        dueDate: fmtDate(item.nextDueDate),
        interestPaid: item.totalInterestPaid,
        interestDue: item.interestDue,
        loanStatus: item.loanStatus,
      };

      mem.policies.push(row);
      mem.totalOutstanding += item.outstandingPrincipal;
      mem.totalInterestDue += item.interestDue;
      grp.totalOutstanding += item.outstandingPrincipal;
      grp.totalInterestDue += item.interestDue;
    });

    return Object.values(groupMap).map((grp: any) => ({
      ...grp,
      members: Object.values(grp.membersMap),
    }));
  }, [loans, rawPolicies, formData]);

  const grandTotalPrincipal = groupData.reduce((acc, g) => acc + g.totalOutstanding, 0);
  const grandTotalInterestDue = groupData.reduce((acc, g) => acc + g.totalInterestDue, 0);

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
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });
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

      pdf.save(
        `Loan_Interest_Due_${formData.reportType}_${formData.reportDate || "Report"}.pdf`
      );
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
      {/* Action Bar */}
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
            Loan Interest Due {formData.reportType}
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
        className="bg-white px-6 py-6 border border-slate-300 shadow-xl max-w-5xl mx-auto text-[11px] leading-snug print:p-0 print:border-none print:shadow-none"
      >
        <div className="flex justify-between items-end pb-1 text-[11px] font-semibold">
          <span>
            Loan Interest Due {formData.reportType === "Statement" ? "Report" : "Intimation Notice"} as on{" "}
            {fmtDate(formData.reportDate) || fmtDate(new Date())}
          </span>
          {formData.reportType === "Intimation" && formData.dateFrom && (
            <span>Period: {fmtDate(formData.dateFrom)} to {fmtDate(formData.dateTo)}</span>
          )}
        </div>

        {formData.reportType === "Intimation" && (
          <div className="pb-1 flex flex-wrap gap-x-6">
            <span>
              <strong>Purpose :</strong> {formData.intimationOptions.purpose || "Loan Interest Due Remittance"}
            </span>
            <span>
              <strong>Cost per despatch :</strong> ₹{formData.intimationOptions.costPerDespatch}
            </span>
          </div>
        )}

        {groupData.length === 0 ? (
          <div className="mt-6 py-16 text-center bg-slate-50 rounded-xl border border-slate-200 p-8 space-y-2">
            <h3 className="font-bold text-slate-800 text-sm">No Loan Policies Matching Filters Found</h3>
            <p className="text-xs text-slate-500">
              There are no policy loans matching the applied filter criteria. Try resetting or adjusting the filters.
            </p>
          </div>
        ) : (
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="font-bold">
                <th className="px-1 py-1" style={thStyle}>Sr</th>
                <th className="px-1 py-1" style={thStyle}>Policy No</th>
                <th className="px-1 py-1" style={thStyle}>Policy Holder</th>
                <th className="px-1 py-1" style={thStyle}>Plan</th>
                <th className="px-1 py-1 text-right" style={thStyle}>Outstanding<br />Principal (₹)</th>
                <th className="px-1 py-1 text-center" style={thStyle}>Rate<br />(% p.a.)</th>
                <th className="px-1 py-1 text-center" style={thStyle}>Accruing<br />From</th>
                <th className="px-1 py-1 text-center" style={thStyle}>Next<br />Due</th>
                <th className="px-1 py-1 text-right" style={thStyle}>Interest<br />Paid (₹)</th>
                <th className="px-1 py-1 text-right" style={thStyle}>Interest<br />Due (₹)</th>
              </tr>
            </thead>
            <tbody>
              {groupData.map((group) => (
                <Fragment key={group.groupCode}>
                  {formData.sortingOption !== "groupMemberwise" && (
                    <tr>
                      <td colSpan={10} className="pt-3 pb-1 text-center text-[13px] font-bold">
                        {formData.sortingOption === "groupsWise" ? `${group.groupCode}: ` : ""}
                        {group.groupHeadName}
                      </td>
                    </tr>
                  )}
                  {group.members.map((member: any) => (
                    <Fragment key={member.name}>
                      <tr>
                        <td colSpan={10} className="pt-2 pb-0.5">
                          <div className="text-[11px] font-bold">{member.name}</div>
                          {formData.reportType === "Statement" && (
                            <div className="text-[10px]">
                              {[
                                formData.statementOptions.address && member.address && `Address : ${member.address}`,
                                formData.statementOptions.mobile && member.mobile && `Mob : ${member.mobile}`,
                                formData.statementOptions.dob && member.dob && `DOB : ${fmtDate(member.dob)}`,
                              ].filter(Boolean).join("   ")}
                            </div>
                          )}
                          {formData.reportType === "Intimation" && (
                            <div className="text-[10px]">
                              {[
                                formData.intimationOptions.dob && member.dob && `DOB : ${fmtDate(member.dob)}`,
                                formData.intimationOptions.includePrevArrear && `Includes Arrears`,
                              ].filter(Boolean).join("   ")}
                            </div>
                          )}
                        </td>
                      </tr>
                      {member.policies.map((p: any) => (
                        <tr key={p.policyNo}>
                          <td className="px-1 py-0.5">{p.sr}</td>
                          <td className="px-1 py-0.5 font-mono whitespace-nowrap">{p.policyNo}</td>
                          <td className="px-1 py-0.5">{p.memberName}</td>
                          <td className="px-1 py-0.5">{p.planName}</td>
                          <td className="px-1 py-0.5 text-right whitespace-nowrap">{p.outstandingPrincipal.toLocaleString("en-IN")}</td>
                          <td className="px-1 py-0.5 text-center">{p.interestRate}%</td>
                          <td className="px-1 py-0.5 text-center whitespace-nowrap">{p.interestFromDate}</td>
                          <td className="px-1 py-0.5 text-center whitespace-nowrap">{p.dueDate}</td>
                          <td className="px-1 py-0.5 text-right whitespace-nowrap">{p.interestPaid.toLocaleString("en-IN")}</td>
                          <td className="px-1 py-0.5 text-right font-bold whitespace-nowrap">{p.interestDue.toLocaleString("en-IN")}</td>
                        </tr>
                      ))}
                      {member.policies.length > 1 && (
                        <tr className="font-bold">
                          <td colSpan={4} className="px-1 pt-1.5 pb-1 text-right pr-3">Member Total :</td>
                          <td className="px-1 pt-1.5 pb-1 text-right font-mono whitespace-nowrap">
                            <span style={totalValueStyle}>{member.totalOutstanding.toLocaleString("en-IN")}</span>
                          </td>
                          <td colSpan={4} className="px-1 pt-1.5 pb-1 text-right pr-2">Interest Due :</td>
                          <td className="px-1 pt-1.5 pb-1 text-right font-mono whitespace-nowrap">
                            <span style={totalValueStyle}>{member.totalInterestDue.toLocaleString("en-IN")}</span>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                  {formData.sortingOption !== "groupMemberwise" && (
                    <>
                      <tr className="font-bold">
                        <td colSpan={4} className="px-1 pt-1.5 pb-1 text-right pr-3">Group Total :</td>
                        <td className="px-1 pt-1.5 pb-1 text-right font-mono whitespace-nowrap">
                          <span style={totalValueStyle}>{group.totalOutstanding.toLocaleString("en-IN")}</span>
                        </td>
                        <td colSpan={4} className="px-1 pt-1.5 pb-1 text-right pr-2">Total Interest Due :</td>
                        <td className="px-1 pt-1.5 pb-1 text-right font-mono whitespace-nowrap">
                          <span style={totalValueStyle}>{group.totalInterestDue.toLocaleString("en-IN")}</span>
                        </td>
                      </tr>
                      <tr>
                        <td colSpan={10} style={{ borderBottom: `1px solid ${BLACK}`, height: 6 }}></td>
                      </tr>
                    </>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        )}

        {groupData.length > 0 && (
          <div className="pt-5 flex justify-end">
            <table className="w-full max-w-md border-collapse text-[11px]">
              <tbody>
                <tr>
                  <td className="px-1 py-0.5">Grand Total Outstanding Principal :</td>
                  <td className="px-1 py-0.5 text-right font-mono">₹ {grandTotalPrincipal.toLocaleString("en-IN")}</td>
                </tr>
                <tr className="font-bold">
                  <td className="px-1 pt-1.5 pb-1">Grand Total Interest Due :</td>
                  <td className="px-1 pt-1.5 pb-1 text-right font-mono">
                    <span style={totalValueStyle}>₹ {grandTotalInterestDue.toLocaleString("en-IN")}</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}