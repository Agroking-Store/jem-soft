"use client";

import { Fragment, useMemo, useRef, useState } from "react";
import { ArrowLeft, Download } from "lucide-react";
import html2canvas from "html2canvas-pro";
import jsPDF from "jspdf";
import toast from "react-hot-toast";
import { PolicyMaturityFormData } from "./PolicyMaturityForm";
import type { Policy } from "@/features/policy/policySlice";

interface Props {
  formData: PolicyMaturityFormData;
  policies: MaturityPolicy[];
  customers: unknown[];
  onBackToForm: () => void;
}

interface MaturityPolicy extends Policy {
  isAnnuity?: boolean;
  isRecordOnly?: boolean;
  maturityAmount?: number | string | null;
  bonusGa?: number | string | null;
  vestedBonus?: number | string | null;
  fabLa?: number | string | null;
  finalAdditionalBonus?: number | string | null;
  outstandingPremium?: number | string | null;
  premiumOutstanding?: number | string | null;
  sumAssured?: number | string | null;
  branchNo?: string | null;
  CustomerMaster?: (NonNullable<Policy["CustomerMaster"]> & {
    contactInfo?: { mobile1?: string | null } | null;
    addresses?: Array<{ addressLine1?: string | null; addressLine2?: string | null; city?: string | null; state?: string | null; pin?: string | null }>;
  }) | null;
  customer?: (NonNullable<Policy["customer"]> & { mobile?: string | null; mobile1?: string | null; dob?: string | null; pan?: string | null; panNumber?: string | null }) | null;
  premium?: (NonNullable<Policy["premium"]> & { maturityAmount?: number | string | null }) | null;
  product?: (NonNullable<Policy["product"]> & { isAnnuity?: boolean | null }) | null;
  advisor?: { advisorCode?: string | null; advisorName?: string | null; agency?: { agencyCode?: string | null; agencyName?: string | null } | null } | null;
  branch?: { branchCode?: string | null } | null;
  loans?: Array<{ loanAmount?: number | string | null; loanStatus?: { statusCode?: string | null } | null }>;
}

interface GroupMember {
  name: string;
  address: string;
  mobile: string;
  policies: Row[];
}

interface ReportGroup {
  groupCode: string;
  groupName: string;
  members: GroupMember[];
  totalMaturityAmount: number;
}

interface Row {
  policyNo: string;
  agentCode: string;
  commencementDate: string;
  planTermPpt: string;
  sumAssured: number;
  maturityDate: string;
  maturityAmount: number;
  bonusGa: number;
  fabLa: number;
  outstandingPremium: number;
  totalMaturityAmount: number;
  loanTaken: number;
  branch: string;
  dob: string;
  pan: string;
}

function formatDate(value: Date | string | null | undefined) {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString("en-GB");
}

function toAmount(value: unknown) {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : 0;
}

function formatAmount(value: number) {
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(value);
}

function attributeAmount(policy: MaturityPolicy, attributeCodes: string[]) {
  const codes = new Set(attributeCodes.map((code) => code.toUpperCase()));
  const record = (policy.policyAttributes || []).find((item) => {
    const code = String(item.attribute?.attributeCode || "").toUpperCase();
    const name = String(item.attribute?.attributeName || "").toUpperCase();
    return codes.has(code) || codes.has(name);
  });
  return toAmount(record?.value);
}

function maturityDateFor(policy: MaturityPolicy): Date | null {
  if (policy.maturityDate) {
    const date = new Date(policy.maturityDate);
    if (!Number.isNaN(date.getTime())) return date;
  }
  if (policy.commencementDate && policy.policyTerm) {
    const date = new Date(policy.commencementDate);
    if (!Number.isNaN(date.getTime())) {
      date.setFullYear(date.getFullYear() + Number(policy.policyTerm));
      return date;
    }
  }
  return null;
}

function memberName(policy: MaturityPolicy) {
  const member = policy.CustomerMaster;
  if (member) {
    const name = [member.salutation, member.firstName, member.middleName, member.lastName]
      .filter(Boolean)
      .join(" ")
      .trim();
    if (name) return name;
  }
  return policy.customer?.name || "Policy Holder";
}

export default function PolicyMaturityReportView({ formData, policies: rawPolicies = [], onBackToForm }: Props) {
  const reportRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  const headerTitle = () => {
    if (formData.sortingOption === "groupMemberwise") return "Memberwise";
    if (formData.sortingOption === "branchNoWise") return "Branchwise";
    if (formData.sortingOption === "maturityDatewise") return "Maturity Datewise";
    return "Groupwise";
  };

  const groupData = useMemo(() => {
    const from = formData.fromMaturityDate ? new Date(formData.fromMaturityDate) : null;
    const to = formData.toMaturityDate ? new Date(formData.toMaturityDate) : null;
    if (from) from.setHours(0, 0, 0, 0);
    if (to) to.setHours(23, 59, 59, 999);

    const selectedItems = formData.sortingFilterSelection?.selectedItems || [];
    const selectedGroupCodes = new Set<string>(
      (formData.sortingOption === "groupsWise" ? formData.selectedGroups || [] : selectedItems)
        .map((item) => {
          const candidate = item as { groupCode?: string; code?: string; name?: string };
          return String(candidate.groupCode || candidate.code || candidate.name || "").toLowerCase();
        })
    );
    const selectedMembers = new Set(selectedItems.map((item) => item.id));
    const groups = new Map<string, { groupCode: string; groupName: string; members: Map<string, GroupMember>; totalMaturityAmount: number }>();

    rawPolicies.forEach((policy) => {
      if ((policy.product?.isAnnuity || policy.isAnnuity) && !formData.includeAnnuityPolicies) return;
      if (policy.isRecordOnly && !formData.includeRecordOnlyPolicies) return;

      const maturityDate = maturityDateFor(policy);
      if (!maturityDate || (from && maturityDate < from) || (to && maturityDate > to)) return;

      const groupCode = String(policy.customer?.groupCode || `M${String(policy.clientId || "01").padStart(3, "0")}`);
      const groupName = String(policy.customer?.groupName || policy.customer?.name || "Customer Group");
      const member = policy.CustomerMaster;
      const memberId = member?.id || policy.CustomerMasterId || "";
      if (selectedMembers.size > 0 && formData.sortingOption === "groupMemberwise" && !selectedMembers.has(memberId)) return;
      if (selectedGroupCodes.size > 0 && formData.sortingOption !== "groupMemberwise") {
        const candidates = [groupCode, groupName, policy.policyNumber].map((value) => String(value || "").toLowerCase());
        if (![...selectedGroupCodes].some((selected) => candidates.some((candidate) => candidate.includes(selected)))) return;
      }

      const maturityAmount = toAmount(policy.maturityAmount ?? policy.premium?.maturityAmount ?? attributeAmount(policy, ["MATURITY_AMOUNT", "MATURITY AMOUNT"]));
      const bonusGa = toAmount(policy.bonusGa ?? policy.vestedBonus ?? attributeAmount(policy, ["BONUS_GA", "BONUS/GA", "VESTED_BONUS", "REVERSIONARY_BONUS"]));
      const fabLa = toAmount(policy.fabLa ?? policy.finalAdditionalBonus ?? attributeAmount(policy, ["FAB_LA", "FAB/LA", "FINAL_ADDITIONAL_BONUS", "F.A.B", "LOYALTY_ADDITION"]));
      const outstandingPremium = toAmount(policy.outstandingPremium ?? policy.premiumOutstanding ?? attributeAmount(policy, ["OUTSTANDING_PREMIUM", "LESS_O_S_PREMIUM", "LESS O/S PREMIUM"]));
      const loanTaken = (policy.loans || [])
        .filter((loan) => String(loan.loanStatus?.statusCode || "").toUpperCase() === "ACTIVE")
        .reduce((total, loan) => total + toAmount(loan.loanAmount), 0);
      const row: Row = {
        policyNo: String(policy.policyNumber || "—"),
        agentCode: String(policy.agentCode || policy.advisor?.advisorCode || policy.advisor?.agency?.agencyCode || "—"),
        commencementDate: formatDate(policy.commencementDate),
        planTermPpt: `${policy.product?.planNumber || "—"}/${policy.policyTerm ?? "—"}/${policy.premiumPayingTerm ?? "—"}`,
        sumAssured: toAmount(policy.premium?.sumAssured ?? policy.sumAssured),
        maturityDate: formatDate(maturityDate),
        maturityAmount,
        bonusGa,
        fabLa,
        outstandingPremium,
        totalMaturityAmount: Math.max(0, maturityAmount + bonusGa + fabLa - outstandingPremium),
        loanTaken,
        branch: String(policy.branch?.branchCode || policy.branchNo || "—"),
        dob: formatDate(member?.dob || policy.customer?.dob),
        pan: String(member?.panNumber || policy.customer?.pan || policy.customer?.panNumber || "—"),
      };

      if (!groups.has(groupCode)) groups.set(groupCode, { groupCode, groupName, members: new Map<string, GroupMember>(), totalMaturityAmount: 0 });
      const group = groups.get(groupCode)!;
      const name = memberName(policy);
      if (!group.members.has(name)) {
        const address = member?.addresses?.[0];
        group.members.set(name, {
          name,
          address: [address?.addressLine1, address?.addressLine2, address?.city, address?.state, address?.pin].filter(Boolean).join(", "),
          mobile: String(member?.contactInfo?.mobile1 || policy.customer?.mobile || policy.customer?.mobile1 || ""),
          policies: [],
        });
      }
      group.members.get(name)!.policies.push(row);
      group.totalMaturityAmount += row.totalMaturityAmount;
    });

    return Array.from(groups.values())
      .sort((left, right) => left.groupCode.localeCompare(right.groupCode))
      .map((group) => ({
        ...group,
        members: Array.from(group.members.values())
          .sort((left, right) => left.name.localeCompare(right.name))
          .map((member) => ({ ...member, policies: [...member.policies].sort((left, right) => left.maturityDate.localeCompare(right.maturityDate)) })),
      })) as ReportGroup[];
  }, [formData, rawPolicies]);

  const rows = groupData.flatMap((group) => group.members.flatMap((member) => member.policies));
  const totalMaturityAmount = rows.reduce((total, row) => total + row.totalMaturityAmount, 0);
  const modes = [...new Set(rawPolicies.map((policy) => String(policy.premiumMode?.modeName || "").trim()).filter(Boolean))];
  const modeLabel = modes.length === 1 ? modes[0] : modes.length > 1 ? "Mixed" : "—";
  const firstPolicy = rawPolicies[0];
  const owner = firstPolicy?.advisor?.agency?.agencyName || firstPolicy?.advisor?.advisorName || "JEM Soft";
  const ownerCode = firstPolicy?.advisor?.agency?.agencyCode || firstPolicy?.advisor?.advisorCode || firstPolicy?.agentCode;
  const extraColumns = Number(formData.reportOptions.dob) + Number(formData.reportOptions.statementWithPan);
  const totalColumns = 12 + extraColumns;

  const downloadPdf = async () => {
    if (!reportRef.current) return;
    setIsExporting(true);
    const toastId = toast.loading("Generating Maturity Due Statement...");
    const element = reportRef.current;
    const originalWidth = element.style.width;
    try {
      element.style.width = "1040px";
      const canvas = await html2canvas(element, { scale: 2, useCORS: true, allowTaint: true, backgroundColor: "#ffffff", logging: false });
      element.style.width = originalWidth;
      const pdf = new jsPDF({ orientation: "p", unit: "mm", format: "a4", compress: true });
      const pageWidth = 210;
      const pageHeight = 297;
      const pixelsPerMm = canvas.width / pageWidth;
      const pagePixels = Math.floor(pageHeight * pixelsPerMm);
      for (let offset = 0, page = 0; offset < canvas.height; page += 1) {
        const height = Math.min(pagePixels, canvas.height - offset);
        const pageCanvas = document.createElement("canvas");
        pageCanvas.width = canvas.width;
        pageCanvas.height = height;
        const context = pageCanvas.getContext("2d");
        if (!context) throw new Error("Canvas context not available");
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
        context.drawImage(canvas, 0, offset, canvas.width, height, 0, 0, canvas.width, height);
        if (page > 0) pdf.addPage();
        pdf.addImage(pageCanvas.toDataURL("image/jpeg", 0.9), "JPEG", 0, 0, pageWidth, height / pixelsPerMm, undefined, "FAST");
        offset += height;
      }
      pdf.save(`Maturity_Due_Statement_${formData.reportDate || "Report"}.pdf`);
      toast.success("Maturity Due Statement downloaded.", { id: toastId });
    } catch (error: unknown) {
      element.style.width = originalWidth;
      toast.error(error instanceof Error ? error.message : "Failed to generate the Maturity Due Statement.", { id: toastId });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row print:hidden">
        <div className="flex items-center gap-3">
          <button onClick={onBackToForm} className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 transition hover:bg-slate-100"><ArrowLeft size={16} />Edit Filters</button>
          <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-[#1877F2]">{headerTitle()}</span>
        </div>
        <button onClick={downloadPdf} disabled={isExporting} className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#5c67ff] to-[#3a47ff] px-6 py-2 text-xs font-bold uppercase tracking-wider text-white shadow-md shadow-blue-200 transition hover:brightness-110 disabled:opacity-50"><Download size={16} />{isExporting ? "Exporting..." : "Download PDF"}</button>
      </div>

      <div className="overflow-x-auto pb-2">
        <div ref={reportRef} style={{ fontFamily: "Arial, Helvetica, sans-serif", color: "#111827" }} className="min-w-[980px] border border-slate-300 bg-white p-4 text-[9px] leading-tight shadow-xl print:min-w-0 print:border-0 print:p-0 print:shadow-none">
          <div className="relative h-28 overflow-hidden border border-[#efb6cb] bg-[#fff5f8] px-5 py-4">
            <div className="absolute inset-y-0 left-0 w-[62%] bg-[#fce1ec]" style={{ clipPath: "polygon(0 0, 88% 0, 100% 100%, 0 100%)" }} />
            <div className="relative z-10"><div className="text-[13px] font-bold text-[#1f2e5b]">{owner}</div><div className="mt-1 text-[9px] text-[#7b3652]">Insurance Management Statement</div>{ownerCode && <div className="mt-3 text-[8px] text-slate-700">Agency / Advisor Code: {ownerCode}</div>}</div>
          </div>
          <div className="mt-2 flex items-center justify-between border border-black bg-[#f4ebd8] px-2 py-1 text-[11px] font-bold text-black"><span>Maturity Due Statement</span><span>{headerTitle()}</span></div>
          <div className="grid grid-cols-[1fr_auto] gap-x-6 px-1 pt-1 text-[8px] text-black"><div>Date : {formatDate(formData.reportDate)}</div><div>Page 1 of 1</div><div>Policy Maturity Date between {formatDate(formData.fromMaturityDate)} and {formatDate(formData.toMaturityDate)}</div><div>No. of Installment : —, Mode : {modeLabel}</div></div>

          {groupData.length === 0 ? (
            <div className="mt-5 border border-dashed border-slate-400 px-6 py-16 text-center text-sm"><div className="font-bold">No Maturing Policies Found</div><p className="mt-1 text-xs">There are no policies matching the selected maturity date range and filters.</p></div>
          ) : (
            <table className="mt-2 w-full border-collapse text-[8px] text-black">
              <thead><tr className="border-y border-black text-center font-bold align-bottom"><th className="px-1 py-1 text-left">Policy</th><th className="px-1 py-1">Ag. Com<br />Date</th><th className="px-1 py-1">Pl/Trm/Pt</th><th className="px-1 py-1 text-right">Sum<br />Assured</th><th className="px-1 py-1">Maturity<br />Date</th><th className="px-1 py-1 text-right">Maturity<br />Amount</th><th className="px-1 py-1 text-right">Bonus/<br />GA</th><th className="px-1 py-1 text-right">FAB/<br />LA</th><th className="px-1 py-1 text-right">Less O/S<br />Premium</th><th className="px-1 py-1 text-right">Total Mat.<br />Amount</th><th className="px-1 py-1 text-right">Loan<br />Taken</th><th className="px-1 py-1">Brn</th>{formData.reportOptions.dob && <th className="px-1 py-1">D.O.B.</th>}{formData.reportOptions.statementWithPan && <th className="px-1 py-1">PAN</th>}</tr></thead>
              <tbody>
                {groupData.map((group) => <Fragment key={group.groupCode}>
                  <tr><td colSpan={totalColumns} className="pt-2 pb-1 text-center text-[10px] font-bold">{group.groupCode}: {group.groupName}</td></tr>
                  {group.members.map((member) => <Fragment key={member.name}>
                    <tr><td colSpan={totalColumns} className="pt-1 pb-0.5 font-bold">{member.name}{(formData.reportOptions.printAddress || formData.reportOptions.printTelNo) && <span className="ml-2 text-[7px] font-normal">{[formData.reportOptions.printAddress && member.address, formData.reportOptions.printTelNo && member.mobile].filter(Boolean).join(" | ")}</span>}</td></tr>
                    {member.policies.map((row: Row) => <tr key={row.policyNo} className="whitespace-nowrap"><td className="px-1 py-0.5 font-mono">{row.policyNo}</td><td className="px-1 py-0.5 text-center">{row.agentCode}<br />{row.commencementDate}</td><td className="px-1 py-0.5 text-center">{row.planTermPpt}</td><td className="px-1 py-0.5 text-right">{formatAmount(row.sumAssured)}</td><td className="px-1 py-0.5 text-center">{row.maturityDate}</td><td className="px-1 py-0.5 text-right">{formatAmount(row.maturityAmount)}</td><td className="px-1 py-0.5 text-right">{formatAmount(row.bonusGa)}</td><td className="px-1 py-0.5 text-right">{formatAmount(row.fabLa)}</td><td className="px-1 py-0.5 text-right">{formatAmount(row.outstandingPremium)}</td><td className="px-1 py-0.5 text-right font-bold">{formatAmount(row.totalMaturityAmount)}</td><td className="px-1 py-0.5 text-right">{formatAmount(row.loanTaken)}</td><td className="px-1 py-0.5 text-center">{row.branch}</td>{formData.reportOptions.dob && <td className="px-1 py-0.5 text-center">{row.dob}</td>}{formData.reportOptions.statementWithPan && <td className="px-1 py-0.5 text-center">{row.pan}</td>}</tr>)}
                  </Fragment>)}
                  <tr className="font-bold"><td colSpan={9} className="px-1 pt-1 text-right">Group Total :</td><td className="border-y border-black px-1 pt-1 text-right">{formatAmount(group.totalMaturityAmount)}</td><td colSpan={2 + extraColumns} className="px-1 pt-1" /></tr>
                </Fragment>)}
                <tr className="font-bold"><td colSpan={9} className="px-1 pt-2 text-right">Total :</td><td className="border-y-[3px] border-double border-black px-1 pt-2 text-right">{formatAmount(totalMaturityAmount)}</td><td colSpan={2 + extraColumns} className="px-1 pt-2" /></tr>
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
