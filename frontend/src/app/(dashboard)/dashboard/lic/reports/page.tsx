"use client";

import { useState, useEffect, useMemo } from "react";
import { useSelector, useDispatch } from "react-redux";
import type { RootState, AppDispatch } from "@/store/store";
import { fetchPolicies } from "@/features/policy/policySlice";
import { fetchCustomers } from "@/features/customers/customerSlice";
import { fetchAgencies } from "@/features/agency/agencySlice";
import { fetchPolicyStatuses } from "@/features/policy/policyStatusMasterSlice";
import { fetchLicBranches } from "@/features/lic/licBranchSlice";
import LicModuleNav from "@/features/lic/LicModuleNav";
import { LIC_REPORT_CARDS, LicReportCard } from "@/features/lic/reports/licReportsData";
import PolicyRegisterForm, { PolicyRegisterFormData } from "@/features/lic/reports/PolicyRegisterForm";
import PolicyRegisterReportView from "@/features/lic/reports/PolicyRegisterReportView";
import PremiumDueForm, { PremiumDueFormData } from "@/features/lic/reports/PremiumDueForm";
import PremiumDueReportView from "@/features/lic/reports/PremiumDueReportView";
import PremiumOutstandingForm, { PremiumOutstandingFormData } from "@/features/lic/reports/PremiumOutstandingForm";
import PremiumOutstandingReportView from "@/features/lic/reports/PremiumOutstandingReportView";
import LapsedPolicyForm, { LapsedPolicyFormData } from "@/features/lic/reports/LapsedPolicyForm";
import LapsedPolicyReportView from "@/features/lic/reports/LapsedPolicyReportView";
import PolicyMaturityForm, { PolicyMaturityFormData } from "@/features/lic/reports/PolicyMaturityForm";
import PolicyMaturityReportView from "@/features/lic/reports/PolicyMaturityReportView";
import SurvivalBenefitForm, { SurvivalBenefitFormData } from "@/features/lic/reports/SurvivalBenefitForm";
import SurvivalBenefitReportView from "@/features/lic/reports/SurvivalBenefitReportView";
import CashFlowChartForm, { CashFlowChartFormData } from "@/features/lic/reports/CashFlowChartForm";
import CashFlowChartReportView from "@/features/lic/reports/CashFlowChartReportView";
import ComprehensiveInsuranceChartForm, { ComprehensiveInsuranceChartFormData } from "@/features/lic/reports/ComprehensiveInsuranceChartForm";
import ComprehensiveInsuranceChartReportView from "@/features/lic/reports/ComprehensiveInsuranceChartReportView";
import PremiumCertificateForm, { PremiumCertificateFormData } from "@/features/lic/reports/PremiumCertificateForm";
import PremiumCertificateReportView from "@/features/lic/reports/PremiumCertificateReportView";
import AnnuityStatementForm, { AnnuityStatementFormData } from "@/features/lic/reports/AnnuityStatementForm";
import AnnuityStatementReportView from "@/features/lic/reports/AnnuityStatementReportView";
import {
  Search,
  ArrowRight,
  CheckCircle2,
  X,
  FileSpreadsheet,
} from "lucide-react";

type ViewState =
  | "cards"
  | "policy-register-form"
  | "policy-register-report"
  | "premium-due-form"
  | "premium-due-report"
  | "premium-outstanding-form"
  | "premium-outstanding-report"
  | "lapsed-policy-form"
  | "lapsed-policy-report"
  | "policy-maturity-form"
  | "policy-maturity-report"
  | "survival-benefit-form"
  | "survival-benefit-report"
  | "cash-flow-chart-form"
  | "cash-flow-chart-report"
  | "comprehensive-insurance-chart-form"
  | "comprehensive-insurance-chart-report"
  | "premium-paid-details-form"
  | "premium-paid-details-report"
  | "annuity-statement-form"
  | "annuity-statement-report";

export default function LICReportsPage() {
  const dispatch = useDispatch<AppDispatch>();
  const [currentView, setCurrentView] = useState<ViewState>("cards");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [selectedPolicyRegisterData, setSelectedPolicyRegisterData] =
    useState<PolicyRegisterFormData | null>(null);
  const [selectedPremiumDueData, setSelectedPremiumDueData] =
    useState<PremiumDueFormData | null>(null);
  const [selectedPremiumOutstandingData, setSelectedPremiumOutstandingData] =
    useState<PremiumOutstandingFormData | null>(null);
  const [selectedLapsedPolicyData, setSelectedLapsedPolicyData] =
    useState<LapsedPolicyFormData | null>(null);
  const [selectedPolicyMaturityData, setSelectedPolicyMaturityData] =
    useState<PolicyMaturityFormData | null>(null);
  const [selectedSurvivalBenefitData, setSelectedSurvivalBenefitData] =
    useState<SurvivalBenefitFormData | null>(null);
  const [selectedCashFlowChartData, setSelectedCashFlowChartData] =
    useState<CashFlowChartFormData | null>(null);
  const [selectedComprehensiveInsuranceChartData, setSelectedComprehensiveInsuranceChartData] =
    useState<ComprehensiveInsuranceChartFormData | null>(null);
  const [selectedPremiumCertificateData, setSelectedPremiumCertificateData] =
    useState<PremiumCertificateFormData | null>(null);
  const [selectedAnnuityStatementData, setSelectedAnnuityStatementData] =
    useState<AnnuityStatementFormData | null>(null);
  const [previewModalCard, setPreviewModalCard] = useState<LicReportCard | null>(null);

  // Redux Store Data
  const { policies } = useSelector((state: RootState) => state.policies);
  const { customers } = useSelector((state: RootState) => state.customers);
  const { agencies } = useSelector((state: RootState) => state.agency);
  const { statuses: policyStatuses } = useSelector((state: RootState) => state.policyStatuses);
  const { branches: licBranches } = useSelector((state: RootState) => state.licBranch);

  useEffect(() => {
    dispatch(fetchPolicies());
    dispatch(fetchCustomers());
    dispatch(fetchAgencies());
    dispatch(fetchPolicyStatuses());
    dispatch(fetchLicBranches());
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
    } else if (card.id === "premium-due") {
      setCurrentView("premium-due-form");
    } else if (card.id === "premium-outstanding") {
      setCurrentView("premium-outstanding-form");
    } else if (card.id === "lapsed-policy") {
      setCurrentView("lapsed-policy-form");
    } else if (card.id === "policy-maturity") {
      setCurrentView("policy-maturity-form");
    } else if (card.id === "survival-benefit") {
      setCurrentView("survival-benefit-form");
    } else if (card.id === "cash-flow-chart") {
      setCurrentView("cash-flow-chart-form");
    } else if (card.id === "comprehensive-insurance-chart") {
      setCurrentView("comprehensive-insurance-chart-form");
    } else if (card.id === "premium-paid-details") {
      setCurrentView("premium-paid-details-form");
    } else if (card.id === "annuity-statement") {
      setCurrentView("annuity-statement-form");
    } else {
      setPreviewModalCard(card);
    }
  };

  const handleGeneratePolicyRegisterReport = (formData: PolicyRegisterFormData) => {
    setSelectedPolicyRegisterData(formData);
    setCurrentView("policy-register-report");
  };

  const handleGeneratePremiumDueReport = (formData: PremiumDueFormData) => {
    setSelectedPremiumDueData(formData);
    setCurrentView("premium-due-report");
  };

  const handleGeneratePremiumOutstandingReport = (formData: PremiumOutstandingFormData) => {
    setSelectedPremiumOutstandingData(formData);
    setCurrentView("premium-outstanding-report");
  };

  const handleGenerateLapsedPolicyReport = (formData: LapsedPolicyFormData) => {
    setSelectedLapsedPolicyData(formData);
    setCurrentView("lapsed-policy-report");
  };

  const handleGeneratePolicyMaturityReport = (formData: PolicyMaturityFormData) => {
    setSelectedPolicyMaturityData(formData);
    setCurrentView("policy-maturity-report");
  };

  const handleGenerateSurvivalBenefitReport = (formData: SurvivalBenefitFormData) => {
    setSelectedSurvivalBenefitData(formData);
    setCurrentView("survival-benefit-report");
  };

  const handleGenerateCashFlowChartReport = (formData: CashFlowChartFormData) => {
    setSelectedCashFlowChartData(formData);
    setCurrentView("cash-flow-chart-report");
  };

  const handleGenerateComprehensiveInsuranceChartReport = (formData: ComprehensiveInsuranceChartFormData) => {
    setSelectedComprehensiveInsuranceChartData(formData);
    setCurrentView("comprehensive-insurance-chart-report");
  };

  const handleGeneratePremiumCertificateReport = (formData: PremiumCertificateFormData) => {
    setSelectedPremiumCertificateData(formData);
    setCurrentView("premium-paid-details-report");
  };

  const handleGenerateAnnuityStatementReport = (formData: AnnuityStatementFormData) => {
    setSelectedAnnuityStatementData(formData);
    setCurrentView("annuity-statement-report");
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Shared Nav */}
      <LicModuleNav />

      {/* VIEW 1: All 16 Cards Grid */}
      {currentView === "cards" && (
        <div className="space-y-6">
          {/* Header Banner matching Website Theme `#0B1220` with `#E8C77A` */}
          <div className="relative overflow-hidden bg-[#0B1220] rounded-2xl p-6 sm:p-8 text-white shadow-xl border border-slate-800">
            <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#B8873A] via-[#E8C77A] to-transparent" />
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2 max-w-2xl">
                <span className="font-serif text-xs font-bold text-[#E8C77A] uppercase tracking-widest block">
                  LIC Reports & Analytics Engine
                </span>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                  LIC Reports Overview
                </h1>
                <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
                  Generate groupwise policy registers, premium statements, due lists, cash flow projections, and financial charts.
                </p>
              </div>

              <div className="flex items-center gap-4 bg-white/5 backdrop-blur-md p-4 rounded-xl border border-white/10 text-xs">
                <div className="text-center px-2">
                  <span className="block text-2xl font-bold text-[#E8C77A]">16</span>
                  <span className="text-slate-300 font-serif text-[10px] uppercase tracking-wider">Reports</span>
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
                  className="w-full bg-white/10 border border-white/15 rounded-xl py-2 pl-9 pr-4 text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#B8873A]"
                />
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto scrollbar-none">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition uppercase tracking-wider ${
                      activeCategory === cat
                        ? "bg-gradient-to-r from-[#B8873A] to-[#D9AE63] text-[#0B1220] shadow-md"
                        : "bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Cards Grid matching CustomerSectionCard structure */}
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
                  {/* Top Brass Gold Accent Bar */}
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

                      {!card.isFeatured && card.statusBadge && (
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-bold text-[10px] uppercase tracking-wider">
                          {card.statusBadge}
                        </span>
                      )}
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] font-serif font-bold text-[#B8873A] uppercase tracking-widest block">
                        {card.category}
                      </span>
                      <h3 className="font-bold text-base text-slate-900 group-hover:text-[#B8873A] transition">
                        {card.title}
                      </h3>
                    </div>

                    <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">
                      {card.description}
                    </p>
                  </div>

                  <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-[#0B1220] group-hover:text-[#B8873A] uppercase tracking-wider">
                    <span>
                      {card.id === "policy-register" ||
                      card.id === "premium-due" ||
                      card.id === "premium-outstanding" ||
                      card.id === "lapsed-policy" ||
                      card.id === "policy-maturity" ||
                      card.id === "survival-benefit" ||
                      card.id === "cash-flow-chart" ||
                      card.id === "comprehensive-insurance-chart"
                        ? "Open Form & Report"
                        : "View Details"}
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
              <p className="text-xs text-slate-500">Try adjusting your search query or category filter.</p>
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: Policy Register Form */}
      {currentView === "policy-register-form" && (
        <PolicyRegisterForm
          onBack={() => setCurrentView("cards")}
          onGenerateReport={handleGeneratePolicyRegisterReport}
          initialData={selectedPolicyRegisterData}
          agencies={agencies || []}
          policyStatuses={policyStatuses || []}
          customers={customers || []}
          policies={policies || []}
        />
      )}

      {/* VIEW 3: Policy Register Report View */}
      {currentView === "policy-register-report" && selectedPolicyRegisterData && (
        <PolicyRegisterReportView
          formData={selectedPolicyRegisterData}
          policies={policies || []}
          customers={customers || []}
          onBackToForm={() => setCurrentView("policy-register-form")}
        />
      )}

      {/* VIEW 4: Premium Due Form */}
      {currentView === "premium-due-form" && (
        <PremiumDueForm
          onBack={() => setCurrentView("cards")}
          onGenerateReport={handleGeneratePremiumDueReport}
          initialData={selectedPremiumDueData}
          agencies={agencies || []}
          policyStatuses={policyStatuses || []}
          customers={customers || []}
          policies={policies || []}
          branches={licBranches || []}
        />
      )}

      {/* VIEW 5: Premium Due Report View */}
      {currentView === "premium-due-report" && selectedPremiumDueData && (
        <PremiumDueReportView
          formData={selectedPremiumDueData}
          policies={policies || []}
          customers={customers || []}
          onBackToForm={() => setCurrentView("premium-due-form")}
        />
      )}

      {/* VIEW 6: Premium Outstanding Form */}
      {currentView === "premium-outstanding-form" && (
        <PremiumOutstandingForm
          onBack={() => setCurrentView("cards")}
          onGenerateReport={handleGeneratePremiumOutstandingReport}
          initialData={selectedPremiumOutstandingData}
          agencies={agencies || []}
          policyStatuses={policyStatuses || []}
          customers={customers || []}
          policies={policies || []}
          branches={licBranches || []}
        />
      )}

      {/* VIEW 7: Premium Outstanding Report View */}
      {currentView === "premium-outstanding-report" && selectedPremiumOutstandingData && (
        <PremiumOutstandingReportView
          formData={selectedPremiumOutstandingData}
          policies={policies || []}
          customers={customers || []}
          onBackToForm={() => setCurrentView("premium-outstanding-form")}
        />
      )}

      {/* VIEW 8: Lapsed Policy Form */}
      {currentView === "lapsed-policy-form" && (
        <LapsedPolicyForm
          onBack={() => setCurrentView("cards")}
          onGenerateReport={handleGenerateLapsedPolicyReport}
          initialData={selectedLapsedPolicyData}
          agencies={agencies || []}
          policyStatuses={policyStatuses || []}
          customers={customers || []}
          policies={policies || []}
          branches={licBranches || []}
        />
      )}

      {/* VIEW 9: Lapsed Policy Report View */}
      {currentView === "lapsed-policy-report" && selectedLapsedPolicyData && (
        <LapsedPolicyReportView
          formData={selectedLapsedPolicyData}
          policies={policies || []}
          customers={customers || []}
          onBackToForm={() => setCurrentView("lapsed-policy-form")}
        />
      )}

      {/* VIEW 10: Policy Maturity Form */}
      {currentView === "policy-maturity-form" && (
        <PolicyMaturityForm
          onBack={() => setCurrentView("cards")}
          onGenerateReport={handleGeneratePolicyMaturityReport}
          initialData={selectedPolicyMaturityData}
          agencies={agencies || []}
          policyStatuses={policyStatuses || []}
          customers={customers || []}
          policies={policies || []}
          branches={licBranches || []}
        />
      )}

      {/* VIEW 11: Policy Maturity Report View */}
      {currentView === "policy-maturity-report" && selectedPolicyMaturityData && (
        <PolicyMaturityReportView
          formData={selectedPolicyMaturityData}
          policies={policies || []}
          customers={customers || []}
          onBackToForm={() => setCurrentView("policy-maturity-form")}
        />
      )}

      {/* VIEW 12: Survival Benefit Form */}
      {currentView === "survival-benefit-form" && (
        <SurvivalBenefitForm
          onBack={() => setCurrentView("cards")}
          onGenerateReport={handleGenerateSurvivalBenefitReport}
          initialData={selectedSurvivalBenefitData}
          agencies={agencies || []}
          policyStatuses={policyStatuses || []}
          customers={customers || []}
          policies={policies || []}
          branches={licBranches || []}
        />
      )}

      {/* VIEW 13: Survival Benefit Report View */}
      {currentView === "survival-benefit-report" && selectedSurvivalBenefitData && (
        <SurvivalBenefitReportView
          formData={selectedSurvivalBenefitData}
          policies={policies || []}
          customers={customers || []}
          onBackToForm={() => setCurrentView("survival-benefit-form")}
        />
      )}

      {/* VIEW 14: Cash Flow Chart Form */}
      {currentView === "cash-flow-chart-form" && (
        <CashFlowChartForm
          onBack={() => setCurrentView("cards")}
          onGenerateReport={handleGenerateCashFlowChartReport}
          initialData={selectedCashFlowChartData}
          agencies={agencies || []}
          policyStatuses={policyStatuses || []}
          customers={customers || []}
          policies={policies || []}
          branches={licBranches || []}
        />
      )}

      {/* VIEW 15: Cash Flow Chart Report View */}
      {currentView === "cash-flow-chart-report" && selectedCashFlowChartData && (
        <CashFlowChartReportView
          formData={selectedCashFlowChartData}
          policies={policies || []}
          customers={customers || []}
          onBackToForm={() => setCurrentView("cash-flow-chart-form")}
        />
      )}

      {/* VIEW 16: Comprehensive Insurance Chart Form */}
      {currentView === "comprehensive-insurance-chart-form" && (
        <ComprehensiveInsuranceChartForm
          onBack={() => setCurrentView("cards")}
          onGenerateReport={handleGenerateComprehensiveInsuranceChartReport}
          initialData={selectedComprehensiveInsuranceChartData}
          agencies={agencies || []}
          policyStatuses={policyStatuses || []}
          customers={customers || []}
          policies={policies || []}
          branches={licBranches || []}
        />
      )}

      {/* VIEW 17: Comprehensive Insurance Chart Report View */}
      {currentView === "comprehensive-insurance-chart-report" && selectedComprehensiveInsuranceChartData && (
        <ComprehensiveInsuranceChartReportView
          formData={selectedComprehensiveInsuranceChartData}
          policies={policies || []}
          customers={customers || []}
          onBackToForm={() => setCurrentView("comprehensive-insurance-chart-form")}
        />
      )}

      {/* VIEW 18: Premium Paid Details / Certificate Form */}
      {currentView === "premium-paid-details-form" && (
        <PremiumCertificateForm
          onBack={() => setCurrentView("cards")}
          onGenerateReport={handleGeneratePremiumCertificateReport}
          initialData={selectedPremiumCertificateData}
          customers={customers || []}
          policies={policies || []}
          branches={licBranches || []}
        />
      )}

      {/* VIEW 19: Premium Paid Details / Certificate Report View */}
      {currentView === "premium-paid-details-report" && selectedPremiumCertificateData && (
        <PremiumCertificateReportView
          formData={selectedPremiumCertificateData}
          policies={policies || []}
          customers={customers || []}
          onBackToForm={() => setCurrentView("premium-paid-details-form")}
        />
      )}

      {/* VIEW 20: Annuity Statement Form */}
      {currentView === "annuity-statement-form" && (
        <AnnuityStatementForm
          onBack={() => setCurrentView("cards")}
          onGenerateReport={handleGenerateAnnuityStatementReport}
          initialData={selectedAnnuityStatementData}
          agencies={agencies || []}
          policyStatuses={policyStatuses || []}
          customers={customers || []}
          policies={policies || []}
          branches={licBranches || []}
        />
      )}

      {/* VIEW 21: Annuity Statement Report View */}
      {currentView === "annuity-statement-report" && selectedAnnuityStatementData && (
        <AnnuityStatementReportView
          formData={selectedAnnuityStatementData}
          policies={policies || []}
          customers={customers || []}
          onBackToForm={() => setCurrentView("annuity-statement-form")}
        />
      )}

      {/* Modal for previewing secondary report cards */}
      {previewModalCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0B1220]/75 backdrop-blur-xs p-4">
          <div className="relative bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
            <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#B8873A] via-[#E8C77A] to-transparent" />
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0B1220] text-[#E8C77A]">
                  <previewModalCard.icon size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">{previewModalCard.title}</h3>
                  <span className="text-[10px] text-[#B8873A] font-serif font-bold uppercase tracking-wider">
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
                <span>Ready for Report Generation</span>
              </div>
              <p className="text-[11px] text-slate-500">
                This report module uses the same central filter engine as Policy Register and Premium Due. You can test either of those two for complete interactive report rendering and PDF export.
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