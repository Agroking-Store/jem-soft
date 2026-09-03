"use client";

import { useState, useMemo } from "react";
import {
  RotateCcw,
  FileSpreadsheet,
  Filter,
  FilterX,
  ArrowRight,
  ArrowLeft,
  Calendar,
  Layers,
} from "lucide-react";
import { getDefaultCommissionDateRange } from "./commReportsUtils";
import FilterOptionsModal, { SelectedFilterItem } from "@/features/lic/reports/FilterOptionsModal";
import CommissionPolicyFilterModal, { CommissionPolicyFilterSelection } from "./CommissionPolicyFilterModal";

export interface CommissionLedgerFormData {
  fromDate: string;
  toDate: string;
  dataFilters: SelectedFilterItem[];
  policyFilterSelection: CommissionPolicyFilterSelection | null;
  includeWithoutRecord: boolean;
}

interface CommissionLedgerFormProps {
  initialData?: CommissionLedgerFormData | null;
  agencies: Array<any>;
  advisors?: Array<any>;
  customers: Array<any>;
  policies: Array<any>;
  onBack: () => void;
  onGenerateReport: (formData: CommissionLedgerFormData) => void;
}

export default function CommissionLedgerForm({
  initialData,
  agencies = [],
  customers = [],
  policies = [],
  onBack,
  onGenerateReport,
}: CommissionLedgerFormProps) {
  const defaultDates = useMemo(() => getDefaultCommissionDateRange(), []);

  const defaultFormData: CommissionLedgerFormData = {
    fromDate: defaultDates.fromDate,
    toDate: defaultDates.toDate,
    dataFilters: [],
    policyFilterSelection: null,
    includeWithoutRecord: false,
  };

  const [formData, setFormData] = useState<CommissionLedgerFormData>(() => {
    if (initialData) return initialData;
    return defaultFormData;
  });

  const [isDataFilterModalOpen, setIsDataFilterModalOpen] = useState(false);
  const [isPolicyFilterModalOpen, setIsPolicyFilterModalOpen] = useState(false);
  const [isProcessed, setIsProcessed] = useState(false);

  // Standard fallback 3 agencies if DB list is empty
  const standardAgencies = useMemo(() => {
    if (agencies && agencies.length > 0) return agencies;
    return [
      { id: "ag002", agencyName: "Jayant Mahabole", agencyCode: "AG002" },
      { id: "ag003", agencyName: "Manisha Y Mahabole", agencyCode: "AG003" },
      { id: "ag001", agencyName: "Other Agencies", agencyCode: "AG001" },
    ];
  }, [agencies]);

  // Extract selected agency names for policy modal cascade
  const selectedAgencyNames = useMemo(() => {
    return (formData.dataFilters || [])
      .filter((f) => f.type === "Agencies")
      .map((f) => f.name);
  }, [formData.dataFilters]);

  const handleReset = () => {
    setFormData(defaultFormData);
    setIsProcessed(false);
  };

  const handleProcess = () => {
    setIsProcessed(true);
  };

  const handleGenerateReport = () => {
    onGenerateReport(formData);
  };

  const getDataFilterLabel = () => {
    const selectedAgency = formData.dataFilters?.find((f) => f.type === "Agencies");
    const selectedCount = formData.dataFilters?.length || 0;
    if (selectedCount === 1 && selectedAgency) {
      return selectedAgency.name;
    }
    if (selectedCount > 0) {
      return `${selectedCount} filter(s) applied`;
    }
    return "All filters Selected";
  };

  const getPolicyFilterLabel = () => {
    const selectedCount = formData.policyFilterSelection?.selectedItems?.length || 0;
    if (selectedCount > 0) {
      return `${selectedCount} policies selected`;
    }
    return "All filters Selected";
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-8">
      {/* Top Banner Card (Customer Module Style) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-2xl border border-blue-100 bg-[#f0f7ff] p-5 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-b from-[#1e3a8a] to-[#2563eb] text-white shadow-lg shadow-blue-200/50">
            <FileSpreadsheet size={26} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#0f172a]">
              Commission Ledger
            </h1>
            <p className="mt-0.5 text-xs sm:text-sm font-medium text-slate-500">
              Generate detailed commission ledgers, agent payouts, and statement records.
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
                  Default date is set to previous full month. Select Agency from filter modal.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Date Range Inputs */}
            <div className="space-y-1.5 lg:col-span-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Calendar size={13} className="text-[#1877F2]" />
                Date Range (Previous Month Default)
              </label>
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <div className="relative flex-1 w-full">
                  <span className="absolute -top-2 left-3 bg-white px-1 text-[10px] text-[#1877F2] font-bold uppercase">
                    From Date
                  </span>
                  <input
                    type="date"
                    value={formData.fromDate}
                    onChange={(e) => {
                      setFormData((prev) => ({ ...prev, fromDate: e.target.value }));
                      setIsProcessed(false);
                    }}
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#1877F2] focus:ring-2 focus:ring-blue-500/15 transition bg-slate-50/40"
                  />
                </div>
                <span className="text-xs font-bold text-slate-400">To</span>
                <div className="relative flex-1 w-full">
                  <span className="absolute -top-2 left-3 bg-white px-1 text-[10px] text-[#1877F2] font-bold uppercase">
                    To Date
                  </span>
                  <input
                    type="date"
                    value={formData.toDate}
                    onChange={(e) => {
                      setFormData((prev) => ({ ...prev, toDate: e.target.value }));
                      setIsProcessed(false);
                    }}
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#1877F2] focus:ring-2 focus:ring-blue-500/15 transition bg-slate-50/40"
                  />
                </div>
              </div>
            </div>

            {/* Filter Options (Modal Trigger) */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Filter size={13} className="text-[#1877F2]" />
                Filter Options (Agencies)
              </label>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <div className="flex items-center justify-between border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs bg-slate-50/50">
                    <span className="text-slate-800 font-semibold truncate">
                      {getDataFilterLabel()}
                    </span>
                    {formData.dataFilters && formData.dataFilters.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setIsDataFilterModalOpen(true)}
                        className="px-2 py-0.5 text-[10px] font-bold text-[#1877F2] bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition uppercase"
                      >
                        View
                      </button>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsDataFilterModalOpen(true)}
                  className="p-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-blue-50 hover:text-[#1877F2] hover:border-blue-200 transition"
                  title="Open Filter Modal"
                >
                  <Filter
                    size={15}
                    className={formData.dataFilters?.length ? "text-[#1877F2] fill-current" : ""}
                  />
                </button>

                {formData.dataFilters && formData.dataFilters.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setFormData((prev) => ({ ...prev, dataFilters: [], policyFilterSelection: null }));
                      setIsProcessed(false);
                    }}
                    className="p-2.5 rounded-xl border border-rose-100 bg-rose-50 text-rose-600 hover:bg-rose-100 transition"
                    title="Clear Filter"
                  >
                    <FilterX size={15} />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Process Button */}
          <div className="mt-6 pt-5 border-t border-slate-100 flex items-center justify-between">
            <div className="text-xs text-slate-500">
              {isProcessed ? (
                <span className="inline-flex items-center gap-1.5 text-emerald-600 font-semibold">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  Processed! Select policies in Step 2 to generate report.
                </span>
              ) : (
                <span>Click Process to load policies for selected agency and dates</span>
              )}
            </div>

            <button
              type="button"
              onClick={handleProcess}
              className={`inline-flex items-center gap-2 px-6 py-2.5 text-xs font-semibold rounded-xl shadow-md transition-all active:scale-[0.98] ${
                isProcessed
                  ? "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  : "bg-gradient-to-r from-[#5c67ff] to-[#3a47ff] text-white shadow-blue-200 hover:brightness-110"
              }`}
            >
              <Layers size={15} />
              {isProcessed ? "Re-Process" : "Process"}
            </button>
          </div>
        </div>

        {/* Section 2: Policy Filter Options (Unlocked after Process) */}
        {isProcessed && (
          <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#1877F2] via-[#2563eb] to-transparent" />
            
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2.5">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-[#1877F2]">
                  2
                </span>
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Policy Filter Options
                  </h2>
                  <p className="text-xs text-slate-500">
                    {selectedAgencyNames.length > 0
                      ? `Showing policies belonging to Agency: ${selectedAgencyNames.join(", ")}`
                      : "Showing all policies"}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Select Policies Trigger */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Filter size={13} className="text-[#1877F2]" />
                  Select Policies
                </label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <div className="flex items-center justify-between border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs bg-slate-50/50">
                      <span className="text-slate-800 font-semibold truncate">
                        {getPolicyFilterLabel()}
                      </span>
                      {formData.policyFilterSelection?.selectedItems && formData.policyFilterSelection.selectedItems.length > 0 && (
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
                    className="p-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-blue-50 hover:text-[#1877F2] hover:border-blue-200 transition"
                    title="Select Policies Modal"
                  >
                    <Filter
                      size={15}
                      className={formData.policyFilterSelection?.selectedItems?.length ? "text-[#1877F2] fill-current" : ""}
                    />
                  </button>

                  {formData.policyFilterSelection?.selectedItems && formData.policyFilterSelection.selectedItems.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, policyFilterSelection: null }))}
                      className="p-2.5 rounded-xl border border-rose-100 bg-rose-50 text-rose-600 hover:bg-rose-100 transition"
                      title="Clear Filter"
                    >
                      <FilterX size={15} />
                    </button>
                  )}
                </div>
              </div>

              {/* Checkbox Option */}
              <div className="lg:col-span-2 flex items-center pt-5">
                <label className="flex items-center gap-2.5 text-xs font-semibold text-slate-700 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={formData.includeWithoutRecord}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        includeWithoutRecord: e.target.checked,
                      }))
                    }
                    className="w-4 h-4 rounded border-slate-300 text-[#1877F2] focus:ring-[#1877F2] cursor-pointer"
                  />
                  <span>Include Commission Ledger Without Premium And Commission Record</span>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Bottom Actions Bar */}
        <div className="p-5 bg-white rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
          <button
            type="button"
            onClick={onBack}
            className="w-full sm:w-auto px-6 py-2.5 border border-slate-200 bg-white text-slate-700 font-semibold text-xs rounded-xl hover:bg-slate-50 transition"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleGenerateReport}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-2.5 bg-gradient-to-r from-[#5c67ff] to-[#3a47ff] text-white font-semibold text-xs rounded-xl shadow-md shadow-blue-200 hover:brightness-110 active:scale-[0.98] transition"
          >
            <span>Generate Commission Ledger Report</span>
            <ArrowRight size={15} />
          </button>
        </div>
      </div>

      {/* Modal 1: Filter Options Modal (Agencies) */}
      <FilterOptionsModal
        isOpen={isDataFilterModalOpen}
        onClose={() => setIsDataFilterModalOpen(false)}
        agencies={standardAgencies}
        policyStatuses={[]}
        customers={customers}
        selectedFilters={formData.dataFilters}
        onApplyFilters={(filters) => {
          setFormData((prev) => ({
            ...prev,
            dataFilters: filters,
            policyFilterSelection: null, // Reset policy selection when agency changes
          }));
          setIsProcessed(false);
        }}
        enableDefaultStatusSelection={false}
        defaultCategory="Agencies"
      />

      {/* Modal 2: Policy Filters Modal (with Agency Cascade) */}
      <CommissionPolicyFilterModal
        isOpen={isPolicyFilterModalOpen}
        onClose={() => setIsPolicyFilterModalOpen(false)}
        policies={policies}
        selectedAgencyFilters={selectedAgencyNames}
        selectedFilters={formData.policyFilterSelection}
        onApplyFilters={(selection) =>
          setFormData((prev) => ({ ...prev, policyFilterSelection: selection }))
        }
      />
    </div>
  );
}
