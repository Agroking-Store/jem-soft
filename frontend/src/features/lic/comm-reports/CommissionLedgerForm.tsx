"use client";

import { useState, useMemo } from "react";
import {
  RotateCcw,
  FileSpreadsheet,
  Filter,
  FilterX,
  ArrowRight,
  ArrowLeft,
  Calendar,
  UserCheck,
  Shield,
  Layers,
  ChevronDown,
} from "lucide-react";
import { getDefaultCommissionDateRange } from "./commReportsUtils";
import CommissionPolicyFilterModal, { CommissionPolicyFilterSelection } from "./CommissionPolicyFilterModal";

export interface CommissionLedgerFormData {
  fromDate: string;
  toDate: string;
  selectedAgentId: string; // "ALL" or specific advisorId / agencyId
  selectedAgentName: string;
  policyFilterSelection: CommissionPolicyFilterSelection | null;
  includeWithoutRecord: boolean;
}

interface CommissionLedgerFormProps {
  initialData?: CommissionLedgerFormData | null;
  agencies: Array<any>;
  advisors?: Array<any>;
  customers: Array<any>;
  policies: Array<any>;
  onBack: () => void;
  onGenerateReport: (formData: CommissionLedgerFormData) => void;
}

export default function CommissionLedgerForm({
  initialData,
  agencies = [],
  advisors = [],
  customers = [],
  policies = [],
  onBack,
  onGenerateReport,
}: CommissionLedgerFormProps) {
  const defaultDates = useMemo(() => getDefaultCommissionDateRange(), []);

  const defaultFormData: CommissionLedgerFormData = {
    fromDate: defaultDates.fromDate,
    toDate: defaultDates.toDate,
    selectedAgentId: "ALL",
    selectedAgentName: "All Agents / Agencies",
    policyFilterSelection: null,
    includeWithoutRecord: false,
  };

  const [formData, setFormData] = useState<CommissionLedgerFormData>(() => {
    if (initialData) return initialData;
    return defaultFormData;
  });

  const [isPolicyFilterModalOpen, setIsPolicyFilterModalOpen] = useState(false);
  const [isProcessed, setIsProcessed] = useState(false);

  // Combined agent options (advisors + agencies + unique agent codes in policies)
  const agentOptions = useMemo(() => {
    const list: Array<{ id: string; name: string; type: "advisor" | "agency" | "agentCode" }> = [
      { id: "ALL", name: "All Agents / Agencies", type: "advisor" },
    ];

    // 1. Add advisors
    advisors.forEach((adv) => {
      const label = `${adv.advisorName || "Advisor"} ${adv.advisorCode ? `(${adv.advisorCode})` : ""}`;
      list.push({ id: adv.id, name: label, type: "advisor" });
    });

    // 2. Add agencies
    agencies.forEach((ag) => {
      const label = `Agency: ${ag.agencyName || "Agency"} ${ag.agencyCode ? `[${ag.agencyCode}]` : ""}`;
      if (!list.find((item) => item.id === ag.id)) {
        list.push({ id: ag.id, name: label, type: "agency" });
      }
    });

    // 3. Add any additional agent codes from policies
    policies.forEach((p) => {
      if (p.agentCode && !list.find((item) => item.id === p.agentCode)) {
        list.push({ id: p.agentCode, name: `Agent Code: ${p.agentCode}`, type: "agentCode" });
      }
    });

    return list;
  }, [advisors, agencies, policies]);

  // Selected agent IDs for policy filter modal cascade
  const selectedAgentIds = useMemo(() => {
    if (formData.selectedAgentId === "ALL") return [];
    return [formData.selectedAgentId];
  }, [formData.selectedAgentId]);

  // Count of policies matching the selected agent
  const matchingPoliciesCount = useMemo(() => {
    if (formData.selectedAgentId === "ALL") return policies.length;
    
    const target = formData.selectedAgentId.toLowerCase().trim();
    return policies.filter((p) => {
      const pAdvisorId = p.advisorId ? String(p.advisorId).toLowerCase().trim() : "";
      const pAgentCode = p.agentCode ? String(p.agentCode).toLowerCase().trim() : "";
      const advName = p.advisor?.advisorName ? String(p.advisor.advisorName).toLowerCase().trim() : "";
      const advCode = p.advisor?.advisorCode ? String(p.advisor.advisorCode).toLowerCase().trim() : "";
      const agencyId = p.advisor?.agencyId ? String(p.advisor.agencyId).toLowerCase().trim() : "";

      return (
        pAdvisorId === target ||
        pAgentCode === target ||
        advCode === target ||
        advName === target ||
        agencyId === target
      );
    }).length;
  }, [policies, formData.selectedAgentId]);

  const handleAgentChange = (newAgentId: string) => {
    const found = agentOptions.find((a) => a.id === newAgentId);
    setFormData((prev) => ({
      ...prev,
      selectedAgentId: newAgentId,
      selectedAgentName: found?.name || "All Agents",
      policyFilterSelection: null, // Reset policy selection when agent changes
    }));
    setIsProcessed(false);
  };

  const handleReset = () => {
    setFormData(defaultFormData);
    setIsProcessed(false);
  };

  const handleProcess = () => {
    setIsProcessed(true);
  };

  const handleGenerateReport = () => {
    onGenerateReport(formData);
  };

  const getPolicyFilterLabel = () => {
    const selectedCount = formData.policyFilterSelection?.selectedItems?.length || 0;
    if (selectedCount > 0) {
      return `${selectedCount} policies selected`;
    }
    return `All (${matchingPoliciesCount}) policies selected`;
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-8">
      {/* Top Banner Card (Customer Module Style) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-2xl border border-blue-100 bg-[#f0f7ff] p-5 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-b from-[#1e3a8a] to-[#2563eb] text-white shadow-lg shadow-blue-200/50">
            <FileSpreadsheet size={26} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#0f172a]">
              Commission Ledger
            </h1>
            <p className="mt-0.5 text-xs sm:text-sm font-medium text-slate-500">
              Filter by date range, select agent, choose specific policies, and generate report
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition"
          >
            <ArrowLeft size={14} />
            Back to Reports
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition"
            title="Reset Form to Defaults"
          >
            <RotateCcw size={14} />
            Reset
          </button>
        </div>
      </div>

      {/* Main Form Body */}
      <div className="space-y-6">
        {/* Step 1: Date Range & Agent Filter */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#1877F2] via-[#2563eb] to-transparent" />
          
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-[#1877F2]">
                1
              </span>
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Data Filter & Agent Selection
                </h2>
                <p className="text-xs text-slate-500">
                  Default date is set to the previous full calendar month. Select an agent to cascade policies.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Date Range Inputs */}
            <div className="space-y-1.5 lg:col-span-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Calendar size={13} className="text-[#1877F2]" />
                Date Range (Previous Month Default)
              </label>
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <div className="relative flex-1 w-full">
                  <span className="absolute -top-2 left-3 bg-white px-1 text-[10px] text-[#1877F2] font-bold uppercase">
                    From Date
                  </span>
                  <input
                    type="date"
                    value={formData.fromDate}
                    onChange={(e) => {
                      setFormData((prev) => ({ ...prev, fromDate: e.target.value }));
                      setIsProcessed(false);
                    }}
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#1877F2] focus:ring-2 focus:ring-blue-500/15 transition bg-slate-50/40"
                  />
                </div>
                <span className="text-xs font-bold text-slate-400">To</span>
                <div className="relative flex-1 w-full">
                  <span className="absolute -top-2 left-3 bg-white px-1 text-[10px] text-[#1877F2] font-bold uppercase">
                    To Date
                  </span>
                  <input
                    type="date"
                    value={formData.toDate}
                    onChange={(e) => {
                      setFormData((prev) => ({ ...prev, toDate: e.target.value }));
                      setIsProcessed(false);
                    }}
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#1877F2] focus:ring-2 focus:ring-blue-500/15 transition bg-slate-50/40"
                  />
                </div>
              </div>
            </div>

            {/* Agent / Agency Selection Dropdown */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <UserCheck size={13} className="text-[#1877F2]" />
                Select Agent / Agency
              </label>
              <div className="relative">
                <select
                  value={formData.selectedAgentId}
                  onChange={(e) => handleAgentChange(e.target.value)}
                  className="w-full appearance-none border border-slate-200 rounded-xl px-3.5 py-2.5 pr-9 text-xs font-medium text-slate-900 bg-white focus:outline-none focus:border-[#1877F2] focus:ring-2 focus:ring-blue-500/15 transition cursor-pointer"
                >
                  {agentOptions.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.name}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={14}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                />
              </div>
              <p className="text-[11px] text-slate-400">
                {matchingPoliciesCount} policies found for this selection
              </p>
            </div>
          </div>

          {/* Process Button */}
          <div className="mt-6 pt-5 border-t border-slate-100 flex items-center justify-between">
            <div className="text-xs text-slate-500">
              {isProcessed ? (
                <span className="inline-flex items-center gap-1.5 text-emerald-600 font-semibold">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  Ready to select policies and generate report
                </span>
              ) : (
                <span>Click Process to load and filter policies under selected agent</span>
              )}
            </div>

            <button
              type="button"
              onClick={handleProcess}
              className={`inline-flex items-center gap-2 px-6 py-2.5 text-xs font-semibold rounded-xl shadow-md transition-all active:scale-[0.98] ${
                isProcessed
                  ? "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  : "bg-gradient-to-r from-[#5c67ff] to-[#3a47ff] text-white shadow-blue-200 hover:brightness-110"
              }`}
            >
              <Layers size={15} />
              {isProcessed ? "Re-Process" : "Process Agent & Policies"}
            </button>
          </div>
        </div>

        {/* Step 2: Policy Filter Options (Unlocked after Process) */}
        {isProcessed && (
          <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#1877F2] via-[#2563eb] to-transparent" />
            
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2.5">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-[#1877F2]">
                  2
                </span>
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Policy Filter Options
                  </h2>
                  <p className="text-xs text-slate-500">
                    Showing policies belonging to {formData.selectedAgentName}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Select Policies Trigger */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Shield size={13} className="text-[#1877F2]" />
                  Filtered Policies
                </label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <div className="flex items-center justify-between border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs bg-slate-50/50">
                      <span className="text-slate-800 font-semibold truncate">
                        {getPolicyFilterLabel()}
                      </span>
                      {formData.policyFilterSelection?.selectedItems && formData.policyFilterSelection.selectedItems.length > 0 && (
                        <span className="ml-2 px-2 py-0.5 rounded-full bg-blue-50 text-[#1877F2] text-[10px] font-bold">
                          {formData.policyFilterSelection.selectedItems.length}
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsPolicyFilterModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-blue-50 border border-blue-200 text-[#1877F2] hover:bg-blue-100 text-xs font-semibold transition"
                    title="Select Policies"
                  >
                    <Filter size={14} />
                    Choose
                  </button>

                  {formData.policyFilterSelection?.selectedItems && formData.policyFilterSelection.selectedItems.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, policyFilterSelection: null }))}
                      className="p-2.5 rounded-xl border border-rose-100 bg-rose-50 text-rose-600 hover:bg-rose-100 transition"
                      title="Clear Selection"
                    >
                      <FilterX size={15} />
                    </button>
                  )}
                </div>
              </div>

              {/* Checkbox Option */}
              <div className="lg:col-span-2 flex items-center pt-5">
                <label className="flex items-center gap-2.5 text-xs font-semibold text-slate-700 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={formData.includeWithoutRecord}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        includeWithoutRecord: e.target.checked,
                      }))
                    }
                    className="w-4 h-4 rounded border-slate-300 text-[#1877F2] focus:ring-[#1877F2] cursor-pointer"
                  />
                  <span>Include Commission Ledger Without Premium And Commission Record</span>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Bottom Actions Bar */}
        <div className="p-5 bg-white rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
          <button
            type="button"
            onClick={onBack}
            className="w-full sm:w-auto px-6 py-2.5 border border-slate-200 bg-white text-slate-700 font-semibold text-xs rounded-xl hover:bg-slate-50 transition"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleGenerateReport}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-2.5 bg-gradient-to-r from-[#5c67ff] to-[#3a47ff] text-white font-semibold text-xs rounded-xl shadow-md shadow-blue-200 hover:brightness-110 active:scale-[0.98] transition"
          >
            <span>Generate Commission Ledger Report</span>
            <ArrowRight size={15} />
          </button>
        </div>
      </div>

      {/* Modal for Policy Filters (with Agent Cascade) */}
      <CommissionPolicyFilterModal
        isOpen={isPolicyFilterModalOpen}
        onClose={() => setIsPolicyFilterModalOpen(false)}
        policies={policies}
        selectedAgentIds={selectedAgentIds}
        selectedFilters={formData.policyFilterSelection}
        onApplyFilters={(selection) =>
          setFormData((prev) => ({ ...prev, policyFilterSelection: selection }))
        }
      />
    </div>
  );
}
