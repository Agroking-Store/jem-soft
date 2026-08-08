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

export interface PolicyRegisterFormData {
  appliedFilters: SelectedFilterItem[];
  fromCommDate: string;
  toCommDate: string;
  policyType: "ULIP" | "Traditional" | "Both";
  paymentTypes: {
    nach: boolean;
    otherThanNach: boolean;
  };
  reportDate: string;
  sortingOption:
    | "groupsWise"
    | "groupMemberwise"
    | "areaWise"
    | "subAreaWise"
    | "branchNoWise"
    | "policyNoWise"
    | "commencementDatewise"
    | "completionDatewise"
    | "planWise";
  sortingFilterSelection: SortingFilterSelection | null;
  reportOptions: {
    address: boolean;
    landline: boolean;
    mobile: boolean;
    email: boolean;
    riderDetails: boolean;
    nachDetails: boolean;
    nachDebitDatewise: boolean;
    statementWithPan: boolean;
    nomineeList: boolean;
    existingPolicies: boolean;
    pageBreakOnGroupChange: boolean;
  };
}

interface PolicyRegisterFormProps {
  onBack: () => void;
  onGenerateReport: (formData: PolicyRegisterFormData) => void;
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
}

export default function PolicyRegisterForm({
  onBack,
  onGenerateReport,
  agencies,
  policyStatuses,
  customers,
  policies,
}: PolicyRegisterFormProps) {
  const [formData, setFormData] = useState<PolicyRegisterFormData>({
    appliedFilters: [
      { type: "Policy Status", id: "status-inforce", name: "Inforce" },
      { type: "Policy Status", id: "status-paidup", name: "Fully paid-up" },
      { type: "Policy Status", id: "status-lapsed", name: "Lapsed" },
      { type: "Policy Status", id: "status-red-paidup", name: "Reduced Paid-up" },
    ],
    fromCommDate: "",
    toCommDate: "2026-07-29",
    policyType: "Both",
    paymentTypes: {
      nach: false,
      otherThanNach: true,
    },
    reportDate: "2026-07-29",
    sortingOption: "groupsWise",
    sortingFilterSelection: null,
    reportOptions: {
      address: false,
      landline: false,
      mobile: false,
      email: false,
      riderDetails: false,
      nachDetails: false,
      nachDebitDatewise: false,
      statementWithPan: false,
      nomineeList: false,
      existingPolicies: false,
      pageBreakOnGroupChange: false,
    },
  });

  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [isSortingModalOpen, setIsSortingModalOpen] = useState(false);

  const handleReset = () => {
    setFormData({
      appliedFilters: [],
      fromCommDate: "",
      toCommDate: "2026-07-29",
      policyType: "Both",
      paymentTypes: { nach: false, otherThanNach: true },
      reportDate: "2026-07-29",
      sortingOption: "groupsWise",
      sortingFilterSelection: null,
      reportOptions: {
        address: false,
        landline: false,
        mobile: false,
        email: false,
        riderDetails: false,
        nachDetails: false,
        nachDebitDatewise: false,
        statementWithPan: false,
        nomineeList: false,
        existingPolicies: false,
        pageBreakOnGroupChange: false,
      },
    });
  };

  const getSelectLabel = () => {
    const selectedCount = formData.sortingFilterSelection?.selectedItems?.length || 0;
    if (selectedCount > 0) {
      return `${selectedCount} item(s) selected`;
    }
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
      case "planWise":
        return "All Plans Selected";
      case "groupsWise":
      default:
        return "All Groups Selected";
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Bar with Website Theme `#0B1220` and Gold `#E8C77A` */}
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
              Policy Register Form
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

      {/* Main Form Shells with Website Customer Module Cards */}
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

            {/* Comm Date Range */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Comm. Date Range
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={formData.fromCommDate}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, fromCommDate: e.target.value }))
                  }
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#B8873A]"
                  placeholder="From Date"
                />
                <span className="text-xs font-bold text-slate-500">To</span>
                <input
                  type="date"
                  value={formData.toCommDate}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, toCommDate: e.target.value }))
                  }
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#B8873A]"
                />
              </div>
            </div>

            {/* Policy Type Toggle */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Policy Type
              </label>
              <div className="inline-flex bg-slate-100 p-1 rounded-xl border border-slate-200 w-full">
                {(["ULIP", "Traditional", "Both"] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, policyType: type }))}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition ${
                      formData.policyType === type
                        ? "bg-[#0B1220] text-[#E8C77A] shadow-sm"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    {type}
                  </button>
                ))}
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
                  <span>Other than NACH</span>
                </label>
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
              { id: "branchNoWise", label: "Branch No. Wise" },
              { id: "policyNoWise", label: "Policy No. Wise" },
              { id: "commencementDatewise", label: "Commencement Datewise" },
              { id: "completionDatewise", label: "Completion Datewise" },
              { id: "planWise", label: "Plan Wise" },
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
          <div className="pt-5 max-w-lg">
            <div className="flex items-center gap-3">
              <span className="font-serif text-xs font-bold text-slate-700 uppercase tracking-wider whitespace-nowrap">
                Select Filter
              </span>
              <div className="relative flex-1">
                <input
                  type="text"
                  readOnly
                  value={getSelectLabel()}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 cursor-pointer"
                  onClick={() => setIsSortingModalOpen(true)}
                />
              </div>

              <button
                type="button"
                onClick={() => setIsSortingModalOpen(true)}
                className="p-2.5 bg-[#0B1220] hover:bg-slate-900 text-[#E8C77A] rounded-xl transition shadow-md border border-slate-800"
                title="Open Sorting Filter Modal"
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

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-y-3.5 gap-x-6 pt-2">
            {[
              { key: "address", label: "Address" },
              { key: "landline", label: "Landline" },
              { key: "mobile", label: "Mobile" },
              { key: "email", label: "Email" },
              { key: "riderDetails", label: "Rider Details" },
              { key: "nachDetails", label: "NACH Details" },
              { key: "nachDebitDatewise", label: "NACH Debit Datewise" },
              { key: "statementWithPan", label: "Statement with PAN" },
              { key: "nomineeList", label: "Nominee List" },
              { key: "existingPolicies", label: "Existing Policies" },
              { key: "pageBreakOnGroupChange", label: "Page Break on change of Customer Group" },
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

      {/* Filter Options Modal */}
      <FilterOptionsModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        agencies={agencies}
        policyStatuses={policyStatuses}
        selectedFilters={formData.appliedFilters}
        onApplyFilters={(filters) =>
          setFormData((prev) => ({ ...prev, appliedFilters: filters }))
        }
      />

      {/* Sorting Filter Modal */}
      <SortingFilterModal
        isOpen={isSortingModalOpen}
        onClose={() => setIsSortingModalOpen(false)}
        sortingOption={formData.sortingOption}
        customers={customers}
        policies={policies}
        selectedFilters={formData.sortingFilterSelection}
        onApplySortingFilter={(selection) =>
          setFormData((prev) => ({ ...prev, sortingFilterSelection: selection }))
        }
      />
    </div>
  );
}
