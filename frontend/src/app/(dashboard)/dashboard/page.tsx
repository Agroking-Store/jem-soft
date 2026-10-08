"use client";

import { useAuth } from "@/features/auth/hooks/useAuth";
import Link from "next/link";
import { ArrowRight, CalendarDays, CircleDollarSign, FileCheck2, UsersRound } from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import { useSelector, useDispatch } from "react-redux";
import type { RootState, AppDispatch } from "@/store/store";
import { fetchPolicies } from "@/features/policy/policySlice";
import { fetchCustomersMaster } from "@/features/customers/customerMasterSlice";
import { fetchClaims } from "@/features/claim/claimSlice";
import { fetchLoans } from "@/features/loans/loanSlice";
import { fetchOutstandingPremiums } from "@/features/policy360/outstandingPremiumSlice";
import { fetchPremiumPayments } from "@/features/premiumPayments/premiumPaymentSlice";
import { getUpcomingCelebrationsApi } from "@/features/marketing/services/marketingApi";
import DashboardInstantLookup from "@/features/dashboard/components/DashboardInstantLookup";
import NeedsAttentionWidget from "@/features/dashboard/components/NeedsAttentionWidget";

const statCardStyles = [
  { icon: UsersRound, iconClass: "bg-blue-50 text-blue-700", valueClass: "text-blue-700" },
  { icon: FileCheck2, iconClass: "bg-violet-50 text-violet-700", valueClass: "text-violet-700" },
  { icon: CircleDollarSign, iconClass: "bg-emerald-50 text-emerald-700", valueClass: "text-emerald-700" },
  { icon: CalendarDays, iconClass: "bg-amber-50 text-amber-700", valueClass: "text-amber-700" },
];

export default function DashboardPage() {
  const { user, isLoading: authLoading } = useAuth();
  const dispatch = useDispatch<AppDispatch>();
  const [isMounted, setIsMounted] = useState(false);
  const [apiCelebrationsCount, setApiCelebrationsCount] = useState<number | null>(null);

  const { policies, isLoading: isLoadingPolicies } = useSelector(
    (state: RootState) => state.policies
  );
  const { customers: masterCustomers, isLoading: isLoadingMasterCustomers } = useSelector(
    (state: RootState) => state.customerMaster
  );

  const { loans, isLoading: isLoadingLoans } = useSelector(
    (state: RootState) => state.loans
  );
  const { claims, isLoading: isLoadingClaims } = useSelector(
    (state: RootState) => state.claims
  );
  const { outstandingPremiums, isLoading: isLoadingOutstanding } = useSelector(
    (state: RootState) => state.outstandingPremiums
  );
  const { payments, isLoading: isLoadingPayments } = useSelector(
    (state: RootState) => state.premiumPayments
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsMounted(true);

    dispatch(fetchPolicies());
    dispatch(fetchCustomersMaster());
    dispatch(fetchLoans());
    dispatch(fetchClaims());
    dispatch(fetchOutstandingPremiums());
    dispatch(fetchPremiumPayments());

    // Fetch celebrations from API (within next 7 days)
    getUpcomingCelebrationsApi(7)
      .then((res) => {
        if (res?.success && Array.isArray(res.data)) {
          setApiCelebrationsCount(res.data.length);
        }
      })
      .catch(() => {
        // Fallback will use client-side calculation from masterCustomers
      });
  }, [dispatch]);

  const totalPremiumAmount = useMemo(() => {
    const paidSum = payments.reduce(
      (sum, p) => sum + Number(p.premiumAmount || 0),
      0
    );
    if (paidSum > 0) return `₹${Number(paidSum).toLocaleString("en-IN")}`;
    // Fallback: sum of policy installment premiums
    const policySum = policies.reduce(
      (sum, p) => sum + Number(p.premium?.installmentPremium || 0),
      0
    );
    if (policySum > 0) return `₹${Number(policySum).toLocaleString("en-IN")}`;
    return payments.length > 0 ? String(payments.length) : "₹0";
  }, [payments, policies]);

  // Compute birthdays & anniversaries occurring this week (next 7 days) from masterCustomers
  const celebrationsThisWeek = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const currentYear = today.getFullYear();
    let count = 0;

    masterCustomers.forEach((cm) => {
      // 1. Birthday Check
      const bdayStr = cm.miscInfo?.dobForGreetings || cm.dob;
      if (bdayStr) {
        const bday = new Date(bdayStr);
        if (!isNaN(bday.getTime())) {
          let nextDate = new Date(currentYear, bday.getMonth(), bday.getDate());
          nextDate.setHours(0, 0, 0, 0);
          if (nextDate.getTime() < today.getTime()) {
            nextDate = new Date(currentYear + 1, bday.getMonth(), bday.getDate());
            nextDate.setHours(0, 0, 0, 0);
          }
          const diffDays = Math.round((nextDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          if (diffDays >= 0 && diffDays <= 7) {
            count++;
          }
        }
      }

      // 2. Wedding Anniversary Check
      const annivStr = cm.miscInfo?.marriageDate;
      if (annivStr) {
        const anniv = new Date(annivStr);
        if (!isNaN(anniv.getTime())) {
          let nextDate = new Date(currentYear, anniv.getMonth(), anniv.getDate());
          nextDate.setHours(0, 0, 0, 0);
          if (nextDate.getTime() < today.getTime()) {
            nextDate = new Date(currentYear + 1, anniv.getMonth(), anniv.getDate());
            nextDate.setHours(0, 0, 0, 0);
          }
          const diffDays = Math.round((nextDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          if (diffDays >= 0 && diffDays <= 7) {
            count++;
          }
        }
      }
    });

    return count;
  }, [masterCustomers]);

  const totalCelebrations = apiCelebrationsCount ?? celebrationsThisWeek;

  const statCards = [
    {
      label: "Total Customers",
      value: masterCustomers.length,
      loading: !isMounted || isLoadingMasterCustomers,
      href: "/dashboard/customers",
    },
    {
      label: "Total Policies Issued",
      value: policies.length,
      loading: !isMounted || isLoadingPolicies,
      href: "/dashboard/lic/policies",
    },
    {
      label: "Total Premium Collected",
      value: totalPremiumAmount,
      loading: !isMounted || isLoadingPayments,
      href: "/dashboard/premium-payments",
    },
    {
      label: "Birthdays & Anniversaries",
      value: `${totalCelebrations} This Week`,
      loading: !isMounted || isLoadingMasterCustomers,
      href: "/dashboard/marketing",
    },
  ];

  // Pending claims calculation
  const pendingClaims = useMemo(
    () =>
      claims.filter(
        (c) =>
          c.status?.toLowerCase() === "pending" ||
          c.status?.toLowerCase() === "submitted"
      ),
    [claims]
  );
  const pendingClaimsAmount = useMemo(
    () =>
      pendingClaims.reduce((acc, c) => acc + Number(c.claimAmount || 0), 0),
    [pendingClaims]
  );

  // Upcoming & Outstanding premiums calculation
  const policiesDueSoon = useMemo(() => {
    const now = new Date();
    const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    return policies.filter((p) => {
      if (!p.nextPremiumDueDate) return false;
      const d = new Date(p.nextPremiumDueDate);
      return !isNaN(d.getTime()) && d <= in30Days;
    });
  }, [policies]);

  const outstandingCount = Math.max(
    outstandingPremiums.length,
    policiesDueSoon.length
  );

  // Active loans calculation
  const activeLoans = useMemo(
    () =>
      loans.filter(
        (l) =>
          l.loanStatus?.statusCode?.toUpperCase() === "ACTIVE" ||
          l.loanStatus?.statusName?.toLowerCase() === "active" ||
          (l.summary?.outstandingPrincipal ?? 0) > 0 ||
          Number(l.loanAmount || 0) > 0
      ),
    [loans]
  );

  const isWorkspaceReady =
    isMounted &&
    !isLoadingPolicies &&
    !isLoadingMasterCustomers &&
    !isLoadingLoans &&
    !isLoadingClaims &&
    !isLoadingPayments;
  const isNewWorkspace =
    isWorkspaceReady &&
    policies.length === 0 &&
    masterCustomers.length === 0 &&
    payments.length === 0 &&
    loans.length === 0 &&
    claims.length === 0;

  if (authLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="mb-1 text-2xl font-bold text-slate-900 sm:text-3xl">
          Welcome back, {isMounted ? user?.name : "User"}!
        </h1>
        <p className="text-slate-500">
          You are signed in as{" "}
          <span className="font-semibold text-blue-600 capitalize">
            {isMounted ? user?.role?.toLowerCase() : "..."}
          </span>
        </p>
      </div>

      {/* Instant Policy 360 & Customer Spotlight Lookup */}
      <DashboardInstantLookup
        policies={policies}
        customers={masterCustomers}
        isLoading={!isMounted || isLoadingPolicies || isLoadingMasterCustomers}
      />

      {isNewWorkspace && (
        <section
          aria-labelledby="getting-started-heading"
          className="mb-8 rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50 via-white to-white p-5 shadow-sm sm:p-6"
        >
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <p className="mb-1 text-xs font-bold uppercase tracking-[0.16em] text-blue-700">New workspace</p>
              <h2 id="getting-started-heading" className="text-xl font-bold text-slate-900">
                Set up your first customer record
              </h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                Start with a customer group, then add customer details and create a policy when you are ready.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Link
                href="/dashboard/customers"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
              >
                Add a customer group
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
              <Link
                href="/dashboard/lic/policies/new"
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
              >
                Create a policy
              </Link>
            </div>
          </div>
        </section>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        {statCards.map((card, index) => {
          const presentation = statCardStyles[index];
          const Icon = presentation.icon;

          return (
            <Link
              key={card.label}
              href={card.href}
              className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{card.label}</p>
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${presentation.iconClass}`}>
                  <Icon size={18} aria-hidden="true" />
                </span>
              </div>
              <p className={`mt-4 text-2xl font-bold ${presentation.valueClass}`}>
              {card.loading ? "…" : card.value}
              </p>
              <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-slate-500 transition-colors group-hover:text-slate-700">
                View details <ArrowRight size={13} aria-hidden="true" />
              </span>
            </Link>
          );
        })}
      </div>

      {/* Needs Immediate Attention Alert Widget */}
      <NeedsAttentionWidget
        pendingClaimsCount={pendingClaims.length}
        pendingClaimsAmount={pendingClaimsAmount}
        outstandingPremiumsCount={outstandingCount}
        activeLoansCount={activeLoans.length}
        isLoading={!isMounted || isLoadingClaims || isLoadingOutstanding}
      />
    </div>
  );
}
