"use client";

import { useState } from "react";
import { Save, RotateCcw, FileText, Filter, ChevronLeft, ArrowRight } from "lucide-react";
import FilterOptionsModal, { SelectedFilterItem } from "./FilterOptionsModal";
import SortingFilterModal, { SortingFilterSelection } from "./SortingFilterModal";
import SelectGroupModal, { GroupFilterItem } from "./SelectGroupModal";

export interface ComprehensiveInsuranceChartFormData {
  appliedFilters: SelectedFilterItem[];
  cashFlowStartDate: string;
  reportDate: string;
  sortingOption: "groupsWise" | "groupMemberwise";
  selectedGroups: GroupFilterItem[];
  sortingFilterSelection: SortingFilterSelection | null;
  calculationOptions: {
    loyaltyAddition: boolean;
    fab: boolean;
    bonusToBeConsidered: "interim" | "reversionary";
    scenarioForLAULIP: "6%" | "10%";
    cashFlowBasis: "normalMaturity" | "reducedPaidupMaturity";
  };
  reportType: "Standard" | "Compact";
  printOptions: {
    premiumCalendar: boolean;
    currentStatus: boolean;
    cashFlowChart: boolean;
    maturitySettlement: boolean;
    cashinCashoutSummary: boolean;
    barGraphs: boolean;
    nomineeList: boolean;
    prefilledNeftForm: boolean;
    specialInformation: boolean;
    statementWithPan: boolean;
    nachDetails: boolean;
    annuityCashFlow: boolean;
    printCashFlowAssumptions: boolean;
  };
  optionalColumns: {
    surrenderValue: boolean;
    loanAvailable: boolean;
  };
}

interface ComprehensiveInsuranceChartFormProps {
  onBack: () => void;
  onGenerateReport: (formData: ComprehensiveInsuranceChartFormData) => void;
  initialData?: ComprehensiveInsuranceChartFormData | null;
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

const getDefaultFormData = (): ComprehensiveInsuranceChartFormData => ({
  appliedFilters: [],
  cashFlowStartDate: getTodayDateStr(),
  reportDate: getTodayDateStr(),
  sortingOption: "groupsWise",
  selectedGroups: [],
  sortingFilterSelection: null,
  calculationOptions: {
    loyaltyAddition: true,
    fab: true,
    bonusToBeConsidered: "reversionary",
    scenarioForLAULIP: "10%",
    cashFlowBasis: "normalMaturity",
  },
  reportType: "Standard",
  printOptions: {
    premiumCalendar: true,
    currentStatus: true,
    cashFlowChart: true,
    maturitySettlement: false,
    cashinCashoutSummary: true,
    barGraphs: true,
    nomineeList: false,
    prefilledNeftForm: false,
    specialInformation: true,
    statementWithPan: true,
    nachDetails: true,
    annuityCashFlow: true,
    printCashFlowAssumptions: true,
  },
  optionalColumns: {
    surrenderValue: true,
    loanAvailable: true,
  },
});

export default function ComprehensiveInsuranceChartForm({
  onBack,
  onGenerateReport,
  initialData,
  agencies,
  policyStatuses,
  customers,
  policies,
  branches = [],
}: ComprehensiveInsuranceChartFormProps) {
  const [formData, setFormData] = useState<ComprehensiveInsuranceChartFormData>(initialData || getDefaultFormData());
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [isSortingModalOpen, setIsSortingModalOpen] = useState(false);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);

  const handleReset = () => setFormData(getDefaultFormData());

  const getSelectGroupsLabel = () => {
    if (formData.sortingOption === "groupsWise") {
      const count = formData.selectedGroups.length;
      return count > 0 ? `${count} Groups selected` : "No Groups Selected";
    }
    const count = formData.sortingFilterSelection?.selectedItems?.length || 0;
    return count > 0 ? `${count} item(s) selected` : "No Members Selected";
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
            <h1 className="font-serif text-xl font-bold text-[#E8C77A] tracking-wider uppercase">Comprehensive Insurance Chart</h1>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => alert("Filter configuration saved!")} className="p-2 text-[#E8C77A] hover:bg-white/10 rounded-xl transition"><Save size={20} /></button>
            <button onClick={handleReset} className="p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-xl transition"><RotateCcw size={20} /></button>
            <button onClick={() => onGenerateReport(formData)} className="p-2 text-[#E8C77A] hover:bg-white/10 rounded-xl transition"><FileText size={20} /></button>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {/* Filter Options */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#B8873A] via-[#B8873A]/40 to-transparent" />
          <h2 className="font-serif text-sm font-bold uppercase tracking-wider text-slate-900 mb-4">Filter Options</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Filter Options</label>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <span className="absolute -top-2 left-3 bg-white px-1 text-[10px] text-[#B8873A] font-bold uppercase tracking-wider">Selected Filter</span>
                  <div className="flex items-center justify-between border border-slate-300 rounded-xl px-3 py-2 text-xs bg-white">
                    <span className="text-slate-800 font-semibold">
                      {formData.appliedFilters.length > 0 ? `${formData.appliedFilters.length} filter applied` : "No filters applied"}
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
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Cash Flow Start Date</label>
              <input
                type="date"
                value={formData.cashFlowStartDate}
                onChange={(e) => setFormData((prev) => ({ ...prev, cashFlowStartDate: e.target.value }))}
                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#B8873A]"
              />
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
          </div>
        </div>

        {/* Sorting Options */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#B8873A] via-[#B8873A]/40 to-transparent" />
          <h2 className="font-serif text-sm font-bold uppercase tracking-wider text-slate-900 mb-4">Sorting Options</h2>
          <div className="flex items-center gap-8">
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Calculation Options */}
          <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#B8873A] via-[#B8873A]/40 to-transparent" />
            <h2 className="font-serif text-sm font-bold uppercase tracking-wider text-slate-900 mb-4">Calculation Options</h2>

            <div className="flex items-center gap-8 pb-4">
              <label className="flex items-center gap-2.5 text-xs font-bold text-slate-800 hover:text-[#B8873A] cursor-pointer transition">
                <input
                  type="checkbox"
                  checked={formData.calculationOptions.loyaltyAddition}
                  onChange={(e) => setFormData((prev) => ({ ...prev, calculationOptions: { ...prev.calculationOptions, loyaltyAddition: e.target.checked } }))}
                  className="w-4 h-4 rounded border-slate-300 text-[#B8873A] focus:ring-[#B8873A]"
                />
                <span>Loyalty Addition</span>
              </label>
              <label className="flex items-center gap-2.5 text-xs font-bold text-slate-800 hover:text-[#B8873A] cursor-pointer transition">
                <input
                  type="checkbox"
                  checked={formData.calculationOptions.fab}
                  onChange={(e) => setFormData((prev) => ({ ...prev, calculationOptions: { ...prev.calculationOptions, fab: e.target.checked } }))}
                  className="w-4 h-4 rounded border-slate-300 text-[#B8873A] focus:ring-[#B8873A]"
                />
                <span>F.A.B</span>
              </label>
            </div>

            <div className="text-center text-[11px] font-bold text-slate-500 uppercase tracking-wider border-t border-slate-200 pt-2 mb-2">Bonus To Be considered</div>
            <div className="flex items-center justify-center gap-8 pb-4">
              {([
                { id: "interim", label: "Interim Bonus" },
                { id: "reversionary", label: "Reversionary Bonus" },
              ] as const).map((opt) => (
                <label key={opt.id} className="flex items-center gap-2.5 text-xs font-bold text-slate-800 hover:text-[#B8873A] cursor-pointer transition">
                  <input
                    type="radio"
                    name="bonusToBeConsidered"
                    checked={formData.calculationOptions.bonusToBeConsidered === opt.id}
                    onChange={() => setFormData((prev) => ({ ...prev, calculationOptions: { ...prev.calculationOptions, bonusToBeConsidered: opt.id } }))}
                    className="w-4 h-4 text-[#B8873A] focus:ring-[#B8873A] border-slate-300"
                  />
                  <span>{opt.label}</span>
                </label>
              ))}
            </div>

            <div className="text-center text-[11px] font-bold text-slate-500 uppercase tracking-wider border-t border-slate-200 pt-2 mb-2">Scenario for LA/ULIP</div>
            <div className="flex items-center justify-center gap-8 pb-4">
              {([
                { id: "6%", label: "I - 6 %" },
                { id: "10%", label: "II - 10 %" },
              ] as const).map((opt) => (
                <label key={opt.id} className="flex items-center gap-2.5 text-xs font-bold text-slate-800 hover:text-[#B8873A] cursor-pointer transition">
                  <input
                    type="radio"
                    name="scenarioForLAULIP"
                    checked={formData.calculationOptions.scenarioForLAULIP === opt.id}
                    onChange={() => setFormData((prev) => ({ ...prev, calculationOptions: { ...prev.calculationOptions, scenarioForLAULIP: opt.id } }))}
                    className="w-4 h-4 text-[#B8873A] focus:ring-[#B8873A] border-slate-300"
                  />
                  <span>{opt.label}</span>
                </label>
              ))}
            </div>

            <div className="text-center text-[11px] font-bold text-slate-500 uppercase tracking-wider border-t border-slate-200 pt-2 mb-2">Cash Flow Basis</div>
            <div className="flex items-center justify-center gap-8">
              {([
                { id: "normalMaturity", label: "Normal Maturity" },
                { id: "reducedPaidupMaturity", label: "Reduced Paidup Maturity" },
              ] as const).map((opt) => (
                <label key={opt.id} className="flex items-center gap-2.5 text-xs font-bold text-slate-800 hover:text-[#B8873A] cursor-pointer transition">
                  <input
                    type="radio"
                    name="cashFlowBasis"
                    checked={formData.calculationOptions.cashFlowBasis === opt.id}
                    onChange={() => setFormData((prev) => ({ ...prev, calculationOptions: { ...prev.calculationOptions, cashFlowBasis: opt.id } }))}
                    className="w-4 h-4 text-[#B8873A] focus:ring-[#B8873A] border-slate-300"
                  />
                  <span>{opt.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Print Options */}
          <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#B8873A] via-[#B8873A]/40 to-transparent" />
            <h2 className="font-serif text-sm font-bold uppercase tracking-wider text-slate-900 mb-4">Print Options</h2>
            <div className="grid grid-cols-2 gap-y-3.5 gap-x-6">
              {[
                { key: "premiumCalendar", label: "Premium Calendar" },
                { key: "prefilledNeftForm", label: "Prefilled NEFT Form" },
                { key: "currentStatus", label: "Current Status" },
                { key: "specialInformation", label: "Special Information" },
                { key: "cashFlowChart", label: "Cash Flow Chart" },
                { key: "statementWithPan", label: "Statement With PAN" },
                { key: "maturitySettlement", label: "Maturity Settlement" },
                { key: "nachDetails", label: "NACH Details" },
                { key: "cashinCashoutSummary", label: "Cashin Cashout Summary" },
                { key: "annuityCashFlow", label: "Annuity Cash Flow" },
                { key: "barGraphs", label: "Bar Graphs" },
                { key: "printCashFlowAssumptions", label: "Print CashFlow Assumptions" },
                { key: "nomineeList", label: "Nominee List" },
              ].map((opt) => (
                <label key={opt.key} className="flex items-center gap-2.5 text-xs font-bold text-slate-800 hover:text-[#B8873A] cursor-pointer transition">
                  <input
                    type="checkbox"
                    checked={(formData.printOptions as any)[opt.key]}
                    onChange={(e) => setFormData((prev) => ({ ...prev, printOptions: { ...prev.printOptions, [opt.key]: e.target.checked } }))}
                    className="w-4 h-4 rounded border-slate-300 text-[#B8873A] focus:ring-[#B8873A]"
                  />
                  <span>{opt.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Report Type */}
          <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#B8873A] via-[#B8873A]/40 to-transparent" />
            <h2 className="font-serif text-sm font-bold uppercase tracking-wider text-slate-900 mb-4">Report Type</h2>
            <div className="flex items-center gap-8">
              {(["Standard", "Compact"] as const).map((opt) => (
                <label key={opt} className="flex items-center gap-2.5 text-xs font-bold text-slate-800 hover:text-[#B8873A] cursor-pointer transition">
                  <input
                    type="radio"
                    name="reportType"
                    checked={formData.reportType === opt}
                    onChange={() => setFormData((prev) => ({ ...prev, reportType: opt }))}
                    className="w-4 h-4 text-[#B8873A] focus:ring-[#B8873A] border-slate-300"
                  />
                  <span>{opt}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Optional Columns */}
          <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#B8873A] via-[#B8873A]/40 to-transparent" />
            <h2 className="font-serif text-sm font-bold uppercase tracking-wider text-slate-900 mb-4">Optional Columns</h2>
            <div className="flex items-center gap-8">
              {[
                { key: "surrenderValue", label: "Surrender value" },
                { key: "loanAvailable", label: "Loan Available" },
              ].map((opt) => (
                <label key={opt.key} className="flex items-center gap-2.5 text-xs font-bold text-slate-800 hover:text-[#B8873A] cursor-pointer transition">
                  <input
                    type="checkbox"
                    checked={(formData.optionalColumns as any)[opt.key]}
                    onChange={(e) => setFormData((prev) => ({ ...prev, optionalColumns: { ...prev.optionalColumns, [opt.key]: e.target.checked } }))}
                    className="w-4 h-4 rounded border-slate-300 text-[#B8873A] focus:ring-[#B8873A]"
                  />
                  <span>{opt.label}</span>
                </label>
              ))}
            </div>
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

      {/* Filter Options Modal — same modal as Policy Register, and left at its DEFAULT
          enableDefaultStatusSelection=true so the 4 standard statuses come pre-ticked,
          exactly like Nida asked ("same to same as Policy Register"). */}
      <FilterOptionsModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        agencies={agencies}
        policyStatuses={policyStatuses}
        selectedFilters={formData.appliedFilters}
        onApplyFilters={(filters) => setFormData((prev) => ({ ...prev, appliedFilters: filters }))}
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