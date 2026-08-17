"use client";

import { useRef, useState, useMemo, Fragment } from "react";
import { ArrowLeft, Download } from "lucide-react";
import { PremiumCertificateFormData } from "./PremiumCertificateForm";
import html2canvas from "html2canvas-pro";
import jsPDF from "jspdf";
import toast from "react-hot-toast";

interface PremiumCertificateReportViewProps {
  formData: PremiumCertificateFormData;
  policies: any[];
  customers: any[];
  onBackToForm: () => void;
}

function fmtDateDMY(d: Date | string | null | undefined) {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  if (isNaN(date.getTime())) return "";
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
}

function fmtDateShort(d: Date | string | null | undefined) {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  if (isNaN(date.getTime())) return "";
  const day = date.getDate();
  const month = date.getMonth() + 1;
  const year = String(date.getFullYear()).slice(-2);
  return `${month}/${day}/${year}`;
}

function fmtDateLong(d: Date | string | null | undefined) {
  if (!d) return "August 17, 2026";
  const date = typeof d === "string" ? new Date(d) : d;
  if (isNaN(date.getTime())) return "August 17, 2026";
  return date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

export default function PremiumCertificateReportView({
  formData,
  policies: rawPolicies = [],
  customers: rawCustomers = [],
  onBackToForm,
}: PremiumCertificateReportViewProps) {
  const reportRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  const reportGroups = useMemo(() => {
    const fromDate = formData.fromDate ? new Date(formData.fromDate) : new Date();
    const toDate = formData.toDate ? new Date(formData.toDate) : new Date();

    const selectedGroupCodesOrNames =
      formData.sortingOption === "groupsWise"
        ? (formData.selectedGroups || []).map((g) => g.groupCode.toLowerCase())
        : (formData.sortingFilterSelection?.selectedItems || []).map((item) => (item.code || item.name).toLowerCase());

    const groupMap: { [key: string]: any } = {};

    rawPolicies.forEach((p) => {
      const custObj = p.customer;
      const gCode = custObj?.groupCode || `G-${p.clientId || "101"}`;
      const gHeadName = custObj?.groupName || custObj?.name || "Policy Holder Group";

      if (selectedGroupCodesOrNames.length > 0) {
        const matches = selectedGroupCodesOrNames.some(
          (sc) => gCode.toLowerCase().includes(sc) || gHeadName.toLowerCase().includes(sc)
        );
        if (!matches) return;
      }

      const memberName = custObj?.name || "Policy Holder";
      const memberPan = custObj?.pan || "";
      const memberAddress = custObj?.address || "Pune, Maharashtra";

      if (!groupMap[gCode]) {
        groupMap[gCode] = {
          groupCode: gCode,
          groupHeadName: gHeadName,
          address: memberAddress,
          pan: memberPan,
          branchCode: p.branch?.branchCode || p.branchNo || "955",
          branchName: p.branch?.branchName || "Jeevan Darshan Bldg N C Kelkar Marg Near Sambhaji Pool Katraj",
          division: "PUNE",
          members: {},
        };
      }

      const grp = groupMap[gCode];
      if (!grp.members[memberName]) {
        grp.members[memberName] = {
          name: memberName,
          pan: memberPan,
          address: memberAddress,
          installments: [],
          totalPremium: 0,
        };
      }

      const mem = grp.members[memberName];
      const sumAssured = Number(p.premium?.sumAssured || p.sumAssured || 500000);
      const premiumAmount = Number(p.premium?.installmentPremium || p.premiumAmount || 3739);
      const modeName = p.premiumMode?.modeName || "Yearly";
      const modeShort = modeName.slice(0, 3) + ".";
      const planTermPpt = `${p.product?.planNumber || "836"}/${p.policyTerm || 25}/${p.premiumPayingTerm || 16}`;
      const policyNo = p.policyNumber || "917894577";

      // Calculate installment due dates falling between fromDate and toDate
      const comDate = p.commencementDate ? new Date(p.commencementDate) : new Date(2020, 0, 1);
      const modeMonthsMap: Record<string, number> = { Yearly: 12, "Half-Yearly": 6, Quarterly: 3, Monthly: 1 };
      const intervalMonths = modeMonthsMap[modeName] || 12;

      let tempDate = new Date(comDate);
      while (tempDate <= toDate) {
        if (tempDate >= fromDate && tempDate <= toDate) {
          const dueDateStr = fmtDateShort(tempDate);
          // Payment date for Type 1: simulated paid date within grace period
          const payDate = new Date(tempDate);
          payDate.setDate(payDate.getDate() + 15);
          const payDateStr = fmtDateShort(payDate);

          mem.installments.push({
            policyNo,
            memberName,
            dueDateStr,
            modeShort,
            planTermPpt,
            payDateStr,
            premiumAmount,
          });
          mem.totalPremium += premiumAmount;
        }
        tempDate.setMonth(tempDate.getMonth() + intervalMonths);
      }
    });

    return Object.values(groupMap).map((grp: any) => ({
      ...grp,
      membersList: Object.values(grp.members),
    }));
  }, [rawPolicies, formData]);

  const handleDownloadPDF = async () => {
    if (!reportRef.current) return;
    setIsExporting(true);
    const toastId = toast.loading("Generating PDF certificate...");
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
      pdf.save(`Premium_Certificate_${formData.certificateType.replace(" ", "_")}.pdf`);
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
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-[#0B1220] p-4 rounded-2xl border border-slate-800 shadow-xl print:hidden">
        <div className="flex items-center gap-3">
          <button onClick={onBackToForm} className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-slate-300 bg-white/10 rounded-xl hover:bg-white/20 transition uppercase tracking-wider">
            <ArrowLeft size={16} />
            <span>Edit Filters</span>
          </button>
          <span className="text-xs bg-[#B8873A]/20 text-[#E8C77A] font-bold px-3 py-1 rounded-full border border-[#B8873A]/30 uppercase tracking-wider">
            {formData.certificateType}
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

      {/* Main Certificate Document View matching 2nd & 3rd SS */}
      <div ref={reportRef} className="bg-white p-8 rounded-2xl border border-slate-400 shadow-xl text-slate-900 font-sans max-w-4xl mx-auto space-y-6 print:p-0 print:border-none print:shadow-none">
        {reportGroups.length === 0 ? (
          <div className="py-16 text-center bg-slate-50 rounded-xl border border-slate-200 p-8 space-y-2">
            <h3 className="font-bold text-slate-800 text-sm">No Premium Paid Details Found</h3>
            <p className="text-xs text-slate-500">
              There are no policy premium installments in the selected date range ({fmtDateDMY(formData.fromDate)} to {fmtDateDMY(formData.toDate)}).
            </p>
          </div>
        ) : (
          reportGroups.map((group) => {
            const grandTotalPremium = group.membersList.reduce((acc: number, m: any) => acc + m.totalPremium, 0);

            return (
              <div key={group.groupCode} className="border-2 border-slate-900 p-6 space-y-4">
                {/* Header Banner matching 2nd/3rd SS */}
                <div className="text-center space-y-1">
                  <div className="bg-slate-200 py-1 font-bold text-xl tracking-tight text-slate-900">
                    Life Insurance Corporation of India
                  </div>
                  <p className="text-xs font-semibold text-slate-800">
                    Branch No. : {group.branchCode}, {group.branchName}
                  </p>
                  <p className="text-xs font-semibold text-slate-800">
                    Division : {group.division}
                  </p>
                </div>

                <div className="border-t border-slate-900 pt-3 flex justify-between items-start">
                  <div className="w-full text-center">
                    <h2 className="text-lg font-bold uppercase tracking-wider text-slate-900">Premium Certificate</h2>
                  </div>
                </div>

                <div className="text-right text-xs font-semibold text-slate-800">
                  {fmtDateLong(formData.reportDate)}
                </div>

                {/* Subtitle / Certification paragraph matching SS */}
                <div className="text-xs text-slate-900 leading-relaxed font-normal">
                  This is to certify that the following payments have been made under life insurance policies held by{" "}
                  <strong className="font-bold text-slate-900">{group.groupHeadName}</strong>, during the period{" "}
                  <strong className="font-bold text-slate-900">{fmtDateDMY(formData.fromDate)}</strong> to{" "}
                  <strong className="font-bold text-slate-900">{fmtDateDMY(formData.toDate)}</strong>
                  <br />
                  <span className="font-semibold">Holder of Permanent Account Number : {group.pan || "—"}</span>
                </div>

                {/* Certificate Table matching 2nd SS (Type 1) & 3rd SS (Type 2) */}
                <table className="w-full text-left text-[11px] border-collapse">
                  <thead>
                    <tr className="border-y border-slate-900 font-bold text-slate-900 bg-slate-50">
                      <th className="py-1.5 px-2">Policy No</th>
                      <th className="py-1.5 px-2">Policy Holder&apos;s Name</th>
                      <th className="py-1.5 px-2 text-right">Premium Due Date</th>
                      <th className="py-1.5 px-2 text-center">Mode</th>
                      <th className="py-1.5 px-2 text-center">Plan/Term/PPT</th>
                      {formData.certificateType === "Type 1" && (
                        <th className="py-1.5 px-2 text-right">Date of Pay.</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {group.membersList.flatMap((mem: any) =>
                      mem.installments.map((inst: any, idx: number) => (
                        <tr key={`${inst.policyNo}-${idx}`} className="border-b border-slate-200 text-slate-800">
                          <td className="py-1 px-2 font-mono font-semibold">{inst.policyNo}</td>
                          <td className="py-1 px-2">{inst.memberName}</td>
                          <td className="py-1 px-2 text-right font-mono">
                            {inst.premiumAmount} {inst.dueDateStr}
                          </td>
                          <td className="py-1 px-2 text-center">{inst.modeShort}</td>
                          <td className="py-1 px-2 text-center font-mono">{inst.planTermPpt}</td>
                          {formData.certificateType === "Type 1" && (
                            <td className="py-1 px-2 text-right font-mono">{inst.payDateStr}</td>
                          )}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>

                {/* Total Premium Bar matching SS */}
                <div className="flex justify-center items-center gap-2 pt-2">
                  <span className="font-bold text-xs">Total Premium :</span>
                  <div className="border border-slate-900 bg-emerald-50 px-4 py-1 text-xs font-bold font-mono text-slate-900">
                    {grandTotalPremium.toFixed(2)}
                  </div>
                </div>

                {/* Signature Block matching SS */}
                <div className="pt-8 flex justify-between items-end text-xs font-semibold text-slate-900">
                  <div className="space-y-0.5 max-w-xs">
                    <p className="font-bold">{group.groupHeadName},</p>
                    <p className="text-[11px] text-slate-700 leading-tight">{group.address}</p>
                  </div>
                  <div className="text-right space-y-8">
                    <p className="font-bold">For L.I.C. of India</p>
                    <p className="font-bold">Branch Manager</p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
