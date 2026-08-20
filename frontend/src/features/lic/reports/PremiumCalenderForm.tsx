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

export interface PremiumCalendarFormData {
  appliedFilters: SelectedFilterItem[];
  yearBasis: "financialYear" | "calendarYear";
  dateFrom: string;
  dateTo: string;
  paymentTypes: {
    nach: boolean;
    other: boolean;
  };
  reportDate: string;
  reportType: "type1" | "type2";
  includeLoanInterest: boolean;
  showGraph: boolean;
  selectedGroups: GroupFilterItem[];
  printOptions: {
    mailingLabels: boolean;
    statementWithPan: boolean;
    despatchList: boolean;
  };
  costPerDespatch: string;
  purpose: string;
}

interface PremiumCalendarFormProps {
  onBack: () => void;
  onGenerateReport: (formData: PremiumCalendarFormData) => void;
  initialData?: PremiumCalendarFormData | null;
  policyStatuses: Array<{ id: string; statusName: string; statusCode: string }>;
  customers: Array<{
    id: string;
    groupCode?: string | null;
    name: string;
    groupName?: string | null;
  }>;
}

const getTodayDateStr = () => new Date().toISOString().split("T")[0];

function toInputDate(d: Date) {
  return d.toISOString().split("T")[0];
}

// Financial Year: 1 Apr → 31 Mar (of next year), based on today's date
function getFinancialYearRange(base: Date = new Date()) {
  const fyStartYear = base.getMonth() >= 3 ? base.getFullYear() : base.getFullYear() - 1;
  const from = new Date(fyStartYear, 3, 1); // Apr 1
  const to = new Date(fyStartYear + 1, 2, 31); // Mar 31 next year
  return { from: toInputDate(from), to: toInputDate(to) };
}

// Calendar Year: 1 Jan → 31 Dec of the current year
function getCalendarYearRange(base: Date = new Date()) {
  const year = base.getFullYear();
  const from = new Date(year, 0, 1);
  const to = new Date(year, 11, 31);
  return { from: toInputDate(from), to: toInputDate(to) };
}

// Premium Calendar starts with only 3 Policy Statuses pre-ticked
// (Policy Register uses 4 — this report intentionally excludes "Fully paid-up")
const DEFAULT_PREMIUM_CALENDAR_STATUSES: SelectedFilterItem[] = [
  { type: "Policy Status", id: "status-inforce", name: "Inforce" },
  { type: "Policy Status", id: "status-lapsed", name: "Lapsed" },
  { type: "Policy Status", id: "status-red-paidup", name: "Reduced Paid-up" },
];

export default function PremiumCalendarForm({
  onBack,
  onGenerateReport,
  initialData,
  policyStatuses,
  customers,
}: PremiumCalendarFormProps) {
  const buildDefaultFormData = (): PremiumCalendarFormData => {
    const fy = getFinancialYearRange();
    return {
      appliedFilters: DEFAULT_PREMIUM_CALENDAR_STATUSES,
      yearBasis: "financialYear",
      dateFrom: fy.from,
      dateTo: fy.to,
      paymentTypes: { nach: false, other: true },
      reportDate: getTodayDateStr(),
      reportType: "type1",
      includeLoanInterest: true,
      showGraph: false,
      selectedGroups: [],
      printOptions: {
        mailingLabels: false,
        statementWithPan: false,
        despatchList: false,
      },
      costPerDespatch: "",
      purpose: "",
    };
  };

  const [formData, setFormData] = useState<PremiumCalendarFormData>(() => {
    if (initialData) return initialData;
    return buildDefaultFormData();
  });

  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);

  const handleReset = () => {
    setFormData(buildDefaultFormData());
  };

  const handleYearBasisChange = (basis: "financialYear" | "calendarYear") => {
    const range = basis === "financialYear" ? getFinancialYearRange() : getCalendarYearRange();
    setFormData((prev) => ({
      ...prev,
      yearBasis: basis,
      dateFrom: range.from,
      dateTo: range.to,
    }));
  };

  const getGroupSelectLabel = () => {
    if (formData.selectedGroups.length === 0) return "All Groups Selected";
    return `${formData.selectedGroups.length} group(s) selected`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
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
              Premium Calendar
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

            {/* Report Based On */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Report Based On
              </label>
              <div className="inline-flex bg-slate-100 p-1 rounded-xl border border-slate-200 w-full">
                {(
                  [
                    { id: "financialYear", label: "Financial Year" },
                    { id: "calendarYear", label: "Calender Year" },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handleYearBasisChange(opt.id)}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition ${
                      formData.yearBasis === opt.id
                        ? "bg-[#0B1220] text-[#E8C77A] shadow-sm"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    {opt.label}
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
                    checked={formData.paymentTypes.other}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        paymentTypes: { ...prev.paymentTypes, other: e.target.checked },
                      }))
                    }
                    className="w-4 h-4 rounded border-slate-300 text-[#B8873A] focus:ring-[#B8873A]"
                  />
                  <span>Other</span>
                </label>
              </div>
            </div>

            {/* Date From */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Date From
              </label>
              <input
                type="date"
                value={formData.dateFrom}
                onChange={(e) => setFormData((prev) => ({ ...prev, dateFrom: e.target.value }))}
                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#B8873A]"
              />
            </div>

            {/* To Date */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                To
              </label>
              <input
                type="date"
                value={formData.dateTo}
                onChange={(e) => setFormData((prev) => ({ ...prev, dateTo: e.target.value }))}
                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#B8873A]"
              />
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
          </div>
        </div>

        {/* Section 2: Report Options */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#B8873A] via-[#B8873A]/40 to-transparent" />
          <div className="flex items-center gap-2 mb-4">
            <h2 className="font-serif text-sm font-bold uppercase tracking-wider text-slate-900">
              Report Options
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-x-10 gap-y-4">
            {/* Report Type */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Report Type
              </label>
              <div className="inline-flex bg-slate-100 p-1 rounded-xl border border-slate-200">
                {(
                  [
                    { id: "type1", label: "Type 1" },
                    { id: "type2", label: "Type 2" },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, reportType: opt.id }))}
                    className={`px-6 py-1.5 text-xs font-bold rounded-lg transition ${
                      formData.reportType === opt.id
                        ? "bg-[#0B1220] text-[#E8C77A] shadow-sm"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <label className="flex items-center gap-2.5 text-xs font-bold text-slate-800 hover:text-[#B8873A] cursor-pointer transition">
              <input
                type="checkbox"
                checked={formData.includeLoanInterest}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, includeLoanInterest: e.target.checked }))
                }
                className="w-4 h-4 rounded border-slate-300 text-[#B8873A] focus:ring-[#B8873A]"
              />
              <span>Include Loan Interest</span>
            </label>

            <label className="flex items-center gap-2.5 text-xs font-bold text-slate-800 hover:text-[#B8873A] cursor-pointer transition">
              <input
                type="checkbox"
                checked={formData.showGraph}
                onChange={(e) => setFormData((prev) => ({ ...prev, showGraph: e.target.checked }))}
                className="w-4 h-4 rounded border-slate-300 text-[#B8873A] focus:ring-[#B8873A]"
              />
              <span>Show Graph</span>
            </label>
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
                  value={getGroupSelectLabel()}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 cursor-pointer"
                  onClick={() => setIsGroupModalOpen(true)}
                />
              </div>

              <button
                type="button"
                onClick={() => setIsGroupModalOpen(true)}
                className="p-2.5 bg-[#0B1220] hover:bg-slate-900 text-[#E8C77A] rounded-xl transition shadow-md border border-slate-800"
                title="Open Group Filter"
              >
                <Filter size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Section 3: Print Options */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#B8873A] via-[#B8873A]/40 to-transparent" />
          <div className="flex items-center gap-2 mb-4">
            <h2 className="font-serif text-sm font-bold uppercase tracking-wider text-slate-900">
              Print Options
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-y-4 gap-x-6">
            <label className="flex items-center gap-2.5 text-xs font-bold text-slate-800 hover:text-[#B8873A] cursor-pointer transition">
              <input
                type="checkbox"
                checked={formData.printOptions.mailingLabels}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    printOptions: { ...prev.printOptions, mailingLabels: e.target.checked },
                  }))
                }
                className="w-4 h-4 rounded border-slate-300 text-[#B8873A] focus:ring-[#B8873A]"
              />
              <span>Mailing Labels</span>
            </label>

            <label className="flex items-center gap-2.5 text-xs font-bold text-slate-800 hover:text-[#B8873A] cursor-pointer transition">
              <input
                type="checkbox"
                checked={formData.printOptions.statementWithPan}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    printOptions: { ...prev.printOptions, statementWithPan: e.target.checked },
                  }))
                }
                className="w-4 h-4 rounded border-slate-300 text-[#B8873A] focus:ring-[#B8873A]"
              />
              <span>Statement with PAN</span>
            </label>

            <label className="flex items-center gap-2.5 text-xs font-bold text-slate-800 hover:text-[#B8873A] cursor-pointer transition">
              <input
                type="checkbox"
                checked={formData.printOptions.despatchList}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    printOptions: { ...prev.printOptions, despatchList: e.target.checked },
                  }))
                }
                className="w-4 h-4 rounded border-slate-300 text-[#B8873A] focus:ring-[#B8873A]"
              />
              <span>Despatch List</span>
            </label>

            <div className="space-y-1.5">
              <input
                type="text"
                placeholder="Cost Per Despatch"
                value={formData.costPerDespatch}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, costPerDespatch: e.target.value }))
                }
                disabled={!formData.printOptions.despatchList}
                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#B8873A] disabled:bg-slate-50 disabled:text-slate-400"
              />
            </div>

            <div className="space-y-1.5">
              <input
                type="text"
                placeholder="Purpose"
                value={formData.purpose}
                onChange={(e) => setFormData((prev) => ({ ...prev, purpose: e.target.value }))}
                disabled={!formData.printOptions.despatchList}
                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#B8873A] disabled:bg-slate-50 disabled:text-slate-400"
              />
            </div>
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

      {/* Filter Options Modal — Policy Status only, 3 pre-ticked */}
      <FilterOptionsModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        agencies={[]}
        policyStatuses={policyStatuses}
        selectedFilters={formData.appliedFilters}
        defaultCategory="Policy Status"
        enableDefaultStatusSelection={false}
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
        onApplyGroups={(groups) =>
          setFormData((prev) => ({ ...prev, selectedGroups: groups }))
        }
      />
    </div>
  );
}