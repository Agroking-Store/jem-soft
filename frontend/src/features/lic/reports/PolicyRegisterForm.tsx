"use client";

import { useState } from "react";
import {
  Save,
  RotateCcw,
  FileText,
  Filter,
  FilterX,
  Calendar,
  ChevronLeft,
  Sparkles,
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
    appliedFilters: [{ type: "Policy Status", id: "status-4", name: "Policy Status (4)" }],
    fromCommDate: "",
    toCommDate: "2026-07-27",
    policyType: "Both",
    paymentTypes: {
      nach: false,
      otherThanNach: true,
    },
    reportDate: "2026-07-27",
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
      toCommDate: "2026-07-27",
      policyType: "Both",
      paymentTypes: { nach: false, otherThanNach: true },
      reportDate: "2026-07-27",
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

  const handleSaveConfig = () => {
    alert("Form filter configuration saved successfully!");
  };

  return (
    <div className="space-y-6">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition flex items-center gap-1 text-sm font-medium"
            title="Back to Reports"
          >
            <ChevronLeft size={18} />
            <span>Reports</span>
          </button>
          <div className="h-6 w-px bg-slate-200" />
          <h1 className="text-xl font-bold text-blue-700 tracking-tight">Policy Register</h1>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            onClick={handleSaveConfig}
            className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition"
            title="Save Configuration"
          >
            <Save size={20} />
          </button>
          <button
            onClick={handleReset}
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
            title="Reset Form"
          >
            <RotateCcw size={20} />
          </button>
          <button
            onClick={() => onGenerateReport(formData)}
            className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition"
            title="Generate PDF / Export"
          >
            <FileText size={20} />
          </button>
        </div>
      </div>

      {/* Main Form Container */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden divide-y divide-slate-100">
        {/* Section 1: Filter Options */}
        <div className="p-6 space-y-5">
          <div className="bg-blue-50/70 border-l-4 border-blue-600 px-4 py-2 rounded-r-md">
            <h2 className="text-base font-semibold text-blue-900">Filter Options</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-2">
            {/* Selected Filter Box */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Filter Options
              </label>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <span className="absolute -top-2 left-3 bg-white px-1 text-[10px] text-blue-600 font-semibold">
                    Selected Filter
                  </span>
                  <div className="flex items-center justify-between border border-slate-300 rounded-md px-3 py-2 text-sm bg-white">
                    <span className="text-slate-700 font-medium">
                      {formData.appliedFilters.length > 0
                        ? `${formData.appliedFilters.length} filter applied`
                        : "No filters applied"}
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsFilterModalOpen(true)}
                      className="px-2.5 py-1 text-xs font-semibold text-blue-700 bg-slate-100 border border-slate-300 rounded hover:bg-slate-200 transition"
                    >
                      View Filter
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, appliedFilters: [] }))}
                  className="p-2 text-slate-400 hover:text-blue-700 transition"
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
                <div className="relative flex-1">
                  <input
                    type="date"
                    value={formData.fromCommDate}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, fromCommDate: e.target.value }))
                    }
                    className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-blue-600"
                    placeholder="From Date"
                  />
                </div>
                <span className="text-sm font-medium text-slate-500">To</span>
                <div className="relative flex-1">
                  <input
                    type="date"
                    value={formData.toCommDate}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, toCommDate: e.target.value }))
                    }
                    className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>
            </div>

            {/* Policy Type Toggle */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Policy Type
              </label>
              <div className="inline-flex bg-slate-100 p-1 rounded-lg border border-slate-200 w-full">
                {(["ULIP", "Traditional", "Both"] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, policyType: type }))}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-md transition ${
                      formData.policyType === type
                        ? "bg-blue-600 text-white shadow-sm"
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
                <label className="flex items-center gap-2 text-sm text-slate-700 font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.paymentTypes.nach}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        paymentTypes: { ...prev.paymentTypes, nach: e.target.checked },
                      }))
                    }
                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>NACH</span>
                </label>

                <label className="flex items-center gap-2 text-sm text-slate-700 font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.paymentTypes.otherThanNach}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        paymentTypes: { ...prev.paymentTypes, otherThanNach: e.target.checked },
                      }))
                    }
                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
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
              <div className="relative">
                <input
                  type="date"
                  value={formData.reportDate}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, reportDate: e.target.value }))
                  }
                  className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-blue-600"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Sorting Options */}
        <div className="p-6 space-y-5">
          <div className="bg-blue-50/70 border-l-4 border-blue-600 px-4 py-2 rounded-r-md">
            <h2 className="text-base font-semibold text-blue-900">Sorting Options</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-y-3 gap-x-6 pt-2">
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
                className="flex items-center gap-2.5 text-sm font-medium text-slate-700 hover:text-blue-700 cursor-pointer transition"
              >
                <input
                  type="radio"
                  name="sortingOption"
                  value={opt.id}
                  checked={formData.sortingOption === opt.id}
                  onChange={() => setFormData((prev) => ({ ...prev, sortingOption: opt.id as any }))}
                  className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-slate-300"
                />
                <span>{opt.label}</span>
              </label>
            ))}
          </div>

          {/* Select Groups Filter Field */}
          <div className="pt-4 max-w-lg">
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-slate-700 whitespace-nowrap">
                Select Groups
              </span>
              <div className="relative flex-1">
                <input
                  type="text"
                  readOnly
                  value={
                    formData.selectedGroups.length === 0
                      ? "All Groups Selected"
                      : `${formData.selectedGroups.length} Groups Selected`
                  }
                  className="w-full bg-slate-50 border border-slate-300 rounded-md px-3 py-2 text-sm font-medium text-slate-700 cursor-pointer"
                  onClick={() => setIsGroupModalOpen(true)}
                />
              </div>

              <button
                type="button"
                onClick={() => setIsGroupModalOpen(true)}
                className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition shadow-sm"
                title="Filter Groups"
              >
                <Filter size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* Section 3: Report Options */}
        <div className="p-6 space-y-5">
          <div className="bg-blue-50/70 border-l-4 border-blue-600 px-4 py-2 rounded-r-md">
            <h2 className="text-base font-semibold text-blue-900">Report Options</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-y-3 gap-x-6 pt-2">
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
                className="flex items-center gap-2.5 text-sm font-medium text-slate-700 hover:text-blue-700 cursor-pointer transition"
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
                  className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span>{opt.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Bottom Actions Bar */}
        <div className="p-6 bg-slate-50 flex items-center justify-between border-t border-slate-200">
          <button
            type="button"
            onClick={onBack}
            className="px-5 py-2.5 border border-slate-300 text-slate-700 font-medium text-sm rounded-lg hover:bg-white transition"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={() => onGenerateReport(formData)}
            className="flex items-center gap-2 px-8 py-2.5 bg-gradient-to-r from-blue-600 to-blue-800 text-white font-semibold text-sm rounded-lg shadow-md shadow-blue-600/20 hover:from-blue-700 hover:to-blue-900 transition"
          >
            <span>Generate Report</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </div>

      {/* Filter Options Modal (SS 4) */}
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

      {/* Select Group Modal (SS 5) */}
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
