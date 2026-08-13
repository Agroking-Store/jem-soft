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
import FilterOptionsModal, { SelectedFilterItem } from "./FilterOptionsModal";
import SortingFilterModal, { SortingFilterSelection } from "./SortingFilterModal";
import SelectGroupModal, { GroupFilterItem } from "./SelectGroupModal";

export interface PremiumOutstandingFormData {
  appliedFilters: SelectedFilterItem[];
  fupDatesUpto: string;
  latefeeCalculationDate: string;
  paymentTypes: {
    nach: boolean;
    otherThanNach: boolean;
  };
  reportType: "Statement" | "Intimation";
  reportDate: string;
  sortingOption:
    | "groupsWise"
    | "groupMemberwise"
    | "areaWise"
    | "subAreaWise"
    | "dueDate"
    | "branchNoWise"
    | "policyNoWise";
  selectedGroups: GroupFilterItem[];
  sortingFilterSelection: SortingFilterSelection | null;
  reportOptions: {
    address: boolean;
    mobile: boolean;
    email: boolean;
    pan: boolean;
    gst: boolean;
    dob: boolean;
    nachDetails: boolean;
  };
}

interface PremiumOutstandingFormProps {
  onBack: () => void;
  onGenerateReport: (formData: PremiumOutstandingFormData) => void;
  initialData?: PremiumOutstandingFormData | null;
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

const getDefaultFormData = (): PremiumOutstandingFormData => ({
  appliedFilters: [],
  fupDatesUpto: "2026-07-31",
  latefeeCalculationDate: "2026-07-31",
  paymentTypes: {
    nach: false,
    otherThanNach: true,
  },
  reportType: "Statement",
  reportDate: "2026-07-31",
  sortingOption: "groupsWise",
  selectedGroups: [],
  sortingFilterSelection: null,
  reportOptions: {
    address: false,
    mobile: false,
    email: false,
    pan: false,
    gst: false,
    dob: false,
    nachDetails: false,
  },
});

export default function PremiumOutstandingForm({
  onBack,
  onGenerateReport,
  initialData,
  agencies,
  policyStatuses,
  customers,
  policies,
  branches = [],
}: PremiumOutstandingFormProps) {
  const [formData, setFormData] = useState<PremiumOutstandingFormData>(() => {
    if (initialData) return initialData;
    return getDefaultFormData();
  });

  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [isSortingModalOpen, setIsSortingModalOpen] = useState(false);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);

  const handleReset = () => {
    setFormData(getDefaultFormData());
  };

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
      case "areaWise":
        return "All Areas Selected";
      case "subAreaWise":
        return "All Sub-Areas Selected";
      case "branchNoWise":
        return "All Branches Selected";
      case "policyNoWise":
        return "All Policies Selected";
      default:
        return "All Groups Selected";
    }
  };

  const showSelectGroupsRow = formData.sortingOption !== "dueDate";

  const openSelectGroupsModal = () => {
    if (formData.sortingOption === "groupsWise") {
      setIsGroupModalOpen(true);
    } else {
      setIsSortingModalOpen(true);
    }
  };

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
              Premium Outstanding
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => alert("Filter configuration saved!")}
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

            {/* Process FUP */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Process FUP
              </label>
              <div className="relative">
                <span className="absolute -top-2 left-3 bg-white px-1 text-[10px] text-[#B8873A] font-bold uppercase tracking-wider">
                  FUP Dates Upto
                </span>
                <input
                  type="date"
                  value={formData.fupDatesUpto}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, fupDatesUpto: e.target.value }))
                  }
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#B8873A]"
                />
              </div>
            </div>

            {/* Latefee Calculation */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Latefee Calculation
              </label>
              <div className="relative">
                <span className="absolute -top-2 left-3 bg-white px-1 text-[10px] text-[#B8873A] font-bold uppercase tracking-wider">
                  Latefee Calculation Date
                </span>
                <input
                  type="date"
                  value={formData.latefeeCalculationDate}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, latefeeCalculationDate: e.target.value }))
                  }
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#B8873A]"
                />
              </div>
            </div>

            {/* Payment Type */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Payment Type
              </label>
              <div className="flex items-center gap-6 pt-2">
                <label className="flex items-center gap-2 text-xs text-slate-800 font-bold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.paymentTypes.nach}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        paymentTypes: { ...prev.paymentTypes, nach: e.target.checked },
                      }))
                    }
                    className="w-4 h-4 rounded border-slate-300 text-[#B8873A] focus:ring-[#B8873A]"
                  />
                  <span>NACH</span>
                </label>

                <label className="flex items-center gap-2 text-xs text-slate-800 font-bold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.paymentTypes.otherThanNach}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        paymentTypes: { ...prev.paymentTypes, otherThanNach: e.target.checked },
                      }))
                    }
                    className="w-4 h-4 rounded border-slate-300 text-[#B8873A] focus:ring-[#B8873A]"
                  />
                  <span>Other</span>
                </label>
              </div>
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

            {/* Report Date */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Report Date
              </label>
              <input
                type="date"
                value={formData.reportDate}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, reportDate: e.target.value }))
                }
                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#B8873A]"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Sorting Options */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#B8873A] via-[#B8873A]/40 to-transparent" />
          <div className="flex items-center gap-2 mb-4">
            <h2 className="font-serif text-sm font-bold uppercase tracking-wider text-slate-900">
              Sorting Options
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-y-3.5 gap-x-6 pt-2">
            {[
              { id: "groupsWise", label: "Groups Wise" },
              { id: "groupMemberwise", label: "Group Memberwise" },
              { id: "areaWise", label: "Area Wise" },
              { id: "subAreaWise", label: "Sub-Area Wise" },
              { id: "dueDate", label: "Due-Date" },
              { id: "branchNoWise", label: "Branch No. Wise" },
              { id: "policyNoWise", label: "Policy No. Wise" },
            ].map((opt) => (
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

          {/* Dynamic Select Input Field */}
          {showSelectGroupsRow && (
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
          )}
        </div>

        {/* Section 3: Report Options */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#B8873A] via-[#B8873A]/40 to-transparent" />
          <div className="flex items-center gap-2 mb-4">
            <h2 className="font-serif text-sm font-bold uppercase tracking-wider text-slate-900">
              Report Options
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-y-3.5 gap-x-6 pt-2">
            {[
              { key: "address", label: "Include Address" },
              { key: "mobile", label: "Include Mobile" },
              { key: "email", label: "Include Email" },
              { key: "pan", label: "Include PAN" },
              { key: "gst", label: "Include GST" },
              { key: "dob", label: "Include DOB" },
            ].map((opt) => (
              <label
                key={opt.key}
                className="flex items-center gap-2.5 text-xs font-bold text-slate-800 hover:text-[#B8873A] cursor-pointer transition"
              >
                <input
                  type="checkbox"
                  checked={(formData.reportOptions as any)[opt.key]}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      reportOptions: {
                        ...prev.reportOptions,
                        [opt.key]: e.target.checked,
                      },
                    }))
                  }
                  className="w-4 h-4 rounded border-slate-300 text-[#B8873A] focus:ring-[#B8873A]"
                />
                <span>{opt.label}</span>
              </label>
            ))}

            {/* NACH Details — only meaningful once Payment Type "NACH" is ticked */}
            <label
              className={`flex items-center gap-2.5 text-xs font-bold transition ${
                formData.paymentTypes.nach
                  ? "text-slate-800 hover:text-[#B8873A] cursor-pointer"
                  : "text-slate-400 cursor-not-allowed"
              }`}
            >
              <input
                type="checkbox"
                checked={formData.reportOptions.nachDetails}
                disabled={!formData.paymentTypes.nach}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    reportOptions: {
                      ...prev.reportOptions,
                      nachDetails: e.target.checked,
                    },
                  }))
                }
                className="w-4 h-4 rounded border-slate-300 text-[#B8873A] focus:ring-[#B8873A] disabled:cursor-not-allowed"
              />
              <span>NACH Details</span>
            </label>
          </div>
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

      {/* Filter Options Modal — reused as-is, opened with NOTHING pre-ticked */}
      <FilterOptionsModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        agencies={agencies}
        policyStatuses={policyStatuses}
        selectedFilters={formData.appliedFilters}
        onApplyFilters={(filters) =>
          setFormData((prev) => ({ ...prev, appliedFilters: filters }))
        }
        enableDefaultStatusSelection={false}
      />

      {/* Select Groups Modal — reused as-is, only for the "Groups Wise" sort */}
      <SelectGroupModal
        isOpen={isGroupModalOpen}
        onClose={() => setIsGroupModalOpen(false)}
        customers={customers}
        selectedGroups={formData.selectedGroups}
        onApplyGroups={(groups) =>
          setFormData((prev) => ({ ...prev, selectedGroups: groups }))
        }
      />

      {/* Sorting Filter Modal — reused as-is, for every other sort option */}
      <SortingFilterModal
        isOpen={isSortingModalOpen}
        onClose={() => setIsSortingModalOpen(false)}
        sortingOption={formData.sortingOption}
        customers={customers}
        policies={policies}
        branches={branches}
        selectedFilters={formData.sortingFilterSelection}
        onApplySortingFilter={(selection) =>
          setFormData((prev) => ({ ...prev, sortingFilterSelection: selection }))
        }
      />
    </div>
  );
}