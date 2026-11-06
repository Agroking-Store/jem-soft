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
import CommissionBillForm from "@/features/lic/comm-reports/CommissionBillForm";
import CommissionBillReportView from "@/features/lic/comm-reports/CommissionBillReportView";
import { CommissionBillFormData } from "@/features/lic/comm-reports/commissionBillData";
import DeductionSummaryForm from "@/features/lic/comm-reports/DeductionSummaryForm";
import DeductionSummaryReportView from "@/features/lic/comm-reports/DeductionSummaryReportView";
import { DeductionSummaryFormData } from "@/features/lic/comm-reports/deductionSummaryData";
import CommissionSummaryForm from "@/features/lic/comm-reports/CommissionSummaryForm";
import CommissionSummaryReportView from "@/features/lic/comm-reports/CommissionSummaryReportView";
import { CommissionSummaryFormData } from "@/features/lic/comm-reports/commissionSummaryData";
import CommissionOutstandingForm from "@/features/lic/comm-reports/CommissionOutstandingForm";
import CommissionOutstandingReportView from "@/features/lic/comm-reports/CommissionOutstandingReportView";
import { CommissionOutstandingFormData } from "@/features/lic/comm-reports/commissionOutstandingData";
import ShortCommissionForm from "@/features/lic/comm-reports/ShortCommissionForm";
import ShortCommissionReportView from "@/features/lic/comm-reports/ShortCommissionReportView";
import { ShortCommissionFormData } from "@/features/lic/comm-reports/shortCommissionData";
import GapCommissionForm from "@/features/lic/comm-reports/GapCommissionForm";
import GapCommissionReportView from "@/features/lic/comm-reports/GapCommissionReportView";
import { GapCommissionFormData } from "@/features/lic/comm-reports/gapCommissionData";
import { fetchLicBranches } from "@/features/lic/licBranchSlice";
import { fetchCommissionBills, fetchCommissionBillById } from "@/features/lic/commissionSlice";
import UploadCommissionBillModal from "@/features/lic/comm-reports/UploadCommissionBillModal";
import CommissionBillDetailsModal from "@/features/lic/comm-reports/CommissionBillDetailsModal";
import { COMM_REPORT_CARDS, CommReportCard } from "@/features/lic/comm-reports/commReportsData";
import {
  Search,
  ArrowRight,
  ArrowLeft,
  FileSpreadsheet,
  Layers,
  Upload,
  Clock,
  IndianRupee,
  FileText,
  Calendar,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
} from "lucide-react";

type ViewState =
  | "cards"
  | "commission-ledger-form"
  | "commission-ledger-report"
  | "commission-bill-form"
  | "commission-bill-report"
  | "deduction-summary-form"
  | "deduction-summary-report"
  | "commission-summary-form"
  | "commission-summary-report"
  | "commission-outstanding-form"
  | "commission-outstanding-report"
  | "short-commission-form"
  | "short-commission-report"
  | "gap-commission-form"
  | "gap-commission-report";

export default function LICCommReportsPage() {
  const dispatch = useDispatch<AppDispatch>();
  const [currentView, setCurrentView] = useState<ViewState>("cards");
  const [searchQuery, setSearchQuery] = useState("");

  const [selectedLedgerData, setSelectedLedgerData] = useState<CommissionLedgerFormData | null>(null);
  const [selectedBillData, setSelectedBillData] = useState<CommissionBillFormData | null>(null);
  const [selectedDeductionData, setSelectedDeductionData] = useState<DeductionSummaryFormData | null>(null);
  const [selectedSummaryData, setSelectedSummaryData] = useState<CommissionSummaryFormData | null>(null);
  const [selectedOutstandingData, setSelectedOutstandingData] = useState<CommissionOutstandingFormData | null>(null);
  const [selectedShortCommissionData, setSelectedShortCommissionData] = useState<ShortCommissionFormData | null>(null);
  const [selectedGapCommissionData, setSelectedGapCommissionData] = useState<GapCommissionFormData | null>(null);

  // Redux Store Data
  const { policies } = useSelector((state: RootState) => state.policies);
  const { customers } = useSelector((state: RootState) => state.customers);
  const { agencies } = useSelector((state: RootState) => state.agency);
  const { advisors } = useSelector((state: RootState) => state.advisors);
  const { branches } = useSelector((state: RootState) => state.licBranch);
  const { bills } = useSelector((state: RootState) => state.commissions);

  // Modal States
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedBillForDetails, setSelectedBillForDetails] = useState<any | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  useEffect(() => {
    dispatch(fetchPolicies());
    dispatch(fetchCustomers());
    dispatch(fetchCustomersMaster());
    dispatch(fetchAgencies());
    dispatch(fetchAdvisors());
    dispatch(fetchLicBranches());
    dispatch(fetchCommissionBills());
  }, [dispatch]);

  // Listen to navigation events from LicModuleNav to return to reports grid
  useEffect(() => {
    const handleReset = () => setCurrentView("cards");
    window.addEventListener("reset-comm-reports-view", handleReset);
    return () => window.removeEventListener("reset-comm-reports-view", handleReset);
  }, []);

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
      setSelectedLedgerData(null);
      setCurrentView("commission-ledger-form");
    } else if (card.id === "commission-bill") {
      setSelectedBillData(null);
      setCurrentView("commission-bill-form");
    } else if (card.id === "deduction-summary") {
      setSelectedDeductionData(null);
      setCurrentView("deduction-summary-form");
    } else if (card.id === "commission-summary") {
      setSelectedSummaryData(null);
      setCurrentView("commission-summary-form");
    } else if (card.id === "commission-outstanding") {
      setSelectedOutstandingData(null);
      setCurrentView("commission-outstanding-form");
    } else if (card.id === "short-excess-commissions") {
      setSelectedShortCommissionData(null);
      setCurrentView("short-commission-form");
    } else if (card.id === "gap-commissions") {
      setSelectedGapCommissionData(null);
      setCurrentView("gap-commission-form");
    }
  };

  // Open details modal when clicking an uploaded statement card
  const handleOpenBillDetails = async (billId: string) => {
    try {
      const data = await dispatch(fetchCommissionBillById(billId)).unwrap();
      setSelectedBillForDetails(data);
      setIsDetailsModalOpen(true);
    } catch {
      // Fallback to local bill object if network fails
      const fallback = bills.find((b) => b.id === billId);
      if (fallback) {
        setSelectedBillForDetails(fallback);
        setIsDetailsModalOpen(true);
      }
    }
  };

  // View Navigation Handlers for standard forms
  const handleGenerateLedgerReport = (data: CommissionLedgerFormData) => {
    setSelectedLedgerData(data);
    setCurrentView("commission-ledger-report");
  };

  const handleGenerateBillReport = (data: CommissionBillFormData) => {
    setSelectedBillData(data);
    setCurrentView("commission-bill-report");
  };

  const handleGenerateDeductionReport = (data: DeductionSummaryFormData) => {
    setSelectedDeductionData(data);
    setCurrentView("deduction-summary-report");
  };

  const handleGenerateSummaryReport = (data: CommissionSummaryFormData) => {
    setSelectedSummaryData(data);
    setCurrentView("commission-summary-report");
  };

  const handleGenerateOutstandingReport = (data: CommissionOutstandingFormData) => {
    setSelectedOutstandingData(data);
    setCurrentView("commission-outstanding-report");
  };

  const handleGenerateShortCommissionReport = (data: ShortCommissionFormData) => {
    setSelectedShortCommissionData(data);
    setCurrentView("short-commission-report");
  };

  const handleGenerateGapCommissionReport = (data: GapCommissionFormData) => {
    setSelectedGapCommissionData(data);
    setCurrentView("gap-commission-report");
  };

  return (
    <div className="space-y-6">
      {/* LIC Sub-Navigation Bar */}
      <LicModuleNav />

      {/* VIEW 1: Main Commission Reports Grid + Uploaded Statements Cards */}
      {currentView === "cards" && (
        <div className="space-y-6">
          {/* Header & Upload Statement CTA */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#1877F2] to-blue-700 text-white shadow-md shadow-blue-500/20">
                <FileSpreadsheet size={24} />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                  Commission Reports
                </h1>
                <p className="mt-0.5 text-xs sm:text-sm font-medium text-slate-500">
                  Generate commission ledgers, bills, summaries, and agent payout statements.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsUploadModalOpen(true)}
                className="flex items-center gap-2 bg-gradient-to-r from-[#1877F2] to-[#2563eb] text-white px-4 py-2.5 rounded-xl text-xs font-semibold shadow-md shadow-blue-500/20 hover:opacity-95 transition cursor-pointer"
              >
                <Upload size={16} />
                <span>Upload Statement</span>
              </button>

              <div className="flex items-center gap-2 bg-white/80 border border-blue-200 px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-700 shadow-2xs">
                <Layers size={16} className="text-[#1877F2]" />
                <span><strong>{COMM_REPORT_CARDS.length}</strong> Reports</span>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* UPLOADED COMMISSION STATEMENTS SECTION (EACH UPLOAD HAS ITS OWN CARD)     */}
          {/* ========================================================================= */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-[#1877F2]">
                  <FileText size={18} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Uploaded Commission Statements
                  </h2>
                  <p className="text-xs text-slate-500">
                    {bills && bills.length > 0
                      ? `${bills.length} statement bill${bills.length > 1 ? "s" : ""} uploaded. Click any card to inspect policyholder details.`
                      : "Upload statement PDFs to auto-reconcile policies and track commission payouts."}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsUploadModalOpen(true)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1877F2] hover:text-blue-700 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200 transition self-start sm:self-center cursor-pointer"
              >
                <Upload size={13} />
                <span>+ Upload New Statement</span>
              </button>
            </div>

            {/* Statement Cards Grid */}
            {bills && bills.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {bills.map((bill) => {
                  const billDateFormatted = bill.billDate
                    ? new Date(bill.billDate).toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })
                    : "N/A";

                  return (
                    <div
                      key={bill.id}
                      onClick={() => handleOpenBillDetails(bill.id)}
                      className="group relative cursor-pointer overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs transition-all duration-200 hover:-translate-y-1 hover:border-[#1877F2] hover:shadow-md flex flex-col justify-between"
                    >
                      <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#1877F2] via-blue-500 to-emerald-500" />

                      <div className="space-y-3 pt-0.5">
                        {/* Card Top: Bill Number & Status */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#1877F2] group-hover:bg-[#1877F2] group-hover:text-white transition shadow-2xs">
                              <FileText size={18} />
                            </div>
                            <div className="truncate">
                              <h4 className="font-bold text-xs text-slate-900 group-hover:text-[#1877F2] transition truncate max-w-[150px]">
                                {bill.billNumber}
                              </h4>
                              <p className="text-[10px] text-slate-500 truncate">
                                {bill.agencyName || "Primary Agency"}
                              </p>
                            </div>
                          </div>

                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-700 shrink-0">
                            <CheckCircle2 size={10} />
                            Reconciled
                          </span>
                        </div>

                        {/* Statement Period Badge: "Uploaded till that day" */}
                        <div className="rounded-xl bg-slate-50/90 border border-slate-100 p-2.5 flex items-center justify-between text-xs">
                          <span className="text-[11px] text-slate-500 font-medium flex items-center gap-1.5">
                            <Calendar size={13} className="text-[#1877F2]" />
                            Uploaded Till:
                          </span>
                          <span className="font-bold text-slate-800 text-xs">
                            {billDateFormatted}
                          </span>
                        </div>

                        {/* Financial Metrics */}
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="rounded-lg bg-blue-50/40 p-2 border border-blue-100/60">
                            <div className="text-[10px] text-slate-500 font-medium">Gross Comm.</div>
                            <div className="font-bold text-blue-900 text-xs mt-0.5">
                              ₹{Number(bill.grossCommission || 0).toLocaleString("en-IN")}
                            </div>
                          </div>

                          <div className="rounded-lg bg-emerald-50/40 p-2 border border-emerald-100/60">
                            <div className="text-[10px] text-slate-500 font-medium">Total Premium</div>
                            <div className="font-bold text-emerald-900 text-xs mt-0.5">
                              ₹{Number(bill.totalPremium || 0).toLocaleString("en-IN")}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Card Footer */}
                      <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                        <span className="font-medium">
                          {bill.itemCount || 0} policies recorded
                        </span>
                        <span className="text-[#1877F2] font-semibold group-hover:underline inline-flex items-center gap-1">
                          View Details &rarr;
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-10 text-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-6 space-y-2">
                <FileText size={32} className="mx-auto text-slate-300" />
                <h3 className="font-semibold text-xs text-slate-700">No statements uploaded yet</h3>
                <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                  When you upload an LIC commission statement, a card will appear here showing the statement details and the date it was uploaded till.
                </p>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setIsUploadModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#1877F2] text-white font-semibold text-xs shadow-sm hover:bg-blue-600 transition cursor-pointer"
                  >
                    <Upload size={13} />
                    <span>Upload First Statement</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Search Bar for Reports Grid */}
          <div className="flex items-center justify-between gap-4 pt-2">
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

          {/* Cards Grid (Report Types) */}
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
                      {card.id === "commission-ledger" ||
                      card.id === "commission-bill" ||
                      card.id === "deduction-summary" ||
                      card.id === "commission-summary" ||
                      card.id === "commission-outstanding" ||
                      card.id === "short-excess-commissions" ||
                      card.id === "gap-commissions"
                        ? "Open Form & Report"
                        : "View Details"}
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

      {/* VIEW 3: Commission Ledger Report View */}
      {currentView === "commission-ledger-report" && selectedLedgerData && (
        <CommissionLedgerReportView
          formData={selectedLedgerData}
          onBack={() => setCurrentView("commission-ledger-form")}
        />
      )}

      {/* VIEW 4: Commission Bill Form */}
      {currentView === "commission-bill-form" && (
        <CommissionBillForm
          onBack={() => setCurrentView("cards")}
          onGenerateReport={handleGenerateBillReport}
          initialData={selectedBillData}
          agencies={agencies || []}
        />
      )}

      {/* VIEW 5: Commission Bill Report View */}
      {currentView === "commission-bill-report" && selectedBillData && (
        <CommissionBillReportView
          formData={selectedBillData}
          onBack={() => setCurrentView("commission-bill-form")}
        />
      )}

      {/* VIEW 6: Deduction Summary Form */}
      {currentView === "deduction-summary-form" && (
        <DeductionSummaryForm
          onBack={() => setCurrentView("cards")}
          onGenerateReport={handleGenerateDeductionReport}
          initialData={selectedDeductionData}
          agencies={agencies || []}
          advisors={advisors || []}
        />
      )}

      {/* VIEW 7: Deduction Summary Report View */}
      {currentView === "deduction-summary-report" && selectedDeductionData && (
        <DeductionSummaryReportView
          formData={selectedDeductionData}
          onBack={() => setCurrentView("deduction-summary-form")}
        />
      )}

      {/* VIEW 8: Commission Summary Form */}
      {currentView === "commission-summary-form" && (
        <CommissionSummaryForm
          onBack={() => setCurrentView("cards")}
          onGenerateReport={handleGenerateSummaryReport}
          initialData={selectedSummaryData}
          agencies={agencies || []}
          advisors={advisors || []}
        />
      )}

      {/* VIEW 9: Commission Summary Report View */}
      {currentView === "commission-summary-report" && selectedSummaryData && (
        <CommissionSummaryReportView
          formData={selectedSummaryData}
          onBack={() => setCurrentView("commission-summary-form")}
        />
      )}

      {/* VIEW 10: Commission Outstanding Form */}
      {currentView === "commission-outstanding-form" && (
        <CommissionOutstandingForm
          onBack={() => setCurrentView("cards")}
          onGenerateReport={handleGenerateOutstandingReport}
          initialData={selectedOutstandingData}
          branches={branches || []}
          agencies={agencies || []}
          advisors={advisors || []}
          policies={policies || []}
          customers={customers || []}
        />
      )}

      {/* VIEW 11: Commission Outstanding Report View */}
      {currentView === "commission-outstanding-report" && selectedOutstandingData && (
        <CommissionOutstandingReportView
          formData={selectedOutstandingData}
          onBack={() => setCurrentView("commission-outstanding-form")}
        />
      )}

      {/* VIEW 12: Short & Excess Commission Form */}
      {currentView === "short-commission-form" && (
        <ShortCommissionForm
          onBack={() => setCurrentView("cards")}
          onGenerateReport={handleGenerateShortCommissionReport}
          initialData={selectedShortCommissionData}
          agencies={agencies || []}
          advisors={advisors || []}
        />
      )}

      {/* VIEW 13: Short & Excess Commission Report View */}
      {currentView === "short-commission-report" && selectedShortCommissionData && (
        <ShortCommissionReportView
          formData={selectedShortCommissionData}
          onBack={() => setCurrentView("short-commission-form")}
        />
      )}

      {/* VIEW 14: Gap Commission Form */}
      {currentView === "gap-commission-form" && (
        <GapCommissionForm
          onBack={() => setCurrentView("cards")}
          onGenerateReport={handleGenerateGapCommissionReport}
          initialData={selectedGapCommissionData}
          agencies={agencies || []}
          advisors={advisors || []}
        />
      )}

      {/* VIEW 15: Gap Commission Report View */}
      {currentView === "gap-commission-report" && selectedGapCommissionData && (
        <GapCommissionReportView
          formData={selectedGapCommissionData}
          onBack={() => setCurrentView("gap-commission-form")}
        />
      )}

      {/* Upload Commission Statement Modal */}
      <UploadCommissionBillModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onSuccess={() => {
          setIsUploadModalOpen(false);
          dispatch(fetchCommissionBills());
        }}
      />

      {/* Uploaded Statement Details Modal (Opened on Card Click) */}
      <CommissionBillDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => {
          setIsDetailsModalOpen(false);
          setSelectedBillForDetails(null);
        }}
        bill={selectedBillForDetails}
      />
    </div>
  );
}
