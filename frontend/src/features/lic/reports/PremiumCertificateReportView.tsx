"use client";

import { useRef, useState, useMemo } from "react";
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
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  if (isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

function getPolicyMemberName(p: any): string {
  // lifeAssured / holderName / insuredName are NOT schema fields — the
  // member is always CustomerMaster.
  const cm = p.CustomerMaster;
  if (cm) {
    const salutation = cm.salutation ? `${cm.salutation} ` : "";
    const fullName = [cm.firstName, cm.middleName, cm.lastName]
      .filter(Boolean)
      .join(" ");
    if (fullName.trim()) return `${salutation}${fullName.trim()}`;
  }
  if (p.customer?.name) return p.customer.name;
  return "Policy Holder";
}

/** Month step that keeps the LIC due-date day-of-month (31 Jan + 1m → 28/29 Feb). */
function addMonthsClamped(date: Date, months: number): Date {
  const d = new Date(date);
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + months);
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, lastDay));
  return d;
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
    const fromDate = formData.fromDate ? new Date(formData.fromDate) : null;
    const toDate = formData.toDate ? new Date(formData.toDate) : null;
    if (fromDate) fromDate.setHours(0, 0, 0, 0);
    if (toDate) toDate.setHours(23, 59, 59, 999);
    if (!fromDate || !toDate) return [];

    const customerMap: { [id: string]: any } = {};
    rawCustomers.forEach((c: any) => {
      if (c.id) customerMap[String(c.id)] = c;
    });

    // Groups Wise: selected group codes. Memberwise: selected member DB ids.
    const selectedGroupCodes = (formData.selectedGroups || []).map((g) =>
      g.groupCode.toLowerCase()
    );
    const selectedMemberIds = new Set(
      (formData.sortingFilterSelection?.selectedItems || []).map((i) => i.id)
    );

    const groupMap: { [key: string]: any } = {};

    rawPolicies.forEach((p) => {
      const cust = p.customer || customerMap[String(p.clientId || p.customerId)] || {};
      const memberName = getPolicyMemberName(p);
      const memberId = String(p.CustomerMaster?.id || p.CustomerMasterId || "");
      const memberPan = p.CustomerMaster?.panNumber || "";
      const addrParts = [
        cust.resAddressLine1,
        cust.resAddressLine2,
        cust.resArea || cust.offArea,
        cust.resCity || cust.offCity,
        cust.resPin || cust.offPin,
      ].filter(Boolean);
      const memberAddress = addrParts.length > 0 ? addrParts.join(", ") : "";

      // ── Filter: groupsWise by group code, memberwise by member DB id ────
      if (formData.sortingOption === "groupMemberwise") {
        if (selectedMemberIds.size > 0 && !selectedMemberIds.has(memberId)) return;
      } else if (selectedGroupCodes.length > 0) {
        const gCode = String(cust.groupCode || "").toLowerCase();
        if (!selectedGroupCodes.includes(gCode)) return;
      }

      // ── Installments: real payment records first ────────────────────────
      const payments: any[] = Array.isArray(p.premiumPayments) ? p.premiumPayments : [];
      const comDate = p.commencementDate ? new Date(p.commencementDate) : null;
      const modeName = p.premiumMode?.modeName || "Yearly";
      const modeLower = modeName.toLowerCase();
      const modeShort = modeLower.includes("month")
        ? "Mly."
        : modeLower.includes("quarter")
          ? "Qly."
          : modeLower.includes("half") || modeLower.includes("semi")
            ? "Hly."
            : modeLower.includes("single")
              ? "SP"
              : "Yly.";
      const planTermPpt = `${p.product?.planNumber || "—"}/${p.policyTerm || "—"}/${p.premiumPayingTerm || "—"}`;
      const policyNo = p.policyNumber || "—";
      const installmentPremium = Number(
        p.premium?.installmentPremium || p.premium?.totalInstallmentPremium || 0
      );

      const installments: Array<{ dueDateStr: string; payDateStr: string; premiumAmount: number }> = [];

      if (payments.length > 0) {
        // Real PremiumPayment records whose due date falls inside the period
        payments
          .filter((pay) => {
            const dd = pay.dueDate ? new Date(pay.dueDate) : null;
            return dd && !isNaN(dd.getTime()) && dd >= fromDate && dd <= toDate;
          })
          .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
          .forEach((pay) => {
            installments.push({
              dueDateStr: fmtDateShort(new Date(pay.dueDate)),
              payDateStr: pay.paidDate ? fmtDateShort(new Date(pay.paidDate)) : "—",
              premiumAmount: Number(pay.premiumAmount || installmentPremium),
            });
          });
      } else if (comDate && !isNaN(comDate.getTime())) {
        // Fallback: derive due dates from nextPremiumDueDate / commencement
        // anniversary. Pay date stays "—" — no payment record exists.
        const nextDue = p.nextPremiumDueDate ? new Date(p.nextPremiumDueDate) : null;
        const anchor =
          nextDue && !isNaN(nextDue.getTime()) ? nextDue : comDate;
        const modeMonthsMap: Record<string, number> = {
          Yearly: 12,
          "Half-Yearly": 6,
          Quarterly: 3,
          Monthly: 1,
        };
        const intervalMonths = modeMonthsMap[modeName] || 12;
        let tempDate = new Date(anchor);
        let guard = 0;
        while (tempDate <= toDate && guard < 2000) {
          if (tempDate >= fromDate) {
            installments.push({
              dueDateStr: fmtDateShort(tempDate),
              payDateStr: "—",
              premiumAmount: installmentPremium,
            });
          }
          tempDate = addMonthsClamped(tempDate, intervalMonths);
          guard += 1;
        }
      }

      if (installments.length === 0) return;

      // ── Block key/heading ───────────────────────────────────────────────
      let gCode: string;
      let gHeadName: string;
      if (formData.sortingOption === "groupMemberwise") {
        // Each member is their own certificate block, headed by member name.
        gCode = memberId || `M-${policyNo}`;
        gHeadName = memberName;
      } else {
        gCode = String(cust.groupCode || cust.id || p.clientId || "—");
        gHeadName = cust.groupName || cust.name || memberName;
      }

      if (!groupMap[gCode]) {
        groupMap[gCode] = {
          groupCode: gCode,
          groupHeadName: gHeadName,
          address: memberAddress,
          pan: memberPan,
          branchCode: p.branch?.branchCode || p.branchNo || "—",
          branchName: p.branch?.branchName || "—",
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
      for (const inst of installments) {
        mem.installments.push({ ...inst, policyNo, modeShort, planTermPpt });
        mem.totalPremium += inst.premiumAmount;
      }
    });

    return Object.values(groupMap).map((grp: any) => ({
      ...grp,
      membersList: Object.values(grp.members),
    }));
  }, [rawPolicies, rawCustomers, formData]);

  const handleDownloadPDF = async () => {
    if (!reportRef.current) return;
    setIsExporting(true);
    const toastId = toast.loading("Generating PDF certificate...");
    try {
      const canvas = await html2canvas(reportRef.current, { scale: 1.25, useCORS: true, allowTaint: true, backgroundColor: "#ffffff", logging: false });
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
        const imgData = pageCanvas.toDataURL("image/jpeg", 0.75);
        if (pageIndex > 0) pdf.addPage();
        pdf.addImage(imgData, "JPEG", 0, 0, pageWidthMm, sliceHeightPx / pxPerMm, undefined, "FAST");
        renderedPx += sliceHeightPx;
        pageIndex += 1;
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
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm print:hidden">
        <div className="flex items-center gap-3">
          <button onClick={onBackToForm} className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-slate-500 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 transition uppercase tracking-wider">
            <ArrowLeft size={16} />
            <span>Edit Filters</span>
          </button>
          <span className="text-xs bg-blue-50 text-[#1877F2] font-bold px-3 py-1 rounded-full border border-blue-200 uppercase tracking-wider">
            {formData.certificateType}
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

      {/* Main Certificate Document View */}
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
              <div key={group.groupCode + group.groupHeadName} className="border-2 border-slate-900 p-6 space-y-4">
                {/* Header Banner */}
                <div className="text-center space-y-1">
                  <div className="bg-slate-200 py-1 font-bold text-xl tracking-tight text-slate-900">
                    Life Insurance Corporation of India
                  </div>
                  <p className="text-xs font-semibold text-slate-800">
                    Branch No. : {group.branchCode}, {group.branchName}
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

                {/* Subtitle / Certification paragraph */}
                <div className="text-xs text-slate-900 leading-relaxed font-normal">
                  This is to certify that the following payments have been made under life insurance policies held by{" "}
                  <strong className="font-bold text-slate-900">{group.groupHeadName}</strong>, during the period{" "}
                  <strong className="font-bold text-slate-900">{fmtDateDMY(formData.fromDate)}</strong> to{" "}
                  <strong className="font-bold text-slate-900">{fmtDateDMY(formData.toDate)}</strong>
                  <br />
                  <span className="font-semibold">Holder of Permanent Account Number : {group.pan || "—"}</span>
                </div>

                {/* Certificate Table */}
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
                          <td className="py-1 px-2 font-medium">{mem.name}</td>
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

                {/* Total Premium Bar */}
                <div className="flex justify-center items-center gap-2 pt-2">
                  <span className="font-bold text-xs">Total Premium :</span>
                  <div className="border border-slate-900 bg-emerald-50 px-4 py-1 text-xs font-bold font-mono text-slate-900">
                    {grandTotalPremium.toFixed(2)}
                  </div>
                </div>

                {/* Signature Block */}
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
