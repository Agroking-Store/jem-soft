"use client";

import { useState } from "react";
import {
  RotateCcw,
  Filter,
  FilterX,
  Calendar as CalendarIcon,
  ArrowLeft,
  ArrowRight,
  TrendingDown,
  Building2,
  ChevronDown,
} from "lucide-react";
import CommissionAgencyFilterModal from "./CommissionAgencyFilterModal";
import {
  DeductionSummaryFormData,
  ADVANCE_TYPE_OPTIONS,
} from "./deductionSummaryData";

interface DeductionSummaryFormProps {
  initialData?: DeductionSummaryFormData | null;
  onBack: () => void;
  onGenerateReport: (data: DeductionSummaryFormData) => void;
}

export default function DeductionSummaryForm({
  initialData,
  onBack,
  onGenerateReport,
}: DeductionSummaryFormProps) {
  const defaultFormData: DeductionSummaryFormData = {
    dateFrom: "01/Apr/2026",
    dateTo: "31/Mar/2027",
    advanceType: "ALL",
    dateOfReport: "01/Sep/2026",
    dataFilters: [],
  };

  const [formData, setFormData] = useState<DeductionSummaryFormData>(() => {
    if (initialData) return initialData;
    return defaultFormData;
  });

  const [isAgencyFilterModalOpen, setIsAgencyFilterModalOpen] = useState(false);

  const handleReset = () => {
    setFormData(defaultFormData);
  };

  const handleGenerate = () => {
    onGenerateReport(formData);
  };

  const getFilterDisplayLabel = () => {
    const selectedAgencies = formData.dataFilters?.filter((f) => f.type === "Agencies") || [];
    if (selectedAgencies.length === 0) {
      return "All filters Selected";
    }
    if (selectedAgencies.length === 1) {
      return selectedAgencies[0].name;
    }
    return `${selectedAgencies.length} agencies selected`;
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-8">
      {/* Top Banner Card (Commission Reports Style) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-2xl border border-blue-100 bg-[#f0f7ff] p-5 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-b from-[#1e3a8a] to-[#2563eb] text-white shadow-lg shadow-blue-200/50">
            <TrendingDown size={26} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#0f172a]">
              Deduction Summary Report
            </h1>
            <p className="mt-0.5 text-xs sm:text-sm font-medium text-slate-500">
              Generate detailed summary of deductions, TDS, and advance adjustments over time.
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
                  Configure agency filter, financial period range, and advance type criteria.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-5 max-w-4xl">
            {/* Row 1: Filter Options (Agency Modal Trigger) */}
            <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                <Building2 size={13} className="text-[#1877F2]" />
                Filter Options
              </label>

              <div className="sm:col-span-3 flex items-center gap-2 max-w-lg">
                <div className="relative flex-1">
                  <span className="absolute -top-2 left-3 bg-white px-1 text-[10px] text-[#1877F2] font-bold uppercase">
                    Selected Filter
                  </span>
                  <div className="flex items-center justify-between border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs bg-slate-50/50">
                    <span className="text-slate-800 font-semibold truncate">
                      {getFilterDisplayLabel()}
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
                    title="Clear Filter"
                  >
                    <FilterX size={15} />
                  </button>
                )}
              </div>
            </div>

            {/* Row 2: Date From and To Date */}
            <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                <CalendarIcon size={13} className="text-[#1877F2]" />
                Date Range
              </label>

              <div className="sm:col-span-3 flex flex-col sm:flex-row items-center gap-3 max-w-xl">
                {/* Date From */}
                <div className="relative flex-1 w-full">
                  <span className="absolute -top-2 left-3 bg-white px-1 text-[10px] text-[#1877F2] font-bold uppercase">
                    DateFrom
                  </span>
                  <div className="flex items-center border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs bg-slate-50/40 focus-within:border-[#1877F2] focus-within:ring-2 focus-within:ring-blue-500/15 transition">
                    <input
                      type="text"
                      value={formData.dateFrom}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, dateFrom: e.target.value }))
                      }
                      placeholder="01/Apr/2026"
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
                      placeholder="31/Mar/2027"
                      className="w-full text-xs font-semibold text-slate-900 focus:outline-none bg-transparent"
                    />
                    <CalendarIcon size={16} className="text-[#1877F2] shrink-0" />
                  </div>
                </div>
              </div>
            </div>

            {/* Row 3: Advance Type */}
            <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Advance Type
              </label>

              <div className="sm:col-span-3 max-w-sm">
                <div className="relative">
                  <span className="absolute -top-2 left-3 bg-white px-1 text-[10px] text-[#1877F2] font-bold uppercase">
                    Advance Type
                  </span>
                  <div className="relative">
                    <select
                      value={formData.advanceType}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, advanceType: e.target.value }))
                      }
                      className="w-full appearance-none border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#1877F2] focus:ring-2 focus:ring-blue-500/15 transition bg-slate-50/40 pr-9 cursor-pointer"
                    >
                      {ADVANCE_TYPE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      size={16}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Row 4: Date of Report */}
            <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Date of Report
              </label>

              <div className="sm:col-span-3 max-w-sm">
                <div className="relative">
                  <span className="absolute -top-2 left-3 bg-white px-1 text-[10px] text-[#1877F2] font-bold uppercase">
                    Date of Report
                  </span>
                  <div className="flex items-center border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs bg-slate-50/40 focus-within:border-[#1877F2] focus-within:ring-2 focus-within:ring-blue-500/15 transition">
                    <input
                      type="text"
                      value={formData.dateOfReport}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, dateOfReport: e.target.value }))
                      }
                      placeholder="01/Sep/2026"
                      className="w-full text-xs font-semibold text-slate-900 focus:outline-none bg-transparent"
                    />
                    <CalendarIcon size={16} className="text-[#1877F2] shrink-0" />
                  </div>
                </div>
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
            <span>Generate Deduction Summary Report</span>
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
    </div>
  );
}
