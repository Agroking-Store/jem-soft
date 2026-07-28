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
  Filter,
  Sparkles,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  X,
  FileSpreadsheet
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
      {/* Top Module Nav */}
      <LicModuleNav />

      {/* VIEW 1: All 17 Cards Grid */}
      {currentView === "cards" && (
        <div className="space-y-6">
          {/* Hero / Header Section */}
          <div className="bg-gradient-to-r from-[#0B1220] via-[#162238] to-[#0B1220] rounded-2xl p-6 sm:p-8 text-white shadow-xl border border-slate-800">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2 max-w-2xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold uppercase tracking-wider">
                  <Sparkles size={13} />
                  <span>JEM Soft Insurance Reports</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                  LIC Reports & Analytics
                </h1>
                <p className="text-slate-300 text-sm leading-relaxed">
                  Generate groupwise policy registers, premium statements, due lists, cash flow projections, and financial charts powered by JEM Soft database.
                </p>
              </div>

              <div className="flex items-center gap-4 bg-white/5 backdrop-blur-md p-4 rounded-xl border border-white/10 text-xs">
                <div className="text-center px-2">
                  <span className="block text-2xl font-bold text-amber-400">17</span>
                  <span className="text-slate-400">Reports</span>
                </div>
                <div className="h-8 w-px bg-white/10" />
                <div className="text-center px-2">
                  <span className="block text-2xl font-bold text-emerald-400">{policies?.length || 0}</span>
                  <span className="text-slate-400">Live Policies</span>
                </div>
              </div>
            </div>

            {/* Search & Category Filter Bar */}
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-white/10">
              <div className="relative w-full sm:w-80">
                <input
                  type="text"
                  placeholder="Search report title..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white/10 border border-white/15 rounded-xl py-2 pl-9 pr-4 text-xs sm:text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400/50"
                />
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              </div>

              <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto scrollbar-none">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                      activeCategory === cat
                        ? "bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-md"
                        : "bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
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
                  className={`group relative bg-white rounded-2xl p-5 border transition-all duration-200 cursor-pointer flex flex-col justify-between hover:-translate-y-1 ${
                    card.isFeatured
                      ? "border-amber-400/60 shadow-lg shadow-amber-500/10 ring-2 ring-amber-400/20"
                      : "border-slate-200 hover:border-blue-400 hover:shadow-md"
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div
                        className={`p-3 rounded-xl transition ${
                          card.isFeatured
                            ? "bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 shadow-md"
                            : "bg-slate-100 text-slate-700 group-hover:bg-blue-50 group-hover:text-blue-600"
                        }`}
                      >
                        <Icon size={22} />
                      </div>

                      {card.isFeatured && (
                        <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 font-extrabold text-[10px] uppercase tracking-wider border border-amber-300">
                          Featured Report
                        </span>
                      )}

                      {!card.isFeatured && card.statusBadge && (
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium text-[10px]">
                          {card.statusBadge}
                        </span>
                      )}
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        {card.category}
                      </span>
                      <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition">
                        {card.title}
                      </h3>
                    </div>

                    <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">
                      {card.description}
                    </p>
                  </div>

                  <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-blue-600 group-hover:text-blue-700">
                    <span>{card.id === "policy-register" ? "Open Form & Report" : "View Details"}</span>
                    <ArrowRight size={14} className="group-hover:translate-x-1 transition" />
                  </div>
                </div>
              );
            })}
          </div>

          {filteredCards.length === 0 && (
            <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 p-8 space-y-3">
              <FileSpreadsheet size={40} className="mx-auto text-slate-300" />
              <h3 className="text-base font-semibold text-slate-700">No reports found</h3>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                  <previewModalCard.icon size={22} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">{previewModalCard.title}</h3>
                  <span className="text-[10px] text-slate-400 font-semibold uppercase">
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
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                <CheckCircle2 size={16} className="text-emerald-500" />
                <span>Ready for JEM Soft Data Generation</span>
              </div>
              <p className="text-[11px] text-slate-500">
                This report module uses the same central filter engine as Policy Register. You can test Policy Register for complete interactive report rendering and PDF export.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setPreviewModalCard(null)}
                className="px-4 py-2 border border-slate-300 text-slate-700 text-xs font-medium rounded-lg hover:bg-slate-50"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setPreviewModalCard(null);
                  setCurrentView("policy-register-form");
                }}
                className="px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700"
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
