"use client";

import { useState } from "react";
import { Save, RotateCcw, FileText, Filter, ChevronLeft, ArrowRight } from "lucide-react";
import SelectGroupModal, { GroupFilterItem } from "./SelectGroupModal";
import SortingFilterModal, { SortingFilterSelection } from "./SortingFilterModal";

export interface PremiumCertificateFormData {
  certificateType: "Type 1" | "Type 2";
  fromDate: string;
  toDate: string;
  reportDate: string;
  sortingOption: "groupsWise" | "groupMemberwise";
  selectedGroups: GroupFilterItem[];
  sortingFilterSelection: SortingFilterSelection | null;
}

interface PremiumCertificateFormProps {
  onBack: () => void;
  onGenerateReport: (formData: PremiumCertificateFormData) => void;
  initialData?: PremiumCertificateFormData | null;
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

const getFinancialYearDates = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth(); // 0-indexed (0 = Jan, 3 = April)

  const startYear = month >= 3 ? year : year - 1;
  const endYear = startYear + 1;

  return {
    fromDate: `${startYear}-04-01`,
    toDate: `${endYear}-03-31`,
  };
};

const getDefaultFormData = (): PremiumCertificateFormData => {
  const fy = getFinancialYearDates();
  return {
    certificateType: "Type 1",
    fromDate: fy.fromDate,
    toDate: fy.toDate,
    reportDate: getTodayDateStr(),
    sortingOption: "groupsWise",
    selectedGroups: [],
    sortingFilterSelection: null,
  };
};

export default function PremiumCertificateForm({
  onBack,
  onGenerateReport,
  initialData,
  customers = [],
  policies = [],
  branches = [],
}: PremiumCertificateFormProps) {
  const [formData, setFormData] = useState<PremiumCertificateFormData>(initialData || getDefaultFormData());
  const [isSortingModalOpen, setIsSortingModalOpen] = useState(false);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);

  const handleReset = () => setFormData(getDefaultFormData());

  const getSelectGroupsLabel = () => {
    if (formData.sortingOption === "groupsWise") {
      const count = formData.selectedGroups.length;
      return count > 0 ? `${count} Groups selected` : "All Groups Selected";
    }
    const count = formData.sortingFilterSelection?.selectedItems?.length || 0;
    return count > 0 ? `${count} item(s) selected` : "All Members Selected";
  };

  const openSelectGroupsModal = () => {
    if (formData.sortingOption === "groupsWise") setIsGroupModalOpen(true);
    else setIsSortingModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-[#0B1220] p-6 text-white border border-slate-800 shadow-xl">
        <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#B8873A] via-[#E8C77A] to-transparent" />
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-xl transition flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider">
              <ChevronLeft size={18} />
              <span>Reports</span>
            </button>
            <div className="h-6 w-px bg-white/15" />
            <h1 className="font-serif text-xl font-bold text-[#E8C77A] tracking-wider uppercase">Premium Certificate</h1>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => alert("Filter configuration saved!")} className="p-2 text-[#E8C77A] hover:bg-white/10 rounded-xl transition"><Save size={20} /></button>
            <button onClick={handleReset} className="p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-xl transition"><RotateCcw size={20} /></button>
            <button onClick={() => onGenerateReport(formData)} className="p-2 text-[#E8C77A] hover:bg-white/10 rounded-xl transition"><FileText size={20} /></button>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {/* Report Options Box */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#B8873A] via-[#B8873A]/40 to-transparent" />
          <h2 className="font-serif text-sm font-bold uppercase tracking-wider text-slate-900 mb-4">Report options</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Certificate Type</label>
              <div className="inline-flex bg-slate-100 p-1 rounded-xl border border-slate-200 w-full sm:w-64">
                {(["Type 1", "Type 2"] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, certificateType: type }))}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition ${
                      formData.certificateType === type ? "bg-[#0B1220] text-[#E8C77A] shadow-sm" : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Date Range (Fin. Year)</label>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <span className="absolute -top-2 left-3 bg-white px-1 text-[10px] text-[#B8873A] font-bold uppercase tracking-wider">From Date *</span>
                  <input
                    type="date"
                    value={formData.fromDate}
                    onChange={(e) => setFormData((prev) => ({ ...prev, fromDate: e.target.value }))}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#B8873A]"
                  />
                </div>
                <span className="text-xs font-bold text-slate-500">To</span>
                <div className="relative flex-1">
                  <span className="absolute -top-2 left-3 bg-white px-1 text-[10px] text-[#B8873A] font-bold uppercase tracking-wider">To Date *</span>
                  <input
                    type="date"
                    value={formData.toDate}
                    onChange={(e) => setFormData((prev) => ({ ...prev, toDate: e.target.value }))}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#B8873A]"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sorting Options Box */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#B8873A] via-[#B8873A]/40 to-transparent" />
          <h2 className="font-serif text-sm font-bold uppercase tracking-wider text-slate-900 mb-4">Sorting Options</h2>

          <div className="flex items-center gap-8 pb-4">
            {([
              { id: "groupsWise", label: "Groups Wise" },
              { id: "groupMemberwise", label: "Group Memberwise" },
            ] as const).map((opt) => (
              <label key={opt.id} className="flex items-center gap-2.5 text-xs font-bold text-slate-800 hover:text-[#B8873A] cursor-pointer transition">
                <input
                  type="radio"
                  name="sortingOption"
                  checked={formData.sortingOption === opt.id}
                  onChange={() => setFormData((prev) => ({ ...prev, sortingOption: opt.id, selectedGroups: [], sortingFilterSelection: null }))}
                  className="w-4 h-4 text-[#B8873A] focus:ring-[#B8873A] border-slate-300"
                />
                <span>{opt.label}</span>
              </label>
            ))}
          </div>

          <div className="pt-2 max-w-lg">
            <div className="flex items-center gap-3">
              <span className="font-serif text-xs font-bold text-slate-700 uppercase tracking-wider whitespace-nowrap">Select Groups</span>
              <div className="relative flex-1">
                <span className="absolute -top-2 left-3 bg-white px-1 text-[10px] text-[#B8873A] font-bold uppercase tracking-wider">Selected Filter</span>
                <input
                  type="text"
                  readOnly
                  value={getSelectGroupsLabel()}
                  onClick={openSelectGroupsModal}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 cursor-pointer"
                />
              </div>
              <button type="button" onClick={openSelectGroupsModal} className="p-2.5 bg-[#0B1220] hover:bg-slate-900 text-[#E8C77A] rounded-xl transition shadow-md border border-slate-800">
                <Filter size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
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
