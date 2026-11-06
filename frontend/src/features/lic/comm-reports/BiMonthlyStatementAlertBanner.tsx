"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Upload,
  CheckCircle2,
  Calendar,
  FileText,
  Clock,
  ChevronDown,
  ChevronUp,
  Info,
  ExternalLink,
  History,
  Sliders,
  Sparkles,
  Layers,
} from "lucide-react";
import {
  FortnightCycle,
  getBiMonthlyCycles,
  getBiMonthlyCyclesForMonth,
  createMonthlyCycle,
  createFortnightCycle,
  MONTH_NAMES,
  getLastDayOfMonth,
} from "./fortnightTracker";

interface BiMonthlyStatementAlertBannerProps {
  bills: any[];
  onOpenUploadModal: (cycle?: FortnightCycle) => void;
}

export default function BiMonthlyStatementAlertBanner({
  bills,
  onOpenUploadModal,
}: BiMonthlyStatementAlertBannerProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  // Period Navigation Filters (Support back-dating to any month/year)
  const [filterYear, setFilterYear] = useState<number>(new Date().getFullYear());
  const [filterMonth, setFilterMonth] = useState<string>("recent"); // "recent" | "0".."11"
  const [cycleDisplayMode, setCycleDisplayMode] = useState<"fortnight" | "monthly" | "uploaded">("fortnight");

  // Base recent fortnights for alerts
  const { cycles: recentCycles, missingCycles, latestPendingCycle, hasPendingStatements } = useMemo(() => {
    return getBiMonthlyCycles(bills, 4);
  }, [bills]);

  // Compute displayed cycles based on back-dating filter and cycleDisplayMode
  const displayedCycles = useMemo(() => {
    if (cycleDisplayMode === "monthly") {
      if (filterMonth === "recent") {
        const now = new Date();
        const currentMonth = now.getMonth();
        const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
        const prevYear = currentMonth === 0 ? now.getFullYear() - 1 : now.getFullYear();
        return [
          createMonthlyCycle(now.getFullYear(), currentMonth, bills),
          createMonthlyCycle(prevYear, prevMonth, bills),
        ];
      }
      return [createMonthlyCycle(filterYear, Number(filterMonth), bills)];
    }

    if (filterMonth === "recent") {
      return recentCycles;
    }
    const monthIndex = Number(filterMonth);
    return getBiMonthlyCyclesForMonth(filterYear, monthIndex, bills);
  }, [filterMonth, filterYear, cycleDisplayMode, recentCycles, bills]);

  const yearOptions = [2027, 2026, 2025, 2024, 2023, 2022, 2021, 2020];

  // Helper to open modal for a custom 15-day period
  const handleOpenCustom15Days = () => {
    const now = new Date();
    const yr = filterMonth === "recent" ? now.getFullYear() : filterYear;
    const mo = filterMonth === "recent" ? now.getMonth() : Number(filterMonth);
    const lastDay = getLastDayOfMonth(yr, mo);
    const startDate = new Date(yr, mo, 1);
    const endDate = new Date(yr, mo, Math.min(15, lastDay));

    const customCycle: FortnightCycle = {
      id: `${yr}-${String(mo + 1).padStart(2, "0")}-CUSTOM`,
      year: yr,
      month: mo,
      monthName: MONTH_NAMES[mo],
      fortnight: 1,
      cycleType: "custom",
      cycleLabel: "15-Day Cycle",
      title: `${MONTH_NAMES[mo]} ${yr} – Custom 15-Day Cycle`,
      shortLabel: `${MONTH_NAMES[mo].slice(0, 3)} ${yr} (15 Days)`,
      periodLabel: `01 ${MONTH_NAMES[mo].slice(0, 3)} – 15 ${MONTH_NAMES[mo].slice(0, 3)} ${yr}`,
      startDate,
      endDate,
      dueDate: new Date(yr, mo, 16),
      isCompletedPeriod: endDate < now,
      isCurrentCycle: true,
      isUploaded: false,
    };

    onOpenUploadModal(customCycle);
  };

  return (
    <div className="rounded-2xl border-2 border-blue-200 bg-gradient-to-br from-blue-50/70 via-indigo-50/30 to-white p-5 shadow-sm space-y-4">
      {/* Alert Header Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-b from-[#1877F2] to-blue-700 text-white shadow-md shadow-blue-500/25">
            <Clock size={22} />
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 border border-blue-300/80 px-2.5 py-0.5 text-[11px] font-bold text-blue-900">
                <Sliders size={11} className="text-blue-700" />
                Flexible Cycle Statement Tracking
              </span>
              {hasPendingStatements && (
                <span className="inline-flex items-center rounded-full bg-amber-100 border border-amber-300 px-2.5 py-0.5 text-[11px] font-extrabold text-amber-800">
                  {missingCycles.length} Recent Cycle{missingCycles.length > 1 ? "s" : ""} Pending
                </span>
              )}
            </div>

            <h2 className="text-base sm:text-lg font-bold text-slate-900 mt-1">
              LIC Commission Statement PDF Upload &amp; History
            </h2>

            <p className="text-xs text-slate-600 mt-0.5 leading-relaxed max-w-2xl">
              Track and upload statements by <strong>Standard Cycles (Cycle 1 &amp; 2)</strong>, <strong>Full Month</strong>, or any <strong>flexible 15-day custom date range</strong>. You can freely edit the month, cycle, and dates when uploading.
            </p>
          </div>
        </div>

        {/* Upload Buttons Call to Action */}
        <div className="flex flex-wrap items-center gap-2 self-start md:self-center shrink-0">
          <button
            type="button"
            onClick={handleOpenCustom15Days}
            className="inline-flex items-center gap-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white px-3.5 py-2.5 rounded-xl text-xs font-bold shadow-md shadow-emerald-500/20 transition cursor-pointer"
          >
            <Sparkles size={14} />
            <span>+ Upload 15-Day / Custom Cycle</span>
          </button>

          <button
            type="button"
            onClick={() => onOpenUploadModal()}
            className="inline-flex items-center gap-1.5 bg-[#1877F2] hover:bg-blue-600 text-white px-3.5 py-2.5 rounded-xl text-xs font-bold shadow-sm transition cursor-pointer"
          >
            <Upload size={14} />
            <span>Upload Statement PDF</span>
          </button>

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            title="Toggle Statement Timeline"
            className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-3 py-2.5 rounded-xl hover:bg-slate-50 transition cursor-pointer"
          >
            <span>{isExpanded ? "Collapse" : "Explore Cycles"}</span>
            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>

      {/* Flexible Timeline & Cycle Navigation Bar */}
      {isExpanded && (
        <div className="pt-3 border-t border-blue-200/60 space-y-3">
          {/* Cycle View Mode Tabs & Month/Year Selector */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white/95 p-2.5 rounded-xl border border-blue-100 shadow-2xs">
            {/* View Mode Buttons */}
            <div className="flex items-center gap-1.5 p-1 rounded-lg bg-slate-100 text-xs">
              <button
                type="button"
                onClick={() => setCycleDisplayMode("fortnight")}
                className={`px-3 py-1 rounded-md font-semibold transition cursor-pointer text-[11px] ${
                  cycleDisplayMode === "fortnight"
                    ? "bg-white text-blue-700 shadow-2xs font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Standard Cycles (1 &amp; 2)
              </button>
              <button
                type="button"
                onClick={() => setCycleDisplayMode("monthly")}
                className={`px-3 py-1 rounded-md font-semibold transition cursor-pointer text-[11px] ${
                  cycleDisplayMode === "monthly"
                    ? "bg-white text-blue-700 shadow-2xs font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Full Month View
              </button>
              <button
                type="button"
                onClick={() => setCycleDisplayMode("uploaded")}
                className={`px-3 py-1 rounded-md font-semibold transition cursor-pointer text-[11px] ${
                  cycleDisplayMode === "uploaded"
                    ? "bg-white text-blue-700 shadow-2xs font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Uploaded Statements ({bills?.length || 0})
              </button>
            </div>

            {/* Year & Month Filters */}
            {cycleDisplayMode !== "uploaded" && (
              <div className="flex flex-wrap items-center gap-2 text-xs">
                {/* Year Select */}
                <div className="flex items-center gap-1">
                  <span className="text-slate-500 font-medium">Year:</span>
                  <select
                    value={filterYear}
                    onChange={(e) => setFilterYear(Number(e.target.value))}
                    className="rounded-lg border border-slate-200 bg-white py-1 px-2.5 text-xs font-semibold text-slate-800 outline-none focus:border-[#1877F2]"
                  >
                    {yearOptions.map((yr) => (
                      <option key={yr} value={yr}>
                        {yr}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Month Select */}
                <div className="flex items-center gap-1">
                  <span className="text-slate-500 font-medium">Month:</span>
                  <select
                    value={filterMonth}
                    onChange={(e) => setFilterMonth(e.target.value)}
                    className="rounded-lg border border-slate-200 bg-white py-1 px-2.5 text-xs font-semibold text-slate-800 outline-none focus:border-[#1877F2]"
                  >
                    <option value="recent">Recent Active Cycles</option>
                    {MONTH_NAMES.map((mName, idx) => (
                      <option key={mName} value={String(idx)}>
                        {mName}
                      </option>
                    ))}
                  </select>
                </div>

                {filterMonth !== "recent" && (
                  <button
                    type="button"
                    onClick={() => setFilterMonth("recent")}
                    className="text-[11px] text-[#1877F2] hover:underline font-semibold ml-1 cursor-pointer"
                  >
                    Reset
                  </button>
                )}
              </div>
            )}
          </div>

          {/* VIEW MODE 1 & 2: Standard Fortnights or Monthly Cycles */}
          {cycleDisplayMode !== "uploaded" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {displayedCycles.map((c) => {
                const isUrgent = latestPendingCycle?.id === c.id;

                return (
                  <div
                    key={c.id}
                    className={`relative rounded-xl p-3 border text-xs transition ${
                      c.isUploaded
                        ? "bg-white border-emerald-200 shadow-2xs"
                        : isUrgent
                        ? "bg-amber-50/80 border-amber-400 ring-2 ring-amber-400/20"
                        : "bg-white/90 border-slate-200 shadow-2xs"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 mb-1.5">
                      <span className="font-bold text-slate-800 text-[11px]">
                        {c.monthName.slice(0, 3)} {c.year} • {c.cycleLabel || `Cycle ${c.fortnight}`}
                      </span>

                      {c.isUploaded ? (
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-md border border-emerald-200">
                          <CheckCircle2 size={10} />
                          Uploaded
                        </span>
                      ) : c.isCurrentCycle ? (
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded-md border border-blue-200">
                          <Clock size={10} />
                          In Progress
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-md border border-slate-200">
                          Pending
                        </span>
                      )}
                    </div>

                    <div className="text-[11px] text-slate-500 font-medium">
                      {c.periodLabel}
                    </div>

                    {/* Subtext & Action */}
                    <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between">
                      {c.isUploaded ? (
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-600 truncate">
                          <FileText size={11} className="text-emerald-600 shrink-0" />
                          <span className="truncate">{c.uploadedBill?.billNumber}</span>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onOpenUploadModal(c)}
                          className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-lg transition cursor-pointer ${
                            isUrgent
                              ? "bg-[#1877F2] text-white hover:bg-blue-600 shadow-2xs"
                              : "text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200"
                          }`}
                        >
                          <Upload size={10} />
                          <span>Upload / Edit</span>
                        </button>
                      )}

                      {c.isUploaded && c.uploadedBill?.fileUrl && (
                        <a
                          href={
                            c.uploadedBill.fileUrl.startsWith("http")
                              ? c.uploadedBill.fileUrl
                              : `http://localhost:5000${c.uploadedBill.fileUrl}`
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#1877F2] hover:underline text-[10px] font-bold inline-flex items-center gap-0.5"
                        >
                          <span>View PDF</span>
                          <ExternalLink size={9} />
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* VIEW MODE 3: Uploaded Statements History Cards */}
          {cycleDisplayMode === "uploaded" && (
            <div className="space-y-2">
              {bills && bills.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {bills.map((bill: any) => (
                    <div
                      key={bill.id}
                      className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="font-bold text-xs text-slate-900 truncate">
                          {bill.billNumber}
                        </div>
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                          <CheckCircle2 size={10} />
                          Recorded
                        </span>
                      </div>

                      <div className="text-[11px] text-slate-500">
                        Date: {bill.billDate ? new Date(bill.billDate).toLocaleDateString("en-IN") : "N/A"}
                        {bill.agencyCode && ` • Agency: ${bill.agencyCode}`}
                      </div>

                      <div className="flex items-center justify-between text-xs pt-1.5 border-t border-slate-100">
                        <div>
                          <span className="text-[10px] text-slate-400">Commission: </span>
                          <span className="font-bold text-emerald-700">
                            ₹{Number(bill.grossCommission || 0).toLocaleString("en-IN")}
                          </span>
                        </div>
                        {bill.fileUrl && (
                          <a
                            href={
                              bill.fileUrl.startsWith("http")
                                ? bill.fileUrl
                                : `http://localhost:5000${bill.fileUrl}`
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#1877F2] hover:underline text-[11px] font-bold inline-flex items-center gap-0.5"
                          >
                            <span>View PDF</span>
                            <ExternalLink size={10} />
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center text-xs text-slate-400 bg-white rounded-xl border border-slate-200">
                  No statements uploaded yet. Click &quot;Upload Statement PDF&quot; or &quot;+ Upload 15-Day / Custom Cycle&quot; above to get started!
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
