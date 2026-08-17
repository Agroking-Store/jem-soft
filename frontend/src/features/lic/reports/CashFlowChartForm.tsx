"use client";

import { useState } from "react";
import { Save, RotateCcw, FileText, Filter, ChevronLeft, ArrowRight } from "lucide-react";
import FilterOptionsModal, { SelectedFilterItem } from "./FilterOptionsModal";

export interface CashFlowChartFormData {
  appliedFilters: SelectedFilterItem[];
  cashFlowFromDate: string;
  cashFlowToDate: string;
  reportDate: string;
  yearBasis: "calendarYear" | "financialYear";
  annuityMode: "modeWise" | "yearly";
  calculationOptions: {
    includeLoyaltyAddition: boolean;
    includeFab: boolean;
    bonusToBeConsidered: "interim" | "reversionary";
    scenarioForLA: "scenario1" | "scenario2";
  };
  printOptions: {
    includeCashInOut: boolean;
    showGraphs: boolean;
    includeRecordOnlyPolicies: boolean;
  };
}

interface CashFlowChartFormProps {
  onBack: () => void;
  onGenerateReport: (formData: CashFlowChartFormData) => void;
  initialData?: CashFlowChartFormData | null;
  agencies: Array<{ id: string; agencyName: string; agencyCode: string }>;
  policyStatuses: Array<{ id: string; statusName: string; statusCode: string }>;
}

const getTodayDateStr = () => new Date().toISOString().split("T")[0];
const getTwentyYearsLaterDateStr = () => {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 20);
  return d.toISOString().split("T")[0];
};

const getDefaultFormData = (): CashFlowChartFormData => ({
  appliedFilters: [],
  cashFlowFromDate: getTodayDateStr(),
  cashFlowToDate: getTwentyYearsLaterDateStr(),
  reportDate: getTodayDateStr(),
  yearBasis: "financialYear",
  annuityMode: "yearly",
  calculationOptions: {
    includeLoyaltyAddition: false,
    includeFab: true,
    bonusToBeConsidered: "reversionary",
    scenarioForLA: "scenario2",
  },
  printOptions: {
    includeCashInOut: false,
    showGraphs: true,
    includeRecordOnlyPolicies: false,
  },
});

export default function CashFlowChartForm({
  onBack,
  onGenerateReport,
  initialData,
  agencies,
  policyStatuses,
}: CashFlowChartFormProps) {
  const [formData, setFormData] = useState<CashFlowChartFormData>(initialData || getDefaultFormData());
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

  const handleReset = () => setFormData(getDefaultFormData());

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
            <h1 className="font-serif text-xl font-bold text-[#E8C77A] tracking-wider uppercase">Cash Flow Chart</h1>
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
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Cash Flow From</label>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={formData.cashFlowFromDate}
                  onChange={(e) => setFormData((prev) => ({ ...prev, cashFlowFromDate: e.target.value }))}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#B8873A]"
                />
                <span className="text-xs font-bold text-slate-500">To</span>
                <input
                  type="date"
                  value={formData.cashFlowToDate}
                  onChange={(e) => setFormData((prev) => ({ ...prev, cashFlowToDate: e.target.value }))}
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
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#B8873A] via-[#B8873A]/40 to-transparent" />
            <h2 className="font-serif text-sm font-bold uppercase tracking-wider text-slate-900 mb-4">Sorting Options</h2>
            <div className="flex items-center gap-8">
              {([
                { id: "calendarYear", label: "Calender Year" },
                { id: "financialYear", label: "Financial Year" },
              ] as const).map((opt) => (
                <label key={opt.id} className="flex items-center gap-2.5 text-xs font-bold text-slate-800 hover:text-[#B8873A] cursor-pointer transition">
                  <input
                    type="radio"
                    name="yearBasis"
                    checked={formData.yearBasis === opt.id}
                    onChange={() => setFormData((prev) => ({ ...prev, yearBasis: opt.id }))}
                    className="w-4 h-4 text-[#B8873A] focus:ring-[#B8873A] border-slate-300"
                  />
                  <span>{opt.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#B8873A] via-[#B8873A]/40 to-transparent" />
            <h2 className="font-serif text-sm font-bold uppercase tracking-wider text-slate-900 mb-4">Annuity Mode</h2>
            <div className="flex items-center gap-8">
              {([
                { id: "modeWise", label: "Mode Wise" },
                { id: "yearly", label: "Yearly" },
              ] as const).map((opt) => (
                <label key={opt.id} className="flex items-center gap-2.5 text-xs font-bold text-slate-800 hover:text-[#B8873A] cursor-pointer transition">
                  <input
                    type="radio"
                    name="annuityMode"
                    checked={formData.annuityMode === opt.id}
                    onChange={() => setFormData((prev) => ({ ...prev, annuityMode: opt.id }))}
                    className="w-4 h-4 text-[#B8873A] focus:ring-[#B8873A] border-slate-300"
                  />
                  <span>{opt.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#B8873A] via-[#B8873A]/40 to-transparent" />
            <h2 className="font-serif text-sm font-bold uppercase tracking-wider text-slate-900 mb-4">Calculation Options</h2>
            <div className="flex items-center gap-8 pb-4">
              <label className="flex items-center gap-2.5 text-xs font-bold text-slate-800 hover:text-[#B8873A] cursor-pointer transition">
                <input
                  type="checkbox"
                  checked={formData.calculationOptions.includeLoyaltyAddition}
                  onChange={(e) => setFormData((prev) => ({ ...prev, calculationOptions: { ...prev.calculationOptions, includeLoyaltyAddition: e.target.checked } }))}
                  className="w-4 h-4 rounded border-slate-300 text-[#B8873A] focus:ring-[#B8873A]"
                />
                <span>Include Loyalty Addition</span>
              </label>
              <label className="flex items-center gap-2.5 text-xs font-bold text-slate-800 hover:text-[#B8873A] cursor-pointer transition">
                <input
                  type="checkbox"
                  checked={formData.calculationOptions.includeFab}
                  onChange={(e) => setFormData((prev) => ({ ...prev, calculationOptions: { ...prev.calculationOptions, includeFab: e.target.checked } }))}
                  className="w-4 h-4 rounded border-slate-300 text-[#B8873A] focus:ring-[#B8873A]"
                />
                <span>Include F.A.B</span>
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

            <div className="text-center text-[11px] font-bold text-slate-500 uppercase tracking-wider border-t border-slate-200 pt-2 mb-2">Scenario for LA</div>
            <div className="flex items-center justify-center gap-8">
              {([
                { id: "scenario1", label: "Scenario - I" },
                { id: "scenario2", label: "Scenario - II" },
              ] as const).map((opt) => (
                <label key={opt.id} className="flex items-center gap-2.5 text-xs font-bold text-slate-800 hover:text-[#B8873A] cursor-pointer transition">
                  <input
                    type="radio"
                    name="scenarioForLA"
                    checked={formData.calculationOptions.scenarioForLA === opt.id}
                    onChange={() => setFormData((prev) => ({ ...prev, calculationOptions: { ...prev.calculationOptions, scenarioForLA: opt.id } }))}
                    className="w-4 h-4 text-[#B8873A] focus:ring-[#B8873A] border-slate-300"
                  />
                  <span>{opt.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#B8873A] via-[#B8873A]/40 to-transparent" />
            <h2 className="font-serif text-sm font-bold uppercase tracking-wider text-slate-900 mb-4">Print Options</h2>
            <div className="grid grid-cols-2 gap-y-3.5 gap-x-6">
              {[
                { key: "includeCashInOut", label: "Include CashIn/Out" },
                { key: "showGraphs", label: "Show Graphs" },
                { key: "includeRecordOnlyPolicies", label: "Include Record only policies" },
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
    </div>
  );
}