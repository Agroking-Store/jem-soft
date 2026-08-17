"use client";

import { useState } from "react";
import { Save, RotateCcw, FileText, Filter, ChevronLeft, ArrowRight } from "lucide-react";
import FilterOptionsModal, { SelectedFilterItem } from "./FilterOptionsModal";
import SortingFilterModal, { SortingFilterSelection } from "./SortingFilterModal";
import SelectGroupModal, { GroupFilterItem } from "./SelectGroupModal";

export interface SurvivalBenefitFormData {
  appliedFilters: SelectedFilterItem[];
  dateFrom: string;
  dateTo: string;
  reportDate: string;
  reportType: "Statement" | "Intimation";
  includeLapsedPolicies: boolean;
  includeRecordOnlyPolicies: boolean;
  sbAmountFilterEnabled: boolean;
  sbAmountAboveOrEqualTo: number;
  sortingOption: "groupsWise" | "groupMemberwise" | "sbDatewise" | "branchNoWise";
  selectedGroups: GroupFilterItem[];
  sortingFilterSelection: SortingFilterSelection | null;
  reportOptions: {
    printWithAddress: boolean;
    printWithTelNo: boolean;
    dob: boolean;
  };
}

interface SurvivalBenefitFormProps {
  onBack: () => void;
  onGenerateReport: (formData: SurvivalBenefitFormData) => void;
  initialData?: SurvivalBenefitFormData | null;
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

const getTodayDateStr = () => new Date().toISOString().split("T")[0];
const getOneYearLaterDateStr = () => {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().split("T")[0];
};

const getDefaultFormData = (): SurvivalBenefitFormData => ({
  appliedFilters: [],
  dateFrom: getTodayDateStr(),
  dateTo: getOneYearLaterDateStr(),
  reportDate: getTodayDateStr(),
  reportType: "Statement",
  includeLapsedPolicies: false,
  includeRecordOnlyPolicies: false,
  sbAmountFilterEnabled: false,
  sbAmountAboveOrEqualTo: 0,
  sortingOption: "groupsWise",
  selectedGroups: [],
  sortingFilterSelection: null,
  reportOptions: {
    printWithAddress: false,
    printWithTelNo: false,
    dob: false,
  },
});

export default function SurvivalBenefitForm({
  onBack,
  onGenerateReport,
  initialData,
  agencies,
  policyStatuses,
  customers,
  policies,
  branches = [],
}: SurvivalBenefitFormProps) {
  const [formData, setFormData] = useState<SurvivalBenefitFormData>(initialData || getDefaultFormData());
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
      case "sbDatewise":
        return "All S.B. Dates Selected";
      case "branchNoWise":
        return "All Branches Selected";
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
      <div className="relative overflow-hidden rounded-2xl bg-[#0B1220] p-6 text-white border border-slate-800 shadow-xl">
        <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#B8873A] via-[#E8C77A] to-transparent" />
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-xl transition flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider">
              <ChevronLeft size={18} />
              <span>Reports</span>
            </button>
            <div className="h-6 w-px bg-white/15" />
            <h1 className="font-serif text-xl font-bold text-[#E8C77A] tracking-wider uppercase">Survival Benefits</h1>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => alert("Filter configuration saved!")} className="p-2 text-[#E8C77A] hover:bg-white/10 rounded-xl transition"><Save size={20} /></button>
            <button onClick={handleReset} className="p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-xl transition"><RotateCcw size={20} /></button>
            <button onClick={() => onGenerateReport(formData)} className="p-2 text-[#E8C77A] hover:bg-white/10 rounded-xl transition"><FileText size={20} /></button>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#B8873A] via-[#B8873A]/40 to-transparent" />
          <h2 className="font-serif text-sm font-bold uppercase tracking-wider text-slate-900 mb-4">Filter Options</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Filter Options</label>
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  readOnly
                  value={formData.appliedFilters.length > 0 ? `${formData.appliedFilters.length} filter(s) selected` : "All filters Selected"}
                  onClick={() => setIsFilterModalOpen(true)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 cursor-pointer"
                />
                <button type="button" onClick={() => setIsFilterModalOpen(true)} className="p-2.5 bg-[#0B1220] hover:bg-slate-900 text-[#E8C77A] rounded-xl transition shadow-md border border-slate-800">
                  <Filter size={16} />
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Date From</label>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={formData.dateFrom}
                  onChange={(e) => setFormData((prev) => ({ ...prev, dateFrom: e.target.value }))}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#B8873A]"
                />
                <span className="text-xs font-bold text-slate-500">To</span>
                <input
                  type="date"
                  value={formData.dateTo}
                  onChange={(e) => setFormData((prev) => ({ ...prev, dateTo: e.target.value }))}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#B8873A]"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Report Date</label>
              <input
                type="date"
                value={formData.reportDate}
                onChange={(e) => setFormData((prev) => ({ ...prev, reportDate: e.target.value }))}
                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#B8873A]"
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
                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition ${formData.reportType === type ? "bg-[#0B1220] text-[#E8C77A] shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-8 pt-6">
            <label className="flex items-center gap-2.5 text-xs font-bold text-slate-800 hover:text-[#B8873A] cursor-pointer transition">
              <input
                type="checkbox"
                checked={formData.includeLapsedPolicies}
                onChange={(e) => setFormData((prev) => ({ ...prev, includeLapsedPolicies: e.target.checked }))}
                className="w-4 h-4 rounded border-slate-300 text-[#B8873A] focus:ring-[#B8873A]"
              />
              <span>Include Lapsed Policies</span>
            </label>
            <label className="flex items-center gap-2.5 text-xs font-bold text-slate-800 hover:text-[#B8873A] cursor-pointer transition">
              <input
                type="checkbox"
                checked={formData.includeRecordOnlyPolicies}
                onChange={(e) => setFormData((prev) => ({ ...prev, includeRecordOnlyPolicies: e.target.checked }))}
                className="w-4 h-4 rounded border-slate-300 text-[#B8873A] focus:ring-[#B8873A]"
              />
              <span>Include Record Only Policies</span>
            </label>
            <label className="flex items-center gap-2.5 text-xs font-bold text-slate-800 hover:text-[#B8873A] cursor-pointer transition">
              <input
                type="checkbox"
                checked={formData.sbAmountFilterEnabled}
                onChange={(e) => setFormData((prev) => ({ ...prev, sbAmountFilterEnabled: e.target.checked }))}
                className="w-4 h-4 rounded border-slate-300 text-[#B8873A] focus:ring-[#B8873A]"
              />
              <span>SB Amount above or equal to</span>
            </label>
            <div className="relative">
              <span className="absolute -top-2 left-3 bg-white px-1 text-[10px] text-[#B8873A] font-bold uppercase tracking-wider">SB Amount</span>
              <input
                type="number"
                min={0}
                value={formData.sbAmountAboveOrEqualTo}
                disabled={!formData.sbAmountFilterEnabled}
                onChange={(e) => setFormData((prev) => ({ ...prev, sbAmountAboveOrEqualTo: Number(e.target.value) }))}
                className="w-32 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#B8873A] disabled:bg-slate-100 disabled:text-slate-400"
              />
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#B8873A] via-[#B8873A]/40 to-transparent" />
          <h2 className="font-serif text-sm font-bold uppercase tracking-wider text-slate-900 mb-4">Sorting Options</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-y-3.5 gap-x-6">
            {[
              { id: "groupsWise", label: "Groups Wise" },
              { id: "groupMemberwise", label: "Group Memberwise" },
              { id: "sbDatewise", label: "S.B.Datewise" },
              { id: "branchNoWise", label: "Branch No. Wise" },
            ].map((opt) => (
              <label key={opt.id} className="flex items-center gap-2.5 text-xs font-bold text-slate-800 hover:text-[#B8873A] cursor-pointer transition">
                <input
                  type="radio"
                  name="sortingOption"
                  checked={formData.sortingOption === opt.id}
                  onChange={() => setFormData((prev) => ({ ...prev, sortingOption: opt.id as any, selectedGroups: [], sortingFilterSelection: null }))}
                  className="w-4 h-4 text-[#B8873A] focus:ring-[#B8873A] border-slate-300"
                />
                <span>{opt.label}</span>
              </label>
            ))}
          </div>

          <div className="pt-5 max-w-lg">
            <div className="flex items-center gap-3">
              <span className="font-serif text-xs font-bold text-slate-700 uppercase tracking-wider whitespace-nowrap">Select Groups</span>
              <input
                type="text"
                readOnly
                value={getSelectGroupsLabel()}
                onClick={openSelectGroupsModal}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 cursor-pointer"
              />
              <button type="button" onClick={openSelectGroupsModal} className="p-2.5 bg-[#0B1220] hover:bg-slate-900 text-[#E8C77A] rounded-xl transition shadow-md border border-slate-800">
                <Filter size={16} />
              </button>
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#B8873A] via-[#B8873A]/40 to-transparent" />
          <h2 className="font-serif text-sm font-bold uppercase tracking-wider text-slate-900 mb-4">Report Options</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-y-3.5 gap-x-6">
            {[
              { key: "printWithAddress", label: "Print with Address" },
              { key: "printWithTelNo", label: "Print with Tel. No." },
              { key: "dob", label: "D.O.B" },
            ].map((opt) => (
              <label key={opt.key} className="flex items-center gap-2.5 text-xs font-bold text-slate-800 hover:text-[#B8873A] cursor-pointer transition">
                <input
                  type="checkbox"
                  checked={(formData.reportOptions as any)[opt.key]}
                  onChange={(e) => setFormData((prev) => ({ ...prev, reportOptions: { ...prev.reportOptions, [opt.key]: e.target.checked } }))}
                  className="w-4 h-4 rounded border-slate-300 text-[#B8873A] focus:ring-[#B8873A]"
                />
                <span>{opt.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between">
          <button type="button" onClick={onBack} className="px-6 py-2.5 border border-slate-300 text-slate-700 font-bold text-xs rounded-xl hover:bg-white transition uppercase tracking-wider">Cancel</button>
          <button
            type="button"
            onClick={() => onGenerateReport(formData)}
            className="flex items-center gap-2 px-8 py-2.5 bg-gradient-to-r from-[#B8873A] to-[#D9AE63] text-[#0B1220] font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg hover:brightness-105 transition"
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