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

  // Group and STRICTLY FILTER policies based on sorting option & filter modal selections!
  const groupData = useMemo(() => {
    // Standard mock sample if database has 0 policies
    const useSample = !rawPolicies || rawPolicies.length === 0;

    if (useSample) {
      return [
        {
          groupCode: "M101",
          groupHeadName: "Musale Kiran",
          members: [
            {
              name: "Mr Musale Kiran",
              dob: "23/10/1980",
              policies: [
                {
                  policyNo: "917894577",
                  agCd: "J",
                  comDate: "22/01/20",
                  planTermPpt: "836/25/16",
                  fupDate: "07/26",
                  status: "Inforce",
                  matDate: "01/45",
                  brn: "955",
                  md: "Q",
                  premium: "3739.00P",
                  paPremium: 14956,
                  sumAssured: 300000,
                  accBenefit: 300000,
                  taxBen: "",
                  nominee: "Musale Swati",
                },
                {
                  policyNo: "917894575",
                  agCd: "J",
                  comDate: "28/01/20",
                  planTermPpt: "855/25/25",
                  fupDate: "07/26",
                  status: "Inforce",
                  matDate: "01/45",
                  brn: "955",
                  md: "H",
                  premium: "4118.00P",
                  paPremium: 8236,
                  sumAssured: 2500000,
                  accBenefit: 2500000,
                  taxBen: "",
                  nominee: "#Musale Swati",
                },
                {
                  policyNo: "935074254",
                  agCd: "J",
                  comDate: "19/05/22",
                  planTermPpt: "936/21/15",
                  fupDate: "05/26",
                  status: "Red.Paidup",
                  matDate: "05/43",
                  brn: "955",
                  md: "H",
                  premium: "17077.00P",
                  paPremium: 34154,
                  sumAssured: 600000,
                  accBenefit: 600000,
                  taxBen: "",
                  nominee: "Musale Swati",
                },
              ],
              memberTotalPa: 57346,
              memberTotalSum: 3400000,
              memberTotalAcc: 3400000,
            },
            {
              name: "Mrs Musale Swati",
              dob: "06/06/1986",
              policies: [
                {
                  policyNo: "999438395",
                  agCd: "M",
                  comDate: "26/01/17",
                  planTermPpt: "836/25/16",
                  fupDate: "08/26",
                  status: "Inforce",
                  matDate: "01/42",
                  brn: "955",
                  md: "M",
                  premium: "1948.00P",
                  paPremium: 23376,
                  sumAssured: 500000,
                  accBenefit: 0,
                  taxBen: "",
                  nominee: "#Musale Kiran",
                },
              ],
              memberTotalPa: 23376,
              memberTotalSum: 500000,
              memberTotalAcc: 0,
            },
          ],
          totalPolicies: 4,
          groupTotalPa: 80722,
          groupTotalSum: 3900000,
          groupTotalAcc: 3400000,
        },
      ];
    }

    // Process DB policies
    const selectedStatusNames = (formData.appliedFilters || [])
      .filter((f) => f.type === "Policy Status")
      .map((f) => f.name.toLowerCase());

    const selectedSortingIds = (formData.sortingFilterSelection?.selectedIds || []).map((id) =>
      id.toLowerCase()
    );

    const groupMap: { [key: string]: any } = {};

    rawPolicies.forEach((p) => {
      // 1. Status Filter
      const statusName = p.status?.statusName || "Inforce";
      if (
        selectedStatusNames.length > 0 &&
        !selectedStatusNames.some((st) => statusName.toLowerCase().includes(st))
      ) {
        return; // Skip status not selected
      }

      // Group / Key determination depending on sortingOption
      let gCode = "GRP";
      let gHeadName = "Group";

      if (formData.sortingOption === "areaWise") {
        gCode = p.customer?.resArea || "General Area";
        gHeadName = `Area: ${gCode}`;
      } else if (formData.sortingOption === "branchNoWise") {
        gCode = p.branch?.branchCode || "955";
        gHeadName = `Branch: ${gCode}`;
      } else if (formData.sortingOption === "planWise") {
        gCode = p.product?.planNumber || "836";
        gHeadName = `Plan: ${gCode} - ${p.product?.productName || "Life Insurance"}`;
      } else {
        // Groups Wise & Group Memberwise
        gCode = p.customer?.groupCode || `GRP-${p.clientId || "001"}`;
        gHeadName = p.customer?.groupName || p.customer?.name || "Customer Group";
      }

      // 2. Sorting Modal Specific Filter
      if (selectedSortingIds.length > 0) {
        const matchesCode = selectedSortingIds.includes(gCode.toLowerCase());
        const matchesName = selectedSortingIds.some((s) => gHeadName.toLowerCase().includes(s));
        if (!matchesCode && !matchesName) return;
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
        status: statusName,
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
  }, [rawPolicies, formData.appliedFilters, formData.sortingFilterSelection, formData.sortingOption]);

  // Summary Totals
  const grandTotalPa = groupData.reduce((acc, g) => acc + g.groupTotalPa, 0);
  const grandTotalSum = groupData.reduce((acc, g) => acc + g.groupTotalSum, 0);
  const grandTotalAcc = groupData.reduce((acc, g) => acc + g.groupTotalAcc, 0);
  const grandTotalPolicies = groupData.reduce((acc, g) => acc + g.totalPolicies, 0);

  const getReportHeaderTitle = () => {
    switch (formData.sortingOption) {
      case "groupMemberwise":
        return "Memberwise Report";
      case "areaWise":
        return "Areawise Report";
      case "subAreaWise":
        return "Sub-Areawise Report";
      case "branchNoWise":
        return "Branchwise Report";
      case "policyNoWise":
        return "Policywise Report";
      case "planWise":
        return "Planwise Report";
      case "groupsWise":
      default:
        return "Groupwise Report";
    }
  };

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
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm print:hidden">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToForm}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition"
          >
            <ArrowLeft size={16} />
            <span>Edit Filters</span>
          </button>
          <span className="text-xs bg-blue-50 text-blue-700 font-semibold px-3 py-1 rounded-full border border-blue-200">
            {getReportHeaderTitle()}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 border border-slate-300 text-slate-700 font-semibold text-xs rounded-lg hover:bg-slate-50 transition"
          >
            <Printer size={16} />
            <span>Print</span>
          </button>

          <button
            onClick={handleDownloadPDF}
            disabled={isExporting}
            className="flex items-center gap-2 px-5 py-2 bg-blue-700 text-white font-semibold text-xs rounded-lg shadow-sm hover:bg-blue-800 transition disabled:opacity-50"
          >
            <Download size={16} />
            <span>{isExporting ? "Generating..." : "Download PDF"}</span>
          </button>
        </div>
      </div>

      {/* Main Printable Document Layout (Matching PDF Screenshot 1) */}
      <div
        ref={reportRef}
        className="bg-white p-8 rounded-xl border border-slate-300 shadow-lg text-slate-900 font-sans max-w-5xl mx-auto space-y-4 print:p-0 print:border-none print:shadow-none"
      >
        {/* Advisor Header Section */}
        <div className="flex justify-between items-start border-b-2 border-pink-200 pb-3">
          <div className="space-y-0.5">
            <h1 className="text-2xl font-bold text-[#8A1550] tracking-tight">Jayant Mahabole</h1>
            <p className="text-xs font-semibold text-slate-700">MBA in Insurance & Finance</p>
            <p className="text-[11px] text-slate-600 max-w-xs leading-tight">
              84/2, Darpan Bldg., 201 Sarang Society, Sahakarnagar No. 2 Parvati Pune 411009
            </p>
            <p className="text-[11px] text-slate-600 font-mono">9822452896</p>
            <p className="text-[11px] text-slate-600">office@jayantmahbole.com</p>
          </div>

          <div className="h-16 w-32 bg-pink-100/50 rounded-bl-3xl flex items-center justify-center">
            {/* Visual Accent */}
          </div>
        </div>

        {/* Title Banner */}
        <div className="bg-[#F8DEE6] border border-pink-300 rounded px-4 py-2 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">Policy Register</h2>
          <span className="text-sm font-bold text-slate-900">{getReportHeaderTitle()}</span>
        </div>

        <div className="text-xs font-semibold text-slate-800 px-1">
          Date : {formData.reportDate ? new Date(formData.reportDate).toLocaleDateString("en-GB") : new Date().toLocaleDateString("en-GB")}
        </div>

        {/* Groupwise Table */}
        <div className="space-y-4">
          {groupData.length === 0 ? (
            <div className="py-16 text-center border-2 border-dashed border-slate-200 rounded-xl space-y-2">
              <AlertCircle size={32} className="mx-auto text-slate-400" />
              <h3 className="font-semibold text-slate-700">No policy records found for selected filter</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Try selecting all items in the sorting filter modal or adjusting the policy status selection.
              </p>
            </div>
          ) : (
            <table className="w-full text-left text-[11px] border-collapse">
              <thead>
                <tr className="bg-[#D9EADA] border-y-2 border-slate-800 font-bold text-slate-900">
                  <th className="py-2 px-1 text-right">Policy No.</th>
                  <th className="py-2 px-1 text-center">Ag Cd</th>
                  <th className="py-2 px-1">Com. Date</th>
                  <th className="py-2 px-1">Pl/Tm/Pt</th>
                  <th className="py-2 px-1">FUP Date (mm/yy)</th>
                  <th className="py-2 px-1">Status</th>
                  <th className="py-2 px-1">Mat.Date (mm/yy)</th>
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
                      <div className="bg-slate-100 font-bold text-xs py-1 px-2 border-b border-slate-300">
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
                              <tr className="border-t border-slate-300 font-bold text-[11px] bg-slate-50/50">
                                <td colSpan={9} className="text-right pr-4 py-1">
                                  Total :
                                </td>
                                <td className="text-right py-1 font-mono text-blue-900">
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
                          <span className="font-mono text-blue-900">
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
            <div className="w-full max-w-xl border-2 border-slate-700 rounded overflow-hidden">
              <table className="w-full text-left text-xs font-semibold">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-400 text-slate-800">
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
                  <tr className="bg-slate-100 font-bold border-t-2 border-slate-700">
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
                    <td colSpan={3} className="p-2 text-center font-mono text-sm text-blue-900">
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

          <p className="text-blue-700 font-semibold pt-1">
            * Premium mark with blue color are not included in the per annum total
          </p>

          <div className="flex justify-between items-center pt-2 font-mono text-[9px] text-slate-500 border-t border-slate-200">
            <span>DSS000019899</span>
            <span>Generated via Policy Register Engine</span>
          </div>
        </div>
      </div>
    </div>
  );
}
