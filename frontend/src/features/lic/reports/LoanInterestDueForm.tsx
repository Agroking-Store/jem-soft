"use client";

import { useState, useMemo } from "react";
import {
  Save,
  RotateCcw,
  FileText,
  Filter,
  FilterX,
  ChevronLeft,
  ArrowRight,
} from "lucide-react";
import FilterOptionsModal, { SelectedFilterItem } from "./FilterOptionsModal";
import SelectGroupModal, { GroupFilterItem } from "./SelectGroupModal";

export interface LoanInterestDueFormData {
  dateFrom: string;
  dateTo: string;
  reportDate: string;
  reportType: "Statement" | "Intimation";
  sortingOption: "groupsWise" | "groupMemberwise" | "areaWise" | "subAreaWise" | "branchNoWise";
  selectedGroups: GroupFilterItem[];
  statementOptions: {
    address: boolean;
    mobile: boolean;
    dob: boolean;
  };
  intimationOptions: {
    includePrevArrear: boolean;
    mailingLabels: boolean;
    despatchList: boolean;
    dob: boolean;
    costPerDespatch: string;
    purpose: string;
  };
  appliedFilters: SelectedFilterItem[];
  sortingFilterSelection: {
    type: string;
    selectedItems: any[];
  } | null;
}

interface LoanInterestDueFormProps {
  onBack: () => void;
  onGenerateReport: (data: LoanInterestDueFormData) => void;
  initialData?: LoanInterestDueFormData | null;
  agencies: any[];
  policyStatuses: any[];
  customers: any[];
  policies: any[];
  branches: any[];
}

const defaultFormData = (): LoanInterestDueFormData => ({
  dateFrom: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toISOString().split("T")[0],
  dateTo: new Date(new Date().getFullYear(), new Date().getMonth() + 2, 0).toISOString().split("T")[0],
  reportDate: new Date().toISOString().split("T")[0],
  reportType: "Statement",
  sortingOption: "groupsWise",
  selectedGroups: [],
  statementOptions: { address: false, mobile: true, dob: false },
  intimationOptions: {
    includePrevArrear: false,
    mailingLabels: false,
    despatchList: false,
    dob: false,
    costPerDespatch: "0",
    purpose: "",
  },
  appliedFilters: [],
  sortingFilterSelection: null,
});

export default function LoanInterestDueForm({
  onBack,
  onGenerateReport,
  initialData,
  agencies,
  policyStatuses,
  customers,
  policies,
  branches,
}: LoanInterestDueFormProps) {
  const [formData, setFormData] = useState<LoanInterestDueFormData>(
    initialData || defaultFormData()
  );

  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);

  const getSelectGroupsLabel = () => {
    const count = formData.selectedGroups.length;
    return count > 0 ? `${count} Group(s) selected` : "All Groups Selected";
  };

  const openSelectGroupsModal = () => setIsGroupModalOpen(true);

  const handleReset = () => setFormData(defaultFormData());

  const sortingOptions = [
    { id: "groupsWise", label: "Groups Wise" },
    { id: "groupMemberwise", label: "Group Memberwise" },
    { id: "areaWise", label: "Area Wise" },
    { id: "subAreaWise", label: "Sub-Area Wise" },
    { id: "branchNoWise", label: "Branch No. Wise" },
  ];

  const sendToOptions = [
    { id: "groupsWise", label: "Groups Wise" },
    { id: "groupMemberwise", label: "Group Memberwise" },
  ];

  return (
    <div className="space-y-6">
      {/* Top Header Bar */}
      <div className="relative overflow-hidden rounded-2xl bg-[#0B1220] p-6 text-white border border-slate-800 shadow-xl">
        <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#B8873A] via-[#E8C77A] to-transparent" />
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-xl transition flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider"
              title="Back to Reports"
            >
              <ChevronLeft size={18} />
              <span>Reports</span>
            </button>
            <div className="h-6 w-px bg-white/15" />
            <h1 className="font-serif text-xl font-bold text-[#E8C77A] tracking-wider uppercase">
              Loan Interest Due
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
              onClick={() => onGenerateReport(formData)}
              className="p-2 text-[#E8C77A] hover:bg-white/10 rounded-xl transition"
              title="Generate Report"
            >
              <FileText size={20} />
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {/* Section 1: Filter Options */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#B8873A] via-[#B8873A]/40 to-transparent" />
          <div className="flex items-center gap-2 mb-4">
            <h2 className="font-serif text-sm font-bold uppercase tracking-wider text-slate-900">
              Filter Options
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-2">
            {/* Selected Filter Box */}
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
                      {formData.appliedFilters.length > 0
                        ? `${formData.appliedFilters.length} filter applied`
                        : "No filters applied"}
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsFilterModalOpen(true)}
                      className="px-2.5 py-1 text-xs font-bold text-[#0B1220] bg-[#B8873A]/15 border border-[#B8873A]/30 rounded-lg hover:bg-[#B8873A]/30 transition"
                    >
                      View Filter
                    </button>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, appliedFilters: [] }))}
                  className="p-2 text-slate-400 hover:text-red-600 transition"
                  title="Clear applied filters"
                >
                  <FilterX size={18} />
                </button>
              </div>
            </div>

            {/* Due Date From */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                DueDate Range (From)
              </label>
              <div className="relative">
                <span className="absolute -top-2 left-3 bg-white px-1 text-[10px] text-[#B8873A] font-bold uppercase tracking-wider">
                  From Date
                </span>
                <input
                  type="date"
                  value={formData.dateFrom}
                  onChange={(e) => setFormData((prev) => ({ ...prev, dateFrom: e.target.value }))}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#B8873A]"
                />
              </div>
            </div>

            {/* Due Date To */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                DueDate Range (To)
              </label>
              <div className="relative">
                <span className="absolute -top-2 left-3 bg-white px-1 text-[10px] text-[#B8873A] font-bold uppercase tracking-wider">
                  To Date
                </span>
                <input
                  type="date"
                  value={formData.dateTo}
                  onChange={(e) => setFormData((prev) => ({ ...prev, dateTo: e.target.value }))}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#B8873A]"
                />
              </div>
            </div>

            {/* Report Date */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Report Date
              </label>
              <input
                type="date"
                value={formData.reportDate}
                onChange={(e) => setFormData((prev) => ({ ...prev, reportDate: e.target.value }))}
                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#B8873A]"
              />
            </div>

            {/* Report Type Toggle */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Report Type
              </label>
              <div className="inline-flex bg-slate-100 p-1 rounded-xl border border-slate-200 w-full">
                {(["Statement", "Intimation"] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, reportType: type }))}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition ${
                      formData.reportType === type
                        ? "bg-[#0B1220] text-[#E8C77A] shadow-sm"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Sorting Options / Send To */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#B8873A] via-[#B8873A]/40 to-transparent" />
          <div className="flex items-center gap-2 mb-4">
            <h2 className="font-serif text-sm font-bold uppercase tracking-wider text-slate-900">
              {formData.reportType === "Statement" ? "Sorting Options" : "Send To"}
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-y-3.5 gap-x-6 pt-2">
            {(formData.reportType === "Statement" ? sortingOptions : sendToOptions).map((opt) => (
              <label
                key={opt.id}
                className="flex items-center gap-2.5 text-xs font-bold text-slate-800 hover:text-[#B8873A] cursor-pointer transition"
              >
                <input
                  type="radio"
                  name="sortingOption"
                  value={opt.id}
                  checked={formData.sortingOption === opt.id}
                  onChange={() =>
                    setFormData((prev) => ({
                      ...prev,
                      sortingOption: opt.id as any,
                      selectedGroups: [],
                      sortingFilterSelection: null,
                    }))
                  }
                  className="w-4 h-4 text-[#B8873A] focus:ring-[#B8873A] border-slate-300"
                />
                <span>{opt.label}</span>
              </label>
            ))}
          </div>

          {/* Select Groups */}
          <div className="pt-5 max-w-lg">
            <div className="flex items-center gap-3">
              <span className="font-serif text-xs font-bold text-slate-700 uppercase tracking-wider whitespace-nowrap">
                Select Groups
              </span>
              <div className="relative flex-1">
                <input
                  type="text"
                  readOnly
                  value={getSelectGroupsLabel()}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 cursor-pointer"
                  onClick={openSelectGroupsModal}
                />
              </div>
              <button
                type="button"
                onClick={openSelectGroupsModal}
                className="p-2.5 bg-[#0B1220] hover:bg-slate-900 text-[#E8C77A] rounded-xl transition shadow-md border border-slate-800"
                title="Open Select Groups Modal"
              >
                <Filter size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Section 3: Report Options */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#B8873A] via-[#B8873A]/40 to-transparent" />
          <div className="flex items-center gap-2 mb-4">
            <h2 className="font-serif text-sm font-bold uppercase tracking-wider text-slate-900">
              Report Options
            </h2>
          </div>

          {formData.reportType === "Statement" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-y-3.5 gap-x-6 pt-2">
              {[
                { key: "address", label: "Address" },
                { key: "mobile", label: "Mobile" },
                { key: "dob", label: "DOB" },
              ].map((opt) => (
                <label
                  key={opt.key}
                  className="flex items-center gap-2.5 text-xs font-bold text-slate-800 hover:text-[#B8873A] cursor-pointer transition"
                >
                  <input
                    type="checkbox"
                    checked={(formData.statementOptions as any)[opt.key]}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        statementOptions: { ...prev.statementOptions, [opt.key]: e.target.checked },
                      }))
                    }
                    className="w-4 h-4 rounded border-slate-300 text-[#B8873A] focus:ring-[#B8873A]"
                  />
                  <span>{opt.label}</span>
                </label>
              ))}
            </div>
          ) : (
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-y-3.5 gap-x-6">
                {[
                  { key: "includePrevArrear", label: "Include Prev.Arrear" },
                  { key: "mailingLabels", label: "Mailing Labels" },
                  { key: "despatchList", label: "Despatch List" },
                  { key: "dob", label: "DOB" },
                ].map((opt) => (
                  <label
                    key={opt.key}
                    className="flex items-center gap-2.5 text-xs font-bold text-slate-800 hover:text-[#B8873A] cursor-pointer transition"
                  >
                    <input
                      type="checkbox"
                      checked={(formData.intimationOptions as any)[opt.key]}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          intimationOptions: { ...prev.intimationOptions, [opt.key]: e.target.checked },
                        }))
                      }
                      className="w-4 h-4 rounded border-slate-300 text-[#B8873A] focus:ring-[#B8873A]"
                    />
                    <span>{opt.label}</span>
                  </label>
                ))}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl pt-2">
                <div className="relative">
                  <span className="absolute -top-2 left-3 bg-white px-1 text-[10px] font-bold text-slate-500">
                    Cost per dispatch
                  </span>
                  <input
                    type="text"
                    value={formData.intimationOptions.costPerDespatch}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        intimationOptions: { ...prev.intimationOptions, costPerDespatch: e.target.value },
                      }))
                    }
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#B8873A]"
                    placeholder="₹0"
                  />
                </div>
                <div className="relative">
                  <span className="absolute -top-2 left-3 bg-white px-1 text-[10px] font-bold text-slate-500">
                    Purpose
                  </span>
                  <input
                    type="text"
                    value={formData.intimationOptions.purpose}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        intimationOptions: { ...prev.intimationOptions, purpose: e.target.value },
                      }))
                    }
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#B8873A]"
                    placeholder="Purpose"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

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
    </div>
  );
}
