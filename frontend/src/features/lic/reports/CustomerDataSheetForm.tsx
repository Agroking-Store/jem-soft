"use client";

import { useState } from "react";
import {
  Save,
  RotateCcw,
  FileText,
  Filter,
  FilterX,
  ChevronLeft,
  ArrowRight,
} from "lucide-react";
import CustomerDataSheetFilterModal, { SelectedFilterItem } from "./CustomerDataSheetFilterModal";
import type { Customer, CustomerMaster } from "@/features/customers/types";

export interface CustomerDataSheetFormData {
  appliedFilters: SelectedFilterItem[];
  reportDate: string;
  reportOptions: {
    printPolicyOnNewPage: boolean;
    printRemarksInPolicy: boolean;
    printBankDetails: boolean;
  };
}

interface CustomerDataSheetFormProps {
  onBack: () => void;
  onGenerateReport: (formData: CustomerDataSheetFormData) => void;
  initialData?: CustomerDataSheetFormData | null;
  customers: Customer[];
  customersMaster: CustomerMaster[];
  agencies?: Array<{ id: string; agencyName: string; agencyCode: string }>;
  policyStatuses?: Array<{ id: string; statusName: string; statusCode: string }>;
}

export default function CustomerDataSheetForm({
  onBack,
  onGenerateReport,
  initialData,
  customers = [],
  customersMaster = [],
  agencies = [],
  policyStatuses = [],
}: CustomerDataSheetFormProps) {
  const getTodayDateStr = () => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  const defaultFormData: CustomerDataSheetFormData = {
    appliedFilters: [],
    reportDate: getTodayDateStr(),
    reportOptions: {
      printPolicyOnNewPage: false,
      printRemarksInPolicy: false,
      printBankDetails: false,
    },
  };

  const [formData, setFormData] = useState<CustomerDataSheetFormData>(() => {
    if (initialData) return initialData;
    return defaultFormData;
  });

  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

  const handleReset = () => {
    setFormData(defaultFormData);
  };

  const handleApplyFilters = (filters: SelectedFilterItem[]) => {
    setFormData((prev) => ({
      ...prev,
      appliedFilters: filters,
    }));
  };

  const clientSelectionDisplay = () => {
    if (!formData.appliedFilters || formData.appliedFilters.length === 0) {
      return "All filters Selected";
    }
    if (formData.appliedFilters.length === 1) {
      return formData.appliedFilters[0].name;
    }
    return `${formData.appliedFilters.length} filters selected`;
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    onGenerateReport(formData);
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Action Bar matching Policy Register */}
      <div className="relative overflow-hidden bg-[#0B1220] rounded-2xl p-4 sm:p-5 text-white shadow-xl border border-slate-800">
        <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#B8873A] via-[#E8C77A] to-transparent" />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-300 bg-white/10 rounded-xl hover:bg-white/20 transition uppercase tracking-wider cursor-pointer"
            >
              <ChevronLeft size={16} />
              <span>Reports</span>
            </button>
            <div className="h-6 w-px bg-white/15" />
            <h1 className="font-serif text-lg sm:text-xl font-bold text-[#E8C77A] tracking-wider uppercase">
              Customer Data Sheet
            </h1>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              type="button"
              onClick={handleReset}
              className="p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-xl transition cursor-pointer"
              title="Reset Form"
            >
              <RotateCcw size={19} />
            </button>
            <button
              type="button"
              onClick={() => onGenerateReport(formData)}
              className="p-2 text-[#E8C77A] hover:bg-white/10 rounded-xl transition cursor-pointer"
              title="Generate Report"
            >
              <FileText size={19} />
            </button>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Data Filteration Options */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#B8873A] via-[#B8873A]/40 to-transparent" />
          <div className="flex items-center gap-2 mb-4">
            <h2 className="font-serif text-sm font-bold uppercase tracking-wider text-slate-900">
              Data Filteration Options
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            {/* Client Selection */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Client Selection
              </label>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <span className="absolute -top-2 left-3 bg-white px-1 text-[10px] text-[#B8873A] font-bold uppercase tracking-wider">
                    Selected Filter
                  </span>
                  <div className="flex items-center justify-between border border-slate-300 rounded-xl px-3 py-2 text-xs bg-white">
                    <span className="text-slate-800 font-semibold truncate max-w-[220px]">
                      {clientSelectionDisplay()}
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsFilterModalOpen(true)}
                      className="px-2.5 py-1 text-xs font-bold text-[#0B1220] bg-[#B8873A]/15 border border-[#B8873A]/30 rounded-lg hover:bg-[#B8873A]/30 transition cursor-pointer"
                    >
                      Filter
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, appliedFilters: [] }))}
                  className="p-2 text-slate-400 hover:text-red-600 transition cursor-pointer"
                  title="Clear applied filters"
                >
                  <FilterX size={18} />
                </button>
              </div>
            </div>

            {/* Report Date */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Report Date
              </label>
              <div className="relative">
                <span className="absolute -top-2 left-3 bg-white px-1 text-[10px] text-[#B8873A] font-bold uppercase tracking-wider">
                  Report Date
                </span>
                <input
                  type="date"
                  value={formData.reportDate}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, reportDate: e.target.value }))
                  }
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 font-medium focus:outline-none focus:border-[#B8873A] focus:ring-2 focus:ring-[#B8873A]/20"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Report Options */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#B8873A] via-[#B8873A]/40 to-transparent" />
          <div className="flex items-center gap-2 mb-4">
            <h2 className="font-serif text-sm font-bold uppercase tracking-wider text-slate-900">
              Report Options
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
            <label className="flex items-center gap-3 cursor-pointer select-none bg-slate-50 hover:bg-[#B8873A]/5 p-3 rounded-xl border border-slate-200 transition">
              <input
                type="checkbox"
                checked={formData.reportOptions.printPolicyOnNewPage}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    reportOptions: {
                      ...prev.reportOptions,
                      printPolicyOnNewPage: e.target.checked,
                    },
                  }))
                }
                className="w-4 h-4 rounded border-slate-300 text-[#B8873A] focus:ring-[#B8873A] cursor-pointer"
              />
              <span className="text-xs text-slate-800 font-semibold">
                Print Policy Details on New Page
              </span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer select-none bg-slate-50 hover:bg-[#B8873A]/5 p-3 rounded-xl border border-slate-200 transition">
              <input
                type="checkbox"
                checked={formData.reportOptions.printRemarksInPolicy}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    reportOptions: {
                      ...prev.reportOptions,
                      printRemarksInPolicy: e.target.checked,
                    },
                  }))
                }
                className="w-4 h-4 rounded border-slate-300 text-[#B8873A] focus:ring-[#B8873A] cursor-pointer"
              />
              <span className="text-xs text-slate-800 font-semibold">
                Print Remarks in Policy Details
              </span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer select-none bg-slate-50 hover:bg-[#B8873A]/5 p-3 rounded-xl border border-slate-200 transition">
              <input
                type="checkbox"
                checked={formData.reportOptions.printBankDetails}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    reportOptions: {
                      ...prev.reportOptions,
                      printBankDetails: e.target.checked,
                    },
                  }))
                }
                className="w-4 h-4 rounded border-slate-300 text-[#B8873A] focus:ring-[#B8873A] cursor-pointer"
              />
              <span className="text-xs text-slate-800 font-semibold">
                Print Bank Details
              </span>
            </label>
          </div>
        </div>

        {/* Bottom Submission Action Button */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            className="px-8 py-3 bg-gradient-to-r from-[#B8873A] to-[#D9AE63] text-[#0B1220] font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg hover:brightness-105 transition flex items-center gap-2 cursor-pointer"
          >
            <span>Generate Customer Data Sheet</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </form>

      {/* Dynamic Filter Options Modal */}
      <CustomerDataSheetFilterModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        customers={customers}
        customersMaster={customersMaster}
        agencies={agencies}
        policyStatuses={policyStatuses}
        selectedFilters={formData.appliedFilters}
        onApplyFilters={handleApplyFilters}
      />
    </div>
  );
}
