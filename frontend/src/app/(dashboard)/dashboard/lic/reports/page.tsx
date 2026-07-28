"use client";

import { useState, useEffect, useMemo } from "react";
import { useSelector, useDispatch } from "react-redux";
import type { RootState, AppDispatch } from "@/store/store";
import { fetchPolicies } from "@/features/policy/policySlice";
import { fetchCustomers } from "@/features/customers/customerSlice";
import { fetchAgencies } from "@/features/agency/agencySlice";
import { fetchPolicyStatuses } from "@/features/policy/policyStatusMasterSlice";
import LicModuleNav from "@/features/lic/LicModuleNav";
import { LIC_REPORT_CARDS, LicReportCard } from "@/features/lic/reports/licReportsData";
import PolicyRegisterForm, { PolicyRegisterFormData } from "@/features/lic/reports/PolicyRegisterForm";
import PolicyRegisterReportView from "@/features/lic/reports/PolicyRegisterReportView";
import {
  Search,
  ArrowRight,
  CheckCircle2,
  X,
  FileSpreadsheet,
  Layers,
} from "lucide-react";

type ViewState = "cards" | "policy-register-form" | "policy-register-report";

export default function LICReportsPage() {
  const dispatch = useDispatch<AppDispatch>();
  const [currentView, setCurrentView] = useState<ViewState>("cards");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [selectedFormData, setSelectedFormData] = useState<PolicyRegisterFormData | null>(null);
  const [previewModalCard, setPreviewModalCard] = useState<LicReportCard | null>(null);

  // Redux Store Data
  const { policies } = useSelector((state: RootState) => state.policies);
  const { customers } = useSelector((state: RootState) => state.customers);
  const { agencies } = useSelector((state: RootState) => state.agency);
  const { statuses: policyStatuses } = useSelector((state: RootState) => state.policyStatuses);

  useEffect(() => {
    dispatch(fetchPolicies());
    dispatch(fetchCustomers());
    dispatch(fetchAgencies());
    dispatch(fetchPolicyStatuses());
  }, [dispatch]);

  const categories = ["All", "Register", "Financial", "Due & Statements", "Calculators & Misc"];

  const filteredCards = useMemo(() => {
    return LIC_REPORT_CARDS.filter((card) => {
      const matchesSearch =
        card.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        card.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = activeCategory === "All" || card.category === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, activeCategory]);

  const handleCardClick = (card: LicReportCard) => {
    if (card.id === "policy-register") {
      setCurrentView("policy-register-form");
    } else {
      setPreviewModalCard(card);
    }
  };

  const handleGenerateReport = (formData: PolicyRegisterFormData) => {
    setSelectedFormData(formData);
    setCurrentView("policy-register-report");
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Shared Nav */}
      <LicModuleNav />

      {/* VIEW 1: All 17 Cards Grid (Customer Module Design System Theme) */}
      {currentView === "cards" && (
        <div className="space-y-6">
          {/* Customer Page Hero Header */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
            <div className="bg-gradient-to-r from-[#0B1220] via-[#132342] to-[#16294D] px-6 py-6 sm:px-8 sm:py-7">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#B8873A]/15 border border-[#B8873A]/30 text-[#e8c77a] text-xs font-bold uppercase tracking-wider">
                    <Layers size={13} />
                    <span>JEM Soft Reports Engine</span>
                  </div>
                  <h1 className="mt-2 font-serif text-2xl font-semibold tracking-tight sm:text-[28px] text-[#e8c77a]">
                    LIC Reports & Financial Intelligence
                  </h1>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-[#e8c77a]/80">
                    Generate groupwise policy registers, premium statements, due lists, cash flow projections, and financial charts powered strictly by your JEM Soft database.
                  </p>
                </div>

                <div className="flex items-center gap-4 bg-white/5 backdrop-blur-md p-4 rounded-xl border border-white/10 text-xs">
                  <div className="text-center px-2">
                    <span className="block text-2xl font-bold text-[#e8c77a]">17</span>
                    <span className="text-slate-400 font-medium">Reports</span>
                  </div>
                  <div className="h-8 w-px bg-white/10" />
                  <div className="text-center px-2">
                    <span className="block text-2xl font-bold text-emerald-400">{customers?.length || 0}</span>
                    <span className="text-slate-400 font-medium">Customers</span>
                  </div>
                </div>
              </div>

              {/* Search & Category Filter Bar */}
              <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-white/10">
                <div className="relative w-full sm:w-80">
                  <input
                    type="text"
                    placeholder="Search 17 report modules..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-white/10 border border-white/15 rounded-xl py-2 pl-9 pr-4 text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#B8873A]"
                  />
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto scrollbar-none">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setActiveCategory(cat)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                        activeCategory === cat
                          ? "bg-gradient-to-r from-[#B8873A] to-[#D9AE63] text-[#0B1220] shadow-md"
                          : "bg-white/5 text-[#e8c77a]/70 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Cards Grid — All 17 Cards Styled Identically Matching Customer Module */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filteredCards.map((card) => {
              const Icon = card.icon;
              return (
                <div
                  key={card.id}
                  onClick={() => handleCardClick(card)}
                  className={`group relative overflow-hidden rounded-2xl border bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.05)] transition-all duration-200 cursor-pointer flex flex-col justify-between hover:-translate-y-1 hover:shadow-lg ${
                    card.isFeatured
                      ? "border-[#B8873A] ring-1 ring-[#B8873A]/30"
                      : "border-slate-200 hover:border-[#B8873A]"
                  }`}
                >
                  {/* Brass Gold Top Accent Bar */}
                  <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#B8873A] via-[#B8873A]/40 to-transparent" />

                  <div className="space-y-3 pt-1">
                    <div className="flex items-center justify-between">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#B8873A]/10 text-[#B8873A] group-hover:bg-[#0B1220] group-hover:text-[#E8C77A] transition">
                        <Icon size={20} />
                      </div>

                      {card.isFeatured && (
                        <span className="px-2.5 py-0.5 rounded-full bg-[#B8873A]/15 text-[#B8873A] font-extrabold text-[10px] uppercase tracking-wider border border-[#B8873A]/30">
                          Featured Report
                        </span>
                      )}

                      {!card.isFeatured && card.statusBadge && (
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-bold text-[10px] uppercase tracking-wider">
                          {card.statusBadge}
                        </span>
                      )}
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                        {card.category}
                      </span>
                      <h3 className="font-serif text-base font-bold text-slate-800 group-hover:text-[#B8873A] transition">
                        {card.title}
                      </h3>
                    </div>

                    <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">
                      {card.description}
                    </p>
                  </div>

                  <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-[#0B1220] group-hover:text-[#B8873A] uppercase tracking-wider">
                    <span>{card.id === "policy-register" ? "Open Form & Report" : "View Details"}</span>
                    <ArrowRight size={14} className="group-hover:translate-x-1 transition text-[#B8873A]" />
                  </div>
                </div>
              );
            })}
          </div>

          {filteredCards.length === 0 && (
            <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 p-8 space-y-3">
              <FileSpreadsheet size={40} className="mx-auto text-slate-300" />
              <h3 className="font-serif text-base font-semibold text-slate-700">No report cards found</h3>
              <p className="text-xs text-slate-500">Try adjusting your search query or category filter.</p>
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: Policy Register Form */}
      {currentView === "policy-register-form" && (
        <PolicyRegisterForm
          onBack={() => setCurrentView("cards")}
          onGenerateReport={handleGenerateReport}
          agencies={agencies || []}
          policyStatuses={policyStatuses || []}
          customers={customers || []}
        />
      )}

      {/* VIEW 3: Policy Register Report View */}
      {currentView === "policy-register-report" && selectedFormData && (
        <PolicyRegisterReportView
          formData={selectedFormData}
          policies={policies || []}
          customers={customers || []}
          onBackToForm={() => setCurrentView("policy-register-form")}
        />
      )}

      {/* Modal for previewing secondary report cards */}
      {previewModalCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0B1220]/70 backdrop-blur-xs p-4">
          <div className="relative bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
            <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#B8873A] via-[#E8C77A] to-transparent" />

            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#B8873A]/10 text-[#B8873A]">
                  <previewModalCard.icon size={20} />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-slate-900">{previewModalCard.title}</h3>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                    {previewModalCard.category}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setPreviewModalCard(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X size={20} />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              {previewModalCard.description}
            </p>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                <CheckCircle2 size={16} className="text-emerald-600" />
                <span>Connected to JEM Soft DB Engine</span>
              </div>
              <p className="text-[11px] text-slate-500">
                This report module uses the same central filter engine as Policy Register. You can test Policy Register for complete interactive report rendering and PDF export.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setPreviewModalCard(null)}
                className="px-4 py-2 border border-slate-300 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-50 uppercase tracking-wider"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setPreviewModalCard(null);
                  setCurrentView("policy-register-form");
                }}
                className="px-4 py-2 bg-gradient-to-r from-[#B8873A] to-[#D9AE63] text-[#0B1220] text-xs font-bold rounded-xl uppercase tracking-wider shadow-md hover:brightness-105"
              >
                Open Policy Register Form
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
