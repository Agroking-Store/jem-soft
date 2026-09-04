"use client";

import { useState } from "react";
import {
  RotateCcw,
  Save,
  Filter,
  Calendar as CalendarIcon,
  ArrowLeft,
  ArrowRight,
  FileSpreadsheet,
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
    <div className="mx-auto max-w-7xl space-y-6 pb-12">
      {/* Top Header matching Image 1: "Commission Bill" with Right Action Icons */}
      <div className="flex items-center justify-between border-b border-blue-200 pb-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="p-1.5 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition"
            title="Back to Reports"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-xl font-bold tracking-tight text-[#1877F2]">
            Commission Bill
          </h1>
        </div>

        {/* Top Right Action Icons from Image 1: Save, Reset, PDF */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleGenerate}
            className="p-1.5 text-[#1877F2] hover:text-blue-700 transition"
            title="Save / Apply"
          >
            <Save size={20} />
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="p-1.5 text-[#1877F2] hover:text-blue-700 transition"
            title="Reset to Defaults"
          >
            <RotateCcw size={20} />
          </button>
          <button
            type="button"
            onClick={handleGenerate}
            className="p-1.5 text-[#1877F2] hover:text-blue-700 transition"
            title="Generate / View Report"
          >
            <FileSpreadsheet size={20} />
          </button>
        </div>
      </div>

      {/* Main Form Body */}
      <div className="space-y-6">
        {/* CARD 1: Data Filter Options */}
        <div className="rounded-xl border border-blue-100 bg-gradient-to-b from-[#f8faff] to-white p-6 shadow-xs relative">
          <h2 className="text-sm font-bold tracking-wide text-[#1877F2] mb-6">
            Data Filter Options
          </h2>

          <div className="space-y-5 max-w-2xl">
            {/* Filter Options Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 items-center gap-4">
              <label className="text-xs font-semibold text-slate-700">
                Filter Options
              </label>

              <div className="sm:col-span-2 flex items-center gap-3">
                <div className="relative flex-1">
                  <span className="absolute -top-2 left-2.5 bg-white px-1.5 text-[10px] font-semibold text-[#1877F2]">
                    Selected Filter
                  </span>
                  <input
                    type="text"
                    readOnly
                    value={getFilterDisplayLabel()}
                    onClick={() => setIsAgencyFilterModalOpen(true)}
                    className="w-full rounded-md border border-slate-300 bg-white px-3.5 py-2 text-xs font-medium text-slate-800 shadow-2xs cursor-pointer focus:outline-none focus:border-[#1877F2]"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => setIsAgencyFilterModalOpen(true)}
                  className="p-2 text-[#1877F2] hover:bg-blue-50 rounded-md transition"
                  title="Select Filter Agencies"
                >
                  <Filter size={18} className="fill-[#1877F2]" />
                </button>
              </div>
            </div>

            {/* Report Date Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 items-center gap-4">
              <label className="text-xs font-semibold text-slate-700">
                Report Date
              </label>

              <div className="sm:col-span-2 flex items-center gap-3">
                <div className="relative flex-1">
                  <span className="absolute -top-2 left-2.5 bg-white px-1.5 text-[10px] font-semibold text-[#1877F2]">
                    Report Date
                  </span>
                  <div className="flex items-center rounded-md border border-slate-300 bg-white px-3 py-1.5 shadow-2xs focus-within:border-[#1877F2]">
                    <input
                      type="text"
                      value={formData.reportDate}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, reportDate: e.target.value }))
                      }
                      placeholder="01/Sep/2026"
                      className="w-full text-xs font-medium text-slate-800 focus:outline-none bg-transparent"
                    />
                    <CalendarIcon size={16} className="text-[#1877F2] shrink-0" />
                  </div>
                </div>
                {/* Spacer matching filter icon width */}
                <div className="w-[34px]" />
              </div>
            </div>
          </div>
        </div>

        {/* CARD 2: Commission Bill */}
        <div className="rounded-xl border border-blue-100 bg-gradient-to-b from-[#f8faff] to-white p-6 shadow-xs relative">
          <h2 className="text-sm font-bold tracking-wide text-[#1877F2] mb-6">
            Commission Bill
          </h2>

          <div className="space-y-6 max-w-2xl">
            {/* Radio Options: Consolidated Bill vs Agent Wise Bill */}
            <div className="flex items-center gap-8 pl-1">
              <label className="flex items-center gap-2.5 text-xs font-medium text-slate-800 cursor-pointer select-none">
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

              <label className="flex items-center gap-2.5 text-xs font-medium text-slate-800 cursor-pointer select-none">
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

            {/* Commission Bill code(mm/yy) Input */}
            <div className="grid grid-cols-1 sm:grid-cols-3 items-center gap-4">
              <label className="text-xs font-semibold text-slate-700">
                Commission Bill code(mm/yy)
              </label>

              <div className="sm:col-span-2">
                <div className="relative max-w-xs">
                  <span className="absolute -top-2 left-2.5 bg-white px-1.5 text-[10px] font-semibold text-[#1877F2]">
                    Bill Date
                  </span>
                  <input
                    type="text"
                    value={formData.billCode}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, billCode: e.target.value }))
                    }
                    placeholder="12/206"
                    className="w-full rounded-md border border-slate-300 bg-white px-3.5 py-2 text-xs font-medium text-slate-800 shadow-2xs focus:outline-none focus:border-[#1877F2]"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Actions Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <button
            type="button"
            onClick={onBack}
            className="w-full sm:w-auto px-5 py-2.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
          >
            Cancel / Back
          </button>

          <button
            type="button"
            onClick={handleGenerate}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg bg-[#1877F2] text-xs font-semibold text-white shadow-sm hover:bg-blue-600 active:scale-[0.98] transition"
          >
            <span>Generate Commission Bill Report</span>
            <ArrowRight size={15} />
          </button>
        </div>
      </div>

      {/* Agency Filter Modal: allows filtering by Jayant Mahabole, Manisha Y Mahabole, Other Agencies */}
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
