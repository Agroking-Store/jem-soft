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
} from "lucide-react";
import {
  FortnightCycle,
  getBiMonthlyCycles,
  getBiMonthlyCyclesForMonth,
  createFortnightCycle,
  MONTH_NAMES,
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

  // Base recent fortnights for alerts
  const { cycles: recentCycles, missingCycles, latestPendingCycle, hasPendingStatements } = useMemo(() => {
    return getBiMonthlyCycles(bills, 4);
  }, [bills]);

  // Compute displayed cycles based on back-dating filter
  const displayedCycles = useMemo(() => {
    if (filterMonth === "recent") {
      return recentCycles;
    }
    const monthIndex = Number(filterMonth);
    return getBiMonthlyCyclesForMonth(filterYear, monthIndex, bills);
  }, [filterMonth, filterYear, recentCycles, bills]);

  const yearOptions = [2026, 2025, 2024, 2023, 2022, 2021, 2020];

  return (
    <div className="rounded-2xl border-2 border-amber-300 bg-gradient-to-br from-amber-50/95 via-orange-50/40 to-white p-5 shadow-sm space-y-4">
      {/* Alert Header Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-b from-amber-500 to-orange-600 text-white shadow-md shadow-amber-500/25">
            <AlertTriangle size={22} />
            <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-red-500"></span>
            </span>
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 border border-amber-300/80 px-2.5 py-0.5 text-[11px] font-bold text-amber-900">
                <Clock size={11} className="text-amber-700" />
                Bi-Monthly Statement Tracking
              </span>
              {hasPendingStatements && (
                <span className="inline-flex items-center rounded-full bg-red-100 border border-red-200 px-2.5 py-0.5 text-[11px] font-extrabold text-red-700 animate-pulse">
                  {missingCycles.length} Recent Statement{missingCycles.length > 1 ? "s" : ""} Pending
                </span>
              )}
            </div>

            <h2 className="text-base sm:text-lg font-bold text-slate-900 mt-1">
              LIC Commission Statement PDF Upload &amp; History
            </h2>

            <p className="text-xs text-slate-600 mt-0.5 leading-relaxed max-w-2xl">
              LIC releases statements twice every month (1st–15th &amp; 16th–End). 
              You can upload PDFs for the current period or <strong>back-date for any past month (e.g. March 2026, December 2025, etc.)</strong>.
            </p>
          </div>
        </div>

        {/* Upload Buttons Call to Action */}
        <div className="flex flex-wrap items-center gap-2.5 self-start md:self-center shrink-0">
          {latestPendingCycle && (
            <button
              type="button"
              onClick={() => onOpenUploadModal(latestPendingCycle)}
              className="inline-flex items-center gap-1.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white px-3.5 py-2.5 rounded-xl text-xs font-bold shadow-md shadow-orange-500/20 transition cursor-pointer"
            >
              <Upload size={14} />
              <span>Upload {latestPendingCycle.shortLabel}</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => onOpenUploadModal()}
            className="inline-flex items-center gap-1.5 bg-[#1877F2] hover:bg-blue-600 text-white px-3.5 py-2.5 rounded-xl text-xs font-bold shadow-sm transition cursor-pointer"
          >
            <History size={14} />
            <span>Upload Any Back-Date Bill</span>
          </button>

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            title="Toggle Fortnight Timeline"
            className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-3 py-2.5 rounded-xl hover:bg-slate-50 transition cursor-pointer"
          >
            <span>{isExpanded ? "Collapse" : "Explore Dates"}</span>
            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>

      {/* Fortnightly Timeline & Back-Date Navigation Bar */}
      {isExpanded && (
        <div className="pt-3 border-t border-amber-200/60 space-y-3">
          {/* Back-Dating Month & Year Selector */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white/90 p-2.5 rounded-xl border border-amber-200/70">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
              <Calendar size={15} className="text-[#1877F2]" />
              <span>Select Period to View / Upload:</span>
            </div>

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
                  <option value="recent">Recent Active Fortnights</option>
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
                  Reset to Recent
                </button>
              )}
            </div>
          </div>

          {/* Cards for the selected period */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {displayedCycles.map((c) => {
              const isMissing = !c.isUploaded;
              const isUrgent = latestPendingCycle?.id === c.id;

              return (
                <div
                  key={c.id}
                  className={`relative rounded-xl p-3 border text-xs transition ${
                    c.isUploaded
                      ? "bg-white border-emerald-200 shadow-2xs"
                      : isUrgent
                      ? "bg-amber-100/70 border-amber-400 ring-2 ring-amber-400/30"
                      : "bg-white/90 border-slate-200 shadow-2xs"
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 mb-1.5">
                    <span className="font-bold text-slate-800 text-[11px]">
                      {c.monthName.slice(0, 3)} {c.year} • {c.fortnight === 1 ? "Cycle 1" : "Cycle 2"}
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
                      <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-red-700 bg-red-50 px-1.5 py-0.5 rounded-md border border-red-200">
                        <AlertTriangle size={10} />
                        Missing
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
                            ? "bg-amber-600 text-white hover:bg-amber-700 shadow-2xs"
                            : "text-amber-800 bg-amber-100 hover:bg-amber-200"
                        }`}
                      >
                        <Upload size={10} />
                        <span>Upload PDF</span>
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
                        <span>View</span>
                        <ExternalLink size={9} />
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
