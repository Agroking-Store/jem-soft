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
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm print:hidden">
        <div className="flex items-center gap-3">
          <button onClick={onBackToForm} className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-slate-500 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 transition uppercase tracking-wider">
            <ArrowLeft size={16} />
            <span>Edit Filters</span>
          </button>
          <span className="text-xs bg-blue-50 text-[#1877F2] font-bold px-3 py-1 rounded-full border border-blue-200 uppercase tracking-wider">
            Annuity {formData.reportType}
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
            Annuity {formData.reportType === "Statement" ? "Payout Statement" : "Intimation Summary"} as on{" "}
            {fmtDate(formData.reportDate) || fmtDate(new Date())}
          </span>
          {formData.reportType === "Intimation" && formData.dateFrom && (
            <span>Period: {fmtDate(formData.dateFrom)} to {fmtDate(formData.dateTo)}</span>
          )}
        </div>

        {formData.reportType === "Intimation" && (
          <div className="pb-1 flex flex-wrap gap-x-6">
            <span><strong>Purpose :</strong> {formData.intimationOptions.purpose || "Pension Intimation"}</span>
            <span><strong>Cost per despatch :</strong> ₹{formData.intimationOptions.costPerDespatch}</span>
          </div>
        )}

        {groupData.length === 0 ? (
          <div className="mt-6 py-16 text-center bg-slate-50 rounded-xl border border-slate-200 p-8 space-y-2">
            <h3 className="font-bold text-slate-800 text-sm">No Annuity Policies Found</h3>
            <p className="text-xs text-slate-500">There are no annuity policies matching your filter criteria.</p>
          </div>
        ) : (
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="font-bold">
                <th className="px-1 py-1" style={thStyle}>Sr<br />No</th>
                <th className="px-1 py-1" style={thStyle}>Policy No</th>
                <th className="px-1 py-1" style={thStyle}>Annuity Holder</th>
                <th className="px-1 py-1" style={thStyle}>Plan / Option</th>
                <th className="px-1 py-1 text-center" style={thStyle}>Mode</th>
                <th className="px-1 py-1 text-right" style={thStyle}>Pension<br />Amount (₹)</th>
                <th className="px-1 py-1 text-center" style={thStyle}>Payout<br />Date</th>
                <th className="px-1 py-1 text-center" style={thStyle}>Status</th>
              </tr>
            </thead>
            <tbody>
              {groupData.map((group) => (
                <Fragment key={group.groupCode}>
                  {formData.sortingOption === "groupsWise" && (
                    <tr>
                      <td colSpan={8} className="pt-3 pb-1 text-center text-[13px] font-bold">
                        {group.groupCode}: {group.groupHeadName}
                      </td>
                    </tr>
                  )}
                  {group.members.map((member: any) => (
                    <Fragment key={member.name}>
                      {formData.sortingOption !== "policyNoWise" && (
                        <tr>
                          <td colSpan={8} className="pt-2 pb-0.5">
                            <div className="text-[11px] font-bold">{member.name}</div>
                            {formData.reportType === "Statement" && (
                              <div className="text-[10px]">
                                {[
                                  formData.statementOptions.statementWithAddress && member.address && `Address : ${member.address}`,
                                  formData.statementOptions.statementWithTelNo && member.mobile && `Tel/Mob : ${member.mobile}`,
                                ].filter(Boolean).join("   ")}
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                      {member.policies.map((p: any) => (
                        <tr key={p.policyNo}>
                          <td className="px-1 py-0.5">{p.sr}</td>
                          <td className="px-1 py-0.5 font-mono whitespace-nowrap">{p.policyNo}</td>
                          <td className="px-1 py-0.5">{p.memberName}</td>
                          <td className="px-1 py-0.5">{p.planName}</td>
                          <td className="px-1 py-0.5 text-center">{p.mode}</td>
                          <td className="px-1 py-0.5 text-right font-bold whitespace-nowrap">{p.pensionAmount.toLocaleString("en-IN")}</td>
                          <td className="px-1 py-0.5 text-center whitespace-nowrap">{p.payoutDate}</td>
                          <td className="px-1 py-0.5 text-center">{p.neftStatus}</td>
                        </tr>
                      ))}
                      {formData.sortingOption !== "policyNoWise" && member.policies.length > 1 && (
                        <tr className="font-bold">
                          <td colSpan={5} className="px-1 pt-1.5 pb-1 text-right pr-3">Member Total Pension :</td>
                          <td className="px-1 pt-1.5 pb-1 text-right font-mono whitespace-nowrap">
                            <span style={totalValueStyle}>{member.totalAnnuityAmount.toLocaleString("en-IN")}</span>
                          </td>
                          <td colSpan={2}></td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                  {formData.sortingOption === "groupsWise" && (
                    <>
                      <tr className="font-bold">
                        <td colSpan={5} className="px-1 pt-1.5 pb-1 text-right pr-3">Group Total Pension Payout :</td>
                        <td className="px-1 pt-1.5 pb-1 text-right font-mono whitespace-nowrap">
                          <span style={totalValueStyle}>{group.totalAnnuityAmount.toLocaleString("en-IN")}</span>
                        </td>
                        <td colSpan={2}></td>
                      </tr>
                      <tr>
                        <td colSpan={8} style={{ borderBottom: `1px solid ${BLACK}`, height: 6 }}></td>
                      </tr>
                    </>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        )}

        {groupData.length > 0 && (
          <div className="pt-4 flex justify-end items-center gap-4 text-[12px] font-bold">
            <span>Grand Total Annuity Payout :</span>
            <span className="font-mono" style={totalValueStyle}>₹ {grandTotalAnnuity.toLocaleString("en-IN")}</span>
          </div>
        )}
      </div>
    </div>
  );
}