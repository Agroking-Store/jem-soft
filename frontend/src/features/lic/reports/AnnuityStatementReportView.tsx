"use client";

import { useRef, useState, useMemo, Fragment } from "react";
import { ArrowLeft, Download } from "lucide-react";
import { AnnuityStatementFormData } from "./AnnuityStatementForm";
import html2canvas from "html2canvas-pro";
import jsPDF from "jspdf";
import toast from "react-hot-toast";

interface AnnuityStatementReportViewProps {
  formData: AnnuityStatementFormData;
  policies: any[];
  customers: any[];
  onBackToForm: () => void;
}

function fmtDate(d: Date | string | null | undefined) {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  if (isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-GB");
}

function getPolicyMemberName(p: any): string {
  // lifeAssured / lifeAssuredName / holderName / insuredName are NOT schema
  // fields — the annuity holder is always CustomerMaster.
  const cm = p.CustomerMaster;
  if (cm) {
    const salutation = cm.salutation ? `${cm.salutation} ` : "";
    const fullName = [cm.firstName, cm.middleName, cm.lastName]
      .filter(Boolean)
      .join(" ");
    if (fullName.trim()) return `${salutation}${fullName.trim()}`;
  }
  if (p.customer?.name) return p.customer.name;
  return "Annuity Holder";
}

function matchesAny(haystack: string, needles: string[]) {
  if (needles.length === 0) return true;
  const h = (haystack || "").toLowerCase();
  if (!h) return false;
  return needles.some((n) => h.includes(n) || n.includes(h));
}

const BLACK = "#000";
const thStyle = {
  borderTop: `1px solid ${BLACK}`,
  borderBottom: `1px solid ${BLACK}`,
  verticalAlign: "bottom",
} as const;
const totalValueStyle = {
  display: "inline-block",
  borderTop: `1px solid ${BLACK}`,
  borderBottom: `3px double ${BLACK}`,
  padding: "1px 2px",
} as const;

export default function AnnuityStatementReportView({
  formData,
  policies: rawPolicies = [],
  customers: rawCustomers = [],
  onBackToForm,
}: AnnuityStatementReportViewProps) {
  const reportRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  const groupData = useMemo(() => {
    const fromDate = formData.dateFrom ? new Date(formData.dateFrom) : null;
    const toDate = formData.dateTo ? new Date(formData.dateTo) : null;

    if (fromDate) fromDate.setHours(0, 0, 0, 0);
    if (toDate) toDate.setHours(23, 59, 59, 999);

    const pick = (type: string) =>
      (formData.appliedFilters || [])
        .filter((f) => f.type === type)
        .map((f) => (f.name || f.id || "").toLowerCase().trim())
        .filter(Boolean);

    const selectedStatuses = pick("Policy Status").map((s) => s.replace(/[- ]/g, ""));
    const selectedAgencies = pick("Agencies");
    const selectedBranches = pick("Branches");
    const selectedAreas = pick("Areas");

    // Groups: Filter Options modal ("Groups Wise") + Select Groups modal
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

    // Sorting-filter modal selection — its meaning follows the sorting radio
    const sortingItems =
      formData.sortingOption === "groupsWise"
        ? []
        : formData.sortingFilterSelection?.selectedItems || [];
    const selectedMemberIds = new Set(sortingItems.map((i) => i.id));
    const selectedSortingKeys = sortingItems
      .map((i) => (i.code || i.name || "").toLowerCase().trim())
      .filter(Boolean);

    // Agency match — A001-A003 → Jayant (AG002), A004-A006 → Manisha (AG003)
    const JAYANT_ADVISOR_CODES = ["a001", "a002", "a003"];
    const MANISHA_ADVISOR_CODES = ["a004", "a005", "a006"];
    const isAgencyMatch = (p: any, filters: string[]) => {
      if (filters.length === 0) return true;
      const agCode = String(p.agentCode || p.advisor?.agency?.agencyCode || "")
        .toLowerCase()
        .trim();
      const agName = String(p.advisor?.agency?.agencyName || "")
        .toLowerCase()
        .trim();
      return filters.some((f) => {
        if (!f) return true;
        if (f.includes("jayant") || f.includes("ag002"))
          return JAYANT_ADVISOR_CODES.includes(agCode);
        if (f.includes("manisha") || f.includes("ag003"))
          return MANISHA_ADVISOR_CODES.includes(agCode);
        if (f.includes("other") || f.includes("ag001"))
          return (
            !JAYANT_ADVISOR_CODES.includes(agCode) &&
            !MANISHA_ADVISOR_CODES.includes(agCode)
          );
        return (
          (Boolean(agCode) && (agCode.includes(f) || f.includes(agCode))) ||
          (Boolean(agName) && (agName.includes(f) || f.includes(agName)))
        );
      });
    };

    const customerMap: { [id: string]: any } = {};
    rawCustomers.forEach((c: any) => {
      if (c.id) customerMap[String(c.id)] = c;
    });

    const validPolicies = rawPolicies.filter((p) => {
      const cust = p.customer || customerMap[String(p.clientId || p.customerId)] || {};

      // Date range — annuity payout proxy is the next premium due date
      const payout = p.nextPremiumDueDate ? new Date(p.nextPremiumDueDate) : null;
      if (fromDate && payout && payout < fromDate) return false;
      if (toDate && payout && payout > toDate) return false;

      const rawStatus = (p.status?.statusName || p.statusName || "Inforce")
        .toLowerCase()
        .replace(/[- ]/g, "");
      if (
        selectedStatuses.length > 0 &&
        !selectedStatuses.some((st) => rawStatus.includes(st) || st.includes(rawStatus))
      )
        return false;

      if (!isAgencyMatch(p, selectedAgencies)) return false;

      if (
        selectedBranches.length &&
        !matchesAny(
          `${p.branch?.branchCode || ""} ${p.branch?.branchName || ""}`,
          selectedBranches
        )
      )
        return false;

      if (
        selectedAreas.length &&
        !matchesAny(
          `${cust.resArea || ""} ${cust.resCity || ""} ${cust.offArea || ""}`,
          selectedAreas
        )
      )
        return false;

      if (selectedGroupKeys.size > 0) {
        const gCode = String(cust.groupCode || "").toLowerCase().trim();
        const gName = String(cust.groupName || cust.name || "").toLowerCase().trim();
        const matched = Array.from(selectedGroupKeys).some(
          (k) =>
            Boolean(k) &&
            (gCode === k || gCode.includes(k) || (gName && gName.includes(k)))
        );
        if (!matched) return false;
      }

      // Sorting modal: memberwise shows ONLY the ticked members, etc.
      if (sortingItems.length > 0) {
        if (formData.sortingOption === "groupMemberwise") {
          const memberId = p.CustomerMaster?.id || p.CustomerMasterId || "";
          if (!selectedMemberIds.has(memberId)) return false;
        } else if (formData.sortingOption === "policyNoWise") {
          const pid = String(p.id || p.policyNumber || "");
          if (!pid || !selectedMemberIds.has(pid)) return false;
        }
      }

      return true;
    });

    // Block key/heading follows the selected sorting radio
    const opt = formData.sortingOption;
    const isFlat = opt === "policyNoWise";

    const groupMap: { [key: string]: any } = {};

    validPolicies.forEach((p) => {
      const custMaster = p.CustomerMaster;
      const custObj = p.customer || customerMap[String(p.clientId || p.customerId)] || {};

      let gCode: string;
      let gHeadName: string;
      let showHeading = true;
      if (opt === "groupMemberwise") {
        // Memberwise = plain member list (member name row is the identity),
        // same look as Policy Register / Premium Outstanding.
        const memberId = custMaster?.id || p.CustomerMasterId || "";
        gCode = memberId || `M-${p.policyNumber}`;
        gHeadName = "";
        showHeading = false;
      } else if (isFlat) {
        gCode = "__flat__";
        gHeadName = "";
        showHeading = false;
      } else {
        gCode = String(custObj.groupCode || custObj.id || p.clientId || "—");
        gHeadName = custObj.groupName || custObj.name || "Annuity Holder Group";
      }

      const memberName = getPolicyMemberName(p);
      const memberMobile =
        custMaster?.contactInfo?.mobile1 || custObj?.phone || custObj?.mobilePersonal || "";
      const memberEmail = custMaster?.contactInfo?.emailPersonal || custObj?.email || "";
      // Customer has no single `address` field — build it from the parts.
      const addrParts = [
        custObj.resAddressLine1,
        custObj.resAddressLine2,
        custObj.resArea || custObj.offArea,
        custObj.resCity || custObj.offCity,
        custObj.resPin || custObj.offPin,
      ].filter(Boolean);
      const memberAddress = addrParts.length > 0 ? addrParts.join(", ") : "";
      const policyNo = p.policyNumber || "—";

      if (!groupMap[gCode]) {
        groupMap[gCode] = { groupCode: gCode, groupHeadName: gHeadName, showHeading, membersMap: {}, totalAnnuityAmount: 0 };
      }

      const grp = groupMap[gCode];
      if (!grp.membersMap[memberName]) {
        grp.membersMap[memberName] = {
          name: memberName,
          mobile: memberMobile,
          email: memberEmail,
          address: memberAddress,
          policies: [],
          totalAnnuityAmount: 0,
        };
      }

      const mem = grp.membersMap[memberName];
      // Schema has no annuity/pension amount field — show the real Sum Assured.
      const sumAssured = Number(p.premium?.sumAssured || 0);
      const mode = p.premiumMode?.modeName || "—";
      const planName = p.product?.productName || "—";
      const payoutDate = fmtDate(p.nextPremiumDueDate || p.commencementDate);
      // Real payment mode (NACH/Cheque/…) — no hardcoded "NEFT Registered".
      const payMode = p.paymentMode?.modeName || "—";

      const row = {
        policyNo,
        memberName,
        planName,
        mode,
        sumAssured,
        payoutDate,
        payMode,
      };

      mem.policies.push(row);
      mem.totalAnnuityAmount += sumAssured;
      grp.totalAnnuityAmount += sumAssured;
    });

    return Object.values(groupMap).map((grp: any) => ({
      ...grp,
      members: Object.values(grp.membersMap),
    }));
  }, [rawPolicies, rawCustomers, formData]);

  const grandTotalAnnuity = groupData.reduce((acc, g) => acc + g.totalAnnuityAmount, 0);

  const handleDownloadPDF = async () => {
    if (!reportRef.current) return;
    setIsExporting(true);
    const toastId = toast.loading("Generating PDF statement...");
    try {
      const canvas = await html2canvas(reportRef.current, { scale: 1.25, useCORS: true, allowTaint: true, backgroundColor: "#ffffff", logging: false });
      const pdf = new jsPDF({ orientation: "p", unit: "mm", format: "a4", compress: true });
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

      pdf.save(`Annuity_${formData.reportType}_${formData.reportDate || "Report"}.pdf`);
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
      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm print:hidden">
        <div className="flex items-center gap-3">
          <button onClick={onBackToForm} className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-slate-500 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 transition uppercase tracking-wider">
            <ArrowLeft size={16} />
            <span>Edit Filters</span>
          </button>
          <span className="text-xs bg-blue-50 text-[#1877F2] font-bold px-3 py-1 rounded-full border border-blue-200 uppercase tracking-wider">
            Annuity {formData.reportType}
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

      {/* Printable Statement — plain LIC-style */}
      <div
        ref={reportRef}
        style={{ fontFamily: "Arial, Helvetica, sans-serif", color: BLACK }}
        className="bg-white px-6 py-6 border border-slate-300 shadow-xl max-w-5xl mx-auto text-[11px] leading-snug print:p-0 print:border-none print:shadow-none"
      >
        <div className="flex justify-between items-end pb-1 text-[11px] font-semibold">
          <span>
            Annuity {formData.reportType === "Statement" ? "Payout Statement" : "Intimation Summary"} as on{" "}
            {fmtDate(formData.reportDate) || fmtDate(new Date())}
          </span>
          {formData.reportType === "Intimation" && formData.dateFrom && (
            <span>Period: {fmtDate(formData.dateFrom)} to {fmtDate(formData.dateTo)}</span>
          )}
        </div>

        {formData.reportType === "Intimation" && (
          <div className="pb-1 flex flex-wrap gap-x-6">
            <span><strong>Purpose :</strong> {formData.intimationOptions.purpose || "Pension Intimation"}</span>
            <span><strong>Cost per despatch :</strong> ₹{formData.intimationOptions.costPerDespatch}</span>
          </div>
        )}

        {groupData.length === 0 ? (
          <div className="mt-6 py-16 text-center bg-slate-50 rounded-xl border border-slate-200 p-8 space-y-2">
            <h3 className="font-bold text-slate-800 text-sm">No Annuity Policies Found</h3>
            <p className="text-xs text-slate-500">There are no annuity policies matching your filter criteria.</p>
          </div>
        ) : (
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="font-bold">
                <th className="px-1 py-1" style={thStyle}>Policy No</th>
                <th className="px-1 py-1" style={thStyle}>Annuity Holder</th>
                <th className="px-1 py-1" style={thStyle}>Plan / Option</th>
                <th className="px-1 py-1 text-center" style={thStyle}>Mode</th>
                <th className="px-1 py-1 text-right" style={thStyle}>Sum Assured (₹)</th>
                <th className="px-1 py-1 text-center" style={thStyle}>Payout<br />Date</th>
                <th className="px-1 py-1 text-center" style={thStyle}>Payment<br />Mode</th>
              </tr>
            </thead>
            <tbody>
              {groupData.map((group) => (
                <Fragment key={group.groupCode}>
                  {group.showHeading !== false && (
                    <tr>
                      <td colSpan={7} className="pt-3 pb-1 text-center text-[13px] font-bold">
                        {group.groupCode ? `${group.groupCode}: ` : ""}
                        {group.groupHeadName}
                      </td>
                    </tr>
                  )}
                  {group.members.map((member: any) => (
                    <Fragment key={member.name}>
                      {group.showHeading !== false && (
                        <tr>
                          <td colSpan={7} className="pt-2 pb-0.5">
                            <div className="text-[11px] font-bold">{member.name}</div>
                            {formData.reportType === "Statement" && (
                              <div className="text-[10px]">
                                {[
                                  formData.statementOptions.statementWithAddress && member.address && `Address : ${member.address}`,
                                  formData.statementOptions.statementWithTelNo && member.mobile && `Tel/Mob : ${member.mobile}`,
                                ].filter(Boolean).join("   ")}
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                      {member.policies.map((p: any, idx: number) => (
                        <tr key={p.policyNo + idx}>
                          <td className="px-1 py-0.5 font-mono whitespace-nowrap">{p.policyNo}</td>
                          <td className="px-1 py-0.5">{p.memberName}</td>
                          <td className="px-1 py-0.5">{p.planName}</td>
                          <td className="px-1 py-0.5 text-center">{p.mode}</td>
                          <td className="px-1 py-0.5 text-right font-bold whitespace-nowrap">{p.sumAssured.toLocaleString("en-IN")}</td>
                          <td className="px-1 py-0.5 text-center whitespace-nowrap">{p.payoutDate}</td>
                          <td className="px-1 py-0.5 text-center">{p.payMode}</td>
                        </tr>
                      ))}
                      {group.showHeading !== false && member.policies.length > 1 && (
                        <tr className="font-bold">
                          <td colSpan={4} className="px-1 pt-1.5 pb-1 text-right pr-3">Member Total :</td>
                          <td className="px-1 pt-1.5 pb-1 text-right font-mono whitespace-nowrap">
                            <span style={totalValueStyle}>{member.totalAnnuityAmount.toLocaleString("en-IN")}</span>
                          </td>
                          <td colSpan={2}></td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                  {group.showHeading !== false && (
                    <>
                      <tr className="font-bold">
                        <td colSpan={4} className="px-1 pt-1.5 pb-1 text-right pr-3">Group Total Sum Assured :</td>
                        <td className="px-1 pt-1.5 pb-1 text-right font-mono whitespace-nowrap">
                          <span style={totalValueStyle}>{group.totalAnnuityAmount.toLocaleString("en-IN")}</span>
                        </td>
                        <td colSpan={2}></td>
                      </tr>
                      <tr>
                        <td colSpan={7} style={{ borderBottom: `1px solid ${BLACK}`, height: 6 }}></td>
                      </tr>
                    </>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        )}

        {groupData.length > 0 && (
          <div className="pt-4 flex justify-end items-center gap-4 text-[12px] font-bold">
            <span>Grand Total Sum Assured :</span>
            <span className="font-mono" style={totalValueStyle}>₹ {grandTotalAnnuity.toLocaleString("en-IN")}</span>
          </div>
        )}
      </div>
    </div>
  );
}
