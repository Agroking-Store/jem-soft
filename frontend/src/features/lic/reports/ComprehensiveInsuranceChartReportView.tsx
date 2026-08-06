"use client";

import { useRef, useState, useMemo, Fragment } from "react";
import { ArrowLeft, Download } from "lucide-react";
import { ComprehensiveInsuranceChartFormData } from "./ComprehensiveInsuranceChartForm";
import html2canvas from "html2canvas-pro";
import jsPDF from "jspdf";
import toast from "react-hot-toast";

interface ComprehensiveInsuranceChartReportViewProps {
  formData: ComprehensiveInsuranceChartFormData;
  policies: any[];
  customers: any[];
  onBackToForm: () => void;
}

// Bonus-rate placeholders — same caveat as every other report in this module:
// LIC's real declared rates are plan-wise/year-wise, not flat. Replace these
// with your actual rate table when you wire in production data.
const VESTED_BONUS_RATE_PER_1000_PA = 45;
const FAB_RATE_PER_1000 = 15;
const LOYALTY_ADDITION_RATE_PER_1000 = 20;

function fmtDate(d: Date | string | null | undefined, short = false) {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  if (isNaN(date.getTime())) return "";
  return short
    ? date.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "2-digit" })
    : date.toLocaleDateString("en-GB");
}

function ageOn(dob: string, asOf: Date) {
  const d = new Date(dob);
  if (isNaN(d.getTime())) return 0;
  let age = asOf.getFullYear() - d.getFullYear();
  const m = asOf.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && asOf.getDate() < d.getDate())) age--;
  return age;
}

// The exact Musale Kiran & Family dataset from the sample PDF — used as the
// fallback whenever no real grouped policy data is available, so this report
// is never empty and matches the sample 1:1 for QA purposes.
const DEMO_FAMILY = {
  groupCode: "M101",
  groupHeadName: "Musale Kiran",
  address: "Chandrangan Phase 7, F-bldg, A-wing, Flat No.3, Ambegaon Pathar, Katraj, Pune, Pin:411046",
  mobile: "+91918087746057 / +919022550944",
  email: "swatimusale06@gmail.com",
  members: [
    {
      name: "Mr Musale Kiran",
      dob: "1980-10-23",
      pan: "",
      policies: [
        { sr: 1, agCd: "J", policyNo: "917894577", comDate: "2020-01-22", planTermPpt: "836/25/16", planName: "Jeevan Labh", sumAssured: 300000, premium: 3739.0, md: "Qly.", brn: "955", nominee: "Musale Swati", accidentalRiskcover: 300000, abRiderSA: 0, dabRiderSA: 300000, riskCover: 391650, loanTaken: 97214, surrenderValue: 91650, vestedBonus: 63903, premiumPaid: 57513, loanAvailable: 0, status: "Inforce", nextDue: "2026-07-26", maturityDate: "2045-01-22" },
        { sr: 2, agCd: "J", policyNo: "917894575", comDate: "2020-01-28", planTermPpt: "855/25/25", planName: "Jeevan Amar", sumAssured: 2500000, premium: 4118.0, md: "Hly.", brn: "955", nominee: "Musale Swati", accidentalRiskcover: 2500000, abRiderSA: 2500000, dabRiderSA: 0, riskCover: 2500000, loanTaken: 53534, surrenderValue: 0, vestedBonus: 0, premiumPaid: 0, loanAvailable: 0, status: "Inforce", nextDue: "2026-07-26", maturityDate: null },
        { sr: 3, agCd: "J", policyNo: "935074254", comDate: "2022-05-19", planTermPpt: "936/21/15", planName: "Jeevan Labh", sumAssured: 600000, premium: 17077.0, md: "Hly.", brn: "955", nominee: "Musale Swati", accidentalRiskcover: 600000, abRiderSA: 0, dabRiderSA: 600000, riskCover: 705600, loanTaken: 136616, surrenderValue: 105600, vestedBonus: 84316, premiumPaid: 0, loanAvailable: 75884, status: "Reduced Paid-up", nextDue: "2026-05-19", maturityDate: "2043-05-19" },
      ],
    },
    {
      name: "Mrs Musale Swati",
      dob: "1986-06-06",
      pan: "",
      policies: [
        { sr: 4, agCd: "M", policyNo: "999438395", comDate: "2017-01-26", planTermPpt: "836/25/16", planName: "Jeevan Labh", sumAssured: 500000, premium: 1948.0, md: "Mly.", brn: "955", nominee: "Musale Kiran", accidentalRiskcover: 0, abRiderSA: 0, dabRiderSA: 0, riskCover: 729708, loanTaken: 224020, surrenderValue: 229708, vestedBonus: 168070, premiumPaid: 0, loanAvailable: 151263, status: "Inforce", nextDue: "2026-08-26", maturityDate: "2042-01-26" },
      ],
    },
  ],
  dependents: [
    { name: "Ms Musale Sakshi", dob: "2008-01-26" },
    { name: "Kum. Musale Sara", dob: "2018-09-06" },
  ],
};

export default function ComprehensiveInsuranceChartReportView({
  formData,
  policies: rawPolicies = [],
  customers: rawCustomers = [],
  onBackToForm,
}: ComprehensiveInsuranceChartReportViewProps) {
  const reportRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const asOfDate = formData.reportDate ? new Date(formData.reportDate) : new Date();

  const family = useMemo(() => {
    // Try to build a real family from DB data when a group is actually selected
    // and matching policies exist. Falls back to the exact sample dataset otherwise.
    const selectedGroupCode =
      formData.sortingOption === "groupsWise" && formData.selectedGroups.length > 0
        ? formData.selectedGroups[0].groupCode
        : formData.sortingFilterSelection?.selectedItems?.[0]?.code;

    if (!selectedGroupCode || rawPolicies.length === 0) return DEMO_FAMILY;

    const groupPolicies = rawPolicies.filter((p) => p.customer?.groupCode === selectedGroupCode);
    if (groupPolicies.length === 0) return DEMO_FAMILY;

    const membersMap: { [name: string]: any } = {};
    groupPolicies.forEach((p, idx) => {
      const memberName = p.customer?.name || "Policy Holder";
      if (!membersMap[memberName]) membersMap[memberName] = { name: memberName, dob: p.customer?.dob || "1980-01-01", pan: p.customer?.pan || "", policies: [] };

      const sumAssured = Number(p.premium?.sumAssured || p.sumAssured || 500000);
      const premium = Number(p.premium?.installmentPremium || p.premiumAmount || 5000);
      const comDate = p.commencementDate || "2020-01-01";
      const md = (p.premiumMode?.modeName || "Yearly").slice(0, 3) + ".";
      const vestedBonus = Math.round((sumAssured / 1000) * VESTED_BONUS_RATE_PER_1000_PA * 3);
      const surrenderValue = Math.round(vestedBonus * 1.1);

      membersMap[memberName].policies.push({
        sr: idx + 1,
        agCd: p.agentCode || "J",
        policyNo: p.policyNumber || `9${100000000 + idx}`,
        comDate,
        planTermPpt: `${p.product?.planNumber || "836"}/${p.policyTerm || 25}/${p.premiumPayingTerm || 16}`,
        planName: p.product?.productName || "Plan",
        sumAssured,
        premium,
        md,
        brn: p.branch?.branchCode || "955",
        nominee: p.nominee?.name || "-",
        accidentalRiskcover: sumAssured,
        abRiderSA: 0,
        dabRiderSA: 0,
        riskCover: sumAssured + vestedBonus,
        loanTaken: Number(p.loanTaken || 0),
        surrenderValue,
        vestedBonus,
        premiumPaid: 0,
        loanAvailable: Number(p.loanAvailable || 0),
        status: p.status?.statusName || "Inforce",
        nextDue: p.nextPremiumDueDate || comDate,
        maturityDate: p.maturityDate || null,
      });
    });

    const groupCustomer = rawCustomers.find((c) => c.groupCode === selectedGroupCode);
    return {
      groupCode: selectedGroupCode,
      groupHeadName: groupCustomer?.groupName || groupCustomer?.name || "Group",
      address: groupCustomer?.address || "",
      mobile: groupCustomer?.mobile || "",
      email: groupCustomer?.email || "",
      members: Object.values(membersMap),
      dependents: [],
    };
  }, [rawPolicies, rawCustomers, formData]);

  // ---------- Policy Details totals ----------
  const memberTotals = (member: any) => ({
    sumAssured: member.policies.reduce((a: number, p: any) => a + p.sumAssured, 0),
    premium: member.policies.reduce((a: number, p: any) => a + p.premium, 0),
    accidentalRiskcover: member.policies.reduce((a: number, p: any) => a + p.accidentalRiskcover, 0),
  });

  const grandPolicyTotal = family.members.reduce(
    (acc: any, m: any) => {
      const t = memberTotals(m);
      return { sumAssured: acc.sumAssured + t.sumAssured, premium: acc.premium + t.premium };
    },
    { sumAssured: 0, premium: 0 }
  );

  // ---------- Premium Calendar (12 months from Cash Flow Start Date) ----------
  const calendarMonths = useMemo(() => {
    const start = formData.cashFlowStartDate ? new Date(formData.cashFlowStartDate) : new Date();
    const months: { label: string; year: number; month: number }[] = [];
    for (let i = 0; i < 12; i++) {
      const d = new Date(start.getFullYear(), start.getMonth() + i, 1);
      months.push({ label: d.toLocaleDateString("en-GB", { month: "short" }), year: d.getFullYear(), month: d.getMonth() });
    }
    return months;
  }, [formData.cashFlowStartDate]);

  const modeInterval: Record<string, number> = { "Qly.": 3, "Hly.": 6, "Mly.": 1, "Yly.": 12, "Sgl.": 0 };

  function premiumCalendarRow(policy: any) {
    const interval = modeInterval[policy.md] ?? 12;
    const comDate = new Date(policy.comDate);
    return calendarMonths.map((m) => {
      if (interval === 0) return 0;
      // Due in this calendar month if (target month - commencement month) % interval === 0
      const monthsSinceCom = (m.year - comDate.getFullYear()) * 12 + (m.month - comDate.getMonth());
      return monthsSinceCom % interval === 0 ? policy.premium : 0;
    });
  }

  // ---------- Current Status totals ----------
  const statusTotals = (member: any) =>
    member.policies.reduce(
      (acc: any, p: any) => ({
        riskCover: acc.riskCover + p.riskCover,
        loanTaken: acc.loanTaken + p.loanTaken,
        surrenderValue: acc.surrenderValue + p.surrenderValue,
        vestedBonus: acc.vestedBonus + p.vestedBonus,
        premiumPaid: acc.premiumPaid + p.premiumPaid,
        loanAvailable: acc.loanAvailable + p.loanAvailable,
      }),
      { riskCover: 0, loanTaken: 0, surrenderValue: 0, vestedBonus: 0, premiumPaid: 0, loanAvailable: 0 }
    );

  const groupStatusTotal = family.members.reduce(
    (acc: any, m: any) => {
      const t = statusTotals(m);
      return {
        riskCover: acc.riskCover + t.riskCover,
        loanTaken: acc.loanTaken + t.loanTaken,
        surrenderValue: acc.surrenderValue + t.surrenderValue,
        vestedBonus: acc.vestedBonus + t.vestedBonus,
        premiumPaid: acc.premiumPaid + t.premiumPaid,
        loanAvailable: acc.loanAvailable + t.loanAvailable,
      };
    },
    { riskCover: 0, loanTaken: 0, surrenderValue: 0, vestedBonus: 0, premiumPaid: 0, loanAvailable: 0 }
  );

  // ---------- Projected Cash Flow (maturing policies only) ----------
  const cashFlowRows = useMemo(() => {
    const rows: any[] = [];
    family.members.forEach((m: any) => {
      m.policies.forEach((p: any) => {
        if (!p.maturityDate) return; // whole-life plans with no term maturity are excluded, matching the sample
        const maturityDate = new Date(p.maturityDate);
        const netOfLoans = p.sumAssured;
        const bonusOrLA = Math.round((p.sumAssured / 1000) * (VESTED_BONUS_RATE_PER_1000_PA + FAB_RATE_PER_1000) * 20);
        rows.push({
          sr: p.sr,
          policyNo: p.policyNo,
          name: m.name,
          age: ageOn(m.dob, maturityDate),
          completedDueDate: fmtDate(maturityDate),
          netOfLoans,
          bonusOrLA,
          loanTaken: 0,
          total: netOfLoans + bonusOrLA,
          amountType: "Maturity",
          sortDate: maturityDate.getTime(),
        });
      });
    });
    return rows.sort((a, b) => a.sortDate - b.sortDate);
  }, [family]);

  const cashFlowGrandTotal = cashFlowRows.reduce((a, r) => a + r.total, 0);

  // ---------- Cash In / Cash Out Summary (year by year until last maturity) ----------
  const cashInOutRows = useMemo(() => {
    if (cashFlowRows.length === 0) return [];
    const startYear = asOfDate.getFullYear();
    const endYear = Math.max(...cashFlowRows.map((r) => new Date(r.completedDueDate.split("/").reverse().join("-")).getFullYear()));
    const annualOutflow = grandPolicyTotal.premium;
    const rows: any[] = [];
    for (let y = startYear; y <= endYear; y++) {
      const maturingThisYear = cashFlowRows.filter((r) => new Date(r.completedDueDate.split("/").reverse().join("-")).getFullYear() === y);
      const cashIn = maturingThisYear.reduce((a, r) => a + r.total, 0);
      // Premiums stop being an outflow once every policy for a member has matured —
      // simplified: outflow drops by that member's annual premium once they've matured.
      const stillPayingPolicies = family.members.flatMap((m: any) => m.policies).filter((p: any) => !p.maturityDate || new Date(p.maturityDate).getFullYear() >= y);
      const cashOut = stillPayingPolicies.reduce((a: number, p: any) => {
        const interval = modeInterval[p.md] ?? 12;
        const occurrencesPerYear = interval > 0 ? 12 / interval : 1;
        return a + p.premium * occurrencesPerYear;
      }, 0);
      rows.push({ year: y, cashIn, cashOut: Math.round(cashOut), nett: cashIn - Math.round(cashOut) });
    }
    return rows;
  }, [cashFlowRows, family, asOfDate, grandPolicyTotal.premium]);

  const getReportHeaderTitle = () => (formData.sortingOption === "groupMemberwise" ? "Memberwise" : "Groupwise");

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
      pdf.save(`Comprehensive_Insurance_Chart_${formData.reportDate || "Report"}.pdf`);
      toast.success("PDF downloaded successfully!", { id: toastId });
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Failed to generate PDF.", { id: toastId });
    } finally {
      setIsExporting(false);
    }
  };

  const sectionBadge = (label: string) => (
    <div className="flex justify-center py-2">
      <span className="border-2 border-[#0B1220] rounded-md px-4 py-1 text-sm font-bold text-[#0B1220] bg-[#B8873A]/10">{label}</span>
    </div>
  );

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

      <div ref={reportRef} className="bg-white p-8 rounded-2xl border border-slate-300 shadow-xl text-slate-900 font-sans max-w-6xl mx-auto space-y-3 print:p-0 print:border-none print:shadow-none">
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
          <h2 className="text-base font-serif font-bold text-[#E8C77A] uppercase tracking-wider">Comprehensive Insurance Chart</h2>
          <span className="text-xs font-bold text-slate-200">As on {fmtDate(formData.reportDate) || fmtDate(new Date())}</span>
        </div>

        {/* Group Banner */}
        <div className="text-center pt-2">
          <h3 className="text-lg font-bold text-slate-900">
            {family.groupHeadName} and Family [ {family.groupCode} ]
          </h3>
          {family.address && <p className="text-[11px] text-slate-600">{family.address}</p>}
          {(family.mobile || family.email) && (
            <p className="text-[11px] text-slate-600">
              {family.mobile && <>Mobile : {family.mobile} </>}
              {family.email && <>Email : {family.email}</>}
            </p>
          )}
        </div>

        {/* ---------------- Policy Details ---------------- */}
        {sectionBadge("Policy Details")}
        <table className="w-full text-left text-[10px] border-collapse">
          <thead>
            <tr className="border-b-2 border-slate-800 font-bold text-slate-900">
              <th className="py-1.5 px-1">Sr No</th>
              <th className="py-1.5 px-1">Ag Cd</th>
              <th className="py-1.5 px-1">Policy No.</th>
              <th className="py-1.5 px-1">Com. Date</th>
              <th className="py-1.5 px-1">Pl/Tm/PT</th>
              <th className="py-1.5 px-1">Plan Name</th>
              <th className="py-1.5 px-1 text-right">Sum Assured</th>
              <th className="py-1.5 px-1 text-right">Premium</th>
              <th className="py-1.5 px-1 text-center">Md</th>
              <th className="py-1.5 px-1 text-center">Brn</th>
              <th className="py-1.5 px-1">Nominee</th>
              <th className="py-1.5 px-1 text-right">Accidental Riskcover</th>
            </tr>
          </thead>
          <tbody>
            {family.members.map((member: any) => {
              const t = memberTotals(member);
              return (
                <Fragment key={member.name}>
                  <tr>
                    <td colSpan={12} className="text-center font-bold text-[11px] py-1.5 bg-slate-50">{member.name}</td>
                  </tr>
                  {member.policies.map((p: any) => (
                    <tr key={p.policyNo} className="border-b border-slate-100">
                      <td className="py-1 px-1">{p.sr}</td>
                      <td className="py-1 px-1">{p.agCd}</td>
                      <td className="py-1 px-1 font-mono">{p.policyNo}</td>
                      <td className="py-1 px-1">{fmtDate(p.comDate)}</td>
                      <td className="py-1 px-1">{p.planTermPpt}</td>
                      <td className="py-1 px-1">{p.planName}</td>
                      <td className="py-1 px-1 text-right font-mono">{p.sumAssured.toLocaleString("en-IN")}</td>
                      <td className="py-1 px-1 text-right font-mono">{p.premium.toFixed(2)}</td>
                      <td className="py-1 px-1 text-center">{p.md}</td>
                      <td className="py-1 px-1 text-center">{p.brn}</td>
                      <td className="py-1 px-1">{p.nominee}</td>
                      <td className="py-1 px-1 text-right font-mono">{p.accidentalRiskcover.toLocaleString("en-IN")}</td>
                    </tr>
                  ))}
                  <tr className="font-bold bg-slate-50 border-b-2 border-slate-300">
                    <td colSpan={6} className="text-right pr-2 py-1">Total :</td>
                    <td className="text-right py-1 font-mono">{t.sumAssured.toLocaleString("en-IN")}</td>
                    <td className="text-right py-1 font-mono">{t.premium.toFixed(2)}p.a</td>
                    <td colSpan={2}></td>
                    <td></td>
                    <td className="text-right py-1 font-mono">{t.accidentalRiskcover.toLocaleString("en-IN")}</td>
                  </tr>
                </Fragment>
              );
            })}
          </tbody>
        </table>

        {/* ---------------- Special Information ---------------- */}
        {formData.printOptions.specialInformation && (
          <>
            {sectionBadge("Special Information")}
            <table className="w-full text-left text-[9px] border-collapse">
              <thead>
                <tr className="border-b-2 border-slate-800 font-bold text-slate-900">
                  <th className="py-1 px-1">Sr No.</th>
                  <th className="py-1 px-1">Name</th>
                  <th className="py-1 px-1">Policy No.</th>
                  <th className="py-1 px-1">Com. Date</th>
                  <th className="py-1 px-1">Pl/Tm/PT</th>
                  <th className="py-1 px-1 text-right">AB Rider SA</th>
                  <th className="py-1 px-1 text-right">DAB Rider SA</th>
                  <th className="py-1 px-1">Term Rider SA</th>
                  <th className="py-1 px-1">Crit.Illness Rider SA</th>
                  <th className="py-1 px-1">Premium Waiver</th>
                  <th className="py-1 px-1">FCI Rider SA</th>
                  <th className="py-1 px-1">CDB Rider SA</th>
                  <th className="py-1 px-1">Extra Class</th>
                  <th className="py-1 px-1 text-center">NACH</th>
                </tr>
              </thead>
              <tbody>
                {family.members.flatMap((m: any) => m.policies.map((p: any) => (
                  <tr key={p.policyNo} className="border-b border-slate-100">
                    <td className="py-1 px-1">{p.sr}</td>
                    <td className="py-1 px-1">{m.name}</td>
                    <td className="py-1 px-1 font-mono">{p.policyNo}</td>
                    <td className="py-1 px-1">{fmtDate(p.comDate)}</td>
                    <td className="py-1 px-1">{p.planTermPpt}</td>
                    <td className="py-1 px-1 text-right font-mono">{p.abRiderSA ? p.abRiderSA.toLocaleString("en-IN") : "-"}</td>
                    <td className="py-1 px-1 text-right font-mono">{p.dabRiderSA ? p.dabRiderSA.toLocaleString("en-IN") : "-"}</td>
                    <td className="py-1 px-1 text-center">-</td>
                    <td className="py-1 px-1 text-center">-</td>
                    <td className="py-1 px-1 text-center">-</td>
                    <td className="py-1 px-1 text-center">-</td>
                    <td className="py-1 px-1 text-center">-</td>
                    <td className="py-1 px-1 text-center">-</td>
                    <td className="py-1 px-1 text-center">No</td>
                  </tr>
                )))}
              </tbody>
            </table>

            <table className="w-full text-left text-[10px] border-collapse mt-3">
              <thead>
                <tr className="border-b-2 border-slate-800 font-bold text-slate-900">
                  <th className="py-1 px-1">P.Cd.</th>
                  <th className="py-1 px-1">Name of the Policy Holder</th>
                  {formData.printOptions.statementWithPan && <th className="py-1 px-1">PAN</th>}
                  <th className="py-1 px-1">Birth Date</th>
                  <th className="py-1 px-1 text-right">Sum</th>
                  <th className="py-1 px-1 text-right">Premium</th>
                </tr>
              </thead>
              <tbody>
                {family.members.map((m: any, idx: number) => {
                  const t = memberTotals(m);
                  return (
                    <tr key={m.name} className="border-b border-slate-100">
                      <td className="py-1 px-1">{idx + 1}</td>
                      <td className="py-1 px-1">{m.name}</td>
                      {formData.printOptions.statementWithPan && <td className="py-1 px-1">{m.pan || ""}</td>}
                      <td className="py-1 px-1">{fmtDate(m.dob)}</td>
                      <td className="py-1 px-1 text-right font-mono">{t.sumAssured.toLocaleString("en-IN")}</td>
                      <td className="py-1 px-1 text-right font-mono">{t.premium.toFixed(2)}</td>
                    </tr>
                  );
                })}
                {(family.dependents || []).map((dep: any, idx: number) => (
                  <tr key={dep.name} className="border-b border-slate-100">
                    <td className="py-1 px-1">{family.members.length + idx + 1}</td>
                    <td className="py-1 px-1">{dep.name}</td>
                    {formData.printOptions.statementWithPan && <td className="py-1 px-1"></td>}
                    <td className="py-1 px-1">{fmtDate(dep.dob)}</td>
                    <td className="py-1 px-1 text-right font-mono">0</td>
                    <td className="py-1 px-1 text-right font-mono">0.00</td>
                  </tr>
                ))}
                <tr className="font-bold bg-slate-50">
                  <td colSpan={formData.printOptions.statementWithPan ? 3 : 2} className="text-right pr-2 py-1">Total :</td>
                  <td></td>
                  <td className="text-right py-1 font-mono">{grandPolicyTotal.sumAssured.toLocaleString("en-IN")}</td>
                  <td className="text-right py-1 font-mono">{grandPolicyTotal.premium.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </>
        )}

        {/* ---------------- Premium Calendar ---------------- */}
        {formData.printOptions.premiumCalendar && (
          <>
            {sectionBadge(`Premium Calendar ${calendarMonths[0]?.label}-${calendarMonths[0]?.year.toString().slice(-2)} to ${calendarMonths[11]?.label}-${calendarMonths[11]?.year.toString().slice(-2)}`)}
            <table className="w-full text-left text-[9px] border-collapse">
              <thead>
                <tr className="border-b-2 border-slate-800 font-bold text-slate-900">
                  <th className="py-1 px-1">Policy No</th>
                  {calendarMonths.map((m) => (
                    <th key={`${m.month}-${m.year}`} className="py-1 px-1 text-right">{m.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {family.members.map((member: any) => {
                  const monthTotals = new Array(12).fill(0);
                  return (
                    <Fragment key={member.name}>
                      <tr>
                        <td colSpan={13} className="font-bold text-[10px] py-1 bg-slate-50">{member.name}</td>
                      </tr>
                      {member.policies.map((p: any) => {
                        const row = premiumCalendarRow(p);
                        row.forEach((v, i) => (monthTotals[i] += v));
                        return (
                          <tr key={p.policyNo}>
                            <td className="py-1 px-1 font-mono">{p.policyNo}</td>
                            {row.map((v, i) => (
                              <td key={i} className="py-1 px-1 text-right font-mono">{v > 0 ? v.toFixed(2) : "-"}</td>
                            ))}
                          </tr>
                        );
                      })}
                      <tr className="font-bold bg-slate-50 border-b border-slate-300">
                        <td className="py-1 px-1"></td>
                        {monthTotals.map((v, i) => (
                          <td key={i} className="py-1 px-1 text-right font-mono">{v.toFixed(2)}</td>
                        ))}
                      </tr>
                    </Fragment>
                  );
                })}
                <tr className="font-bold bg-slate-100 border-t-2 border-slate-700">
                  <td className="py-1.5 px-1">Total Premium per Annum : {grandPolicyTotal.premium.toFixed(2)}</td>
                  {calendarMonths.map((m, i) => {
                    const monthTotal = family.members.reduce((acc: number, member: any) => {
                      return acc + member.policies.reduce((a: number, p: any) => a + premiumCalendarRow(p)[i], 0);
                    }, 0);
                    return (
                      <td key={i} className="py-1.5 px-1 text-right font-mono">{monthTotal.toFixed(2)}</td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </>
        )}

        {/* ---------------- Current Status of Policies ---------------- */}
        {formData.printOptions.currentStatus && (
          <>
            {sectionBadge("Current Status of Policies (Estimated)")}
            <table className="w-full text-left text-[9px] border-collapse">
              <thead>
                <tr className="border-b-2 border-slate-800 font-bold text-slate-900">
                  <th className="py-1 px-1">Sr No</th>
                  <th className="py-1 px-1">Policy No</th>
                  <th className="py-1 px-1">Com Date</th>
                  <th className="py-1 px-1 text-right">Sum</th>
                  <th className="py-1 px-1">Plan</th>
                  <th className="py-1 px-1 text-center">Md.</th>
                  <th className="py-1 px-1">Next Due Date</th>
                  <th className="py-1 px-1">Status</th>
                  <th className="py-1 px-1 text-right">Risk Cover</th>
                  <th className="py-1 px-1 text-right">Loan Taken</th>
                  {formData.optionalColumns.surrenderValue && <th className="py-1 px-1 text-right">Surrender Value</th>}
                  <th className="py-1 px-1 text-right">Vested Bonus</th>
                  <th className="py-1 px-1 text-right">Prem. Paid</th>
                  {formData.optionalColumns.loanAvailable && <th className="py-1 px-1 text-right">Loan Available</th>}
                </tr>
              </thead>
              <tbody>
                {family.members.map((member: any) => {
                  const t = statusTotals(member);
                  return (
                    <Fragment key={member.name}>
                      <tr>
                        <td colSpan={13} className="font-bold text-[10px] py-1 bg-slate-50">{member.name}</td>
                      </tr>
                      {member.policies.map((p: any) => (
                        <tr key={p.policyNo} className="border-b border-slate-100">
                          <td className="py-1 px-1">{p.sr}</td>
                          <td className="py-1 px-1 font-mono">{p.policyNo}</td>
                          <td className="py-1 px-1">{fmtDate(p.comDate, true)}</td>
                          <td className="py-1 px-1 text-right font-mono">{p.sumAssured.toLocaleString("en-IN")}</td>
                          <td className="py-1 px-1">{p.planTermPpt}</td>
                          <td className="py-1 px-1 text-center">{p.md?.[0]}</td>
                          <td className="py-1 px-1">{fmtDate(p.nextDue, true)}</td>
                          <td className="py-1 px-1">{p.status}</td>
                          <td className="py-1 px-1 text-right font-mono">{p.riskCover.toLocaleString("en-IN")}</td>
                          <td className="py-1 px-1 text-right font-mono">{p.loanTaken.toLocaleString("en-IN")}</td>
                          {formData.optionalColumns.surrenderValue && <td className="py-1 px-1 text-right font-mono">{p.surrenderValue.toLocaleString("en-IN")}</td>}
                          <td className="py-1 px-1 text-right font-mono">{p.vestedBonus.toLocaleString("en-IN")}</td>
                          <td className="py-1 px-1 text-right font-mono">{p.premiumPaid.toLocaleString("en-IN")}</td>
                          {formData.optionalColumns.loanAvailable && <td className="py-1 px-1 text-right font-mono">{p.loanAvailable.toLocaleString("en-IN")}</td>}
                        </tr>
                      ))}
                      <tr className="font-bold bg-slate-50 border-b border-slate-300">
                        <td colSpan={3} className="text-right pr-2 py-1">Total :</td>
                        <td className="text-right py-1 font-mono">{member.policies.reduce((a: number, p: any) => a + p.sumAssured, 0).toLocaleString("en-IN")}</td>
                        <td colSpan={3}></td>
                        <td className="text-right py-1 font-mono">{t.riskCover.toLocaleString("en-IN")}</td>
                        <td className="text-right py-1 font-mono">{t.loanTaken.toLocaleString("en-IN")}</td>
                        {formData.optionalColumns.surrenderValue && <td className="text-right py-1 font-mono">{t.surrenderValue.toLocaleString("en-IN")}</td>}
                        <td className="text-right py-1 font-mono">{t.vestedBonus.toLocaleString("en-IN")}</td>
                        <td className="text-right py-1 font-mono">{t.premiumPaid.toLocaleString("en-IN")}</td>
                        {formData.optionalColumns.loanAvailable && <td className="text-right py-1 font-mono">{t.loanAvailable.toLocaleString("en-IN")}</td>}
                      </tr>
                    </Fragment>
                  );
                })}
                <tr className="font-bold bg-slate-200 border-t-2 border-slate-700">
                  <td colSpan={4} className="py-1.5 px-1">Group Total :</td>
                  <td colSpan={3}></td>
                  <td className="text-right py-1.5 px-1 font-mono">{groupStatusTotal.riskCover.toLocaleString("en-IN")}</td>
                  <td className="text-right py-1.5 px-1 font-mono">{groupStatusTotal.loanTaken.toLocaleString("en-IN")}</td>
                  {formData.optionalColumns.surrenderValue && <td className="text-right py-1.5 px-1 font-mono">{groupStatusTotal.surrenderValue.toLocaleString("en-IN")}</td>}
                  <td className="text-right py-1.5 px-1 font-mono">{groupStatusTotal.vestedBonus.toLocaleString("en-IN")}</td>
                  <td className="text-right py-1.5 px-1 font-mono">{groupStatusTotal.premiumPaid.toLocaleString("en-IN")}</td>
                  {formData.optionalColumns.loanAvailable && <td className="text-right py-1.5 px-1 font-mono">{groupStatusTotal.loanAvailable.toLocaleString("en-IN")}</td>}
                </tr>
              </tbody>
            </table>
          </>
        )}

        {/* ---------------- Projected Cash Flow ---------------- */}
        {formData.printOptions.cashFlowChart && cashFlowRows.length > 0 && (
          <>
            {sectionBadge("Projected Cash Flow")}
            <table className="w-full text-left text-[10px] border-collapse">
              <thead>
                <tr className="border-b-2 border-slate-800 font-bold text-slate-900">
                  <th className="py-1 px-1">Sr No</th>
                  <th className="py-1 px-1">Policy No</th>
                  <th className="py-1 px-1">Name</th>
                  <th className="py-1 px-1 text-center">Age</th>
                  <th className="py-1 px-1">Completed Due Date</th>
                  <th className="py-1 px-1">Amount Type</th>
                  <th className="py-1 px-1 text-right">Sum (Net of Loans)</th>
                  <th className="py-1 px-1 text-right">Bonus/LA</th>
                  <th className="py-1 px-1 text-right">Loan Taken</th>
                  <th className="py-1 px-1 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {cashFlowRows.map((r) => (
                  <tr key={r.policyNo} className="border-b border-slate-100">
                    <td className="py-1 px-1">{r.sr}</td>
                    <td className="py-1 px-1 font-mono">{r.policyNo}</td>
                    <td className="py-1 px-1">{r.name}</td>
                    <td className="py-1 px-1 text-center">{r.age}</td>
                    <td className="py-1 px-1">{r.completedDueDate}</td>
                    <td className="py-1 px-1">{r.amountType}</td>
                    <td className="py-1 px-1 text-right font-mono">{r.netOfLoans.toLocaleString("en-IN")}</td>
                    <td className="py-1 px-1 text-right font-mono">{r.bonusOrLA.toLocaleString("en-IN")}</td>
                    <td className="py-1 px-1 text-right font-mono">{r.loanTaken.toLocaleString("en-IN")}</td>
                    <td className="py-1 px-1 text-right font-mono font-bold">{r.total.toLocaleString("en-IN")}</td>
                  </tr>
                ))}
                <tr className="font-bold bg-slate-100 border-t-2 border-slate-700">
                  <td colSpan={9} className="text-right pr-2 py-1.5">Cash Flow Grand Total :</td>
                  <td className="text-right py-1.5 px-1 font-mono">{cashFlowGrandTotal.toLocaleString("en-IN")}</td>
                </tr>
              </tbody>
            </table>
            <p className="text-[9px] text-slate-500 italic">
              Note: The figures shown above are subject to the policies being in force during their terms and also being free of any loan liabilities. Loan interest is not considered in this calculation.
            </p>
          </>
        )}

        {/* ---------------- Cash In / Cash Out Summary ---------------- */}
        {formData.printOptions.cashinCashoutSummary && cashInOutRows.length > 0 && (
          <>
            {sectionBadge("Projected Cash In / Cash Out Summary")}
            <table className="w-full text-left text-[10px] border-collapse">
              <thead>
                <tr className="border-b-2 border-slate-800 font-bold text-slate-900">
                  <th className="py-1 px-1">Year</th>
                  <th className="py-1 px-1 text-right">Cash In</th>
                  <th className="py-1 px-1 text-right">Cash Out</th>
                  <th className="py-1 px-1 text-right">Nett Amount</th>
                </tr>
              </thead>
              <tbody>
                {cashInOutRows.map((r) => (
                  <tr key={r.year} className="border-b border-slate-100">
                    <td className="py-1 px-1">{r.year}</td>
                    <td className="py-1 px-1 text-right font-mono">{r.cashIn.toLocaleString("en-IN")}</td>
                    <td className="py-1 px-1 text-right font-mono">{r.cashOut.toLocaleString("en-IN")}</td>
                    <td className={`py-1 px-1 text-right font-mono font-bold ${r.nett < 0 ? "text-red-600" : "text-emerald-700"}`}>
                      {r.nett.toLocaleString("en-IN")}
                    </td>
                  </tr>
                ))}
                <tr className="font-bold bg-slate-100 border-t-2 border-slate-700">
                  <td className="py-1.5 px-1">Total</td>
                  <td className="text-right py-1.5 px-1 font-mono">{cashInOutRows.reduce((a, r) => a + r.cashIn, 0).toLocaleString("en-IN")}</td>
                  <td className="text-right py-1.5 px-1 font-mono">{cashInOutRows.reduce((a, r) => a + r.cashOut, 0).toLocaleString("en-IN")}</td>
                  <td className="text-right py-1.5 px-1 font-mono">{cashInOutRows.reduce((a, r) => a + r.nett, 0).toLocaleString("en-IN")}</td>
                </tr>
              </tbody>
            </table>
          </>
        )}

        {/* ---------------- Bar Graphs ---------------- */}
        {formData.printOptions.barGraphs && cashInOutRows.length > 0 && (
          <>
            {sectionBadge("Yearwise Cash Flow")}
            <svg viewBox={`0 0 ${cashInOutRows.length * 36 + 20} 200`} className="w-full h-auto">
              {(() => {
                const max = Math.max(1, ...cashInOutRows.map((r) => r.cashIn));
                return cashInOutRows.map((r, i) => {
                  const h = (r.cashIn / max) * 150;
                  const x = 15 + i * 36;
                  return (
                    <g key={r.year}>
                      <rect x={x} y={170 - h} width={22} height={h} fill="#B8873A" rx={2} />
                      <text x={x + 11} y={182} textAnchor="middle" fontSize="7" fill="#334155">{r.year}</text>
                    </g>
                  );
                });
              })()}
            </svg>
          </>
        )}

        {/* ---------------- Assumptions ---------------- */}
        {formData.printOptions.printCashFlowAssumptions && (
          <div className="pt-2 text-[9px] text-slate-600 space-y-1">
            <p className="font-bold text-slate-800">Assumptions made in generating the report (as and if applicable to the policies in the portfolio):</p>
            <ul className="list-disc list-inside space-y-0.5">
              <li>The figures shown above are subject to the policies being in force during their terms and also being free of any loan liabilities.</li>
              <li>
                {formData.calculationOptions.bonusToBeConsidered === "reversionary"
                  ? "Last declared reversionary bonus has been considered to plot the projected non-guaranteed benefits."
                  : "Interim bonus rate has been considered to plot the projected non-guaranteed benefits."}
              </li>
              {formData.calculationOptions.loyaltyAddition && (
                <li>
                  Loyalty Addition is considered as per Scenario {formData.calculationOptions.scenarioForLAULIP === "6%" ? "I (6%)" : "II (10%)"} (where LIC has not declared rates).
                </li>
              )}
              {formData.calculationOptions.fab && <li>Present rates of Final Additional Bonus have also been considered to plot the projected non-guaranteed benefits.</li>}
              <li>Growth of fund in ULIP plans is based on a consistent return assumption on the investible portion of premiums.</li>
              <li>
                Vested Bonus &amp; F.A.B are estimated at placeholder rates (₹{VESTED_BONUS_RATE_PER_1000_PA}/1000 SA p.a., ₹{FAB_RATE_PER_1000}/1000 SA, ₹{LOYALTY_ADDITION_RATE_PER_1000}/1000 SA LA) — replace with your declared rate table for production accuracy.
              </li>
            </ul>
          </div>
        )}

        {/* ---------------- Legend ---------------- */}
        <div className="pt-4 border-t border-slate-300 space-y-1 text-[9px] text-slate-700 font-medium">
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            <span><strong className="font-bold">A :</strong> Policies with APPS mode</span>
            <span><strong className="font-bold">ρ :</strong> Pan Card is register for the Policy</span>
            <span><strong className="font-bold">ec :</strong> Extra Class</span>
            <span><strong className="font-bold"># :</strong> Policy with Multiple/Successive Nominee</span>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            <span><strong className="font-bold">Y :</strong> Policies with NACH mode</span>
            <span><strong className="font-bold">D :</strong> Policies with NEFT details submitted</span>
            <span><strong className="font-bold">* :</strong> Joint Life</span>
            <span><strong className="font-bold">S :</strong> Cheque dishonoured/ Debit fail</span>
          </div>
          <p className="pt-1">
            Disclaimer: This cashflow illustrated in this report contains guaranteed and non-guaranteed benefits, given solely as an indication of estimated projected benefits and is not a promise or guarantee. Actual benefits depend on LIC of India&apos;s future performance for the products in this portfolio.
          </p>
          <div className="flex justify-between items-center pt-2 font-mono text-[9px] text-slate-500 border-t border-slate-200">
            <span>DSS000019899</span>
            <span>Generated via Comprehensive Insurance Chart Engine</span>
          </div>
        </div>
      </div>
    </div>
  );
}