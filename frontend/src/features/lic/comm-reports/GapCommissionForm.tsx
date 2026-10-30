"use client";

import { useState, useRef } from "react";
import {
  RotateCcw,
  Filter,
  FilterX,
  Calendar as CalendarIcon,
  ArrowLeft,
  ArrowRight,
  Layers,
  Building2,
} from "lucide-react";
import CommissionAgencyFilterModal from "./CommissionAgencyFilterModal";
import { GapCommissionFormData } from "./gapCommissionData";
import toast from "react-hot-toast";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

// "2026-04-01" -> "01/Apr/2026"
const isoToDisplay = (iso: string) => {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${MONTHS[Number(m) - 1]}/${y}`;
};

// "01/Apr/2026" -> "2026-04-01"
const displayToIso = (display: string) => {
  const parts = display.split("/");
  if (parts.length !== 3) return "";
  const [d, mon, y] = parts;
  const m = MONTHS.findIndex((x) => x.toLowerCase() === mon.toLowerCase());
  if (m === -1) return "";
  return `${y}-${String(m + 1).padStart(2, "0")}-${d.padStart(2, "0")}`;
};

interface DateFieldProps {
  label: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
  className?: string;
  iconSize?: number;
}

function DateField({
  label,
  value,
  placeholder,
  onChange,
  className = "",
  iconSize = 16,
}: DateFieldProps) {
  const pickerRef = useRef<HTMLInputElement>(null);

  return (
    <div className={`relative ${className}`}>
      <span className="absolute -top-2 left-3 z-10 bg-white px-1 leading-none text-[10px] text-[#1877F2] font-bold uppercase">
        {label}
      </span>

      <div className="relative flex items-center border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs bg-slate-50/40 focus-within:border-[#1877F2] focus-within:ring-2 focus-within:ring-blue-500/15 transition">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full text-xs font-semibold text-slate-900 focus:outline-none bg-transparent"
        />

        <button
          type="button"
          onClick={() => pickerRef.current?.showPicker()}
          className="shrink-0 text-[#1877F2] hover:text-blue-800 transition"
          title="Pick a date"
        >
          <CalendarIcon size={iconSize} />
        </button>

        <input
          ref={pickerRef}
          type="date"
          value={displayToIso(value)}
          onChange={(e) => onChange(isoToDisplay(e.target.value))}
          className="pointer-events-none absolute right-2 bottom-0 h-0 w-0 opacity-0"
          tabIndex={-1}
          aria-hidden="true"
        />
      </div>
    </div>
  );
}

interface GapCommissionFormProps {
  initialData?: GapCommissionFormData | null;
  policies?: any[];
  onBack: () => void;
  onGenerateReport: (data: GapCommissionFormData) => void;
}

export default function GapCommissionForm({
  initialData,
  policies = [],
  onBack,
  onGenerateReport,
}: GapCommissionFormProps) {
  const defaultFormData: GapCommissionFormData = {
    dataFilters: [],
    dateFrom: "01/Apr/2026",
    dateTo: "31/Mar/2027",
    reportDate: "01/Sep/2026",
  };

  const [formData, setFormData] = useState<GapCommissionFormData>(() => {
    if (initialData) return initialData;
    return defaultFormData;
  });

  const [isAgencyFilterModalOpen, setIsAgencyFilterModalOpen] = useState(false);

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
      return selectedAgencies[0].name;
    }
    return `${selectedAgencies.length} agencies selected`;
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-8 animate-in fade-in duration-200">
      {/* Top Banner Card (Commission Bill Style) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-2xl border border-blue-100 bg-[#f0f7ff] p-5 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-b from-[#1e3a8a] to-[#2563eb] text-white shadow-lg shadow-blue-200/50">
            <Layers size={26} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#0f172a]">
              Gap Commissions
            </h1>
            <p className="mt-0.5 text-xs sm:text-sm font-medium text-slate-500">
              Generate gap commission statements and track missing or uncollected commission cycles.
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
                  Configure agency filter, financial year due date range, and statement report date.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-8 max-w-4xl">
            {/* Filter Options (Agencies Modal Trigger) */}
            <div className="space-y-5 md:col-span-2 max-w-md">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Building2 size={13} className="text-[#1877F2]" />
                Filter Options
              </label>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <span className="absolute -top-2 left-3 bg-white px-1 leading-none text-[10px] text-[#1877F2] font-bold uppercase z-10">
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
                        className="ml-2 shrink-0 px-2 py-0.5 text-[10px] font-bold text-[#1877F2] bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition uppercase"
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
                    onClick={() => setFormData((prev) => ({ ...prev, dataFilters: [] }))}
                    className="p-2.5 rounded-xl border border-rose-100 bg-rose-50 text-rose-600 hover:bg-rose-100 transition"
                    title="Clear Filter"
                  >
                    <FilterX size={15} />
                  </button>
                )}
              </div>
            </div>

            {/* Date Range: Date From & To */}
            <div className="space-y-5 md:col-span-2 max-w-2xl">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <CalendarIcon size={13} className="text-[#1877F2]" />
                Due Date Range
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <DateField
                  label="Date From"
                  value={formData.dateFrom}
                  placeholder="01/Apr/2026"
                  iconSize={15}
                  onChange={(v) => setFormData((prev) => ({ ...prev, dateFrom: v }))}
                   />

                <DateField
                  label="To Date"
                  value={formData.dateTo}
                  placeholder="31/Mar/2027"
                  iconSize={15}
                  onChange={(v) => setFormData((prev) => ({ ...prev, dateTo: v }))}
                   />
              </div>
            </div>

            {/* Report Date */}
            <div className="space-y-5 max-w-sm">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <CalendarIcon size={13} className="text-[#1877F2]" />
                Report Date
              </label>
              <DateField
                label="Date of Report"
                value={formData.reportDate}
                placeholder="01/Sep/2026"
                onChange={(v) => setFormData((prev) => ({ ...prev, reportDate: v }))}
                />
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
            Cancel
          </button>

          <button
            type="button"
            onClick={handleGenerate}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-2.5 bg-gradient-to-r from-[#5c67ff] to-[#3a47ff] text-white font-semibold text-xs rounded-xl shadow-md shadow-blue-200 hover:brightness-110 active:scale-[0.98] transition"
          >
            <span>Generate Gap Commission Report</span>
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
