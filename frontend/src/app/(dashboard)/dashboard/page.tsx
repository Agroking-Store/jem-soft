"use client";

import { useAuth } from "@/features/auth/hooks/useAuth";
import { useRouter } from "next/navigation";
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

export default function DashboardPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
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

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

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

  // For ADMIN and ADVISOR - show dashboard
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900 mb-1">
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

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        {statCards.map((card) => (
          <div
            key={card.label}
            onClick={() => router.push(card.href)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                router.push(card.href);
              }
            }}
            className="rounded-xl bg-gradient-to-b from-[#1e3a8a] to-[#2563eb] text-white shadow-lg shadow-blue-200/50 p-5 cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <p className="text-xs font-bold uppercase tracking-wider text-[#E8C77A]">
              {card.label}
            </p>
            <p className="mt-2 text-2xl font-bold text-white">
              {card.loading ? "…" : card.value}
            </p>
          </div>
        ))}
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