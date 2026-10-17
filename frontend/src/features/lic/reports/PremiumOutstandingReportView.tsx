"use client";

import { useRef, useState, useMemo, Fragment } from "react";
import { ArrowLeft, Download, FilterX } from "lucide-react";
import { PremiumOutstandingFormData } from "./PremiumOutstandingForm";
import html2canvas from "html2canvas-pro";
import jsPDF from "jspdf";
import toast from "react-hot-toast";

interface PremiumOutstandingReportViewProps {
  formData: PremiumOutstandingFormData;
  policies: any[];
  customers: any[];
  onBackToForm: () => void;
}

const TIER1_DAYS_AFTER_FUP = 31;
const TIER2_DAYS_AFTER_FUP = 45;
const TIER1_LATE_FEE = 0;
const TIER2_LATE_FEE = 30;

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function addMonths(date: Date, months: number) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

function fmtDate(d: Date | string | null | undefined) {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  if (isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-GB");
}

function fmtDayMonth(d: Date | string | null | undefined) {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  if (isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit" });
}

/** LIC mode code (Y/M/Q/H/S) from the premium mode master. */
function resolveModeCode(p: any): string {
  const raw = String(p?.premiumMode?.modeName || "").toLowerCase().trim();
  if (raw.startsWith("month") || raw === "m") return "M";
  if (raw.startsWith("quarter") || raw === "q") return "Q";
  if (raw.startsWith("half") || raw === "h") return "H";
  if (raw.startsWith("single") || raw === "s") return "S";
  return "Y";
}

/** NACH is a PAYMENT mode (PaymentModeMaster), not a premium frequency. */
function isNachPolicy(p: any): boolean {
  const pay = String(p?.paymentMode?.modeName || "").toLowerCase();
  if (pay.includes("nach")) return true;
  return String(p?.premiumMode?.modeName || "").toLowerCase().includes("nach");
}

export default function PremiumOutstandingReportView({
  formData,
  policies: rawPolicies = [],
  customers: rawCustomers = [],
  onBackToForm,
}: PremiumOutstandingReportViewProps) {
  const reportRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  const groupData = useMemo(() => {
    const fupUpto = formData.fupDatesUpto ? new Date(formData.fupDatesUpto) : null;

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
    // and/or the Select Groups modal used by the groupsWise sorting radio.
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
    if (formData.sortingOption === "groupsWise") {
      (formData.selectedGroups || []).forEach((g) =>
        addGroupKey((g as { groupCode?: string }).groupCode || "")
      );
    }

    // Sorting Filter modal selection — its meaning follows the sorting radio.
    const sortingItems =
      formData.sortingOption === "groupsWise"
        ? []
        : formData.sortingFilterSelection?.selectedItems || [];
    const selectedMemberIds = new Set(sortingItems.map((i) => i.id));
    const selectedSortingKeys = sortingItems
      .map((i) => (i.code || i.name || "").toLowerCase().trim())
      .filter(Boolean);

    const matchesAny = (haystack: string, needles: string[]): boolean => {
      if (needles.length === 0) return true;
      const h = (haystack || "").toLowerCase();
      if (!h) return false;
      return needles.some((n) => h.includes(n) || n.includes(h));
    };

    // Agency match — A001-A003 → Jayant (AG002), A004-A006 → Manisha (AG003)
    const JAYANT_ADVISOR_CODES = ["a001", "a002", "a003"];
    const MANISHA_ADVISOR_CODES = ["a004", "a005", "a006"];
    const isAgencyMatch = (p: any, filters: string[]) => {
      if (filters.length === 0) return true;
      const agCode = String(p.agentCode || p.agency?.agencyCode || "").toLowerCase().trim();
      const agName = String(
        p.advisor?.agency?.agencyName || p.agency?.agencyName || ""
      )
        .toLowerCase()
        .trim();
      return filters.some((f) => {
        if (!f) return true;
        if (f.includes("jayant") || f.includes("ag002")) return JAYANT_ADVISOR_CODES.includes(agCode);
        if (f.includes("manisha") || f.includes("ag003"))
          return MANISHA_ADVISOR_CODES.includes(agCode);
        if (f.includes("other") || f.includes("ag001"))
          return !JAYANT_ADVISOR_CODES.includes(agCode) && !MANISHA_ADVISOR_CODES.includes(agCode);
        return (
          (Boolean(agCode) && (agCode.includes(f) || f.includes(agCode))) ||
          (Boolean(agName) && (agName.includes(f) || f.includes(agName)))
        );
      });
    };

    const validDbPolicies = rawPolicies.filter((p) => {
      
      const fupRaw = p.nextPremiumDueDate || p.fupDate;
      if (fupUpto && fupRaw) {
        const fd = new Date(fupRaw);
        if (!isNaN(fd.getTime()) && fd > fupUpto) return false;
      }

      const rawStatus = (p.status?.statusName || p.statusName || "Lapsed").toLowerCase();
      if (selectedStatusNames.length > 0) {
        const normStatus = rawStatus.replace(/[- ]/g, "");
        const matches = selectedStatusNames.some(
          (st) => normStatus.includes(st) || st.includes(normStatus)
        );
        if (!matches) return false;
      }

      const isNach = isNachPolicy(p);
      if (isNach && !formData.paymentTypes.nach) return false;
      if (!isNach && !formData.paymentTypes.otherThanNach) return false;

      if (!isAgencyMatch(p, selectedAgencies)) return false;

      if (
        selectedBranches.length &&
        !matchesAny(`${p.branch?.branchCode || ""} ${p.branch?.branchName || ""}`, selectedBranches)
      )
        return false;

      const custRef =
        p.customer ||
        rawCustomers.find((c: any) => c.id === p.customerId || c.id === p.clientId) ||
        {};

      if (
        selectedAreas.length &&
        !matchesAny(
          `${custRef.resArea || ""} ${custRef.resCity || ""} ${custRef.offArea || ""}`,
          selectedAreas
        )
      )
        return false;

      if (selectedGroupKeys.size > 0) {
        const gCode = String(custRef.groupCode || "").toLowerCase().trim();
        const gName = String(custRef.groupName || custRef.name || "").toLowerCase().trim();
        const matched = Array.from(selectedGroupKeys).some(
          (k) => Boolean(k) && (gCode === k || gCode.includes(k) || (gName && gName.includes(k)))
        );
        if (!matched) return false;
      }

      // Sorting modal selection: memberwise shows ONLY the ticked members.
      if (sortingItems.length > 0) {
        if (formData.sortingOption === "groupMemberwise") {
          const memberId = p.CustomerMaster?.id || p.CustomerMasterId || "";
          if (!selectedMemberIds.has(memberId)) return false;
        } else if (formData.sortingOption === "areaWise") {
          if (!matchesAny(String(custRef.resArea || ""), selectedSortingKeys)) return false;
        } else if (formData.sortingOption === "subAreaWise") {
          if (!matchesAny(String(custRef.resCity || ""), selectedSortingKeys)) return false;
        } else if (formData.sortingOption === "branchNoWise") {
          if (
            !matchesAny(
              `${p.branch?.branchCode || ""} ${p.branch?.branchName || ""}`,
              selectedSortingKeys
            )
          )
            return false;
        } else if (formData.sortingOption === "policyNoWise") {
          const pn = String(p.policyNumber || "").toLowerCase().trim();
          if (!pn || !selectedSortingKeys.some((k) => pn.includes(k))) return false;
        }
      }

      return true;
    });

    if (validDbPolicies.length > 0) {
      const groupMap: { [key: string]: any } = {};
      const sortOpt = formData.sortingOption;
      const isFlat = sortOpt === "dueDate" || sortOpt === "policyNoWise";

      // dueDate / policyNoWise are FLAT sorts — a single unheaded block.
      if (isFlat) {
        groupMap["__flat__"] = {
          groupCode: "",
          groupHeadName: "",
          showHeading: false,
          address: "",
          mobile: "",
          email: "",
          pan: "",
          gst: "",
          membersMap: {},
          totalPolicies: 0,
          groupTotalTier1: 0,
          groupTotalTier2: 0,
        };
      }

      const orderedPolicies = isFlat
        ? [...validDbPolicies].sort((a, b) => {
            if (sortOpt === "policyNoWise")
              return String(a.policyNumber || "").localeCompare(String(b.policyNumber || ""), undefined, {
                numeric: true,
              });
            const da = new Date(a.nextPremiumDueDate || a.fupDate || 0).getTime() || 0;
            const db = new Date(b.nextPremiumDueDate || b.fupDate || 0).getTime() || 0;
            return da - db;
          })
        : validDbPolicies;

      orderedPolicies.forEach((p, idx) => {
        const cust = p.customer || rawCustomers.find((c: any) => c.id === p.customerId || c.id === p.clientId) || {};

        // Group key/heading follows the selected sorting radio.
        let gCode: string;
        let gHeadName: string;
        let showHeading = true;
        if (sortOpt === "groupMemberwise") {
          const memberId = p.CustomerMaster?.id || p.CustomerMasterId || `M${idx + 1}`;
          gCode = String(memberId);
          gHeadName = p.CustomerMaster
            ? `${p.CustomerMaster.salutation || ""} ${p.CustomerMaster.firstName || ""} ${p.CustomerMaster.lastName || ""}`.replace(/\s+/g, " ").trim()
            : cust.name || "Member";
          // Memberwise = plain member list, no big block heading.
          showHeading = false;
        } else if (sortOpt === "areaWise") {
          const area = cust.resArea || cust.resCity || "Unassigned";
          gCode = `A:${area}`;
          gHeadName = `Area : ${area}`;
        } else if (sortOpt === "subAreaWise") {
          const sub = cust.resCity || "Unassigned";
          gCode = `S:${sub}`;
          gHeadName = `Sub-Area : ${sub}`;
        } else if (sortOpt === "branchNoWise") {
          const brn = p.branch?.branchCode || p.branchNo || "—";
          gCode = `B:${brn}`;
          gHeadName = `Branch : ${p.branch?.branchName || brn}`;
        } else if (isFlat) {
          gCode = "__flat__";
          gHeadName = "";
        } else {
          gCode = String(p.customer?.groupCode || `0000${p.clientId || "02"}`);
          gHeadName = p.customer?.groupName || p.customer?.name || "Customer Group";
        }

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
            showHeading,
            address: addressStr,
            mobile: mobileStr,
            email: emailStr,
            pan: panStr,
            gst: gstStr,
            membersMap: {},
            totalPolicies: 0,
            groupTotalTier1: 0,
            groupTotalTier2: 0,
          };
        }

        const grp = groupMap[gCode];
        if (!grp.membersMap[memberName]) {
          grp.membersMap[memberName] = {
            name: memberName,
            dob,
            nachInfo: "",
            policies: [],
            memberTotalTier1: 0,
            memberTotalTier2: 0,
          };
        }
        const mem = grp.membersMap[memberName];

        const mode = resolveModeCode(p);
        const installmentPremium = Number(
          p.premium?.installmentPremium || p.premium?.totalInstallmentPremium || p.premiumAmount || 0
        );
        const fupRaw = p.nextPremiumDueDate || p.fupDate;
        const fupDate = fupRaw ? new Date(fupRaw) : new Date(formData.fupDatesUpto || "2000-01-01");

        const tier1Date = addDays(fupDate, TIER1_DAYS_AFTER_FUP);
        const tier2Date = addDays(fupDate, TIER2_DAYS_AFTER_FUP);
        // Latefee Calculation Date decides whether the grace window (FUP + 31)
        // is already crossed as on that date — only then the ₹30 late fee
        // applies to the tier-2 amount. Before that, tier-2 = premium only.
        const lateFeeCalcDate = formData.latefeeCalculationDate
          ? new Date(formData.latefeeCalculationDate)
          : new Date();
        const graceCrossed = lateFeeCalcDate.getTime() > tier1Date.getTime();
        const tier1Amount = installmentPremium + TIER1_LATE_FEE;
        const tier2Amount = installmentPremium + (graceCrossed ? TIER2_LATE_FEE : 0);

        // NACH details (Report Options → NACH Details) — real mandate info from
        // the member's default bank account; NACH auto-debits on the FUP date.
        const isNach = isNachPolicy(p);
        if (!mem.nachInfo && isNach) {
          const banks: any[] = p.CustomerMaster?.bankDetails || [];
          const bank = banks.find((b) => b?.isDefault) || banks[0];
          const parts = ["NACH", `Debit Date: ${fmtDate(fupRaw)}`];
          if (bank?.bankName) parts.push(String(bank.bankName));
          if (bank?.accountNumber) parts.push(`A/C ****${String(bank.accountNumber).slice(-4)}`);
          if (bank?.ifscCode) parts.push(`IFSC ${bank.ifscCode}`);
          mem.nachInfo = parts.join(" • ");
        }

        mem.policies.push({
          policyNo: p.policyNumber || `PO-${idx + 1}`,
          agCd: p.agentCode || p.agency?.agencyCode || "—",
          commDate: fmtDate(p.commencementDate),
          planTermPpt: `${p.product?.planNumber || "—"}/${p.policyTerm || "—"}/${p.premiumPayingTerm || "—"}`,
          md: mode,
          brn: p.branch?.branchCode || "—",
          installmentPremium,
          fupDate: fupRaw ? fmtDate(fupDate) : "—",
          tier1Amount,
          tier1Date: fmtDayMonth(tier1Date),
          tier2Amount,
          tier2Date: fmtDayMonth(tier2Date),
          taxBen: "0.00",
          depsXCharge: "0.00",
        });

        mem.memberTotalTier1 += tier1Amount;
        mem.memberTotalTier2 += tier2Amount;
        grp.totalPolicies += 1;
        grp.groupTotalTier1 += tier1Amount;
        grp.groupTotalTier2 += tier2Amount;
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
  }, [rawPolicies, rawCustomers, formData]);

  const grandTotalTier1 = groupData.reduce((acc, g) => acc + g.groupTotalTier1, 0);
  const grandTotalTier2 = groupData.reduce((acc, g) => acc + g.groupTotalTier2, 0);
  const grandTotalPolicies = groupData.reduce((acc, g) => acc + g.totalPolicies, 0);

  const showAddress = formData.reportOptions?.address;
  const showMobile = formData.reportOptions?.mobile;
  const showEmail = formData.reportOptions?.email;
  const showPan = formData.reportOptions?.pan;
  const showGst = formData.reportOptions?.gst;
  const showDob = formData.reportOptions?.dob;
  const showNach = formData.reportOptions?.nachDetails;

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

  const windowFrom = formData.fupDatesUpto ? addMonths(new Date(formData.fupDatesUpto), -6) : null;

  const handleDownloadPDF = async () => {
    if (!reportRef.current) return;
    setIsExporting(true);
    const toastId = toast.loading("Generating Pristine Executive PDF...");

    const elem = reportRef.current;
    const originalWidth = elem.style.width;

    try {
      // Temporarily lock to a fixed print width for consistent, sharp scale
      elem.style.width = "820px";

      const canvas = await html2canvas(elem, {
        scale: 2, // 2x is plenty sharp for A4 print
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        logging: false,
      });

      // Restore full width screen styling
      elem.style.width = originalWidth;

      const pdf = new jsPDF({ orientation: "p", unit: "mm", format: "a4", compress: true });
      const pageWidthMm = 210;
      const pageHeightMm = 297;

      // How many canvas pixels fit on one A4 page at this width
      const pxPerMm = canvas.width / pageWidthMm;
      const pageHeightPx = Math.floor(pageHeightMm * pxPerMm);

      let renderedPx = 0;
      let pageIndex = 0;

      while (renderedPx < canvas.height - 5) {
        const sliceHeightPx = Math.min(pageHeightPx, canvas.height - renderedPx);

        // Each PDF page gets ONLY its own slice (not the whole canvas again)
        const pageCanvas = document.createElement("canvas");
        pageCanvas.width = canvas.width;
        pageCanvas.height = sliceHeightPx;
        const ctx = pageCanvas.getContext("2d");
        if (!ctx) throw new Error("Canvas context not available");
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
        ctx.drawImage(
          canvas,
          0, renderedPx, canvas.width, sliceHeightPx, // source slice
          0, 0, canvas.width, sliceHeightPx           // destination
        );

        // JPEG @ 0.85 is ~10x smaller than PNG for text-heavy pages
        const imgData = pageCanvas.toDataURL("image/jpeg", 0.85);
        if (pageIndex > 0) pdf.addPage();
        pdf.addImage(
          imgData,
          "JPEG",
          0,
          0,
          pageWidthMm,
          sliceHeightPx / pxPerMm,
          undefined,
          "FAST"
        );

        renderedPx += sliceHeightPx;
        pageIndex += 1;
      }

      pdf.save(`Premium_Outstanding_${formData.reportDate || "Report"}.pdf`);
      toast.success("Executive PDF exported successfully!", { id: toastId });
    } catch (err: any) {
      console.error(err);
      elem.style.width = originalWidth;
      toast.error(err?.message || "Failed to generate PDF.", { id: toastId });
    } finally {
      setIsExporting(false);
    }
  };


  const BLACK = "#000";
  const thStyle: React.CSSProperties = {
    borderTop: `1px solid ${BLACK}`,
    borderBottom: `1px solid ${BLACK}`,
    verticalAlign: "bottom",
  };
  const totalValueStyle: React.CSSProperties = {
    display: "inline-block",
    borderTop: `1px solid ${BLACK}`,
    borderBottom: `3px double ${BLACK}`,
    padding: "1px 2px",
  };
  const thSubStyle: React.CSSProperties = {
    borderBottom: `1px solid ${BLACK}`,
  };

  const reportDateStr = formData.reportDate ? fmtDate(formData.reportDate) : fmtDate(new Date());

  // Columns: 8 leading (Policy No .. FUP Date) + 4 amount cols + Tax Benef. + Deps/X-charge
  const LEADING_COLS = 8;
  const totalCols = 14;

  const renderTotalRow = (
    key: string,
    label: string,
    leftText: string | null,
    tier1: number,
    tier2: number
  ) => (
    <tr key={key} className="font-bold">
      <td colSpan={LEADING_COLS} className="px-1 pt-1.5 pb-1">
        <div className="flex justify-between">
          <span>{leftText}</span>
          <span className="pr-3">{label}</span>
        </div>
      </td>
      <td className="px-1 pt-1.5 pb-1 text-right font-mono whitespace-nowrap">
        <span style={totalValueStyle}>{tier1.toFixed(2)}</span>
      </td>
      <td></td>
      <td className="px-1 pt-1.5 pb-1 text-right font-mono whitespace-nowrap">
        <span style={totalValueStyle}>{tier2.toFixed(2)}</span>
      </td>
      <td></td>
      <td colSpan={2}></td>
    </tr>
  );

  return (
    <div className="space-y-6 w-full">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm print:hidden w-full">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToForm}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-slate-500 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 transition uppercase tracking-wider"
          >
            <ArrowLeft size={16} />
            <span>Edit Filters</span>
          </button>
          <span className="text-xs bg-blue-50 text-[#1877F2] font-bold px-3 py-1 rounded-full border border-blue-200 uppercase tracking-wider">
            {getReportHeaderTitle()}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleDownloadPDF}
            disabled={isExporting}
            className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-[#5c67ff] to-[#3a47ff] text-white font-bold text-xs rounded-xl shadow-md shadow-blue-200 hover:brightness-110 transition disabled:opacity-50 uppercase tracking-wider"
          >
            <Download size={16} />
            <span>{isExporting ? "Exporting PDF..." : "Download PDF"}</span>
          </button>
        </div>
      </div>

      {/* Printable Statement — plain LIC-style register (same look as Policy Register) */}
      <div
        ref={reportRef}
        style={{ fontFamily: "Arial, Helvetica, sans-serif", color: BLACK }}
        className="w-full bg-white px-6 py-6 border border-slate-300 shadow-xl text-[10px] leading-snug print:p-0 print:border-none print:shadow-none"
      >
        {/* Report title line */}
        <div className="flex justify-between items-end pb-0.5 text-[11px] font-semibold">
          <span>
            Premium Outstanding {formData.reportType === "Intimation" ? "Intimation Notice" : "Statement"} — {getReportHeaderTitle()} as on {reportDateStr}
          </span>
          <span>
            Groups: {groupData.length} | Policies: {grandTotalPolicies}
          </span>
        </div>
        <div className="pb-1 text-[9px] font-normal">
          Premium Outstanding between {fmtDate(windowFrom)} and {fmtDate(formData.fupDatesUpto)}
          {" | "}Latefee Calculated as on {fmtDate(formData.latefeeCalculationDate)}
        </div>
        {formData.reportType === "Intimation" && (
          <div className="pb-2 text-[9px] leading-snug">
            Notice: You are requested to pay the premium shown below (including late fee, if applicable)
            on or before the last date shown, to keep the policy in force.
          </div>
        )}

        {groupData.length === 0 ? (
          <div className="mt-6 p-12 text-center border-2 border-dashed border-slate-300 rounded-2xl space-y-3 bg-slate-50">
            <div className="inline-flex p-3 bg-red-100 text-red-600 rounded-full">
              <FilterX size={32} />
            </div>
            <h3 className="text-base font-bold text-slate-800">No Premium Outstanding Policies Match Your Selected Filters</h3>
            <p className="text-xs text-slate-600 max-w-md mx-auto">
              No policies in the database matched the combined filter criteria. Please adjust your filters or click &quot;Edit Filters&quot; to try again.
            </p>
            <button
              onClick={onBackToForm}
              className="px-5 py-2 bg-[#0B1220] text-[#E8C77A] font-bold text-xs rounded-xl hover:bg-slate-900 transition"
            >
              Modify Filter Selection
            </button>
          </div>
        ) : (
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="font-bold">
                <th rowSpan={2} className="px-1 py-1 text-left whitespace-nowrap" style={thStyle}>Policy No.</th>
                <th rowSpan={2} className="px-1 py-1 text-center" style={thStyle}>Ag<br />Cd</th>
                <th rowSpan={2} className="px-1 py-1" style={thStyle}>Comm.<br />Date</th>
                <th rowSpan={2} className="px-1 py-1" style={thStyle}>Pl/<br />Tm/Pt</th>
                <th rowSpan={2} className="px-1 py-1 text-center" style={thStyle}>Md</th>
                <th rowSpan={2} className="px-1 py-1" style={thStyle}>Brn</th>
                <th rowSpan={2} className="px-1 py-1 text-right" style={thStyle}>Instl.<br />Premium</th>
                <th rowSpan={2} className="px-1 py-1" style={thStyle}>FUP<br />Date</th>
                <th
                  colSpan={4}
                  className="px-1 py-1 text-center"
                  style={{ borderTop: `1px solid ${BLACK}`, borderBottom: `1px solid ${BLACK}` }}
                >
                  Amount to be Paid (Upto)
                </th>
                <th rowSpan={2} className="px-1 py-1 text-center" style={thStyle}>Tax<br />Benef.</th>
                <th rowSpan={2} className="px-1 py-1 text-center" style={thStyle}>Deps./<br />X-charge</th>
              </tr>
              <tr className="font-bold">
                <th className="px-1 py-1 text-right" style={thSubStyle}>Rs.</th>
                <th className="px-1 py-1" style={thSubStyle}>dd/mm</th>
                <th className="px-1 py-1 text-right" style={thSubStyle}>Rs.</th>
                <th className="px-1 py-1" style={thSubStyle}>dd/mm</th>
              </tr>
            </thead>

            {groupData.map((group) => (
              <tbody key={group.groupCode}>
                {/* Centered group heading */}
                {group.showHeading !== false && (
                <tr>
                  <td colSpan={totalCols} className="pt-3 pb-1 text-center">
                    <div className="text-[13px] font-bold">
                      {group.groupCode ? `${group.groupCode}: ` : ""}
                      {group.groupHeadName}
                      {showPan && <span className="text-[10px] font-normal"> &nbsp;(PAN: {group.pan})</span>}
                      {showGst && <span className="text-[10px] font-normal"> &nbsp;(GST: {group.gst})</span>}
                    </div>
                    {(showMobile || showEmail) && (
                      <div>
                        {showMobile && <span>Mobile : {group.mobile}</span>}
                        {showMobile && showEmail && <span>&nbsp;&nbsp;&nbsp;</span>}
                        {showEmail && <span>Email : {group.email}</span>}
                      </div>
                    )}
                    {showAddress && <div>Address : {group.address}</div>}
                  </td>
                </tr>
                )}

                {group.members.map((member: any) => (
                  <Fragment key={member.name}>
                    {/* Member name (bold) */}
                    <tr>
                      <td colSpan={totalCols} className="pt-2 pb-0.5 text-[11px] font-bold">
                        {member.name}
                        {showDob && member.dob && (
                          <span className="font-normal ml-3">DOB : {member.dob}</span>
                        )}
                        {showNach && member.nachInfo && (
                          <span className="font-normal ml-3">{member.nachInfo}</span>
                        )}
                      </td>
                    </tr>

                    {member.policies.map((p: any) => (
                      <tr key={p.policyNo}>
                        <td className="px-1 py-0.5 text-left font-mono whitespace-nowrap">{p.policyNo}</td>
                        <td className="px-1 py-0.5 text-center">{p.agCd}</td>
                        <td className="px-1 py-0.5 whitespace-nowrap">{p.commDate}</td>
                        <td className="px-1 py-0.5 whitespace-nowrap">{p.planTermPpt}</td>
                        <td className="px-1 py-0.5 text-center">{p.md}</td>
                        <td className="px-1 py-0.5">{p.brn}</td>
                        <td className="px-1 py-0.5 text-right whitespace-nowrap">{p.installmentPremium.toFixed(2)}</td>
                        <td className="px-1 py-0.5 whitespace-nowrap">{p.fupDate}</td>
                        <td className="px-1 py-0.5 text-right font-bold whitespace-nowrap">{p.tier1Amount.toFixed(2)}</td>
                        <td className="px-1 py-0.5 whitespace-nowrap">{p.tier1Date}</td>
                        <td className="px-1 py-0.5 text-right font-bold whitespace-nowrap">{p.tier2Amount.toFixed(2)}</td>
                        <td className="px-1 py-0.5 whitespace-nowrap">{p.tier2Date}</td>
                        <td className="px-1 py-0.5 text-center">{p.taxBen}</td>
                        <td className="px-1 py-0.5 text-center">{p.depsXCharge}</td>
                      </tr>
                    ))}

                    {/* Member total — only when it adds information */}
                    {member.policies.length > 1 &&
                      group.members.length > 1 &&
                      renderTotalRow(
                        `mt-${member.name}`,
                        "Member Total :",
                        null,
                        member.memberTotalTier1,
                        member.memberTotalTier2
                      )}
                  </Fragment>
                ))}

                {/* Group total */}
                {group.totalPolicies > 1 &&
                  renderTotalRow(
                    `gt-${group.groupCode}`,
                    "Group Total :",
                    `Total Policies for Group : ${group.totalPolicies}`,
                    group.groupTotalTier1,
                    group.groupTotalTier2
                  )}

                {/* Thin separator line between groups */}
                <tr>
                  <td
                    colSpan={totalCols}
                    style={{ borderBottom: `1px solid ${BLACK}`, height: 6 }}
                  ></td>
                </tr>
              </tbody>
            ))}
          </table>
        )}

        {/* Grand summary */}
        {groupData.length > 0 && (
          <div className="pt-5 flex justify-end">
            <table className="w-full max-w-xl border-collapse text-[11px]">
              <thead>
                <tr className="font-bold">
                  <th className="px-1 py-1 text-left" style={thStyle}>Grand Premium Outstanding</th>
                  <th className="px-1 py-1 text-right" style={thStyle}>Amount (without Latefee)</th>
                  <th className="px-1 py-1 text-right" style={thStyle}>Amount (with Latefee)</th>
                </tr>
              </thead>
              <tbody>
                <tr className="font-bold">
                  <td className="px-1 pt-1.5 pb-1">Grand Total</td>
                  <td className="px-1 pt-1.5 pb-1 text-right font-mono">
                    <span style={totalValueStyle}>
                      {grandTotalTier1.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                  </td>
                  <td className="px-1 pt-1.5 pb-1 text-right font-mono">
                    <span style={totalValueStyle}>
                      {grandTotalTier2.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                  </td>
                </tr>
                <tr className="font-bold">
                  <td className="px-1 py-1">Total No. of Policies</td>
                  <td colSpan={2} className="px-1 py-1 text-right font-mono">
                    {grandTotalPolicies} Policies
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* Legend footer */}
        <div className="pt-5 mt-4 space-y-1 text-[9px]" style={{ borderTop: `1px solid ${BLACK}` }}>
          <div className="flex flex-wrap gap-x-5 gap-y-0.5">
            <span><strong>m :</strong> SSS Mode</span>
            <span><strong>M :</strong> Monthly Mode</span>
            <span><strong>Y :</strong> Yearly Mode</span>
            <span><strong>S :</strong> Cheque dishonoured/ Debit fail</span>
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-0.5">
            <span><strong>A :</strong> APPS Mode</span>
            <span><strong>ρ :</strong> PAN Card Registered</span>
          </div>
          <div className="flex justify-between font-mono text-[8px] pt-1">
            <span>Statement Code: DSS000019899</span>
            <span>Generated via Premium Outstanding Engine</span>
          </div>
        </div>
      </div>
    </div>
  );
}