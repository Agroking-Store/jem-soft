"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useSelector, useDispatch } from "react-redux";
import type { RootState, AppDispatch } from "@/store/store";
import { useState, useEffect, useMemo, useRef } from "react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { fetchClaims, deleteClaim } from "@/features/claim/claimSlice";
import { fetchPolicies } from "@/features/policy/policySlice";
import toast from "react-hot-toast";
import { Seal } from "@/features/customers/pages/CustomerListPage";
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
  ShieldCheck,
  ShieldAlert,
  ShieldQuestionMark,
  ShieldUser,
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
  const [statusFilter, setStatusFilter] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
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
    setStatusFilter("");
    setSearchTerm("");
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
      pendingClaims: claims.filter((p) => p.status === "Pending").length,
      settledClaims: claims.filter((p) => p.status === "Approved").length,
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

  const filteredClaims = claims.filter((claim) => {
    const query = searchTerm.toLowerCase();
    const fullName = claim.claimantName || "";
    const claimType = claim.claimType || "";
    const policyNumber = claim.policy?.policyNumber || "";
    const claimAmt = claim.claimAmount.toString() || "";
    return (
      policyNumber.includes(query) ||
      claimAmt.includes(query) ||
      claimType.includes(query) ||
      fullName.includes(query)
    );
  });

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await dispatch(deleteClaim(deleteTarget.id)).unwrap();
      toast.success("Claim deleted successfully");
    } catch (err: any) {
      toast.error(err?.message || err || "Failed to delete claim.");
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0B1220] text-[#E8C77A]">
          <ShieldUser />
        </span>
        <span>
          <h1 className="text-2xl font-serif font-semibold tracking-tight text-slate-900">
            Claims
          </h1>
        </span>
      </div>

      {/* Stats Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div
          className="bg-gradient-to-r from-[#0B1220] via-[#132342] to-[#16294D] p-6 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow cursor-pointer"
          onClick={() => router.push("/dashboard/claims")}
          role="button"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-md text-[#E8C77A] font-bold">
                Total Claims Raised
              </p>
              <p className="text-2xl font-bold text-[#E8C77A]">
                {isLoading ? (
                  <span className="inline-block w-16 h-8 bg-slate-200 animate-pulse rounded"></span>
                ) : (
                  stats.totalClaims
                )}
              </p>
            </div>
            <div className="w-12 h-12 bg-slate-800 rounded-lg flex items-center justify-center">
              <ShieldAlert className="w-6 h-6 text-[#E8C77A]" />
            </div>
          </div>
        </div>

        {/* Settled claims */}
        <div
          className="bg-gradient-to-r from-[#0B1220] via-[#132342] to-[#16294D] p-6 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow cursor-pointer"
          onClick={() => router.push("/dashboard/claims")}
          role="button"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-md text-[#E8C77A] font-bold">
                Total Claims Settled
              </p>
              <p className="text-2xl font-bold text-[#E8C77A]">
                {isLoading ? (
                  <span className="inline-block w-16 h-8 bg-slate-200 animate-pulse rounded"></span>
                ) : (
                  stats.settledClaims
                )}
              </p>
            </div>
            <div className="w-12 h-12 bg-slate-800 rounded-lg flex items-center justify-center">
              <ShieldCheck className="w-6 h-6 text-[#E8C77A]" />
            </div>
          </div>
        </div>

        {/* Pending claims */}
        <div
          className="bg-gradient-to-r from-[#0B1220] via-[#132342] to-[#16294D] p-6 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow cursor-pointer"
          onClick={() => router.push("/dashboard/claims")}
          role="button"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-md text-[#E8C77A] font-bold">
                Total Pending Claims
              </p>
              <p className="text-2xl font-bold text-[#E8C77A]">
                {isLoading ? (
                  <span className="inline-block w-16 h-8 bg-slate-200 animate-pulse rounded"></span>
                ) : (
                  stats.pendingClaims
                )}
              </p>
            </div>
            <div className="w-12 h-12 bg-slate-800 rounded-lg flex items-center justify-center">
              <ShieldQuestionMark className="w-6 h-6 text-[#E8C77A]" />
            </div>
          </div>
        </div>
      </div>

      <CustomerToolbar>
        <div className="min-w-0 flex-1">
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              size={16}
            />
            <input
              type="text"
              placeholder={"Search by Policy Number, Claim amount..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm text-slate-900 outline-none placeholder:text-slate-400 transition-all focus:border-[#B8873A] focus:bg-white focus:ring-2 focus:ring-[#B8873A]/20"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 lg:justify-end cursor-pointer">
          <FilterSelect
            icon={Filter}
            placeholder="All Statuses"
            value={statusFilter}
            onChange={setStatusFilter}
            searchPlaceholder="Search statuses..."
            options={[
              { value: "active", label: "Active" },
              { value: "pending", label: "Pending" },
              { value: "inactive", label: "Inactive" },
            ]}
          />
          {isClient && canEdit && (
            <button
              onClick={() => router.push("/dashboard/claims/new")}
              className="inline-flex items-center gap-2 rounded-xl bg-[#0B1220] px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-[#0B1220]/20 transition-colors hover:bg-[#16294D] cursor-pointer"
            >
              <Plus size={16} />
              <span>New Claim</span>
            </button>
          )}
        </div>
      </CustomerToolbar>

      {/* Table */}
      <section className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.05)]">
        <div className="flex flex-col gap-4 border-b border-slate-200 bg-slate-50/90 px-5 py-4">
          <h2 className="font-serif text-sm font-semibold uppercase tracking-[0.18em] text-slate-700">
            Claims
          </h2>
          <p className="block mt-1 text-sm text-slate-500">
            Browse all claim records.
          </p>
        </div>
        <div className="overflow-hidden border border-slate-200 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.05)] p-5">
          <CustomerTableFrame>
            <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#B8873A] via-[#B8873A]/40 to-transparent"></div>
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Claim
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Policy
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
                {filteredClaims.map((claim, index) => {
                  const statusBadge = getStatusBadge(claim.status);
                  const StatusIcon = statusBadge.icon;
                  const claimIndex = `CLM - ${index + 1}`;
                  return (
                    <tr
                      key={claim.id}
                      className="group hover:bg-slate-50 transition"
                    >
                      <td className="px-4 py-3">
                        <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 font-mono text-xs font-semibold text-slate-700">
                          {claimIndex}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-slate-600">
                          {claim.policy?.policyNumber}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-3 items-center text-left">
                          <span className="text-sm text-slate-600">
                            <Seal name={claim.claimantName || "-"} size={34} />
                          </span>
                          <span className="text-sm text-slate-600">
                            {claim.claimantName || "-"}
                          </span>
                        </div>
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
                          <div className="flex items-center justify-end gap-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity duration-150">
                            <button
                              onClick={() =>
                                router.push(
                                  `/dashboard/claims/${claim.id}?index=${claimIndex}`,
                                )
                              }
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                              title="View"
                            >
                              <Eye size={16} />
                            </button>
                            <button
                              onClick={() =>
                                router.push(
                                  `/dashboard/claims/edit/${claim.id}`,
                                )
                              }
                              className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                              title="Edit"
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              onClick={() => setDeleteTarget(claim)}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer"
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
        </div>
      </section>
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

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-50 rounded-xl">
                <AlertCircle size={22} className="text-red-500" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Delete Claim
                </h3>
                <p className="text-xs text-slate-400">
                  This action cannot be undone
                </p>
              </div>
            </div>
            <p className="text-sm text-slate-600 mb-6 leading-relaxed">
              Are you sure you want to delete this claim?
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                disabled={isDeleting}
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-sm rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                disabled={isDeleting}
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold text-sm rounded-lg shadow-sm transition-colors flex items-center gap-2"
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
