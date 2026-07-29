"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useSelector, useDispatch } from "react-redux";
import type { RootState, AppDispatch } from "@/store/store";
import { useState, useEffect, useMemo, useRef } from "react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { fetchClaims } from "@/features/claim/claimSlice";
import { fetchPolicies } from "@/features/policy/policySlice";
import {
  Plus,
  Search,
  Filter,
  Eye,
  Edit,
  Trash2,
  ChevronDown,
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  List,
  Grid3x3,
  BarChart,
  IndianRupee,
} from "lucide-react";
import {
  CustomerEmptyState,
  CustomerPageHero,
  CustomerSectionCard,
  CustomerStatCard,
  CustomerToolbar,
  FilterSelect,
  CustomerTableFrame,
} from "@/features/customers/components/CustomerUi";

export default function Page() {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useAuth();

  const { policies } = useSelector((state: RootState) => state.policies);

  const { claims, isLoading, error } = useSelector(
    (state: RootState) => state.claims,
  );

  const canEdit = user?.role === "ADMIN" || user?.role === "ADVISOR";

  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    dispatch(fetchClaims());
    dispatch(fetchPolicies());
  }, [dispatch]);

  const stats = useMemo(() => {
    return {
      total: policies.length,
      active: policies.filter((p) => p.status?.statusName === "Active").length,
      pending: policies.filter((p) => p.status?.statusName === "Pending")
        .length,
      lapsed: policies.filter((p) => p.status?.statusName === "Lapsed").length,
      totalClaims: claims.length,
    };
  }, [policies, claims]);

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { color: string; icon: any }> = {
      Approved: { color: "bg-green-100 text-green-700", icon: CheckCircle },
      Rejected: { color: "bg-red-100 text-red-700", icon: XCircle },
      "In Progress": { color: "bg-blue-100 text-blue-700", icon: Clock },
      Pending: { color: "bg-yellow-100 text-yellow-700", icon: Clock },
    };
    const StatusIcon = statusMap[status]?.icon || AlertCircle;
    return {
      className: statusMap[status]?.color || "bg-slate-100 text-slate-700",
      icon: StatusIcon,
    };
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <CustomerPageHero
        title="Claims"
        subtitle="Manage all your claims"
        actions={
          isClient &&
          canEdit && (
            <button
              onClick={() => router.push("/dashboard/claims/new")}
              className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-linear-to-r from-[#B8873A] to-[#E8C77A] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_6px_16px_rgba(184,135,58,0.2)] transition-all duration-200 hover:shadow-[0_8px_20px_rgba(184,135,58,0.25)]"
            >
              <Plus size={16} />
              <span>New Claim</span>
            </button>
          )
        }
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <CustomerStatCard
          label="Total Policies"
          value={isLoading ? "..." : stats.total}
          icon={BarChart}
          tone="accent"
        />
        <CustomerStatCard
          label="Active"
          value={isLoading ? "..." : stats.active}
          icon={CheckCircle}
          tone="success"
        />
        <CustomerStatCard
          label="Total Claims"
          value={isLoading ? "..." : stats.totalClaims}
          icon={FileText}
          tone="warning"
        />
      </div>

      {/* Table */}
      <CustomerTableFrame>
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Claim #
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Policy #
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Claimant Name
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Type
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Amount
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {claims.map((claim) => {
              const statusBadge = getStatusBadge(claim.status);
              const StatusIcon = statusBadge.icon;
              return (
                <tr key={claim.id} className="hover:bg-slate-50 transition">
                  <td className="px-4 py-3">
                    <span className="font-mono text-sm font-medium text-slate-900">
                      {claim.id}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-slate-600">
                      {claim.policy?.policyNumber}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-slate-600">
                      {claim.claimantName}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-slate-600">
                      {claim.claimType}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm font-medium text-slate-900">
                      ₹{claim.claimAmount.toLocaleString("en-IN")}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${statusBadge.className}`}
                    >
                      <StatusIcon size={13} />
                      {claim.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {canEdit && (
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() =>
                            router.push(`/dashboard/claims/${claim.id}`)
                          }
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          title="View"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          onClick={() =>
                            router.push(`/dashboard/claims/edit/${claim.id}`)
                          }
                          className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition"
                          title="Edit"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </CustomerTableFrame>

      {/* Empty / Loading */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" />
          <p className="mt-4 text-sm text-slate-500">Loading claims...</p>
        </div>
      ) : (
        claims.length === 0 && (
          <CustomerEmptyState
            title="No claims have been added yet"
            description="Get started by creating a new claim against a policy."
            action={
              isClient &&
              canEdit && (
                <button
                  onClick={() => router.push("/dashboard/claims/new")}
                  className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-gradient-to-r from-[#B8873A] to-[#E8C77A] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_6px_16px_rgba(184,135,58,0.2)] transition-all duration-200 hover:shadow-[0_8px_20px_rgba(184,135,58,0.25)]"
                >
                  <Plus size={16} />
                  <span>New Claim</span>
                </button>
              )
            }
          />
        )
      )}
    </div>
  );
}
