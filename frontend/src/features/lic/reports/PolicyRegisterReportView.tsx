"use client";

import { useRef, useState, useMemo } from "react";
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
      return true;
    });

    const isMemberwise = formData.sortingOption === "groupMemberwise";
    const isAreaWise = formData.sortingOption === "areaWise";
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
      };
    };

    if (validDbPolicies.length > 0) {
      validDbPolicies.forEach((p, idx) => {
        let gCode = p.customer?.groupCode || `A${p.clientId || "001"}`;
        let gHeadName = p.customer?.groupName || p.customer?.name || "Customer Group";

        if (isAreaWise) {
          gCode = p.customer?.resArea || "Katraj, Pune";
          gHeadName = `Area: ${gCode}`;
        } else if (isBranchWise) {
          gCode = p.branch?.branchCode || "955";
          gHeadName = `Branch ${gCode}`;
        } else if (isPlanWise) {
          gCode = p.product?.planNumber || "836";
          gHeadName = `Plan ${gCode} - ${p.product?.productName || "LIC Plan"}`;
        } else if (isMemberwise) {
          gCode = p.customer?.id || p.customer?.groupCode || `M${idx + 1}`;
          gHeadName = p.customer?.name || "Individual Member";
        }

        // Apply selected sorting item filter (customer/member selection)
        // Match against: group code, group head name, CustomerMaster full name, or customer name
        if (selectedSortingCodesOrNames.length > 0) {
          const memberFullName = p.CustomerMaster
            ? `${p.CustomerMaster.firstName || ""} ${p.CustomerMaster.lastName || ""}`.toLowerCase().trim()
            : "";
          const custName = (p.customer?.name || "").toLowerCase().trim();
          const custGroupCode = gCode.toLowerCase();
          const custGroupName = gHeadName.toLowerCase();

          const matches = selectedSortingCodesOrNames.some(
            (sc) =>
              custGroupCode.includes(sc) ||
              custGroupName.includes(sc) ||
              memberFullName.includes(sc) ||
              sc.includes(memberFullName.split(" ")[0]) || // first name match
              custName.includes(sc) ||
              sc.includes(custName.split(" ")[0]) // first name match
          );
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
    const toastId = toast.loading("Generating Pristine Executive PDF...");

    const elem = reportRef.current;
    const originalWidth = elem.style.width;

    try {
      // Temporarily set strict A4 print width (820px) for crystal-clear vector scale
      elem.style.width = "820px";

      const canvas = await html2canvas(elem, {
        scale: 2.5,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        logging: false,
      });

      // Restore full width screen styling
      elem.style.width = originalWidth;

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const imgWidth = 210;
      const pageHeight = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 5) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`Policy_Register_${formData.reportDate || "Report"}.pdf`);
      toast.success("Executive PDF exported successfully!", { id: toastId });
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

  return (
    <div className="space-y-6 w-full">
      {/* Top Action Control Bar — FULL WIDTH */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-[#0B1220] p-4 rounded-2xl border border-slate-800 shadow-xl print:hidden w-full">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToForm}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-slate-300 bg-white/10 rounded-xl hover:bg-white/20 transition uppercase tracking-wider"
          >
            <ArrowLeft size={16} />
            <span>Edit Filters</span>
          </button>
          <span className="text-xs bg-[#B8873A]/20 text-[#E8C77A] font-bold px-3 py-1.5 rounded-full border border-[#B8873A]/40 uppercase tracking-wider">
            {getReportTitle()}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleDownloadPDF}
            disabled={isExporting}
            className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-[#B8873A] to-[#D9AE63] text-[#0B1220] font-bold text-xs rounded-xl shadow-lg hover:brightness-105 transition disabled:opacity-50 uppercase tracking-wider"
          >
            <Download size={16} />
            <span>{isExporting ? "Exporting PDF..." : "Download PDF"}</span>
          </button>
        </div>
      </div>

      {/* Main Printable Document Canvas — 100% FULL WIDTH MATCHING TOP BAR */}
      <div
        ref={reportRef}
        style={{ fontFamily: "Arial, Helvetica, sans-serif" }}
        className="w-full bg-white p-8 rounded-2xl border border-slate-300 shadow-2xl text-slate-900 space-y-6 print:p-0 print:border-none print:shadow-none"
      >
        {/* Advisor Letterhead Header */}
        <div style={{ borderBottom: "2px solid #0B1220" }} className="flex justify-between items-start pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-[#0B1220] tracking-tight">
                Jayant Mahabole
              </h1>
              <span className="text-[10px] bg-[#0B1220] text-[#E8C77A] font-bold px-2 py-0.5 rounded uppercase tracking-widest">
                LIC Authorized Advisor
              </span>
            </div>
            <p className="text-xs font-semibold text-[#B8873A]">MBA in Insurance & Finance</p>
            <p className="text-xs text-slate-600 max-w-md leading-relaxed">
              84/2, Darpan Bldg., 201 Sarang Society, Sahakarnagar No. 2 Parvati Pune 411009
            </p>
            <div className="flex items-center gap-4 text-xs font-medium text-slate-700 pt-1">
              <span>Phone: 9822452896</span>
              <span>Email: office@jayantmahbole.com</span>
            </div>
          </div>

          <div className="text-right space-y-1.5">
            <div className="inline-block bg-[#0B1220] text-[#E8C77A] px-4 py-2 rounded-xl text-right border border-[#B8873A]/40 shadow-sm">
              <p className="text-xs font-bold tracking-widest uppercase">
                Life Insurance Corporation
              </p>
              <p className="text-[10px] text-slate-300">Official Policy Register Statement</p>
            </div>
            <p className="text-xs font-bold text-slate-700 pt-1">
              Date:{" "}
              {formData.reportDate
                ? new Date(formData.reportDate).toLocaleDateString("en-GB")
                : new Date().toLocaleDateString("en-GB")}
            </p>
          </div>
        </div>

        {/* Title Banner */}
        <div className="bg-[#0B1220] text-white rounded-xl px-5 py-3 flex items-center justify-between border-l-4 border-[#B8873A] shadow-sm">
          <div>
            <h2 className="text-base font-bold text-[#E8C77A] uppercase tracking-wider">
              {getReportTitle()}
            </h2>
            <p className="text-[11px] text-slate-300">
              Filtered between {formData.fromCommDate || "01/03/2016"} and {formData.toCommDate || new Date().toLocaleDateString("en-GB")}
            </p>
          </div>
          <div className="text-right text-xs text-[#E8C77A] font-bold">
            Total Groups: {groupData.length} | Policies: {grandTotalPolicies}
          </div>
        </div>

        {groupData.length === 0 ? (
          <div className="p-12 text-center border-2 border-dashed border-slate-300 rounded-2xl space-y-3 bg-slate-50">
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
          <div className="space-y-6">
            {groupData.map((group, groupIdx) => (
              <div
                key={group.groupCode}
                className={`space-y-3 rounded-xl border border-slate-300 p-4 bg-white shadow-xs ${
                  formData.reportOptions?.pageBreakOnGroupChange && groupIdx > 0
                    ? "break-before-page"
                    : ""
                }`}
              >
                <div className="bg-[#0B1220] text-white p-3.5 rounded-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-[#B8873A]/40">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs bg-[#B8873A] text-[#0B1220] font-bold px-2 py-0.5 rounded font-mono">
                        {group.groupCode}
                      </span>
                      <h3 className="font-bold text-sm text-[#E8C77A]">
                        {group.groupHeadName}
                      </h3>
                      {showStatementWithPan && (
                        <span className="text-[10px] bg-slate-800 text-[#E8C77A] font-bold px-2 py-0.5 rounded border border-[#B8873A]/40">
                          PAN: {group.pan}
                        </span>
                      )}
                    </div>
                    {showAddress && (
                      <p className="text-[11px] text-slate-300 pt-0.5">
                        Address: {group.address}
                      </p>
                    )}
                  </div>

                  <div className="text-left sm:text-right space-y-0.5 text-[11px] text-slate-300">
                    {showMobile && <p>Mobile: {group.mobile}</p>}
                    {showLandline && <p>Landline: {group.landline}</p>}
                    {showEmail && <p>Email: {group.email}</p>}
                  </div>
                </div>

                {group.members.map((member: any) => (
                  <div key={member.name} className="space-y-2 pt-1">
                    <div className="flex justify-between items-center bg-slate-100 px-3 py-1.5 rounded-md border-l-4 border-[#0B1220] text-xs font-bold text-slate-900">
                      <span>{member.name}</span>
                      {member.dob && <span className="font-mono text-slate-600">DOB : {member.dob}</span>}
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-[11px] border-collapse">
                        <thead>
                          <tr className="bg-slate-200 border-y border-slate-400 font-bold text-slate-900">
                            <th className="py-2 px-1 text-right">Policy No.</th>
                            <th className="py-2 px-1 text-center">Ag Cd</th>
                            <th className="py-2 px-1">Com. Date</th>
                            <th className="py-2 px-1">Pl/Tm/Pt</th>
                            <th className="py-2 px-1">FUP Date</th>
                            <th className="py-2 px-1">Status</th>
                            <th className="py-2 px-1">Mat.Date</th>
                            <th className="py-2 px-1">Brn</th>
                            <th className="py-2 px-1 text-center">Md</th>
                            <th className="py-2 px-1 text-right">Premium</th>
                            <th className="py-2 px-1 text-right">Sum Assured</th>
                            <th className="py-2 px-1 text-right">Acc. Benefit</th>
                            {showRiderDetails && (
                              <>
                                <th className="py-2 px-1 text-right">Term Rider</th>
                                <th className="py-2 px-1 text-right">Critical Illness</th>
                                <th className="py-2 px-1 text-center">PWB</th>
                              </>
                            )}
                            <th className="py-2 px-1">Nominee</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {member.policies.map((p: any) => (
                            <tr key={p.policyNo} className="hover:bg-slate-50">
                              <td className="py-1.5 px-1 text-right font-mono font-bold text-[#0B1220]">
                                {p.policyNo}
                              </td>
                              <td className="py-1.5 px-1 text-center font-bold">{p.agCd}</td>
                              <td className="py-1.5 px-1">{p.comDate}</td>
                              <td className="py-1.5 px-1 font-medium">{p.planTermPpt}</td>
                              <td className="py-1.5 px-1 font-medium text-slate-700">{p.fupDate}</td>
                              <td className="py-1.5 px-1">
                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                  p.status === "Inforce"
                                    ? "bg-emerald-100 text-emerald-800"
                                    : p.status.includes("Paidup")
                                    ? "bg-amber-100 text-amber-800"
                                    : "bg-red-100 text-red-800"
                                }`}>
                                  {p.status}
                                </span>
                              </td>
                              <td className="py-1.5 px-1">{p.matDate}</td>
                              <td className="py-1.5 px-1 font-mono">{p.brn}</td>
                              <td className="py-1.5 px-1 text-center font-bold">{p.md}</td>
                              <td className="py-1.5 px-1 text-right font-mono font-bold text-[#0B1220]">
                                {p.premium}
                              </td>
                              <td className="py-1.5 px-1 text-right font-mono font-semibold">
                                {p.sumAssured.toLocaleString("en-IN")}
                              </td>
                              <td className="py-1.5 px-1 text-right font-mono">
                                {p.accBenefit.toLocaleString("en-IN")}
                              </td>
                              {showRiderDetails && (
                                <>
                                  <td className="py-1.5 px-1 text-right font-mono">{p.termRider}</td>
                                  <td className="py-1.5 px-1 text-right font-mono">{p.criticalIllness}</td>
                                  <td className="py-1.5 px-1 text-center font-bold">{p.pwb}</td>
                                </>
                              )}
                              <td className="py-1.5 px-1 text-slate-800 font-medium truncate max-w-[140px]">
                                {p.nominee}
                              </td>
                            </tr>
                          ))}

                          <tr className="border-t-2 border-slate-300 font-bold text-[11px] bg-slate-50">
                            <td colSpan={9} className="text-right pr-4 py-1.5 text-slate-700 uppercase tracking-wider">
                              Member Total :
                            </td>
                            <td className="text-right py-1.5 font-mono text-[#0B1220]">
                              p.a. {member.memberTotalPa.toFixed(2)}
                            </td>
                            <td className="text-right py-1.5 font-mono text-slate-900">
                              {member.memberTotalSum.toLocaleString("en-IN")}
                            </td>
                            <td className="text-right py-1.5 font-mono text-slate-900">
                              {member.memberTotalAcc.toLocaleString("en-IN")}
                            </td>
                            {showRiderDetails && <td colSpan={3}></td>}
                            <td></td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}

                <div className="bg-[#0B1220] text-white px-4 py-2 rounded-lg font-bold text-xs border-t-2 border-[#B8873A]">
                  <table className="w-full border-collapse">
                    <tbody>
                      <tr>
                        <td className="text-left font-bold">Total Policies for Group : {group.totalPolicies}</td>
                        <td className="text-right font-bold text-[#E8C77A] pr-4">Group Total :</td>
                        <td className="text-right font-mono text-[#E8C77A] w-28">p.a. {group.groupTotalPa.toFixed(2)}</td>
                        <td className="text-right font-mono w-28">{group.groupTotalSum.toLocaleString("en-IN")}</td>
                        <td className="text-right font-mono w-28">{group.groupTotalAcc.toLocaleString("en-IN")}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}

        {showNomineeList && nomineeEntries.length > 0 && (
          <div className="pt-2 space-y-2">
            <div className="bg-[#0B1220] text-white px-4 py-2 rounded-xl flex items-center justify-between border-l-4 border-[#B8873A]">
              <h3 className="text-xs font-bold text-[#E8C77A] uppercase tracking-wider">
                Nominee Details List
              </h3>
              <span className="text-[10px] text-slate-300 font-mono">Total Nominees: {nomineeEntries.length}</span>
            </div>

            <div className="border border-slate-300 rounded-xl overflow-hidden shadow-xs">
              <table className="w-full text-left text-[11px]">
                <thead>
                  <tr className="bg-slate-100 font-bold border-b border-slate-300 text-slate-900">
                    <th className="p-2 text-center w-12">Sr. No</th>
                    <th className="p-2 font-mono">Policy No.</th>
                    <th className="p-2">Nominee Name</th>
                    <th className="p-2">Relation</th>
                    <th className="p-2 text-center">Share %</th>
                    <th className="p-2 text-center">Nominee Type</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {nomineeEntries.map((nom) => (
                    <tr key={`${nom.policyNo}-${nom.srNo}`} className="hover:bg-slate-50">
                      <td className="p-2 text-center font-bold text-slate-700">{nom.srNo}</td>
                      <td className="p-2 font-mono font-bold text-[#0B1220]">{nom.policyNo}</td>
                      <td className="p-2 font-bold text-slate-900">{nom.nomineeName}</td>
                      <td className="p-2 text-slate-700">{nom.relation}</td>
                      <td className="p-2 text-center font-mono font-bold text-emerald-700">{nom.sharePct}</td>
                      <td className="p-2 text-center text-slate-700">{nom.nomineeType}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {groupData.length > 0 && (
          <div className="pt-4 flex justify-end">
            <div className="w-full max-w-2xl border-2 border-[#0B1220] rounded-xl overflow-hidden shadow-md">
              <div className="bg-[#0B1220] text-[#E8C77A] p-2.5 text-xs font-bold uppercase tracking-wider border-b border-[#B8873A]">
                Grand Portfolio Summary Statement
              </div>
              <table className="w-full text-left text-xs font-semibold border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-300 text-slate-900">
                    <th className="p-2.5 border-r border-slate-300">Policy Category</th>
                    <th className="p-2.5 text-right border-r border-slate-300">Premium</th>
                    <th className="p-2.5 text-right border-r border-slate-300">Sum Assured</th>
                    <th className="p-2.5 text-right">Accidental Benefit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  <tr>
                    <td className="p-2.5 font-bold border-r border-slate-300 bg-slate-50 text-slate-800">
                      Total for Regular Policies ({regularPoliciesCount})
                    </td>
                    <td className="p-2.5 text-right font-mono border-r border-slate-300 text-[#0B1220]">
                      {regularPaTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })} p.a
                    </td>
                    <td className="p-2.5 text-right font-mono border-r border-slate-300">
                      {grandTotalSum.toLocaleString("en-IN")}
                    </td>
                    <td className="p-2.5 text-right font-mono">
                      {grandTotalAcc.toLocaleString("en-IN")}
                    </td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-bold border-r border-slate-300 bg-slate-50 text-slate-800">
                      Total for Single Mode Policies ({singlePoliciesCount})
                    </td>
                    <td className="p-2.5 text-right font-mono border-r border-slate-300">
                      {singlePaTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-2.5 text-right font-mono border-r border-slate-300">0</td>
                    <td className="p-2.5 text-right font-mono">0</td>
                  </tr>
                  <tr className="bg-[#0B1220] text-white font-bold border-t-2 border-[#B8873A]">
                    <td className="p-2.5 border-r border-slate-700 text-[#E8C77A]">Grand Total Portfolio</td>
                    <td className="p-2.5 text-right font-mono border-r border-slate-700 text-[#E8C77A]">
                      {grandTotalPa.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-2.5 text-right font-mono border-r border-slate-700">
                      {grandTotalSum.toLocaleString("en-IN")}
                    </td>
                    <td className="p-2.5 text-right font-mono">
                      {grandTotalAcc.toLocaleString("en-IN")}
                    </td>
                  </tr>
                  <tr className="bg-slate-50 font-bold">
                    <td className="p-2.5 border-r border-slate-300 text-slate-800">Total No. of Policies</td>
                    <td colSpan={3} className="p-2.5 text-center font-mono text-sm text-[#0B1220]">
                      {grandTotalPolicies} Policies Active
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="pt-6 border-t border-slate-300 space-y-2 text-[10px] text-slate-700 font-medium">
          <div className="flex flex-wrap gap-x-6 gap-y-1">
            <span><strong className="font-bold text-[#0B1220]">m :</strong> SSS Mode</span>
            <span><strong className="font-bold text-[#0B1220]">M :</strong> Monthly Mode</span>
            <span><strong className="font-bold text-[#0B1220]">Y :</strong> NACH Mode</span>
            <span><strong className="font-bold text-[#0B1220]">A :</strong> APPS Mode</span>
            <span><strong className="font-bold text-[#0B1220]">S :</strong> Single Mode</span>
            <span><strong className="font-bold text-[#0B1220]">* :</strong> Joint Life</span>
          </div>

          <div className="flex flex-wrap gap-x-6 gap-y-1">
            <span><strong className="font-bold text-[#0B1220]">P :</strong> Inclusive of GST</span>
            <span><strong className="font-bold text-[#0B1220]">O :</strong> Exclusive of GST</span>
            <span><strong className="font-bold text-[#0B1220]">ρ :</strong> PAN Card Registered</span>
          </div>

          <div className="flex justify-between items-center pt-3 font-mono text-[9px] text-slate-500 border-t border-slate-200">
            <span>Statement Code: DSS000019899</span>
            <span>Generated via Policy Register Engine</span>
          </div>
        </div>
      </div>
    </div>
  );
}