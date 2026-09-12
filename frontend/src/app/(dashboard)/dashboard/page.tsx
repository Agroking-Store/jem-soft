"use client";

import { useAuth } from "@/features/auth/hooks/useAuth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import type { RootState, AppDispatch } from "@/store/store";
import { fetchPolicies } from "@/features/policy/policySlice";
import { fetchCustomersMaster } from "@/features/customers/customerMasterSlice";
import { fetchClaims } from "@/features/claim/claimSlice";
import {
  Users,
  ShieldPlus,
  Landmark,
  ShieldCheck
} from "lucide-react";
import { fetchLoans } from "@/features/loans/loanSlice";

export default function DashboardPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const [isMounted, setIsMounted] = useState(false);

  const { policies, isLoading: isLoadingPolicies } = useSelector(
    (state: RootState) => state.policies
  );
  const { customers: masterCustomers, isLoading: isLoadingMasterCustomers } = useSelector(
    (state: RootState) => state.customerMaster
  );

  const { loans, isLoading: isLoadingLoans } = useSelector(
    (state: RootState) => state.loans);
  const { claims, isLoading, error } = useSelector(
    (state: RootState) => state.claims
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsMounted(true);

    dispatch(fetchPolicies());
    dispatch(fetchCustomersMaster());
    dispatch(fetchLoans());

    dispatch(fetchClaims());
  }, [dispatch]);


  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // For ADMIN and ADVISOR - show dashboard
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">
          Welcome back, {isMounted ? user?.name : "User"}!
        </h1>
        <p className="text-slate-500">
          You are signed in as{" "}
          <span className="font-semibold text-blue-600 capitalize">
            {isMounted ? user?.role?.toLowerCase() : "..."}
          </span>
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div
          className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow cursor-pointer relative overflow-hidden group"
          onClick={() => router.push("/dashboard/customers")}
          role="button"
        >
          <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#1877F2] via-[#1877F2]/40 to-transparent" />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-500">Total Customers</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                {!isMounted || isLoadingMasterCustomers ? (
                  <span className="inline-block w-16 h-8 bg-slate-200 animate-pulse rounded"></span>
                ) : (
                  masterCustomers.length
                )}
              </p>
            </div>
            <div className="flex shrink-0 w-12 h-12 items-center justify-center bg-blue-50 text-[#1877F2] rounded-xl group-hover:bg-[#1877F2] group-hover:text-white transition-colors">
              <Users className="w-6 h-6" />
            </div>
          </div>
        </div>

        <div
          className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow cursor-pointer relative overflow-hidden group"
          onClick={() => router.push("/dashboard/lic/policies")}
          role="button"
        >
          <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#1877F2] via-[#1877F2]/40 to-transparent" />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-500">Total Policies Issued</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                {!isMounted || isLoadingPolicies ? (
                  <span className="inline-block w-16 h-8 bg-slate-200 animate-pulse rounded"></span>
                ) : (
                  policies.length
                )}
              </p>
            </div>
            <div className="flex shrink-0 w-12 h-12 items-center justify-center bg-blue-50 text-[#1877F2] rounded-xl group-hover:bg-[#1877F2] group-hover:text-white transition-colors">
              <ShieldPlus className="w-6 h-6" />
            </div>
          </div>
        </div>

        <div
          className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow cursor-pointer relative overflow-hidden group"
          onClick={() => router.push("/dashboard/loans")}
          role="button"
        >
          <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#1877F2] via-[#1877F2]/40 to-transparent" />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-500">
                Total Loans
              </p>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                {!isMounted || isLoadingLoans ? (
                  <span className="inline-block w-16 h-8 bg-slate-200 animate-pulse rounded"></span>
                ) : (
                  loans.length
                )}
              </p>
            </div>
            <div className="flex shrink-0 w-12 h-12 items-center justify-center bg-blue-50 text-[#1877F2] rounded-xl group-hover:bg-[#1877F2] group-hover:text-white transition-colors">
              <Landmark className="w-6 h-6" />
            </div>
          </div>
        </div>

        <div
          className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow cursor-pointer relative overflow-hidden group"
          onClick={() => router.push("/dashboard/claims")}
          role="button"
        >
          <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#1877F2] via-[#1877F2]/40 to-transparent" />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-500">Total Claims Raised</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                {!isMounted || isLoadingPolicies ? (
                  <span className="inline-block w-16 h-8 bg-slate-200 animate-pulse rounded"></span>
                ) : (
                  claims.length
                )}
              </p>
            </div>
            <div className="flex shrink-0 w-12 h-12 items-center justify-center bg-blue-50 text-[#1877F2] rounded-xl group-hover:bg-[#1877F2] group-hover:text-white transition-colors">
              <ShieldCheck className="w-6 h-6" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}