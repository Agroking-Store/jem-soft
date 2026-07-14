"use client";

import { useAuth } from "@/features/auth/hooks/useAuth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import type { RootState, AppDispatch } from "@/store/store";
import { fetchPolicies } from "@/features/policy/policySlice";
import { fetchCustomersMaster } from "@/features/customers/customerMasterSlice";
import {
  Users,
  Activity,
  DollarSign,
  Shield,
  Briefcase,
  MessageSquare,
  TrendingUp,
  ShieldPlus,
  Landmark,
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
    (state: RootState) => state.loans
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsMounted(true);

    dispatch(fetchPolicies());
    dispatch(fetchCustomersMaster());
    dispatch(fetchLoans());

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
        <div className="bg-gradient-to-r from-[#0B1220] via-[#132342] to-[#16294D] p-6 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-md text-[#E8C77A] font-bold">Total Customers</p>
              <p className="text-2xl font-bold text-[#E8C77A]">
                {!isMounted || isLoadingMasterCustomers ? (
                  <span className="inline-block w-16 h-8 bg-slate-200 animate-pulse rounded"></span>
                ) : (
                  masterCustomers.length
                )}
              </p>
              {/* <p className="text-xs text-green-600 mt-1">↑ 12% this month</p> */}
            </div>
            <div className="w-12 h-12 bg-slate-800 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-[#E8C77A]" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-[#0B1220] via-[#132342] to-[#16294D] p-6 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-md text-[#E8C77A] font-bold">Total Policies Issued</p>
              <p className="text-2xl font-bold text-[#E8C77A]">
                {!isMounted || isLoadingPolicies ? (
                  <span className="inline-block w-16 h-8 bg-slate-200 animate-pulse rounded"></span>
                ) : (
                  policies.length
                )}
              </p>
              {/* <p className="text-xs text-green-600 mt-1">↑ 8% this week</p> */}
            </div>
            <div className="w-12 h-12  bg-slate-800 rounded-lg flex items-center justify-center">
              <ShieldPlus className="w-6 h-6  text-[#E8C77A]" />
            </div>
          </div>
        </div>



        <div className="bg-gradient-to-r from-[#0B1220] via-[#132342] to-[#16294D] p-6 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">

            <div>
              <p className="text-md text-[#E8C77A] font-bold">
                Total Loans
              </p>

              <p className="text-2xl font-bold text-[#E8C77A]">
                {!isMounted || isLoadingLoans ? (
                  <span className="inline-block w-16 h-8 bg-slate-200 animate-pulse rounded"></span>
                ) : (
                  loans.length
                )}
              </p>
            </div>

            <div className="w-12 h-12 bg-slate-800 rounded-lg flex items-center justify-center">
              <Landmark className="w-6 h-6 text-[#E8C77A]" />
            </div>

          </div>
        </div>




      </div>
    </div>
  );
}