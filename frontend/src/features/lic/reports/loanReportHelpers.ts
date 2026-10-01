import { SelectedFilterItem } from "./FilterOptionsModal";

/** DD-MM-YYYY (or blank for invalid / empty dates) */
export function fmtDate(d: Date | string | null | undefined): string {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  if (isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-GB");
}

/** "₹ 1,234.56" — never NaN */
export function money(v: number | null | undefined): string {
  const n = Number(v);
  if (!isFinite(n)) return "0.00";
  return n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function round2(n: number): number {
  return Math.round((Number(n) || 0) * 100) / 100;
}

/**
 * Full member name.
 * Priority: CustomerMaster (salutation + first + middle + last) -> lifeAssured -> customer -> group name.
 */
export function getMemberName(item: any): string {
  const custMaster = item?.policy?.CustomerMaster || item?.CustomerMaster;
  if (custMaster) {
    const salutation = custMaster.salutation ? `${custMaster.salutation} ` : "";
    const fullName = [custMaster.firstName, custMaster.middleName, custMaster.lastName]
      .filter(Boolean)
      .join(" ");
    if (fullName.trim()) return `${salutation}${fullName.trim()}`.trim();
    if (custMaster.name) return custMaster.name;
  }

  const lifeAssured = item?.policy?.lifeAssured || item?.lifeAssured;
  if (lifeAssured) {
    if (typeof lifeAssured === "string") return lifeAssured;
    const salutation = lifeAssured.salutation ? `${lifeAssured.salutation} ` : "";
    const fullName = [lifeAssured.firstName, lifeAssured.middleName, lifeAssured.lastName]
      .filter(Boolean)
      .join(" ");
    if (fullName.trim()) return `${salutation}${fullName.trim()}`.trim();
    if (lifeAssured.name) return lifeAssured.name;
  }

  const custObj = item?.policy?.customer || item?.customer;
  if (custObj?.name) return custObj.name;

  return "Policy Holder";
}

/** Primary CustomerMaster id — used for memberwise filtering. */
export function getMemberId(item: any): string {
  return (
    item?.policy?.CustomerMaster?.id ||
    item?.CustomerMaster?.id ||
    item?.policy?.CustomerMasterId ||
    item?.CustomerMasterId ||
    ""
  );
}

/** Postal address: CustomerMaster addresses first, then the Customer record's own address. */
export function getMemberAddress(item: any): string {
  const custMaster = item?.policy?.CustomerMaster || item?.CustomerMaster;
  const custObj = item?.policy?.customer || item?.customer;

  const addresses = custMaster?.addresses;
  if (Array.isArray(addresses) && addresses.length > 0) {
    const preferred =
      addresses.find((a: any) => (a.addressType || "").toLowerCase().includes("communication")) ||
      addresses[0];
    const line = [
      preferred?.addressLine1,
      preferred?.addressLine2,
      preferred?.city,
      preferred?.state || "",
      preferred?.pin,
    ]
      .filter((s: any) => s && String(s).trim().length > 0)
      .join(", ")
      .replace(/,\s*,/g, ", ")
      .trim();
    if (line) return line;
  }

  if (custObj?.address) return custObj.address;

  const legacy = [custObj?.resArea, custObj?.resCity, custObj?.resPincode]
    .filter((s: any) => s && String(s).trim().length > 0)
    .join(", ");
  return legacy.trim();
}

export function getMemberMobile(item: any): string {
  const custMaster = item?.policy?.CustomerMaster || item?.CustomerMaster;
  const custObj = item?.policy?.customer || item?.customer;
  return (
    custMaster?.contactInfo?.mobile1 ||
    custMaster?.contactInfo?.mobile2 ||
    custObj?.phone ||
    custObj?.mobilePersonal ||
    custObj?.mobile ||
    ""
  );
}

export function getMemberEmail(item: any): string {
  const custMaster = item?.policy?.CustomerMaster || item?.CustomerMaster;
  const custObj = item?.policy?.customer || item?.customer;
  return custMaster?.contactInfo?.emailPersonal || custObj?.email || "";
}

export function getMemberDob(item: any): string {
  const custMaster = item?.policy?.CustomerMaster || item?.CustomerMaster;
  const custObj = item?.policy?.customer || item?.customer;
  return custMaster?.dob || custObj?.dob || custObj?.dateOfBirth || "";
}

export function getMemberPan(item: any): string {
  const custMaster = item?.policy?.CustomerMaster || item?.CustomerMaster;
  const custObj = item?.policy?.customer || item?.customer;
  return custMaster?.panNumber || custObj?.pan || "";
}

/* ------------------------------------------------------------------ *
 * Agency / Agent matching
 * ------------------------------------------------------------------ */

const JAYANT_ADVISOR_CODES = ["a001", "a002", "a003"];
const MANISHA_ADVISOR_CODES = ["a004", "a005", "a006"];

export interface AgencyIdentity {
  agentCode?: string | null;
  advisorName?: string | null;
  advisorCode?: string | null;
  agencyName?: string | null;
  agencyCode?: string | null;
}

/**
 * TRUE when the row belongs to any of the selected agencies.
 * Returns TRUE when nothing is selected.
 */
export function isAgencyMatch(id: AgencyIdentity, selectedAgencies: string[]): boolean {
  if (!selectedAgencies || selectedAgencies.length === 0) return true;

  const agentCode = (id.agentCode || "").toLowerCase().trim();
  const advisorCode = (id.advisorCode || "").toLowerCase().trim();
  const advisorName = (id.advisorName || "").toLowerCase().trim();
  const agencyName = (id.agencyName || "").toLowerCase().trim();
  const agencyCode = (id.agencyCode || "").toLowerCase().trim();

  return selectedAgencies.some((raw) => {
    const f = (raw || "").toLowerCase().trim();
    if (!f) return true;

    if (f === agencyName || f === agencyCode) return true;
    if (agencyName && (agencyName.includes(f) || f.includes(agencyName))) return true;
    if (agencyCode && (agencyCode.includes(f) || f.includes(agencyCode))) return true;

    if (f === advisorName || f === advisorCode) return true;
    if (advisorName && (advisorName.includes(f) || f.includes(advisorName))) return true;
    if (advisorCode && (advisorCode.includes(f) || f.includes(advisorCode))) return true;

    if (f.includes("jayant") || f.includes("ag002")) {
      return JAYANT_ADVISOR_CODES.includes(agentCode) || JAYANT_ADVISOR_CODES.includes(advisorCode);
    }
    if (f.includes("manisha") || f.includes("ag003")) {
      return MANISHA_ADVISOR_CODES.includes(agentCode) || MANISHA_ADVISOR_CODES.includes(advisorCode);
    }
    if (f.includes("other") || f.includes("ag001")) {
      const known = JAYANT_ADVISOR_CODES.includes(agentCode) || MANISHA_ADVISOR_CODES.includes(agentCode);
      return !known;
    }

    return Boolean(agentCode) && (agentCode.includes(f) || f.includes(agentCode));
  });
}

/* ------------------------------------------------------------------ *
 * Applied-filter extraction (shared by both loan reports)
 * ------------------------------------------------------------------ */

export function pickFilterNames(
  appliedFilters: SelectedFilterItem[] | undefined,
  type: string
): string[] {
  return (appliedFilters || [])
    .filter((f) => f.type === type)
    .map((f) => (f.name || f.id || "").toLowerCase().trim())
    .filter(Boolean);
}

/**
 * Group filter keys.
 * FilterOptionsModal renders "Groups Wise" items as `name = "<code> - <head name>"`
 * with `id = <groupCode>`, so matching only on `name` never lines up with the
 * policy's raw groupCode. Return every usable variant instead.
 */
export function pickGroupKeys(
  appliedFilters: SelectedFilterItem[] | undefined,
  types: string[] = ["Groups", "Groups Wise"]
): string[] {
  const out = new Set<string>();
  (appliedFilters || []).forEach((f) => {
    if (!types.includes(f.type)) return;
    if (f.id) out.add(f.id.toLowerCase().trim());
    const nm = (f.name || "").toLowerCase().trim();
    if (nm) {
      out.add(nm);
      const beforeDash = nm.split(" - ")[0].trim();
      if (beforeDash) out.add(beforeDash);
    }
  });
  return Array.from(out).filter(Boolean);
}

/** Every row matches when nothing is selected for that type. */
export function matchesAny(haystack: string, needles: string[]): boolean {
  if (needles.length === 0) return true;
  const h = (haystack || "").toLowerCase();
  if (!h) return false;
  return needles.some((n) => h.includes(n) || n.includes(h));
}

/**
 * Half-yearly anniversary of the loan date that falls on/after `asOf`.
 * LIC policy loans are serviced every 6 months.
 */
export function getNextInterestDueDate(loanDateStr: string | Date | null | undefined, asOf: Date): Date {
  if (!loanDateStr) return new Date(asOf);
  const loanDate = new Date(loanDateStr);
  if (isNaN(loanDate.getTime())) return new Date(asOf);
  const d = new Date(loanDate);
  let guard = 0;
  while (d < asOf && guard < 400) {
    d.setMonth(d.getMonth() + 6);
    guard += 1;
  }
  return d;
}

/** Previous half-yearly anniversary strictly before `asOf` (used to split arrears). */
export function getPrevInterestDueDate(loanDateStr: string | Date | null | undefined, asOf: Date): Date | null {
  if (!loanDateStr) return null;
  const loanDate = new Date(loanDateStr);
  if (isNaN(loanDate.getTime())) return null;
  const next = getNextInterestDueDate(loanDateStr, asOf);
  const prev = new Date(next);
  prev.setMonth(prev.getMonth() - 6);
  if (prev <= loanDate) return null;
  return prev;
}

export function daysBetween(from: Date, to: Date): number {
  if (isNaN(from.getTime()) || isNaN(to.getTime()) || to <= from) return 0;
  return Math.floor((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * TRUE when the loan has at least one half-yearly interest due date inside
 * [from, to]. This is what the form's "DueDate Range (From)/(To)" means:
 * only loans whose interest falls due during the selected period are listed.
 */
export function hasDueDateInRange(
  loanDateStr: string | Date | null | undefined,
  from: Date | null,
  to: Date | null
): boolean {
  if (!loanDateStr || !to) return true;
  const start = new Date(loanDateStr);
  if (isNaN(start.getTime())) return true;

  const d = new Date(start);
  let guard = 0;
  while (d <= to && guard < 600) {
    if (!from || d >= from) return true;
    d.setMonth(d.getMonth() + 6);
    guard += 1;
  }
  return false;
}

/**
 * Interest accrual window for the report.
 * Interest runs from `accrualFrom` up to `accrualTo` on the outstanding principal.
 */
export function interestFor(
  principal: number,
  annualRatePercent: number,
  from: Date,
  to: Date
): number {
  const days = daysBetween(from, to);
  if (principal <= 0 || days <= 0) return 0;
  return round2((principal * annualRatePercent * days) / 36500);
}
