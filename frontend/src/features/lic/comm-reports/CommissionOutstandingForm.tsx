"use client";

import { useState } from "react";
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
import { CommissionOutstandingFormData } from "./commissionOutstandingData";
import toast from "react-hot-toast";

interface CommissionOutstandingFormProps {
  initialData?: CommissionOutstandingFormData | null;
  branches?: BranchFilterItem[];
  onBack: () => void;
  onGenerateReport: (data: CommissionOutstandingFormData) => void;
}

export default function CommissionOutstandingForm({
  initialData,
  branches = [],
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
    sortingOption: "payment-datewise",
    selectedBranches: [],
  };

  const [formData, setFormData] = useState<CommissionOutstandingFormData>(() => {
    if (initialData) return initialData;
    return defaultFormData;
  });

  const [isAgencyFilterModalOpen, setIsAgencyFilterModalOpen] = useState(false);
  const [isBranchFilterModalOpen, setIsBranchFilterModalOpen] = useState(false);

  const handleReset = () => {
    setFormData(defaultFormData);
    toast.success("Form reset to defaults");
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
      return `Branch ${formData.selectedBranches[0].branchCode} (${formData.selectedBranches[0].branchName})`;
    }
    return `${formData.selectedBranches.length} branches selected`;
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-10 animate-in fade-in duration-200">
      {/* Top Header Bar Matching Image 3 */}
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

        {/* Top Right Actions: Save, Reset, PDF View */}
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

      {/* Main Form Body (Blue and White Theme) */}
      <div className="space-y-6">
        {/* Section 1: Filter Options */}
        <div className="relative overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-xs">
          {/* Section Header Band */}
          <div className="bg-gradient-to-r from-blue-50/80 via-blue-50/30 to-transparent px-6 py-3.5 border-b border-blue-50">
            <h2 className="text-base font-bold text-[#1e3a8a]">
              Filter Options
            </h2>
          </div>

          <div className="p-6 space-y-5">
            {/* Agency Filter Options */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-12">
              <span className="w-36 text-xs font-semibold text-slate-600 shrink-0">
                Filter Options
              </span>

              <div className="flex items-center gap-2.5 flex-1 max-w-md">
                <div className="relative flex-1">
                  <span className="absolute -top-2 left-3 bg-white px-1.5 text-[10px] text-[#1877F2] font-bold tracking-wide uppercase z-10">
                    Selected Filter
                  </span>
                  <div className="flex items-center justify-between border border-slate-300 rounded-xl px-4 py-2.5 text-xs bg-white focus-within:border-[#1877F2] focus-within:ring-2 focus-within:ring-blue-500/15 transition">
                    <span className="text-slate-800 font-semibold truncate">
                      {getAgencyFilterDisplayLabel()}
                    </span>
                    {formData.dataFilters && formData.dataFilters.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setIsAgencyFilterModalOpen(true)}
                        className="px-2 py-0.5 text-[10px] font-bold text-[#1877F2] bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 transition uppercase"
                      >
                        View
                      </button>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsAgencyFilterModalOpen(true)}
                  className="p-2.5 rounded-xl border border-blue-200 bg-white text-[#1877F2] hover:bg-blue-50 hover:border-blue-300 transition shadow-2xs"
                  title="Open Filter Modal"
                >
                  <Filter size={18} className="fill-[#1877F2]" />
                </button>

                {formData.dataFilters && formData.dataFilters.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, dataFilters: [] }))}
                    className="p-2.5 rounded-xl border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 transition"
                    title="Clear Filter"
                  >
                    <FilterX size={18} />
                  </button>
                )}
              </div>
            </div>

            {/* Date From & To */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 max-w-3xl">
              <span className="w-36 text-xs font-semibold text-slate-600 shrink-0">
                Date From
              </span>

              <div className="relative flex-1">
                <span className="absolute -top-2 left-3 bg-white px-1.5 text-[10px] text-[#1877F2] font-bold tracking-wide uppercase z-10">
                  From Date
                </span>
                <div className="flex items-center border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs bg-white focus-within:border-[#1877F2] focus-within:ring-2 focus-within:ring-blue-500/15 transition">
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

              <span className="text-xs font-semibold text-slate-600 px-2">
                To
              </span>

              <div className="relative flex-1">
                <span className="absolute -top-2 left-3 bg-white px-1.5 text-[10px] text-[#1877F2] font-bold tracking-wide uppercase z-10">
                  To Date
                </span>
                <div className="flex items-center border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs bg-white focus-within:border-[#1877F2] focus-within:ring-2 focus-within:ring-blue-500/15 transition">
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

            {/* Report Date */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 max-w-3xl">
              <span className="w-36 text-xs font-semibold text-slate-600 shrink-0">
                Report Date
              </span>

              <div className="relative flex-1 max-w-xs">
                <span className="absolute -top-2 left-3 bg-white px-1.5 text-[10px] text-[#1877F2] font-bold tracking-wide uppercase z-10">
                  Report Date
                </span>
                <div className="flex items-center border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs bg-white focus-within:border-[#1877F2] focus-within:ring-2 focus-within:ring-blue-500/15 transition">
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
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 max-w-3xl">
              <span className="w-36 text-xs font-semibold text-slate-600 shrink-0">
                Include Date of Payment till
              </span>

              <div className="relative flex-1 max-w-xs">
                <span className="absolute -top-2 left-3 bg-white px-1.5 text-[10px] text-[#1877F2] font-bold tracking-wide uppercase z-10">
                  Include Date of Payment till
                </span>
                <div className="flex items-center border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs bg-white focus-within:border-[#1877F2] focus-within:ring-2 focus-within:ring-blue-500/15 transition">
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

            {/* Payment Type Checkboxes: Non-Monthly & Monthly */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 max-w-3xl">
              <span className="w-36 text-xs font-semibold text-slate-600 shrink-0">
                Payment Type
              </span>

              <div className="flex items-center gap-8">
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

        {/* Section 2: Commission Type */}
        <div className="relative overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-xs">
          {/* Section Header Band */}
          <div className="bg-gradient-to-r from-blue-50/80 via-blue-50/30 to-transparent px-6 py-3.5 border-b border-blue-50">
            <h2 className="text-base font-bold text-[#1e3a8a]">
              Commission Type
            </h2>
          </div>

          <div className="p-6">
            <div className="flex flex-wrap items-center gap-8 sm:gap-14">
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

        {/* Section 3: Sorting Options */}
        <div className="relative overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-xs">
          {/* Section Header Band */}
          <div className="bg-gradient-to-r from-blue-50/80 via-blue-50/30 to-transparent px-6 py-3.5 border-b border-blue-50">
            <h2 className="text-base font-bold text-[#1e3a8a]">
              Sorting Options
            </h2>
          </div>

          <div className="p-6 space-y-6">
            {/* Radio Sorting: Branch No. Wise, Policy No. Wise, Payment Datewise */}
            <div className="flex flex-wrap items-center gap-8 sm:gap-14">
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

            {/* Select Branches Input & Modal Trigger */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-12 pt-1">
              <span className="w-36 text-xs font-semibold text-slate-600 shrink-0">
                Select Branches
              </span>

              <div className="flex items-center gap-2.5 flex-1 max-w-md">
                <div className="relative flex-1">
                  <span className="absolute -top-2 left-3 bg-white px-1.5 text-[10px] text-[#1877F2] font-bold tracking-wide uppercase z-10">
                    Selected Filter
                  </span>
                  <div className="flex items-center justify-between border border-slate-300 rounded-xl px-4 py-2.5 text-xs bg-white focus-within:border-[#1877F2] focus-within:ring-2 focus-within:ring-blue-500/15 transition">
                    <span className="text-slate-800 font-semibold truncate">
                      {getBranchFilterDisplayLabel()}
                    </span>
                    {formData.selectedBranches && formData.selectedBranches.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setIsBranchFilterModalOpen(true)}
                        className="px-2 py-0.5 text-[10px] font-bold text-[#1877F2] bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 transition uppercase"
                      >
                        View
                      </button>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsBranchFilterModalOpen(true)}
                  className="p-2.5 rounded-xl border border-blue-200 bg-white text-[#1877F2] hover:bg-blue-50 hover:border-blue-300 transition shadow-2xs"
                  title="Open Branch Selection Modal"
                >
                  <Filter size={18} className="fill-[#1877F2]" />
                </button>

                {formData.selectedBranches && formData.selectedBranches.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, selectedBranches: [] }))}
                    className="p-2.5 rounded-xl border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 transition"
                    title="Clear Branches"
                  >
                    <FilterX size={18} />
                  </button>
                )}
              </div>
            </div>
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

      {/* Branch Filter Modal */}
      <CommissionBranchFilterModal
        isOpen={isBranchFilterModalOpen}
        onClose={() => setIsBranchFilterModalOpen(false)}
        branches={branches}
        selectedBranches={formData.selectedBranches}
        onApplyBranches={(selected) =>
          setFormData((prev) => ({ ...prev, selectedBranches: selected }))
        }
      />
    </div>
  );
}
