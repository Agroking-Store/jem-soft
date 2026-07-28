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
import SelectGroupModal, { GroupFilterItem } from "./SelectGroupModal";

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
  selectedGroups: GroupFilterItem[];
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
  customers: Array<{ id: string; groupCode?: string | null; name: string; groupName?: string | null }>;
}

export default function PolicyRegisterForm({
  onBack,
  onGenerateReport,
  agencies,
  policyStatuses,
  customers,
}: PolicyRegisterFormProps) {
  const [formData, setFormData] = useState<PolicyRegisterFormData>({
    appliedFilters: [],
    fromCommDate: "",
    toCommDate: "2026-07-28",
    policyType: "Both",
    paymentTypes: {
      nach: false,
      otherThanNach: true,
    },
    reportDate: "2026-07-28",
    sortingOption: "groupsWise",
    selectedGroups: [],
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
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);

  const handleReset = () => {
    setFormData({
      appliedFilters: [],
      fromCommDate: "",
      toCommDate: "2026-07-28",
      policyType: "Both",
      paymentTypes: { nach: false, otherThanNach: true },
      reportDate: "2026-07-28",
      sortingOption: "groupsWise",
      selectedGroups: [],
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

  return (
    <div className="space-y-6">
      {/* Customer Module Hero Header Bar */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
        <div className="bg-gradient-to-r from-[#0B1220] via-[#132342] to-[#16294D] px-6 py-5 sm:px-7 sm:py-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-2 text-[#e8c77a]/80 hover:text-[#e8c77a] hover:bg-white/10 rounded-xl transition flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider"
            >
              <ChevronLeft size={16} />
              <span>Back to Reports</span>
            </button>
            <div className="h-6 w-px bg-white/15" />
            <div>
              <h1 className="font-serif text-2xl font-semibold tracking-tight text-[#e8c77a]">
                Policy Register Builder
              </h1>
              <p className="text-xs text-[#e8c77a]/70">
                Configure filter parameters, group selections, and report options for JEM Soft policies
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => alert("Filter configuration saved!")}
              className="p-2.5 text-[#e8c77a] hover:bg-white/10 rounded-xl transition"
              title="Save Configuration"
            >
              <Save size={18} />
            </button>
            <button
              onClick={handleReset}
              className="p-2.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-xl transition"
              title="Reset Form"
            >
              <RotateCcw size={18} />
            </button>
            <button
              onClick={() => onGenerateReport(formData)}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#B8873A] to-[#D9AE63] text-[#0B1220] font-bold text-xs uppercase tracking-wider rounded-xl shadow-md hover:brightness-105 transition"
            >
              <FileText size={16} />
              <span>Generate Report</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Form Shells matching CustomerSectionCard */}

      {/* Section 1: Filter Options */}
      <section className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.05)]">
        <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#B8873A] via-[#B8873A]/40 to-transparent" />
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/90 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#B8873A]/10 text-[#B8873A]">
              <Filter size={16} />
            </div>
            <h2 className="font-serif text-sm font-semibold uppercase tracking-[0.18em] text-slate-800">
              Filter Options
            </h2>
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Filter Options Trigger Box */}
            <div className="space-y-1.5">
              <label className="font-serif text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Filter Criteria
              </label>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <div className="flex items-center justify-between border border-slate-300 rounded-xl px-3.5 py-2 text-xs bg-white shadow-xs">
                    <span className="text-slate-800 font-semibold">
                      {formData.appliedFilters.length > 0
                        ? `${formData.appliedFilters.length} filter(s) applied`
                        : "No criteria applied"}
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsFilterModalOpen(true)}
                      className="px-3 py-1 text-xs font-bold text-[#0B1220] bg-gradient-to-r from-[#B8873A] to-[#D9AE63] rounded-lg shadow-xs hover:brightness-105 transition"
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
              <label className="font-serif text-[11px] font-bold uppercase tracking-wider text-slate-500">
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
                <span className="text-xs font-bold text-slate-400">To</span>
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
              <label className="font-serif text-[11px] font-bold uppercase tracking-wider text-slate-500">
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
              <label className="font-serif text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Payment Type
              </label>
              <div className="flex items-center gap-6 pt-2">
                <label className="flex items-center gap-2 text-xs text-slate-800 font-semibold cursor-pointer">
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

                <label className="flex items-center gap-2 text-xs text-slate-800 font-semibold cursor-pointer">
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
              <label className="font-serif text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Report Date
              </label>
              <input
                type="date"
                value={formData.reportDate}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, reportDate: e.target.value }))
                }
                className="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#B8873A]"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Section 2: Sorting Options */}
      <section className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.05)]">
        <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#B8873A] via-[#B8873A]/40 to-transparent" />
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/90 px-5 py-4">
          <h2 className="font-serif text-sm font-semibold uppercase tracking-[0.18em] text-slate-800">
            Sorting & Group Selection
          </h2>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-y-3 gap-x-6">
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
                className="flex items-center gap-2.5 text-xs font-semibold text-slate-800 hover:text-[#B8873A] cursor-pointer transition"
              >
                <input
                  type="radio"
                  name="sortingOption"
                  value={opt.id}
                  checked={formData.sortingOption === opt.id}
                  onChange={() => setFormData((prev) => ({ ...prev, sortingOption: opt.id as any }))}
                  className="w-4 h-4 text-[#B8873A] focus:ring-[#B8873A] border-slate-300"
                />
                <span>{opt.label}</span>
              </label>
            ))}
          </div>

          {/* Select Groups Field */}
          <div className="pt-2 max-w-lg">
            <label className="font-serif text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1.5">
              Target Customer Groups
            </label>
            <div className="flex items-center gap-3">
              <input
                type="text"
                readOnly
                value={
                  formData.selectedGroups.length === 0
                    ? "All Groups Selected (Database Customers)"
                    : `${formData.selectedGroups.length} Specific Customer Group(s) Selected`
                }
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2 text-xs font-semibold text-slate-800 cursor-pointer"
                onClick={() => setIsGroupModalOpen(true)}
              />

              <button
                type="button"
                onClick={() => setIsGroupModalOpen(true)}
                className="p-2.5 bg-[#0B1220] hover:bg-[#132342] text-[#E8C77A] rounded-xl transition shadow-xs flex items-center gap-1 text-xs font-bold shrink-0"
                title="Filter Groups"
              >
                <Filter size={15} />
                <span>Select</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Section 3: Report Options */}
      <section className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.05)]">
        <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#B8873A] via-[#B8873A]/40 to-transparent" />
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/90 px-5 py-4">
          <h2 className="font-serif text-sm font-semibold uppercase tracking-[0.18em] text-slate-800">
            Report Output Options
          </h2>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-y-3.5 gap-x-6">
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
              { key: "pageBreakOnGroupChange", label: "Page Break on Customer Group Change" },
            ].map((opt) => (
              <label
                key={opt.key}
                className="flex items-center gap-2.5 text-xs font-semibold text-slate-800 hover:text-[#B8873A] cursor-pointer transition"
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
      </section>

      {/* Bottom Action Footer */}
      <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="px-5 py-2 border border-slate-300 text-slate-700 font-bold text-xs rounded-xl hover:bg-white transition uppercase tracking-wider"
        >
          Cancel
        </button>

        <button
          type="button"
          onClick={() => onGenerateReport(formData)}
          className="flex items-center gap-2 px-8 py-2.5 bg-gradient-to-r from-[#B8873A] to-[#D9AE63] text-[#0B1220] font-bold text-xs uppercase tracking-wider rounded-xl shadow-md hover:brightness-105 transition"
        >
          <span>Generate Policy Register Report</span>
          <ArrowRight size={15} />
        </button>
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

      {/* Select Group Modal */}
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
