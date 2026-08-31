"use client";

import { useState } from "react";
import {
  Save,
  RotateCcw,
  FileText,
  Filter,
  FilterX,
  ArrowRight,
} from "lucide-react";
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
  customers: Array<any>;
  policies: Array<any>;
  onBack: () => void;
  onGenerateReport: (formData: CommissionLedgerFormData) => void;
}

export default function CommissionLedgerForm({
  initialData,
  agencies,
  customers,
  policies,
  onBack,
  onGenerateReport,
}: CommissionLedgerFormProps) {

  const defaultFormData: CommissionLedgerFormData = {
    fromDate: "2026-06-01",
    toDate: "2026-06-30",
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

  const handleReset = () => {
    setFormData(defaultFormData);
    setIsProcessed(false);
  };
  
  const handleProcess = () => {
    setIsProcessed(true);
  };
  
  const handleResetProcess = () => {
    setIsProcessed(false);
  };

  const handleGenerateReport = () => {
    onGenerateReport(formData);
  };

  const getDataFilterLabel = () => {
    const selectedCount = formData.dataFilters?.length || 0;
    if (selectedCount > 0) {
      return `${selectedCount} filter applied`;
    }
    return "All filters Selected";
  };
  
  const getPolicyFilterLabel = () => {
    const selectedCount = formData.policyFilterSelection?.selectedItems?.length || 0;
    if (selectedCount > 0) {
      return `${selectedCount} filter applied`;
    }
    return "All filters Selected";
  };

  return (
    <div className="space-y-6">
      {/* Top Header Bar with Website Theme `#0B1220` and Gold `#E8C77A` */}
      <div className="relative overflow-hidden rounded-2xl bg-[#0B1220] p-6 text-white border border-slate-800 shadow-xl">
        <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#B8873A] via-[#E8C77A] to-transparent" />
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h1 className="font-serif text-xl font-bold text-[#E8C77A] tracking-wider uppercase">
              Commission Ledger
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => alert("Configuration saved!")}
              className="p-2 text-[#E8C77A] hover:bg-white/10 rounded-xl transition"
              title="Save Configuration"
            >
              <Save size={20} />
            </button>
            <button
              onClick={handleReset}
              className="p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-xl transition"
              title="Reset Form"
            >
              <RotateCcw size={20} />
            </button>
            <button
              className="p-2 text-[#E8C77A] hover:bg-white/10 rounded-xl transition"
              title="Export PDF"
            >
              <FileText size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Form Shells */}
      <div className="space-y-6">
        {/* Section 1: Data Filter Options */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#B8873A] via-[#B8873A]/40 to-transparent" />
          <div className="flex items-center gap-2 mb-6">
            <h2 className="font-serif text-sm font-bold uppercase tracking-wider text-slate-900">
              Data Filter Options
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Date Range */}
            <div className="space-y-1.5 lg:col-span-2 max-w-xl">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Date Range
              </label>
              <div className="flex items-center gap-4">
                <div className="relative flex-1">
                  <span className="absolute -top-2 left-3 bg-white px-1 text-[10px] text-[#B8873A] font-bold uppercase tracking-wider">
                    From Date
                  </span>
                  <input
                    type="date"
                    value={formData.fromDate}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, fromDate: e.target.value }))
                    }
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#B8873A]"
                  />
                </div>
                <span className="text-xs font-bold text-slate-500">To</span>
                <div className="relative flex-1">
                  <span className="absolute -top-2 left-3 bg-white px-1 text-[10px] text-[#B8873A] font-bold uppercase tracking-wider">
                    To Date
                  </span>
                  <input
                    type="date"
                    value={formData.toDate}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, toDate: e.target.value }))
                    }
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#B8873A]"
                  />
                </div>
              </div>
            </div>

            {/* Filter Options */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Filter Options
              </label>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <span className="absolute -top-2 left-3 bg-white px-1 text-[10px] text-[#B8873A] font-bold uppercase tracking-wider">
                    Selected Filter
                  </span>
                  <div className="flex items-center justify-between border border-slate-300 rounded-xl px-3 py-2 text-xs bg-white">
                    <span className="text-slate-800 font-semibold">
                      {getDataFilterLabel()}
                    </span>
                    {formData.dataFilters && formData.dataFilters.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setIsDataFilterModalOpen(true)}
                        className="px-2.5 py-1 text-[10px] font-bold text-[#0B1220] bg-[#B8873A]/15 border border-[#B8873A]/30 rounded-lg hover:bg-[#B8873A]/30 transition uppercase"
                      >
                        View Filter
                      </button>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsDataFilterModalOpen(true)}
                  className="p-2 text-[#0B1220] hover:text-[#B8873A] transition"
                  title="Filter Data"
                >
                  <Filter size={18} className={formData.dataFilters?.length ? "text-[#B8873A] fill-current" : ""} />
                </button>
                
                {formData.dataFilters && formData.dataFilters.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, dataFilters: [] }))}
                    className="p-2 text-slate-400 hover:text-red-600 transition"
                    title="Clear Filter"
                  >
                    <FilterX size={18} />
                  </button>
                )}
              </div>
            </div>
          </div>
          
          <div className="mt-6 flex justify-end">
             {!isProcessed ? (
               <button
                  type="button"
                  onClick={handleProcess}
                  className="px-6 py-2 bg-[#0B1220] text-[#E8C77A] text-xs font-bold uppercase tracking-wider rounded-xl shadow-md border border-[#E8C77A]/20 hover:bg-slate-900 transition"
                >
                  Process
               </button>
             ) : (
               <button
                  type="button"
                  onClick={handleResetProcess}
                  className="px-6 py-2 bg-[#0B1220] text-[#E8C77A] text-xs font-bold uppercase tracking-wider rounded-xl shadow-md border border-[#E8C77A]/20 hover:bg-slate-900 transition"
                >
                  Reset
               </button>
             )}
          </div>
        </div>

        {/* Section 2: Policy Filter Options - Appears after process */}
        {isProcessed && (
          <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#B8873A] via-[#B8873A]/40 to-transparent" />
            <div className="flex items-center gap-2 mb-6">
              <h2 className="font-serif text-sm font-bold uppercase tracking-wider text-slate-900">
                Policy Filter Options
              </h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {/* Select Policies */}
              <div className="space-y-1.5 max-w-sm">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Select Policies
                </label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <span className="absolute -top-2 left-3 bg-white px-1 text-[10px] text-[#B8873A] font-bold uppercase tracking-wider">
                      Selected Filter
                    </span>
                    <div className="flex items-center justify-between border border-slate-300 rounded-xl px-3 py-2 text-xs bg-white">
                      <span className="text-slate-800 font-semibold">
                         {getPolicyFilterLabel()}
                      </span>
                      {formData.policyFilterSelection?.selectedItems && formData.policyFilterSelection.selectedItems.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setIsPolicyFilterModalOpen(true)}
                          className="px-2.5 py-1 text-[10px] font-bold text-[#0B1220] bg-[#B8873A]/15 border border-[#B8873A]/30 rounded-lg hover:bg-[#B8873A]/30 transition uppercase"
                        >
                          View Filter
                        </button>
                      )}
                    </div>
                  </div>
                  
                  <button
                    type="button"
                    onClick={() => setIsPolicyFilterModalOpen(true)}
                    className="p-2 text-[#0B1220] hover:text-[#B8873A] transition"
                    title="Filter Policies"
                  >
                    <Filter size={18} className={formData.policyFilterSelection?.selectedItems?.length ? "text-[#B8873A] fill-current" : ""} />
                  </button>
                  
                  {formData.policyFilterSelection?.selectedItems && formData.policyFilterSelection.selectedItems.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, policyFilterSelection: null }))}
                      className="p-2 text-slate-400 hover:text-red-600 transition"
                      title="Clear Filter"
                    >
                      <FilterX size={18} />
                    </button>
                  )}
                </div>
              </div>
              
              {/* Checkbox */}
              <div className="lg:col-span-2 flex items-end pb-2">
                <label className="flex items-center gap-2.5 text-xs font-bold text-slate-800 cursor-pointer">
                  <input
                     type="checkbox"
                     checked={formData.includeWithoutRecord}
                     onChange={(e) => setFormData(prev => ({ ...prev, includeWithoutRecord: e.target.checked }))}
                     className="w-4 h-4 rounded border-slate-300 text-[#B8873A] focus:ring-[#B8873A]"
                  />
                  <span>Include Commission Ledger Without Premium And Commission Record</span>
                </label>
              </div>
            </div>
          </div>
        )}
        
        {/* Bottom Actions Bar */}
        <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={onBack}
            className="px-6 py-2.5 border border-slate-300 text-slate-700 font-bold text-xs rounded-xl hover:bg-white transition uppercase tracking-wider"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleGenerateReport}
            className="flex items-center gap-2 px-8 py-2.5 bg-gradient-to-r from-[#B8873A] to-[#D9AE63] text-[#0B1220] font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg hover:brightness-105 transition"
          >
            <span>Generate Report</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </div>

      {/* Modal for Data Filters using FilterOptionsModal (defaults to Agencies) */}
      <FilterOptionsModal
        isOpen={isDataFilterModalOpen}
        onClose={() => setIsDataFilterModalOpen(false)}
        agencies={agencies}
        policyStatuses={[]} // not strictly needed for just agencies
        customers={customers}
        selectedFilters={formData.dataFilters}
        onApplyFilters={(filters) =>
          setFormData((prev) => ({ ...prev, dataFilters: filters }))
        }
        enableDefaultStatusSelection={false}
        defaultCategory="Agencies"
      />
      
      {/* Modal for Policy Filters */}
      <CommissionPolicyFilterModal
        isOpen={isPolicyFilterModalOpen}
        onClose={() => setIsPolicyFilterModalOpen(false)}
        customers={customers}
        policies={policies}
        selectedFilters={formData.policyFilterSelection}
        onApplyFilters={(selection) =>
          setFormData((prev) => ({ ...prev, policyFilterSelection: selection }))
        }
      />
    </div>
  );
}
