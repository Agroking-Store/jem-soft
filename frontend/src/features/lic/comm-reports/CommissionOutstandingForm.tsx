"use client";

import { useState, useMemo } from "react";
import {
  Save,
  RotateCcw,
  FileText,
  Filter,
  FilterX,
  Calendar as CalendarIcon,
  ArrowLeft,
  ArrowRight,
  AlertCircle,
  Building2,
  Layers,
  Shield,
} from "lucide-react";
import CommissionAgencyFilterModal from "./CommissionAgencyFilterModal";
import CommissionBranchFilterModal, { BranchFilterItem } from "./CommissionBranchFilterModal";
import CommissionPolicyFilterModal, { CommissionPolicyFilterSelection } from "./CommissionPolicyFilterModal";
import {
  CommissionOutstandingFormData,
  extractDynamicBranches,
  format9DigitPolicyNo,
} from "./commissionOutstandingData";
import toast from "react-hot-toast";

interface CommissionOutstandingFormProps {
  initialData?: CommissionOutstandingFormData | null;
  branches?: BranchFilterItem[];
  policies?: any[];
  onBack: () => void;
  onGenerateReport: (data: CommissionOutstandingFormData) => void;
}

export default function CommissionOutstandingForm({
  initialData,
  branches = [],
  policies = [],
  onBack,
  onGenerateReport,
}: CommissionOutstandingFormProps) {
  // By default, NO filter is selected (unrestrictive, all records included)
  const defaultFormData: CommissionOutstandingFormData = {
    dataFilters: [],
    dateFrom: "01/Sep/2026",
    dateTo: "08/Sep/2026",
    reportDate: "08/Sep/2026",
    includePaymentTill: "08/Sep/2026",
    paymentTypes: {
      nonMonthly: false, // Unchecked by default
      monthly: false, // Unchecked by default
    },
    commissionType: "all",
    sortingOption: "payment-datewise",
    selectedBranches: [], // No branch pre-selected
    selectedPolicyIds: [], // No policy pre-selected
  };

  const [formData, setFormData] = useState<CommissionOutstandingFormData>(() => {
    if (initialData) return initialData;
    return defaultFormData;
  });

  const [isAgencyFilterModalOpen, setIsAgencyFilterModalOpen] = useState(false);
  const [isBranchFilterModalOpen, setIsBranchFilterModalOpen] = useState(false);
  const [isPolicyFilterModalOpen, setIsPolicyFilterModalOpen] = useState(false);

  // Dynamically extract all unique branch numbers from policies created in the system + Redux branches
  const dynamicBranches = useMemo(() => {
    return extractDynamicBranches(policies, branches);
  }, [policies, branches]);

  // Selected agency filters for policy modal cascade
  const selectedAgencyNames = useMemo(() => {
    return (formData.dataFilters || [])
      .filter((f) => f.type === "Agencies")
      .map((f) => f.name);
  }, [formData.dataFilters]);

  const handleReset = () => {
    setFormData(defaultFormData);
    toast.success("Form reset to defaults (no filters applied)");
  };

  const handleSave = () => {
    toast.success("Commission outstanding configuration saved!");
  };

  const handleGenerate = () => {
    onGenerateReport(formData);
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
    return `${formData.selectedBranches.length} branches selected`;
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
      {/* Top Banner Card (Deduction Summary & Comm Reports Style) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-2xl border border-blue-100 bg-[#f0f7ff] p-5 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-b from-[#1e3a8a] to-[#2563eb] text-white shadow-lg shadow-blue-200/50">
            <AlertCircle size={26} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#0f172a]">
              Commissions Outstanding
            </h1>
            <p className="mt-0.5 text-xs sm:text-sm font-medium text-slate-500">
              Track unpaid and pending agency commissions across dynamic branch numbers and policyholders.
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
          <button
            type="button"
            onClick={handleSave}
            className="p-2.5 rounded-xl border border-slate-200 bg-white text-[#1877F2] hover:bg-blue-50 transition shadow-xs"
            title="Save Configuration"
          >
            <Save size={15} />
          </button>
          <button
            type="button"
            onClick={handleGenerate}
            className="p-2.5 rounded-xl border border-slate-200 bg-white text-[#1877F2] hover:bg-blue-50 transition shadow-xs"
            title="Generate & View Report"
          >
            <FileText size={15} />
          </button>
        </div>
      </div>

      {/* Main Form Body */}
      <div className="space-y-6">
        {/* Section 1: Filter Options */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#1877F2] via-[#2563eb] to-transparent" />

          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-[#1877F2]">
                1
              </span>
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Filter Options
                </h2>
                <p className="text-xs text-slate-500">
                  Configure agency criteria, date ranges, and payment types.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-5 max-w-4xl">
            {/* Agency Filter Options */}
            <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                <Building2 size={13} className="text-[#1877F2]" />
                Agency Filter
              </label>

              <div className="sm:col-span-3 flex items-center gap-2 max-w-lg">
                <div className="relative flex-1">
                  <span className="absolute -top-2 left-3 bg-white px-1 text-[10px] text-[#1877F2] font-bold uppercase">
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
                  className="p-2.5 rounded-xl border border-slate-200 bg-white text-[#1877F2] hover:bg-blue-50 transition shadow-2xs"
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
                    onClick={() => setFormData((prev) => ({ ...prev, dataFilters: [] }))}
                    className="p-2.5 rounded-xl border border-rose-100 bg-rose-50 text-rose-600 hover:bg-rose-100 transition"
                    title="Clear Agency Filter"
                  >
                    <FilterX size={15} />
                  </button>
                )}
              </div>
            </div>

            {/* Date Range: From Date & To Date */}
            <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                <CalendarIcon size={13} className="text-[#1877F2]" />
                Date Range
              </label>

              <div className="sm:col-span-3 flex flex-col sm:flex-row items-center gap-3 max-w-xl">
                {/* Date From */}
                <div className="relative flex-1 w-full">
                  <span className="absolute -top-2 left-3 bg-white px-1 text-[10px] text-[#1877F2] font-bold uppercase">
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
                    <CalendarIcon size={16} className="text-[#1877F2] shrink-0" />
                  </div>
                </div>

                <span className="text-xs font-bold text-slate-400">To</span>

                {/* To Date */}
                <div className="relative flex-1 w-full">
                  <span className="absolute -top-2 left-3 bg-white px-1 text-[10px] text-[#1877F2] font-bold uppercase">
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
                    <CalendarIcon size={16} className="text-[#1877F2] shrink-0" />
                  </div>
                </div>
              </div>
            </div>

            {/* Report Date */}
            <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Report Date
              </label>

              <div className="sm:col-span-3 max-w-sm">
                <div className="relative">
                  <span className="absolute -top-2 left-3 bg-white px-1 text-[10px] text-[#1877F2] font-bold uppercase">
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
            </div>

            {/* Include Date of Payment till */}
            <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Include Payment Till
              </label>

              <div className="sm:col-span-3 max-w-sm">
                <div className="relative">
                  <span className="absolute -top-2 left-3 bg-white px-1 text-[10px] text-[#1877F2] font-bold uppercase">
                    Include Date of Payment till
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
            </div>

            {/* Payment Type Checkboxes: Unchecked by default */}
            <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Payment Type
              </label>

              <div className="sm:col-span-3 flex items-center gap-8">
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

                <span className="text-[11px] text-slate-400 italic">
                  (Leave unchecked to include both monthly and non-monthly policies)
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Branch & Policy Filters (Dynamic Branch No & 9-Digit Policy No) */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#1877F2] via-[#2563eb] to-transparent" />

          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-[#1877F2]">
                2
              </span>
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Branch & Policy Selection
                </h2>
                <p className="text-xs text-slate-500">
                  Dynamic branch numbers from created policies and authentic 9-digit policy numbers.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-5 max-w-4xl">
            {/* Dynamic Branch No. Filter */}
            <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                <Building2 size={13} className="text-[#1877F2]" />
                Branch No.
              </label>

              <div className="sm:col-span-3 flex items-center gap-2 max-w-lg">
                <div className="relative flex-1">
                  <span className="absolute -top-2 left-3 bg-white px-1 text-[10px] text-[#1877F2] font-bold uppercase">
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
                  className="p-2.5 rounded-xl border border-slate-200 bg-white text-[#1877F2] hover:bg-blue-50 transition shadow-2xs"
                  title="Open Dynamic Branch Selection Modal"
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
                    title="Clear Branch Filter"
                  >
                    <FilterX size={15} />
                  </button>
                )}
              </div>
            </div>

            {/* 9-Digit Policy No. Filter */}
            <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                <Shield size={13} className="text-[#1877F2]" />
                Policy No.
              </label>

              <div className="sm:col-span-3 flex items-center gap-2 max-w-lg">
                <div className="relative flex-1">
                  <span className="absolute -top-2 left-3 bg-white px-1 text-[10px] text-[#1877F2] font-bold uppercase">
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
                        className="px-2 py-0.5 text-[10px] font-bold text-[#1877F2] bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition uppercase font-sans"
                      >
                        View
                      </button>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsPolicyFilterModalOpen(true)}
                  className="p-2.5 rounded-xl border border-slate-200 bg-white text-[#1877F2] hover:bg-blue-50 transition shadow-2xs"
                  title="Open 9-Digit Policy Selection Modal"
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
                    title="Clear Policy Filter"
                  >
                    <FilterX size={15} />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Commission Type & Sorting Options */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#1877F2] via-[#2563eb] to-transparent" />

          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-[#1877F2]">
                3
              </span>
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Commission Type & Sorting Options
                </h2>
                <p className="text-xs text-slate-500">
                  Choose commission payout category and presentation sequence.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-6 max-w-4xl">
            {/* Commission Type */}
            <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                <Layers size={13} className="text-[#1877F2]" />
                Commission Type
              </label>

              <div className="sm:col-span-3 flex flex-wrap items-center gap-8">
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
                  <span>All</span>
                </label>
              </div>
            </div>

            {/* Sorting Options */}
            <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Sorting Options
              </label>

              <div className="sm:col-span-3 flex flex-wrap items-center gap-8">
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
        selectedFilters={formData.dataFilters}
        onApplyFilters={(filters) =>
          setFormData((prev) => ({ ...prev, dataFilters: filters }))
        }
      />

      {/* Dynamic Branch Filter Modal */}
      <CommissionBranchFilterModal
        isOpen={isBranchFilterModalOpen}
        onClose={() => setIsBranchFilterModalOpen(false)}
        branches={dynamicBranches}
        selectedBranches={formData.selectedBranches}
        onApplyBranches={(selected) =>
          setFormData((prev) => ({ ...prev, selectedBranches: selected }))
        }
      />

      {/* 9-Digit Policy Filter Modal */}
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
