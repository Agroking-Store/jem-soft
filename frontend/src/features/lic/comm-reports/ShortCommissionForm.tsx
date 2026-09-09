"use client";

import { useState, useMemo } from "react";
import {
  RotateCcw,
  Filter,
  FilterX,
  Calendar as CalendarIcon,
  ArrowLeft,
  ArrowRight,
  Activity,
  Building2,
  Layers,
  FileCheck2,
  Hash,
} from "lucide-react";
import CommissionAgencyFilterModal from "./CommissionAgencyFilterModal";
import CommissionPolicyFilterModal from "./CommissionPolicyFilterModal";
import {
  ShortCommissionFormData,
  SAMPLE_SHORT_COMMISSION_ITEMS,
} from "./shortCommissionData";
import { format9DigitPolicyNo } from "./commissionOutstandingData";
import toast from "react-hot-toast";

interface ShortCommissionFormProps {
  initialData?: ShortCommissionFormData | null;
  policies?: any[];
  onBack: () => void;
  onGenerateReport: (data: ShortCommissionFormData) => void;
}

export default function ShortCommissionForm({
  initialData,
  policies = [],
  onBack,
  onGenerateReport,
}: ShortCommissionFormProps) {
  const defaultFormData: ShortCommissionFormData = {
    dataFilters: [],
    reportDate: "01/Sep/2026",
    ignoreDifferenceOf: 0,
    sortingOption: "policy-wise",
    selectedPolicyIds: [],
    selectedBills: [],
  };

  const [formData, setFormData] = useState<ShortCommissionFormData>(() => {
    if (initialData) return initialData;
    return defaultFormData;
  });

  const [isAgencyFilterModalOpen, setIsAgencyFilterModalOpen] = useState(false);
  const [isPolicyFilterModalOpen, setIsPolicyFilterModalOpen] = useState(false);

  // Available policies combined
  const availablePolicies = useMemo(() => {
    if (policies && policies.length > 0) return policies;
    // Map sample items into policy-like objects for the modal
    return SAMPLE_SHORT_COMMISSION_ITEMS.map((item) => ({
      id: item.policyNo,
      policyNumber: item.policyNo,
      policyNo: item.policyNo,
      customer: { name: item.holderName },
      customerName: item.holderName,
      premiumAmount: item.premiumAmount,
      plan: { planNumber: item.planTermPpt.split("/")[0] },
    }));
  }, [policies]);

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

  const getAgencyFilterDisplayLabel = () => {
    const selectedAgencies = formData.dataFilters?.filter((f) => f.type === "Agencies") || [];
    if (selectedAgencies.length === 0) {
      return "All filters Selected";
    }
    if (selectedAgencies.length === 1) {
      return "1 filter applied";
    }
    return `${selectedAgencies.length} filters applied`;
  };

  const getPolicyFilterDisplayLabel = () => {
    if (!formData.selectedPolicyIds || formData.selectedPolicyIds.length === 0) {
      return "All Policies selected";
    }
    if (formData.selectedPolicyIds.length === 1) {
      return `Policy ${formData.selectedPolicyIds[0]} selected`;
    }
    return `${formData.selectedPolicyIds.length} Policies selected`;
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-8 animate-in fade-in duration-200">
      {/* Top Banner Card (Commission Bill Style) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-2xl border border-blue-100 bg-[#f0f7ff] p-5 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-b from-[#1e3a8a] to-[#2563eb] text-white shadow-lg shadow-blue-200/50">
            <Activity size={26} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#0f172a]">
              Short/Excess Commissions
            </h1>
            <p className="mt-0.5 text-xs sm:text-sm font-medium text-slate-500">
              Generate short and excess commission statements and reconcile receivable discrepancies.
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
                  Set agency filter, report date, and ignore minimal commission variance threshold.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl">
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
                    <button
                      type="button"
                      onClick={() => setIsAgencyFilterModalOpen(true)}
                      className="px-2 py-0.5 text-[10px] font-bold text-[#1877F2] bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition uppercase"
                    >
                      View Filter
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsAgencyFilterModalOpen(true)}
                  className="p-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-blue-50 hover:text-[#1877F2] hover:border-blue-200 transition shadow-2xs"
                  title="Open Filter Modal"
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
                    title="Clear Filter"
                  >
                    <FilterX size={15} />
                  </button>
                )}
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
                    placeholder="01/Sep/2026"
                    className="w-full text-xs font-semibold text-slate-900 focus:outline-none bg-transparent"
                  />
                  <CalendarIcon size={16} className="text-[#1877F2] shrink-0" />
                </div>
              </div>
            </div>

            {/* Ignore difference of */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Hash size={13} className="text-[#1877F2]" />
                Ignore difference of
              </label>
              <div className="relative">
                <span className="absolute -top-2 left-3 bg-white px-1 text-[10px] text-[#1877F2] font-bold uppercase z-10">
                  Difference Threshold
                </span>
                <div className="flex items-center border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs bg-slate-50/40 focus-within:border-[#1877F2] focus-within:ring-2 focus-within:ring-blue-500/15 transition">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.ignoreDifferenceOf}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, ignoreDifferenceOf: parseFloat(e.target.value) || 0 }))
                    }
                    placeholder="0"
                    className="w-full text-xs font-semibold text-slate-900 focus:outline-none bg-transparent"
                  />
                  <span className="text-[11px] font-bold text-slate-400">INR</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Sorting Options */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#1877F2] via-[#2563eb] to-transparent" />

          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-[#1877F2]">
                2
              </span>
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Sorting Options
                </h2>
                <p className="text-xs text-slate-500">
                  Choose between Policy Number wise or Agent Bill wise sort order and filter policies.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-6 max-w-4xl">
            {/* Sorting Radio Buttons */}
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-8 pt-1">
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
                    value="bill-wise"
                    checked={formData.sortingOption === "bill-wise"}
                    onChange={() =>
                      setFormData((prev) => ({ ...prev, sortingOption: "bill-wise" }))
                    }
                    className="h-4 w-4 text-[#1877F2] focus:ring-[#1877F2]"
                  />
                  <span>Agent Bill Wise</span>
                </label>
              </div>
            </div>

            {/* Select Policies Filter Row */}
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
                    <button
                      type="button"
                      onClick={() => setIsPolicyFilterModalOpen(true)}
                      className="px-2 py-0.5 text-[10px] font-bold text-[#1877F2] bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition uppercase"
                    >
                      View Filter
                    </button>
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
            <span>Generate Short/Excess Commission Report</span>
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

      {/* Policy Filter Modal */}
      <CommissionPolicyFilterModal
        isOpen={isPolicyFilterModalOpen}
        onClose={() => setIsPolicyFilterModalOpen(false)}
        policies={availablePolicies}
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
