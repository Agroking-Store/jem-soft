"use client";

import { useState, useEffect, useMemo } from "react";
import { useSelector, useDispatch } from "react-redux";
import type { RootState, AppDispatch } from "@/store/store";
import { fetchPolicies } from "@/features/policy/policySlice";
import { fetchCustomers } from "@/features/customers/customerSlice";
import { fetchAgencies } from "@/features/agency/agencySlice";
import LicModuleNav from "@/features/lic/LicModuleNav";
import CommissionLedgerForm, { CommissionLedgerFormData } from "@/features/lic/comm-reports/CommissionLedgerForm";
import CommissionLedgerReportView from "@/features/lic/comm-reports/CommissionLedgerReportView";
import { COMM_REPORT_CARDS, CommReportCard } from "@/features/lic/comm-reports/commReportsData";
import { Search, ArrowRight, FileSpreadsheet } from "lucide-react";

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

  useEffect(() => {
    dispatch(fetchPolicies());
    dispatch(fetchCustomers());
    dispatch(fetchAgencies());
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
          {/* Header Banner */}
          <div className="relative overflow-hidden bg-[#0B1220] rounded-2xl p-6 sm:p-8 text-white shadow-xl border border-slate-800">
            <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#B8873A] via-[#E8C77A] to-transparent" />
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2 max-w-2xl">
                <span className="font-serif text-xs font-bold text-[#E8C77A] uppercase tracking-widest block">
                  LIC Reports & Analytics Engine
                </span>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                  Commission Reports
                </h1>
                <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
                  Generate commission ledgers, bills, summaries, and outstanding reports.
                </p>
              </div>

              <div className="flex items-center gap-4 bg-white/5 backdrop-blur-md p-4 rounded-xl border border-white/10 text-xs">
                <div className="text-center px-2">
                  <span className="block text-2xl font-bold text-[#E8C77A]">{COMM_REPORT_CARDS.length}</span>
                  <span className="text-slate-300 font-serif text-[10px] uppercase tracking-wider">Reports</span>
                </div>
              </div>
            </div>

            {/* Search Bar */}
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-white/10">
              <div className="relative w-full sm:w-80">
                <input
                  type="text"
                  placeholder="Search report title..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white/10 border border-white/15 rounded-xl py-2 pl-9 pr-4 text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#B8873A]"
                />
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              </div>
            </div>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filteredCards.map((card) => {
              const Icon = card.icon;
              return (
                <div
                  key={card.id}
                  onClick={() => handleCardClick(card)}
                  className={`group relative overflow-hidden rounded-2xl border bg-white p-5 shadow-sm transition-all duration-200 cursor-pointer flex flex-col justify-between hover:-translate-y-1 hover:shadow-md ${
                    card.isFeatured
                      ? "border-[#B8873A]/60 ring-1 ring-[#B8873A]/30"
                      : "border-slate-200 hover:border-[#B8873A]"
                  }`}
                >
                  <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#B8873A] via-[#B8873A]/40 to-transparent" />

                  <div className="space-y-3 pt-1">
                    <div className="flex items-center justify-between">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0B1220] text-[#E8C77A] group-hover:bg-[#B8873A] group-hover:text-[#0B1220] transition">
                        <Icon size={20} />
                      </div>

                      {card.isFeatured && (
                        <span className="px-2.5 py-0.5 rounded-full bg-[#B8873A]/15 text-[#B8873A] font-serif font-bold text-[10px] uppercase tracking-wider border border-[#B8873A]/30">
                          Featured Report
                        </span>
                      )}
                    </div>

                    <div className="space-y-1">
                      <h3 className="font-bold text-base text-slate-900 group-hover:text-[#B8873A] transition mt-1">
                        {card.title}
                      </h3>
                    </div>

                    <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">
                      {card.description}
                    </p>
                  </div>

                  <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-[#0B1220] group-hover:text-[#B8873A] uppercase tracking-wider">
                    <span>
                      {card.id === "commission-ledger" ? "Open Form & Report" : "View Details"}
                    </span>
                    <ArrowRight size={14} className="group-hover:translate-x-1 transition" />
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
