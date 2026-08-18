"use client";

import { useRef, useState, useMemo, Fragment } from "react";
import { ArrowLeft, Download } from "lucide-react";
import { AnnuityStatementFormData } from "./AnnuityStatementForm";
import html2canvas from "html2canvas-pro";
import jsPDF from "jspdf";
import toast from "react-hot-toast";

interface AnnuityStatementReportViewProps {
  formData: AnnuityStatementFormData;
  policies: any[];
  customers: any[];
  onBackToForm: () => void;
}

function fmtDate(d: Date | string | null | undefined) {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  if (isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-GB");
}

function getPolicyMemberName(p: any): string {
  if (p.lifeAssured) {
    if (typeof p.lifeAssured === "string") return p.lifeAssured;
    const salutation = p.lifeAssured.salutation ? `${p.lifeAssured.salutation} ` : "";
    const fullName = [p.lifeAssured.firstName, p.lifeAssured.middleName, p.lifeAssured.lastName]
      .filter(Boolean)
      .join(" ");
    if (fullName.trim()) return `${salutation}${fullName.trim()}`;
    if (p.lifeAssured.name) return p.lifeAssured.name;
  }

  if (p.CustomerMaster) {
    const salutation = p.CustomerMaster.salutation ? `${p.CustomerMaster.salutation} ` : "";
    const fullName = [p.CustomerMaster.firstName, p.CustomerMaster.middleName, p.CustomerMaster.lastName]
      .filter(Boolean)
      .join(" ");
    if (fullName.trim()) return `${salutation}${fullName.trim()}`;
    if (p.CustomerMaster.name) return p.CustomerMaster.name;
  }

  if (p.lifeAssuredName && typeof p.lifeAssuredName === "string") return p.lifeAssuredName;
  if (p.holderName && typeof p.holderName === "string") return p.holderName;
  if (p.insuredName && typeof p.insuredName === "string") return p.insuredName;

  if (p.customer?.name) return p.customer.name;

  return "Annuity Holder";
}

export default function AnnuityStatementReportView({
  formData,
  policies: rawPolicies = [],
  customers: rawCustomers = [],
  onBackToForm,
}: AnnuityStatementReportViewProps) {
  const reportRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  const groupData = useMemo(() => {
    const fromDate = formData.dateFrom ? new Date(formData.dateFrom) : null;
    const toDate = formData.dateTo ? new Date(formData.dateTo) : null;

    if (fromDate) fromDate.setHours(0, 0, 0, 0);
    if (toDate) toDate.setHours(23, 59, 59, 999);

    const selectedAgencies = (formData.appliedFilters || []).filter((f) => f.type === "Agencies").map((f) => f.name.toLowerCase());
    const selectedStatuses = (formData.appliedFilters || []).filter((f) => f.type === "Policy Status").map((f) => f.name.toLowerCase());

    const selectedFilterCodesOrNames =
      formData.sortingOption === "groupsWise"
        ? (formData.selectedGroups || []).map((g) => g.groupCode.toLowerCase())
        : (formData.sortingFilterSelection?.selectedItems || []).map((item) => (item.code || item.name).toLowerCase());

    const validPolicies = rawPolicies.filter((p) => {
      const rawStatus = (p.status?.statusName || p.statusName || "Inforce").toLowerCase();
      if (selectedStatuses.length > 0 && !selectedStatuses.some((st) => rawStatus.includes(st))) return false;

      const agencyName = (p.agentCode || p.agency?.agencyName || p.agencyName || "").toLowerCase();
      if (selectedAgencies.length > 0 && !selectedAgencies.some((ag) => agencyName.includes(ag))) return false;

      if (selectedFilterCodesOrNames.length > 0) {
        const gCode = (p.customer?.groupCode || "").toLowerCase();
        const gHeadName = (p.customer?.groupName || p.customer?.name || "").toLowerCase();
        const polNo = (p.policyNumber || "").toLowerCase();
        const memName = getPolicyMemberName(p).toLowerCase();

        const matches = selectedFilterCodesOrNames.some(
          (sc) => gCode.includes(sc) || gHeadName.includes(sc) || polNo.includes(sc) || memName.includes(sc)
        );
        if (!matches) return false;
      }

      return true;
    });

    const groupMap: { [key: string]: any } = {};

    validPolicies.forEach((p, idx) => {
      const custObj = p.customer;
      
      let gCode = custObj?.groupCode || `A-${(p.clientId || "01").toString().padStart(3, "0")}`;
      let gHeadName = custObj?.groupName || custObj?.name || "Annuity Holder Group";
      const memberName = getPolicyMemberName(p);
      const memberMobile = p.lifeAssured?.mobile || p.CustomerMaster?.contactInfo?.mobile1 || custObj?.mobile || custObj?.mobile1 || "";
      const memberAddress = custObj?.address || "";
      const policyNo = p.policyNumber || `98${1000000 + idx}`;

      if (formData.sortingOption === "policyNoWise") {
        gCode = policyNo;
        gHeadName = memberName;
      } else if (formData.sortingOption === "groupMemberwise") {
        gCode = `${gCode}_${memberName}`;
        gHeadName = memberName;
      }

      if (!groupMap[gCode]) {
        groupMap[gCode] = { groupCode: gCode, groupHeadName: gHeadName, membersMap: {}, totalAnnuityAmount: 0 };
      }

      const grp = groupMap[gCode];
      if (!grp.membersMap[memberName]) {
        grp.membersMap[memberName] = {
          name: memberName,
          mobile: memberMobile,
          address: memberAddress,
          policies: [],
          totalAnnuityAmount: 0,
        };
      }

      const mem = grp.membersMap[memberName];
      const sumAssured = Number(p.premium?.sumAssured || p.sumAssured || 500000);
      const pensionAmount = Math.round(sumAssured * 0.07);
      const mode = p.premiumMode?.modeName || "Yearly";
      const planName = p.product?.productName || "Jeevan Akshay / Annuity Plan";
      const payoutDate = fmtDate(p.nextPremiumDueDate || p.commencementDate || new Date());

      const row = {
        sr: idx + 1,
        policyNo,
        memberName,
        planName,
        mode,
        pensionAmount,
        payoutDate,
        neftStatus: "NEFT Registered",
      };

      mem.policies.push(row);
      mem.totalAnnuityAmount += pensionAmount;
      grp.totalAnnuityAmount += pensionAmount;
    });

    return Object.values(groupMap).map((grp: any) => ({
      ...grp,
      members: Object.values(grp.membersMap),
    }));
  }, [rawPolicies, formData]);

  const grandTotalAnnuity = groupData.reduce((acc, g) => acc + g.totalAnnuityAmount, 0);

  const handleDownloadPDF = async () => {
    if (!reportRef.current) return;
    setIsExporting(true);
    const toastId = toast.loading("Generating PDF statement...");
    try {
      const canvas = await html2canvas(reportRef.current, { scale: 2, useCORS: true, allowTaint: true, backgroundColor: "#ffffff", logging: false });
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
      pdf.save(`Annuity_${formData.reportType}_${formData.reportDate || "Report"}.pdf`);
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
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-[#0B1220] p-4 rounded-2xl border border-slate-800 shadow-xl print:hidden">
        <div className="flex items-center gap-3">
          <button onClick={onBackToForm} className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-slate-300 bg-white/10 rounded-xl hover:bg-white/20 transition uppercase tracking-wider">
            <ArrowLeft size={16} />
            <span>Edit Filters</span>
          </button>
          <span className="text-xs bg-[#B8873A]/20 text-[#E8C77A] font-bold px-3 py-1 rounded-full border border-[#B8873A]/30 uppercase tracking-wider">
            Annuity {formData.reportType}
          </span>
        </div>
        <button
          onClick={handleDownloadPDF}
          disabled={isExporting}
          className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-[#B8873A] to-[#D9AE63] text-[#0B1220] font-bold text-xs rounded-xl shadow-lg hover:brightness-105 transition disabled:opacity-50 uppercase tracking-wider"
        >
          <Download size={16} />
          <span>{isExporting ? "Exporting..." : "Download PDF"}</span>
        </button>
      </div>

      {/* Main Report View */}
      <div ref={reportRef} className="bg-white p-8 rounded-2xl border border-slate-300 shadow-xl text-slate-900 font-sans max-w-5xl mx-auto space-y-4 print:p-0 print:border-none print:shadow-none">
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
          <h2 className="text-base font-serif font-bold text-[#E8C77A] uppercase tracking-wider">
            Annuity {formData.reportType === "Statement" ? "Payout Statement" : "Intimation Summary"}
          </h2>
          <span className="text-xs font-bold text-slate-200">As on {fmtDate(formData.reportDate) || fmtDate(new Date())}</span>
        </div>

        {/* Intimation specific summary bar */}
        {formData.reportType === "Intimation" && (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs flex flex-wrap justify-between gap-2 font-medium">
            <span><strong>Purpose:</strong> {formData.intimationOptions.purpose || "Pension Intimation"}</span>
            <span><strong>Cost per despatch:</strong> ₹{formData.intimationOptions.costPerDespatch}</span>
            {formData.dateFrom && <span><strong>Period:</strong> {fmtDate(formData.dateFrom)} to {fmtDate(formData.dateTo)}</span>}
          </div>
        )}

        <div className="space-y-4 overflow-x-auto">
          {groupData.length === 0 ? (
            <div className="py-16 text-center bg-slate-50 rounded-xl border border-slate-200 p-8 space-y-2">
              <h3 className="font-bold text-slate-800 text-sm">No Annuity Policies Found</h3>
              <p className="text-xs text-slate-500">
                There are no annuity policies matching your filter criteria.
              </p>
            </div>
          ) : (
            <table className="w-full text-left text-[11px] border-collapse">
              <thead>
                <tr className="bg-slate-100 border-y-2 border-slate-800 font-bold text-slate-900">
                  <th className="py-2 px-2">Sr No</th>
                  <th className="py-2 px-2">Policy No</th>
                  <th className="py-2 px-2">Annuity Holder</th>
                  <th className="py-2 px-2">Plan / Option</th>
                  <th className="py-2 px-2 text-center">Mode</th>
                  <th className="py-2 px-2 text-right">Pension Amount (₹)</th>
                  <th className="py-2 px-2 text-center">Payout Date</th>
                  <th className="py-2 px-2 text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {groupData.map((group) => (
                  <Fragment key={group.groupCode}>
                    {formData.sortingOption === "groupsWise" && (
                      <tr className="border-t-2 border-slate-400">
                        <td colSpan={8} className="text-center bg-slate-100 font-bold text-xs py-1.5 px-2 border-b border-slate-300 text-slate-900">
                          {group.groupCode}: {group.groupHeadName}
                        </td>
                      </tr>
                    )}
                    {group.members.map((member: any) => (
                      <Fragment key={member.name}>
                        {formData.sortingOption !== "policyNoWise" && (
                          <tr>
                            <td colSpan={8} className="px-2 font-bold text-[11px] text-slate-800 py-1 bg-slate-50/40 border-b border-slate-200">
                              <div>{member.name}</div>
                              {formData.reportType === "Statement" && (
                                <div className="text-[10px] text-slate-500 font-normal mt-0.5">
                                  {[
                                    formData.statementOptions.statementWithAddress && member.address && `Address: ${member.address}`,
                                    formData.statementOptions.statementWithTelNo && member.mobile && `Tel/Mob: ${member.mobile}`,
                                  ].filter(Boolean).join(" | ")}
                                </div>
                              )}
                            </td>
                          </tr>
                        )}
                        {member.policies.map((p: any) => (
                          <tr key={p.policyNo} className="hover:bg-slate-50 border-b border-slate-100">
                            <td className="py-1 px-2">{p.sr}</td>
                            <td className="py-1 px-2 font-mono font-semibold">{p.policyNo}</td>
                            <td className="py-1 px-2">{p.memberName}</td>
                            <td className="py-1 px-2">{p.planName}</td>
                            <td className="py-1 px-2 text-center">{p.mode}</td>
                            <td className="py-1 px-2 text-right font-mono font-bold">{p.pensionAmount.toLocaleString("en-IN")}</td>
                            <td className="py-1 px-2 text-center font-mono">{p.payoutDate}</td>
                            <td className="py-1 px-2 text-center text-xs font-semibold text-emerald-700">{p.neftStatus}</td>
                          </tr>
                        ))}
                        {formData.sortingOption !== "policyNoWise" && (
                          <tr className="border-t border-slate-300 font-bold text-[11px] bg-slate-50">
                            <td colSpan={5} className="text-right pr-4 py-1">Member Total Pension :</td>
                            <td className="text-right py-1 font-mono text-[#0B1220]">{member.totalAnnuityAmount.toLocaleString("en-IN")}</td>
                            <td colSpan={2}></td>
                          </tr>
                        )}
                      </Fragment>
                    ))}
                    {formData.sortingOption === "groupsWise" && (
                      <tr className="bg-slate-200 border-t-2 border-slate-500 font-bold text-xs">
                        <td colSpan={5} className="px-3 py-1.5">Group Total Pension Payout :</td>
                        <td className="px-2 py-1.5 text-right font-mono text-[#0B1220]">{group.totalAnnuityAmount.toLocaleString("en-IN")}</td>
                        <td colSpan={2}></td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {groupData.length > 0 && (
          <div className="pt-4 border-t border-slate-300 flex justify-between items-center text-xs font-bold">
            <span>Grand Total Annuity Payout:</span>
            <span className="font-mono text-base text-[#0B1220]">₹ {grandTotalAnnuity.toLocaleString("en-IN")}</span>
          </div>
        )}
      </div>
    </div>
  );
}
