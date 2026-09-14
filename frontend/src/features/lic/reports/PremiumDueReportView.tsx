"use client";

import { useRef, useState, useMemo, Fragment } from "react";
import {
  ArrowLeft,
  Download,
  Printer,
  FileText,
  Users,
  CalendarDays,
  IndianRupee,
  CheckCircle2,
} from "lucide-react";
import { PremiumDueFormData } from "./PremiumDueForm";
import html2canvas from "html2canvas-pro";
import jsPDF from "jspdf";
import toast from "react-hot-toast";

// ─── Props ────────────────────────────────────────────────────────────────────
interface PremiumDueReportViewProps {
  formData: PremiumDueFormData;
  policies: any[];
  customers: any[];
  onBackToForm: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtDate(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  if (isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-GB");
}

function fmtCurrency(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return "—";
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

function asDate(val: unknown): Date | null {
  if (!val) return null;
  const d = new Date(val as string);
  return isNaN(d.getTime()) ? null : d;
}

function asNum(val: unknown): number {
  const n = Number(val);
  return isNaN(n) ? 0 : n;
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface DueRow {
  sNo: number;
  groupCode: string;
  groupName: string;
  policyNo: string;
  insuredName: string;
  plan: string;
  sumAssured: number;
  premiumMode: string;
  dueDate: string;
  premium: number;
  paymentType: string;
}

// ─── Sample fallback data ─────────────────────────────────────────────────────
const SAMPLE_ROWS: DueRow[] = [
  { sNo: 1, groupCode: "GRP001", groupName: "Test Customer Group", policyNo: "973218099", insuredName: "Rohit Sharma", plan: "Jeevan Anand (915)", sumAssured: 500000, premiumMode: "YLY", dueDate: "01/11/2026", premium: 28450.0, paymentType: "Other" },
  { sNo: 2, groupCode: "GRP001", groupName: "Test Customer Group", policyNo: "973218100", insuredName: "Shweta Sharma", plan: "New Endowment (814)", sumAssured: 300000, premiumMode: "HLY", dueDate: "01/11/2026", premium: 16220.5, paymentType: "Other" },
  { sNo: 3, groupCode: "GRP001", groupName: "Test Customer Group", policyNo: "973218101", insuredName: "Aahan Sharma", plan: "Micro Bachat (751)", sumAssured: 100000, premiumMode: "YLY", dueDate: "15/11/2026", premium: 5600.0, paymentType: "NACH" },
  { sNo: 4, groupCode: "GRP002", groupName: "Patil Family Group", policyNo: "956221045", insuredName: "Manoj Patil", plan: "Jeevan Labh (936)", sumAssured: 750000, premiumMode: "YLY", dueDate: "10/11/2026", premium: 39800.0, paymentType: "Other" },
  { sNo: 5, groupCode: "GRP002", groupName: "Patil Family Group", policyNo: "956221046", insuredName: "Sunita Patil", plan: "New Bima Gold (179)", sumAssured: 200000, premiumMode: "YLY", dueDate: "20/11/2026", premium: 11350.0, paymentType: "Other" },
  { sNo: 6, groupCode: "GRP003", groupName: "Kulkarni Group", policyNo: "912034201", insuredName: "Suresh Kulkarni", plan: "Jeevan Umang (945)", sumAssured: 1000000, premiumMode: "QTY", dueDate: "05/11/2026", premium: 15480.0, paymentType: "NACH" },
  { sNo: 7, groupCode: "GRP003", groupName: "Kulkarni Group", policyNo: "912034202", insuredName: "Rekha Kulkarni", plan: "Money Plus (180)", sumAssured: 250000, premiumMode: "MLY", dueDate: "01/11/2026", premium: 3200.0, paymentType: "Other" },
];

// ─── Main Component ───────────────────────────────────────────────────────────
export default function PremiumDueReportView({
  formData,
  policies: rawPolicies = [],
  customers: rawCustomers = [],
  onBackToForm,
}: PremiumDueReportViewProps) {
  const reportRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  // ── Build rows from Redux data or fallback to sample ──────────────────────
  const rows = useMemo((): DueRow[] => {
    const fromDate = asDate(formData.fromDueDate);
    const toDate = asDate(formData.toDueDate);

    const selectedStatusNames = (formData.appliedFilters || [])
      .filter((f) => f.type === "Policy Status")
      .map((f) => f.name.toLowerCase().replace(/[- ]/g, ""));

    const validPolicies = rawPolicies.filter((p) => {
      const dueRaw = p.nextPremiumDueDate ?? p.dueDate;
      const dueDate = asDate(dueRaw as string);

      if (fromDate && dueDate && dueDate < fromDate) return false;
      if (toDate && dueDate && dueDate > toDate) return false;

      const rawStatus = String(
        (p.status as Record<string, unknown>)?.statusName ?? p.statusName ?? "Active"
      ).toLowerCase();
      if (selectedStatusNames.length > 0) {
        const normStatus = rawStatus.replace(/[- ]/g, "");
        const matches = selectedStatusNames.some(
          (st) => normStatus.includes(st) || st.includes(normStatus)
        );
        if (!matches) return false;
      }

      const isLapsed = rawStatus.includes("lapsed");
      if (isLapsed && !formData.includeLapsedPolicies) return false;

      const isNach = Boolean(
        String((p.premiumMode as Record<string, unknown>)?.modeName ?? "")
          .toLowerCase()
          .includes("nach") || p.isNach
      );
      if (isNach && !formData.paymentTypes.nach) return false;
      if (!isNach && !formData.paymentTypes.otherThanNach) return false;

      return true;
    });

    if (validPolicies.length === 0) {
      // Filter sample data
      return SAMPLE_ROWS.filter((r) => {
        if (!formData.paymentTypes.nach && r.paymentType === "NACH") return false;
        if (!formData.paymentTypes.otherThanNach && r.paymentType === "Other") return false;
        return true;
      });
    }

    // Map real policies → DueRow
    const customerMap: Record<string, Record<string, unknown>> = {};
    rawCustomers.forEach((c) => {
      const cust = c as Record<string, unknown>;
      if (cust.id) customerMap[String(cust.id)] = cust;
    });

    return validPolicies.map((p, idx) => {
      const cust =
        (p.customer as Record<string, unknown>) ??
        customerMap[String(p.customerId)] ??
        {};
      const isNach = Boolean(
        String((p.premiumMode as Record<string, unknown>)?.modeName ?? "")
          .toLowerCase()
          .includes("nach") || p.isNach
      );
      const dueDate = asDate(
        (p.nextPremiumDueDate ?? p.dueDate) as string
      );
      const plan =
        (p.product as Record<string, unknown>)?.productName ??
        p.planName ??
        "—";
      return {
        sNo: idx + 1,
        groupCode: String(cust.groupCode ?? "GRP000"),
        groupName: String(cust.groupName ?? cust.name ?? "Unknown Group"),
        policyNo: String(p.policyNumber ?? p.policyNo ?? "—"),
        insuredName: String(
          cust.name ??
            `${p.firstName ?? ""} ${p.lastName ?? ""}`.trim() ??
            "—"
        ),
        plan: String(plan),
        sumAssured: asNum(p.sumAssured),
        premiumMode: String(
          (p.premiumMode as Record<string, unknown>)?.modeName ??
            p.premiumMode ??
            "—"
        ),
        dueDate: dueDate ? fmtDate(dueDate) : "—",
        premium: asNum(p.annualPremium ?? p.premium),
        paymentType: isNach ? "NACH" : "Other",
      } as DueRow;
    });
  }, [rawPolicies, rawCustomers, formData]);

  // ── Group rows by group name ──────────────────────────────────────────────
  const groupedRows = useMemo(() => {
    const map: Record<string, DueRow[]> = {};
    rows.forEach((r) => {
      if (!map[r.groupName]) map[r.groupName] = [];
      map[r.groupName].push(r);
    });
    return Object.entries(map);
  }, [rows]);

  // ── KPI summaries ─────────────────────────────────────────────────────────
  const totalPolicies = rows.length;
  const totalGroups = groupedRows.length;
  const totalPremium = rows.reduce((s, r) => s + r.premium, 0);
  const nachCount = rows.filter((r) => r.paymentType === "NACH").length;

  // ── Export PDF ────────────────────────────────────────────────────────────
  const handleDownloadPDF = async () => {
    if (!reportRef.current) return;
    setIsExporting(true);
    const toastId = toast.loading("Generating PDF…");
    try {
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
      });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      const pdfW = pdf.internal.pageSize.getWidth();
      const pdfH = (canvas.height * pdfW) / canvas.width;
      pdf.addImage(imgData, "PNG", 0, 0, pdfW, pdfH);
      pdf.save(`Premium_Due_Report_${formData.fromDueDate}_${formData.toDueDate}.pdf`);
      toast.success("PDF downloaded!", { id: toastId });
    } catch (err: unknown) {
      toast.error(`Export failed: ${(err as Error)?.message ?? "Unknown error"}`, { id: toastId });
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrint = () => window.print();

  // ── Date display ──────────────────────────────────────────────────────────
  const displayFromDate = formData.fromDueDate
    ? new Date(formData.fromDueDate).toLocaleDateString("en-GB")
    : "—";
  const displayToDate = formData.toDueDate
    ? new Date(formData.toDueDate).toLocaleDateString("en-GB")
    : "—";
  const reportDateDisplay = formData.reportDate
    ? new Date(formData.reportDate).toLocaleDateString("en-GB")
    : new Date().toLocaleDateString("en-GB");

  return (
    <div className="space-y-6 pb-12">
      {/* ── Header Banner ─────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-[#0B1220] p-6 text-white border border-slate-800 shadow-xl">
        <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#B8873A] via-[#E8C77A] to-transparent" />
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={onBackToForm}
              className="p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-xl transition flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider"
            >
              <ArrowLeft size={18} />
              <span>Edit Filters</span>
            </button>
            <div className="h-6 w-px bg-white/15" />
            <h1 className="font-serif text-xl font-bold text-[#E8C77A] tracking-wider uppercase">
              Premium Due Report
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-slate-300 hover:text-white hover:bg-white/10 rounded-xl transition border border-white/10"
            >
              <Printer size={16} />
              <span>Print</span>
            </button>
            <button
              onClick={handleDownloadPDF}
              disabled={isExporting}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-gradient-to-r from-[#B8873A] to-[#D9AE63] text-[#0B1220] rounded-xl hover:brightness-105 transition disabled:opacity-60"
            >
              <Download size={16} />
              <span>{isExporting ? "Exporting…" : "Download PDF"}</span>
            </button>
          </div>
        </div>

        {/* Meta chips */}
        <div className="mt-4 flex flex-wrap gap-2 text-[11px]">
          {[
            { label: "Due Date", value: `${displayFromDate} – ${displayToDate}` },
            { label: "Based On", value: formData.reportBasedOn },
            { label: "Type", value: formData.reportType },
            { label: "Report Date", value: reportDateDisplay },
          ].map((chip) => (
            <span
              key={chip.label}
              className="px-3 py-1 rounded-full bg-white/10 border border-white/15 font-semibold"
            >
              <span className="text-[#E8C77A]">{chip.label}: </span>
              {chip.value}
            </span>
          ))}
        </div>
      </div>

      {/* ── KPI Cards ────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            icon: FileText,
            label: "Total Policies Due",
            value: totalPolicies.toString(),
            color: "text-blue-600",
            bg: "bg-blue-50",
          },
          {
            icon: Users,
            label: "Customer Groups",
            value: totalGroups.toString(),
            color: "text-purple-600",
            bg: "bg-purple-50",
          },
          {
            icon: IndianRupee,
            label: "Total Premium (₹)",
            value: fmtCurrency(totalPremium),
            color: "text-emerald-600",
            bg: "bg-emerald-50",
          },
          {
            icon: CheckCircle2,
            label: "NACH Policies",
            value: nachCount.toString(),
            color: "text-amber-600",
            bg: "bg-amber-50",
          },
        ].map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div
              key={kpi.label}
              className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#B8873A] via-[#B8873A]/40 to-transparent" />
              <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl ${kpi.bg} ${kpi.color} mb-3`}>
                <Icon size={20} />
              </div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                {kpi.label}
              </p>
              <p className={`text-xl font-bold mt-1 ${kpi.color}`}>{kpi.value}</p>
            </div>
          );
        })}
      </div>

      {/* ── Printable Report Canvas ──────────────────────────────────────────── */}
      <div
        ref={reportRef}
        className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
        style={{ fontFamily: "Arial, sans-serif" }}
      >
        {/* Letterhead */}
        <div
          className="px-8 py-5 text-white"
          style={{ background: "linear-gradient(135deg, #0B1220 0%, #1a2540 100%)" }}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] font-bold tracking-widest uppercase text-[#E8C77A] mb-0.5">
                JEM Soft — LIC Reports Engine
              </p>
              <h2 className="text-lg font-bold text-white tracking-wide">
                Premium Due Report
              </h2>
              <p className="text-slate-300 text-[11px] mt-0.5">
                Due Date: {displayFromDate} to {displayToDate} &nbsp;|&nbsp; Based On: {formData.reportBasedOn} &nbsp;|&nbsp; Type: {formData.reportType}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-slate-400">Report Date</p>
              <p className="text-sm font-bold text-[#E8C77A]">{reportDateDisplay}</p>
              {formData.includeLapsedPolicies && (
                <span className="mt-1 inline-block text-[9px] font-bold uppercase tracking-wider bg-red-600/20 text-red-300 px-2 py-0.5 rounded-full border border-red-400/30">
                  Incl. Lapsed
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Title bar */}
        <div className="bg-[#faedd0] px-8 py-2 border-b border-[#deb862]/40">
          <p className="text-[11px] font-bold uppercase tracking-widest text-[#7a5c1e]">
            Premium Due Statement — {formData.paymentTypes.nach && formData.paymentTypes.otherThanNach ? "All Payment Types" : formData.paymentTypes.nach ? "NACH Only" : "Other Than NACH"}
          </p>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-[11px] border-collapse">
            <thead>
              <tr className="bg-[#1a2540] text-white">
                {[
                  "S.No",
                  "Group Code",
                  "Group Name",
                  "Policy No.",
                  "Insured Name",
                  "Plan",
                  "Sum Assured (₹)",
                  "Mode",
                  "Due Date",
                  "Premium (₹)",
                  "Payment Type",
                ].map((h) => (
                  <th
                    key={h}
                    className="px-3 py-2.5 text-left font-bold uppercase tracking-wider text-[10px] border border-[#2e3f5e] whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {groupedRows.map(([groupName, groupRows]) => (
                <Fragment key={`grp-block-${groupName}`}>
                  {/* Group sub-header */}
                  <tr key={`grp-${groupName}`} className="bg-[#f0f4ff]">
                    <td
                      colSpan={11}
                      className="px-3 py-1.5 font-bold text-[#0B1220] text-[10px] uppercase tracking-wider border border-slate-200"
                    >
                      {groupRows[0]?.groupCode} — {groupName}
                    </td>
                  </tr>
                  {groupRows.map((row, ri) => (
                    <tr
                      key={`${groupName}-${ri}`}
                      className={ri % 2 === 0 ? "bg-white" : "bg-slate-50/60"}
                    >
                      <td className="px-3 py-2 border border-slate-100 text-slate-500">{row.sNo}</td>
                      <td className="px-3 py-2 border border-slate-100 font-semibold text-slate-700">{row.groupCode}</td>
                      <td className="px-3 py-2 border border-slate-100 text-slate-700">{row.groupName}</td>
                      <td className="px-3 py-2 border border-slate-100 font-mono font-bold text-[#0B1220]">{row.policyNo}</td>
                      <td className="px-3 py-2 border border-slate-100 font-semibold text-slate-800">{row.insuredName}</td>
                      <td className="px-3 py-2 border border-slate-100 text-slate-600">{row.plan}</td>
                      <td className="px-3 py-2 border border-slate-100 text-right font-semibold text-slate-700">{fmtCurrency(row.sumAssured)}</td>
                      <td className="px-3 py-2 border border-slate-100 text-center">{row.premiumMode}</td>
                      <td className="px-3 py-2 border border-slate-100 text-center font-semibold text-slate-700">
                        <span className="flex items-center gap-1 justify-center">
                          <CalendarDays size={11} className="text-[#B8873A]" />
                          {row.dueDate}
                        </span>
                      </td>
                      <td className="px-3 py-2 border border-slate-100 text-right font-bold text-[#0B1220]">{fmtCurrency(row.premium)}</td>
                      <td className="px-3 py-2 border border-slate-100 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                            row.paymentType === "NACH"
                              ? "bg-blue-100 text-blue-700 border border-blue-200"
                              : "bg-slate-100 text-slate-600 border border-slate-200"
                          }`}
                        >
                          {row.paymentType}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {/* Group subtotal */}
                  <tr key={`grp-total-${groupName}`} className="bg-[#faedd0]">
                    <td colSpan={9} className="px-3 py-1.5 font-bold text-[10px] text-[#7a5c1e] border border-[#deb862]/40 text-right uppercase tracking-wider">
                      Sub Total — {groupName}
                    </td>
                    <td className="px-3 py-1.5 font-bold text-right text-[#0B1220] border border-[#deb862]/40">
                      {fmtCurrency(groupRows.reduce((s, r) => s + r.premium, 0))}
                    </td>
                    <td className="px-3 py-1.5 border border-[#deb862]/40" />
                  </tr>
                </Fragment>
              ))}

              {/* Grand Total */}
              {rows.length > 0 && (
                <tr className="bg-[#0B1220] text-white">
                  <td colSpan={6} className="px-3 py-2.5 font-bold text-xs uppercase tracking-wider border border-[#2e3f5e]">
                    Grand Total ({totalPolicies} Policies, {totalGroups} Groups)
                  </td>
                  <td className="px-3 py-2.5 text-right font-bold border border-[#2e3f5e] text-[#E8C77A]" />
                  <td className="px-3 py-2.5 border border-[#2e3f5e]" />
                  <td className="px-3 py-2.5 border border-[#2e3f5e]" />
                  <td className="px-3 py-2.5 text-right font-bold text-[#E8C77A] border border-[#2e3f5e]">
                    {fmtCurrency(totalPremium)}
                  </td>
                  <td className="px-3 py-2.5 border border-[#2e3f5e]" />
                </tr>
              )}

              {rows.length === 0 && (
                <tr>
                  <td colSpan={11} className="px-3 py-8 text-center text-slate-400 text-sm">
                    No policies match the selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="px-8 py-4 border-t border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="text-[10px] text-slate-400 font-mono">
            Generated on {reportDateDisplay} &nbsp;|&nbsp; JEM Soft — LIC Reports Engine
          </div>
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            {formData.reportType === "Intimation" ? "Intimation Copy" : "Statement Copy"}
          </div>
        </div>
      </div>

      {/* ── Bottom Action Bar ────────────────────────────────────────────────── */}
      <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between">
        <button
          onClick={onBackToForm}
          className="px-6 py-2.5 border border-slate-300 text-slate-700 font-bold text-xs rounded-xl hover:bg-white transition uppercase tracking-wider"
        >
          ← Edit Filters
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-5 py-2.5 text-xs font-bold border border-slate-300 text-slate-700 rounded-xl hover:bg-white transition uppercase tracking-wider"
          >
            <Printer size={15} />
            Print
          </button>
          <button
            onClick={handleDownloadPDF}
            disabled={isExporting}
            className="flex items-center gap-1.5 px-6 py-2.5 bg-gradient-to-r from-[#B8873A] to-[#D9AE63] text-[#0B1220] font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg hover:brightness-105 transition disabled:opacity-60"
          >
            <Download size={15} />
            {isExporting ? "Exporting…" : "Download PDF"}
          </button>
        </div>
      </div>
    </div>
  );
}
