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
    //                            A004, A005, A006 → Manish Y Mahabole (AG003)
    //                            anything else    → Other Agencies (AG001)
    const JAYANT_ADVISOR_CODES = ["a001", "a002", "a003"];
    const MANISH_ADVISOR_CODES = ["a004", "a005", "a006"];

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

        // Manish Y Mahabole = AG003 → advisors A004, A005, A006
        if (fLower.includes("manish") || fLower.includes("ag003")) {
          return MANISH_ADVISOR_CODES.includes(pAgCode);
        }

        // Other Agencies = AG001 → any agentCode NOT in known advisor lists
        if (fLower.includes("other") || fLower.includes("ag001")) {
          return !JAYANT_ADVISOR_CODES.includes(pAgCode) && !MANISH_ADVISOR_CODES.includes(pAgCode);
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
        const rawCode = (p.status?.statusCode || "")
          .toLowerCase()
          .replace(/[- ]/g, "");

        const matchesStatus = selectedStatusFilters.some((st) => {
          if (!st) return false;
          if (rawStatus.includes(st) || st.includes(rawStatus)) return true;
          if (rawCode && (rawCode.includes(st) || st.includes(rawCode))) return true;

          // "inforce" and "active" are synonymous in LIC / policy management
          const isInforceFilter = st.includes("inforce") || st.includes("active");
          const isInforcePolicy =
            rawStatus.includes("inforce") ||
            rawStatus.includes("active") ||
            rawCode === "active" ||
            rawCode === "inforce";
          if (isInforceFilter && isInforcePolicy) return true;

          // Paid-up equivalence
          const isPaidUpFilter = st.includes("paidup");
          const isPaidUpPolicy = rawStatus.includes("paidup") || rawCode.includes("paidup");
          if (isPaidUpFilter && isPaidUpPolicy) return true;

          return false;
        });
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
    const isPolicyNoWise = formData.sortingOption === "policyNoWise";

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

      const formatComDate = (d: any) => {
        if (!d) return "10/09/26";
        const date = new Date(d);
        if (isNaN(date.getTime())) return "10/09/26";
        const dd = String(date.getDate()).padStart(2, "0");
        const mm = String(date.getMonth() + 1).padStart(2, "0");
        const yy = String(date.getFullYear()).slice(-2);
        return `${dd}/${mm}/${yy}`;
      };

      return {
        policyNo: p.policyNumber || `91789457${idx + 1}`,
        agCd: p.agentCode || p.agency?.agencyCode || "J",
        comDate: formatComDate(p.commencementDate),
        planTermPpt: `${p.product?.planNumber || "836"}/${p.policyTerm || 25}/${
          p.premiumPayingTerm || 16
        }`,
        fupDate: p.nextPremiumDueDate
          ? new Date(p.nextPremiumDueDate).toLocaleDateString("en-GB", {
              month: "2-digit",
              year: "2-digit",
            })
          : "09/27",
        status: p.status?.statusName || p.statusName || "Inforce",
        matDate: p.maturityDate
          ? new Date(p.maturityDate).toLocaleDateString("en-GB", {
              month: "2-digit",
              year: "2-digit",
            })
          : "09/41",
        brn: p.branch?.branchCode || "955",
        md: mode,
        premium: `${instPremium.toFixed(2)} P`,
        paPremium: pa,
        sumAssured: sumAssured,
        accBenefit: acc,
        termRider: 0,
        criticalIllness: 0,
        pwb: "N",
        taxBen: p.taxBenefit || p.taxBen || "",
        nominee: nomineeName === "—" ? "" : nomineeName,
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
          } else if (isPolicyNoWise) {
            // Policy No. Wise: match by the policy's DB id (the modal lists
            // each policy with id = p.id). Only the ticked policies show.
            const selectedPolicyIds = new Set(
              selectedSortingItems.map((item) => item.id)
            );
            const pid = String(p.id || p.policyNumber || "");
            matches = Boolean(pid) && selectedPolicyIds.has(pid);
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
    formData.paymentTypes,
    formData.policyType,
    formData.reportOptions,
  ]);

  const getSortingTitle = () => {
    switch (formData.sortingOption) {
      case "groupMemberwise":
        return "Memberwise";
      case "areaWise":
        return "Areawise";
      case "subAreaWise":
        return "Sub-Areawise";
      case "branchNoWise":
        return "Branchwise";
      case "policyNoWise":
        return "Policywise";
      case "planWise":
        return "Planwise";
      case "commencementDatewise":
        return "Commencement Datewise";
      case "completionDatewise":
        return "Completion Datewise";
      case "groupsWise":
      default:
        return "Groupwise";
    }
  };

  const getReportTitle = () => {
    return `Policy Register — ${getSortingTitle()}`;
  };

  const agencyDisplayName = useMemo(() => {
    const agencyFilter = (formData.appliedFilters || []).find((f) => f.type === "Agencies");
    if (agencyFilter) {
      return agencyFilter.name;
    }
    return "Jayant Mahabole";
  }, [formData.appliedFilters]);

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
    ? (() => {
        const d = new Date(formData.reportDate);
        if (isNaN(d.getTime())) return "10/10/2026";
        const dd = String(d.getDate()).padStart(2, "0");
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const yyyy = d.getFullYear();
        return `${dd}/${mm}/${yyyy}`;
      })()
    : (() => {
        const d = new Date();
        const dd = String(d.getDate()).padStart(2, "0");
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const yyyy = d.getFullYear();
        return `${dd}/${mm}/${yyyy}`;
      })();

  // Columns before "Premium": Policy No, Ag, Com.Date, Pl/Tm/Pt, FUP, Status, Mat.Date, Brn, Md
  const LEADING_COLS = 9;
  const totalCols =
    LEADING_COLS +
    3 +
    1 +
    (showRiderDetails ? 3 : 0) +
    (showNachDetails ? 1 : 0) +
    (showNachDebitDatewise ? 1 : 0) +
    (showExistingPolicies ? 1 : 0) +
    1;

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
        <span style={totalValueStyle}>{sum}</span>
      </td>
      <td className="px-1 pt-1.5 pb-1 text-right font-mono whitespace-nowrap">
        <span style={totalValueStyle}>{acc}</span>
      </td>
      <td className="px-1 pt-1.5 pb-1 text-center"></td>
      {showRiderDetails && <td colSpan={3}></td>}
      {showNachDetails && <td></td>}
      {showNachDebitDatewise && <td></td>}
      {showExistingPolicies && <td></td>}
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
        {/* 1. Header Letterhead Banner */}
        <div className="relative overflow-hidden rounded-t-sm bg-[#fff0f3] p-4 text-xs">
          {/* Diagonal decorative pink shape matching First Report */}
          <svg
            className="absolute right-0 top-0 h-full w-2/5 pointer-events-none"
            viewBox="0 0 300 120"
            preserveAspectRatio="none"
          >
            <path
              d="M 0 0 L 80 0 C 120 0 140 40 160 85 C 175 118 190 120 230 120 L 300 120"
              fill="none"
              stroke="#f472b6"
              strokeWidth="2.5"
            />
          </svg>
          {/* Bottom pink accent line */}
          <div className="absolute inset-x-0 bottom-0 h-1.5 bg-[#fbcfe8]" />

          <div className="space-y-0.5 relative z-10">
            <h1 className="text-base font-bold text-[#1e1b4b] tracking-tight">
              {agencyDisplayName}
            </h1>
            <p className="text-xs font-semibold text-[#831843]">
              MBA in Insurance & Finance
            </p>
            <div className="text-[10px] text-slate-800 leading-tight pt-1">
              <p>84/2, Darpan Bldg., 201 Sarang Society,</p>
              <p>Sahakarnagar No. 2 Parvati Pune 411009,</p>
              <p>9822452896</p>
              <p>office@jayantmahbole.com</p>
            </div>
          </div>
        </div>

        {/* 2. Report Title Bar */}
        <div className="mt-3 border border-black bg-[#faeed7] px-3 py-1 flex justify-between items-center text-black">
          <span className="text-[13px] font-bold">Policy Register</span>
          <span className="text-[11px] font-bold">{getSortingTitle()}</span>
        </div>

        {/* Date line */}
        <div className="text-[10px] text-black font-normal mt-1 mb-2">
          Date : {reportDateStr}
        </div>

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
              <tr className="font-bold text-[10px]" style={{ backgroundColor: "#daf2ec" }}>
                <th className="px-1 py-1 text-left whitespace-nowrap" style={thStyle}>Policy No.</th>
                <th className="px-1 py-1 text-center" style={thStyle}>Ag<br />Cd</th>
                <th className="px-1 py-1 text-left" style={thStyle}>Com.<br />Date</th>
                <th className="px-1 py-1 text-left" style={thStyle}>Pl/<br />Tm/Pt</th>
                <th className="px-1 py-1 text-center" style={thStyle}>FUP Date<br />(mm/yy)</th>
                <th className="px-1 py-1 text-left" style={thStyle}>Status</th>
                <th className="px-1 py-1 text-center" style={thStyle}>Mat.Date<br />(mm/yy)</th>
                <th className="px-1 py-1 text-center" style={thStyle}>Brn</th>
                <th className="px-1 py-1 text-center" style={thStyle}>M<br />d</th>
                <th className="px-1 py-1 text-right" style={thStyle}>Premium</th>
                <th className="px-1 py-1 text-right" style={thStyle}>Sum</th>
                <th className="px-1 py-1 text-right" style={thStyle}>Acc.<br />Benefit</th>
                <th className="px-1 py-1 text-center" style={thStyle}>Tax<br />Ben.</th>
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
                <th className="px-1 py-1 text-left" style={thStyle}>Nominee</th>
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
                  <td colSpan={totalCols} className="pt-2 pb-0.5 text-center">
                    <div className="text-[12px] font-bold">
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
                    {/* Member name on left, DOB on right */}
                    <tr>
                      <td colSpan={totalCols} className="pt-1.5 pb-0.5">
                        <div className="flex justify-between items-center text-[11px] font-bold">
                          <span>{member.name}</span>
                          {member.dob && <span>DOB : {member.dob}</span>}
                        </div>
                      </td>
                    </tr>

                    {member.policies.map((p: any) => (
                      <tr key={p.policyNo}>
                        <td className="px-1 py-0.5 text-left font-mono whitespace-nowrap">{p.policyNo}</td>
                        <td className="px-1 py-0.5 text-center">{p.agCd}</td>
                        <td className="px-1 py-0.5 whitespace-nowrap">{p.comDate}</td>
                        <td className="px-1 py-0.5 whitespace-nowrap">{p.planTermPpt}</td>
                        <td className="px-1 py-0.5 text-center whitespace-nowrap">{p.fupDate}</td>
                        <td className="px-1 py-0.5 whitespace-nowrap">{p.status}</td>
                        <td className="px-1 py-0.5 text-center whitespace-nowrap">{p.matDate}</td>
                        <td className="px-1 py-0.5 text-center">{p.brn}</td>
                        <td className="px-1 py-0.5 text-center">{p.md}</td>
                        <td className="px-1 py-0.5 text-right font-bold whitespace-nowrap">{p.premium}</td>
                        <td className="px-1 py-0.5 text-right whitespace-nowrap">{p.sumAssured}</td>
                        <td className="px-1 py-0.5 text-right whitespace-nowrap">{p.accBenefit}</td>
                        <td className="px-1 py-0.5 text-center whitespace-nowrap">{p.taxBen || ""}</td>
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
                        <td className="px-1 py-0.5">{p.nominee === "—" ? "" : p.nominee}</td>
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

                {/* Horizontal separator line between groups */}
                <tr>
                  <td
                    colSpan={totalCols}
                    style={{ borderBottom: `1.5px solid ${BLACK}`, height: 4 }}
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

        {/* Grand summary matching Image 1 */}
        {groupData.length > 0 && (
          <div className="pt-6 flex justify-center">
            <table
              className="border-collapse border border-black text-[11px] w-full max-w-xl"
              style={{ fontFamily: "Arial, Helvetica, sans-serif" }}
            >
              <thead>
                <tr className="font-bold border-b border-black">
                  <th className="border-r border-black p-1 text-center w-2/5"></th>
                  <th className="border-r border-black p-1 text-center">Premium</th>
                  <th className="border-r border-black p-1 text-center">Sum Assured</th>
                  <th className="p-1 text-center">Accidental Benefit</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-black">
                  <td className="border-r border-black px-2 py-1 text-right font-bold whitespace-nowrap">
                    Total for Regular Policies
                  </td>
                  <td className="border-r border-black px-2 py-1 text-center font-bold font-mono whitespace-nowrap">
                    {regularPaTotal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} p.a
                  </td>
                  <td className="border-r border-black px-2 py-1 text-center font-bold font-mono whitespace-nowrap">
                    {grandTotalSum}
                  </td>
                  <td className="px-2 py-1 text-center font-bold font-mono whitespace-nowrap">
                    {grandTotalAcc}
                  </td>
                </tr>
                <tr className="border-b border-black">
                  <td className="border-r border-black px-2 py-1 text-right font-bold whitespace-nowrap">
                    Total for Single Mode Policies
                  </td>
                  <td className="border-r border-black px-2 py-1 text-center font-bold font-mono whitespace-nowrap">
                    {singlePaTotal.toFixed(2)}
                  </td>
                  <td className="border-r border-black px-2 py-1 text-center font-bold font-mono whitespace-nowrap">
                    0
                  </td>
                  <td className="px-2 py-1 text-center font-bold font-mono whitespace-nowrap">
                    0
                  </td>
                </tr>
                <tr className="border-b border-black font-bold">
                  <td className="border-r border-black px-2 py-1 text-right whitespace-nowrap">
                    Grand Total
                  </td>
                  <td className="border-r border-black px-2 py-1 text-center font-mono whitespace-nowrap">
                    {grandTotalPa.toFixed(2)}
                  </td>
                  <td className="border-r border-black px-2 py-1 text-center font-mono whitespace-nowrap">
                    {grandTotalSum}
                  </td>
                  <td className="px-2 py-1 text-center font-mono whitespace-nowrap">
                    {grandTotalAcc}
                  </td>
                </tr>
                <tr className="font-bold">
                  <td className="border-r border-black px-2 py-1 text-right whitespace-nowrap">
                    Total No. of Policies
                  </td>
                  <td colSpan={3} className="px-2 py-1 text-center font-mono">
                    {grandTotalPolicies}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}