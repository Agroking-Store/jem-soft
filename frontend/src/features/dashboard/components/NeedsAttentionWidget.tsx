"use client";

import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Clock,
  Landmark,
  ArrowRight,
  CheckCircle2,
  ShieldAlert,
} from "lucide-react";

interface NeedsAttentionWidgetProps {
  pendingClaimsCount: number;
  pendingClaimsAmount: number;
  outstandingPremiumsCount: number;
  activeLoansCount: number;
  isLoading?: boolean;
}

export default function NeedsAttentionWidget({
  pendingClaimsCount,
  pendingClaimsAmount,
  outstandingPremiumsCount,
  activeLoansCount,
  isLoading = false,
}: NeedsAttentionWidgetProps) {
  const router = useRouter();

  const totalUrgent =
    pendingClaimsCount + (outstandingPremiumsCount > 0 ? 1 : 0) + (activeLoansCount > 0 ? 1 : 0);

  const formattedPendingAmount =
    pendingClaimsAmount > 0
      ? `₹${Number(pendingClaimsAmount).toLocaleString("en-IN")}`
      : "—";

  return (
    <div className="mb-8">
      {/* Widget Header */}
      <div className="flex items-center justify-between mb-3.5">
        <div className="flex items-center gap-2.5">
          <span className="flex h-2.5 w-2.5 relative">
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                totalUrgent > 0 ? "bg-rose-400" : "bg-emerald-400"
              }`}
            />
            <span
              className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                totalUrgent > 0 ? "bg-rose-500" : "bg-emerald-500"
              }`}
            />
          </span>
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Needs Immediate Attention
          </h2>
          <span
            className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
              totalUrgent > 0
                ? "bg-rose-100 text-rose-700"
                : "bg-emerald-100 text-emerald-700"
            }`}
          >
            {totalUrgent > 0
              ? `${pendingClaimsCount + outstandingPremiumsCount} Action Items`
              : "All Clear"}
          </span>
        </div>
        <span className="text-xs text-slate-400 hidden sm:inline font-medium">
          Priority follow-ups & operational alerts
        </span>
      </div>

      {/* 3-Column Split Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Pending Claims */}
        <div
          onClick={() => router.push("/dashboard/claims")}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              router.push("/dashboard/claims");
            }
          }}
          className={`group relative overflow-hidden rounded-2xl border bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md cursor-pointer ${
            pendingClaimsCount > 0
              ? "border-rose-200/90 hover:border-rose-400"
              : "border-slate-200 hover:border-slate-300"
          }`}
        >
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 to-amber-500" />
          <div className="flex items-center justify-between">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-50 text-rose-600 transition-transform group-hover:scale-110">
              <ShieldAlert size={22} />
            </div>
            <span
              className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                pendingClaimsCount > 0
                  ? "bg-rose-100 text-rose-700"
                  : "bg-emerald-50 text-emerald-700 border border-emerald-200"
              }`}
            >
              {pendingClaimsCount > 0 ? "Review Needed" : "Up to date"}
            </span>
          </div>

          <div className="mt-3.5">
            <p className="text-2xl font-bold text-slate-900">
              {isLoading ? "…" : pendingClaimsCount}
              <span className="text-sm font-semibold text-slate-500 ml-1.5 font-normal">
                {pendingClaimsCount === 1 ? "Claim" : "Claims"}
              </span>
            </p>
            <p className="text-xs font-semibold text-rose-600 mt-0.5">
              {pendingClaimsCount > 0
                ? "Awaiting Settlement Review"
                : "No pending claims"}
            </p>
            <p className="text-xs text-slate-500 mt-1 line-clamp-2">
              {pendingClaimsCount > 0
                ? `Total pending value: ${formattedPendingAmount}. Verification & approval required.`
                : "All submitted customer claims are settled or approved."}
            </p>
          </div>

          <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-rose-600 group-hover:text-rose-700">
            <span>Review Claims</span>
            <ArrowRight size={13} className="transition-transform group-hover:translate-x-1" />
          </div>
        </div>

        {/* Card 2: Upcoming & Outstanding Premiums */}
        <div
          onClick={() => router.push("/dashboard/policy-360/outstanding")}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              router.push("/dashboard/policy-360/outstanding");
            }
          }}
          className={`group relative overflow-hidden rounded-2xl border bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md cursor-pointer ${
            outstandingPremiumsCount > 0
              ? "border-amber-200/90 hover:border-amber-400"
              : "border-slate-200 hover:border-slate-300"
          }`}
        >
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-orange-500" />
          <div className="flex items-center justify-between">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600 transition-transform group-hover:scale-110">
              <Clock size={22} />
            </div>
            <span
              className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                outstandingPremiumsCount > 0
                  ? "bg-amber-100 text-amber-800"
                  : "bg-emerald-50 text-emerald-700 border border-emerald-200"
              }`}
            >
              {outstandingPremiumsCount > 0 ? "Grace Expiring" : "Healthy"}
            </span>
          </div>

          <div className="mt-3.5">
            <p className="text-2xl font-bold text-slate-900">
              {isLoading ? "…" : outstandingPremiumsCount}
              <span className="text-sm font-semibold text-slate-500 ml-1.5 font-normal">
                {outstandingPremiumsCount === 1 ? "Policy" : "Policies"}
              </span>
            </p>
            <p className="text-xs font-semibold text-amber-700 mt-0.5">
              {outstandingPremiumsCount > 0
                ? "Grace Periods Expiring Soon"
                : "No overdue premiums"}
            </p>
            <p className="text-xs text-slate-500 mt-1 line-clamp-2">
              {outstandingPremiumsCount > 0
                ? "Renewal grace periods ending. Send customer payment reminders to prevent lapse."
                : "All active policy premium installments are currently up to date."}
            </p>
          </div>

          <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-amber-700 group-hover:text-amber-800">
            <span>View Outstanding Premiums</span>
            <ArrowRight size={13} className="transition-transform group-hover:translate-x-1" />
          </div>
        </div>

        {/* Card 3: Overdue Loan Repayments */}
        <div
          onClick={() => router.push("/dashboard/loans/repay")}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              router.push("/dashboard/loans/repay");
            }
          }}
          className={`group relative overflow-hidden rounded-2xl border bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md cursor-pointer ${
            activeLoansCount > 0
              ? "border-blue-200/90 hover:border-blue-400"
              : "border-slate-200 hover:border-slate-300"
          }`}
        >
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 to-indigo-600" />
          <div className="flex items-center justify-between">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-[#2563eb] transition-transform group-hover:scale-110">
              <Landmark size={22} />
            </div>
            <span
              className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                activeLoansCount > 0
                  ? "bg-blue-100 text-blue-800"
                  : "bg-emerald-50 text-emerald-700 border border-emerald-200"
              }`}
            >
              {activeLoansCount > 0 ? "Installments Due" : "Settled"}
            </span>
          </div>

          <div className="mt-3.5">
            <p className="text-2xl font-bold text-slate-900">
              {isLoading ? "…" : activeLoansCount}
              <span className="text-sm font-semibold text-slate-500 ml-1.5 font-normal">
                {activeLoansCount === 1 ? "Active Loan" : "Active Loans"}
              </span>
            </p>
            <p className="text-xs font-semibold text-blue-700 mt-0.5">
              {activeLoansCount > 0
                ? "Installments & Repayments Due"
                : "No active loans pending"}
            </p>
            <p className="text-xs text-slate-500 mt-1 line-clamp-2">
              {activeLoansCount > 0
                ? "Borrowers with repayment schedules active. Record collections or view ledger."
                : "All loan accounts are currently settled or fully recovered."}
            </p>
          </div>

          <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-blue-600 group-hover:text-blue-700">
            <span>Record & View Repayments</span>
            <ArrowRight size={13} className="transition-transform group-hover:translate-x-1" />
          </div>
        </div>
      </div>
    </div>
  );
}
