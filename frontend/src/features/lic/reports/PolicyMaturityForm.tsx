"use client";

import { useState } from "react";
import { Save, RotateCcw, FileText, Filter, ChevronLeft, ArrowRight } from "lucide-react";
import FilterOptionsModal, { SelectedFilterItem } from "./FilterOptionsModal";
import SortingFilterModal, { SortingFilterSelection } from "./SortingFilterModal";
import SelectGroupModal, { GroupFilterItem } from "./SelectGroupModal";

export interface PolicyMaturityFormData {
  appliedFilters: SelectedFilterItem[];
  fromMaturityDate: string;
  toMaturityDate: string;
  reportDate: string;
  reportType: "Statement" | "Intimation";
  includeAnnuityPolicies: boolean;
  includeRecordOnlyPolicies: boolean;
  sortingOption: "groupsWise" | "groupMemberwise" | "branchNoWise" | "maturityDatewise";
  selectedGroups: GroupFilterItem[];
  sortingFilterSelection: SortingFilterSelection | null;
  reportOptions: {
    printAddress: boolean;
    printTelNo: boolean;
    dob: boolean;
    statementWithPan: boolean;
  };
  settlementOptions: {
    maturitySettlement: boolean;
  };
}

interface PolicyMaturityFormProps {
  onBack: () => void;
  onGenerateReport: (formData: PolicyMaturityFormData) => void;
  initialData?: PolicyMaturityFormData | null;
  agencies: Array<{ id: string; agencyName: string; agencyCode: string }>;
  policyStatuses: Array<{ id: string; statusName: string; statusCode: string }>;
  customers: Array<{
    id: string;
    groupCode?: string | null;
    name: string;
    groupName?: string | null;
    resArea?: string | null;
  }>;
  policies: Array<any>;
  branches?: Array<{ id: string; branchCode: string; branchName: string }>;
}

const getFinancialYearDates = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth(); // 0 = Jan, 3 = April
  const startYear = month >= 3 ? year : year - 1;
  const endYear = startYear + 1;
  return {
    fromMaturityDate: `${startYear}-04-01`,
    toMaturityDate: `${endYear}-03-31`,
    reportDate: today.toISOString().split("T")[0],
  };
};

const getDefaultFormData = (): PolicyMaturityFormData => {
  const fyDates = getFinancialYearDates();
  return {
    appliedFilters: [],
    fromMaturityDate: fyDates.fromMaturityDate,
    toMaturityDate: fyDates.toMaturityDate,
    reportDate: fyDates.reportDate,
    reportType: "Statement",
    includeAnnuityPolicies: false,
    includeRecordOnlyPolicies: false,
    sortingOption: "groupsWise",
    selectedGroups: [],
    sortingFilterSelection: null,
    reportOptions: {
      printAddress: false,
      printTelNo: false,
      dob: false,
      statementWithPan: false,
    },
    settlementOptions: {
      maturitySettlement: false,
    },
  };
};

export default function PolicyMaturityForm({
  onBack,
  onGenerateReport,
  initialData,
  agencies,
  policyStatuses,
  customers,
  policies,
  branches = [],
}: PolicyMaturityFormProps) {
  const [formData, setFormData] = useState<PolicyMaturityFormData>(initialData || getDefaultFormData());
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
      case "branchNoWise":
        return "All Branches Selected";
      case "maturityDatewise":
        return "All Maturity Dates Selected";
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
            Policy Maturities
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">MaturityDate Range</label>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={formData.fromMaturityDate}
                  onChange={(e) => setFormData((prev) => ({ ...prev, fromMaturityDate: e.target.value }))}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#1877F2]"
                />
                <span className="text-xs font-bold text-slate-500">To</span>
                <input
                  type="date"
                  value={formData.toMaturityDate}
                  onChange={(e) => setFormData((prev) => ({ ...prev, toMaturityDate: e.target.value }))}
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

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Report Type</label>
              <div className="inline-flex bg-slate-100 p-1 rounded-xl border border-slate-200 w-full">
                {(["Statement", "Intimation"] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, reportType: type }))}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition ${formData.reportType === type ? "bg-[#1877F2] text-white shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-8 pt-6">
            <label className="flex items-center gap-2.5 text-xs font-bold text-slate-800 hover:text-[#1877F2] cursor-pointer transition">
              <input
                type="checkbox"
                checked={formData.includeAnnuityPolicies}
                onChange={(e) => setFormData((prev) => ({ ...prev, includeAnnuityPolicies: e.target.checked }))}
                className="w-4 h-4 rounded border-slate-300 text-[#1877F2] focus:ring-[#1877F2]"
              />
              <span>Include Annuity Policies</span>
            </label>
            <label className="flex items-center gap-2.5 text-xs font-bold text-slate-800 hover:text-[#1877F2] cursor-pointer transition">
              <input
                type="checkbox"
                checked={formData.includeRecordOnlyPolicies}
                onChange={(e) => setFormData((prev) => ({ ...prev, includeRecordOnlyPolicies: e.target.checked }))}
                className="w-4 h-4 rounded border-slate-300 text-[#1877F2] focus:ring-[#1877F2]"
              />
              <span>Include record only policies</span>
            </label>
          </div>
        </div>

        {/* Section 2: Sorting Options */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#1877F2] via-[#1877F2]/40 to-transparent" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 mb-4">Sorting Options</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-y-3.5 gap-x-6">
            {[
              { id: "groupsWise", label: "Groups Wise" },
              { id: "groupMemberwise", label: "Group Memberwise" },
              { id: "branchNoWise", label: "Branch No. Wise" },
              { id: "maturityDatewise", label: "Maturity Datewise" },
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

        {/* Section 3: Report Options */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#1877F2] via-[#1877F2]/40 to-transparent" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 mb-4">Report Options</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-y-3.5 gap-x-6">
            {[
              { key: "printAddress", label: "Print Address" },
              { key: "printTelNo", label: "Print with Tel. No." },
              { key: "dob", label: "DOB" },
              { key: "statementWithPan", label: "Statement with PAN" },
            ].map((opt) => (
              <label key={opt.key} className="flex items-center gap-2.5 text-xs font-bold text-slate-800 hover:text-[#1877F2] cursor-pointer transition">
                <input
                  type="checkbox"
                  checked={(formData.reportOptions as any)[opt.key]}
                  onChange={(e) => setFormData((prev) => ({ ...prev, reportOptions: { ...prev.reportOptions, [opt.key]: e.target.checked } }))}
                  className="w-4 h-4 rounded border-slate-300 text-[#1877F2] focus:ring-[#1877F2]"
                />
                <span>{opt.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Section 4: Settlement Options */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#1877F2] via-[#1877F2]/40 to-transparent" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 mb-4">Settlement options</h2>
          <label className="flex items-center gap-2.5 text-xs font-bold text-slate-800 hover:text-[#1877F2] cursor-pointer transition w-fit">
            <input
              type="checkbox"
              checked={formData.settlementOptions.maturitySettlement}
              onChange={(e) => setFormData((prev) => ({ ...prev, settlementOptions: { ...prev.settlementOptions, maturitySettlement: e.target.checked } }))}
              className="w-4 h-4 rounded border-slate-300 text-[#1877F2] focus:ring-[#1877F2]"
            />
            <span>Maturity Settlement</span>
          </label>
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