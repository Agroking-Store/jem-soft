"use client";

import { useRef, useState, useMemo, Fragment, ReactNode } from "react";
import { ArrowLeft, Download } from "lucide-react";
import { PolicyMaturityFormData } from "./PolicyMaturityForm";
import html2canvas from "html2canvas-pro";
import jsPDF from "jspdf";
import toast from "react-hot-toast";

interface PolicyMaturityReportViewProps {
  formData: PolicyMaturityFormData;
  policies: any[];
  customers: any[];
  onBackToForm: () => void;
}

// Bonus-estimation placeholders — tune these to your real declared bonus rates.
const VESTED_BONUS_RATE_PER_1000_PA = 45; // ₹ per ₹1000 SA per completed year
const FAB_RATE_PER_1000 = 15; // ₹ per ₹1000 SA, flat, applied once at maturity

function fmtDate(d: Date | string | null | undefined) {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  if (isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-GB");
}

interface ColumnDef {
  key: string;
  label: string;
  align?: "left" | "right" | "center";
  render: (p: any) => ReactNode;
}

export default function PolicyMaturityReportView({
  formData,
  policies: rawPolicies = [],
  onBackToForm,
}: PolicyMaturityReportViewProps) {
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
      { key: "maturityDate", label: "Maturity Date", render: (p) => p.maturityDate },
    ];
    if (formData.reportOptions.dob) {
      cols.push({ key: "dob", label: "D.O.B", align: "center", render: (p) => p.dob || "—" });
    }
    if (formData.reportOptions.statementWithPan) {
      cols.push({ key: "pan", label: "PAN No.", align: "center", render: (p) => p.pan || "—" });
    }
    cols.push(
      { key: "sumAssured", label: "Sum Assured", align: "right", render: (p) => p.sumAssured.toLocaleString("en-IN") },
      { key: "vestedBonus", label: "Vested Bonus", align: "right", render: (p) => p.vestedBonus.toLocaleString("en-IN") },
      { key: "fab", label: "F.A.B", align: "right", render: (p) => p.fab.toLocaleString("en-IN") },
      { key: "loanOutstanding", label: "Loan O/s", align: "right", render: (p) => p.loanOutstanding.toLocaleString("en-IN") },
      {
        key: "netMaturityPayable",
        label: "Net Maturity Payable",
        align: "right",
        render: (p) => <span className="font-bold">{p.netMaturityPayable.toLocaleString("en-IN")}</span>,
      }
    );
    return cols;
  }, [formData.reportOptions.dob, formData.reportOptions.statementWithPan]);

  const alignClass = (a?: "left" | "right" | "center") =>
    a === "right" ? "text-right" : a === "center" ? "text-center" : "text-left";

  const groupData = useMemo(() => {
    const fromDate = formData.fromMaturityDate ? new Date(formData.fromMaturityDate) : null;
    const toDate = formData.toMaturityDate ? new Date(formData.toMaturityDate) : null;

    if (fromDate) fromDate.setHours(0, 0, 0, 0);
    if (toDate) toDate.setHours(23, 59, 59, 999);

    const selectedGroupCodesOrNames =
      formData.sortingOption === "groupsWise"
        ? (formData.selectedGroups || []).map((g) => g.groupCode.toLowerCase())
        : (formData.sortingFilterSelection?.selectedItems || []).map((item) => (item.code || item.name).toLowerCase());

    const getPolicyMaturityDate = (p: any): Date | null => {
      if (p.maturityDate) {
        const d = new Date(p.maturityDate);
        if (!isNaN(d.getTime())) return d;
      }
      if (p.commencementDate && p.policyTerm) {
        const cd = new Date(p.commencementDate);
        if (!isNaN(cd.getTime())) {
          const md = new Date(cd);
          md.setFullYear(md.getFullYear() + Number(p.policyTerm));
          return md;
        }
      }
      return null;
    };

    const validDbPolicies = rawPolicies.filter((p) => {
      const isAnnuity = Boolean(p.product?.isAnnuity || p.isAnnuity);
      if (isAnnuity && !formData.includeAnnuityPolicies) return false;

      const isRecordOnly = Boolean(p.isRecordOnly);
      if (isRecordOnly && !formData.includeRecordOnlyPolicies) return false;

      const md = getPolicyMaturityDate(p);
      if (!md) return false;

      if (fromDate && md < fromDate) return false;
      if (toDate && md > toDate) return false;

      return true;
    });

    const buildRow = (p: any, computedMaturityDate: Date) => {
      const custMaster = p.CustomerMaster;
      const custObj = p.customer;
      const mode = p.premiumMode?.modeName?.[0]?.toUpperCase() || "Y";
      const sumAssured = Number(p.premium?.sumAssured || p.sumAssured || 0);
      const comDate = p.commencementDate ? new Date(p.commencementDate) : new Date();
      const completedYears = Math.max(
        1,
        Math.floor((computedMaturityDate.getTime() - comDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000))
      );
      const vestedBonus = Math.round((sumAssured / 1000) * VESTED_BONUS_RATE_PER_1000_PA * completedYears);
      const fab = Math.round((sumAssured / 1000) * FAB_RATE_PER_1000);
      const loanOutstanding = Number(p.loanOutstanding || 0);
      const netMaturityPayable = sumAssured + vestedBonus + fab - loanOutstanding;

      const memberPan = custMaster?.panNumber || custObj?.pan || "";
      const memberDob = fmtDate(custMaster?.dob || custObj?.dob);

      return {
        policyNo: p.policyNumber || "—",
        agCd: p.agentCode || "—",
        comDate: fmtDate(comDate) || "—",
        planTermPpt: `${p.product?.planNumber || "—"}/${p.policyTerm || "—"}/${p.premiumPayingTerm || "—"}`,
        md: mode,
        brn: p.branch?.branchCode || p.branchNo || "—",
        maturityDate: fmtDate(computedMaturityDate),
        dob: memberDob,
        pan: memberPan,
        sumAssured,
        vestedBonus,
        fab,
        loanOutstanding,
        netMaturityPayable,
      };
    };

    if (validDbPolicies.length === 0) {
      return [];
    }

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

      const md = getPolicyMaturityDate(p) || new Date();

      if (!groupMap[gCode]) {
        groupMap[gCode] = { groupCode: gCode, groupHeadName: gHeadName, membersMap: {}, totalPolicies: 0, totalNetPayable: 0 };
      }
      const grp = groupMap[gCode];

      if (!grp.membersMap[memberName]) {
        grp.membersMap[memberName] = {
          name: memberName,
          mobile: memberMobile,
          email: memberEmail,
          address: memberAddress,
          policies: [],
          totalNetPayable: 0,
        };
      }
      const mem = grp.membersMap[memberName];

      const row = buildRow(p, md);
      mem.policies.push(row);
      mem.totalNetPayable += row.netMaturityPayable;
      grp.totalPolicies += 1;
      grp.totalNetPayable += row.netMaturityPayable;
    });

    return Object.values(groupMap).map((grp: any) => ({ ...grp, members: Object.values(grp.membersMap) }));
  }, [rawPolicies, formData]);

  const grandTotal = groupData.reduce((acc, g) => acc + g.totalNetPayable, 0);
  const grandPolicies = groupData.reduce((acc, g) => acc + g.totalPolicies, 0);

  const getReportHeaderTitle = () => {
    switch (formData.sortingOption) {
      case "groupMemberwise":
        return "Memberwise";
      case "branchNoWise":
        return "Branchwise";
      case "maturityDatewise":
        return "Maturity Datewise";
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
      pdf.save(`Policy_Maturity_${formData.reportDate || "Report"}.pdf`);
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
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-[#0B1220] p-4 rounded-2xl border border-slate-800 shadow-xl print:hidden">
        <div className="flex items-center gap-3">
          <button onClick={onBackToForm} className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-slate-300 bg-white/10 rounded-xl hover:bg-white/20 transition uppercase tracking-wider">
            <ArrowLeft size={16} />
            <span>Edit Filters</span>
          </button>
          <span className="text-xs bg-[#B8873A]/20 text-[#E8C77A] font-bold px-3 py-1 rounded-full border border-[#B8873A]/30 uppercase tracking-wider">{getReportHeaderTitle()}</span>
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

      <div ref={reportRef} className="bg-white p-8 rounded-2xl border border-slate-300 shadow-xl text-slate-900 font-sans max-w-6xl mx-auto space-y-4 print:p-0 print:border-none print:shadow-none">
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

        <div className="bg-[#0B1220] text-white rounded-lg px-4 py-2.5 flex items-center justify-between border-l-4 border-[#B8873A]">
          <h2 className="text-base font-serif font-bold text-[#E8C77A] uppercase tracking-wider">Policy Maturity Statement</h2>
          <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">{getReportHeaderTitle()}</span>
        </div>

        <div className="text-[11px] font-semibold text-slate-800 px-1 flex justify-between">
          <span>Date of Report: {fmtDate(formData.reportDate) || fmtDate(new Date())}</span>
          <span>
            Maturities between {fmtDate(formData.fromMaturityDate)} and {fmtDate(formData.toMaturityDate)}
          </span>
        </div>

        <div className="space-y-4 overflow-x-auto">
          {groupData.length === 0 ? (
            <div className="py-16 text-center bg-slate-50 rounded-xl border border-slate-200 p-8 space-y-2">
              <h3 className="font-bold text-slate-800 text-sm">No Maturing Policies Found</h3>
              <p className="text-xs text-slate-500">
                There are no policies maturing in the selected date range matching your filter criteria.
              </p>
            </div>
          ) : (
            <table className="w-full text-left text-[11px] border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-slate-100 border-y-2 border-slate-800 font-bold text-slate-900">
                  {columns.map((col) => (
                    <th key={col.key} className={`py-2 px-1 ${alignClass(col.align)}`}>{col.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {groupData.map((group) => (
                  <Fragment key={group.groupCode}>
                    <tr className="border-t-2 border-slate-400">
                      <td colSpan={columns.length} className="text-center bg-slate-100 font-bold text-xs py-1.5 px-2 border-b border-slate-300 text-slate-900">
                        {group.groupCode}: {group.groupHeadName}
                      </td>
                    </tr>
                    {group.members.map((member: any) => (
                      <Fragment key={member.name}>
                        <tr>
                          <td colSpan={columns.length} className="px-2 font-bold text-[11px] text-slate-800 py-1 bg-slate-50/40 border-b border-slate-200">
                            <div>{member.name}</div>
                            {(formData.reportOptions.printAddress || formData.reportOptions.printTelNo) && (
                              <div className="text-[10px] text-slate-500 font-normal mt-0.5">
                                {[
                                  formData.reportOptions.printAddress && member.address && `Address: ${member.address}`,
                                  formData.reportOptions.printTelNo && member.mobile && `Tel/Mob: ${member.mobile}`,
                                ].filter(Boolean).join(" | ")}
                              </div>
                            )}
                          </td>
                        </tr>
                        {member.policies.map((p: any) => (
                          <tr key={p.policyNo} className="hover:bg-slate-50 divide-x divide-slate-100">
                            {columns.map((col) => (
                              <td key={col.key} className={`py-1 px-1 ${alignClass(col.align)}`}>{col.render(p)}</td>
                            ))}
                          </tr>
                        ))}
                        <tr className="border-t border-slate-300 font-bold text-[11px] bg-slate-50">
                          <td colSpan={columns.length - 1} className="text-right pr-4 py-1">Member Total :</td>
                          <td className="text-right py-1 font-mono text-[#0B1220]">{member.totalNetPayable.toLocaleString("en-IN")}</td>
                        </tr>
                      </Fragment>
                    ))}
                    <tr className="bg-slate-200 border-t-2 border-slate-500 font-bold text-xs">
                      <td colSpan={columns.length - 1} className="px-3 py-1.5">Total No. of Policies for this Group : {group.totalPolicies}</td>
                      <td className="px-1 py-1.5 text-right font-mono text-[#0B1220]">{group.totalNetPayable.toLocaleString("en-IN")}</td>
                    </tr>
                  </Fragment>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {groupData.length > 0 && (
          <div className="pt-4 flex justify-end">
            <div className="w-full max-w-sm border-2 border-slate-800 rounded overflow-hidden">
              <table className="w-full text-left text-xs font-semibold">
                <tbody className="divide-y divide-slate-300">
                  <tr className="bg-slate-100 font-bold">
                    <td className="p-2 border-r border-slate-400">Grand Total (Net Payable)</td>
                    <td className="p-2 text-right font-mono">{grandTotal.toLocaleString("en-IN")}</td>
                  </tr>
                  <tr className="bg-slate-50 font-bold">
                    <td className="p-2 border-r border-slate-400">Total No. of Policies</td>
                    <td className="p-2 text-right font-mono">{grandPolicies}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="pt-6 border-t border-slate-300 space-y-1 text-[10px] text-slate-700 font-medium">
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            <span><strong className="font-bold">Y :</strong> Policies with NACH Mode</span>
            <span><strong className="font-bold">A :</strong> Policies with APPS Mode</span>
            <span><strong className="font-bold">ρ :</strong> Pan Card is register for the Policy</span>
          </div>
          <p>
            Vested Bonus &amp; F.A.B are estimated at placeholder rates (₹{VESTED_BONUS_RATE_PER_1000_PA}/1000 SA p.a. and ₹{FAB_RATE_PER_1000}/1000 SA) — replace with your declared bonus rate table for accurate figures.
          </p>
          <div className="flex justify-between items-center pt-2 font-mono text-[9px] text-slate-500 border-t border-slate-200">
            <span>DSS000019899</span>
            <span>Generated via Policy Maturity Engine</span>
          </div>
        </div>
      </div>
    </div>
  );
}