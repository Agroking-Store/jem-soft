"use client";

import { useRef, useState, useMemo } from "react";
import { ArrowLeft, Download, FilterX } from "lucide-react";
import { PremiumDueFormData } from "./PremiumDueForm";
import html2canvas from "html2canvas-pro";
import jsPDF from "jspdf";
import toast from "react-hot-toast";

interface PremiumDueReportViewProps {
  formData: PremiumDueFormData;
  policies: any[];
  customers: any[];
  onBackToForm: () => void;
}

const PAY_BEFORE_GRACE_DAYS = 15;
const LATE_PAYMENT_UPTO_DAYS = 29;
const LATE_FEE_FLAT = 15; 

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function fmtDate(d: Date | string | null | undefined, short = false) {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  if (isNaN(date.getTime())) return "";
  return short
    ? date.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "2-digit" })
    : date.toLocaleDateString("en-GB");
}

export default function PremiumDueReportView({
  formData,
  policies: rawPolicies = [],
  customers: rawCustomers = [],
  onBackToForm,
}: PremiumDueReportViewProps) {
  const reportRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  const groupData = useMemo(() => {
    const fromDue = formData.fromDueDate ? new Date(formData.fromDueDate) : null;
    const toDue = formData.toDueDate ? new Date(formData.toDueDate) : null;

    const selectedStatusNames = (formData.appliedFilters || [])
      .filter((f) => f.type === "Policy Status")
      .map((f) => f.name.toLowerCase().replace(/[- ]/g, ""));

    const selectedGroupCodesOrNames =
      formData.sortingOption === "groupsWise"
        ? (formData.selectedGroups || []).map((g) => g.groupCode.toLowerCase())
        : (formData.sortingFilterSelection?.selectedItems || []).map((item) =>
            (item.code || item.name).toLowerCase()
          );

    const validDbPolicies = rawPolicies.filter((p) => {
      // Due date range check 
      const dueDateRaw =
        formData.reportBasedOn === "FUP Date"
          ? p.fupDate || p.nextPremiumDueDate
          : p.nextPremiumDueDate || p.fupDate;
      if (fromDue && toDue && dueDateRaw) {
        const dd = new Date(dueDateRaw);
        if (!isNaN(dd.getTime()) && (dd < fromDue || dd > toDue)) return false;
      }

      // Policy Status
      const rawStatus = (p.status?.statusName || p.statusName || "Inforce").toLowerCase();
      if (!formData.includeLapsedPolicies && rawStatus.includes("lapsed")) return false;

      if (selectedStatusNames.length > 0) {
        const normStatus = rawStatus.replace(/[- ]/g, "");
        const matches = selectedStatusNames.some(
          (st) => normStatus.includes(st) || st.includes(normStatus)
        );
        if (!matches) return false;
      }

      // Payment Type
      const isNach = Boolean(p.premiumMode?.modeName?.toLowerCase().includes("nach") || p.isNach);
      if (isNach && !formData.paymentTypes.nach) return false;
      if (!isNach && !formData.paymentTypes.otherThanNach) return false;

      return true;
    });

    if (validDbPolicies.length > 0) {
      const groupMap: { [key: string]: any } = {};

      validDbPolicies.forEach((p, idx) => {
        const gCode = p.customer?.groupCode || `0000${p.clientId || "02"}`;
        const gHeadName = p.customer?.groupName || p.customer?.name || "Customer Group";

        if (selectedGroupCodesOrNames.length > 0) {
          const matches = selectedGroupCodesOrNames.some(
            (sc) => gCode.toLowerCase().includes(sc) || gHeadName.toLowerCase().includes(sc)
          );
          if (!matches) return;
        }

        const cust = p.customer || rawCustomers.find((c: any) => c.id === p.customerId || c.id === p.clientId) || {};

        const formattedAddressParts = [
          cust.resAddressLine1,
          cust.resAddressLine2,
          cust.resArea || cust.offArea,
          cust.resCity || cust.offCity,
          cust.resPin || cust.offPin,
        ].filter((part: any): part is string => Boolean(part && String(part).trim().length > 0));
        const addressStr = formattedAddressParts.length > 0 ? formattedAddressParts.join(", ") : "Address Not Provided";
        const mobileStr = cust.phone || cust.mobilePersonal || cust.mobile || "N/A";
        const emailStr = cust.email || cust.emailPersonal || cust.emailBusiness || "N/A";
        const panStr = cust.panNumber || cust.pan || "N/A";
        const gstStr = cust.gstNumber || cust.gst || "N/A";

        const memberName = p.CustomerMaster
          ? `${p.CustomerMaster.salutation || ""} ${p.CustomerMaster.firstName} ${p.CustomerMaster.lastName}`.trim()
          : cust.name || p.customer?.name || "Policy Holder";

        const dob = p.CustomerMaster?.dob
          ? new Date(p.CustomerMaster.dob).toLocaleDateString("en-GB")
          : cust.dob || p.customer?.dob || "";

        if (!groupMap[gCode]) {
          groupMap[gCode] = {
            groupCode: gCode,
            groupHeadName: gHeadName,
            address: addressStr,
            mobile: mobileStr,
            email: emailStr,
            pan: panStr,
            gst: gstStr,
            membersMap: {},
            totalPolicies: 0,
            groupTotalPremium: 0,
            groupTotalSum: 0,
            groupTotalLatePayment: 0,
          };
        }

        const grp = groupMap[gCode];
        if (!grp.membersMap[memberName]) {
          grp.membersMap[memberName] = {
            name: memberName,
            dob,
            policies: [],
            memberTotalPremium: 0,
            memberTotalSum: 0,
            memberTotalLatePayment: 0,
          };
        }
        const mem = grp.membersMap[memberName];

        const mode = p.premiumMode?.modeName?.[0]?.toUpperCase() || "Y";
        const sumAssured = Number(p.premium?.sumAssured || p.sumAssured || 0);
        const premiumAmount = Number(
          p.premium?.installmentPremium || p.premium?.totalInstallmentPremium || p.premiumAmount || 0
        );

        const dueDateRaw =
          formData.reportBasedOn === "FUP Date"
            ? p.fupDate || p.nextPremiumDueDate
            : p.nextPremiumDueDate || p.fupDate;
        const dueDate = dueDateRaw ? new Date(dueDateRaw) : new Date(formData.fromDueDate || Date.now());
        const payBeforeDate = addDays(dueDate, PAY_BEFORE_GRACE_DAYS);
        const lateUptoDate = addDays(dueDate, LATE_PAYMENT_UPTO_DAYS);
        const lateAmount = premiumAmount + LATE_FEE_FLAT;

        mem.policies.push({
          policyNo: p.policyNumber || `PD-${idx + 1}`,
          agCd: p.agentCode || p.agency?.agencyCode || "—",
          comDate: fmtDate(p.commencementDate),
          planTermPpt: `${p.product?.planNumber || "—"}/${p.policyTerm || "—"}/${p.premiumPayingTerm || "—"}`,
          md: mode,
          brn: p.branch?.branchCode || "—",
          fupDate: fmtDate(p.nextPremiumDueDate) || fmtDate(dueDate),
          dueDate: fmtDate(dueDate),
          sumAssured,
          premiumAmount,
          payBefore: fmtDate(payBeforeDate),
          lateAmount,
          lateUpto: fmtDate(lateUptoDate),
          taxBen: "",
        });

        mem.memberTotalPremium += premiumAmount;
        mem.memberTotalSum += sumAssured;
        mem.memberTotalLatePayment += lateAmount;

        grp.totalPolicies += 1;
        grp.groupTotalPremium += premiumAmount;
        grp.groupTotalSum += sumAssured;
        grp.groupTotalLatePayment += lateAmount;
      });

      const result = Object.values(groupMap).map((grp: any) => ({
        ...grp,
        members: Object.values(grp.membersMap),
      }));

      if (result.length > 0) return result;
    }

    // 100% PURE DYNAMIC — No hardcoded/demo data. If nothing in DB matches
    // the applied filters, show an empty state instead of a fake statement.
    return [];
  }, [rawPolicies, formData]);

  const grandTotalPremium = groupData.reduce((acc, g) => acc + g.groupTotalPremium, 0);
  const grandTotalSum = groupData.reduce((acc, g) => acc + g.groupTotalSum, 0);
  const grandTotalLatePayment = groupData.reduce((acc, g) => acc + g.groupTotalLatePayment, 0);
  const grandTotalPolicies = groupData.reduce((acc, g) => acc + g.totalPolicies, 0);

  const showAddress = formData.reportOptions?.address;
  const showMobile = formData.reportOptions?.mobile;
  const showEmail = formData.reportOptions?.email;
  const showPan = formData.reportOptions?.pan;
  const showGst = formData.reportOptions?.gst;
  const showDob = formData.reportOptions?.dob;

  const getReportHeaderTitle = () => {
    switch (formData.sortingOption) {
      case "groupMemberwise":
        return "Memberwise";
      case "areaWise":
        return "Areawise";
      case "subAreaWise":
        return "Sub-Areawise";
      case "dueDate":
        return "Due-Datewise";
      case "branchNoWise":
        return "Branchwise";
      case "policyNoWise":
        return "Policywise";
      case "groupsWise":
      default:
        return "Groupwise";
    }
  };

  const handleDownloadPDF = async () => {
    if (!reportRef.current) return;
    setIsExporting(true);
    const toastId = toast.loading("Generating Pristine Executive PDF...");

    const elem = reportRef.current;
    const originalWidth = elem.style.width;

    try {
      // Temporarily lock to strict A4 print width for crystal-clear, consistent scale
      elem.style.width = "820px";

      const canvas = await html2canvas(elem, {
        scale: 2.5,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        logging: false,
      });

      elem.style.width = originalWidth;

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const imgWidth = 210;
      const pageHeight = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 5) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`Premium_Due_${formData.reportDate || "Report"}.pdf`);
      toast.success("Executive PDF exported successfully!", { id: toastId });
    } catch (err: any) {
      console.error(err);
      elem.style.width = originalWidth;
      toast.error(err?.message || "Failed to generate PDF.", { id: toastId });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6 w-full">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-[#0B1220] p-4 rounded-2xl border border-slate-800 shadow-xl print:hidden w-full">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToForm}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-slate-300 bg-white/10 rounded-xl hover:bg-white/20 transition uppercase tracking-wider"
          >
            <ArrowLeft size={16} />
            <span>Edit Filters</span>
          </button>
          <span className="text-xs bg-[#B8873A]/20 text-[#E8C77A] font-bold px-3 py-1.5 rounded-full border border-[#B8873A]/40 uppercase tracking-wider">
            {getReportHeaderTitle()}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleDownloadPDF}
            disabled={isExporting}
            className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-[#B8873A] to-[#D9AE63] text-[#0B1220] font-bold text-xs rounded-xl shadow-lg hover:brightness-105 transition disabled:opacity-50 uppercase tracking-wider"
          >
            <Download size={16} />
            <span>{isExporting ? "Exporting PDF..." : "Download PDF"}</span>
          </button>
        </div>
      </div>

      {/* Main Printable Document Layout */}
      <div
        ref={reportRef}
        style={{ fontFamily: "Arial, Helvetica, sans-serif" }}
        className="w-full bg-white p-8 rounded-2xl border border-slate-300 shadow-2xl text-slate-900 space-y-6 print:p-0 print:border-none print:shadow-none"
      >
        {/* Advisor Letterhead */}
        <div style={{ borderBottom: "2px solid #0B1220" }} className="flex justify-between items-start pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-[#0B1220] tracking-tight">Jayant Mahabole</h1>
              <span className="text-[10px] bg-[#0B1220] text-[#E8C77A] font-bold px-2 py-0.5 rounded uppercase tracking-widest">
                LIC Authorized Advisor
              </span>
            </div>
            <p className="text-xs font-semibold text-[#B8873A]">MBA in Insurance & Finance</p>
            <p className="text-xs text-slate-600 max-w-md leading-relaxed">
              84/2, Darpan Bldg., 201 Sarang Society, Sahakarnagar No. 2 Parvati Pune 411009
            </p>
            <div className="flex items-center gap-4 text-xs font-medium text-slate-700 pt-1">
              <span>Phone: 9822452896</span>
              <span>Email: office@jayantmahbole.com</span>
            </div>
          </div>

          <div className="text-right space-y-1.5">
            <div className="inline-block bg-[#0B1220] text-[#E8C77A] px-4 py-2 rounded-xl text-right border border-[#B8873A]/40 shadow-sm">
              <p className="text-xs font-bold tracking-widest uppercase">Life Insurance Corporation</p>
              <p className="text-[10px] text-slate-300">Official Premium Due Statement</p>
            </div>
            <p className="text-xs font-bold text-slate-700 pt-1">
              Date: {formData.reportDate ? fmtDate(formData.reportDate) : fmtDate(new Date())}
            </p>
          </div>
        </div>

        {/* Title Banner */}
        <div className="bg-[#0B1220] text-white rounded-xl px-5 py-3 flex items-center justify-between border-l-4 border-[#B8873A] shadow-sm">
          <h2 className="text-base font-bold text-[#E8C77A] uppercase tracking-wider">
            Premium Due — {getReportHeaderTitle()}
          </h2>
          <div className="text-right text-xs text-[#E8C77A] font-bold">
            Groups: {groupData.length} | Policies: {grandTotalPolicies}
          </div>
        </div>

        {/* Report Meta Line */}
        <div className="text-[11px] font-semibold text-slate-800 px-1 space-y-0.5">
          <div className="flex justify-between">
            <span>
              LIC Premiums Due between {fmtDate(formData.fromDueDate)} and {fmtDate(formData.toDueDate)}
            </span>
            <span>Page 1 of 1</span>
          </div>
        </div>

        {/* Premium Due Table */}
        {groupData.length === 0 ? (
          <div className="p-12 text-center border-2 border-dashed border-slate-300 rounded-2xl space-y-3 bg-slate-50">
            <div className="inline-flex p-3 bg-red-100 text-red-600 rounded-full">
              <FilterX size={32} />
            </div>
            <h3 className="text-base font-bold text-slate-800">No Premium Due Policies Match Your Selected Filters</h3>
            <p className="text-xs text-slate-600 max-w-md mx-auto">
              No policies in the database matched the combined filter criteria. Please adjust your filters or click "Edit Filters" to try again.
            </p>
            <button
              onClick={onBackToForm}
              className="px-5 py-2 bg-[#0B1220] text-[#E8C77A] font-bold text-xs rounded-xl hover:bg-slate-900 transition"
            >
              Modify Filter Selection
            </button>
          </div>
        ) : (
        <div className="space-y-6">
          {groupData.map((group) => (
            <div key={group.groupCode} className="space-y-3 rounded-xl border border-slate-300 p-4 bg-white shadow-xs">
              {/* Group Banner */}
              <div className="bg-[#0B1220] text-white p-3.5 rounded-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-[#B8873A]/40">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs bg-[#B8873A] text-[#0B1220] font-bold px-2 py-0.5 rounded font-mono">
                      {group.groupCode}
                    </span>
                    <h3 className="font-bold text-sm text-[#E8C77A]">{group.groupHeadName}</h3>
                    {showPan && (
                      <span className="text-[10px] bg-slate-800 text-[#E8C77A] font-bold px-2 py-0.5 rounded border border-[#B8873A]/40">
                        PAN: {group.pan}
                      </span>
                    )}
                    {showGst && (
                      <span className="text-[10px] bg-slate-800 text-[#E8C77A] font-bold px-2 py-0.5 rounded border border-[#B8873A]/40">
                        GST: {group.gst}
                      </span>
                    )}
                  </div>
                  {showAddress && (
                    <p className="text-[11px] text-slate-300 pt-0.5">Address: {group.address}</p>
                  )}
                </div>

                <div className="text-left sm:text-right space-y-0.5 text-[11px] text-slate-300">
                  {showMobile && <p>Mobile: {group.mobile}</p>}
                  {showEmail && <p>Email: {group.email}</p>}
                </div>
              </div>

              {/* Member Sections */}
              {group.members.map((member: any) => (
                <div key={member.name} className="space-y-2 pt-1">
                  <div className="flex justify-between items-center bg-slate-100 px-3 py-1.5 rounded-md border-l-4 border-[#0B1220] text-xs font-bold text-slate-900">
                    <span>{member.name}</span>
                    {showDob && member.dob && (
                      <span className="font-mono text-slate-600">DOB : {member.dob}</span>
                    )}
                  </div>

                  <div className="overflow-x-auto rounded-lg border border-slate-300">
                    <table className="w-full text-left text-[11px] border-collapse">
                      <thead>
                        <tr className="bg-slate-200 border-y border-slate-400 font-bold text-slate-900">
                          <th rowSpan={2} className="py-2 px-1 text-right align-bottom">Policy No</th>
                          <th rowSpan={2} className="py-2 px-1 text-center align-bottom">Ag Cd</th>
                          <th rowSpan={2} className="py-2 px-1 align-bottom">Com. Date</th>
                          <th rowSpan={2} className="py-2 px-1 align-bottom">Pl/Tm/Pt</th>
                          <th rowSpan={2} className="py-2 px-1 text-center align-bottom">Md</th>
                          <th rowSpan={2} className="py-2 px-1 align-bottom">Brn</th>
                          <th rowSpan={2} className="py-2 px-1 align-bottom">FUP Date</th>
                          <th rowSpan={2} className="py-2 px-1 align-bottom">Due Date</th>
                          <th rowSpan={2} className="py-2 px-1 text-right align-bottom">Sum</th>
                          <th rowSpan={2} className="py-2 px-1 text-right align-bottom">Premium Amount</th>
                          <th rowSpan={2} className="py-2 px-1 align-bottom">Pay Before</th>
                          <th colSpan={2} className="py-1 px-1 text-center border-b border-slate-400">Late Payment</th>
                          <th rowSpan={2} className="py-2 px-1 text-center align-bottom">Tax Benef.</th>
                        </tr>
                        <tr className="bg-slate-200 border-b border-slate-400 font-bold text-slate-900">
                          <th className="py-1 px-1 text-right">Amount</th>
                          <th className="py-1 px-1">Upto</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {member.policies.map((p: any) => (
                          <tr key={p.policyNo} className="hover:bg-slate-50">
                            <td className="py-1.5 px-1 text-right font-mono font-bold text-[#0B1220]">
                              {p.policyNo}
                            </td>
                            <td className="py-1.5 px-1 text-center font-bold">{p.agCd}</td>
                            <td className="py-1.5 px-1">{p.comDate}</td>
                            <td className="py-1.5 px-1 font-medium">{p.planTermPpt}</td>
                            <td className="py-1.5 px-1 text-center font-bold">{p.md}</td>
                            <td className="py-1.5 px-1 font-mono">{p.brn}</td>
                            <td className="py-1.5 px-1 font-medium text-slate-700">{p.fupDate}</td>
                            <td className="py-1.5 px-1 font-medium text-slate-700">{p.dueDate}</td>
                            <td className="py-1.5 px-1 text-right font-mono">
                              {p.sumAssured.toLocaleString("en-IN")}
                            </td>
                            <td className="py-1.5 px-1 text-right font-bold font-mono text-[#0B1220]">
                              {p.premiumAmount.toFixed(2)}
                            </td>
                            <td className="py-1.5 px-1 text-slate-700">{p.payBefore}</td>
                            <td className="py-1.5 px-1 text-right font-mono">{p.lateAmount.toFixed(2)}</td>
                            <td className="py-1.5 px-1 text-slate-700">{p.lateUpto}</td>
                            <td className="py-1.5 px-1 text-center">{p.taxBen}</td>
                          </tr>
                        ))}

                        <tr className="border-t-2 border-slate-300 font-bold text-[11px] bg-slate-50">
                          <td colSpan={8} className="text-right pr-4 py-1.5 text-slate-700 uppercase tracking-wider">
                            Member Total :
                          </td>
                          <td className="text-right py-1.5 font-mono">
                            {member.memberTotalSum.toLocaleString("en-IN")}
                          </td>
                          <td className="text-right py-1.5 font-mono text-[#0B1220]">
                            {member.memberTotalPremium.toFixed(2)}
                          </td>
                          <td></td>
                          <td className="text-right py-1.5 font-mono">{member.memberTotalLatePayment.toFixed(2)}</td>
                          <td colSpan={2}></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}

              {/* Group Total Footer */}
              <div className="bg-[#0B1220] text-white px-4 py-2 rounded-lg font-bold text-xs border-t-2 border-[#B8873A]">
                <table className="w-full border-collapse">
                  <tbody>
                    <tr>
                      <td className="text-left font-bold">Total Policies for Group : {group.totalPolicies}</td>
                      <td className="text-right font-bold text-[#E8C77A] pr-4">Group Total :</td>
                      <td className="text-right font-mono text-[#E8C77A] w-28">{group.groupTotalSum.toLocaleString("en-IN")}</td>
                      <td className="text-right font-mono w-28">{group.groupTotalPremium.toFixed(2)}</td>
                      <td className="text-right font-mono w-28">{group.groupTotalLatePayment.toFixed(2)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
        )}

        {/* Summary Table Box */}
        {groupData.length > 0 && (
          <div className="pt-2 flex justify-end">
            <div className="w-full max-w-xl border-2 border-[#0B1220] rounded-xl overflow-hidden shadow-md">
              <div className="bg-[#0B1220] text-[#E8C77A] p-2.5 text-xs font-bold uppercase tracking-wider border-b border-[#B8873A]">
                Grand Premium Due Summary
              </div>
              <table className="w-full text-left text-xs font-semibold border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-300 text-slate-900">
                    <th className="p-2.5 border-r border-slate-300"></th>
                    <th className="p-2.5 text-right border-r border-slate-300">Sum Assured</th>
                    <th className="p-2.5 text-right border-r border-slate-300">Premium Amount</th>
                    <th className="p-2.5 text-right">Late Payment Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  <tr className="bg-[#0B1220] text-white font-bold border-t-2 border-[#B8873A]">
                    <td className="p-2.5 border-r border-slate-700 text-[#E8C77A]">Grand Total</td>
                    <td className="p-2.5 text-right font-mono border-r border-slate-700 text-[#E8C77A]">
                      {grandTotalSum.toLocaleString("en-IN")}
                    </td>
                    <td className="p-2.5 text-right font-mono border-r border-slate-700 text-[#E8C77A]">
                      {grandTotalPremium.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-2.5 text-right font-mono text-[#E8C77A]">
                      {grandTotalLatePayment.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                  <tr className="bg-slate-50 font-bold">
                    <td className="p-2.5 border-r border-slate-300 text-slate-800">Total No. of Policies</td>
                    <td colSpan={3} className="p-2.5 text-center font-mono text-sm text-[#0B1220]">
                      {grandTotalPolicies} Policies
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Legend Footer */}
        <div className="pt-6 border-t border-slate-300 space-y-2 text-[10px] text-slate-700 font-medium">
          <div className="flex flex-wrap gap-x-6 gap-y-1">
            <span><strong className="font-bold text-[#0B1220]">m :</strong> SSS Mode</span>
            <span><strong className="font-bold text-[#0B1220]">M :</strong> Monthly Mode</span>
            <span><strong className="font-bold text-[#0B1220]">Y :</strong> NACH Mode</span>
            <span><strong className="font-bold text-[#0B1220]">S :</strong> Cheque dishonoured/ Debit fail</span>
          </div>

          <div className="flex flex-wrap gap-x-6 gap-y-1">
            <span><strong className="font-bold text-[#0B1220]">A :</strong> APPS Mode</span>
            <span><strong className="font-bold text-[#0B1220]">ρ :</strong> PAN Card Registered</span>
          </div>

          <div className="flex justify-between items-center pt-3 font-mono text-[9px] text-slate-500 border-t border-slate-200">
            <span>Statement Code: DSS000019899</span>
            <span>Generated via Premium Due Engine</span>
          </div>
        </div>
      </div>
    </div>
  );
}