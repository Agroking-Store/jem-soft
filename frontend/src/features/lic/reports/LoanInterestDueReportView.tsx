"use client";

import { useRef, useState, useMemo, Fragment } from "react";
import { ArrowLeft, Download, FileSpreadsheet, Mail } from "lucide-react";
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

    const selectedAgencies = (formData.appliedFilters || [])
      .filter((f) => f.type === "Agencies")
      .map((f) => f.name.toLowerCase());
    const selectedStatuses = (formData.appliedFilters || [])
      .filter((f) => f.type === "Policy Status")
      .map((f) => f.name.toLowerCase());
    const selectedBranches = (formData.appliedFilters || [])
      .filter((f) => f.type === "Branches")
      .map((f) => f.name.toLowerCase());
    const selectedGroupCodesOrNames = (formData.selectedGroups || []).map((g) =>
      g.groupCode.toLowerCase()
    );

    // Prefer loans from loans state; fallback to policies if loans array is empty
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
              Math.floor((asOfDate.getTime() - validLastDate.getTime()) / (1000 * 60 * 60 * 24))
            );

        const annualRate = Number(loan.interestRate || 0);
        const interestDue =
          outstandingPrincipal > 0 && loan.loanStatus?.statusCode !== "PAID_OFF"
            ? Math.round(((outstandingPrincipal * annualRate * daysSince) / 36500) * 100) / 100
            : 0;

        const nextDueDate = getNextInterestDueDate(loan.loanDate, asOfDate);

        return {
          id: loan.id,
          policyNumber: policyObj.policyNumber || "N/A",
          policy: policyObj,
          customer: custObj,
          CustomerMaster: custMaster,
          planName: policyObj.product?.productName || "Life Insurance Policy",
          loanDate: loan.loanDate,
          loanAmount: Number(loan.loanAmount || 0),
          interestRate: annualRate,
          outstandingPrincipal,
          totalPrincipalRepaid,
          totalInterestPaid,
          interestDue,
          lastPaymentDate: validLastDate,
          nextDueDate,
          loanStatus: loan.loanStatus?.statusName || "Active",
          agencyName: policyObj.advisor?.agentCode || policyObj.advisor?.name || "",
          branchName: policyObj.branch?.branchName || "",
          statusName: policyObj.status?.statusName || "Inforce",
        };
      });
    } else {
      // Fallback if no loans in store yet
      sourceItems = rawPolicies
        .filter((p) => p.loans?.length > 0 || Number(p.loanAmount) > 0)
        .map((p, idx) => {
          const loanAmt = Number(p.loanAmount || 50000);
          const annualRate = 9.5;
          const loanDate = new Date(p.commencementDate || new Date());
          const daysSince = Math.max(
            0,
            Math.floor((asOfDate.getTime() - loanDate.getTime()) / (1000 * 60 * 60 * 24))
          );
          const interestDue = Math.round(((loanAmt * annualRate * daysSince) / 36500) * 100) / 100;
          return {
            id: `mock-${idx}`,
            policyNumber: p.policyNumber || `98${1000000 + idx}`,
            policy: p,
            customer: p.customer || {},
            CustomerMaster: p.CustomerMaster || {},
            planName: p.product?.productName || "Endowment Plan",
            loanDate: loanDate.toISOString(),
            loanAmount: loanAmt,
            interestRate: annualRate,
            outstandingPrincipal: loanAmt,
            totalPrincipalRepaid: 0,
            totalInterestPaid: 0,
            interestDue,
            lastPaymentDate: loanDate,
            nextDueDate: getNextInterestDueDate(loanDate.toISOString(), asOfDate),
            loanStatus: "Active",
            agencyName: p.agentCode || p.agency?.agencyName || "",
            branchName: p.branch?.branchName || "",
            statusName: p.status?.statusName || "Inforce",
          };
        });
    }

    // Apply filters
    const validItems = sourceItems.filter((item) => {
      // Status filter
      if (
        selectedStatuses.length > 0 &&
        !selectedStatuses.some((st) => item.statusName.toLowerCase().includes(st))
      ) {
        return false;
      }

      // Agency filter
      if (
        selectedAgencies.length > 0 &&
        !selectedAgencies.some((ag) => item.agencyName.toLowerCase().includes(ag))
      ) {
        return false;
      }

      // Branch filter
      if (
        selectedBranches.length > 0 &&
        !selectedBranches.some((b) => item.branchName.toLowerCase().includes(b))
      ) {
        return false;
      }

      // Group filter
      if (selectedGroupCodesOrNames.length > 0) {
        const gCode = (item.customer?.groupCode || "").toLowerCase();
        if (!selectedGroupCodesOrNames.some((sc) => gCode.includes(sc))) {
          return false;
        }
      }

      // Must have active outstanding balance or interest due
      if (item.outstandingPrincipal <= 0 && item.interestDue <= 0) {
        return false;
      }

      // Date Range filter (check nextDueDate or if interest is already overdue)
      if (fromDate && item.nextDueDate < fromDate && item.interestDue <= 0) {
        return false;
      }
      if (toDate && item.nextDueDate > toDate && item.interestDue <= 0) {
        return false;
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
        contact?.mobile1 || custObj?.phone || custObj?.mobile || "";
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

      {/* Main Report View */}
      <div
        ref={reportRef}
        className="bg-white p-8 rounded-2xl border border-slate-300 shadow-xl text-slate-900 font-sans max-w-5xl mx-auto space-y-4 print:p-0 print:border-none print:shadow-none"
      >
        {/* Letterhead */}
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
            <span className="text-[10px] font-bold text-[#E8C77A] uppercase tracking-widest">
              LIC INDIA
            </span>
          </div>
        </div>

        {/* Title */}
        <div className="bg-[#0B1220] text-white rounded-lg px-4 py-2.5 flex items-center justify-between border-l-4 border-[#B8873A]">
          <h2 className="text-base font-bold text-[#E8C77A] uppercase tracking-wider">
            Loan Interest Due {formData.reportType === "Statement" ? "Report" : "Intimation Notice"}
          </h2>
          <span className="text-xs font-bold text-slate-200">
            As on {fmtDate(formData.reportDate) || fmtDate(new Date())}
          </span>
        </div>

        {/* Intimation specific summary bar */}
        {formData.reportType === "Intimation" && (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs flex flex-wrap justify-between gap-2 font-medium">
            <span>
              <strong>Purpose:</strong> {formData.intimationOptions.purpose || "Loan Interest Due Remittance"}
            </span>
            <span>
              <strong>Cost per despatch:</strong> ₹{formData.intimationOptions.costPerDespatch}
            </span>
            {formData.dateFrom && (
              <span>
                <strong>Period:</strong> {fmtDate(formData.dateFrom)} to {fmtDate(formData.dateTo)}
              </span>
            )}
          </div>
        )}

        <div className="space-y-4 overflow-x-auto">
          {groupData.length === 0 ? (
            <div className="py-16 text-center bg-slate-50 rounded-xl border border-slate-200 p-8 space-y-2">
              <h3 className="font-bold text-slate-800 text-sm">No Loan Policies with Interest Due Found</h3>
              <p className="text-xs text-slate-500">
                There are no policy loans with pending interest due matching your filter criteria.
              </p>
            </div>
          ) : (
            <table className="w-full text-left text-[11px] border-collapse">
              <thead>
                <tr className="bg-slate-100 border-y-2 border-slate-800 font-bold text-slate-900">
                  <th className="py-2 px-2 w-10 text-center">Sr</th>
                  <th className="py-2 px-2">Policy No</th>
                  <th className="py-2 px-2">Policy Holder</th>
                  <th className="py-2 px-2">Plan</th>
                  <th className="py-2 px-2 text-right">Outstanding Principal (₹)</th>
                  <th className="py-2 px-2 text-center">Rate (% p.a.)</th>
                  <th className="py-2 px-2 text-center">Accruing From</th>
                  <th className="py-2 px-2 text-center">Next Due</th>
                  <th className="py-2 px-2 text-right">Interest Paid (₹)</th>
                  <th className="py-2 px-2 text-right text-red-600">Interest Due (₹)</th>
                </tr>
              </thead>
              <tbody>
                {groupData.map((group) => (
                  <Fragment key={group.groupCode}>
                    {formData.sortingOption !== "groupMemberwise" && (
                      <tr className="border-t-2 border-slate-400">
                        <td
                          colSpan={10}
                          className="bg-slate-100 font-bold text-xs py-1.5 px-2 border-b border-slate-300 text-[#0B1220]"
                        >
                          {group.groupHeadName}{" "}
                          {formData.sortingOption === "groupsWise" ? `[${group.groupCode}]` : ""}
                        </td>
                      </tr>
                    )}
                    {group.members.map((member: any) => (
                      <Fragment key={member.name}>
                        <tr>
                          <td
                            colSpan={10}
                            className="px-2 font-bold text-[11px] text-slate-800 py-1 bg-slate-50/40 border-b border-slate-200"
                          >
                            <div>{member.name}</div>
                            {formData.reportType === "Statement" && (
                              <div className="text-[10px] text-slate-500 font-normal mt-0.5">
                                {[
                                  formData.statementOptions.address &&
                                    member.address &&
                                    `Address: ${member.address}`,
                                  formData.statementOptions.mobile &&
                                    member.mobile &&
                                    `Mob: ${member.mobile}`,
                                  formData.statementOptions.dob &&
                                    member.dob &&
                                    `DOB: ${fmtDate(member.dob)}`,
                                ]
                                  .filter(Boolean)
                                  .join(" | ")}
                              </div>
                            )}
                            {formData.reportType === "Intimation" && (
                              <div className="text-[10px] text-slate-500 font-normal mt-0.5">
                                {[
                                  formData.intimationOptions.dob &&
                                    member.dob &&
                                    `DOB: ${fmtDate(member.dob)}`,
                                  formData.intimationOptions.includePrevArrear && `Includes Arrears`,
                                ]
                                  .filter(Boolean)
                                  .join(" | ")}
                              </div>
                            )}
                          </td>
                        </tr>
                        {member.policies.map((p: any) => (
                          <tr key={p.policyNo} className="hover:bg-slate-50 border-b border-slate-100">
                            <td className="py-1 px-2 text-center text-slate-500">{p.sr}</td>
                            <td className="py-1 px-2 font-mono font-semibold">{p.policyNo}</td>
                            <td className="py-1 px-2">{p.memberName}</td>
                            <td
                              className="py-1 px-2 text-slate-600 truncate max-w-[120px]"
                              title={p.planName}
                            >
                              {p.planName}
                            </td>
                            <td className="py-1 px-2 text-right font-mono text-slate-800 font-medium">
                              {p.outstandingPrincipal.toLocaleString("en-IN")}
                            </td>
                            <td className="py-1 px-2 text-center font-mono text-slate-600">
                              {p.interestRate}%
                            </td>
                            <td className="py-1 px-2 text-center font-mono text-slate-600">
                              {p.interestFromDate}
                            </td>
                            <td className="py-1 px-2 text-center font-mono font-medium text-slate-700">
                              {p.dueDate}
                            </td>
                            <td className="py-1 px-2 text-right font-mono text-emerald-700">
                              {p.interestPaid.toLocaleString("en-IN")}
                            </td>
                            <td className="py-1 px-2 text-right font-mono font-bold text-red-600">
                              {p.interestDue.toLocaleString("en-IN")}
                            </td>
                          </tr>
                        ))}
                        <tr className="border-t border-slate-300 font-bold text-[11px] bg-slate-50">
                          <td colSpan={4} className="text-right pr-4 py-1">
                            Member Total :
                          </td>
                          <td className="text-right py-1 font-mono text-slate-900">
                            {member.totalOutstanding.toLocaleString("en-IN")}
                          </td>
                          <td colSpan={4} className="text-right pr-2 py-1 text-slate-600">
                            Interest Due:
                          </td>
                          <td className="text-right py-1 font-mono text-red-600">
                            {member.totalInterestDue.toLocaleString("en-IN")}
                          </td>
                        </tr>
                      </Fragment>
                    ))}
                    {formData.sortingOption !== "groupMemberwise" && (
                      <tr className="bg-slate-200 border-t-2 border-slate-500 font-bold text-xs">
                        <td colSpan={4} className="px-3 py-1.5 text-right">
                          Group Total :
                        </td>
                        <td className="px-2 py-1.5 text-right font-mono text-[#0B1220]">
                          {group.totalOutstanding.toLocaleString("en-IN")}
                        </td>
                        <td colSpan={4} className="text-right pr-2 py-1.5 text-[#0B1220]">
                          Total Interest Due:
                        </td>
                        <td className="px-2 py-1.5 text-right font-mono text-red-700">
                          {group.totalInterestDue.toLocaleString("en-IN")}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {groupData.length > 0 && (
          <div className="pt-4 border-t-2 border-slate-400 flex flex-wrap justify-between items-center text-xs font-bold gap-4">
            <div className="flex items-center gap-4">
              <span>Grand Total Outstanding Principal:</span>
              <span className="font-mono text-base text-[#0B1220]">
                ₹ {grandTotalPrincipal.toLocaleString("en-IN")}
              </span>
            </div>
            <div className="flex items-center gap-4">
              <span>Grand Total Interest Due:</span>
              <span className="font-mono text-lg text-red-700 font-black">
                ₹ {grandTotalInterestDue.toLocaleString("en-IN")}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}