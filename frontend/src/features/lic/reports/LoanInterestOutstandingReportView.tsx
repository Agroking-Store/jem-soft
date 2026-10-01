"use client";

import { useRef, useState, useMemo, Fragment } from "react";
import { ArrowLeft, Download, FilterX } from "lucide-react";
import { LoanInterestOutstandingFormData } from "./LoanInterestOutstandingForm";
import {
  fmtDate,
  money,
  getMemberName,
  getMemberId,
  getMemberAddress,
  getMemberMobile,
  getMemberDob,
  isAgencyMatch,
  pickFilterNames,
  pickGroupKeys,
  matchesAny,
} from "./loanReportHelpers";
import html2canvas from "html2canvas-pro";
import jsPDF from "jspdf";
import toast from "react-hot-toast";

interface LoanInterestOutstandingReportViewProps {
  formData: LoanInterestOutstandingFormData;
  policies?: any[];
  customers?: any[];
  loans?: any[];
  onBackToForm: () => void;
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

export default function LoanInterestOutstandingReportView({
  formData,
  policies: rawPolicies = [],
  loans = [],
  onBackToForm,
}: LoanInterestOutstandingReportViewProps) {
  const reportRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  const report = useMemo(() => {
    const calculationDate = formData.calculationDate
      ? new Date(formData.calculationDate)
      : new Date();
    calculationDate.setHours(23, 59, 59, 999);

    /* ---------------- applied filters ---------------- */
    const selectedAgencies = pickFilterNames(formData.appliedFilters, "Agencies");
    const selectedStatuses = pickFilterNames(formData.appliedFilters, "Policy Status");
    const selectedBranches = pickFilterNames(formData.appliedFilters, "Branches");
    const selectedAreas = pickFilterNames(formData.appliedFilters, "Areas");
    const selectedGroupsFromFilter = pickGroupKeys(formData.appliedFilters);

    const selectedGroupCodesModal = (formData.selectedGroups || [])
      .map((g) => (g.groupCode || "").toLowerCase().trim())
      .filter(Boolean);

    const selectedMemberIds = new Set(
      formData.sortingOption === "groupMemberwise"
        ? (formData.sortingFilterSelection?.selectedItems || []).map((i) => i.id)
        : []
    );

    const sortingPairs = (formData.sortingFilterSelection?.selectedItems || []).map((i) => ({
      code: ((i as any).code || "").toLowerCase().trim(),
      name: ((i as any).name || "").toLowerCase().trim(),
    }));

    const matchesSorting = (codeVal?: string, nameVal?: string) => {
      if (sortingPairs.length === 0) return true;
      const c = (codeVal || "").toLowerCase().trim();
      const n = (nameVal || "").toLowerCase().trim();
      return sortingPairs.some((p) => {
        const tries = [
          p.code && c && (c.includes(p.code) || p.code.includes(c)),
          p.name && n && (n.includes(p.name) || p.name.includes(n)),
          p.code && n && (n.includes(p.code) || p.code.includes(n)),
          p.name && c && (c.includes(p.name) || p.name.includes(c)),
        ];
        return tries.some(Boolean);
      });
    };

    /* ---------------- source rows ---------------- */
    let sourceItems: any[] = [];

    if (loans && loans.length > 0) {
      sourceItems = loans.map((loan) => {
        const p = loan.policy || {};
        const repayments = loan.repayments || [];
        const relevant = repayments.filter(
          (r: any) => r.repaymentDate && new Date(r.repaymentDate) <= calculationDate
        );

        const totalPrincipalRepaid = relevant.reduce(
          (s: number, r: any) => s + Number(r.principalComponent || 0),
          0
        );
        const totalInterestPaid = relevant.reduce(
          (s: number, r: any) => s + Number(r.interestComponent || 0),
          0
        );

        const originalLoanAmount = Number(loan.loanAmount || 0);
        const outstandingDue = Math.max(0, originalLoanAmount - totalPrincipalRepaid);
        const isPaidOff = outstandingDue <= 0.01 || loan.loanStatus?.statusCode === "PAID_OFF";

        const lastRepaymentDate =
          relevant.length > 0 && relevant[0]?.repaymentDate
            ? new Date(relevant[0].repaymentDate)
            : null;

        return {
          id: loan.id,
          policyNumber: p.policyNumber || "N/A",
          policy: p,
          customer: p.customer || {},
          CustomerMaster: p.CustomerMaster || {},
          agentCode: p.agentCode || "",
          advisorName: p.advisor?.advisorName || "",
          advisorCode: p.advisor?.advisorCode || "",
          agencyName: p.advisor?.agency?.agencyName || "",
          agencyCode: p.advisor?.agency?.agencyCode || "",
          branchCode: p.branch?.branchCode || "",
          branchName: p.branch?.branchName || "",
          statusName: p.status?.statusName || loan.loanStatus?.statusName || "Inforce",
          planNumber: p.product?.planNumber || "",
          planName: p.product?.productName || "Life Insurance Policy",
          policyTerm: p.policyTerm ?? "",
          premiumPayingTerm: p.premiumPayingTerm ?? "",
          loanDate: loan.loanDate ? new Date(loan.loanDate) : new Date(),
          loanAmount: originalLoanAmount,
          principalPaid: totalPrincipalRepaid,
          outstandingDue,
          interestRate: Number(loan.interestRate || 0),
          totalInterestPaid,
          lastRepaymentDate,
          isPaidOff,
          loanStatus: isPaidOff
            ? "Paid Off"
            : loan.loanStatus?.statusName || "Active",
        };
      });
    } else {
      sourceItems = rawPolicies
        .filter((p) => p.loans?.length > 0 || Number(p.loanAmount) > 0)
        .map((p, idx) => {
          const loanAmt = Number(p.loanAmount || 80000);
          const principalPaid = Number(p.principalPaid || 20000);
          const outstandingDue = Math.max(0, loanAmt - principalPaid);
          return {
            id: `mock-${idx}`,
            policyNumber: p.policyNumber || `98${1000000 + idx}`,
            policy: p,
            customer: p.customer || {},
            CustomerMaster: p.CustomerMaster || {},
            agentCode: p.agentCode || "",
            advisorName: p.advisor?.advisorName || "",
            advisorCode: p.advisor?.advisorCode || "",
            agencyName: p.advisor?.agency?.agencyName || p.agency?.agencyName || "",
            agencyCode: p.advisor?.agency?.agencyCode || p.agency?.agencyCode || "",
            branchCode: p.branch?.branchCode || p.branchNo || "",
            branchName: p.branch?.branchName || "",
            statusName: p.status?.statusName || "Inforce",
            planNumber: p.product?.planNumber || "",
            planName: p.product?.productName || "Endowment Plan",
            policyTerm: p.policyTerm ?? "",
            premiumPayingTerm: p.premiumPayingTerm ?? "",
            loanDate: p.commencementDate ? new Date(p.commencementDate) : new Date(),
            loanAmount: loanAmt,
            principalPaid,
            outstandingDue,
            interestRate: 9.5,
            totalInterestPaid: 0,
            lastRepaymentDate: null,
            isPaidOff: outstandingDue <= 0.01,
            loanStatus: outstandingDue <= 0.01 ? "Paid Off" : "Active",
          };
        });
    }

    /* ---------------- filters ---------------- */
    const activeFiltersSummaryList: string[] = [];
    if (selectedStatuses.length) activeFiltersSummaryList.push(`Status: ${formData.appliedFilters.filter((f) => f.type === "Policy Status").map((f) => f.name).join(", ")}`);
    if (selectedAgencies.length) activeFiltersSummaryList.push(`Agency: ${formData.appliedFilters.filter((f) => f.type === "Agencies").map((f) => f.name).join(", ")}`);
    if (selectedBranches.length) activeFiltersSummaryList.push(`Branch: ${formData.appliedFilters.filter((f) => f.type === "Branches").map((f) => f.name).join(", ")}`);
    if (selectedAreas.length) activeFiltersSummaryList.push(`Area: ${formData.appliedFilters.filter((f) => f.type === "Areas").map((f) => f.name).join(", ")}`);
    if (selectedGroupCodesModal.length) activeFiltersSummaryList.push(`Groups: ${formData.selectedGroups.map((g) => g.groupCode).join(", ")}`);
    if (formData.sortingOption === "groupMemberwise" && selectedMemberIds.size)
      activeFiltersSummaryList.push(`Members: ${(formData.sortingFilterSelection?.selectedItems || []).map((i) => i.name).join(", ")}`);
    if (formData.sortingOption !== "groupsWise" && formData.sortingOption !== "groupMemberwise" && sortingPairs.length)
      activeFiltersSummaryList.push(`${formData.sortingFilterSelection?.selectedItems?.map((i) => i.name || i.code).join(", ")}`);

    const validItems = sourceItems.filter((item) => {
      // Loan must exist on or before the calculation date.
      if (item.loanDate > calculationDate) return false;
      // Only loans that still have a balance.
      if (item.outstandingDue <= 0) return false;

      if (!matchesAny(item.statusName || "Inforce", selectedStatuses)) return false;

      if (
        !isAgencyMatch(
          {
            agentCode: item.agentCode,
            advisorName: item.advisorName,
            advisorCode: item.advisorCode,
            agencyName: item.agencyName,
            agencyCode: item.agencyCode,
          },
          selectedAgencies
        )
      )
        return false;

      if (selectedBranches.length && !matchesAny(`${item.branchCode} ${item.branchName}`, selectedBranches))
        return false;

      const custObj = item.customer || {};
      const gCode = (custObj.groupCode || "").toLowerCase();
      const gName = (custObj.groupName || custObj.name || "").toLowerCase();

      if (selectedGroupCodesModal.length && !selectedGroupCodesModal.some((sc) => gCode === sc || gName.includes(sc)))
        return false;

      if (selectedGroupsFromFilter.length && !selectedGroupsFromFilter.some((sc) => gCode === sc || (gName && gName.includes(sc))))
        return false;

      if (selectedAreas.length && !matchesAny(`${custObj.resArea || ""} ${custObj.resCity || ""}`, selectedAreas))
        return false;

      if (formData.sortingOption === "groupMemberwise") {
        if (selectedMemberIds.size > 0 && !selectedMemberIds.has(getMemberId(item))) return false;
      } else if (formData.sortingOption === "areaWise") {
        if (!matchesSorting(undefined, custObj.resArea || "")) return false;
      } else if (formData.sortingOption === "subAreaWise") {
        if (!matchesSorting(undefined, custObj.resCity || "")) return false;
      } else if (formData.sortingOption === "branchNoWise") {
        if (!matchesSorting(item.branchCode, item.branchName)) return false;
      }

      return true;
    });

    /* ---------------- grouping ---------------- */
    const groupMap: { [key: string]: any } = {};
    const summary = {
      members: new Map<string, any>(),
      totalPolicies: 0,
      totalLoanAmount: 0,
      totalPrincipalPaid: 0,
      totalOutstanding: 0,
    };

    validItems.forEach((item, idx) => {
      const custObj = item.customer || {};
      const memberName = getMemberName(item);
      const memberId = getMemberId(item);

      let gCode = custObj.groupCode || `GRP-${(idx + 1).toString().padStart(3, "0")}`;
      let gHeadName = custObj.groupName || custObj.name || "Loan Holder Group";
      let showGroupHeading = true;

      if (formData.sortingOption === "groupMemberwise") {
        gCode = memberId || `M-${idx}`;
        gHeadName = memberName;
        showGroupHeading = false;
      } else if (formData.sortingOption === "areaWise") {
        gCode = custObj.resArea || "General Area";
        gHeadName = `Area : ${custObj.resArea || "General Area"}`;
      } else if (formData.sortingOption === "subAreaWise") {
        gCode = custObj.resCity || "General Sub-Area";
        gHeadName = `Sub-Area : ${custObj.resCity || "General Sub-Area"}`;
      } else if (formData.sortingOption === "branchNoWise") {
        gCode = item.branchCode || item.branchName || "Default Branch";
        gHeadName = `Branch : ${item.branchName || item.branchCode || "Default Branch"}`;
      }

      if (!groupMap[gCode]) {
        groupMap[gCode] = {
          groupCode: gCode,
          groupHeadName: gHeadName,
          showHeading: showGroupHeading,
          membersMap: {},
          totalLoanAmount: 0,
          totalPrincipalPaid: 0,
          totalOutstanding: 0,
        };
      }

      const grp = groupMap[gCode];
      if (!grp.membersMap[memberName]) {
        grp.membersMap[memberName] = {
          name: memberName,
          memberId,
          mobile: getMemberMobile(item),
          address: getMemberAddress(item),
          dob: getMemberDob(item),
          policies: [],
          totalLoanAmount: 0,
          totalPrincipalPaid: 0,
          totalOutstanding: 0,
        };
      }

      const mem = grp.membersMap[memberName];
      mem.policies.push({
        sr: idx + 1,
        policyNo: item.policyNumber,
        agCd: item.agentCode || "—",
        brn: item.branchCode || item.branchName || "—",
        planTermPpt: `${item.planNumber || "—"}/${item.policyTerm || "—"}/${item.premiumPayingTerm || "—"}`,
        planName: item.planName,
        loanDate: fmtDate(item.loanDate),
        loanAmount: item.loanAmount,
        principalPaid: item.principalPaid,
        outstandingDue: item.outstandingDue,
        interestRate: item.interestRate,
        lastRepayment: fmtDate(item.lastRepaymentDate),
        loanStatus: item.loanStatus,
        tel: getMemberMobile(item),
      });

      mem.totalLoanAmount += item.loanAmount;
      mem.totalPrincipalPaid += item.principalPaid;
      mem.totalOutstanding += item.outstandingDue;
      grp.totalLoanAmount += item.loanAmount;
      grp.totalPrincipalPaid += item.principalPaid;
      grp.totalOutstanding += item.outstandingDue;

      if (!summary.members.has(memberName)) {
        summary.members.set(memberName, {
          name: memberName,
          address: getMemberAddress(item),
          mobile: getMemberMobile(item),
          policyNos: [] as string[],
          outstanding: 0,
        });
      }
      const lbl = summary.members.get(memberName);
      lbl.policyNos.push(item.policyNumber);
      lbl.outstanding += item.outstandingDue;

      summary.totalPolicies += 1;
      summary.totalLoanAmount += item.loanAmount;
      summary.totalPrincipalPaid += item.principalPaid;
      summary.totalOutstanding += item.outstandingDue;
    });

    const groupData = Object.values(groupMap).map((g: any) => ({
      ...g,
      members: Object.values(g.membersMap),
    }));

    return {
      groupData,
      activeFiltersSummary: activeFiltersSummaryList,
      mailingLabels: Array.from(summary.members.values()),
      totalPolicies: summary.totalPolicies,
      grandLoanAmount: summary.totalLoanAmount,
      grandPrincipalPaid: summary.totalPrincipalPaid,
      grandOutstanding: summary.totalOutstanding,
    };
  }, [loans, rawPolicies, formData]);

  const showTelCol =
    formData.reportType === "Statement" && formData.statementOptions.registerWithTelNos;
  const totalCols = showTelCol ? 13 : 12;
  const costPerDespatch = Number(formData.intimationOptions.costPerDespatch) || 0;

  const reportTitle =
    formData.reportType === "Statement"
      ? "Loan Outstanding Due Statement"
      : "Loan Outstanding Due Intimation Summary";

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

      pdf.save(`Loan_Outstanding_Due_${formData.reportType}_${formData.reportDate || "Report"}.pdf`);
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
          <span className="text-xs bg-amber-50 text-amber-700 font-bold px-3 py-1 rounded-full border border-amber-200 uppercase tracking-wider">
            Loan Outstanding Due {formData.reportType}
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

      {/* Printable Statement — plain LIC-style register */}
      <div
        ref={reportRef}
        style={{ fontFamily: "Arial, Helvetica, sans-serif", color: BLACK }}
        className="bg-white px-6 py-6 border border-slate-300 shadow-xl max-w-6xl mx-auto text-[10px] leading-snug print:p-0 print:border-none print:shadow-none"
      >
        <div className="flex justify-between items-end pb-0.5 text-[11px] font-semibold">
          <span>{reportTitle} as on {fmtDate(formData.reportDate) || fmtDate(new Date())}</span>
          <span>
            Groups: {report.groupData.length} | Policies: {report.totalPolicies}
          </span>
        </div>
        <div className="flex justify-between items-end pb-1 text-[10px]">
          <span>Calculated up to {fmtDate(formData.calculationDate)} (Principal Balance)</span>
          <span></span>
        </div>

        {report.activeFiltersSummary.length > 0 && (
          <div className="pb-1 text-[9px] font-normal">{report.activeFiltersSummary.join(" | ")}</div>
        )}

        {formData.reportType === "Intimation" && (
          <div className="pb-1 flex flex-wrap gap-x-6 text-[10px]">
            <span>
              <strong>Purpose :</strong>{" "}
              {formData.intimationOptions.purpose || "Loan Principal Outstanding Recovery"}
            </span>
            <span>
              <strong>Cost per despatch :</strong> ₹{formData.intimationOptions.costPerDespatch || 0}
            </span>
          </div>
        )}

        {report.groupData.length === 0 ? (
          <div className="mt-6 p-12 text-center border-2 border-dashed border-slate-300 rounded-2xl space-y-3 bg-slate-50">
            <div className="inline-flex p-3 bg-red-100 text-red-600 rounded-full">
              <FilterX size={32} />
            </div>
            <h3 className="text-base font-bold text-slate-800">No Outstanding Loans Match Your Filters</h3>
            <p className="text-xs text-slate-600 max-w-md mx-auto">
              No policy loans with a pending balance matched the applied criteria. Try widening the
              filters or clicking &quot;Edit Filters&quot;.
            </p>
            <button
              onClick={onBackToForm}
              className="px-5 py-2 bg-[#0B1220] text-white font-bold text-xs rounded-xl hover:bg-slate-900 transition"
            >
              Modify Filter Selection
            </button>
          </div>
        ) : (
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="font-bold">
                <th className="px-1 py-1" style={thStyle}>Sr</th>
                <th className="px-1 py-1 whitespace-nowrap" style={thStyle}>Policy No</th>
                <th className="px-1 py-1 text-center" style={thStyle}>Ag<br />Cd</th>
                <th className="px-1 py-1 text-center" style={thStyle}>Brn</th>
                <th className="px-1 py-1 text-center whitespace-nowrap" style={thStyle}>Pl/<br />Tm/Pt</th>
                <th className="px-1 py-1 text-center whitespace-nowrap" style={thStyle}>Loan<br />Date</th>
                <th className="px-1 py-1 text-right" style={thStyle}>Loan<br />Amount</th>
                <th className="px-1 py-1 text-right" style={thStyle}>Principal<br />Paid</th>
                <th className="px-1 py-1 text-right" style={thStyle}>Outstanding<br />Due</th>
                <th className="px-1 py-1 text-center" style={thStyle}>Rate<br />%</th>
                <th className="px-1 py-1 text-center" style={thStyle}>Last<br />Repayment</th>
                <th className="px-1 py-1 text-center" style={thStyle}>Status</th>
                {showTelCol && <th className="px-1 py-1 text-center" style={thStyle}>Tel No</th>}
              </tr>
            </thead>

            {report.groupData.map((group) => (
              <tbody key={group.groupCode}>
                {group.showHeading && (
                  <tr>
                    <td colSpan={totalCols} className="pt-3 pb-1 text-center">
                      <div className="text-[13px] font-bold">
                        {formData.sortingOption === "groupsWise" ? `${group.groupCode}: ` : ""}
                        {group.groupHeadName}
                      </div>
                    </td>
                  </tr>
                )}

                {group.members.map((member: any) => (
                  <Fragment key={member.name}>
                    <tr>
                      <td colSpan={totalCols} className="pt-2 pb-0.5">
                        <div className="text-[11px] font-bold">{member.name}</div>
                        <div className="text-[10px]">
                          {[
                            formData.reportType === "Statement" &&
                              formData.statementOptions.statementWithAddress &&
                              member.address &&
                              `Address : ${member.address}`,
                            formData.reportType === "Statement" &&
                              formData.statementOptions.dob &&
                              member.dob &&
                              `DOB : ${fmtDate(member.dob)}`,
                            formData.reportType === "Intimation" &&
                              formData.intimationOptions.dob &&
                              member.dob &&
                              `DOB : ${fmtDate(member.dob)}`,
                          ]
                            .filter(Boolean)
                            .join("   ")}
                        </div>
                      </td>
                    </tr>

                    {member.policies.map((p: any) => (
                      <tr key={`${p.policyNo}-${p.sr}`}>
                        <td className="px-1 py-0.5">{p.sr}</td>
                        <td className="px-1 py-0.5 font-mono whitespace-nowrap">{p.policyNo}</td>
                        <td className="px-1 py-0.5 text-center">{p.agCd}</td>
                        <td className="px-1 py-0.5 text-center">{p.brn}</td>
                        <td className="px-1 py-0.5 text-center whitespace-nowrap">{p.planTermPpt}</td>
                        <td className="px-1 py-0.5 text-center whitespace-nowrap">{p.loanDate}</td>
                        <td className="px-1 py-0.5 text-right whitespace-nowrap">{money(p.loanAmount)}</td>
                        <td className="px-1 py-0.5 text-right whitespace-nowrap">{money(p.principalPaid)}</td>
                        <td className="px-1 py-0.5 text-right font-bold whitespace-nowrap">{money(p.outstandingDue)}</td>
                        <td className="px-1 py-0.5 text-center whitespace-nowrap">{p.interestRate || "—"}%</td>
                        <td className="px-1 py-0.5 text-center whitespace-nowrap">{p.lastRepayment || "—"}</td>
                        <td className="px-1 py-0.5 text-center whitespace-nowrap">{p.loanStatus}</td>
                        {showTelCol && (
                          <td className="px-1 py-0.5 text-center whitespace-nowrap">{p.tel || "—"}</td>
                        )}
                      </tr>
                    ))}

                    {member.policies.length > 1 && (
                      <tr className="font-bold">
                        <td colSpan={6} className="px-1 pt-1.5 pb-1 text-right pr-3">Member Total :</td>
                        <td className="px-1 pt-1.5 pb-1 text-right font-mono whitespace-nowrap">
                          <span style={totalValueStyle}>{money(member.totalLoanAmount)}</span>
                        </td>
                        <td className="px-1 pt-1.5 pb-1 text-right font-mono whitespace-nowrap">
                          <span style={totalValueStyle}>{money(member.totalPrincipalPaid)}</span>
                        </td>
                        <td className="px-1 pt-1.5 pb-1 text-right font-mono whitespace-nowrap">
                          <span style={totalValueStyle}>{money(member.totalOutstanding)}</span>
                        </td>
                        <td colSpan={showTelCol ? 4 : 3}></td>
                      </tr>
                    )}
                  </Fragment>
                ))}

                {group.showHeading && (
                  <>
                    <tr className="font-bold">
                      <td colSpan={6} className="px-1 pt-1.5 pb-1 text-right pr-3">Group Total :</td>
                      <td className="px-1 pt-1.5 pb-1 text-right font-mono whitespace-nowrap">
                        <span style={totalValueStyle}>{money(group.totalLoanAmount)}</span>
                      </td>
                      <td className="px-1 pt-1.5 pb-1 text-right font-mono whitespace-nowrap">
                        <span style={totalValueStyle}>{money(group.totalPrincipalPaid)}</span>
                      </td>
                      <td className="px-1 pt-1.5 pb-1 text-right font-mono whitespace-nowrap">
                        <span style={totalValueStyle}>{money(group.totalOutstanding)}</span>
                      </td>
                      <td colSpan={showTelCol ? 4 : 3}></td>
                    </tr>
                    <tr>
                      <td colSpan={totalCols} style={{ borderBottom: `1px solid ${BLACK}`, height: 6 }}></td>
                    </tr>
                  </>
                )}
              </tbody>
            ))}
          </table>
        )}

        {report.groupData.length > 0 && (
          <div className="pt-5 flex justify-end">
            <table className="w-full max-w-md border-collapse text-[11px]">
              <tbody>
                <tr>
                  <td className="px-1 py-0.5">Total Sanctioned :</td>
                  <td className="px-1 py-0.5 text-right font-mono">₹ {money(report.grandLoanAmount)}</td>
                </tr>
                <tr>
                  <td className="px-1 py-0.5">Total Principal Repaid :</td>
                  <td className="px-1 py-0.5 text-right font-mono">₹ {money(report.grandPrincipalPaid)}</td>
                </tr>
                <tr className="font-bold">
                  <td className="px-1 pt-1.5 pb-1">Grand Total Outstanding Principal :</td>
                  <td className="px-1 pt-1.5 pb-1 text-right font-mono">
                    <span style={totalValueStyle}>₹ {money(report.grandOutstanding)}</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* Mailing Labels */}
        {formData.reportType === "Intimation" &&
          formData.intimationOptions.mailingLabels &&
          report.groupData.length > 0 && (
            <div className="pt-5 mt-4" style={{ borderTop: `1px solid ${BLACK}` }}>
              <div className="text-[11px] font-bold uppercase tracking-wider pb-2">
                Mailing Labels
              </div>
              <div className="grid grid-cols-2 gap-3">
                {report.mailingLabels
                  .filter((l: any) => l.address)
                  .map((l: any) => (
                    <div key={l.name} className="border border-black p-2 text-[10px] leading-tight break-words">
                      <div className="font-bold uppercase">{l.name}</div>
                      <div>{l.address}</div>
                      {l.mobile && <div>Mobile : {l.mobile}</div>}
                    </div>
                  ))}
              </div>
            </div>
          )}

        {/* Despatch List */}
        {formData.reportType === "Intimation" &&
          formData.intimationOptions.despatchList &&
          report.groupData.length > 0 && (
            <div className="pt-5 mt-4" style={{ borderTop: `1px solid ${BLACK}` }}>
              <div className="text-[11px] font-bold uppercase tracking-wider pb-2">
                Despatch List —{" "}
                {formData.intimationOptions.purpose || "Loan Principal Outstanding Recovery"}
              </div>
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="font-bold">
                    <th className="px-1 py-1" style={thStyle}>Sr</th>
                    <th className="px-1 py-1" style={thStyle}>Member Name</th>
                    <th className="px-1 py-1" style={thStyle}>Address</th>
                    <th className="px-1 py-1 text-center" style={thStyle}>Mobile</th>
                    <th className="px-1 py-1 text-center" style={thStyle}>Pcs</th>
                    <th className="px-1 py-1 text-right" style={thStyle}>Outstanding Due</th>
                    <th className="px-1 py-1 text-right" style={thStyle}>Cost / Pc</th>
                    <th className="px-1 py-1 text-right" style={thStyle}>Total Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {report.mailingLabels.map((l: any, i: number) => (
                    <tr key={l.name}>
                      <td className="px-1 py-0.5">{i + 1}</td>
                      <td className="px-1 py-0.5">{l.name}</td>
                      <td className="px-1 py-0.5 break-words">{l.address || "—"}</td>
                      <td className="px-1 py-0.5 text-center whitespace-nowrap">{l.mobile || "—"}</td>
                      <td className="px-1 py-0.5 text-center">{l.policyNos.length}</td>
                      <td className="px-1 py-0.5 text-right whitespace-nowrap">{money(l.outstanding)}</td>
                      <td className="px-1 py-0.5 text-right whitespace-nowrap">{money(costPerDespatch)}</td>
                      <td className="px-1 py-0.5 text-right font-mono whitespace-nowrap">
                        <span style={totalValueStyle}>{money(costPerDespatch * l.policyNos.length)}</span>
                      </td>
                    </tr>
                  ))}
                  <tr className="font-bold">
                    <td colSpan={5} className="px-1 pt-1.5 pb-1 text-right pr-3">Total Despatch Charges :</td>
                    <td colSpan={2} className="px-1 pt-1.5 pb-1 text-right pr-2">
                      {report.mailingLabels.length} Notice(s) @ ₹{money(costPerDespatch)} :
                    </td>
                    <td className="px-1 pt-1.5 pb-1 text-right font-mono whitespace-nowrap">
                      <span style={totalValueStyle}>
                        ₹ {money(report.mailingLabels.reduce((s: number, l: any) => s + costPerDespatch * l.policyNos.length, 0))}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

        {/* Legend footer */}
        <div className="pt-5 mt-4 space-y-1 text-[9px]" style={{ borderTop: `1px solid ${BLACK}` }}>
          <div className="flex flex-wrap gap-x-5 gap-y-0.5">
            <span><strong>Pl/Tm/Pt :</strong> Plan No / Term / Premium Paying Term</span>
            <span><strong>Ag Cd :</strong> Advisor Code</span>
            <span><strong>Brn :</strong> Branch Code</span>
            <span><strong>Rate :</strong> Interest % per annum</span>
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-0.5">
            <span><strong>Outstanding Due :</strong> Loan Amount − Principal Repaid up to {fmtDate(formData.calculationDate)}</span>
          </div>
          <div className="flex justify-between font-mono text-[8px] pt-1">
            <span>Statement Code: DSS000019899</span>
            <span>Generated via Loan Outstanding Engine</span>
          </div>
        </div>
      </div>
    </div>
  );
}
