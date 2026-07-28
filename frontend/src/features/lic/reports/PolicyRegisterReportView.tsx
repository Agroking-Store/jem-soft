"use client";

import { useRef, useState, useMemo } from "react";
import { ArrowLeft, Printer, Download, AlertCircle } from "lucide-react";
import { PolicyRegisterFormData } from "./PolicyRegisterForm";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import toast from "react-hot-toast";

interface PolicyRegisterReportViewProps {
  formData: PolicyRegisterFormData;
  policies: any[];
  customers: any[];
  onBackToForm: () => void;
}

export default function PolicyRegisterReportView({
  formData,
  policies: rawPolicies = [],
  customers: rawCustomers = [],
  onBackToForm,
}: PolicyRegisterReportViewProps) {
  const reportRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  // Group and STRICTLY FILTER policies based on selected customer groups!
  const groupData = useMemo(() => {
    const groupMap: { [key: string]: any } = {};

    // Determine target filter group codes if specific groups were checked in modal
    const selectedGroupCodes = (formData.selectedGroups || []).map((g) => g.groupCode.toLowerCase());
    const hasGroupFilter = selectedGroupCodes.length > 0;

    rawPolicies.forEach((p) => {
      const gCode = p.customer?.groupCode || `GRP-${p.clientId || "DEF"}`;
      const gHeadName = p.customer?.groupName || p.customer?.name || "General Customer Group";

      // STRICT FILTERING: Check if this policy's group code or head name matches user selection!
      if (hasGroupFilter) {
        const matchesCode = selectedGroupCodes.includes(gCode.toLowerCase());
        const matchesName = selectedGroupCodes.some((code) => gHeadName.toLowerCase().includes(code));
        if (!matchesCode && !matchesName) {
          return; // Skip policy if not selected by user!
        }
      }

      const memberName = p.CustomerMaster
        ? `${p.CustomerMaster.salutation || ""} ${p.CustomerMaster.firstName} ${p.CustomerMaster.lastName}`.trim()
        : p.customer?.name || "Policy Holder";

      const dob = p.CustomerMaster?.dob
        ? new Date(p.CustomerMaster.dob).toLocaleDateString("en-GB")
        : "";

      if (!groupMap[gCode]) {
        groupMap[gCode] = {
          groupCode: gCode,
          groupHeadName: gHeadName,
          membersMap: {},
          totalPolicies: 0,
          groupTotalPa: 0,
          groupTotalSum: 0,
          groupTotalAcc: 0,
        };
      }

      const grp = groupMap[gCode];
      if (!grp.membersMap[memberName]) {
        grp.membersMap[memberName] = {
          name: memberName,
          dob: dob,
          policies: [],
          memberTotalPa: 0,
          memberTotalSum: 0,
          memberTotalAcc: 0,
        };
      }

      const mem = grp.membersMap[memberName];

      const mode = p.premiumMode?.modeName?.[0]?.toUpperCase() || "Y";
      const sumAssured = Number(p.premium?.sumAssured || 0);
      const instPremium = Number(p.premium?.installmentPremium || p.premium?.totalInstallmentPremium || 0);
      let multiplier = 1;
      if (mode === "M") multiplier = 12;
      else if (mode === "Q") multiplier = 4;
      else if (mode === "H") multiplier = 2;

      const pa = instPremium * multiplier;
      const acc = sumAssured;

      mem.policies.push({
        policyNo: p.policyNumber || "N/A",
        agCd: p.agentCode || "A",
        comDate: p.commencementDate
          ? new Date(p.commencementDate).toLocaleDateString("en-GB")
          : "",
        planTermPpt: `${p.product?.planNumber || "836"}/${p.policyTerm || 25}/${
          p.premiumPayingTerm || 16
        }`,
        fupDate: p.nextPremiumDueDate
          ? new Date(p.nextPremiumDueDate).toLocaleDateString("en-GB", {
              month: "2-digit",
              year: "2-digit",
            })
          : "Inforce",
        status: p.status?.statusName || "Inforce",
        matDate: p.maturityDate
          ? new Date(p.maturityDate).toLocaleDateString("en-GB", {
              month: "2-digit",
              year: "2-digit",
            })
          : "",
        brn: p.branch?.branchCode || "955",
        md: mode,
        premium: `${instPremium.toFixed(2)}P`,
        paPremium: pa,
        sumAssured: sumAssured,
        accBenefit: acc,
        taxBen: "",
        nominee: p.nominees?.[0]?.nomineeName || "Nominee",
        isSingleMode: mode === "S",
      });

      mem.memberTotalPa += pa;
      mem.memberTotalSum += sumAssured;
      mem.memberTotalAcc += acc;

      grp.totalPolicies += 1;
      grp.groupTotalPa += pa;
      grp.groupTotalSum += sumAssured;
      grp.groupTotalAcc += acc;
    });

    return Object.values(groupMap).map((grp: any) => ({
      ...grp,
      members: Object.values(grp.membersMap),
    }));
  }, [rawPolicies, formData.selectedGroups]);

  // Summary Totals
  const grandTotalPa = groupData.reduce((acc, g) => acc + g.groupTotalPa, 0);
  const grandTotalSum = groupData.reduce((acc, g) => acc + g.groupTotalSum, 0);
  const grandTotalAcc = groupData.reduce((acc, g) => acc + g.groupTotalAcc, 0);
  const grandTotalPolicies = groupData.reduce((acc, g) => acc + g.totalPolicies, 0);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    if (!reportRef.current) return;
    setIsExporting(true);
    const toastId = toast.loading("Generating PDF report...");

    try {
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        useCORS: true,
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

      pdf.save(`Policy_Register_${formData.reportDate || "Report"}.pdf`);
      toast.success("PDF downloaded successfully!", { id: toastId });
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate PDF.", { id: toastId });
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
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold uppercase tracking-wider text-slate-700 bg-slate-100 rounded-xl hover:bg-slate-200 transition"
          >
            <ArrowLeft size={16} />
            <span>Edit Filters</span>
          </button>
          <span className="text-xs bg-[#B8873A]/10 text-[#B8873A] font-bold px-3 py-1 rounded-full border border-[#B8873A]/20">
            {formData.selectedGroups.length > 0
              ? `Filtered: ${formData.selectedGroups.length} Customer Group(s)`
              : "All Database Customers"}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 border border-slate-300 text-slate-800 font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-slate-50 transition"
          >
            <Printer size={16} />
            <span>Print</span>
          </button>

          <button
            onClick={handleDownloadPDF}
            disabled={isExporting}
            className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-[#B8873A] to-[#D9AE63] text-[#0B1220] font-bold text-xs uppercase tracking-wider rounded-xl shadow-md hover:brightness-105 transition disabled:opacity-50"
          >
            <Download size={16} />
            <span>{isExporting ? "Generating..." : "Download PDF"}</span>
          </button>
        </div>
      </div>

      {/* Main Printable Document Layout */}
      <div
        ref={reportRef}
        className="bg-white p-8 rounded-2xl border border-slate-300 shadow-xl text-slate-900 font-sans max-w-5xl mx-auto space-y-4 print:p-0 print:border-none print:shadow-none"
      >
        {/* Advisor Header Section */}
        <div className="flex justify-between items-start border-b-2 border-slate-900 pb-3">
          <div className="space-y-0.5">
            <h1 className="text-2xl font-bold text-[#0B1220] tracking-tight">Jayant Mahabole</h1>
            <p className="text-xs font-semibold text-[#B8873A]">MBA in Insurance & Finance</p>
            <p className="text-[11px] text-slate-600 max-w-xs leading-tight">
              84/2, Darpan Bldg., 201 Sarang Society, Sahakarnagar No. 2 Parvati Pune 411009
            </p>
            <p className="text-[11px] text-slate-600 font-mono">9822452896</p>
            <p className="text-[11px] text-slate-600">office@jayantmahbole.com</p>
          </div>
        </div>

        {/* Title Banner */}
        <div className="bg-[#0B1220] text-white rounded-lg px-4 py-2.5 flex items-center justify-between">
          <h2 className="text-base font-serif font-bold text-[#E8C77A] uppercase tracking-wider">
            Policy Register
          </h2>
          <span className="text-xs font-semibold text-slate-200">Groupwise Report</span>
        </div>

        <div className="text-xs font-semibold text-slate-800 px-1">
          Date : {formData.reportDate ? new Date(formData.reportDate).toLocaleDateString("en-GB") : new Date().toLocaleDateString("en-GB")}
        </div>

        {/* Groupwise Table */}
        <div className="space-y-4">
          {groupData.length === 0 ? (
            <div className="py-16 text-center border-2 border-dashed border-slate-200 rounded-2xl space-y-2">
              <AlertCircle size={32} className="mx-auto text-slate-400" />
              <h3 className="font-bold text-slate-700">No policy records found for selected filter</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Ensure policies are assigned to the selected customer group in the database, or select "All Groups" in sorting options.
              </p>
            </div>
          ) : (
            <table className="w-full text-left text-[11px] border-collapse">
              <thead>
                <tr className="bg-slate-100 border-y-2 border-slate-800 font-bold text-slate-900">
                  <th className="py-2 px-1 text-right">Policy No.</th>
                  <th className="py-2 px-1 text-center">Ag Cd</th>
                  <th className="py-2 px-1">Com. Date</th>
                  <th className="py-2 px-1">Pl/Tm/Pt</th>
                  <th className="py-2 px-1">FUP Date</th>
                  <th className="py-2 px-1">Status</th>
                  <th className="py-2 px-1">Mat.Date</th>
                  <th className="py-2 px-1">Brn</th>
                  <th className="py-2 px-1 text-center">Md</th>
                  <th className="py-2 px-1 text-right">Premium</th>
                  <th className="py-2 px-1 text-right">Sum</th>
                  <th className="py-2 px-1 text-right">Acc. Benefit</th>
                  <th className="py-2 px-1 text-center">Tax Ben.</th>
                  <th className="py-2 px-1">Nominee</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200">
                {groupData.map((group) => (
                  <tr key={group.groupCode} className="border-t-2 border-slate-400">
                    <td colSpan={14} className="p-0">
                      <div className="bg-slate-100 font-bold text-xs py-1.5 px-3 border-b border-slate-300 text-slate-900">
                        {group.groupCode}: {group.groupHeadName}
                      </div>

                      {group.members.map((member: any) => (
                        <div key={member.name} className="py-1">
                          {/* Member Header */}
                          <div className="flex justify-between px-2 font-bold text-[11px] text-slate-800 py-1">
                            <span>{member.name}</span>
                            {member.dob && <span>DOB : {member.dob}</span>}
                          </div>

                          {/* Policy Rows */}
                          <table className="w-full text-left text-[11px]">
                            <tbody>
                              {member.policies.map((p: any) => (
                                <tr key={p.policyNo} className="hover:bg-slate-50">
                                  <td className="py-1 px-1 text-right font-mono font-medium w-24">
                                    {p.policyNo}
                                  </td>
                                  <td className="py-1 px-1 text-center font-semibold w-10">{p.agCd}</td>
                                  <td className="py-1 px-1 w-20">{p.comDate}</td>
                                  <td className="py-1 px-1 w-20 font-medium">{p.planTermPpt}</td>
                                  <td className="py-1 px-1 w-24 font-medium text-slate-700">
                                    {p.fupDate}
                                  </td>
                                  <td className="py-1 px-1 w-20 font-semibold text-slate-800">
                                    {p.status}
                                  </td>
                                  <td className="py-1 px-1 w-24">{p.matDate}</td>
                                  <td className="py-1 px-1 w-10 font-mono">{p.brn}</td>
                                  <td className="py-1 px-1 text-center font-bold w-8">{p.md}</td>
                                  <td className="py-1 px-1 text-right font-semibold font-mono w-24">
                                    {p.premium}
                                  </td>
                                  <td className="py-1 px-1 text-right font-mono font-medium w-24">
                                    {p.sumAssured.toLocaleString("en-IN")}
                                  </td>
                                  <td className="py-1 px-1 text-right font-mono w-24">
                                    {p.accBenefit.toLocaleString("en-IN")}
                                  </td>
                                  <td className="py-1 px-1 text-center w-12">{p.taxBen}</td>
                                  <td className="py-1 px-1 text-slate-800 font-medium truncate max-w-[120px]">
                                    {p.nominee}
                                  </td>
                                </tr>
                              ))}

                              {/* Member Subtotal Row */}
                              <tr className="border-t border-slate-300 font-bold text-[11px] bg-slate-50">
                                <td colSpan={9} className="text-right pr-4 py-1">
                                  Total :
                                </td>
                                <td className="text-right py-1 font-mono text-slate-900">
                                  p.a.{member.memberTotalPa.toFixed(2)}
                                </td>
                                <td className="text-right py-1 font-mono">
                                  {member.memberTotalSum.toLocaleString("en-IN")}
                                </td>
                                <td className="text-right py-1 font-mono">
                                  {member.memberTotalAcc.toLocaleString("en-IN")}
                                </td>
                                <td colSpan={2}></td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      ))}

                      {/* Group Total Row */}
                      <div className="flex justify-between items-center bg-slate-200 px-3 py-1.5 font-bold text-xs border-t-2 border-slate-500">
                        <span>Total No. of Policies for this Group :{group.totalPolicies}</span>
                        <div className="flex items-center gap-6">
                          <span>Group Total :</span>
                          <span className="font-mono text-slate-900">
                            p.a.{group.groupTotalPa.toFixed(2)}
                          </span>
                          <span className="font-mono">{group.groupTotalSum.toLocaleString("en-IN")}</span>
                          <span className="font-mono">{group.groupTotalAcc.toLocaleString("en-IN")}</span>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Summary Table Box */}
        {groupData.length > 0 && (
          <div className="pt-4 flex justify-end">
            <div className="w-full max-w-xl border-2 border-slate-800 rounded overflow-hidden">
              <table className="w-full text-left text-xs font-semibold">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-400 text-slate-900">
                    <th className="p-2 border-r border-slate-400"></th>
                    <th className="p-2 text-right border-r border-slate-400">Premium</th>
                    <th className="p-2 text-right border-r border-slate-400">Sum Assured</th>
                    <th className="p-2 text-right">Accidental Benefit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-300">
                  <tr>
                    <td className="p-2 font-bold border-r border-slate-400 bg-slate-50">
                      Total for Regular Policies
                    </td>
                    <td className="p-2 text-right font-mono border-r border-slate-400">
                      {grandTotalPa.toLocaleString("en-IN", { minimumFractionDigits: 2 })} p.a
                    </td>
                    <td className="p-2 text-right font-mono border-r border-slate-400">
                      {grandTotalSum.toLocaleString("en-IN")}
                    </td>
                    <td className="p-2 text-right font-mono">
                      {grandTotalAcc.toLocaleString("en-IN")}
                    </td>
                  </tr>
                  <tr>
                    <td className="p-2 font-bold border-r border-slate-400 bg-slate-50">
                      Total for Single Mode Policies
                    </td>
                    <td className="p-2 text-right font-mono border-r border-slate-400">0.00</td>
                    <td className="p-2 text-right font-mono border-r border-slate-400">0</td>
                    <td className="p-2 text-right font-mono">0</td>
                  </tr>
                  <tr className="bg-slate-100 font-bold border-t-2 border-slate-800">
                    <td className="p-2 border-r border-slate-400">Grand Total</td>
                    <td className="p-2 text-right font-mono border-r border-slate-400">
                      {grandTotalPa.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-2 text-right font-mono border-r border-slate-400">
                      {grandTotalSum.toLocaleString("en-IN")}
                    </td>
                    <td className="p-2 text-right font-mono">
                      {grandTotalAcc.toLocaleString("en-IN")}
                    </td>
                  </tr>
                  <tr className="bg-slate-50 font-bold">
                    <td className="p-2 border-r border-slate-400">Total No. of Policies</td>
                    <td colSpan={3} className="p-2 text-center font-mono text-sm text-slate-900">
                      {grandTotalPolicies}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Legend Footers */}
        <div className="pt-6 border-t border-slate-300 space-y-1 text-[10px] text-slate-700 font-medium">
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            <span>
              <strong className="font-bold">m :</strong> Policies with SSS Mode
            </span>
            <span>
              <strong className="font-bold">M :</strong> Policies with Monthly Mode
            </span>
            <span>
              <strong className="font-bold">Y :</strong> Policies with NACH Mode
            </span>
            <span>
              <strong className="font-bold">A :</strong> Policies with APPS Mode
            </span>
            <span>
              <strong className="font-bold">* :</strong> Joint Life
            </span>
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-1">
            <span>
              <strong className="font-bold">P :</strong> Policies Inclusive of GST
            </span>
            <span>
              <strong className="font-bold">O :</strong> Policies Exclusive of GST
            </span>
            <span>
              <strong className="font-bold">ρ :</strong> Pan Card is register for the Policy
            </span>
          </div>

          <p className="text-slate-900 font-semibold pt-1">
            * Premium mark with blue color are not included in the per annum total
          </p>

          <div className="flex justify-between items-center pt-2 font-mono text-[9px] text-slate-500 border-t border-slate-200">
            <span>DSS000019899</span>
            <span>Generated via JEM Soft Insurance Suite</span>
          </div>
        </div>
      </div>
    </div>
  );
}
