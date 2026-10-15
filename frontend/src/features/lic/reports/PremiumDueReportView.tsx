"use client";

import { useRef, useState, useMemo, Fragment } from "react";
import {
  ArrowLeft,
  Download,
  Printer,
  FileText,
  Users,
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
  dueDateRaw?: number;
  premium: number;
  paymentType: string;
  memberId?: string;
  area?: string;
  subArea?: string;
  branchCode?: string;
  branchName?: string;
  address?: string;
  mobile?: string;
  email?: string;
  pan?: string;
  gst?: string;
  dob?: string;
  nachDetails?: string;
}

/** Every row matches when nothing is selected for that filter type. */
function matchesAny(haystack: string, needles: string[]): boolean {
  if (needles.length === 0) return true;
  const h = (haystack || "").toLowerCase();
  if (!h) return false;
  return needles.some((n) => h.includes(n) || n.includes(h));
}

// ─── DB helpers — 100% dynamic, no sample data anywhere ──────────────────────

/** LIC mode code (Y/M/Q/H/S) from the premium mode master. */
function resolveModeCode(p: Record<string, any>): string {
  const raw = String(p?.premiumMode?.modeName || "").toLowerCase().trim();
  if (raw.startsWith("month") || raw === "m") return "M";
  if (raw.startsWith("quarter") || raw === "q") return "Q";
  if (raw.startsWith("half") || raw === "h") return "H";
  if (raw.startsWith("single") || raw === "s") return "S";
  return "Y";
}

/** Premium paying interval in months (12 = yearly … 0 = single/one-time). */
function modeMonths(p: Record<string, any>): number {
  const months = Number(p?.premiumMode?.months);
  if (Number.isFinite(months) && months > 0) return months;
  const code = resolveModeCode(p);
  if (code === "M") return 1;
  if (code === "Q") return 3;
  if (code === "H") return 6;
  if (code === "S") return 0;
  return 12;
}

/** NACH is a PAYMENT mode (PaymentModeMaster), not a premium frequency. */
function isNachPolicy(p: Record<string, any>): boolean {
  const pay = String(p?.paymentMode?.modeName || "").toLowerCase();
  if (pay.includes("nach")) return true;
  return String(p?.premiumMode?.modeName || "").toLowerCase().includes("nach");
}

/** Month step that keeps LIC due-date day-of-month (31 Jan + 1m → 28/29 Feb). */
function addMonthsClamped(date: Date, months: number): Date {
  const d = new Date(date);
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + months);
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, lastDay));
  return d;
}

/**
 * Every premium due date that falls inside the selected window.
 *  - "FUP Date" basis → only the first unpaid due date (the anchor).
 *  - "Standard Duedate" → every installment due inside the window
 *    (monthly/quarterly/half-yearly policies can contribute several rows).
 * When nextPremiumDueDate is missing, the anchor is derived from the
 * commencement-date anniversary using the premium mode.
 */
function dueOccurrences(
  p: Record<string, any>,
  from: Date | null,
  to: Date | null,
  basis: string
): Date[] {
  const months = modeMonths(p);
  const ref = from || new Date();
  let anchor = asDate(p.nextPremiumDueDate) ?? asDate(p.dueDate) ?? asDate(p.fupDate);

  if (!anchor) {
    const comm = asDate(p.commencementDate);
    if (!comm) return [];
    const d = new Date(comm);
    let guard = 0;
    while (d < ref && guard < 720) {
      if (months <= 0) break;
      d.setTime(addMonthsClamped(d, months).getTime());
      guard += 1;
    }
    anchor = d;
  }

  const inWindow = (d: Date) => (!from || d >= from) && (!to || d <= to);

  // FUP basis / single mode / partial date range → the anchor alone.
  if (basis === "FUP Date" || months <= 0 || !from || !to) {
    return inWindow(anchor) ? [anchor] : [];
  }

  // Standard basis: fast-forward past the window start, then walk the mode.
  let cur = new Date(anchor);
  let guard = 0;
  while (cur < from && guard < 720) {
    cur = addMonthsClamped(cur, months);
    guard += 1;
  }
  const out: Date[] = [];
  while (cur <= to && guard < 800) {
    if (cur >= from) out.push(new Date(cur));
    cur = addMonthsClamped(cur, months);
    guard += 1;
  }
  return out;
}

/** Real NACH mandate info from the member's default bank account. */
function nachDetailsFor(
  memberMaster: Record<string, any> | undefined,
  debitDate: Date | null
): string {
  const banks: any[] = memberMaster?.bankDetails || [];
  const bank = banks.find((b) => b?.isDefault) || banks[0];
  const parts = ["NACH"];
  if (debitDate) parts.push(`Debit ${fmtDate(debitDate)}`);
  if (bank?.bankName) parts.push(String(bank.bankName));
  if (bank?.accountNumber) parts.push(`A/C ****${String(bank.accountNumber).slice(-4)}`);
  if (bank?.ifscCode) parts.push(`IFSC ${bank.ifscCode}`);
  return parts.join(" • ");
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function PremiumDueReportView({
  formData,
  policies: rawPolicies = [],
  customers: rawCustomers = [],
  onBackToForm,
}: PremiumDueReportViewProps) {
  const reportRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  // ── Build rows from DB policies — every form filter is applied here ──────
  const rows = useMemo((): DueRow[] => {
    const fromDate = asDate(formData.fromDueDate);
    const toDate = asDate(formData.toDueDate);

    const pick = (type: string) =>
      (formData.appliedFilters || [])
        .filter((f) => f.type === type)
        .map((f) => (f.name || f.id || "").toLowerCase().trim())
        .filter(Boolean);

    const selectedStatusNames = pick("Policy Status").map((s) => s.replace(/[- ]/g, ""));
    const selectedAgencies = pick("Agencies");
    const selectedBranches = pick("Branches");
    const selectedAreas = pick("Areas");

    // Group selection can come from the Filter Options modal ("Groups Wise")
    // OR from the Select Groups modal used by the groupsWise sorting radio.
    const selectedGroupKeys = new Set<string>();
    const addGroupKey = (raw: string) => {
      const k = (raw || "").toLowerCase().trim();
      if (!k) return;
      selectedGroupKeys.add(k);
      // FilterOptionsModal renders name as "<code> - <head name>"
      selectedGroupKeys.add(k.split(" - ")[0].trim());
    };
    (formData.appliedFilters || [])
      .filter((f) => f.type === "Groups Wise" || f.type === "Groups")
      .forEach((f) => {
        if (f.id) addGroupKey(f.id);
        addGroupKey(f.name || "");
      });
    (formData.selectedGroups || []).forEach((g) => addGroupKey((g as { groupCode?: string }).groupCode || ""));

    // Sorting-filter modal selection (members / areas / branches)
    const sortingItems = formData.sortingFilterSelection?.selectedItems || [];
    const selectedMemberIds = new Set(sortingItems.map((i) => i.id));
    const selectedSortingKeys = sortingItems
      .map((i) => (i.code || i.name || "").toLowerCase().trim())
      .filter(Boolean);

    // Agency match — DB advisor codes map to agencies the same way as
    // Policy Register: A001-A003 → Jayant (AG002), A004-A006 → Manisha (AG003).
    const JAYANT_ADVISOR_CODES = ["a001", "a002", "a003"];
    const MANISHA_ADVISOR_CODES = ["a004", "a005", "a006"];
    const isAgencyMatch = (p: Record<string, any>, filters: string[]) => {
      if (filters.length === 0) return true;
      const agCode = String(p.agentCode || p.agency?.agencyCode || "").toLowerCase().trim();
      const agName = String(p.advisor?.agency?.agencyName || p.agency?.agencyName || "").toLowerCase().trim();
      return filters.some((f) => {
        if (!f) return true;
        if (f.includes("jayant") || f.includes("ag002")) return JAYANT_ADVISOR_CODES.includes(agCode);
        if (f.includes("manisha") || f.includes("ag003")) return MANISHA_ADVISOR_CODES.includes(agCode);
        if (f.includes("other") || f.includes("ag001"))
          return !JAYANT_ADVISOR_CODES.includes(agCode) && !MANISHA_ADVISOR_CODES.includes(agCode);
        return (
          (Boolean(agCode) && (agCode.includes(f) || f.includes(agCode))) ||
          (Boolean(agName) && (agName.includes(f) || f.includes(agName)))
        );
      });
    };

    const filteredPolicies = rawPolicies.filter((p) => {
      const cust: Record<string, any> =
        p.customer || rawCustomers.find((c: any) => c.id === p.customerId || c.id === p.clientId) || {};

      // NOTE: the due-date window is NOT applied here — one policy can fall due
      // several times inside it (one row per installment). Dates are expanded
      // per occurrence after this filter (see dueOccurrences below).

      const rawStatus = String(p.status?.statusName ?? p.statusName ?? "Active").toLowerCase();
      if (selectedStatusNames.length > 0) {
        const normStatus = rawStatus.replace(/[- ]/g, "");
        const matches = selectedStatusNames.some(
          (st) => normStatus.includes(st) || st.includes(normStatus)
        );
        if (!matches) return false;
      }

      // Lapsed is excluded unless (a) "Include Lapsed Policies" is ticked OR
      // (b) "Lapsed" was picked explicitly in the Policy Status filter —
      // every control must have a real effect on the output.
      const isLapsed = rawStatus.includes("lapsed");
      const lapsedPicked = selectedStatusNames.some((st) => st.includes("lapsed"));
      if (isLapsed && !formData.includeLapsedPolicies && !lapsedPicked) return false;

      if (!isAgencyMatch(p, selectedAgencies)) return false;

      if (
        selectedBranches.length &&
        !matchesAny(`${p.branch?.branchCode || ""} ${p.branch?.branchName || ""}`, selectedBranches)
      )
        return false;

      if (
        selectedAreas.length &&
        !matchesAny(`${cust.resArea || ""} ${cust.resCity || ""} ${cust.offArea || ""}`, selectedAreas)
      )
        return false;

      if (selectedGroupKeys.size > 0) {
        const gCode = String(cust.groupCode || "").toLowerCase().trim();
        const gName = String(cust.groupName || cust.name || "").toLowerCase().trim();
        const matched = Array.from(selectedGroupKeys).some(
          (k) => Boolean(k) && (gCode === k || gCode.includes(k) || (gName && gName.includes(k)))
        );
        if (!matched) return false;
      }

      // Sorting modal selection: memberwise shows ONLY the ticked members.
      if (sortingItems.length > 0 && formData.sortingOption !== "groupsWise") {
        if (formData.sortingOption === "groupMemberwise") {
          const memberId = p.CustomerMaster?.id || p.CustomerMasterId || "";
          if (!selectedMemberIds.has(memberId)) return false;
        } else if (formData.sortingOption === "areaWise") {
          if (!matchesAny(String(cust.resArea || ""), selectedSortingKeys)) return false;
        } else if (formData.sortingOption === "subAreaWise") {
          if (!matchesAny(String(cust.resCity || ""), selectedSortingKeys)) return false;
        } else if (formData.sortingOption === "branchNoWise") {
          if (
            !matchesAny(
              `${p.branch?.branchCode || ""} ${p.branch?.branchName || ""}`,
              selectedSortingKeys
            )
          )
            return false;
        } else if (formData.sortingOption === "policyNoWise") {
          // Sorting modal lists each policy by its DB id — show ONLY the ticked ones.
          const pid = String(p.id || p.policyNumber || "");
          if (!selectedMemberIds.has(pid)) return false;
        }
      }

      const isNach = isNachPolicy(p);
      if (isNach && !formData.paymentTypes.nach) return false;
      if (!isNach && !formData.paymentTypes.otherThanNach) return false;

      return true;
    });

    // 100% PURE DYNAMIC — no hardcoded/demo rows. When nothing in the DB
    // matches the applied filters, the report shows its empty state.
    if (filteredPolicies.length === 0) return [];

    // Map real policies → DueRow (one row per due date inside the window)
    const customerMap: Record<string, Record<string, unknown>> = {};
    rawCustomers.forEach((c) => {
      const cust = c as Record<string, unknown>;
      if (cust.id) customerMap[String(cust.id)] = cust;
    });

    const dueRows: DueRow[] = [];
    filteredPolicies.forEach((p) => {
      const cust =
        (p.customer as Record<string, unknown>) ??
        customerMap[String(p.clientId || p.customerId)] ??
        {};
      const c = cust as Record<string, any>;
      const isNach = isNachPolicy(p);
      const memberMaster = p.CustomerMaster as Record<string, any> | undefined;
      const memberId = String(memberMaster?.id || p.CustomerMasterId || "");
      const memberName = memberMaster
        ? `${memberMaster.salutation || ""} ${memberMaster.firstName || ""} ${memberMaster.lastName || ""}`
            .replace(/\s+/g, " ")
            .trim()
        : "";
      const planName = String((p.product as Record<string, unknown>)?.productName ?? p.planName ?? "—");
      const planNo = String((p.product as Record<string, unknown>)?.planNumber ?? "");
      const plan = planNo ? `${planName} (${planNo})` : planName;

      const addressParts = [
        c.resAddressLine1,
        c.resAddressLine2,
        c.resArea || c.offArea,
        c.resCity || c.offCity,
        c.resPin || c.offPin,
      ].filter((part: any) => Boolean(part && String(part).trim().length > 0));

      const dobRaw = memberMaster?.dob || c.dob;
      const occurrences = dueOccurrences(p, fromDate, toDate, formData.reportBasedOn);

      occurrences.forEach((dueDate) => {
        dueRows.push({
          sNo: 0, // renumbered in true display order once blocks are built
          groupCode: String(c.groupCode || c.id || p.clientId || "—"),
          groupName: String(c.groupName || c.name || "Individual"),
          policyNo: String(p.policyNumber ?? p.policyNo ?? "—"),
          insuredName:
            memberName || String(c.name ?? `${p.firstName ?? ""} ${p.lastName ?? ""}`.trim() ?? "—"),
          plan,
          sumAssured: Number(p.premium?.sumAssured || p.sumAssured || 0),
          premiumMode: resolveModeCode(p),
          dueDate: fmtDate(dueDate),
          dueDateRaw: dueDate.getTime(),
          // What the customer actually pays at this due date (one installment).
          premium: Number(
            p.premium?.installmentPremium ||
              p.premium?.totalInstallmentPremium ||
              p.premiumAmount ||
              0
          ),
          paymentType: isNach ? "NACH" : String(p.paymentMode?.modeName || "Other"),
          memberId,
          area: String(c.resArea || c.offArea || ""),
          subArea: String(c.resCity || c.offCity || ""),
          branchCode: String((p.branch as Record<string, unknown>)?.branchCode || p.branchNo || ""),
          branchName: String((p.branch as Record<string, unknown>)?.branchName || ""),
          address: addressParts.length ? addressParts.join(", ") : "Address Not Provided",
          mobile: String(
            memberMaster?.contactInfo?.mobile1 || c.phone || c.mobilePersonal || c.mobile || "N/A"
          ),
          email: String(
            memberMaster?.contactInfo?.emailPersonal ||
              c.email ||
              c.emailPersonal ||
              c.emailBusiness ||
              "N/A"
          ),
          pan: String(memberMaster?.panNumber || c.panNumber || c.pan || "N/A"),
          gst: String(c.gstNumber || c.gst || "N/A"),
          dob: dobRaw ? fmtDate(dobRaw) : "—",
          // Real mandate details: NACH auto-debits on the due date itself.
          nachDetails: isNach ? nachDetailsFor(memberMaster, dueDate) : "—",
        });
      });
    });

    return dueRows;
  }, [rawPolicies, rawCustomers, formData]);

  // ── Group / sort rows as per the selected sorting radio ───────────────────
  const blocks = useMemo(() => {
    const opt = formData.sortingOption;
    const map = new Map<
      string,
      { key: string; heading: string; showHeading: boolean; rows: DueRow[] }
    >();
    const push = (key: string, heading: string, showHeading: boolean, row: DueRow) => {
      if (!map.has(key)) map.set(key, { key, heading, showHeading, rows: [] });
      map.get(key)!.rows.push(row);
    };

    // dueDate / policyNoWise are FLAT sorts — one list, no group headings.
    let ordered: Array<{ key: string; heading: string; showHeading: boolean; rows: DueRow[] }>;
    if (opt === "dueDate") {
      const sorted = [...rows].sort((a, b) => (a.dueDateRaw || 0) - (b.dueDateRaw || 0));
      ordered = [{ key: "dueDate", heading: "", showHeading: false, rows: sorted }];
    } else if (opt === "policyNoWise") {
      const sorted = [...rows].sort((a, b) => {
        const byNo = a.policyNo.localeCompare(b.policyNo, undefined, { numeric: true });
        return byNo !== 0 ? byNo : (a.dueDateRaw || 0) - (b.dueDateRaw || 0);
      });
      ordered = [{ key: "policyNo", heading: "", showHeading: false, rows: sorted }];
    } else {
      rows.forEach((r) => {
        if (opt === "groupMemberwise") {
          // Each member is their own block with the member name as heading —
          // same memberwise look as Policy Register / Premium Outstanding.
          push(r.memberId || `mem-${r.policyNo}`, r.insuredName, true, r);
        } else if (opt === "areaWise") {
          const area = r.area || "Unassigned";
          push(area, `Area : ${area}`, true, r);
        } else if (opt === "subAreaWise") {
          const sub = r.subArea || "Unassigned";
          push(sub, `Sub-Area : ${sub}`, true, r);
        } else if (opt === "branchNoWise") {
          const label = r.branchName || r.branchCode || "Default Branch";
          push(r.branchCode || label, `Branch : ${label}`, true, r);
        } else {
          // groupsWise
          push(r.groupCode, `${r.groupCode}: ${r.groupName}`, true, r);
        }
      });
      ordered = Array.from(map.values());
    }

    // Re-number S.No in the true display order (1..n) so numbers never skip,
    // even after sorting or when one policy has several due dates in the window.
    let sNo = 0;
    return ordered.map((b) => ({
      ...b,
      rows: b.rows.map((r) => ({ ...r, sNo: (sNo += 1) })),
    }));
  }, [rows, formData.sortingOption]);

  // ── KPI summaries ─────────────────────────────────────────────────────────
  const totalPolicies = rows.length;
  const totalGroups = new Set(rows.map((r) => r.groupCode)).size;
  const totalPremium = rows.reduce((s, r) => s + r.premium, 0);
  const nachCount = rows.filter((r) => r.paymentType === "NACH").length;

  // ── Report Options → optional extra columns ───────────────────────────────
  const opts = formData.reportOptions || ({} as PremiumDueFormData["reportOptions"]);
  const optCols = [
    opts.address && { label: "Address", render: (r: DueRow) => r.address || "—" },
    opts.mobile && { label: "Mobile", render: (r: DueRow) => r.mobile || "—" },
    opts.email && { label: "Email", render: (r: DueRow) => r.email || "—" },
    opts.pan && { label: "PAN", render: (r: DueRow) => r.pan || "—" },
    opts.gst && { label: "GST", render: (r: DueRow) => r.gst || "—" },
    opts.dob && { label: "DOB", render: (r: DueRow) => r.dob || "—" },
    opts.nachDetails && { label: "NACH Details", render: (r: DueRow) => r.nachDetails || "—" },
  ].filter(Boolean) as Array<{ label: string; render: (r: DueRow) => string }>;

  const baseHeaders = [
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
  ];
  const headerCells = [...baseHeaders, ...optCols.map((c) => c.label)];
  const totalCols = headerCells.length;
  // Columns BEFORE "Premium" (S.No..Due Date) — subtotal rows must land the
  // amount exactly in the Premium column even when extra option columns follow.
  const PREMIUM_LEAD_COLS = 9;

  const reportTitle =
    formData.reportType === "Statement"
      ? "Premium Due Statement"
      : "Premium Due Intimation Notice";

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
            {reportTitle} as on {reportDateDisplay}
          </span>
          <span>
            Groups: {totalGroups} | Policies: {totalPolicies}
          </span>
        </div>
        <div className="pb-1 text-[9px] font-normal">
          Due Date: {displayFromDate} to {displayToDate} | {formData.reportBasedOn} | {formData.reportType}
          {formData.includeLapsedPolicies ? " | Incl. Lapsed" : ""}
        </div>
        {formData.reportType === "Intimation" && (
          <div className="pb-2 text-[9px] leading-snug">
            Notice: You are requested to pay the premium shown below on or before the due date.
            Kindly ensure the installment is credited in time to keep the policy in force.
          </div>
        )}

        {/* Table (or honest empty state — never fake/sample rows) */}
        {rows.length === 0 ? (
          <div className="mt-6 p-10 text-center border-2 border-dashed border-slate-300 space-y-2">
            <div className="text-[12px] font-bold">
              No policies match the selected filters
            </div>
            <p className="text-[10px]">
              Nothing in the database matched the applied filters for {displayFromDate} to{" "}
              {displayToDate}. Please change the date range or other filters.
            </p>
            <button
              onClick={onBackToForm}
              className="px-4 py-1.5 border border-black text-[10px] font-bold uppercase tracking-wider hover:bg-slate-50 transition"
            >
              Modify Filter Selection
            </button>
          </div>
        ) : (
        <table className="w-full text-left text-[10px] border-collapse">
          <thead>
            <tr className="font-bold">
              {headerCells.map((h) => (
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
            {blocks.map((block) => (
              <Fragment key={`blk-${block.key}`}>
                {block.showHeading && (
                  <tr>
                    <td colSpan={totalCols} className="pt-3 pb-1 text-center">
                      <div className="text-[13px] font-bold">{block.heading}</div>
                    </td>
                  </tr>
                )}
                {block.rows.map((row) => (
                  <tr key={`${block.key}-${row.policyNo}-${row.sNo}`}>
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
                    {optCols.map((col) => (
                      <td key={col.label} className="px-1 py-0.5 whitespace-nowrap">
                        {col.render(row)}
                      </td>
                    ))}
                  </tr>
                ))}
                {/* Block subtotal — only when it adds information (matches
                    Policy Register: single-row blocks skip the redundant row) */}
                {block.showHeading && block.rows.length > 1 && (
                  <tr className="font-bold">
                    <td colSpan={PREMIUM_LEAD_COLS} className="px-1 pt-1.5 pb-1 text-right">
                      <span className="inline-block border-t border-b border-black px-1">
                        Sub Total — {block.heading}
                      </span>
                    </td>
                    <td className="px-1 pt-1.5 pb-1 text-right font-mono">
                      <span className="inline-block border-t border-b border-black px-1">
                        {fmtCurrency(block.rows.reduce((s, r) => s + r.premium, 0))}
                      </span>
                    </td>
                    <td colSpan={totalCols - PREMIUM_LEAD_COLS - 1} className="px-1 pt-1.5 pb-1" />
                  </tr>
                )}
              </Fragment>
            ))}

            {/* Grand Total */}
            <tr className="font-bold">
              <td colSpan={PREMIUM_LEAD_COLS} className="px-1 pt-1.5 pb-1 text-right uppercase">
                Grand Total ({totalPolicies} Policies, {totalGroups} Groups)
              </td>
              <td className="px-1 pt-1.5 pb-1 text-right font-mono">
                <span className="inline-block border-t border-b border-black px-1">
                  {fmtCurrency(totalPremium)}
                </span>
              </td>
              <td colSpan={totalCols - PREMIUM_LEAD_COLS - 1} className="px-1 pt-1.5 pb-1" />
            </tr>
          </tbody>
        </table>
        )}

        {/* Legend footer */}
        <div className="pt-5 mt-4 space-y-1 text-[9px]" style={{ borderTop: "1px solid #000" }}>
          <div className="flex flex-wrap gap-x-5 gap-y-0.5">
            <span><strong>Y :</strong> Yearly Mode</span>
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