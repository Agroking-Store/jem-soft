"use client";

import { useState, useEffect, useMemo } from "react";
import { useSelector, useDispatch } from "react-redux";
import type { RootState, AppDispatch } from "@/store/store";
import { fetchPolicies } from "@/features/policy/policySlice";
import { fetchCustomers } from "@/features/customers/customerSlice";
import { fetchCustomersMaster } from "@/features/customers/customerMasterSlice";
import { fetchAgencies } from "@/features/agency/agencySlice";
import { fetchAdvisors } from "@/features/advisor/advisorSlice";
import LicModuleNav from "@/features/lic/LicModuleNav";
import CommissionLedgerForm, { CommissionLedgerFormData } from "@/features/lic/comm-reports/CommissionLedgerForm";
import CommissionLedgerReportView from "@/features/lic/comm-reports/CommissionLedgerReportView";
import { COMM_REPORT_CARDS, CommReportCard } from "@/features/lic/comm-reports/commReportsData";
import { Search, ArrowRight, FileSpreadsheet, Layers } from "lucide-react";

type ViewState = "cards" | "commission-ledger-form" | "commission-ledger-report";

export default function LICCommReportsPage() {
  const dispatch = useDispatch<AppDispatch>();
  const [currentView, setCurrentView] = useState<ViewState>("cards");
  const [searchQuery, setSearchQuery] = useState("");
  
  const [selectedLedgerData, setSelectedLedgerData] = useState<CommissionLedgerFormData | null>(null);

  // Redux Store Data
  const { policies } = useSelector((state: RootState) => state.policies);
  const { customers } = useSelector((state: RootState) => state.customers);
  const { agencies } = useSelector((state: RootState) => state.agency);
  const { advisors } = useSelector((state: RootState) => state.advisors);

  useEffect(() => {
    dispatch(fetchPolicies());
    dispatch(fetchCustomers());
    dispatch(fetchCustomersMaster());
    dispatch(fetchAgencies());
    dispatch(fetchAdvisors());
  }, [dispatch]);

  const filteredCards = useMemo(() => {
    return COMM_REPORT_CARDS.filter((card) => {
      return (
        card.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        card.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    });
  }, [searchQuery]);

  const handleCardClick = (card: CommReportCard) => {
    if (card.id === "commission-ledger") {
      setCurrentView("commission-ledger-form");
    } else {
      // Future placeholder for other forms
      alert(`The report form for ${card.title} is coming soon!`);
    }
  };

  const handleGenerateLedgerReport = (formData: CommissionLedgerFormData) => {
    setSelectedLedgerData(formData);
    setCurrentView("commission-ledger-report");
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Shared Nav */}
      <LicModuleNav />

      {/* VIEW 1: Cards Grid */}
      {currentView === "cards" && (
        <div className="space-y-6">
          {/* Top Banner Card (Customer Module UI Style) */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-2xl border border-blue-100 bg-[#f0f7ff] p-5 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-b from-[#1e3a8a] to-[#2563eb] text-white shadow-lg shadow-blue-200/50">
                <FileSpreadsheet size={26} />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-[#0f172a]">
                  Commission Reports
                </h1>
                <p className="mt-0.5 text-xs sm:text-sm font-medium text-slate-500">
                  Generate commission ledgers, bills, summaries, and agent payout statements.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-white/80 border border-blue-200 px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 shadow-2xs">
              <Layers size={16} className="text-[#1877F2]" />
              <span><strong>{COMM_REPORT_CARDS.length}</strong> Reports Available</span>
            </div>
          </div>

          {/* Search Bar Bar */}
          <div className="flex items-center justify-between gap-4">
            <div className="relative w-full sm:max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Search commission reports..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pl-10 pr-4 text-sm text-slate-900 outline-none placeholder:text-slate-400 transition-all focus:border-[#1877F2] focus:bg-white focus:ring-2 focus:ring-blue-500/15"
              />
            </div>
          </div>

          {/* Cards Grid (Customer Module Cards Style) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filteredCards.map((card) => {
              const Icon = card.icon;
              return (
                <div
                  key={card.id}
                  onClick={() => handleCardClick(card)}
                  className={`group relative overflow-hidden rounded-2xl border bg-white p-5 shadow-sm transition-all duration-200 cursor-pointer flex flex-col justify-between hover:-translate-y-1 hover:shadow-md ${
                    card.isFeatured
                      ? "border-blue-300 ring-1 ring-blue-500/20"
                      : "border-slate-200 hover:border-blue-300"
                  }`}
                >
                  <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#1877F2] via-[#2563eb] to-transparent" />

                  <div className="space-y-3 pt-1">
                    <div className="flex items-center justify-between">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-[#1877F2] group-hover:bg-gradient-to-b group-hover:from-[#1e3a8a] group-hover:to-[#2563eb] group-hover:text-white transition-all shadow-xs">
                        <Icon size={20} />
                      </div>

                      {card.isFeatured && (
                        <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-[#1877F2] font-semibold text-[11px] border border-blue-200">
                          Featured
                        </span>
                      )}
                    </div>

                    <div className="space-y-1">
                      <h3 className="font-bold text-base text-slate-900 group-hover:text-[#1877F2] transition mt-1">
                        {card.title}
                      </h3>
                    </div>

                    <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">
                      {card.description}
                    </p>
                  </div>

                  <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-700 group-hover:text-[#1877F2] transition">
                    <span>
                      {card.id === "commission-ledger" ? "Open Form & Report" : "View Details"}
                    </span>
                    <ArrowRight size={14} className="group-hover:translate-x-1 transition text-[#1877F2]" />
                  </div>
                </div>
              );
            })}
          </div>

          {filteredCards.length === 0 && (
            <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 p-8 space-y-3">
              <FileSpreadsheet size={40} className="mx-auto text-slate-300" />
              <h3 className="font-semibold text-slate-700">No report cards found</h3>
              <p className="text-xs text-slate-500">Try adjusting your search query.</p>
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: Commission Ledger Form */}
      {currentView === "commission-ledger-form" && (
        <CommissionLedgerForm
          onBack={() => setCurrentView("cards")}
          onGenerateReport={handleGenerateLedgerReport}
          initialData={selectedLedgerData}
          agencies={agencies || []}
          advisors={advisors || []}
          customers={customers || []}
          policies={policies || []}
        />
      )}
      
      {/* VIEW 3: Commission Ledger Report Preview */}
      {currentView === "commission-ledger-report" && selectedLedgerData && (
        <CommissionLedgerReportView
          formData={selectedLedgerData}
          policies={policies || []}
          customers={customers || []}
          onBackToForm={() => setCurrentView("commission-ledger-form")}
        />
      )}
    </div>
  );
}
