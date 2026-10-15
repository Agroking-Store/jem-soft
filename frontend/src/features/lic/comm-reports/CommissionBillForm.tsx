"use client";

import { useState } from "react";
import {
  RotateCcw,
  Filter,
  FilterX,
  Calendar as CalendarIcon,
  ArrowLeft,
  ArrowRight,
  FileSpreadsheet,
  Building2,
  Layers,
} from "lucide-react";
import CommissionAgencyFilterModal from "./CommissionAgencyFilterModal";
import { CommissionBillFormData } from "./commissionBillData";

interface CommissionBillFormProps {
  initialData?: CommissionBillFormData | null;
  onBack: () => void;
  onGenerateReport: (data: CommissionBillFormData) => void;
}

export default function CommissionBillForm({
  initialData,
  onBack,
  onGenerateReport,
}: CommissionBillFormProps) {
  const defaultFormData: CommissionBillFormData = {
    reportDate: "01/Sep/2026",
    dataFilters: [],
    billType: "agent-wise", // As checked by default in Image 1
    billCode: "12/206",
  };

  const [formData, setFormData] = useState<CommissionBillFormData>(() => {
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
      {/* Top Banner Card (Commission Ledger Style) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-2xl border border-blue-100 bg-[#f0f7ff] p-5 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-b from-[#1e3a8a] to-[#2563eb] text-white shadow-lg shadow-blue-200/50">
            <FileSpreadsheet size={26} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#0f172a]">
              Commission Bill
            </h1>
            <p className="mt-0.5 text-xs sm:text-sm font-medium text-slate-500">
              Generate commission bills based on agency records and agent payout statements.
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
                  Select agency from filter modal and set the report date.
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

            {/* Report Date */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <CalendarIcon size={13} className="text-[#1877F2]" />
                Report Date
              </label>
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
                    placeholder="01/Sep/2026"
                    className="w-full text-xs font-semibold text-slate-900 focus:outline-none bg-transparent"
                  />
                  <CalendarIcon size={16} className="text-[#1877F2] shrink-0" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Commission Bill Type & Code */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#1877F2] via-[#2563eb] to-transparent" />

          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-[#1877F2]">
                2
              </span>
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Commission Bill Options
                </h2>
                <p className="text-xs text-slate-500">
                  Select report presentation type and bill period code.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-6 max-w-4xl">
            {/* Radio Buttons for Consolidated vs Agent Wise */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Layers size={13} className="text-[#1877F2]" />
                Bill Type Format
              </label>
              <div className="flex flex-wrap items-center gap-8 pt-1">
                <label className="flex items-center gap-2.5 text-xs font-semibold text-slate-800 cursor-pointer select-none">
                  <input
                    type="radio"
                    name="billType"
                    value="consolidated"
                    checked={formData.billType === "consolidated"}
                    onChange={() =>
                      setFormData((prev) => ({ ...prev, billType: "consolidated" }))
                    }
                    className="h-4 w-4 text-[#1877F2] focus:ring-[#1877F2]"
                  />
                  <span>Consolidated Bill</span>
                </label>

                <label className="flex items-center gap-2.5 text-xs font-semibold text-slate-800 cursor-pointer select-none">
                  <input
                    type="radio"
                    name="billType"
                    value="agent-wise"
                    checked={formData.billType === "agent-wise"}
                    onChange={() =>
                      setFormData((prev) => ({ ...prev, billType: "agent-wise" }))
                    }
                    className="h-4 w-4 text-[#1877F2] focus:ring-[#1877F2]"
                  />
                  <span>Agent Wise Bill</span>
                </label>
              </div>
            </div>

            {/* Commission Bill code(mm/yy) Input */}
            <div className="space-y-1.5 max-w-sm">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Commission Bill code(mm/yy)
              </label>
              <div className="relative">
                <span className="absolute -top-2 left-3 bg-white px-1 text-[10px] text-[#1877F2] font-bold uppercase">
                  Bill Date
                </span>
                <input
                  type="text"
                  value={formData.billCode}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, billCode: e.target.value }))
                  }
                  placeholder="12/206"
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#1877F2] focus:ring-2 focus:ring-blue-500/15 transition bg-slate-50/40"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Actions Bar (Commission Ledger Style) */}
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
            <span>Generate Commission Bill Report</span>
            <ArrowRight size={15} />
          </button>
        </div>
      </div>

      {/* Modal: Commission Agency Filter Modal */}
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
