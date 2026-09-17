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
  PieChart,
  Building2,
  Layers,
} from "lucide-react";
import CommissionAgencyFilterModal from "./CommissionAgencyFilterModal";
import { CommissionSummaryFormData } from "./commissionSummaryData";
import toast from "react-hot-toast";

interface CommissionSummaryFormProps {
  initialData?: CommissionSummaryFormData | null;
  onBack: () => void;
  onGenerateReport: (data: CommissionSummaryFormData) => void;
}

export default function CommissionSummaryForm({
  initialData,
  onBack,
  onGenerateReport,
}: CommissionSummaryFormProps) {
  const defaultFormData: CommissionSummaryFormData = {
    dataFilters: [],
    reportMode: "receipt-date",
    dateFrom: "01/Apr/2026",
    dateTo: "31/Mar/2027",
    reportDate: "01/Sep/2026",
    showDescription: false,
    billCode: "12/206",
  };

  const [formData, setFormData] = useState<CommissionSummaryFormData>(() => {
    if (initialData) return initialData;
    return defaultFormData;
  });

  const [isAgencyFilterModalOpen, setIsAgencyFilterModalOpen] = useState(false);

  const handleReset = () => {
    setFormData(defaultFormData);
    toast.success("Form reset to defaults");
  };

  const handleSave = () => {
    toast.success("Commission summary configuration saved!");
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
    <div className="mx-auto max-w-7xl space-y-6 pb-8 animate-in fade-in duration-200">
      {/* Top Banner Card (Deduction Summary & Comm Reports Style) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-2xl border border-blue-100 bg-[#f0f7ff] p-5 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-b from-[#1e3a8a] to-[#2563eb] text-white shadow-lg shadow-blue-200/50">
            <PieChart size={26} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#0f172a]">
              Commission Summary
            </h1>
            <p className="mt-0.5 text-xs sm:text-sm font-medium text-slate-500">
              Aggregated summary of total commission payouts across financial receipt dates and bill codes.
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
                  Select agency filter options and servicing criteria.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-5 max-w-4xl">
            {/* Filter Options (Agency Modal Trigger) */}
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
          </div>
        </div>

        {/* Section 2: Report Options */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#1877F2] via-[#2563eb] to-transparent" />

          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-[#1877F2]">
                2
              </span>
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Report Options
                </h2>
                <p className="text-xs text-slate-500">
                  Configure presentation mode, date ranges, and breakdown descriptions.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-6 max-w-4xl">
            {/* Mode: Receipt Date vs Bill Code */}
            <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                <Layers size={13} className="text-[#1877F2]" />
                Report Mode
              </label>

              <div className="sm:col-span-3 flex items-center gap-10">
                <label className="flex items-center gap-2.5 text-xs font-semibold text-slate-800 cursor-pointer select-none">
                  <input
                    type="radio"
                    name="reportMode"
                    value="receipt-date"
                    checked={formData.reportMode === "receipt-date"}
                    onChange={() =>
                      setFormData((prev) => ({ ...prev, reportMode: "receipt-date" }))
                    }
                    className="h-4 w-4 text-[#1877F2] focus:ring-[#1877F2]"
                  />
                  <span>Receipt Date</span>
                </label>

                <label className="flex items-center gap-2.5 text-xs font-semibold text-slate-800 cursor-pointer select-none">
                  <input
                    type="radio"
                    name="reportMode"
                    value="bill-code"
                    checked={formData.reportMode === "bill-code"}
                    onChange={() =>
                      setFormData((prev) => ({ ...prev, reportMode: "bill-code" }))
                    }
                    className="h-4 w-4 text-[#1877F2] focus:ring-[#1877F2]"
                  />
                  <span>Bill Code</span>
                </label>
              </div>
            </div>

            {/* Date Range: Date From & To Date */}
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

            {/* Bill Code input when Bill Code mode is active */}
            {formData.reportMode === "bill-code" && (
              <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Bill Code (mm/yy)
                </label>
                <div className="sm:col-span-3 max-w-sm">
                  <div className="relative">
                    <span className="absolute -top-2 left-3 bg-white px-1 text-[10px] text-[#1877F2] font-bold uppercase">
                      Bill Date
                    </span>
                    <input
                      type="text"
                      value={formData.billCode || ""}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, billCode: e.target.value }))
                      }
                      placeholder="12/206"
                      className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#1877F2] focus:ring-2 focus:ring-blue-500/15 transition bg-slate-50/40"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Report Date & Show Description */}
            <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Date of Report
              </label>

              <div className="sm:col-span-3 flex flex-col sm:flex-row sm:items-center gap-6">
                <div className="relative max-w-xs w-full">
                  <span className="absolute -top-2 left-3 bg-white px-1 text-[10px] text-[#1877F2] font-bold uppercase">
                    Date of Report
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

                <label className="flex items-center gap-2 text-xs font-semibold text-slate-800 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={formData.showDescription}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, showDescription: e.target.checked }))
                    }
                    className="h-4 w-4 rounded border-slate-300 text-[#1877F2] focus:ring-[#1877F2]"
                  />
                  <span>Show Description</span>
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
            <span>Generate Commission Summary Report</span>
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
