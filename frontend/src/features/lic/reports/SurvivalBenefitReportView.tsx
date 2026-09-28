"use client";

import { useRef, useState, useMemo, Fragment, ReactNode } from "react";
import { ArrowLeft, Download } from "lucide-react";
import { SurvivalBenefitFormData } from "./SurvivalBenefitForm";
import html2canvas from "html2canvas-pro";
import jsPDF from "jspdf";
import toast from "react-hot-toast";

interface SurvivalBenefitReportViewProps {
  formData: SurvivalBenefitFormData;
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

interface ColumnDef {
  key: string;
  label: string;
  align?: "left" | "right" | "center";
  render: (p: any) => ReactNode;
}

export default function SurvivalBenefitReportView({
  formData,
  policies: rawPolicies = [],
  onBackToForm,
}: SurvivalBenefitReportViewProps) {
  const reportRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  const columns: ColumnDef[] = useMemo(() => {
    const cols: ColumnDef[] = [
      { key: "policyNo", label: "Policy No", align: "right", render: (p) => p.policyNo },
      { key: "agCd", label: "Ag Cd", align: "center", render: (p) => p.agCd },
      { key: "comDate", label: "Comm. Date", render: (p) => p.comDate },
      { key: "planTermPpt", label: "Pl/Tm/Pt", render: (p) => p.planTermPpt },
      { key: "md", label: "Md", align: "center", render: (p) => p.md },
      { key: "brn", label: "Brn", render: (p) => p.brn },
      { key: "sbDate", label: "S.B. Date", render: (p) => p.sbDate },
    ];
    if (formData.reportOptions.dob) cols.push({ key: "dob", label: "D.O.B", align: "center", render: (p) => p.dob || "—" });
    cols.push(
      { key: "sumAssured", label: "Sum Assured", align: "right", render: (p) => p.sumAssured.toLocaleString("en-IN") },
      { key: "sbAmount", label: "S.B. Amount", align: "right", render: (p) => <span className="font-bold">{p.sbAmount.toLocaleString("en-IN")}</span> }
    );
    return cols;
  }, [formData.reportOptions.dob]);

  const alignClass = (a?: "left" | "right" | "center") => (a === "right" ? "text-right" : a === "center" ? "text-center" : "text-left");

  const groupData = useMemo(() => {
    const fromDate = formData.dateFrom ? new Date(formData.dateFrom) : null;
    const toDate = formData.dateTo ? new Date(formData.dateTo) : null;

    if (fromDate) fromDate.setHours(0, 0, 0, 0);
    if (toDate) toDate.setHours(23, 59, 59, 999);

    // Parse applied filters from FilterOptionsModal
    const selectedStatusFilters = (formData.appliedFilters || [])
      .filter((f) => f.type === "Policy Status")
      .map((f) => f.name.toLowerCase().replace(/[- ]/g, ""));

    const selectedAgencyFilters = (formData.appliedFilters || [])
      .filter((f) => f.type === "Agencies")
      .map((f) => f.name.toLowerCase().trim());

    const selectedPaymentModeFilters = (formData.appliedFilters || [])
      .filter((f) => f.type === "Payment Modes")
      .map((f) => f.name.toLowerCase().trim());

    const selectedCrmGroupFilters = (formData.appliedFilters || [])
      .filter((f) => f.type === "CRM Groups")
      .map((f) => f.name.toLowerCase().trim());

    const selectedGroupRatingFilters = (formData.appliedFilters || [])
      .filter((f) => f.type === "Group Rating")
      .map((f) => f.name.toLowerCase().trim());

    const selectedGroupCategoryFilters = (formData.appliedFilters || [])
      .filter((f) => f.type === "Group Category")
      .map((f) => f.name.toLowerCase().trim());

    const selectedGroupCodesOrNames =
      formData.sortingOption === "groupsWise"
        ? (formData.selectedGroups || []).map((g) => g.groupCode.toLowerCase())
        : (formData.sortingFilterSelection?.selectedItems || []).map((item) => {
            // For groupMemberwise, use the member ID (item.id) for matching
            if (formData.sortingOption === "groupMemberwise") {
              return (item.id || item.code || item.name).toLowerCase();
            }
            return (item.code || item.name).toLowerCase();
          });

    // Agency matching logic (same as Policy Register)
    const JAYANT_ADVISOR_CODES = ["a001", "a002", "a003"];
    const MANISHA_ADVISOR_CODES = ["a004", "a005", "a006"];

    const isAgencyMatch = (p: any, agencyFilters: string[]): boolean => {
      if (!agencyFilters || agencyFilters.length === 0) return true;
      const pAgCode = (p.agentCode || "").toLowerCase().trim();
      return agencyFilters.some((f) => {
        const fLower = f.toLowerCase().trim();
        if (!fLower) return true;
        if (fLower.includes("jayant") || fLower.includes("ag002")) return JAYANT_ADVISOR_CODES.includes(pAgCode);
        if (fLower.includes("manisha") || fLower.includes("ag003")) return MANISHA_ADVISOR_CODES.includes(pAgCode);
        if (fLower.includes("other") || fLower.includes("ag001")) return !JAYANT_ADVISOR_CODES.includes(pAgCode) && !MANISHA_ADVISOR_CODES.includes(pAgCode);
        return pAgCode.includes(fLower) || fLower.includes(pAgCode);
      });
    };

    // Compute Survival Benefit date from commencement date
    // LIC plans typically pay survival benefits every 5 years from commencement
    const getPolicySBDate = (p: any): Date | null => {
      if (p.survivalBenefitDate) {
        const d = new Date(p.survivalBenefitDate);
        if (!isNaN(d.getTime())) return d;
      }
      if (p.commencementDate) {
        const cd = new Date(p.commencementDate);
        if (!isNaN(cd.getTime())) {
          const now = new Date();
          const yearsPassed = now.getFullYear() - cd.getFullYear();
          const nextIntervalYears = (Math.floor(yearsPassed / 5) + 1) * 5;
          const sbDate = new Date(cd);
          sbDate.setFullYear(cd.getFullYear() + nextIntervalYears);
          return sbDate;
        }
      }
      return null;
    };

    const validDbPolicies = rawPolicies.filter((p) => {
      // Policy Status Filter
      if (selectedStatusFilters.length > 0) {
        const rawStatus = (p.status?.statusName || p.statusName || "Inforce")
          .toLowerCase()
          .replace(/[- ]/g, "");
        const matchesStatus = selectedStatusFilters.some(
          (st) => rawStatus.includes(st) || st.includes(rawStatus)
        );
        if (!matchesStatus) return false;
      }

      // Agency / Agent Filter
      if (!isAgencyMatch(p, selectedAgencyFilters)) return false;

      // Payment Mode Filter
      if (selectedPaymentModeFilters.length > 0) {
        const modeName = (p.premiumMode?.modeName || "").toLowerCase();
        const matchesPayment = selectedPaymentModeFilters.some(
          (pm) => modeName.includes(pm) || pm.includes(modeName)
        );
        if (!matchesPayment) return false;
      }

      // CRM Group Filter
      if (selectedCrmGroupFilters.length > 0) {
        const crmGroup = (p.customer?.crmGroup || p.crmGroup || "").toLowerCase();
        const matchesCrm = selectedCrmGroupFilters.some(
          (cg) => crmGroup.includes(cg) || cg.includes(crmGroup)
        );
        if (!matchesCrm) return false;
      }

      // Group Rating Filter
      if (selectedGroupRatingFilters.length > 0) {
        const rating = (p.customer?.groupRating || p.groupRating || "").toLowerCase();
        const matchesRating = selectedGroupRatingFilters.some(
          (gr) => rating.includes(gr) || gr.includes(rating)
        );
        if (!matchesRating) return false;
      }

      // Group Category Filter
      if (selectedGroupCategoryFilters.length > 0) {
        const category = (p.customer?.groupCategory || p.groupCategory || "").toLowerCase();
        const matchesCategory = selectedGroupCategoryFilters.some(
          (gc) => category.includes(gc) || gc.includes(category)
        );
        if (!matchesCategory) return false;
      }

      // Lapsed Policy Filter
      const rawStatus = (p.status?.statusName || p.statusName || "Inforce").toLowerCase();
      if (!formData.includeLapsedPolicies && rawStatus.includes("lapsed")) return false;

      // Record Only Policy Filter
      const isRecordOnly = Boolean(p.isRecordOnly);
      if (isRecordOnly && !formData.includeRecordOnlyPolicies) return false;

      // Survival Benefit Date Range Filter
      const sd = getPolicySBDate(p);
      if (!sd) return false;
      if (fromDate && sd < fromDate) return false;
      if (toDate && sd > toDate) return false;

      // Survival Benefit Amount Filter
      const sumAssured = Number(p.premium?.sumAssured || p.sumAssured || 0);
      const sbAmount = Number(p.survivalBenefitAmount || sumAssured * 0.2);
      if (formData.sbAmountFilterEnabled && sbAmount < formData.sbAmountAboveOrEqualTo) return false;

      return true;
    });

    const buildRow = (p: any, computedSbDate: Date) => {
      const custMaster = p.CustomerMaster;
      const custObj = p.customer;
      const mode = p.premiumMode?.modeName?.[0]?.toUpperCase() || "Y";
      const sumAssured = Number(p.premium?.sumAssured || p.sumAssured || 0);
      const sbAmount = Number(p.survivalBenefitAmount || sumAssured * 0.2);
      // DOB can come from CustomerMaster.dob, customer.dob, or CustomerMaster.dateOfBirth
      const memberDob = fmtDate(
        custMaster?.dob ||
        custMaster?.dateOfBirth ||
        custObj?.dob ||
        custObj?.dateOfBirth ||
        p.dob ||
        p.dateOfBirth
      );

      return {
        policyNo: p.policyNumber || "—",
        agCd: p.agentCode || "—",
        comDate: fmtDate(p.commencementDate) || "—",
        planTermPpt: `${p.product?.planNumber || "—"}/${p.policyTerm || "—"}/${p.premiumPayingTerm || "—"}`,
        md: mode,
        brn: p.branch?.branchCode || p.branchNo || "—",
        sbDate: fmtDate(computedSbDate),
        dob: memberDob,
        sumAssured,
        sbAmount,
      };
    };

    if (validDbPolicies.length === 0) {
      return [];
    }

    // Grouping logic based on sortingOption
    const groupMap: { [key: string]: any } = {};

    validDbPolicies.forEach((p) => {
      const custMaster = p.CustomerMaster;
      const custObj = p.customer;
      const sd = getPolicySBDate(p) || new Date();

      // Determine group key based on sorting option
      let gCode: string;
      let gHeadName: string;

      switch (formData.sortingOption) {
        case "groupMemberwise": {
          // Each member is its own group
          const memberId = custMaster?.id || `M${p.clientId || "01"}`;
          const memberName = custMaster
            ? [custMaster.salutation, custMaster.firstName, custMaster.middleName, custMaster.lastName].filter(Boolean).join(" ")
            : custObj?.name || "Policy Holder";
          const memberOwnGroupCode = custObj?.groupCode || "";
          gCode = memberId;
          gHeadName = memberOwnGroupCode ? `${memberOwnGroupCode} - ${memberName}` : memberName;
          break;
        }
        case "sbDatewise": {
          // Group by S.B. date
          gCode = sd.toISOString().split("T")[0];
          gHeadName = `S.B. Due: ${fmtDate(sd)}`;
          break;
        }
        case "branchNoWise": {
          // Group by branch
          const branchCode = p.branch?.branchCode || p.branchNo || "—";
          gCode = branchCode;
          gHeadName = `Branch ${branchCode}`;
          break;
        }
        default: {
          // groupsWise - group by group code
          gCode = custObj?.groupCode || `S${(p.clientId || "01").toString().padStart(3, "0")}`;
          gHeadName = custObj?.groupName || custObj?.name || "Customer Group";
          break;
        }
      }

      // Apply selected groups/items filter
      if (selectedGroupCodesOrNames.length > 0) {
        const matches = selectedGroupCodesOrNames.some((sc) => {
          const scLower = sc.toLowerCase();
          // For groupMemberwise, match by member ID (gCode) or member name (gHeadName)
          if (formData.sortingOption === "groupMemberwise") {
            return gCode.toLowerCase() === scLower || gHeadName.toLowerCase().includes(scLower);
          }
          // For other modes, use includes matching
          return gCode.toLowerCase().includes(scLower) || gHeadName.toLowerCase().includes(scLower);
        });
        if (!matches) return;
      }

      const memberName = custMaster
        ? [custMaster.salutation, custMaster.firstName, custMaster.middleName, custMaster.lastName].filter(Boolean).join(" ")
        : custObj?.name || "Policy Holder";

      const memberMobile = custMaster?.contactInfo?.mobile1 || custObj?.mobile || custObj?.mobile1 || "";
      let memberAddress = "";
      if (custMaster?.addresses && custMaster.addresses.length > 0) {
        const addr = custMaster.addresses[0];
        memberAddress = [addr.addressLine1, addr.addressLine2, addr.city, addr.state, addr.pin].filter(Boolean).join(", ");
      } else if (custObj?.address) {
        memberAddress = custObj.address;
      }

      if (!groupMap[gCode]) {
        groupMap[gCode] = {
          groupCode: gCode,
          groupHeadName: gHeadName,
          membersMap: {},
          totalPolicies: 0,
          totalSB: 0,
        };
      }
      const grp = groupMap[gCode];
      if (!grp.membersMap[memberName]) {
        grp.membersMap[memberName] = {
          name: memberName,
          mobile: memberMobile,
          address: memberAddress,
          policies: [],
          totalSB: 0,
        };
      }
      const mem = grp.membersMap[memberName];
      const row = buildRow(p, sd);
      mem.policies.push(row);
      mem.totalSB += row.sbAmount;
      grp.totalPolicies += 1;
      grp.totalSB += row.sbAmount;
    });

    return Object.values(groupMap).map((grp: any) => ({ ...grp, members: Object.values(grp.membersMap) }));
  }, [rawPolicies, formData]);

  const grandTotal = groupData.reduce((acc, g) => acc + g.totalSB, 0);
  const grandPolicies = groupData.reduce((acc, g) => acc + g.totalPolicies, 0);

  const getReportHeaderTitle = () => {
    switch (formData.sortingOption) {
      case "groupMemberwise":
        return "Memberwise";
      case "sbDatewise":
        return "S.B. Datewise";
      case "branchNoWise":
        return "Branchwise";
      default:
        return "Groupwise";
    }
  };

  const handleDownloadPDF = async () => {
    if (!reportRef.current) return;
    setIsExporting(true);
    const toastId = toast.loading("Generating PDF report...");
    try {
      const canvas = await html2canvas(reportRef.current, { scale: 2, useCORS: true, allowTaint: true, backgroundColor: "#ffffff", logging: false });
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
        const imgData = pageCanvas.toDataURL("image/jpeg", 0.85);
        if (pageIndex > 0) pdf.addPage();
        pdf.addImage(imgData, "JPEG", 0, 0, pageWidthMm, sliceHeightPx / pxPerMm, undefined, "FAST");
        renderedPx += sliceHeightPx;
        pageIndex += 1;
      }

      pdf.save(`Survival_Benefit_${formData.reportDate || "Report"}.pdf`);
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
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm print:hidden">
        <div className="flex items-center gap-3">
          <button onClick={onBackToForm} className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-slate-500 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 transition uppercase tracking-wider">
            <ArrowLeft size={16} />
            <span>Edit Filters</span>
          </button>
          <span className="text-xs bg-blue-50 text-[#1877F2] font-bold px-3 py-1 rounded-full border border-blue-200 uppercase tracking-wider">{getReportHeaderTitle()}</span>
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

      <div ref={reportRef} className="bg-white px-6 py-6 border border-slate-300 shadow-xl text-[10px] leading-snug print:p-0 print:border-none print:shadow-none" style={{ fontFamily: "Arial, Helvetica, sans-serif", color: "#000" }}>
        {/* Report title line */}
        <div className="flex justify-between items-end pb-0.5 text-[11px] font-semibold">
          <span>
            {formData.reportType === "Intimation" ? "Survival Benefit Intimation" : "Survival Benefit Statement"} as on {fmtDate(formData.reportDate) || fmtDate(new Date())}
          </span>
          <span>
            Groups: {groupData.length} | Policies: {grandPolicies}
          </span>
        </div>
        <div className="pb-1 text-[9px] font-normal">
          S.B. due between {fmtDate(formData.dateFrom)} and {fmtDate(formData.dateTo)} | {getReportHeaderTitle()}
        </div>

        {/* Intimation Letter - only shown when reportType is "Intimation" */}
        {formData.reportType === "Intimation" && groupData.length > 0 && (
          <div className="border border-slate-300 rounded-lg p-6 space-y-4 my-4">
            <div className="text-center">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Survival Benefit Intimation</h3>
              <p className="text-xs text-slate-500 mt-1">This is to inform you that the following survival benefits are due as per your policy terms.</p>
            </div>
            <div className="text-xs text-slate-700 space-y-2">
              <p>Dear Policyholder,</p>
              <p>
                As per the terms of your LIC policy, the following survival benefits are due for payment. Please find the details below:
              </p>
            </div>
          </div>
        )}

        <div className="space-y-4 overflow-x-auto">
          {groupData.length === 0 ? (
            <div className="py-16 text-center bg-slate-50 rounded-xl border border-slate-200 p-8 space-y-2">
              <h3 className="font-bold text-slate-800 text-sm">No Survival Benefits Found</h3>
              <p className="text-xs text-slate-500">
                There are no survival benefits due in the selected date range matching your filter criteria.
              </p>
            </div>
          ) : (
            <table className="w-full text-left text-[10px] border-collapse">
              <thead>
                <tr className="font-bold">
                  {columns.map((col) => (
                    <th key={col.key} className={`px-1 py-1 ${alignClass(col.align)} border-t border-b border-black`}>{col.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {groupData.map((group) => (
                  <Fragment key={group.groupCode}>
                    {/* Group heading - centered, bold (no ID visible) */}
                    <tr>
                      <td colSpan={columns.length} className="pt-3 pb-1 text-center">
                        <div className="text-[13px] font-bold">
                          {formData.sortingOption === "groupMemberwise"
                            ? group.groupHeadName
                            : formData.sortingOption === "sbDatewise"
                              ? group.groupHeadName
                              : formData.sortingOption === "branchNoWise"
                                ? group.groupHeadName
                                : `${group.groupCode}: ${group.groupHeadName}`}
                        </div>
                      </td>
                    </tr>
                    {group.members.map((member: any) => (
                      <Fragment key={member.name}>
                        {/* Member name - bold */}
                        <tr>
                          <td colSpan={columns.length} className="pt-2 pb-0.5 text-[11px] font-bold">
                            {member.name}
                            {(formData.reportOptions.printWithAddress || formData.reportOptions.printWithTelNo) && (
                              <span className="font-normal ml-3 text-[9px]">
                                {[
                                  formData.reportOptions.printWithAddress && member.address && `Address: ${member.address}`,
                                  formData.reportOptions.printWithTelNo && member.mobile && `Tel/Mob: ${member.mobile}`,
                                ].filter(Boolean).join(" | ")}
                              </span>
                            )}
                          </td>
                        </tr>
                        {member.policies.map((p: any) => (
                          <tr key={p.policyNo}>
                            {columns.map((col) => (
                              <td key={col.key} className={`px-1 py-0.5 ${alignClass(col.align)} ${col.align === "right" ? "font-mono" : ""}`}>{col.render(p)}</td>
                            ))}
                          </tr>
                        ))}
                        {/* Member total */}
                        <tr className="font-bold">
                          <td colSpan={columns.length - 1} className="px-1 pt-1.5 pb-1 text-right">
                            <span className="inline-block border-t border-b border-black px-1">Member Total :</span>
                          </td>
                          <td className="px-1 pt-1.5 pb-1 text-right font-mono">
                            <span className="inline-block border-t border-b border-black px-1">{member.totalSB.toLocaleString("en-IN")}</span>
                          </td>
                        </tr>
                      </Fragment>
                    ))}
                    {/* Group total */}
                    <tr className="font-bold">
                      <td colSpan={columns.length - 1} className="px-1 pt-1.5 pb-1 text-right">
                        <span className="inline-block border-t border-b border-black px-1">Total for Group : {group.totalPolicies} Policies</span>
                      </td>
                      <td className="px-1 pt-1.5 pb-1 text-right font-mono">
                        <span className="inline-block border-t border-b border-black px-1">{group.totalSB.toLocaleString("en-IN")}</span>
                      </td>
                    </tr>
                    {/* Separator */}
                    <tr>
                      <td colSpan={columns.length} style={{ borderBottom: "1px solid #000", height: 6 }}></td>
                    </tr>
                  </Fragment>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Grand summary */}
        {groupData.length > 0 && (
          <div className="pt-5 flex justify-end">
            <table className="w-full max-w-xl border-collapse text-[11px]">
              <tbody>
                <tr className="font-bold">
                  <td className="px-1 pt-1.5 pb-1">Grand Total (S.B. Amount)</td>
                  <td className="px-1 pt-1.5 pb-1 text-right font-mono">
                    <span className="inline-block border-t border-b border-black px-1">{grandTotal.toLocaleString("en-IN")}</span>
                  </td>
                </tr>
                <tr className="font-bold">
                  <td className="px-1 py-1">Total No. of Policies</td>
                  <td className="px-1 py-1 text-right font-mono">{grandPolicies}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

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
            <span>Generated via Survival Benefit Engine</span>
          </div>
        </div>
      </div>
    </div>
  );
}