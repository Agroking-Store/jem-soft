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
      const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4", compress: true });
      const pageWidthMm = 297;
      const pageHeightMm = 210;
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
      <div className="relative overflow-hidden rounded-2xl bg-white p-4 border border-slate-200 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={onBackToForm}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-slate-500 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 transition uppercase tracking-wider"
            >
              <ArrowLeft size={16} />
              <span>Edit Filters</span>
            </button>
            <span className="text-xs bg-blue-50 text-[#1877F2] font-bold px-3 py-1 rounded-full border border-blue-200 uppercase tracking-wider">Premium Due Report</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-slate-500 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 transition uppercase tracking-wider"
            >
              <Printer size={16} />
              <span>Print</span>
            </button>
            <button
              onClick={handleDownloadPDF}
              disabled={isExporting}
              className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-[#5c67ff] to-[#3a47ff] text-white font-bold text-xs rounded-xl shadow-md shadow-blue-200 hover:brightness-110 transition disabled:opacity-60 uppercase tracking-wider"
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
              className="px-3 py-1 rounded-full bg-slate-50 border border-slate-200 text-slate-800 font-semibold"
            >
              <span className="text-[#1877F2]">{chip.label}: </span>
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
              <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#1877F2] via-[#1877F2]/40 to-transparent" />
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

      {/* ── Printable Report Canvas — Plain LIC-style register ─────────────────── */}
      <div
        ref={reportRef}
        className="bg-white px-6 py-6 border border-slate-300 shadow-xl text-[10px] leading-snug print:p-0 print:border-none print:shadow-none"
        style={{ fontFamily: "Arial, Helvetica, sans-serif", color: "#000" }}
      >
        {/* Report title line */}
        <div className="flex justify-between items-end pb-0.5 text-[11px] font-semibold">
          <span>
            Premium Due Statement as on {reportDateDisplay}
          </span>
          <span>
            Groups: {totalGroups} | Policies: {totalPolicies}
          </span>
        </div>
        <div className="pb-1 text-[9px] font-normal">
          Due Date: {displayFromDate} to {displayToDate} | {formData.reportBasedOn} | {formData.reportType}
          {formData.includeLapsedPolicies ? " | Incl. Lapsed" : ""}
        </div>

        {/* Table */}
        <table className="w-full text-left text-[10px] border-collapse">
          <thead>
            <tr className="font-bold">
              {[
                "S.No",
                "Group Code",
                "Group Name",
                "Policy No.",
                "Insured Name",
                "Plan",
                "Sum Assured",
                "Mode",
                "Due Date",
                "Premium",
                "Payment Type",
              ].map((h) => (
                <th
                  key={h}
                  className="px-1 py-1 text-left font-bold whitespace-nowrap border-t border-b border-black"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {groupedRows.map(([groupName, groupRows]) => (
              <Fragment key={`grp-block-${groupName}`}>
                {/* Group heading - centered, bold */}
                <tr>
                  <td colSpan={11} className="pt-3 pb-1 text-center">
                    <div className="text-[13px] font-bold">
                      {groupRows[0]?.groupCode}: {groupName}
                    </div>
                  </td>
                </tr>
                {groupRows.map((row, ri) => (
                  <tr key={`${groupName}-${ri}`}>
                    <td className="px-1 py-0.5 text-slate-500">{row.sNo}</td>
                    <td className="px-1 py-0.5 font-semibold">{row.groupCode}</td>
                    <td className="px-1 py-0.5">{row.groupName}</td>
                    <td className="px-1 py-0.5 font-mono font-bold">{row.policyNo}</td>
                    <td className="px-1 py-0.5 font-semibold">{row.insuredName}</td>
                    <td className="px-1 py-0.5">{row.plan}</td>
                    <td className="px-1 py-0.5 text-right font-mono">{fmtCurrency(row.sumAssured)}</td>
                    <td className="px-1 py-0.5 text-center">{row.premiumMode}</td>
                    <td className="px-1 py-0.5 text-center font-semibold">{row.dueDate}</td>
                    <td className="px-1 py-0.5 text-right font-mono font-bold">{fmtCurrency(row.premium)}</td>
                    <td className="px-1 py-0.5 text-center">{row.paymentType}</td>
                  </tr>
                ))}
                {/* Group subtotal */}
                <tr className="font-bold">
                  <td colSpan={9} className="px-1 pt-1.5 pb-1 text-right">
                    <span className="inline-block border-t border-b border-black px-1">Sub Total — {groupName}</span>
                  </td>
                  <td className="px-1 pt-1.5 pb-1 text-right font-mono">
                    <span className="inline-block border-t border-b border-black px-1">
                      {fmtCurrency(groupRows.reduce((s, r) => s + r.premium, 0))}
                    </span>
                  </td>
                  <td className="px-1 pt-1.5 pb-1" />
                </tr>
              </Fragment>
            ))}

            {/* Grand Total */}
            {rows.length > 0 && (
              <tr className="font-bold">
                <td colSpan={6} className="px-1 pt-1.5 pb-1 text-right uppercase">
                  Grand Total ({totalPolicies} Policies, {totalGroups} Groups)
                </td>
                <td className="px-1 pt-1.5 pb-1" />
                <td className="px-1 pt-1.5 pb-1" />
                <td className="px-1 pt-1.5 pb-1" />
                <td className="px-1 pt-1.5 pb-1 text-right font-mono">
                  <span className="inline-block border-t border-b border-black px-1">
                    {fmtCurrency(totalPremium)}
                  </span>
                </td>
                <td className="px-1 pt-1.5 pb-1" />
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

        {/* Legend footer */}
        <div className="pt-5 mt-4 space-y-1 text-[9px]" style={{ borderTop: "1px solid #000" }}>
          <div className="flex flex-wrap gap-x-5 gap-y-0.5">
            <span><strong>Y :</strong> NACH Mode</span>
            <span><strong>M :</strong> Monthly Mode</span>
            <span><strong>Q :</strong> Quarterly Mode</span>
            <span><strong>H :</strong> Half-Yearly Mode</span>
            <span><strong>S :</strong> Single Mode</span>
          </div>
          <div className="flex justify-between font-mono text-[8px] pt-1">
            <span>Statement Code: DSS000019899</span>
            <span>Generated via Premium Due Engine</span>
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
            className="flex items-center gap-1.5 px-6 py-2.5 bg-gradient-to-r from-[#5c67ff] to-[#3a47ff] text-white shadow-blue-200 font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg hover:brightness-110 transition disabled:opacity-60"
          >
            <Download size={15} />
            {isExporting ? "Exporting…" : "Download PDF"}
          </button>
        </div>
      </div>
    </div>
  );
}