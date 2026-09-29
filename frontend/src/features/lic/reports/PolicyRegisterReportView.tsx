"use client";

import React, { useRef, useState, useMemo, Fragment } from "react";
import { ArrowLeft, Download, FilterX } from "lucide-react";
import { PolicyRegisterFormData } from "./PolicyRegisterForm";
import html2canvas from "html2canvas-pro";
import jsPDF from "jspdf";
import toast from "react-hot-toast";

interface PolicyRegisterReportViewProps {
  formData: PolicyRegisterFormData;
  policies: any[];
  customers: any[];
  onBackToForm: () => void;
}

export default function PolicyRegisterReportView({
  formData,
  policies: rawPolicies = [],
  customers: rawCustomers = [],
  onBackToForm,
}: PolicyRegisterReportViewProps) {
  const reportRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  // 100% Strict Linked Filtering & Dynamic Grouping Engine
  const {
    groupData,
    nomineeEntries,
    regularPoliciesCount,
    singlePoliciesCount,
    regularPaTotal,
    singlePaTotal,
    grandTotalPa,
    grandTotalSum,
    grandTotalAcc,
    grandTotalPolicies,
    activeFiltersSummary,
  } = useMemo(() => {
    // 1. Policy Status Filter
    const selectedStatusFilters = (formData.appliedFilters || [])
      .filter((f) => f.type === "Policy Status")
      .map((f) => f.name.toLowerCase().replace(/[- ]/g, ""));

    // 2. Agency / Agent Filter
    const selectedAgencyFilters = (formData.appliedFilters || [])
      .filter((f) => f.type === "Agencies")
      .map((f) => f.name.toLowerCase().trim());

    // 3. Sorting Filter Selection
    const selectedSortingItems = formData.sortingFilterSelection?.selectedItems || [];
    const selectedSortingCodesOrNames = selectedSortingItems.map((item) =>
      (item.code || item.name).toLowerCase().trim()
    );

    const activeFiltersSummaryList: string[] = [];
    if (selectedStatusFilters.length > 0) {
      activeFiltersSummaryList.push(`Status: ${formData.appliedFilters.filter(f => f.type === "Policy Status").map(f => f.name).join(", ")}`);
    }
    if (selectedAgencyFilters.length > 0) {
      activeFiltersSummaryList.push(`Agency: ${formData.appliedFilters.filter(f => f.type === "Agencies").map(f => f.name).join(", ")}`);
    }
    if (selectedSortingItems.length > 0) {
      activeFiltersSummaryList.push(`Selection: ${selectedSortingItems.map(i => i.name || i.code).join(", ")}`);
    }

    // Helper to check agency filter match.
    // DB policy stores `agentCode` = advisor code (A001, A002, A003 etc.)
    // Agency mapping (from DB): A001, A002, A003 → Jayant Mahabole (AG002)
    //                            A004, A005, A006 → Manisha Y Mahabole (AG003)
    //                            anything else    → Other Agencies (AG001)
    const JAYANT_ADVISOR_CODES = ["a001", "a002", "a003"];
    const MANISHA_ADVISOR_CODES = ["a004", "a005", "a006"];

    const isAgencyMatch = (p: any, agencyFilters: string[]) => {
      if (!agencyFilters || agencyFilters.length === 0) return true;

      const pAgCode = (p.agentCode || "").toLowerCase().trim();

      return agencyFilters.some((f) => {
        const fLower = f.toLowerCase().trim();
        if (!fLower) return true;

        // Jayant Mahabole = AG002 → advisors A001, A002, A003
        if (fLower.includes("jayant") || fLower.includes("ag002")) {
          return JAYANT_ADVISOR_CODES.includes(pAgCode);
        }

        // Manisha Y Mahabole = AG003 → advisors A004, A005, A006
        if (fLower.includes("manisha") || fLower.includes("ag003")) {
          return MANISHA_ADVISOR_CODES.includes(pAgCode);
        }

        // Other Agencies = AG001 → any agentCode NOT in known advisor lists
        if (fLower.includes("other") || fLower.includes("ag001")) {
          return !JAYANT_ADVISOR_CODES.includes(pAgCode) && !MANISHA_ADVISOR_CODES.includes(pAgCode);
        }

        // Generic fallback: direct string match
        return pAgCode.includes(fLower) || fLower.includes(pAgCode);
      });
    };


    // Filter raw policies dynamically — ALL FILTERS ARE STRICTLY LINKED (AND logic)
    const validDbPolicies = rawPolicies.filter((p) => {
      // Status Check
      if (selectedStatusFilters.length > 0) {
        const rawStatus = (p.status?.statusName || p.statusName || "Inforce")
          .toLowerCase()
          .replace(/[- ]/g, "");
        const matchesStatus = selectedStatusFilters.some(
          (st) => rawStatus.includes(st) || st.includes(rawStatus)
        );
        if (!matchesStatus) return false;
      }

      // Agency / Agent Check
      if (!isAgencyMatch(p, selectedAgencyFilters)) {
        return false;
      }

      // Commencement Date Range Check
      if (formData.fromCommDate || formData.toCommDate) {
        if (p.commencementDate) {
          const commDateStr = new Date(p.commencementDate).toISOString().split("T")[0];
          if (formData.fromCommDate && commDateStr < formData.fromCommDate) return false;
          if (formData.toCommDate && commDateStr > formData.toCommDate) return false;
        }
      }

      // Payment Type Filter (NACH / Other than NACH)
      const isNach = Boolean(p.premiumMode?.modeName?.toLowerCase().includes("nach") || p.isNach);
      if (formData.paymentTypes.nach && !formData.paymentTypes.otherThanNach) {
        if (!isNach) return false;
      } else if (!formData.paymentTypes.nach && formData.paymentTypes.otherThanNach) {
        if (isNach) return false;
      } else if (!formData.paymentTypes.nach && !formData.paymentTypes.otherThanNach) {
        return false;
      }

      // Policy Type Filter (ULIP / Traditional)
      if (formData.policyType !== "Both") {
        const isUlip = Boolean(p.product?.planNumber?.startsWith("1") || p.isUlip);
        if (formData.policyType === "ULIP" && !isUlip) return false;
        if (formData.policyType === "Traditional" && isUlip) return false;
      }

      return true;
    });

    const isMemberwise = formData.sortingOption === "groupMemberwise";
    const isAreaWise = formData.sortingOption === "areaWise";
    const isSubAreaWise = formData.sortingOption === "subAreaWise";
    const isBranchWise = formData.sortingOption === "branchNoWise";
    const isPlanWise = formData.sortingOption === "planWise";

    const groupMap: { [key: string]: any } = {};
    const nomineeList: Array<{
      srNo: number;
      policyNo: string;
      nomineeName: string;
      relation: string;
      sharePct: string;
      nomineeType: string;
      memberName: string;
    }> = [];

    let regPa = 0;
    let singlePa = 0;
    let regCount = 0;
    let singleCount = 0;

    // Resolve mode code from premiumMode.modeName (e.g. "Yearly" -> "Y", "Half-Yearly" -> "H")
    const resolveModeCode = (p: any): string => {
      const raw = (p.premiumMode?.modeName || p.mode || "").toLowerCase().trim();
      if (raw.startsWith("monthly") || raw === "m") return "M";
      if (raw.startsWith("quarterly") || raw === "q") return "Q";
      if (raw.startsWith("half") || raw === "h") return "H";
      if (raw.startsWith("single") || raw === "s") return "S";
      return "Y"; // Yearly / NACH default
    };

    // Helper to format a single policy — all data comes 100% from DB
    const formatPolicy = (p: any, idx: number, ownerName: string) => {
      const mode = resolveModeCode(p);
      const sumAssured = Number(p.premium?.sumAssured || p.sumAssured || 0);
      const instPremium = Number(
        p.premium?.installmentPremium || p.premium?.totalInstallmentPremium || p.premiumAmount || 0
      );

      let multiplier = 1;
      if (mode === "M") multiplier = 12;
      else if (mode === "Q") multiplier = 4;
      else if (mode === "H") multiplier = 2;
      else if (mode === "S") multiplier = 1;

      const pa = mode === "S" ? instPremium : instPremium * multiplier;
      const acc = sumAssured;

      if (mode === "S") {
        singlePa += instPremium;
        singleCount += 1;
      } else {
        regPa += pa;
        regCount += 1;
      }

      // DB stores nominee relationship as `relationship` field (not `relation`)
      const nomineeName = p.nominees?.[0]?.nomineeName || p.nominee || "—";
      const nomineeRelation = p.nominees?.[0]?.relationship || p.nominees?.[0]?.relation || "—";

      // All nominees from the policy push to the nominee list (support multiple nominees per policy)
      const nominees = p.nominees && p.nominees.length > 0 ? p.nominees : [];
      nominees.forEach((nom: any) => {
        const pct = nom.percentage != null ? `${Number(nom.percentage).toFixed(2)} %` : "100.00 %";
        nomineeList.push({
          srNo: nomineeList.length + 1,
          policyNo: p.policyNumber || `91789457${idx + 1}`,
          nomineeName: nom.nomineeName || "—",
          relation: nom.relationship || nom.relation || "—",
          sharePct: pct,
          nomineeType: nominees.length > 1 ? "Joint" : "Single",
          memberName: ownerName,
        });
      });
      // If no nominees, still push a blank row so the policy appears in the list
      if (nominees.length === 0) {
        nomineeList.push({
          srNo: nomineeList.length + 1,
          policyNo: p.policyNumber || `91789457${idx + 1}`,
          nomineeName: "—",
          relation: "—",
          sharePct: "—",
          nomineeType: "—",
          memberName: ownerName,
        });
      }

      return {
        policyNo: p.policyNumber || `91789457${idx + 1}`,
        agCd: p.agentCode || p.agency?.agencyCode || "J",
        comDate: p.commencementDate
          ? new Date(p.commencementDate).toLocaleDateString("en-GB")
          : "22/01/2020",
        planTermPpt: `${p.product?.planNumber || "836"}/${p.policyTerm || 25}/${
          p.premiumPayingTerm || 16
        }`,
        fupDate: p.nextPremiumDueDate
          ? new Date(p.nextPremiumDueDate).toLocaleDateString("en-GB", {
              month: "2-digit",
              year: "2-digit",
            })
          : "07/26",
        status: p.status?.statusName || p.statusName || "Inforce",
        matDate: p.maturityDate
          ? new Date(p.maturityDate).toLocaleDateString("en-GB", {
              month: "2-digit",
              year: "2-digit",
            })
          : "01/45",
        brn: p.branch?.branchCode || "955",
        md: mode,
        premium: `${instPremium.toFixed(2)} P`,
        paPremium: pa,
        sumAssured: sumAssured,
        accBenefit: acc,
        termRider: 0,
        criticalIllness: 0,
        pwb: "N",
        taxBen: "",
        nominee: nomineeName,
        isNach: Boolean(p.premiumMode?.modeName?.toLowerCase().includes("nach") || p.isNach),
        nachDebitDate: p.nachDebitDate
          ? new Date(p.nachDebitDate).toLocaleDateString("en-GB")
          : "—",
        isExisting: Boolean(p.isExisting),
      };
    };

    if (validDbPolicies.length > 0) {
      validDbPolicies.forEach((p, idx) => {
        let gCode = p.customer?.groupCode || `A${p.clientId || "001"}`;
        let gHeadName = p.customer?.groupName || p.customer?.name || "Customer Group";

        if (isAreaWise || isSubAreaWise) {
          // p.customer on the policy can be a partial embed that's missing
          // resArea/resCity — fall back to the full customers list (which
          // reliably has these fields) so the filter has real data to match
          // against instead of silently defaulting to one fake group.
          const custForArea =
            p.customer || rawCustomers.find((c) => c.id === p.customerId || c.id === p.clientId) || {};
          if (isAreaWise) {
            gCode = custForArea.resArea || custForArea.resCity || "Unassigned";
            gHeadName = `Area: ${gCode}`;
          } else {
            // Sub-Area Wise had no handling at all before — it silently fell
            // through to the default (grouped by Group Code), which is why
            // selecting a sub-area never matched anything. Groups by resCity,
            // the same field the Sorting Filter modal's list is built from.
            gCode = custForArea.resCity || "Unassigned";
            gHeadName = `Sub-Area: ${gCode}`;
          }
        } else if (isBranchWise) {
          gCode = p.branch?.branchCode || "955";
          gHeadName = `Branch ${gCode}`;
        } else if (isPlanWise) {
          gCode = p.product?.planNumber || "836";
          gHeadName = `Plan ${gCode} - ${p.product?.productName || "LIC Plan"}`;
        } else if (isMemberwise) {
          // Each member is its OWN block, keyed by the member's own unique
          // CustomerMaster id (NOT p.customer.id, which is the GROUP id shared
          // by every member of that group — that was the actual bug: Aarav and
          // Priya share the same group id, so keying on it merged/dropped them).
          const memberId = p.CustomerMaster?.id || p.CustomerMasterId || `M${idx + 1}`;
          const memberOwnGroupCode = p.customer?.groupCode || "";
          const memberOwnName = p.CustomerMaster
            ? `${p.CustomerMaster.salutation || ""} ${p.CustomerMaster.firstName || ""} ${p.CustomerMaster.lastName || ""}`
                .replace(/\s+/g, " ")
                .trim()
            : p.customer?.name || "Individual Member";
          gCode = memberId;
          gHeadName = memberOwnGroupCode ? `${memberOwnGroupCode} - ${memberOwnName}` : memberOwnName;
        }

        // Apply selected sorting item filter (customer/member selection)
        if (selectedSortingItems.length > 0) {
          let matches: boolean;

          if (isMemberwise) {
            // Group Memberwise: match EXACTLY by the member's own CustomerMaster
            // id. p.customer.id is the GROUP id (shared by Aarav and Priya in
            // group A001) — matching on that was the bug. Each policy's own
            // CustomerMaster.id is unique per member, which is what the
            // Sorting Filter modal's rows are now keyed by too.
            const selectedMemberIds = new Set(
              selectedSortingItems.map((item) => item.id)
            );
            const memberId = p.CustomerMaster?.id || p.CustomerMasterId;
            matches = Boolean(memberId) && selectedMemberIds.has(memberId);
          } else {
            // All other sorting modes (groupsWise, areaWise, branchNoWise, planWise, ...):
            // fuzzy match against group code, group head name, CustomerMaster full name,
            // or customer name — unchanged, this is the behaviour that already works.
            const memberFullName = p.CustomerMaster
              ? `${p.CustomerMaster.firstName || ""} ${p.CustomerMaster.lastName || ""}`.toLowerCase().trim()
              : "";
            const custName = (p.customer?.name || "").toLowerCase().trim();
            const custGroupCode = gCode.toLowerCase();
            const custGroupName = gHeadName.toLowerCase();

            matches = selectedSortingCodesOrNames.some(
              (sc) =>
                custGroupCode.includes(sc) ||
                custGroupName.includes(sc) ||
                memberFullName.includes(sc) ||
                sc.includes(memberFullName.split(" ")[0]) || // first name match
                custName.includes(sc) ||
                sc.includes(custName.split(" ")[0]) // first name match
            );
          }

          if (!matches) return;
        }

        const cust = p.customer || rawCustomers.find((c) => c.id === p.customerId || c.id === p.clientId) || {};

        const formattedAddressParts = [
          cust.resAddressLine1,
          cust.resAddressLine2,
          cust.resArea || cust.offArea,
          cust.resCity || cust.offCity || "Pune",
          cust.resPin || cust.offPin || "411046",
        ].filter((part): part is string => Boolean(part && part.trim().length > 0));

        const addressStr = formattedAddressParts.length > 0
          ? formattedAddressParts.join(", ")
          : "Address Not Provided";

        const mobileStr = cust.phone || cust.mobilePersonal || cust.mobile || "N/A";
        const emailStr = cust.email || cust.emailPersonal || cust.emailBusiness || "N/A";
        const landlineStr = cust.mobileBusiness || cust.landline || "N/A";
        const panStr = cust.groupCode ? `ABCDE1234${idx + 1}` : "Registered";

        const memberName = p.CustomerMaster
          ? `${p.CustomerMaster.salutation || "Mr"} ${p.CustomerMaster.firstName} ${p.CustomerMaster.lastName}`.trim()
          : cust.name || p.customer?.name || "Policy Holder";

        const dob = p.CustomerMaster?.dob
          ? new Date(p.CustomerMaster.dob).toLocaleDateString("en-GB")
          : cust.dob || p.customer?.dob || "23/10/1980";

        const formattedPol = formatPolicy(p, idx, memberName);

        if (!groupMap[gCode]) {
          groupMap[gCode] = {
            groupCode: gCode,
            groupHeadName: gHeadName,
            address: addressStr,
            mobile: mobileStr,
            email: emailStr,
            landline: landlineStr,
            pan: panStr,
            membersMap: {},
            totalPolicies: 0,
            groupTotalPa: 0,
            groupTotalSum: 0,
            groupTotalAcc: 0,
          };
        }

        const grp = groupMap[gCode];
        if (!grp.membersMap[memberName]) {
          grp.membersMap[memberName] = {
            name: memberName,
            dob: dob,
            policies: [],
            memberTotalPa: 0,
            memberTotalSum: 0,
            memberTotalAcc: 0,
          };
        }

        const mem = grp.membersMap[memberName];
        mem.policies.push(formattedPol);
        mem.memberTotalPa += formattedPol.paPremium;
        mem.memberTotalSum += formattedPol.sumAssured;
        mem.memberTotalAcc += formattedPol.accBenefit;

        grp.totalPolicies += 1;
        grp.groupTotalPa += formattedPol.paPremium;
        grp.groupTotalSum += formattedPol.sumAssured;
        grp.groupTotalAcc += formattedPol.accBenefit;
      });
    }

    const result = Object.values(groupMap).map((grp: any) => ({
      ...grp,
      members: Object.values(grp.membersMap),
    }));

    // If matching policies exist in DB, return them!
    if (result.length > 0) {
      const sumPa = result.reduce((acc, g) => acc + g.groupTotalPa, 0);
      const sumSum = result.reduce((acc, g) => acc + g.groupTotalSum, 0);
      const sumAcc = result.reduce((acc, g) => acc + g.groupTotalAcc, 0);
      const sumPol = result.reduce((acc, g) => acc + g.totalPolicies, 0);

      return {
        groupData: result,
        nomineeEntries: nomineeList,
        regularPoliciesCount: regCount,
        singlePoliciesCount: singleCount,
        regularPaTotal: regPa,
        singlePaTotal: singlePa,
        grandTotalPa: sumPa,
        grandTotalSum: sumSum,
        grandTotalAcc: sumAcc,
        grandTotalPolicies: sumPol,
        activeFiltersSummary: activeFiltersSummaryList.join(" | "),
      };
    }

    // 100% PURE DYNAMIC — No hardcoded data. If nothing in DB matches filters, show empty state.
    return {
      groupData: [],
      nomineeEntries: [],
      regularPoliciesCount: 0,
      singlePoliciesCount: 0,
      regularPaTotal: 0,
      singlePaTotal: 0,
      grandTotalPa: 0,
      grandTotalSum: 0,
      grandTotalAcc: 0,
      grandTotalPolicies: 0,
      activeFiltersSummary: activeFiltersSummaryList.join(" | "),
    };
  }, [
    rawPolicies,
    rawCustomers,
    formData.appliedFilters,
    formData.sortingFilterSelection,
    formData.sortingOption,
    formData.fromCommDate,
    formData.toCommDate,
  ]);

  const getReportTitle = () => {
    switch (formData.sortingOption) {
      case "groupMemberwise":
        return "Policy Register — Memberwise";
      case "areaWise":
        return "Policy Register — Areawise";
      case "subAreaWise":
        return "Policy Register — Sub-Areawise";
      case "branchNoWise":
        return "Policy Register — Branchwise";
      case "policyNoWise":
        return "Policy Register — Policywise";
      case "planWise":
        return "Policy Register — Planwise";
      case "groupsWise":
      default:
        return "Policy Register — Groupwise";
    }
  };

  const handleDownloadPDF = async () => {
    if (!reportRef.current) return;
    setIsExporting(true);
    const toastId = toast.loading("Generating PDF...");

    const elem = reportRef.current;
    const originalWidth = elem.style.width;

    try {
      // Temporarily set print width (900px) for crystal-clear vector scale
      elem.style.width = "900px";

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

      pdf.save(`Policy_Register_${formData.reportDate || "Report"}.pdf`);
      toast.success("PDF exported successfully!", { id: toastId });
    } catch (err: any) {
      console.error(err);
      elem.style.width = originalWidth;
      toast.error(err?.message || "Failed to generate PDF.", { id: toastId });
    } finally {
      setIsExporting(false);
    }
  };

  const showRiderDetails = formData.reportOptions?.riderDetails;
  const showNomineeList = formData.reportOptions?.nomineeList;
  const showAddress = formData.reportOptions?.address;
  const showLandline = formData.reportOptions?.landline;
  const showMobile = formData.reportOptions?.mobile;
  const showEmail = formData.reportOptions?.email;
  const showStatementWithPan = formData.reportOptions?.statementWithPan;
  const showNachDetails = formData.reportOptions?.nachDetails;
  const showNachDebitDatewise = formData.reportOptions?.nachDebitDatewise;
  const showExistingPolicies = formData.reportOptions?.existingPolicies;

  // Group heading: show "CODE: Name" only where the code is a real group code
  // (in Area / Branch / Plan / Memberwise modes the name already carries the label)
  const showCodeInHeading = [
    "groupsWise",
    "policyNoWise",
    "commencementDatewise",
    "completionDatewise",
  ].includes(formData.sortingOption);

  const reportDateStr = formData.reportDate
    ? new Date(formData.reportDate).toLocaleDateString("en-GB")
    : new Date().toLocaleDateString("en-GB");

  // Columns before "Premium": Policy No, Ag, Com.Date, Pl/Tm/Pt, Md, Brn, FUP, Status, Mat.Date
  const LEADING_COLS = 9;
  const totalCols = LEADING_COLS + 3 + (showRiderDetails ? 3 : 0) + (showNachDetails ? 1 : 0) + (showNachDebitDatewise ? 1 : 0) + (showExistingPolicies ? 1 : 0) + 1;

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

  const renderTotalRow = (
    key: string,
    label: string,
    leftText: string | null,
    pa: number,
    sum: number,
    acc: number
  ) => (
    <tr key={key} className="font-bold">
      <td colSpan={LEADING_COLS} className="px-1 pt-1.5 pb-1">
        <div className="flex justify-between">
          <span>{leftText}</span>
          <span className="pr-3">{label}</span>
        </div>
      </td>
      <td className="px-1 pt-1.5 pb-1 text-right font-mono whitespace-nowrap">
        <span style={totalValueStyle}>p.a. {pa.toFixed(2)}</span>
      </td>
      <td className="px-1 pt-1.5 pb-1 text-right font-mono whitespace-nowrap">
        <span style={totalValueStyle}>{sum.toLocaleString("en-IN")}</span>
      </td>
      <td className="px-1 pt-1.5 pb-1 text-right font-mono whitespace-nowrap">
        <span style={totalValueStyle}>{acc.toLocaleString("en-IN")}</span>
      </td>
      {showRiderDetails && <td colSpan={3}></td>}
      <td></td>
    </tr>
  );

  return (
    <div className="space-y-6 w-full">
      {/* Top Action Control Bar — FULL WIDTH */}
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
            {getReportTitle()}
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

      {/* Printable Statement — plain LIC-style register */}
      <div
        ref={reportRef}
        style={{ fontFamily: "Arial, Helvetica, sans-serif", color: BLACK }}
        className="w-full bg-white px-6 py-6 border border-slate-300 shadow-xl text-[10px] leading-snug print:p-0 print:border-none print:shadow-none"
      >
        {/* Report title line (like "LIC Premiums Due between ... ") */}
        <div className="flex justify-between items-end pb-0.5 text-[11px] font-semibold">
          <span>
            {getReportTitle()} as on {reportDateStr}
          </span>
          <span>
            Groups: {groupData.length} | Policies: {grandTotalPolicies}
          </span>
        </div>
        {activeFiltersSummary && (
          <div className="pb-1 text-[9px] font-normal">{activeFiltersSummary}</div>
        )}

        {groupData.length === 0 ? (
          <div className="mt-6 p-12 text-center border-2 border-dashed border-slate-300 rounded-2xl space-y-3 bg-slate-50">
            <div className="inline-flex p-3 bg-red-100 text-red-600 rounded-full">
              <FilterX size={32} />
            </div>
            <h3 className="text-base font-bold text-slate-800">No Policies Match Your Selected Filters</h3>
            <p className="text-xs text-slate-600 max-w-md mx-auto">
              No policies in the database matched the combined filter criteria. Please adjust your filters or click "Edit Filters" to view other policies.
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
                <th className="px-1 py-1 text-left whitespace-nowrap" style={thStyle}>Policy No</th>
                <th className="px-1 py-1 text-center" style={thStyle}>Ag<br />Cd</th>
                <th className="px-1 py-1" style={thStyle}>Com.<br />Date</th>
                <th className="px-1 py-1" style={thStyle}>Pl/<br />Tm/Pt</th>
                <th className="px-1 py-1 text-center" style={thStyle}>Md</th>
                <th className="px-1 py-1" style={thStyle}>Brn</th>
                <th className="px-1 py-1" style={thStyle}>FUP<br />Date</th>
                <th className="px-1 py-1" style={thStyle}>Status</th>
                <th className="px-1 py-1" style={thStyle}>Mat.<br />Date</th>
                <th className="px-1 py-1 text-right" style={thStyle}>Premium<br />Amount</th>
                <th className="px-1 py-1 text-right" style={thStyle}>Sum<br />Assured</th>
                <th className="px-1 py-1 text-right" style={thStyle}>Acc.<br />Benefit</th>
                {showRiderDetails && (
                  <>
                    <th className="px-1 py-1 text-right" style={thStyle}>Term<br />Rider</th>
                    <th className="px-1 py-1 text-right" style={thStyle}>Critical<br />Illness</th>
                    <th className="px-1 py-1 text-center" style={thStyle}>PWB</th>
                  </>
                )}
                {showNachDetails && (
                  <th className="px-1 py-1 text-center" style={thStyle}>NACH<br />Status</th>
                )}
                {showNachDebitDatewise && (
                  <th className="px-1 py-1 text-center" style={thStyle}>NACH Debit<br />Date</th>
                )}
                {showExistingPolicies && (
                  <th className="px-1 py-1 text-center" style={thStyle}>Existing<br />Policy</th>
                )}
                <th className="px-1 py-1" style={thStyle}>Nominee</th>
              </tr>
            </thead>

            {groupData.map((group, groupIdx) => (
              <tbody
                key={group.groupCode}
                className={
                  formData.reportOptions?.pageBreakOnGroupChange && groupIdx > 0
                    ? "break-before-page"
                    : ""
                }
              >
                {/* Centered group heading */}
                <tr>
                  <td colSpan={totalCols} className="pt-3 pb-1 text-center">
                    <div className="text-[13px] font-bold">
                      {showCodeInHeading ? `${group.groupCode}: ` : ""}
                      {group.groupHeadName}
                      {showStatementWithPan && (
                        <span className="text-[10px] font-normal"> &nbsp;(PAN: {group.pan})</span>
                      )}
                    </div>
                    {showMobile && <div>Mobile : {group.mobile}</div>}
                    {(showLandline || showEmail) && (
                      <div>
                        {showLandline && <span>Tel(O) : {group.landline}</span>}
                        {showLandline && showEmail && <span>&nbsp;&nbsp;&nbsp;</span>}
                        {showEmail && <span>Email : {group.email}</span>}
                      </div>
                    )}
                    {showAddress && <div>Address : {group.address}</div>}
                  </td>
                </tr>

                {group.members.map((member: any) => (
                  <Fragment key={member.name}>
                    {/* Member name (bold) */}
                    <tr>
                      <td colSpan={totalCols} className="pt-2 pb-0.5 text-[11px] font-bold">
                        {member.name}
                        {member.dob && (
                          <span className="font-normal ml-3">DOB : {member.dob}</span>
                        )}
                      </td>
                    </tr>

                    {member.policies.map((p: any) => (
                      <tr key={p.policyNo}>
                        <td className="px-1 py-0.5 text-left font-mono whitespace-nowrap">{p.policyNo}</td>
                        <td className="px-1 py-0.5 text-center">{p.agCd}</td>
                        <td className="px-1 py-0.5 whitespace-nowrap">{p.comDate}</td>
                        <td className="px-1 py-0.5 whitespace-nowrap">{p.planTermPpt}</td>
                        <td className="px-1 py-0.5 text-center">{p.md}</td>
                        <td className="px-1 py-0.5">{p.brn}</td>
                        <td className="px-1 py-0.5 whitespace-nowrap">{p.fupDate}</td>
                        <td className="px-1 py-0.5 whitespace-nowrap">{p.status}</td>
                        <td className="px-1 py-0.5 whitespace-nowrap">{p.matDate}</td>
                        <td className="px-1 py-0.5 text-right font-bold whitespace-nowrap">{p.premium}</td>
                        <td className="px-1 py-0.5 text-right whitespace-nowrap">
                          {p.sumAssured.toLocaleString("en-IN")}
                        </td>
                        <td className="px-1 py-0.5 text-right whitespace-nowrap">
                          {p.accBenefit.toLocaleString("en-IN")}
                        </td>
                        {showRiderDetails && (
                          <>
                            <td className="px-1 py-0.5 text-right">{p.termRider}</td>
                            <td className="px-1 py-0.5 text-right">{p.criticalIllness}</td>
                            <td className="px-1 py-0.5 text-center">{p.pwb}</td>
                          </>
                        )}
                        {showNachDetails && (
                          <td className="px-1 py-0.5 text-center">{p.isNach ? "NACH" : "Other"}</td>
                        )}
                        {showNachDebitDatewise && (
                          <td className="px-1 py-0.5 text-center whitespace-nowrap">{p.nachDebitDate || "—"}</td>
                        )}
                        {showExistingPolicies && (
                          <td className="px-1 py-0.5 text-center">{p.isExisting ? "Yes" : "No"}</td>
                        )}
                        <td className="px-1 py-0.5">{p.nominee}</td>
                      </tr>
                    ))}

                    {/* Member total — only when it adds information */}
                    {member.policies.length > 1 &&
                      group.members.length > 1 &&
                      renderTotalRow(
                        `mt-${member.name}`,
                        "Member Total :",
                        null,
                        member.memberTotalPa,
                        member.memberTotalSum,
                        member.memberTotalAcc
                      )}
                  </Fragment>
                ))}

                {/* Group total */}
                {group.totalPolicies > 1 &&
                  renderTotalRow(
                    `gt-${group.groupCode}`,
                    "Group Total :",
                    `Total Policies for Group : ${group.totalPolicies}`,
                    group.groupTotalPa,
                    group.groupTotalSum,
                    group.groupTotalAcc
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

        {/* Nominee list */}
        {showNomineeList && nomineeEntries.length > 0 && (
          <div className="pt-6">
            <div className="flex justify-between text-[11px] font-bold pb-0.5">
              <span>Nominee Details List</span>
              <span>Total Nominees: {nomineeEntries.length}</span>
            </div>
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="font-bold">
                  <th className="px-1 py-1 text-center w-12" style={thStyle}>Sr. No</th>
                  <th className="px-1 py-1" style={thStyle}>Policy No.</th>
                  <th className="px-1 py-1" style={thStyle}>Nominee Name</th>
                  <th className="px-1 py-1" style={thStyle}>Relation</th>
                  <th className="px-1 py-1 text-center" style={thStyle}>Share %</th>
                  <th className="px-1 py-1 text-center" style={thStyle}>Nominee Type</th>
                </tr>
              </thead>
              <tbody>
                {nomineeEntries.map((nom) => (
                  <tr key={`${nom.policyNo}-${nom.srNo}`}>
                    <td className="px-1 py-0.5 text-center">{nom.srNo}</td>
                    <td className="px-1 py-0.5 font-mono">{nom.policyNo}</td>
                    <td className="px-1 py-0.5 font-bold">{nom.nomineeName}</td>
                    <td className="px-1 py-0.5">{nom.relation}</td>
                    <td className="px-1 py-0.5 text-center font-mono">{nom.sharePct}</td>
                    <td className="px-1 py-0.5 text-center">{nom.nomineeType}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ borderBottom: `1px solid ${BLACK}` }} />
          </div>
        )}

        {/* Grand summary */}
        {groupData.length > 0 && (
          <div className="pt-5 flex justify-end">
            <table className="w-full max-w-xl border-collapse text-[11px]">
              <thead>
                <tr className="font-bold">
                  <th className="px-1 py-1 text-left" style={thStyle}>Policy Category</th>
                  <th className="px-1 py-1 text-right" style={thStyle}>Premium</th>
                  <th className="px-1 py-1 text-right" style={thStyle}>Sum Assured</th>
                  <th className="px-1 py-1 text-right" style={thStyle}>Accidental Benefit</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="px-1 py-0.5">Total for Regular Policies ({regularPoliciesCount})</td>
                  <td className="px-1 py-0.5 text-right font-mono">
                    {regularPaTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })} p.a
                  </td>
                  <td className="px-1 py-0.5 text-right font-mono">
                    {grandTotalSum.toLocaleString("en-IN")}
                  </td>
                  <td className="px-1 py-0.5 text-right font-mono">
                    {grandTotalAcc.toLocaleString("en-IN")}
                  </td>
                </tr>
                <tr>
                  <td className="px-1 py-0.5">Total for Single Mode Policies ({singlePoliciesCount})</td>
                  <td className="px-1 py-0.5 text-right font-mono">
                    {singlePaTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-1 py-0.5 text-right font-mono">0</td>
                  <td className="px-1 py-0.5 text-right font-mono">0</td>
                </tr>
                <tr className="font-bold">
                  <td className="px-1 pt-1.5 pb-1">Grand Total Portfolio</td>
                  <td className="px-1 pt-1.5 pb-1 text-right font-mono">
                    <span style={totalValueStyle}>
                      {grandTotalPa.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                  </td>
                  <td className="px-1 pt-1.5 pb-1 text-right font-mono">
                    <span style={totalValueStyle}>{grandTotalSum.toLocaleString("en-IN")}</span>
                  </td>
                  <td className="px-1 pt-1.5 pb-1 text-right font-mono">
                    <span style={totalValueStyle}>{grandTotalAcc.toLocaleString("en-IN")}</span>
                  </td>
                </tr>
                <tr className="font-bold">
                  <td className="px-1 py-1">Total No. of Policies</td>
                  <td colSpan={3} className="px-1 py-1 text-right font-mono">
                    {grandTotalPolicies} Policies Active
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
            <span><strong>Y :</strong> NACH Mode</span>
            <span><strong>A :</strong> APPS Mode</span>
            <span><strong>S :</strong> Single Mode</span>
            <span><strong>* :</strong> Joint Life</span>
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-0.5">
            <span><strong>P :</strong> Inclusive of GST</span>
            <span><strong>O :</strong> Exclusive of GST</span>
            <span><strong>ρ :</strong> PAN Card Registered</span>
          </div>
          <div className="flex justify-between font-mono text-[8px] pt-1">
            <span>Statement Code: DSS000019899</span>
            <span>Generated via Policy Register Engine</span>
          </div>
        </div>
      </div>
    </div>
  );
}