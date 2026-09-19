"use client";

import { useState } from "react";
import { Save, RotateCcw, FileText, Filter, ChevronLeft, ArrowRight } from "lucide-react";
import FilterOptionsModal, { SelectedFilterItem } from "./FilterOptionsModal";
import SortingFilterModal, { SortingFilterSelection } from "./SortingFilterModal";
import SelectGroupModal, { GroupFilterItem } from "./SelectGroupModal";

export interface LastPremiumStatementFormData {
  appliedFilters: SelectedFilterItem[];
  fromDate: string;
  toDate: string;
  reportDate: string;
  modeToInclude: {
    nonMonthly: boolean;
    monthly: boolean;
  };
  calculationOptions: {
    loyaltyAddition: boolean;
    fab: boolean;
  };
  sortingOption:
    | "groupsWise"
    | "groupMemberwise"
    | "subAreaWise"
    | "dueDate"
    | "branchNoWise"
    | "policyNoWise"
    | "pincode";
  selectedGroups: GroupFilterItem[];
  sortingFilterSelection: SortingFilterSelection | null;
  reportOptions: {
    printAddress: boolean;
    printTelNo: boolean;
  };
}

interface LastPremiumStatementFormProps {
  onBack: () => void;
  onGenerateReport: (formData: LastPremiumStatementFormData) => void;
  initialData?: LastPremiumStatementFormData | null;
  agencies: Array<{ id: string; agencyName: string; agencyCode: string }>;
  policyStatuses: Array<{ id: string; statusName: string; statusCode: string }>;
  customers: Array<{
    id: string;
    groupCode?: string | null;
    name: string;
    groupName?: string | null;
    resArea?: string | null;
    resCity?: string | null;
    resPincode?: string | null;
  }>;
  policies: Array<any>;
  branches?: Array<{ id: string; branchCode: string; branchName: string }>;
}

const getDefaultDateRange = () => {
  const today = new Date();
  const year = today.getFullYear();
  return {
    fromDate: `${year}-01-01`,
    toDate: `${year}-12-31`,
    reportDate: today.toISOString().split("T")[0],
  };
};

// Mode to Include and Calculation Options come pre-checked by default (matches
// the reference screenshot); every other filter starts empty/unselected.
const getDefaultFormData = (): LastPremiumStatementFormData => {
  const dates = getDefaultDateRange();
  return {
    appliedFilters: [],
    fromDate: dates.fromDate,
    toDate: dates.toDate,
    reportDate: dates.reportDate,
    modeToInclude: {
      nonMonthly: true,
      monthly: true,
    },
    calculationOptions: {
      loyaltyAddition: true,
      fab: true,
    },
    sortingOption: "groupsWise",
    selectedGroups: [],
    sortingFilterSelection: null,
    reportOptions: {
      printAddress: false,
      printTelNo: false,
    },
  };
};

export default function LastPremiumStatementForm({
  onBack,
  onGenerateReport,
  initialData,
  agencies,
  policyStatuses,
  customers,
  policies,
  branches = [],
}: LastPremiumStatementFormProps) {
  const [formData, setFormData] = useState<LastPremiumStatementFormData>(initialData || getDefaultFormData());
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [isSortingModalOpen, setIsSortingModalOpen] = useState(false);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);

  const handleReset = () => setFormData(getDefaultFormData());

  const getSelectGroupsLabel = () => {
    if (formData.sortingOption === "groupsWise") {
      const count = formData.selectedGroups.length;
      return count > 0 ? `${count} Groups selected` : "All Groups Selected";
    }
    const count = formData.sortingFilterSelection?.selectedItems?.length || 0;
    if (count > 0) return `${count} item(s) selected`;
    switch (formData.sortingOption) {
      case "groupMemberwise":
        return "All Members Selected";
      case "subAreaWise":
        return "All Sub-Areas Selected";
      case "dueDate":
        return "All Due Dates Selected";
      case "branchNoWise":
        return "All Branches Selected";
      case "policyNoWise":
        return "All Policies Selected";
      case "pincode":
        return "All Pincodes Selected";
      default:
        return "All Groups Selected";
    }
  };

  const openSelectGroupsModal = () => {
    if (formData.sortingOption === "groupsWise") setIsGroupModalOpen(true);
    else setIsSortingModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-500 hover:bg-slate-50 transition-colors uppercase tracking-wider"
          >
            <ChevronLeft size={18} />
            <span>Reports</span>
          </button>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Last Premium Statement
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => alert("Filter configuration saved!")} className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors" title="Save Configuration">
            <Save size={17} />
          </button>
          <button onClick={handleReset} className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors" title="Reset Form">
            <RotateCcw size={17} />
          </button>
          <button onClick={() => onGenerateReport(formData)} className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#5c67ff] to-[#3a47ff] px-4 py-2 text-xs font-bold text-white shadow-md shadow-blue-200 transition-all hover:brightness-110 active:scale-[0.98] uppercase tracking-wider" title="Generate Report">
            <FileText size={15} /><span>Generate</span>
          </button>
        </div>
      </div>

      <div className="space-y-6">
        {/* Section 1: Filter Options */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#1877F2] via-[#1877F2]/40 to-transparent" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 mb-4">Filter Options</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Filter Options</label>
              <div className="flex items-center gap-3">
                <div className="relative flex-1">
                  <span className="absolute -top-2 left-3 bg-white px-1 text-[10px] text-[#1877F2] font-bold uppercase tracking-wider">Selected Filter</span>
                  <input
                    type="text"
                    readOnly
                    value={
                      formData.appliedFilters.length > 0
                        ? `${formData.appliedFilters.length} filter${formData.appliedFilters.length > 1 ? "s" : ""} selected`
                        : "All filters Selected"
                    }
                    onClick={() => setIsFilterModalOpen(true)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 cursor-pointer"
                  />
                </div>
                <button type="button" onClick={() => setIsFilterModalOpen(true)} className="p-2.5 bg-gradient-to-r from-[#5c67ff] to-[#3a47ff] text-white rounded-xl transition shadow-md border border-slate-800" title="Open Filter Options">
                  <Filter size={16} />
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Date Range (Last Premium Paid)</label>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={formData.fromDate}
                  onChange={(e) => setFormData((prev) => ({ ...prev, fromDate: e.target.value }))}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#1877F2]"
                />
                <span className="text-xs font-bold text-slate-500">To</span>
                <input
                  type="date"
                  value={formData.toDate}
                  onChange={(e) => setFormData((prev) => ({ ...prev, toDate: e.target.value }))}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#1877F2]"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Report Date</label>
              <input
                type="date"
                value={formData.reportDate}
                onChange={(e) => setFormData((prev) => ({ ...prev, reportDate: e.target.value }))}
                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#1877F2]"
              />
            </div>
          </div>
        </div>

        {/* Section 2 & 3: Mode to Include + Calculation Options (side by side) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#1877F2] via-[#1877F2]/40 to-transparent" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 mb-4">Mode to Include</h2>
            <div className="flex items-center gap-8">
              <label className="flex items-center gap-2.5 text-xs font-bold text-slate-800 hover:text-[#1877F2] cursor-pointer transition">
                <input
                  type="checkbox"
                  checked={formData.modeToInclude.nonMonthly}
                  onChange={(e) => setFormData((prev) => ({ ...prev, modeToInclude: { ...prev.modeToInclude, nonMonthly: e.target.checked } }))}
                  className="w-4 h-4 rounded border-slate-300 text-[#1877F2] focus:ring-[#1877F2]"
                />
                <span>Non-Monthly</span>
              </label>
              <label className="flex items-center gap-2.5 text-xs font-bold text-slate-800 hover:text-[#1877F2] cursor-pointer transition">
                <input
                  type="checkbox"
                  checked={formData.modeToInclude.monthly}
                  onChange={(e) => setFormData((prev) => ({ ...prev, modeToInclude: { ...prev.modeToInclude, monthly: e.target.checked } }))}
                  className="w-4 h-4 rounded border-slate-300 text-[#1877F2] focus:ring-[#1877F2]"
                />
                <span>Monthly</span>
              </label>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#1877F2] via-[#1877F2]/40 to-transparent" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 mb-4">Calculation Options</h2>
            <div className="flex items-center gap-8">
              <label className="flex items-center gap-2.5 text-xs font-bold text-slate-800 hover:text-[#1877F2] cursor-pointer transition">
                <input
                  type="checkbox"
                  checked={formData.calculationOptions.loyaltyAddition}
                  onChange={(e) => setFormData((prev) => ({ ...prev, calculationOptions: { ...prev.calculationOptions, loyaltyAddition: e.target.checked } }))}
                  className="w-4 h-4 rounded border-slate-300 text-[#1877F2] focus:ring-[#1877F2]"
                />
                <span>Loyalty Addition</span>
              </label>
              <label className="flex items-center gap-2.5 text-xs font-bold text-slate-800 hover:text-[#1877F2] cursor-pointer transition">
                <input
                  type="checkbox"
                  checked={formData.calculationOptions.fab}
                  onChange={(e) => setFormData((prev) => ({ ...prev, calculationOptions: { ...prev.calculationOptions, fab: e.target.checked } }))}
                  className="w-4 h-4 rounded border-slate-300 text-[#1877F2] focus:ring-[#1877F2]"
                />
                <span>FAB</span>
              </label>
            </div>
          </div>
        </div>

        {/* Section 4: Sorting Options */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#1877F2] via-[#1877F2]/40 to-transparent" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 mb-4">Sorting Options</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-y-3.5 gap-x-6">
            {[
              { id: "groupsWise", label: "Groups Wise" },
              { id: "groupMemberwise", label: "Group Memberwise" },
              { id: "subAreaWise", label: "Sub-Area Wise" },
              { id: "dueDate", label: "Due-Date" },
              { id: "branchNoWise", label: "Branch No. Wise" },
              { id: "policyNoWise", label: "Policy No. Wise" },
              { id: "pincode", label: "Pincode" },
            ].map((opt) => (
              <label key={opt.id} className="flex items-center gap-2.5 text-xs font-bold text-slate-800 hover:text-[#1877F2] cursor-pointer transition">
                <input
                  type="radio"
                  name="sortingOption"
                  checked={formData.sortingOption === opt.id}
                  onChange={() => setFormData((prev) => ({ ...prev, sortingOption: opt.id as any, selectedGroups: [], sortingFilterSelection: null }))}
                  className="w-4 h-4 text-[#1877F2] focus:ring-[#1877F2] border-slate-300"
                />
                <span>{opt.label}</span>
              </label>
            ))}
          </div>

          <div className="pt-5 max-w-lg">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider whitespace-nowrap">Select Groups</span>
              <input
                type="text"
                readOnly
                value={getSelectGroupsLabel()}
                onClick={openSelectGroupsModal}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 cursor-pointer"
              />
              <button type="button" onClick={openSelectGroupsModal} className="p-2.5 bg-gradient-to-r from-[#5c67ff] to-[#3a47ff] text-white rounded-xl transition shadow-md border border-slate-800" title="Open Select Groups Modal">
                <Filter size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Section 5: Report Options */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#1877F2] via-[#1877F2]/40 to-transparent" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 mb-4">Report Options</h2>
          <div className="flex items-center gap-8">
            <label className="flex items-center gap-2.5 text-xs font-bold text-slate-800 hover:text-[#1877F2] cursor-pointer transition">
              <input
                type="checkbox"
                checked={formData.reportOptions.printAddress}
                onChange={(e) => setFormData((prev) => ({ ...prev, reportOptions: { ...prev.reportOptions, printAddress: e.target.checked } }))}
                className="w-4 h-4 rounded border-slate-300 text-[#1877F2] focus:ring-[#1877F2]"
              />
              <span>Statement with Address</span>
            </label>
            <label className="flex items-center gap-2.5 text-xs font-bold text-slate-800 hover:text-[#1877F2] cursor-pointer transition">
              <input
                type="checkbox"
                checked={formData.reportOptions.printTelNo}
                onChange={(e) => setFormData((prev) => ({ ...prev, reportOptions: { ...prev.reportOptions, printTelNo: e.target.checked } }))}
                className="w-4 h-4 rounded border-slate-300 text-[#1877F2] focus:ring-[#1877F2]"
              />
              <span>Statement with Tel Nos.</span>
            </label>
          </div>
        </div>

        <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between">
          <button type="button" onClick={onBack} className="px-6 py-2.5 border border-slate-300 text-slate-700 font-bold text-xs rounded-xl hover:bg-white transition uppercase tracking-wider">
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onGenerateReport(formData)}
            className="flex items-center gap-2 px-8 py-2.5 bg-gradient-to-r from-[#5c67ff] to-[#3a47ff] text-white shadow-blue-200 font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg hover:brightness-105 transition"
          >
            <span>Generate Report</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </div>

      <FilterOptionsModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        agencies={agencies}
        policyStatuses={policyStatuses}
        customers={customers}
        selectedFilters={formData.appliedFilters}
        onApplyFilters={(filters) => setFormData((prev) => ({ ...prev, appliedFilters: filters }))}
        enableDefaultStatusSelection={false}
      />
      <SelectGroupModal
        isOpen={isGroupModalOpen}
        onClose={() => setIsGroupModalOpen(false)}
        customers={customers}
        selectedGroups={formData.selectedGroups}
        onApplyGroups={(groups) => setFormData((prev) => ({ ...prev, selectedGroups: groups }))}
      />
      <SortingFilterModal
        isOpen={isSortingModalOpen}
        onClose={() => setIsSortingModalOpen(false)}
        sortingOption={formData.sortingOption}
        customers={customers}
        policies={policies}
        branches={branches}
        selectedFilters={formData.sortingFilterSelection}
        onApplySortingFilter={(selection) => setFormData((prev) => ({ ...prev, sortingFilterSelection: selection }))}
      />
    </div>
  );
}