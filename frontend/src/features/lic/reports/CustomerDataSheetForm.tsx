"use client";

import { useState } from "react";
import { Save, RotateCcw, FileDown, Filter, ChevronLeft, ArrowRight } from "lucide-react";
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
      {/* Top Header & Action Bar matching screenshot */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="p-2 border border-slate-200 rounded-xl hover:bg-slate-100 text-slate-700 transition"
            title="Back to Reports"
          >
            <ChevronLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-[#02569B] tracking-tight">
              Customer Data Sheet
            </h1>
          </div>
        </div>

        {/* Top Right Actions */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            type="button"
            onClick={handleSubmit}
            className="p-2 rounded-lg bg-[#02569B] text-white hover:bg-[#014175] transition shadow-xs"
            title="Save / View Report"
          >
            <Save size={19} />
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="p-2 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition shadow-xs"
            title="Reset Form"
          >
            <RotateCcw size={19} />
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="p-2 rounded-lg bg-[#02569B] text-white hover:bg-[#014175] transition shadow-xs"
            title="Generate & View PDF Report"
          >
            <FileDown size={19} />
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Data Filteration Options */}
        <div className="rounded-2xl border border-blue-100 bg-white shadow-xs overflow-hidden">
          <div className="bg-gradient-to-r from-blue-50/90 via-sky-50/50 to-white px-6 py-3 border-b border-blue-100">
            <h2 className="text-sm font-bold text-[#02569B] tracking-wide">
              Data Filteration Options
            </h2>
          </div>

          <div className="p-6 space-y-6">
            {/* Client Selection Row */}
            <div className="grid grid-cols-1 md:grid-cols-12 items-center gap-4">
              <label className="md:col-span-3 text-xs font-semibold text-slate-700">
                Client Selection
              </label>
              <div className="md:col-span-9 flex items-center gap-3">
                <div className="relative flex-1 max-w-md">
                  <div className="relative border border-slate-300 rounded-lg px-3.5 pt-2 pb-1.5 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 bg-white shadow-xs">
                    <span className="absolute -top-2.5 left-3 bg-white px-1 text-[10px] font-semibold text-slate-500">
                      Selected Filter
                    </span>
                    <input
                      type="text"
                      readOnly
                      value={clientSelectionDisplay()}
                      onClick={() => setIsFilterModalOpen(true)}
                      className="w-full text-xs text-slate-800 font-medium bg-transparent outline-none cursor-pointer"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsFilterModalOpen(true)}
                  className="p-2 text-[#02569B] hover:bg-blue-50 rounded-lg transition"
                  title="Open Filter Options"
                >
                  <Filter size={20} className="fill-[#02569B]/20" />
                </button>
              </div>
            </div>

            {/* Report Date Row */}
            <div className="grid grid-cols-1 md:grid-cols-12 items-center gap-4">
              <label className="md:col-span-3 text-xs font-semibold text-slate-700">
                Report Date
              </label>
              <div className="md:col-span-9 max-w-md">
                <div className="relative border border-slate-300 rounded-lg px-3.5 pt-2 pb-1.5 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 bg-white shadow-xs">
                  <span className="absolute -top-2.5 left-3 bg-white px-1 text-[10px] font-semibold text-slate-500">
                    Report Date
                  </span>
                  <input
                    type="date"
                    value={formData.reportDate}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, reportDate: e.target.value }))
                    }
                    className="w-full text-xs text-slate-800 font-medium bg-transparent outline-none cursor-pointer"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Report Options */}
        <div className="rounded-2xl border border-blue-100 bg-white shadow-xs overflow-hidden">
          <div className="bg-gradient-to-r from-blue-50/90 via-sky-50/50 to-white px-6 py-3 border-b border-blue-100">
            <h2 className="text-sm font-bold text-[#02569B] tracking-wide">
              Report Options
            </h2>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <label className="flex items-center gap-3 cursor-pointer select-none">
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
                  className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-xs text-slate-700 font-medium">
                  Print Policy Details on New Page
                </span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer select-none">
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
                  className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-xs text-slate-700 font-medium">
                  Print Remarks in Policy Details
                </span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer select-none">
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
                  className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-xs text-slate-700 font-medium">
                  Print Bank Details
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* Bottom Submission / Generate Report Button */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            className="px-6 py-2.5 bg-gradient-to-r from-[#02569B] to-[#014175] text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-md hover:brightness-110 transition flex items-center gap-2 cursor-pointer"
          >
            <span>Generate Customer Data Sheet</span>
            <ArrowRight size={15} />
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
