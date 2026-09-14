"use client";

import { useState, useMemo } from "react";
import {
  RotateCcw,
  Filter,
  FilterX,
  Calendar as CalendarIcon,
  ArrowLeft,
  ArrowRight,
  AlertCircle,
  Building2,
  GitBranch,
  Layers,
  FileCheck2,
} from "lucide-react";
import CommissionAgencyFilterModal from "./CommissionAgencyFilterModal";
import CommissionBranchFilterModal, { BranchFilterItem } from "./CommissionBranchFilterModal";
import CommissionPolicyFilterModal from "./CommissionPolicyFilterModal";
import {
  CommissionOutstandingFormData,
  extractDynamicBranches,
  format9DigitPolicyNo,
} from "./commissionOutstandingData";
import toast from "react-hot-toast";

interface CommissionOutstandingFormProps {
  initialData?: CommissionOutstandingFormData | null;
  agencies?: Array<{ id: string; agencyCode: string; agencyName: string; branchId?: string }>;
  branches?: BranchFilterItem[];
  policies?: any[];
  onBack: () => void;
  onGenerateReport: (data: CommissionOutstandingFormData) => void;
}

export default function CommissionOutstandingForm({
  initialData,
  agencies = [],
  branches = [],
  policies = [],
  onBack,
  onGenerateReport,
}: CommissionOutstandingFormProps) {
  const defaultFormData: CommissionOutstandingFormData = {
    dataFilters: [],
    dateFrom: "01/Sep/2026",
    dateTo: "08/Sep/2026",
    reportDate: "08/Sep/2026",
    includePaymentTill: "08/Sep/2026",
    paymentTypes: {
      nonMonthly: true,
      monthly: false,
    },
    commissionType: "all",
    sortingOption: "branch-wise",
    selectedBranches: [],
    selectedPolicyIds: [],
  };

  const [formData, setFormData] = useState<CommissionOutstandingFormData>(() => {
    if (initialData) return initialData;
    return defaultFormData;
  });

  const [isAgencyFilterModalOpen, setIsAgencyFilterModalOpen] = useState(false);
  const [isBranchFilterModalOpen, setIsBranchFilterModalOpen] = useState(false);
  const [isPolicyFilterModalOpen, setIsPolicyFilterModalOpen] = useState(false);

  // Dynamic branches extracted from created policies + Redux branches
  const dynamicBranches = useMemo(() => {
    return extractDynamicBranches(policies, branches);
  }, [policies, branches]);

  const selectedAgencyNames = useMemo(() => {
    return (formData.dataFilters || [])
      .filter((f) => f.type === "Agencies")
      .map((f) => f.name);
  }, [formData.dataFilters]);

  const handleReset = () => {
    setFormData(defaultFormData);
    toast.success("Form reset to defaults");
  };

  const handleGenerate = () => {
    onGenerateReport(formData);
  };

  // Calculate branches belonging to the currently selected agency(ies)
  // When an agency is selected (e.g. Jayant Mahabole), only branches under that agency appear in the branch filter modal.
  const availableBranchesForAgency = useMemo(() => {
    // If no agency filter selected, show all dynamic branches
    if (!formData.dataFilters || formData.dataFilters.length === 0) {
      return dynamicBranches;
    }

    const JAYANT_CODES = ["a001", "a002", "a003"];
    const MANISHA_CODES = ["a004", "a005", "a006"];

    const agencyNamesOrIds = formData.dataFilters
      .filter((f) => f.type === "Agencies")
      .map((f) => ({ id: f.id.toLowerCase(), name: f.name.toLowerCase() }));

    if (agencyNamesOrIds.length === 0) {
      return dynamicBranches;
    }

    const branchCodeMap = new Map<string, BranchFilterItem>();

    // 1. From policies matching selected agency
    if (policies && policies.length > 0) {
      policies.forEach((p) => {
        const pAgCode = (p.agentCode || "").toLowerCase().trim();
        const pAdvCode = (p.advisor?.advisorCode || "").toLowerCase().trim();
        const pAdvName = (p.advisor?.advisorName || "").toLowerCase().trim();
        const pAgName = (p.agency?.agencyName || p.agencyName || "").toLowerCase();

        const matches = agencyNamesOrIds.some((f) => {
          if (f.name.includes("jayant") || f.id.includes("ag002")) {
            return (
              JAYANT_CODES.includes(pAgCode) ||
              JAYANT_CODES.includes(pAdvCode) ||
              pAdvName.includes("jayant") ||
              pAgName.includes("jayant")
            );
          }
          if (f.name.includes("manisha") || f.id.includes("ag003")) {
            return (
              MANISHA_CODES.includes(pAgCode) ||
              MANISHA_CODES.includes(pAdvCode) ||
              pAdvName.includes("manisha") ||
              pAgName.includes("manisha")
            );
          }
          return (
            pAgCode.includes(f.id) ||
            pAdvCode.includes(f.id) ||
            pAdvName.includes(f.name) ||
            pAgName.includes(f.name)
          );
        });

        if (matches) {
          const bCode = String(p.branch?.branchCode || p.branchCode || p.branchId || "").trim();
          const bName = p.branch?.branchName || p.branchName || (bCode ? `Branch ${bCode}` : "");
          if (bCode && !branchCodeMap.has(bCode)) {
            branchCodeMap.set(bCode, {
              id: p.branch?.id || `br-${bCode}`,
              branchCode: bCode,
              branchName: bName,
            });
          }
        }
      });
    }

    // 2. Also check LIC Policy Form specific mappings:
    agencyNamesOrIds.forEach((f) => {
      // Jayant Mahabole (AG002) or Manisha Y Mahabole (AG003) -> Branch 955 (Hadapsar, Pune)
      if (f.name.includes("jayant") || f.id.includes("ag002") || f.name.includes("manisha") || f.id.includes("ag003")) {
        const br955 = dynamicBranches.find((b) => b.branchCode === "955") || {
          id: "b955",
          branchCode: "955",
          branchName: "Hadapsar, Pune",
        };
        branchCodeMap.set("955", br955);
      }

      // Check Redux agency branchId
      const matchedAgency = agencies.find(
        (a) =>
          a.id.toLowerCase() === f.id ||
          a.agencyCode.toLowerCase() === f.id ||
          a.agencyName.toLowerCase() === f.name
      );
      if (matchedAgency?.branchId) {
        const b = dynamicBranches.find(
          (db) => db.id === matchedAgency.branchId || db.branchCode === matchedAgency.branchId
        );
        if (b) branchCodeMap.set(b.branchCode, b);
      }
    });

    // If matches found, return them; otherwise fallback to dynamicBranches
    if (branchCodeMap.size > 0) {
      return Array.from(branchCodeMap.values()).sort((a, b) => a.branchCode.localeCompare(b.branchCode));
    }

    return dynamicBranches;
  }, [formData.dataFilters, dynamicBranches, policies, agencies]);

  // When agency filter is applied: DO NOT autofill branches.
  // Just update agency filter, and if any previously selected branches are not under this agency, clean them up.
  const handleApplyAgencies = (filters: Array<{ type: string; id: string; name: string }>) => {
    setFormData((prev) => {
      // Keep only branches that are valid under newly selected agency
      return {
        ...prev,
        dataFilters: filters || [],
      };
    });
  };

  const handleClearAgencyFilter = () => {
    setFormData((prev) => ({
      ...prev,
      dataFilters: [],
    }));
  };

  const getAgencyFilterDisplayLabel = () => {
    const selectedAgencies = formData.dataFilters?.filter((f) => f.type === "Agencies") || [];
    if (selectedAgencies.length === 0) {
      return "All filters Selected";
    }
    if (selectedAgencies.length === 1) {
      return selectedAgencies[0].name;
    }
    return `${selectedAgencies.length} agencies selected`;
  };

  const getBranchFilterDisplayLabel = () => {
    if (!formData.selectedBranches || formData.selectedBranches.length === 0) {
      return "All Branches Selected";
    }
    if (formData.selectedBranches.length === 1) {
      return `Branch ${formData.selectedBranches[0].branchCode} - ${formData.selectedBranches[0].branchName}`;
    }
    return `${formData.selectedBranches.length} branches selected (${formData.selectedBranches.map((b) => b.branchCode).join(", ")})`;
  };

  const getPolicyFilterDisplayLabel = () => {
    if (!formData.selectedPolicyIds || formData.selectedPolicyIds.length === 0) {
      return "All Policies Selected";
    }
    if (formData.selectedPolicyIds.length === 1) {
      return `Policy ${formData.selectedPolicyIds[0]}`;
    }
    return `${formData.selectedPolicyIds.length} policies selected`;
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-8 animate-in fade-in duration-200">
      {/* Top Banner Card (Commission Bill Style) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-2xl border border-blue-100 bg-[#f0f7ff] p-5 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-b from-[#1e3a8a] to-[#2563eb] text-white shadow-lg shadow-blue-200/50">
            <AlertCircle size={26} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#0f172a]">
              Commission Outstanding
            </h1>
            <p className="mt-0.5 text-xs sm:text-sm font-medium text-slate-500">
              Generate outstanding commission statements and track unpaid agent commission payouts.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition"
          >
            <ArrowLeft size={14} />
            Back to Reports
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition"
            title="Reset Form to Defaults"
          >
            <RotateCcw size={14} />
            Reset
          </button>
        </div>
      </div>

      {/* Main Form Body */}
      <div className="space-y-6">
        {/* Section 1: Data Filter Options */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#1877F2] via-[#2563eb] to-transparent" />

          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-[#1877F2]">
                1
              </span>
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Data Filter Options
                </h2>
                <p className="text-xs text-slate-500">
                  Select agency from filter modal, set date ranges, and specify payment modes.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
            {/* Filter Options (Agencies Modal Trigger) */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Building2 size={13} className="text-[#1877F2]" />
                Filter Options
              </label>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <span className="absolute -top-2 left-3 bg-white px-1 text-[10px] text-[#1877F2] font-bold uppercase z-10">
                    Selected Filter
                  </span>
                  <div className="flex items-center justify-between border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs bg-slate-50/50">
                    <span className="text-slate-800 font-semibold truncate">
                      {getAgencyFilterDisplayLabel()}
                    </span>
                    {formData.dataFilters && formData.dataFilters.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setIsAgencyFilterModalOpen(true)}
                        className="px-2 py-0.5 text-[10px] font-bold text-[#1877F2] bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition uppercase"
                      >
                        View
                      </button>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsAgencyFilterModalOpen(true)}
                  className="p-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-blue-50 hover:text-[#1877F2] hover:border-blue-200 transition shadow-2xs"
                  title="Open Agency Filter Modal"
                >
                  <Filter
                    size={15}
                    className={formData.dataFilters?.length ? "text-[#1877F2] fill-current" : "text-[#1877F2]"}
                  />
                </button>

                {formData.dataFilters && formData.dataFilters.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearAgencyFilter}
                    className="p-2.5 rounded-xl border border-rose-100 bg-rose-50 text-rose-600 hover:bg-rose-100 transition"
                    title="Clear Filter"
                  >
                    <FilterX size={15} />
                  </button>
                )}
              </div>

              {/* Available Branches Info Indicator under Selected Agency */}
              {formData.dataFilters && formData.dataFilters.length > 0 && availableBranchesForAgency.length > 0 && (
                <div className="flex items-center gap-1.5 pt-1 flex-wrap">
                  <span className="text-[11px] font-semibold text-slate-500">Available Branches:</span>
                  {availableBranchesForAgency.map((b) => (
                    <span
                      key={b.id}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-blue-50 border border-blue-200 text-[#1877F2] text-[10.5px] font-bold font-mono shadow-2xs"
                    >
                      Branch {b.branchCode} ({b.branchName})
                    </span>
                  ))}
                </div>
              )}
            </div>


            {/* Date Range: From & To */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <CalendarIcon size={13} className="text-[#1877F2]" />
                Date Range
              </label>
              <div className="grid grid-cols-2 gap-2">
                <div className="relative">
                  <span className="absolute -top-2 left-3 bg-white px-1 text-[10px] text-[#1877F2] font-bold uppercase z-10">
                    From Date
                  </span>
                  <div className="flex items-center border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs bg-slate-50/40 focus-within:border-[#1877F2] focus-within:ring-2 focus-within:ring-blue-500/15 transition">
                    <input
                      type="text"
                      value={formData.dateFrom}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, dateFrom: e.target.value }))
                      }
                      placeholder="01/Sep/2026"
                      className="w-full text-xs font-semibold text-slate-900 focus:outline-none bg-transparent"
                    />
                    <CalendarIcon size={14} className="text-[#1877F2] shrink-0" />
                  </div>
                </div>

                <div className="relative">
                  <span className="absolute -top-2 left-3 bg-white px-1 text-[10px] text-[#1877F2] font-bold uppercase z-10">
                    To Date
                  </span>
                  <div className="flex items-center border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs bg-slate-50/40 focus-within:border-[#1877F2] focus-within:ring-2 focus-within:ring-blue-500/15 transition">
                    <input
                      type="text"
                      value={formData.dateTo}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, dateTo: e.target.value }))
                      }
                      placeholder="08/Sep/2026"
                      className="w-full text-xs font-semibold text-slate-900 focus:outline-none bg-transparent"
                    />
                    <CalendarIcon size={14} className="text-[#1877F2] shrink-0" />
                  </div>
                </div>
              </div>
            </div>

            {/* Report Date */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <CalendarIcon size={13} className="text-[#1877F2]" />
                Report Date
              </label>
              <div className="relative">
                <span className="absolute -top-2 left-3 bg-white px-1 text-[10px] text-[#1877F2] font-bold uppercase z-10">
                  Report Date
                </span>
                <div className="flex items-center border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs bg-slate-50/40 focus-within:border-[#1877F2] focus-within:ring-2 focus-within:ring-blue-500/15 transition">
                  <input
                    type="text"
                    value={formData.reportDate}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, reportDate: e.target.value }))
                    }
                    placeholder="08/Sep/2026"
                    className="w-full text-xs font-semibold text-slate-900 focus:outline-none bg-transparent"
                  />
                  <CalendarIcon size={16} className="text-[#1877F2] shrink-0" />
                </div>
              </div>
            </div>

            {/* Include Date of Payment till */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <CalendarIcon size={13} className="text-[#1877F2]" />
                Include Date of Payment till
              </label>
              <div className="relative">
                <span className="absolute -top-2 left-3 bg-white px-1 text-[10px] text-[#1877F2] font-bold uppercase z-10">
                  Payment Till Date
                </span>
                <div className="flex items-center border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs bg-slate-50/40 focus-within:border-[#1877F2] focus-within:ring-2 focus-within:ring-blue-500/15 transition">
                  <input
                    type="text"
                    value={formData.includePaymentTill}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, includePaymentTill: e.target.value }))
                    }
                    placeholder="08/Sep/2026"
                    className="w-full text-xs font-semibold text-slate-900 focus:outline-none bg-transparent"
                  />
                  <CalendarIcon size={16} className="text-[#1877F2] shrink-0" />
                </div>
              </div>
            </div>

            {/* Payment Type (Non-Monthly, Monthly) */}
            <div className="space-y-2 md:col-span-2 pt-1">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Layers size={13} className="text-[#1877F2]" />
                Payment Type
              </label>
              <div className="flex items-center gap-8 pt-1">
                <label className="flex items-center gap-2.5 text-xs font-semibold text-slate-800 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={formData.paymentTypes.nonMonthly}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        paymentTypes: { ...prev.paymentTypes, nonMonthly: e.target.checked },
                      }))
                    }
                    className="h-4 w-4 rounded border-slate-300 text-[#1877F2] focus:ring-[#1877F2]"
                  />
                  <span>Non-Monthly</span>
                </label>

                <label className="flex items-center gap-2.5 text-xs font-semibold text-slate-800 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={formData.paymentTypes.monthly}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        paymentTypes: { ...prev.paymentTypes, monthly: e.target.checked },
                      }))
                    }
                    className="h-4 w-4 rounded border-slate-300 text-[#1877F2] focus:ring-[#1877F2]"
                  />
                  <span>Monthly</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Commission Type Options */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#1877F2] via-[#2563eb] to-transparent" />

          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-[#1877F2]">
                2
              </span>
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Commission Type Options
                </h2>
                <p className="text-xs text-slate-500">
                  Filter by first year commission, renewal commission, or all categories.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-8 max-w-4xl pt-1">
            <label className="flex items-center gap-2.5 text-xs font-semibold text-slate-800 cursor-pointer select-none">
              <input
                type="radio"
                name="commissionType"
                value="first-year"
                checked={formData.commissionType === "first-year"}
                onChange={() =>
                  setFormData((prev) => ({ ...prev, commissionType: "first-year" }))
                }
                className="h-4 w-4 text-[#1877F2] focus:ring-[#1877F2]"
              />
              <span>First Year Commission</span>
            </label>

            <label className="flex items-center gap-2.5 text-xs font-semibold text-slate-800 cursor-pointer select-none">
              <input
                type="radio"
                name="commissionType"
                value="renewal"
                checked={formData.commissionType === "renewal"}
                onChange={() =>
                  setFormData((prev) => ({ ...prev, commissionType: "renewal" }))
                }
                className="h-4 w-4 text-[#1877F2] focus:ring-[#1877F2]"
              />
              <span>Renewal Commission</span>
            </label>

            <label className="flex items-center gap-2.5 text-xs font-semibold text-slate-800 cursor-pointer select-none">
              <input
                type="radio"
                name="commissionType"
                value="all"
                checked={formData.commissionType === "all"}
                onChange={() =>
                  setFormData((prev) => ({ ...prev, commissionType: "all" }))
                }
                className="h-4 w-4 text-[#1877F2] focus:ring-[#1877F2]"
              />
              <span>All Commissions</span>
            </label>
          </div>
        </div>

        {/* Section 3: Sorting Options & Filters */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#1877F2] via-[#2563eb] to-transparent" />

          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-[#1877F2]">
                3
              </span>
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Sorting & Dynamic Filters
                </h2>
                <p className="text-xs text-slate-500">
                  Select grouping format and apply specific branch or policy selections.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-6 max-w-4xl">
            {/* Sorting Radio Options */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Layers size={13} className="text-[#1877F2]" />
                Sort Order Presentation
              </label>
              <div className="flex flex-wrap items-center gap-8 pt-1">
                <label className="flex items-center gap-2.5 text-xs font-semibold text-slate-800 cursor-pointer select-none">
                  <input
                    type="radio"
                    name="sortingOption"
                    value="branch-wise"
                    checked={formData.sortingOption === "branch-wise"}
                    onChange={() =>
                      setFormData((prev) => ({ ...prev, sortingOption: "branch-wise" }))
                    }
                    className="h-4 w-4 text-[#1877F2] focus:ring-[#1877F2]"
                  />
                  <span>Branch No. Wise</span>
                </label>

                <label className="flex items-center gap-2.5 text-xs font-semibold text-slate-800 cursor-pointer select-none">
                  <input
                    type="radio"
                    name="sortingOption"
                    value="policy-wise"
                    checked={formData.sortingOption === "policy-wise"}
                    onChange={() =>
                      setFormData((prev) => ({ ...prev, sortingOption: "policy-wise" }))
                    }
                    className="h-4 w-4 text-[#1877F2] focus:ring-[#1877F2]"
                  />
                  <span>Policy No. Wise</span>
                </label>

                <label className="flex items-center gap-2.5 text-xs font-semibold text-slate-800 cursor-pointer select-none">
                  <input
                    type="radio"
                    name="sortingOption"
                    value="payment-datewise"
                    checked={formData.sortingOption === "payment-datewise"}
                    onChange={() =>
                      setFormData((prev) => ({ ...prev, sortingOption: "payment-datewise" }))
                    }
                    className="h-4 w-4 text-[#1877F2] focus:ring-[#1877F2]"
                  />
                  <span>Payment Datewise</span>
                </label>
              </div>
            </div>

            {/* Dynamic Filter Row based on Sorting Option */}
            {formData.sortingOption === "branch-wise" && (
              <div className="space-y-1.5 max-w-md pt-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <GitBranch size={13} className="text-[#1877F2]" />
                  Select Branches
                </label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <span className="absolute -top-2 left-3 bg-white px-1 text-[10px] text-[#1877F2] font-bold uppercase z-10">
                      Selected Filter
                    </span>
                    <div className="flex items-center justify-between border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs bg-slate-50/50">
                      <span className="text-slate-800 font-semibold truncate">
                        {getBranchFilterDisplayLabel()}
                      </span>
                      {formData.selectedBranches && formData.selectedBranches.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setIsBranchFilterModalOpen(true)}
                          className="px-2 py-0.5 text-[10px] font-bold text-[#1877F2] bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition uppercase"
                        >
                          View
                        </button>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsBranchFilterModalOpen(true)}
                    className="p-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-blue-50 hover:text-[#1877F2] hover:border-blue-200 transition shadow-2xs"
                    title="Open Branch Selection Modal"
                  >
                    <Filter
                      size={15}
                      className={formData.selectedBranches?.length ? "text-[#1877F2] fill-current" : "text-[#1877F2]"}
                    />
                  </button>

                  {formData.selectedBranches && formData.selectedBranches.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, selectedBranches: [] }))}
                      className="p-2.5 rounded-xl border border-rose-100 bg-rose-50 text-rose-600 hover:bg-rose-100 transition"
                      title="Clear Branches"
                    >
                      <FilterX size={15} />
                    </button>
                  )}
                </div>
              </div>
            )}

            {formData.sortingOption === "policy-wise" && (
              <div className="space-y-1.5 max-w-md pt-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <FileCheck2 size={13} className="text-[#1877F2]" />
                  Select Policies
                </label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <span className="absolute -top-2 left-3 bg-white px-1 text-[10px] text-[#1877F2] font-bold uppercase z-10">
                      Selected Filter
                    </span>
                    <div className="flex items-center justify-between border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs bg-slate-50/50">
                      <span className="text-slate-800 font-semibold truncate font-mono">
                        {getPolicyFilterDisplayLabel()}
                      </span>
                      {formData.selectedPolicyIds && formData.selectedPolicyIds.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setIsPolicyFilterModalOpen(true)}
                          className="px-2 py-0.5 text-[10px] font-bold text-[#1877F2] bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition uppercase"
                        >
                          View
                        </button>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsPolicyFilterModalOpen(true)}
                    className="p-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-blue-50 hover:text-[#1877F2] hover:border-blue-200 transition shadow-2xs"
                    title="Open Policy Selection Modal"
                  >
                    <Filter
                      size={15}
                      className={formData.selectedPolicyIds?.length ? "text-[#1877F2] fill-current" : "text-[#1877F2]"}
                    />
                  </button>

                  {formData.selectedPolicyIds && formData.selectedPolicyIds.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, selectedPolicyIds: [] }))}
                      className="p-2.5 rounded-xl border border-rose-100 bg-rose-50 text-rose-600 hover:bg-rose-100 transition"
                      title="Clear Policies"
                    >
                      <FilterX size={15} />
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Actions Bar */}
        <div className="p-5 bg-white rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
          <button
            type="button"
            onClick={onBack}
            className="w-full sm:w-auto px-6 py-2.5 border border-slate-200 bg-white text-slate-700 font-semibold text-xs rounded-xl hover:bg-slate-50 transition"
          >
            Cancel / Back
          </button>

          <button
            type="button"
            onClick={handleGenerate}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-2.5 bg-gradient-to-r from-[#5c67ff] to-[#3a47ff] text-white font-semibold text-xs rounded-xl shadow-md shadow-blue-200 hover:brightness-110 active:scale-[0.98] transition"
          >
            <span>Generate Commission Outstanding Report</span>
            <ArrowRight size={15} />
          </button>
        </div>
      </div>

      {/* Agency Filter Modal */}
      <CommissionAgencyFilterModal
        isOpen={isAgencyFilterModalOpen}
        onClose={() => setIsAgencyFilterModalOpen(false)}
        agencies={agencies}
        branches={dynamicBranches}
        selectedFilters={formData.dataFilters}
        onApplyFilters={handleApplyAgencies}
      />

      {/* Dynamic Branch Filter Modal (Filtered based on Selected Agency) */}
      <CommissionBranchFilterModal
        isOpen={isBranchFilterModalOpen}
        onClose={() => setIsBranchFilterModalOpen(false)}
        branches={availableBranchesForAgency}
        selectedBranches={formData.selectedBranches}
        onApplyBranches={(selected) =>
          setFormData((prev) => ({ ...prev, selectedBranches: selected }))
        }
      />

      {/* Policy Filter Modal */}
      <CommissionPolicyFilterModal
        isOpen={isPolicyFilterModalOpen}
        onClose={() => setIsPolicyFilterModalOpen(false)}
        policies={policies}
        selectedAgencyFilters={selectedAgencyNames}
        selectedFilters={{
          filterType: "Policies",
          selectedIds: formData.selectedPolicyIds || [],
          selectedItems: (formData.selectedPolicyIds || []).map((id) => ({
            id,
            col1: format9DigitPolicyNo(id),
            col2: "Selected Policy",
          })),
        }}
        onApplyFilters={(selection) =>
          setFormData((prev) => ({
            ...prev,
            selectedPolicyIds: selection.selectedItems.map((it) => it.col1),
          }))
        }
      />
    </div>
  );
}
