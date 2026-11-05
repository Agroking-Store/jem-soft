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
} from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch, RootState } from "@/store/store";
import {
  fetchCommissionBills,
  reconcileCommissionStatement,
  applyCommissionStatementPayments,
} from "../commissionSlice";
import toast from "react-hot-toast";
import { FortnightCycle, getLastDayOfMonth } from "./fortnightTracker";

interface UploadCommissionBillModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (billId?: string) => void;
  initialCycle?: FortnightCycle | null;
}

export type ModalWizardStep = "UPLOAD" | "PREVIEW" | "SUCCESS";

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

  // Step 1: Form controls
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [fortnightCycle, setFortnightCycle] = useState<1 | 2>(
    new Date().getDate() <= 15 ? 1 : 2
  );
  const [billNumber, setBillNumber] = useState<string>("");
  const [billDate, setBillDate] = useState<string>("");
  const [selectedAgencyId, setSelectedAgencyId] = useState<string>("");
  const [billType, setBillType] = useState<"consolidated" | "agent-wise">("consolidated");

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

  useEffect(() => {
    if (initialCycle) {
      setSelectedYear(initialCycle.year);
      setSelectedMonth(initialCycle.month);
      setFortnightCycle(initialCycle.fortnight);
      const year = initialCycle.year;
      const monthStr = String(initialCycle.month + 1).padStart(2, "0");
      setBillNumber(`LIC-${year}/${monthStr}/F${initialCycle.fortnight}`);
      const endYear = initialCycle.endDate.getFullYear();
      const endMonth = String(initialCycle.endDate.getMonth() + 1).padStart(2, "0");
      const endDay = String(initialCycle.endDate.getDate()).padStart(2, "0");
      setBillDate(`${endYear}-${endMonth}-${endDay}`);
    } else if (isOpen) {
      const now = new Date();
      const isF1 = now.getDate() <= 15;
      const yr = now.getFullYear();
      const mo = now.getMonth();
      const cyc = isF1 ? 1 : 2;
      setSelectedYear(yr);
      setSelectedMonth(mo);
      setFortnightCycle(cyc);
      setBillNumber(`LIC-${yr}/${String(mo + 1).padStart(2, "0")}/F${cyc}`);
      setBillDate(now.toISOString().split("T")[0]);
      setStep("UPLOAD");
      setReconcileData(null);
      setSelectedFile(null);
      setAppliedResult(null);
      setCurrentPage(1);
    }
  }, [initialCycle, isOpen]);

  const updateDateAndBillNumber = (y: number, m: number, c: 1 | 2) => {
    const lastDay = getLastDayOfMonth(y, m);
    const day = c === 1 ? 15 : lastDay;
    const monthStr = String(m + 1).padStart(2, "0");
    const dayStr = String(day).padStart(2, "0");
    setBillDate(`${y}-${monthStr}-${dayStr}`);
    setBillNumber(`LIC-${y}/${monthStr}/F${c}`);
  };

  const handleYearChange = (y: number) => {
    setSelectedYear(y);
    updateDateAndBillNumber(y, selectedMonth, fortnightCycle);
  };

  const handleMonthChange = (m: number) => {
    setSelectedMonth(m);
    updateDateAndBillNumber(selectedYear, m, fortnightCycle);
  };

  const handleCycleChange = (c: 1 | 2) => {
    setFortnightCycle(c);
    updateDateAndBillNumber(selectedYear, selectedMonth, c);
  };

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
        billDate: billDate || new Date().toISOString(),
        agencyId: selectedAgencyId || undefined,
        agencyCode: reconcileData.metadata?.agentCode,
        batch: reconcileData.metadata?.batch,
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
      // Status filter
      if (statusFilter === "READY") {
        if (row.status !== "MATCHED_UNPAID" && row.status !== "PAYMENT_NOT_FOUND") return false;
      } else if (statusFilter === "PAID") {
        if (row.status !== "MATCHED_ALREADY_PAID") return false;
      } else if (statusFilter === "UNMATCHED") {
        if (row.status !== "POLICY_NOT_FOUND") return false;
      }

      // Search query
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
          step === "PREVIEW" ? "max-w-5xl" : "max-w-lg"
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
                  : "Upload the monthly or fortnightly LIC statement PDF to auto-reconcile payments"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* ========================================================================= */}
        {/* STEP 1: UPLOAD & CONFIGURATION FORM                                       */}
        {/* ========================================================================= */}
        {step === "UPLOAD" && (
          <form onSubmit={handleReconcileSubmit} className="p-6 space-y-4 overflow-y-auto">
            {initialCycle && (
              <div className="flex items-center gap-2.5 rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
                <Clock size={16} className="text-amber-700 shrink-0" />
                <div>
                  <span className="font-bold">Uploading for:</span> {initialCycle.title} (
                  {initialCycle.periodLabel})
                </div>
              </div>
            )}

            {/* Statement Period Settings */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3.5 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700 flex items-center gap-1.5">
                  <Calendar size={14} className="text-[#1877F2]" />
                  Statement Period
                </span>
                <span className="text-[11px] text-slate-400 font-medium">Fortnightly / Monthly</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Year</label>
                  <select
                    value={selectedYear}
                    onChange={(e) => handleYearChange(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-200 bg-white py-1.5 px-2.5 text-xs text-slate-800 outline-none focus:border-[#1877F2]"
                  >
                    {[2026, 2025, 2024, 2023, 2022, 2021, 2020].map((yr) => (
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
                    {[
                      "January",
                      "February",
                      "March",
                      "April",
                      "May",
                      "June",
                      "July",
                      "August",
                      "September",
                      "October",
                      "November",
                      "December",
                    ].map((name, idx) => (
                      <option key={name} value={idx}>
                        {name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Cycle</label>
                  <select
                    value={fortnightCycle}
                    onChange={(e) => handleCycleChange(Number(e.target.value) as 1 | 2)}
                    className="w-full rounded-lg border border-slate-200 bg-white py-1.5 px-2.5 text-xs text-slate-800 outline-none focus:border-[#1877F2]"
                  >
                    <option value={1}>1st Half (1st-15th)</option>
                    <option value={2}>2nd Half (16th-End)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Bill Number & Agency */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Bill / Voucher Number
                </label>
                <input
                  type="text"
                  value={billNumber}
                  onChange={(e) => setBillNumber(e.target.value)}
                  placeholder="e.g. LIC-2026/04/F2"
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
                        Drop monthly LIC statement PDF here or{" "}
                        <span className="text-[#1877F2] font-bold">browse</span>
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Accepts official LIC Commission Bill PDFs (100 to 500+ records supported)
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
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
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
                    <span>Extracting & Reconciling...</span>
                  </>
                ) : (
                  <>
                    <span>Analyze & Reconcile Statement</span>
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
                    Branch: {reconcileData.metadata?.branchCode || "N/A"} • Batch:{" "}
                    {reconcileData.metadata?.batch || "N/A"}
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
                  className={`px-3 py-1 rounded-lg font-semibold transition ${
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
                  className={`px-3 py-1 rounded-lg font-semibold transition ${
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
                  className={`px-3 py-1 rounded-lg font-semibold transition ${
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
                    className={`px-3 py-1 rounded-lg font-semibold transition ${
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
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Search policy, name, CBO..."
                  className="w-full rounded-xl border border-slate-200 bg-white py-1.5 pl-8 pr-3 text-xs text-slate-800 outline-none focus:border-[#1877F2]"
                />
              </div>
            </div>

            {/* Paginated Table */}
            <div className="flex-1 overflow-y-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase">
                  <tr>
                    <th className="py-2.5 px-3">#</th>
                    <th className="py-2.5 px-3">Customer & Policy</th>
                    <th className="py-2.5 px-3">Pln/Tm</th>
                    <th className="py-2.5 px-3">Due Date</th>
                    <th className="py-2.5 px-3">Risk Date</th>
                    <th className="py-2.5 px-3">CBO</th>
                    <th className="py-2.5 px-3">Adj Date</th>
                    <th className="py-2.5 px-3 text-right">Premium</th>
                    <th className="py-2.5 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {paginatedRows.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-xs text-slate-400">
                        No rows found matching the current filter.
                      </td>
                    </tr>
                  ) : (
                    paginatedRows.map((row) => (
                      <tr key={`${row.serialNo}-${row.policyNumber}-${row.dueDate}`} className="hover:bg-slate-50/70">
                        <td className="py-2 px-3 font-mono text-[11px] text-slate-400">
                          {row.serialNo}
                        </td>
                        <td className="py-2 px-3">
                          <div className="font-semibold text-slate-900 leading-tight">
                            {row.customerName || row.policyHolderName}
                          </div>
                          <div className="text-[11px] font-mono text-slate-500">
                            {row.policyNumber}
                          </div>
                        </td>
                        <td className="py-2 px-3 font-mono text-[11px]">
                          {row.plan}-{row.term}
                        </td>
                        <td className="py-2 px-3 text-[11px]">{row.dueDate}</td>
                        <td className="py-2 px-3 text-[11px] text-slate-500">{row.riskDate}</td>
                        <td className="py-2 px-3 font-mono text-[11px]">{row.cbo}</td>
                        <td className="py-2 px-3 font-semibold text-slate-800 text-[11px]">
                          {row.adjDate}
                        </td>
                        <td
                          className={`py-2 px-3 text-right font-mono font-semibold text-[11px] ${
                            row.premium < 0 ? "text-red-600" : "text-slate-900"
                          }`}
                        >
                          ₹{row.premium.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-2 px-3">
                          {row.status === "MATCHED_UNPAID" && (
                            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                              Ready to Pay
                            </span>
                          )}
                          {row.status === "MATCHED_ALREADY_PAID" && (
                            <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 border border-blue-200">
                              Already Settled
                            </span>
                          )}
                          {row.status === "PAYMENT_NOT_FOUND" && (
                            <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 border border-amber-200">
                              Will Schedule & Pay
                            </span>
                          )}
                          {row.status === "POLICY_NOT_FOUND" && (
                            <span className="inline-flex items-center gap-1 rounded-md bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-700 border border-red-200">
                              Policy Not Found
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
              <div>
                Showing {(currentPage - 1) * pageSize + 1} to{" "}
                {Math.min(currentPage * pageSize, filteredRows.length)} of {filteredRows.length} rows
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="rounded-lg p-1.5 border border-slate-200 hover:bg-slate-100 disabled:opacity-40 transition"
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
                  className="rounded-lg p-1.5 border border-slate-200 hover:bg-slate-100 disabled:opacity-40 transition"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>

            {/* Action Bar */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setStep("UPLOAD")}
                disabled={isApplying}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
              >
                <ArrowLeft size={14} />
                <span>Upload Another Statement</span>
              </button>

              <button
                type="button"
                onClick={handleApplyPayments}
                disabled={isApplying || reconcileData.statistics.readyToPayCount === 0}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs font-bold shadow-md shadow-emerald-600/20 hover:opacity-95 disabled:opacity-50 transition cursor-pointer"
              >
                {isApplying ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>Applying {reconcileData.statistics.readyToPayCount} Payments...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={16} />
                    <span>
                      Confirm & Apply {reconcileData.statistics.readyToPayCount} Payments to Database
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 3: SUCCESS CONFIRMATION                                              */}
        {/* ========================================================================= */}
        {step === "SUCCESS" && appliedResult && (
          <div className="p-8 text-center space-y-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
              <CheckCircle2 size={36} />
            </div>

            <div>
              <h3 className="text-lg font-bold text-slate-900">
                Statement Reconciled & Payments Applied!
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                All matched customer policies have been updated with their adjustment dates and
                marked as PAID.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3 max-w-md mx-auto text-left rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div>
                <span className="text-[11px] text-slate-500 block">Payments Marked PAID</span>
                <span className="text-base font-bold text-emerald-700">
                  {appliedResult.appliedPaymentsCount}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-slate-500 block">Total Premium Settled</span>
                <span className="text-base font-bold text-slate-900">
                  ₹{appliedResult.totalPremium?.toLocaleString("en-IN")}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-slate-500 block">Commission Earned</span>
                <span className="text-base font-bold text-blue-700">
                  ₹{appliedResult.grossCommission?.toLocaleString("en-IN")}
                </span>
              </div>
            </div>

            <div className="pt-4 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => {
                  onSuccess(appliedResult.billId);
                  onClose();
                }}
                className="px-6 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
