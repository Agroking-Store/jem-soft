"use client";

import { useEffect, useState } from "react";
import {
  RotateCcw,
  FileText,
  Filter,
  FilterX,
  ChevronLeft,
} from "lucide-react";
import FilterOptionsModal, {
  type SelectedFilterItem,
} from "./FilterOptionsModal";
import SelectGroupModal, { type GroupFilterItem } from "./SelectGroupModal";
import SortingFilterModal, {
  type SortingFilterSelection,
} from "./SortingFilterModal";
import DatePicker from "@/app/(dashboard)/dashboard/lic/policies/new/DatePicker";
import { format, parseISO, isValid } from "date-fns";

export interface LoanInterestOutstandingFormData {
  calculationDate: string;
  reportDate: string;
  reportType: "Statement" | "Intimation";
  sortingOption:
    | "groupsWise"
    | "groupMemberwise"
    | "areaWise"
    | "subAreaWise"
    | "branchNoWise";
  selectedGroups: GroupFilterItem[];
  statementOptions: {
    statementWithAddress: boolean;
    dob: boolean;
    registerWithTelNos: boolean;
  };
  intimationOptions: {
    mailingLabels: boolean;
    despatchList: boolean;
    dob: boolean;
    costPerDespatch: string;
    purpose: string;
  };
  appliedFilters: SelectedFilterItem[];
  sortingFilterSelection: SortingFilterSelection | null;
}

interface LoanInterestOutstandingFormProps {
  onBack: () => void;
  onGenerateReport: (data: LoanInterestOutstandingFormData) => void;
  initialData?: LoanInterestOutstandingFormData | null;
  agencies: any[];
  policyStatuses: any[];
  customers: any[];
  policies: any[];
  branches?: Array<{
    id: string;
    branchCode: string;
    branchName: string;
  }>;
  loans?: any[];
}

const getToday = () => format(new Date(), "yyyy-MM-dd");

// Dates start empty and are filled in on the client (see useEffect below)
// to avoid server/client hydration mismatches.
const defaultFormData = (): LoanInterestOutstandingFormData => ({
  calculationDate: "",
  reportDate: "",
  reportType: "Statement",
  sortingOption: "groupsWise",
  selectedGroups: [],
  statementOptions: {
    statementWithAddress: false,
    dob: false,
    registerWithTelNos: true,
  },
  intimationOptions: {
    mailingLabels: false,
    despatchList: false,
    dob: false,
    costPerDespatch: "0",
    purpose: "",
  },
  appliedFilters: [],
  sortingFilterSelection: null,
});

const parseDate = (value: string): Date | undefined => {
  if (!value) return undefined;

  const parsed = parseISO(value);
  return isValid(parsed) ? parsed : undefined;
};

const VISIBLE_CATEGORIES = [
  "Groups Wise",
  "Agencies",
  "Branches",
  "Areas",
  "Policy Status",
];

const SORTING_OPTIONS: Array<{
  id: LoanInterestOutstandingFormData["sortingOption"];
  label: string;
}> = [
  { id: "groupsWise", label: "Groups Wise" },
  { id: "groupMemberwise", label: "Group Memberwise" },
  { id: "areaWise", label: "Area Wise" },
  { id: "subAreaWise", label: "Sub-Area Wise" },
  { id: "branchNoWise", label: "Branch No. Wise" },
];

const SEND_TO_OPTIONS = SORTING_OPTIONS.filter(
  (option) =>
    option.id === "groupsWise" || option.id === "groupMemberwise"
);

export default function LoanInterestOutstandingForm({
  onBack,
  onGenerateReport,
  initialData,
  agencies,
  policyStatuses,
  customers,
  policies,
  branches = [],
}: LoanInterestOutstandingFormProps) {
  const [formData, setFormData] =
    useState<LoanInterestOutstandingFormData>(
      () => initialData ?? defaultFormData()
    );

  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [isSortingModalOpen, setIsSortingModalOpen] = useState(false);
  // Bumped on reset so the modals (which keep their own internal selection state) remount cleanly.
  const [resetKey, setResetKey] = useState(0);

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    } else {
      const today = getToday();
      setFormData((prev) => ({
        ...prev,
        calculationDate: prev.calculationDate || today,
        reportDate: prev.reportDate || today,
      }));
    }
  }, [initialData]);

  const handleReset = () => {
    setResetKey((k) => k + 1);
    const base = initialData ?? defaultFormData();
    const today = getToday();
    setFormData({
      ...base,
      calculationDate: base.calculationDate || today,
      reportDate: base.reportDate || today,
    });
  };

  const handleGenerateReport = () => {
    const calcDate = parseDate(formData.calculationDate);
    const repDate = parseDate(formData.reportDate);

    if (!calcDate) {
      alert("Please select a valid calculation date.");
      return;
    }

    if (!repDate) {
      alert("Please select a valid report date.");
      return;
    }

    if (repDate < calcDate) {
      alert("Report date cannot be before the calculation date.");
      return;
    }

    if (formData.reportType === "Intimation") {
      const cost = Number(formData.intimationOptions.costPerDespatch);

      if (
        formData.intimationOptions.costPerDespatch.trim() === "" ||
        !Number.isFinite(cost) ||
        cost < 0
      ) {
        alert("Please enter a valid, non-negative cost per despatch.");
        return;
      }
    }

    onGenerateReport(formData);
  };

  const getSelectGroupsLabel = () => {
    if (formData.sortingOption === "groupsWise") {
      const count = formData.selectedGroups.length;
      return count > 0
        ? `${count} Group(s) selected`
        : "All Groups Selected";
    }

    const count =
      formData.sortingFilterSelection?.selectedItems?.length || 0;

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
      default:
        return "All Groups Selected";
    }
  };

  const selectLabel =
    formData.sortingOption === "groupsWise"
      ? "Select Groups"
      : formData.sortingOption === "groupMemberwise"
        ? "Select Members"
        : formData.sortingOption === "areaWise"
          ? "Select Areas"
          : formData.sortingOption === "subAreaWise"
            ? "Select Sub-Areas"
            : "Select Branches";

  const openSelectGroupsModal = () => {
    if (formData.sortingOption === "groupsWise") {
      setIsGroupModalOpen(true);
    } else {
      setIsSortingModalOpen(true);
    }
  };

  const activeSortingOptions =
    formData.reportType === "Statement"
      ? SORTING_OPTIONS
      : SEND_TO_OPTIONS;

  const updateStatementOption = (
    key: keyof LoanInterestOutstandingFormData["statementOptions"],
    checked: boolean
  ) => {
    setFormData((prev) => ({
      ...prev,
      statementOptions: {
        ...prev.statementOptions,
        [key]: checked,
      },
    }));
  };

  const updateIntimationOption = (
    key: "mailingLabels" | "despatchList" | "dob",
    checked: boolean
  ) => {
    setFormData((prev) => ({
      ...prev,
      intimationOptions: {
        ...prev.intimationOptions,
        [key]: checked,
      },
    }));
  };

  return (
    <div className="space-y-6">
      {/* Top Header Bar */}
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold uppercase tracking-wider text-slate-500 transition-colors hover:bg-slate-50"
            title="Back to Reports"
          >
            <ChevronLeft size={18} />
            <span>Reports</span>
          </button>

          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Loan Outstanding Due
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition-colors hover:bg-slate-50"
            title="Reset Form"
          >
            <RotateCcw size={17} />
          </button>

          <button
            type="button"
            onClick={handleGenerateReport}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#5c67ff] to-[#3a47ff] px-4 py-2 text-xs font-bold uppercase tracking-wider text-white shadow-md shadow-blue-200 transition-all hover:brightness-110 active:scale-[0.98]"
            title="Generate Report"
          >
            <FileText size={15} />
            <span>Generate</span>
          </button>
        </div>
      </div>

      <div className="space-y-6">
        {/* Section 1: Filter Options */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#1877F2] via-[#1877F2]/40 to-transparent" />

          <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-slate-900">
            Filter Options
          </h2>

          <div className="grid grid-cols-1 gap-6 pt-2 md:grid-cols-2 lg:grid-cols-3">
            {/* Selected Filter Box */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Filter Options
              </label>

              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <span className="absolute -top-2 left-3 bg-white px-1 text-[10px] font-bold uppercase tracking-wider text-[#1877F2]">
                    Selected Filter
                  </span>

                  <input
                    type="text"
                    readOnly
                    value={
                      formData.appliedFilters.length > 0
                        ? `${formData.appliedFilters.length} filter${
                            formData.appliedFilters.length > 1 ? "s" : ""
                          } selected`
                        : "All filters Selected"
                    }
                    onClick={() => setIsFilterModalOpen(true)}
                    className="w-full cursor-pointer rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800"
                    aria-label="Selected filters"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => setIsFilterModalOpen(true)}
                  className="cursor-pointer rounded-xl border border-slate-800 bg-gradient-to-r from-[#5c67ff] to-[#3a47ff] p-2.5 text-white shadow-md transition"
                  title="Open Filter Options"
                >
                  <Filter size={16} />
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setFormData((prev) => ({
                      ...prev,
                      appliedFilters: [],
                    }))
                  }
                  className="cursor-pointer p-2 text-slate-400 transition hover:text-red-600"
                  title="Clear applied filters"
                >
                  <FilterX size={18} />
                </button>
              </div>
            </div>

            {/* Report Type Toggle */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Report Type
              </label>

              <div className="inline-flex w-full rounded-xl border border-slate-200 bg-slate-100 p-1">
                {(["Statement", "Intimation"] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() =>
                      setFormData((prev) => ({
                        ...prev,
                        reportType: type,
                        ...(type === "Intimation" &&
                        prev.sortingOption !== "groupsWise" &&
                        prev.sortingOption !== "groupMemberwise"
                          ? {
                              sortingOption: "groupsWise" as const,
                              selectedGroups: [],
                              sortingFilterSelection: null,
                            }
                          : {}),
                      }))
                    }
                    className={`flex-1 cursor-pointer rounded-lg py-1.5 text-xs font-bold transition ${
                      formData.reportType === type
                        ? "bg-[#1877F2] text-white shadow-sm"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* Calculation Date */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Calculation Date
              </label>

              <DatePicker
                value={parseDate(formData.calculationDate)}
                onChange={(date) =>
                  setFormData((prev) => ({
                    ...prev,
                    calculationDate: date ? format(date, "yyyy-MM-dd") : "",
                  }))
                }
              />
            </div>

            {/* Report Date */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Report Date
              </label>

              <DatePicker
                value={parseDate(formData.reportDate)}
                onChange={(date) =>
                  setFormData((prev) => ({
                    ...prev,
                    reportDate: date ? format(date, "yyyy-MM-dd") : "",
                  }))
                }
              />
            </div>
          </div>
        </div>

        {/* Section 2: Sorting Options / Send To */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#1877F2] via-[#1877F2]/40 to-transparent" />

          <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-slate-900">
            {formData.reportType === "Statement"
              ? "Sorting Options"
              : "Send To"}
          </h2>

          <div className="grid grid-cols-1 gap-x-6 gap-y-3.5 pt-2 sm:grid-cols-2 md:grid-cols-4">
            {activeSortingOptions.map((option) => (
              <label
                key={option.id}
                className="flex cursor-pointer items-center gap-2.5 text-xs font-bold text-slate-800 transition hover:text-[#1877F2]"
              >
                <input
                  type="radio"
                  name="sortingOption"
                  value={option.id}
                  checked={formData.sortingOption === option.id}
                  onChange={() =>
                    setFormData((prev) => ({
                      ...prev,
                      sortingOption: option.id,
                      selectedGroups: [],
                      sortingFilterSelection: null,
                    }))
                  }
                  className="h-4 w-4 border-slate-300 text-[#1877F2] focus:ring-[#1877F2]"
                />
                <span>{option.label}</span>
              </label>
            ))}
          </div>

          {/* Select Groups / Members / Areas / Branches */}
          <div className="max-w-lg pt-5">
            <div className="flex items-center gap-3">
              <span className="whitespace-nowrap text-xs font-bold uppercase tracking-wider text-slate-700">
                {selectLabel}
              </span>

              <div className="relative flex-1">
                <input
                  type="text"
                  readOnly
                  value={getSelectGroupsLabel()}
                  className="w-full cursor-pointer rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-800"
                  onClick={openSelectGroupsModal}
                  aria-label={selectLabel}
                />
              </div>

              <button
                type="button"
                onClick={openSelectGroupsModal}
                className="cursor-pointer rounded-xl border border-slate-800 bg-gradient-to-r from-[#5c67ff] to-[#3a47ff] p-2.5 text-white shadow-md transition"
                title="Open Selection Modal"
              >
                <Filter size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Section 3: Report Options */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#1877F2] via-[#1877F2]/40 to-transparent" />

          <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-slate-900">
            Report Options
          </h2>

          {formData.reportType === "Statement" ? (
            <div className="grid grid-cols-1 gap-x-6 gap-y-3.5 pt-2 sm:grid-cols-2 md:grid-cols-4">
              {(
                [
                  {
                    key: "statementWithAddress",
                    label: "Statement with Address",
                  },
                  { key: "dob", label: "DOB" },
                  {
                    key: "registerWithTelNos",
                    label: "Register with Tel Nos.",
                  },
                ] as const
              ).map((option) => (
                <label
                  key={option.key}
                  className="flex cursor-pointer items-center gap-2.5 text-xs font-bold text-slate-800 transition hover:text-[#1877F2]"
                >
                  <input
                    type="checkbox"
                    checked={formData.statementOptions[option.key]}
                    onChange={(event) =>
                      updateStatementOption(option.key, event.target.checked)
                    }
                    className="h-4 w-4 rounded border-slate-300 text-[#1877F2] focus:ring-[#1877F2]"
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
          ) : (
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-1 gap-x-6 gap-y-3.5 sm:grid-cols-2 md:grid-cols-4">
                {(
                  [
                    { key: "mailingLabels", label: "Mailing Labels" },
                    { key: "despatchList", label: "Despatch List" },
                    { key: "dob", label: "DOB" },
                  ] as const
                ).map((option) => (
                  <label
                    key={option.key}
                    className="flex cursor-pointer items-center gap-2.5 text-xs font-bold text-slate-800 transition hover:text-[#1877F2]"
                  >
                    <input
                      type="checkbox"
                      checked={formData.intimationOptions[option.key]}
                      onChange={(event) =>
                        updateIntimationOption(option.key, event.target.checked)
                      }
                      className="h-4 w-4 rounded border-slate-300 text-[#1877F2] focus:ring-[#1877F2]"
                    />
                    <span>{option.label}</span>
                  </label>
                ))}
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-1.5">
                  <label
                    htmlFor="costPerDespatch"
                    className="text-xs font-semibold uppercase tracking-wider text-slate-500"
                  >
                    Cost per Despatch
                  </label>
                  <input
                    id="costPerDespatch"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.intimationOptions.costPerDespatch}
                    onChange={(event) =>
                      setFormData((prev) => ({
                        ...prev,
                        intimationOptions: {
                          ...prev.intimationOptions,
                          costPerDespatch: event.target.value,
                        },
                      }))
                    }
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800"
                  />
                </div>

                <div className="space-y-1.5 lg:col-span-2">
                  <label
                    htmlFor="intimationPurpose"
                    className="text-xs font-semibold uppercase tracking-wider text-slate-500"
                  >
                    Purpose
                  </label>
                  <input
                    id="intimationPurpose"
                    type="text"
                    value={formData.intimationOptions.purpose}
                    onChange={(event) =>
                      setFormData((prev) => ({
                        ...prev,
                        intimationOptions: {
                          ...prev.intimationOptions,
                          purpose: event.target.value,
                        },
                      }))
                    }
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <FilterOptionsModal
        key={`filter-${resetKey}`}
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        agencies={agencies}
        policyStatuses={policyStatuses}
        customers={customers}
        branches={branches}
        visibleCategories={VISIBLE_CATEGORIES}
        enableDefaultStatusSelection={false}
        selectedFilters={formData.appliedFilters}
        onApplyFilters={(filters: SelectedFilterItem[]) => {
          setFormData((prev) => ({ ...prev, appliedFilters: filters }));
          setIsFilterModalOpen(false);
        }}
      />

      <SelectGroupModal
        key={`group-${resetKey}`}
        isOpen={isGroupModalOpen}
        onClose={() => setIsGroupModalOpen(false)}
        customers={customers}
        selectedGroups={formData.selectedGroups}
        onApplyGroups={(groups: GroupFilterItem[]) => {
          setFormData((prev) => ({ ...prev, selectedGroups: groups }));
          setIsGroupModalOpen(false);
        }}
      />

      <SortingFilterModal
        key={`sorting-${formData.sortingOption}-${resetKey}`}
        isOpen={isSortingModalOpen}
        onClose={() => setIsSortingModalOpen(false)}
        sortingOption={formData.sortingOption}
        customers={customers}
        policies={policies}
        branches={branches}
        selectedFilters={formData.sortingFilterSelection}
        onApplySortingFilter={(selection: SortingFilterSelection) => {
          setFormData((prev) => ({
            ...prev,
            sortingFilterSelection: selection,
          }));
          setIsSortingModalOpen(false);
        }}
      />
    </div>
  );
}