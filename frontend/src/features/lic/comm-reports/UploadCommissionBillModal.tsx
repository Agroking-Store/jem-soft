"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import {
  X,
  Upload,
  Calendar,
  Building2,
  FileCheck,
  Clock,
  ShieldCheck,
  AlertTriangle,
  Search,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  UserCheck,
  Coins,
  FileText,
  Sliders,
  Sparkles,
} from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch, RootState } from "@/store/store";
import {
  fetchCommissionBills,
  reconcileCommissionStatement,
  applyCommissionStatementPayments,
} from "../commissionSlice";
import toast from "react-hot-toast";
import { FortnightCycle, getLastDayOfMonth, formatDateYmd, MONTH_NAMES } from "./fortnightTracker";

interface UploadCommissionBillModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (billId?: string) => void;
  initialCycle?: FortnightCycle | null;
}

export type ModalWizardStep = "UPLOAD" | "PREVIEW" | "SUCCESS";
export type CycleSelectionMode = "F1" | "F2" | "MONTHLY" | "CUSTOM";

export interface ReconciledStatementRow {
  serialNo: number;
  policyHolderName: string;
  policyNumber: string;
  plan: string;
  term: number;
  dueDate: string;
  riskDate: string;
  cbo: string;
  adjDate: string;
  premium: number;
  commission: number;
  pageNumber: number;
  status: "MATCHED_UNPAID" | "MATCHED_ALREADY_PAID" | "PAYMENT_NOT_FOUND" | "POLICY_NOT_FOUND";
  statusDescription: string;
  policyId?: string;
  customerName?: string;
  paymentId?: string;
}

export interface ReconcileResultData {
  metadata: {
    branchCode?: string;
    agentName?: string;
    agentCode?: string;
    leaderCode?: string;
    voucherDate?: string;
    batch?: string;
  };
  totals: {
    grandTotalPremium?: number;
    grandTotalCommission?: number;
    calculatedTotalPremium: number;
    calculatedTotalCommission: number;
    isChecksumValid: boolean;
    checksumDiscrepancy: {
      premiumDiff: number;
      commissionDiff: number;
    };
  };
  statistics: {
    totalRows: number;
    matchedPoliciesCount: number;
    unmatchedPoliciesCount: number;
    readyToPayCount: number;
    alreadyPaidCount: number;
    unmatchedCount: number;
  };
  rows: ReconciledStatementRow[];
  file: {
    fileName: string;
    fileUrl: string;
    storedFileName: string;
  };
}

export default function UploadCommissionBillModal({
  isOpen,
  onClose,
  onSuccess,
  initialCycle,
}: UploadCommissionBillModalProps) {
  const dispatch = useDispatch<AppDispatch>();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { agencies } = useSelector((state: RootState) => state.agency);

  // Wizard state
  const [step, setStep] = useState<ModalWizardStep>("UPLOAD");
  const [isReconciling, setIsReconciling] = useState(false);
  const [isApplying, setIsApplying] = useState(false);

  // Step 1: Form controls - Month, Year, Cycle, and Date-wise settings
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [cycleMode, setCycleMode] = useState<CycleSelectionMode>("F1");
  const [cycleName, setCycleName] = useState<string>("Cycle 1 (1st–15th)");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  const [billNumber, setBillNumber] = useState<string>("");
  const [billDate, setBillDate] = useState<string>("");
  const [selectedAgencyId, setSelectedAgencyId] = useState<string>("");

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState<boolean>(false);

  // Step 2: Reconciliation data
  const [reconcileData, setReconcileData] = useState<ReconcileResultData | null>(null);
  const [statusFilter, setStatusFilter] = useState<"ALL" | "READY" | "PAID" | "UNMATCHED">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Step 3: Success result
  const [appliedResult, setAppliedResult] = useState<any>(null);

  // Helper to re-compute dates and bill number based on month, year, and mode
  const syncCycleDates = (yr: number, mo: number, mode: CycleSelectionMode, customName?: string) => {
    const lastDay = getLastDayOfMonth(yr, mo);
    const moStr = String(mo + 1).padStart(2, "0");
    const lastDayStr = String(lastDay).padStart(2, "0");

    let sDate = "";
    let eDate = "";
    let cName = customName || "";
    let bNum = "";

    if (mode === "F1") {
      sDate = `${yr}-${moStr}-01`;
      eDate = `${yr}-${moStr}-15`;
      cName = "Cycle 1 (1st–15th)";
      bNum = `LIC-${yr}/${moStr}/Cycle-1`;
    } else if (mode === "F2") {
      sDate = `${yr}-${moStr}-16`;
      eDate = `${yr}-${moStr}-${lastDayStr}`;
      cName = `Cycle 2 (16th–${lastDay}th)`;
      bNum = `LIC-${yr}/${moStr}/Cycle-2`;
    } else if (mode === "MONTHLY") {
      sDate = `${yr}-${moStr}-01`;
      eDate = `${yr}-${moStr}-${lastDayStr}`;
      cName = "Full Month";
      bNum = `LIC-${yr}/${moStr}/Monthly`;
    } else {
      // CUSTOM mode: default to 15 days if dates empty
      sDate = startDate || `${yr}-${moStr}-01`;
      const baseStart = new Date(sDate);
      if (!isNaN(baseStart.getTime())) {
        const targetEnd = new Date(baseStart);
        targetEnd.setDate(targetEnd.getDate() + 14); // default 15-day window
        eDate = formatDateYmd(targetEnd);
      } else {
        eDate = endDate || `${yr}-${moStr}-15`;
      }
      cName = customName || cycleName || "15-Day Period";
      bNum = `LIC-${yr}/${moStr}/Batch`;
    }

    setStartDate(sDate);
    setEndDate(eDate);
    setCycleName(cName);
    setBillDate(eDate);
    setBillNumber(bNum);
  };

  useEffect(() => {
    if (initialCycle) {
      setSelectedYear(initialCycle.year);
      setSelectedMonth(initialCycle.month);

      const sYmd = formatDateYmd(initialCycle.startDate);
      const eYmd = formatDateYmd(initialCycle.endDate);
      setStartDate(sYmd);
      setEndDate(eYmd);
      setBillDate(eYmd);

      if (initialCycle.cycleType === "monthly") {
        setCycleMode("MONTHLY");
        setCycleName("Full Month");
      } else if (initialCycle.cycleType === "custom") {
        setCycleMode("CUSTOM");
        setCycleName(initialCycle.cycleLabel || "Custom Cycle");
      } else {
        const mode = initialCycle.fortnight === 1 ? "F1" : "F2";
        setCycleMode(mode);
        setCycleName(`Cycle ${initialCycle.fortnight}`);
      }

      const moStr = String(initialCycle.month + 1).padStart(2, "0");
      setBillNumber(
        initialCycle.uploadedBill?.billNumber ||
          `LIC-${initialCycle.year}/${moStr}/Cycle-${initialCycle.fortnight}`
      );
    } else if (isOpen) {
      const now = new Date();
      const yr = now.getFullYear();
      const mo = now.getMonth();
      const isF1 = now.getDate() <= 15;
      const mode: CycleSelectionMode = isF1 ? "F1" : "F2";

      setSelectedYear(yr);
      setSelectedMonth(mo);
      setCycleMode(mode);
      syncCycleDates(yr, mo, mode);

      setStep("UPLOAD");
      setReconcileData(null);
      setSelectedFile(null);
      setAppliedResult(null);
      setCurrentPage(1);
    }
  }, [initialCycle, isOpen]);

  const handleYearChange = (yr: number) => {
    setSelectedYear(yr);
    syncCycleDates(yr, selectedMonth, cycleMode);
  };

  const handleMonthChange = (mo: number) => {
    setSelectedMonth(mo);
    syncCycleDates(selectedYear, mo, cycleMode);
  };

  const handleModeChange = (mode: CycleSelectionMode) => {
    setCycleMode(mode);
    syncCycleDates(selectedYear, selectedMonth, mode);
  };

  // Helper to quickly adjust End Date to exactly 15 days from Start Date
  const handleSet15Days = () => {
    if (!startDate) return;
    const s = new Date(startDate);
    if (isNaN(s.getTime())) return;
    const targetEnd = new Date(s);
    targetEnd.setDate(targetEnd.getDate() + 14); // 15 days inclusive
    const eYmd = formatDateYmd(targetEnd);
    setEndDate(eYmd);
    setBillDate(eYmd);
    toast.success("Adjusted period to exactly 15 days!");
  };

  // Calculate duration in days between startDate and endDate
  const periodDays = useMemo(() => {
    if (!startDate || !endDate) return null;
    const s = new Date(startDate);
    const e = new Date(endDate);
    if (isNaN(s.getTime()) || isNaN(e.getTime())) return null;
    const diff = Math.round((e.getTime() - s.getTime()) / (1000 * 3600 * 24)) + 1;
    return diff > 0 ? diff : null;
  }, [startDate, endDate]);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  // Step 1 -> Step 2: Trigger Statement Reconciliation
  const handleReconcileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedFile) {
      toast.error("Please select an LIC Commission Bill PDF statement file.");
      return;
    }

    if (!selectedFile.name.toLowerCase().endsWith(".pdf")) {
      toast.error("Please select a valid PDF file. Other formats are not supported for automated statement reconciliation.");
      return;
    }

    const formData = new FormData();
    formData.append("statementFile", selectedFile);
    if (selectedAgencyId) formData.append("agencyId", selectedAgencyId);

    const toastId = toast.loading("Analyzing statement and matching policyholders...");
    setIsReconciling(true);

    try {
      const data = await dispatch(reconcileCommissionStatement(formData)).unwrap();
      setReconcileData(data);
      if (data?.metadata?.batch) {
        setBillNumber(data.metadata.batch.replace(/[^a-zA-Z0-9]/g, "-"));
      }
      toast.success(
        `Extracted ${data.statistics.totalRows} records! ${data.statistics.matchedPoliciesCount} policies matched.`,
        { id: toastId }
      );
      setStep("PREVIEW");
      setCurrentPage(1);
    } catch (err: any) {
      toast.error(err || "Failed to reconcile commission statement", { id: toastId });
    } finally {
      setIsReconciling(false);
    }
  };

  // Step 2 -> Step 3: Confirm and Apply Payments to Database
  const handleApplyPayments = async () => {
    if (!reconcileData) return;

    const toastId = toast.loading("Applying payments to policies and generating bill...");
    setIsApplying(true);

    try {
      const payload = {
        billNumber: billNumber || `BILL-${Date.now().toString().slice(-6)}`,
        billDate: billDate || endDate || new Date().toISOString(),
        agencyId: selectedAgencyId || undefined,
        agencyCode: reconcileData.metadata?.agentCode,
        batch: reconcileData.metadata?.batch || cycleName || undefined,
        fileName: reconcileData.file?.fileName,
        fileUrl: reconcileData.file?.fileUrl,
        rows: reconcileData.rows,
        skipAlreadyPaid: true,
      };

      const result = await dispatch(applyCommissionStatementPayments(payload)).unwrap();
      setAppliedResult(result);
      dispatch(fetchCommissionBills(selectedAgencyId || undefined));
      toast.success(result.message || "Payments applied successfully!", { id: toastId });
      setStep("SUCCESS");
    } catch (err: any) {
      toast.error(err || "Failed to apply statement payments", { id: toastId });
    } finally {
      setIsApplying(false);
    }
  };

  // Filtered rows for Step 2 preview
  const filteredRows = useMemo(() => {
    if (!reconcileData?.rows) return [];
    return reconcileData.rows.filter((row) => {
      if (statusFilter === "READY") {
        if (row.status !== "MATCHED_UNPAID" && row.status !== "PAYMENT_NOT_FOUND") return false;
      } else if (statusFilter === "PAID") {
        if (row.status !== "MATCHED_ALREADY_PAID") return false;
      } else if (statusFilter === "UNMATCHED") {
        if (row.status !== "POLICY_NOT_FOUND") return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesPolicy = row.policyNumber.includes(q);
        const matchesName = (row.customerName || row.policyHolderName).toLowerCase().includes(q);
        const matchesCbo = row.cbo.toLowerCase().includes(q);
        const matchesPlan = row.plan.includes(q);
        return matchesPolicy || matchesName || matchesCbo || matchesPlan;
      }

      return true;
    });
  }, [reconcileData, statusFilter, searchQuery]);

  // Paginated rows
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, currentPage]);

  const totalPages = Math.ceil(filteredRows.length / pageSize) || 1;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div
        className={`relative w-full rounded-2xl border border-slate-200 bg-white shadow-2xl transition-all duration-200 flex flex-col max-h-[92vh] ${
          step === "PREVIEW" ? "max-w-5xl" : "max-w-xl"
        }`}
      >
        {/* Wizard Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-[#1877F2]">
              {step === "SUCCESS" ? (
                <CheckCircle2 size={22} className="text-emerald-600" />
              ) : step === "PREVIEW" ? (
                <Coins size={22} className="text-[#1877F2]" />
              ) : (
                <Upload size={20} />
              )}
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {step === "PREVIEW"
                  ? "Reconciliation Preview & Policyholder Match"
                  : step === "SUCCESS"
                  ? "Statement Processed & Payments Applied"
                  : "Upload LIC Commission Statement (PDF)"}
              </h2>
              <p className="text-xs text-slate-500">
                {step === "PREVIEW"
                  ? "Review policyholder premium matching and verify statement checksum"
                  : step === "SUCCESS"
                  ? "All customer premium payments have been updated to PAID"
                  : "Configure statement cycle, dates, and upload the official LIC PDF"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* ========================================================================= */}
        {/* STEP 1: UPLOAD & CONFIGURATION FORM (MANUAL & FLEXIBLE CYCLE/DATE-WISE)     */}
        {/* ========================================================================= */}
        {step === "UPLOAD" && (
          <form onSubmit={handleReconcileSubmit} className="p-6 space-y-4 overflow-y-auto">
            {initialCycle && (
              <div className="flex items-center gap-2.5 rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
                <Clock size={16} className="text-amber-700 shrink-0" />
                <div>
                  <span className="font-bold">Editing Statement For:</span> {initialCycle.title} ({initialCycle.periodLabel})
                </div>
              </div>
            )}

            {/* Flexible Statement Period Settings */}
            <div className="rounded-xl border border-blue-100 bg-gradient-to-br from-blue-50/50 to-slate-50/80 p-4 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-800 flex items-center gap-1.5">
                  <Calendar size={14} className="text-[#1877F2]" />
                  Statement Month &amp; Cycle Configuration
                </span>
                {periodDays && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-blue-100/80 px-2 py-0.5 text-[11px] font-bold text-blue-700">
                    <Sparkles size={11} />
                    {periodDays} Days Period
                  </span>
                )}
              </div>

              {/* Cycle Preset Selector Tabs */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1.5">
                  Statement Frequency / Cycle Preset:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1 rounded-xl bg-slate-200/60 text-xs">
                  <button
                    type="button"
                    onClick={() => handleModeChange("F1")}
                    className={`py-1.5 px-2 rounded-lg text-center font-semibold transition cursor-pointer text-[11px] ${
                      cycleMode === "F1"
                        ? "bg-white text-blue-700 shadow-2xs font-bold"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Cycle 1 (1–15)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleModeChange("F2")}
                    className={`py-1.5 px-2 rounded-lg text-center font-semibold transition cursor-pointer text-[11px] ${
                      cycleMode === "F2"
                        ? "bg-white text-blue-700 shadow-2xs font-bold"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Cycle 2 (16–End)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleModeChange("MONTHLY")}
                    className={`py-1.5 px-2 rounded-lg text-center font-semibold transition cursor-pointer text-[11px] ${
                      cycleMode === "MONTHLY"
                        ? "bg-white text-blue-700 shadow-2xs font-bold"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Full Month
                  </button>
                  <button
                    type="button"
                    onClick={() => handleModeChange("CUSTOM")}
                    className={`py-1.5 px-2 rounded-lg text-center font-semibold transition cursor-pointer text-[11px] ${
                      cycleMode === "CUSTOM"
                        ? "bg-white text-blue-700 shadow-2xs font-bold"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Custom / 15-Day
                  </button>
                </div>
              </div>

              {/* Year, Month, and Custom Cycle Name */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Year</label>
                  <select
                    value={selectedYear}
                    onChange={(e) => handleYearChange(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-200 bg-white py-1.5 px-2.5 text-xs text-slate-800 outline-none focus:border-[#1877F2]"
                  >
                    {[2027, 2026, 2025, 2024, 2023, 2022, 2021, 2020].map((yr) => (
                      <option key={yr} value={yr}>
                        {yr}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Month</label>
                  <select
                    value={selectedMonth}
                    onChange={(e) => handleMonthChange(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-200 bg-white py-1.5 px-2.5 text-xs text-slate-800 outline-none focus:border-[#1877F2]"
                  >
                    {MONTH_NAMES.map((name, idx) => (
                      <option key={name} value={idx}>
                        {name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Cycle / Batch Label
                  </label>
                  <input
                    type="text"
                    value={cycleName}
                    onChange={(e) => setCycleName(e.target.value)}
                    placeholder="e.g. Cycle 1, 15-Day Batch"
                    className="w-full rounded-lg border border-slate-200 bg-white py-1.5 px-2.5 text-xs text-slate-800 outline-none focus:border-[#1877F2]"
                  />
                </div>
              </div>

              {/* Date-Wise Selection: From Date & To Date (Directly Editable) */}
              <div className="pt-2 border-t border-slate-200/70">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-[11px] font-bold text-slate-700">
                    Date-Wise Statement Period (Editable):
                  </label>
                  <button
                    type="button"
                    onClick={handleSet15Days}
                    className="text-[10px] text-[#1877F2] hover:underline font-bold cursor-pointer"
                    title="Automatically set End Date to exactly 15 days from Start Date"
                  >
                    + Snap to 15 Days
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-0.5">From Date (Start)</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => {
                        setStartDate(e.target.value);
                        if (cycleMode !== "CUSTOM") setCycleMode("CUSTOM");
                      }}
                      className="w-full rounded-lg border border-slate-200 bg-white py-1.5 px-2 text-xs text-slate-800 outline-none focus:border-[#1877F2]"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-500 mb-0.5">To Date (End)</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => {
                        setEndDate(e.target.value);
                        setBillDate(e.target.value);
                        if (cycleMode !== "CUSTOM") setCycleMode("CUSTOM");
                      }}
                      className="w-full rounded-lg border border-slate-200 bg-white py-1.5 px-2 text-xs text-slate-800 outline-none focus:border-[#1877F2]"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Bill Number, Bill Date, and Agency Selection */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Bill / Voucher No.
                </label>
                <input
                  type="text"
                  value={billNumber}
                  onChange={(e) => setBillNumber(e.target.value)}
                  placeholder="e.g. LIC-2026/09/Cycle-1"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2 px-3 text-xs text-slate-800 outline-none focus:border-[#1877F2] focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Statement Date
                </label>
                <input
                  type="date"
                  value={billDate}
                  onChange={(e) => setBillDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2 px-3 text-xs text-slate-800 outline-none focus:border-[#1877F2] focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Agency</label>
                <div className="relative">
                  <Building2
                    size={14}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <select
                    value={selectedAgencyId}
                    onChange={(e) => setSelectedAgencyId(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2 pl-8 pr-3 text-xs text-slate-800 outline-none focus:border-[#1877F2] focus:bg-white"
                  >
                    <option value="">Primary Agency</option>
                    {agencies?.map((ag) => (
                      <option key={ag.id} value={ag.id}>
                        {ag.agencyName} ({ag.agencyCode})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* File Dropzone */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Statement PDF File *
              </label>
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center cursor-pointer transition-all ${
                  dragActive
                    ? "border-[#1877F2] bg-blue-50/50"
                    : selectedFile
                    ? "border-emerald-400 bg-emerald-50/30"
                    : "border-slate-200 hover:border-blue-300 bg-slate-50/50"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  onChange={handleFileChange}
                  className="hidden"
                />

                {selectedFile ? (
                  <div className="flex flex-col items-center gap-1.5 text-slate-700">
                    <FileCheck size={38} className="text-emerald-600" />
                    <p className="text-xs font-bold text-slate-900 truncate max-w-xs">
                      {selectedFile.name}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {(selectedFile.size / 1024).toFixed(1)} KB • Click to change file
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-50 text-[#1877F2]">
                      <Upload size={20} />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-800">
                        Drop LIC statement PDF here or{" "}
                        <span className="text-[#1877F2] font-bold">browse</span>
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Accepts official LIC Commission Bill PDFs (15-day, monthly, or custom periods)
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Action Bar */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                disabled={isReconciling}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isReconciling || !selectedFile}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#1877F2] to-[#2563eb] text-white text-xs font-semibold shadow-md shadow-blue-500/20 hover:opacity-95 disabled:opacity-50 transition cursor-pointer"
              >
                {isReconciling ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>Extracting &amp; Reconciling...</span>
                  </>
                ) : (
                  <>
                    <span>Analyze &amp; Reconcile Statement</span>
                    <ArrowRight size={14} />
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* ========================================================================= */}
        {/* STEP 2: RECONCILIATION PREVIEW & TABLE                                    */}
        {/* ========================================================================= */}
        {step === "PREVIEW" && reconcileData && (
          <div className="flex flex-col flex-1 overflow-hidden p-6 space-y-4">
            {/* Top Statement Metadata Banner */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/90 px-4 py-3 text-xs">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100/70 text-[#1877F2]">
                  <UserCheck size={18} />
                </div>
                <div>
                  <div className="font-bold text-slate-900">
                    {reconcileData.metadata?.agentName || "Agent"} (
                    {reconcileData.metadata?.agentCode || "N/A"})
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Branch: {reconcileData.metadata?.branchCode || "N/A"} • Period: {startDate} to {endDate} ({cycleName})
                  </div>
                </div>
              </div>

              <div className="text-right">
                <div className="text-[11px] font-semibold text-slate-500">Voucher Date</div>
                <div className="text-xs font-bold text-slate-800">
                  {reconcileData.metadata?.voucherDate || billDate}
                </div>
              </div>
            </div>

            {/* Checksum & Financial Integrity Shield */}
            {reconcileData.totals.isChecksumValid ? (
              <div className="flex items-center gap-2.5 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2.5 text-xs text-emerald-900">
                <ShieldCheck size={18} className="text-emerald-600 shrink-0" />
                <div>
                  <span className="font-bold">100% Mathematically Verified:</span> Statement Grand
                  Total (₹{reconcileData.totals.grandTotalPremium?.toLocaleString("en-IN")}) matches sum of all {reconcileData.statistics.totalRows} extracted line items with ₹0.00 discrepancy.
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2.5 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-xs text-amber-900">
                <AlertTriangle size={18} className="text-amber-600 shrink-0" />
                <div>
                  <span className="font-bold">Checksum Discrepancy:</span> Grand Total in document (₹
                  {reconcileData.totals.grandTotalPremium?.toLocaleString("en-IN")}) differs from extracted sum (₹
                  {reconcileData.totals.calculatedTotalPremium?.toLocaleString("en-IN")}) by ₹
                  {reconcileData.totals.checksumDiscrepancy.premiumDiff}.
                </div>
              </div>
            )}

            {/* 4 KPI Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <span className="text-[11px] font-medium text-slate-500">Total Extracted Records</span>
                <div className="text-lg font-bold text-slate-900 mt-0.5">
                  {reconcileData.statistics.totalRows}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  ₹{reconcileData.totals.calculatedTotalPremium.toLocaleString("en-IN")} Total Prem
                </div>
              </div>

              <div className="rounded-xl border border-blue-200 bg-blue-50/40 p-3">
                <span className="text-[11px] font-semibold text-blue-700">Matched Policies</span>
                <div className="text-lg font-bold text-blue-900 mt-0.5">
                  {reconcileData.statistics.matchedPoliciesCount} /{" "}
                  {reconcileData.statistics.matchedPoliciesCount +
                    reconcileData.statistics.unmatchedPoliciesCount}
                </div>
                <div className="text-[11px] text-blue-600 mt-0.5">
                  {Math.round(
                    (reconcileData.statistics.matchedPoliciesCount /
                      Math.max(
                        1,
                        reconcileData.statistics.matchedPoliciesCount +
                          reconcileData.statistics.unmatchedPoliciesCount
                      )) *
                      100
                  )}
                  % database match
                </div>
              </div>

              <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-3">
                <span className="text-[11px] font-semibold text-emerald-700">Ready to Mark PAID</span>
                <div className="text-lg font-bold text-emerald-900 mt-0.5">
                  {reconcileData.statistics.readyToPayCount}
                </div>
                <div className="text-[11px] text-emerald-600 mt-0.5">Will update PremiumPayment</div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50/40 p-3">
                <span className="text-[11px] font-medium text-slate-500">Already Settled / Others</span>
                <div className="text-lg font-bold text-slate-700 mt-0.5">
                  {reconcileData.statistics.alreadyPaidCount + reconcileData.statistics.unmatchedCount}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  {reconcileData.statistics.alreadyPaidCount} paid • {reconcileData.statistics.unmatchedCount} unmatched
                </div>
              </div>
            </div>

            {/* Filter Tabs & Search Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
              <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 text-xs w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => {
                    setStatusFilter("ALL");
                    setCurrentPage(1);
                  }}
                  className={`px-3 py-1 rounded-lg font-semibold transition cursor-pointer ${
                    statusFilter === "ALL"
                      ? "bg-white text-slate-900 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  All ({reconcileData.statistics.totalRows})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStatusFilter("READY");
                    setCurrentPage(1);
                  }}
                  className={`px-3 py-1 rounded-lg font-semibold transition cursor-pointer ${
                    statusFilter === "READY"
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "text-emerald-700 hover:text-emerald-900"
                  }`}
                >
                  Ready ({reconcileData.statistics.readyToPayCount})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStatusFilter("PAID");
                    setCurrentPage(1);
                  }}
                  className={`px-3 py-1 rounded-lg font-semibold transition cursor-pointer ${
                    statusFilter === "PAID"
                      ? "bg-blue-600 text-white shadow-xs"
                      : "text-blue-700 hover:text-blue-900"
                  }`}
                >
                  Already Paid ({reconcileData.statistics.alreadyPaidCount})
                </button>
                {reconcileData.statistics.unmatchedCount > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setStatusFilter("UNMATCHED");
                      setCurrentPage(1);
                    }}
                    className={`px-3 py-1 rounded-lg font-semibold transition cursor-pointer ${
                      statusFilter === "UNMATCHED"
                        ? "bg-red-600 text-white shadow-xs"
                        : "text-red-700 hover:text-red-900"
                    }`}
                  >
                    Unmatched ({reconcileData.statistics.unmatchedCount})
                  </button>
                )}
              </div>

              {/* Search Box */}
              <div className="relative w-full sm:w-64">
                <Search
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  placeholder="Search policy or customer..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-white py-1.5 pl-8 pr-3 text-xs text-slate-800 outline-none focus:border-[#1877F2]"
                />
              </div>
            </div>

            {/* Reconciliation Table Preview */}
            <div className="flex-1 overflow-auto rounded-xl border border-slate-200 min-h-[260px] max-h-[360px]">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold sticky top-0 z-10 border-b border-slate-200">
                  <tr>
                    <th className="py-2 px-3">#</th>
                    <th className="py-2 px-3">Customer / PH Name</th>
                    <th className="py-2 px-3">Policy No</th>
                    <th className="py-2 px-3">Plan-Term</th>
                    <th className="py-2 px-3">Due Date</th>
                    <th className="py-2 px-3">CBO</th>
                    <th className="py-2 px-3 text-right">Premium (₹)</th>
                    <th className="py-2 px-3 text-right">Commission (₹)</th>
                    <th className="py-2 px-3">Reconciliation Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedRows.map((row) => (
                    <tr
                      key={`${row.policyNumber}-${row.serialNo}`}
                      className="hover:bg-slate-50/80 transition"
                    >
                      <td className="py-2 px-3 text-slate-400">{row.serialNo}</td>
                      <td className="py-2 px-3 font-semibold text-slate-900">
                        {row.customerName ? (
                          <div className="flex items-center gap-1.5">
                            <span>{row.customerName}</span>
                            <span className="text-[10px] text-slate-400 font-normal">
                              ({row.policyHolderName})
                            </span>
                          </div>
                        ) : (
                          <span className="text-amber-700">{row.policyHolderName}</span>
                        )}
                      </td>
                      <td className="py-2 px-3 font-mono font-bold text-slate-700">
                        {row.policyNumber}
                      </td>
                      <td className="py-2 px-3 text-slate-600">
                        {row.plan}-{row.term}
                      </td>
                      <td className="py-2 px-3 text-slate-600">{row.dueDate}</td>
                      <td className="py-2 px-3 text-slate-600">{row.cbo}</td>
                      <td className="py-2 px-3 text-right font-medium text-slate-900">
                        ₹{row.premium.toLocaleString("en-IN")}
                      </td>
                      <td className="py-2 px-3 text-right font-semibold text-emerald-700">
                        ₹{row.commission.toLocaleString("en-IN")}
                      </td>
                      <td className="py-2 px-3">
                        {row.status === "MATCHED_UNPAID" ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            <CheckCircle2 size={10} />
                            Ready to Pay
                          </span>
                        ) : row.status === "PAYMENT_NOT_FOUND" ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-300">
                            <CheckCircle2 size={10} />
                            Create &amp; Pay
                          </span>
                        ) : row.status === "MATCHED_ALREADY_PAID" ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-300">
                            <Clock size={10} />
                            Already Paid
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800 border border-red-300">
                            <AlertTriangle size={10} />
                            Policy Not Found
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {paginatedRows.length === 0 && (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-400">
                        No rows found matching the current search / filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
              <span>
                Showing {filteredRows.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} to{" "}
                {Math.min(currentPage * pageSize, filteredRows.length)} of {filteredRows.length} records
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-1 rounded-lg border border-slate-200 text-slate-600 disabled:opacity-40 hover:bg-slate-50 transition cursor-pointer"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="font-semibold text-slate-700">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-1 rounded-lg border border-slate-200 text-slate-600 disabled:opacity-40 hover:bg-slate-50 transition cursor-pointer"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>

            {/* Preview Action Buttons */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setStep("UPLOAD")}
                disabled={isApplying}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                <ArrowLeft size={14} />
                <span>Change File or Period</span>
              </button>

              <button
                type="button"
                onClick={handleApplyPayments}
                disabled={isApplying || reconcileData.statistics.readyToPayCount === 0}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs font-semibold shadow-md shadow-emerald-500/20 hover:opacity-95 disabled:opacity-50 transition cursor-pointer"
              >
                {isApplying ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>Applying Payments to Database...</span>
                  </>
                ) : (
                  <>
                    <span>Confirm &amp; Apply {reconcileData.statistics.readyToPayCount} Payments</span>
                    <CheckCircle2 size={14} />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 3: SUCCESS SUMMARY                                                   */}
        {/* ========================================================================= */}
        {step === "SUCCESS" && appliedResult && (
          <div className="p-8 space-y-6 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 shadow-md shadow-emerald-500/20">
              <CheckCircle2 size={36} />
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-bold text-slate-900">
                Statement Successfully Processed &amp; Reconciled!
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Commission bill <strong>{appliedResult.data?.billNumber || billNumber}</strong> has been generated and archived in the ledger.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3 max-w-lg mx-auto text-left">
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 text-center">
                <span className="text-[11px] text-slate-500">Payments Marked PAID</span>
                <div className="text-lg font-bold text-emerald-600 mt-0.5">
                  {appliedResult.data?.appliedCount ?? reconcileData?.statistics.readyToPayCount}
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 text-center">
                <span className="text-[11px] text-slate-500">Commission Ledgers</span>
                <div className="text-lg font-bold text-blue-600 mt-0.5">
                  {appliedResult.data?.recordsCreated ?? reconcileData?.statistics.totalRows}
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 text-center">
                <span className="text-[11px] text-slate-500">Gross Commission</span>
                <div className="text-lg font-bold text-slate-900 mt-0.5">
                  ₹{Number(appliedResult.data?.grossCommission || reconcileData?.totals.calculatedTotalCommission || 0).toLocaleString("en-IN")}
                </div>
              </div>
            </div>

            <div className="pt-4 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onSuccess(appliedResult.data?.billId);
                }}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#1877F2] to-[#2563eb] text-white text-xs font-semibold shadow-md shadow-blue-500/20 hover:opacity-95 transition cursor-pointer"
              >
                Done &amp; View Ledger
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
