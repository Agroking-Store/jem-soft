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
  const defaultFormData: CommissionOutstandingFormData = {
    dataFilters: [],
    dateFrom: "01/Sep/2026",
    dateTo: "08/Sep/2026",
    reportDate: "08/Sep/2026",
    includePaymentTill: "08/Sep/2026",
    paymentTypes: {
      nonMonthly: true, // As shown in screenshot
      monthly: false,
    },
    commissionType: "all",
    sortingOption: "branch-wise", // "Branch No. Wise" by default
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

  const handleSave = () => {
    toast.success("Configuration saved!");
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
      return `Branch ${formData.selectedBranches[0].branchCode}`;
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
      {/* Top Header Bar Matching Screenshot */}
      <div className="border-b border-blue-200 pb-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="p-1.5 rounded-lg text-slate-500 hover:text-[#1877F2] hover:bg-blue-50 transition"
            title="Back to Reports"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-2xl font-bold tracking-tight text-[#1877F2]">
            Commissions Outstanding
          </h1>
        </div>

        {/* Top Right Action Icons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSave}
            className="p-2 rounded-xl text-[#1877F2] hover:bg-blue-50 transition"
            title="Save Configuration"
          >
            <Save size={21} />
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="p-2 rounded-xl text-[#1877F2] hover:bg-blue-50 transition"
            title="Reset Form"
          >
            <RotateCcw size={21} />
          </button>
          <button
            type="button"
            onClick={handleGenerate}
            className="p-2 rounded-xl text-[#1877F2] hover:bg-blue-50 transition"
            title="Generate & View Report"
          >
            <FileText size={21} />
          </button>
        </div>
      </div>

      {/* Main Form Body - EXACTLY 3 Sections matching Screenshot */}
      <div className="space-y-6">
        {/* SECTION 1: Filter Options */}
        <div className="relative overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-xs">
          {/* Header Band */}
          <div className="bg-gradient-to-r from-blue-50/80 via-blue-50/30 to-transparent px-6 py-3 border-b border-blue-50">
            <h2 className="text-base font-bold text-[#1e3a8a]">
              Filter Options
            </h2>
          </div>

          <div className="p-6 space-y-5">
            {/* Filter Options (Agencies) */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-14">
              <span className="w-48 text-xs font-semibold text-slate-600 shrink-0">
                Filter Options
              </span>

              <div className="flex items-center gap-2.5 flex-1 max-w-sm">
                <div className="relative flex-1">
                  <span className="absolute -top-2 left-3 bg-white px-1.5 text-[10px] text-[#1877F2] font-semibold uppercase z-10">
                    Selected Filter
                  </span>
                  <div className="flex items-center justify-between border border-slate-300 rounded-xl px-3.5 py-2 text-xs bg-white">
                    <span className="text-slate-800 font-medium truncate">
                      {getAgencyFilterDisplayLabel()}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsAgencyFilterModalOpen(true)}
                  className="p-2 rounded-xl text-[#1877F2] hover:bg-blue-50 transition"
                  title="Open Agency Filter Modal"
                >
                  <Filter size={18} className="fill-[#1877F2]" />
                </button>

                {formData.dataFilters && formData.dataFilters.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, dataFilters: [] }))}
                    className="p-2 rounded-xl text-rose-500 hover:bg-rose-50 transition"
                    title="Clear Filter"
                  >
                    <FilterX size={16} />
                  </button>
                )}
              </div>
            </div>

            {/* Date From & To */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-14">
              <span className="w-48 text-xs font-semibold text-slate-600 shrink-0">
                Date From
              </span>

              <div className="flex flex-col sm:flex-row sm:items-center gap-4 flex-1 max-w-2xl">
                <div className="relative flex-1 max-w-sm w-full">
                  <span className="absolute -top-2 left-3 bg-white px-1.5 text-[10px] text-[#1877F2] font-semibold uppercase z-10">
                    From Date
                  </span>
                  <div className="flex items-center border border-slate-300 rounded-xl px-3.5 py-2 text-xs bg-white">
                    <input
                      type="text"
                      value={formData.dateFrom}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, dateFrom: e.target.value }))
                      }
                      placeholder="01/Sep/2026"
                      className="w-full text-xs font-medium text-slate-900 focus:outline-none bg-transparent"
                    />
                    <CalendarIcon size={16} className="text-[#1877F2] shrink-0" />
                  </div>
                </div>

                <span className="text-xs font-semibold text-slate-600 px-1">
                  To
                </span>

                <div className="relative flex-1 max-w-sm w-full">
                  <span className="absolute -top-2 left-3 bg-white px-1.5 text-[10px] text-[#1877F2] font-semibold uppercase z-10">
                    To Date
                  </span>
                  <div className="flex items-center border border-slate-300 rounded-xl px-3.5 py-2 text-xs bg-white">
                    <input
                      type="text"
                      value={formData.dateTo}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, dateTo: e.target.value }))
                      }
                      placeholder="08/Sep/2026"
                      className="w-full text-xs font-medium text-slate-900 focus:outline-none bg-transparent"
                    />
                    <CalendarIcon size={16} className="text-[#1877F2] shrink-0" />
                  </div>
                </div>
              </div>
            </div>

            {/* Report Date */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-14">
              <span className="w-48 text-xs font-semibold text-slate-600 shrink-0">
                Report Date
              </span>

              <div className="relative flex-1 max-w-sm">
                <span className="absolute -top-2 left-3 bg-white px-1.5 text-[10px] text-[#1877F2] font-semibold uppercase z-10">
                  Report Date
                </span>
                <div className="flex items-center border border-slate-300 rounded-xl px-3.5 py-2 text-xs bg-white">
                  <input
                    type="text"
                    value={formData.reportDate}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, reportDate: e.target.value }))
                    }
                    placeholder="08/Sep/2026"
                    className="w-full text-xs font-medium text-slate-900 focus:outline-none bg-transparent"
                  />
                  <CalendarIcon size={16} className="text-[#1877F2] shrink-0" />
                </div>
              </div>
            </div>

            {/* Include Date of Payment till */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-14">
              <span className="w-48 text-xs font-semibold text-slate-600 shrink-0">
                Include Date of Payment till
              </span>

              <div className="relative flex-1 max-w-sm">
                <span className="absolute -top-2 left-3 bg-white px-1.5 text-[10px] text-[#1877F2] font-semibold uppercase z-10">
                  Include Date of Payment till
                </span>
                <div className="flex items-center border border-slate-300 rounded-xl px-3.5 py-2 text-xs bg-white">
                  <input
                    type="text"
                    value={formData.includePaymentTill}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, includePaymentTill: e.target.value }))
                    }
                    placeholder="08/Sep/2026"
                    className="w-full text-xs font-medium text-slate-900 focus:outline-none bg-transparent"
                  />
                  <CalendarIcon size={16} className="text-[#1877F2] shrink-0" />
                </div>
              </div>
            </div>

            {/* Payment Type */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-14">
              <span className="w-48 text-xs font-semibold text-slate-600 shrink-0">
                Payment Type
              </span>

              <div className="flex items-center gap-12">
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

        {/* SECTION 2: Commission Type */}
        <div className="relative overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-xs">
          {/* Header Band */}
          <div className="bg-gradient-to-r from-blue-50/80 via-blue-50/30 to-transparent px-6 py-3 border-b border-blue-50">
            <h2 className="text-base font-bold text-[#1e3a8a]">
              Commission Type
            </h2>
          </div>

          <div className="p-6">
            <div className="flex flex-wrap items-center gap-12 sm:gap-20">
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
        </div>

        {/* SECTION 3: Sorting Options (Dynamic filter row based on selected radio) */}
        <div className="relative overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-xs">
          {/* Header Band */}
          <div className="bg-gradient-to-r from-blue-50/80 via-blue-50/30 to-transparent px-6 py-3 border-b border-blue-50">
            <h2 className="text-base font-bold text-[#1e3a8a]">
              Sorting Options
            </h2>
          </div>

          <div className="p-6 space-y-6">
            {/* Sorting Radio Options */}
            <div className="flex flex-wrap items-center gap-12 sm:gap-20">
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

            {/* Dynamic Filter Row matching Screenshot */}
            {formData.sortingOption === "branch-wise" && (
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-14 pt-1">
                <span className="w-48 text-xs font-semibold text-slate-600 shrink-0">
                  Select Branches
                </span>

                <div className="flex items-center gap-2.5 flex-1 max-w-sm">
                  <div className="relative flex-1">
                    <span className="absolute -top-2 left-3 bg-white px-1.5 text-[10px] text-[#1877F2] font-semibold uppercase z-10">
                      Selected Filter
                    </span>
                    <div className="flex items-center justify-between border border-slate-300 rounded-xl px-3.5 py-2 text-xs bg-white">
                      <span className="text-slate-800 font-medium truncate">
                        {getBranchFilterDisplayLabel()}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsBranchFilterModalOpen(true)}
                    className="p-2 rounded-xl text-[#1877F2] hover:bg-blue-50 transition"
                    title="Open Branch Selection Modal"
                  >
                    <Filter size={18} className="fill-[#1877F2]" />
                  </button>

                  {formData.selectedBranches && formData.selectedBranches.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, selectedBranches: [] }))}
                      className="p-2 rounded-xl text-rose-500 hover:bg-rose-50 transition"
                      title="Clear Branches"
                    >
                      <FilterX size={16} />
                    </button>
                  )}
                </div>
              </div>
            )}

            {formData.sortingOption === "policy-wise" && (
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-14 pt-1">
                <span className="w-48 text-xs font-semibold text-slate-600 shrink-0">
                  Select Policies
                </span>

                <div className="flex items-center gap-2.5 flex-1 max-w-sm">
                  <div className="relative flex-1">
                    <span className="absolute -top-2 left-3 bg-white px-1.5 text-[10px] text-[#1877F2] font-semibold uppercase z-10">
                      Selected Filter
                    </span>
                    <div className="flex items-center justify-between border border-slate-300 rounded-xl px-3.5 py-2 text-xs bg-white font-mono">
                      <span className="text-slate-800 font-medium truncate">
                        {getPolicyFilterDisplayLabel()}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsPolicyFilterModalOpen(true)}
                    className="p-2 rounded-xl text-[#1877F2] hover:bg-blue-50 transition"
                    title="Open 9-Digit Policy Selection Modal"
                  >
                    <Filter size={18} className="fill-[#1877F2]" />
                  </button>

                  {formData.selectedPolicyIds && formData.selectedPolicyIds.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, selectedPolicyIds: [] }))}
                      className="p-2 rounded-xl text-rose-500 hover:bg-rose-50 transition"
                      title="Clear Policies"
                    >
                      <FilterX size={16} />
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Actions Bar */}
        <div className="p-5 bg-white rounded-2xl border border-blue-100 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs">
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
