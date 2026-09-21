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
      {/* Top Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-500 hover:bg-slate-50 transition-colors uppercase tracking-wider">
            <ChevronLeft size={18} />
            <span>Reports</span>
          </button>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Customer Data Sheet</h1>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={handleReset} className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors" title="Reset"><RotateCcw size={17} /></button>
          <button type="button" onClick={() => onGenerateReport(formData)} className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#5c67ff] to-[#3a47ff] px-4 py-2 text-xs font-bold text-white shadow-md shadow-blue-200 transition-all hover:brightness-110 active:scale-[0.98] uppercase tracking-wider"><FileText size={15} /><span>Generate</span></button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Data Filteration Options */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#1877F2] via-[#1877F2]/40 to-transparent" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 mb-4">Data Filteration Options</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            {/* Client Selection */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Client Selection
              </label>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <span className="absolute -top-2 left-3 bg-white px-1 text-[10px] text-[#1877F2] font-bold uppercase tracking-wider">
                    Selected Filter
                  </span>
                  <div className="flex items-center justify-between border border-slate-300 rounded-xl px-3 py-2 text-xs bg-white">
                    <span className="text-slate-800 font-semibold truncate max-w-[220px]">
                      {clientSelectionDisplay()}
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsFilterModalOpen(true)}
                      className="px-2.5 py-1 text-xs font-bold text-[#1877F2] bg-[#1877F2]/10 border border-[#1877F2]/30 rounded-lg hover:bg-[#1877F2]/20 transition cursor-pointer"
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
                <span className="absolute -top-2 left-3 bg-white px-1 text-[10px] text-[#1877F2] font-bold uppercase tracking-wider">
                  Report Date
                </span>
                <input
                  type="date"
                  value={formData.reportDate}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, reportDate: e.target.value }))
                  }
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 font-medium focus:outline-none focus:border-[#1877F2] focus:ring-2 focus:ring-[#1877F2]/20"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Report Options */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#1877F2] via-[#1877F2]/40 to-transparent" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 mb-4">Report Options</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
            <label className="flex items-center gap-3 cursor-pointer select-none bg-slate-50 hover:bg-[#1877F2]/5 p-3 rounded-xl border border-slate-200 transition">
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
                className="w-4 h-4 rounded border-slate-300 text-[#1877F2] focus:ring-[#1877F2] cursor-pointer"
              />
              <span className="text-xs text-slate-800 font-semibold">
                Print Policy Details on New Page
              </span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer select-none bg-slate-50 hover:bg-[#1877F2]/5 p-3 rounded-xl border border-slate-200 transition">
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
                className="w-4 h-4 rounded border-slate-300 text-[#1877F2] focus:ring-[#1877F2] cursor-pointer"
              />
              <span className="text-xs text-slate-800 font-semibold">
                Print Remarks in Policy Details
              </span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer select-none bg-slate-50 hover:bg-[#1877F2]/5 p-3 rounded-xl border border-slate-200 transition">
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
                className="w-4 h-4 rounded border-slate-300 text-[#1877F2] focus:ring-[#1877F2] cursor-pointer"
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
            className="px-8 py-3 bg-gradient-to-r from-[#5c67ff] to-[#3a47ff] text-white shadow-blue-200 font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg hover:brightness-105 transition flex items-center gap-2 cursor-pointer"
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