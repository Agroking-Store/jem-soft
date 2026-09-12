"use client";

import { useRouter } from "next/navigation";
import { useSelector, useDispatch } from "react-redux";
import type { RootState, AppDispatch } from "@/store/store";
import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { fetchClaims, deleteClaim } from "@/features/claim/claimSlice";
import toast from "react-hot-toast";
import { Seal } from "@/features/customers/pages/CustomerListPage";
import {
  Plus,
  Search,
  Eye,
  Edit,
  Trash2,
  AlertCircle,
  ShieldCheck,
  ShieldAlert,
  ShieldQuestionMark,
  ShieldUser,
  IndianRupee,
  CheckCircle,
  XCircle,
  Clock,
} from "lucide-react";
import {
  CustomerEmptyState,
  CustomerSectionCard,
  CustomerToolbar,
  FilterSelect,
  CustomerTableFrame,
} from "@/features/customers/components/CustomerUi";

const STATUS_OPTIONS = [
  { value: "Pending", label: "Pending" },
  { value: "Approved", label: "Approved" },
  { value: "Rejected", label: "Rejected" },
  { value: "In Progress", label: "In Progress" },
  { value: "Settled", label: "Settled" },
];

const STATUS_MAP: Record<string, { color: string; icon: any }> = {
  Approved: { color: "bg-green-100 text-green-700", icon: CheckCircle },
  Settled: { color: "bg-blue-100 text-blue-700", icon: CheckCircle },
  Rejected: { color: "bg-red-100 text-red-700", icon: XCircle },
  "In Progress": { color: "bg-blue-100 text-blue-700", icon: Clock },
  Pending: { color: "bg-yellow-100 text-yellow-700", icon: Clock },
};

export default function Page() {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useAuth();

  const [statusFilter, setStatusFilter] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const { claims, isLoading } = useSelector((state: RootState) => state.claims);
  const canEdit = user?.role === "ADMIN" || user?.role === "ADVISOR";

  useEffect(() => {
    dispatch(fetchClaims());
  }, [dispatch]);
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, itemsPerPage]);

  /* ── Stats (FIXED — now uses claims, not policies) ── */
  const stats = useMemo(() => {
    const total = claims.length;
    const pending = claims.filter((c) => c.status === "Pending").length;
    const approved = claims.filter(
      (c) => c.status === "Approved" || c.status === "Settled",
    ).length;
    const totalAmount = claims.reduce(
      (s, c) => s + Number(c.claimAmount || 0),
      0,
    );
    return { total, pending, approved, totalAmount };
  }, [claims]);

  /* ── Filters (FIXED — status filter now works) ── */
  const filteredClaims = claims.filter((claim) => {
    const q = searchTerm.toLowerCase();
    const name = claim.claimantName || "";
    const policy = claim.policy?.policyNumber || "";
    const amount = claim.claimAmount?.toString() || "";
    const type = claim.claimType || "";

    const matchesSearch =
      policy.includes(q) ||
      name.includes(q) ||
      amount.includes(q) ||
      type.includes(q);
    const matchesStatus = !statusFilter || claim.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil(filteredClaims.length / itemsPerPage);
  const paginatedClaims = filteredClaims.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

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

  const getStatusBadge = (status: string) => {
    const s = STATUS_MAP[status] || {
      color: "bg-slate-100 text-slate-700",
      icon: AlertCircle,
    };
    return s;
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-8">
      {/* Top Banner Card */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-2xl border border-blue-100 bg-[#f0f7ff] p-5 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-b from-[#1e3a8a] to-[#2563eb] text-white shadow-lg shadow-blue-200/50">
            <ShieldUser size={26} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#0f172a]">
              Claims
            </h1>
            <p className="mt-0.5 text-sm font-medium text-slate-500">
            </p>
          </div>
        </div>
      </div>

      {/* Stats (FIXED) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[
          {
            label: "Total Claims",
            value: stats.total,
            icon: <ShieldAlert className="w-6 h-6" />,
          },
          {
            label: "Pending Claims",
            value: stats.pending,
            icon: <ShieldQuestionMark className="w-6 h-6" />,
          },
          {
            label: "Settled / Approved",
            value: stats.approved,
            icon: <ShieldCheck className="w-6 h-6" />,
          },
          {
            label: "Total Claim Amount",
            value: `₹${stats.totalAmount.toLocaleString("en-IN")}`,
            icon: <IndianRupee className="w-6 h-6" />,
          },
        ].map((card) => (
          <div
            key={card.label}
            className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden"
          >
            <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#1877F2] via-[#1877F2]/40 to-transparent" />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-500">{card.label}</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">
                  {isLoading ? (
                    <span className="inline-block w-16 h-8 bg-slate-200 animate-pulse rounded" />
                  ) : (
                    card.value
                  )}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-50 text-[#1877F2] rounded-xl flex items-center justify-center">
                {card.icon}
              </div>
            </div>
          </div>
        ))}
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
              placeholder="Search by policy #, claimant, amount..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pl-10 pr-4 text-sm text-slate-900 outline-none placeholder:text-slate-400 transition-all focus:border-[#1877F2] focus:bg-white focus:ring-2 focus:ring-blue-500/15"
            />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
          <FilterSelect
            icon={ShieldCheck}
            placeholder="All Statuses"
            value={statusFilter}
            onChange={setStatusFilter}
            searchPlaceholder="Search statuses..."
            options={STATUS_OPTIONS}
          />
          {canEdit && (
            <button
              onClick={() => router.push("/dashboard/claims/new")}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#5c67ff] to-[#3a47ff] px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-200 transition-all hover:brightness-110 active:scale-[0.98]"
            >
              <Plus size={16} /> New Claim
            </button>
          )}
        </div>
      </CustomerToolbar>

      {/* Table */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#1877F2] via-[#1877F2]/40 to-transparent" />
        <CustomerTableFrame>
          <table className="w-full">
            <thead className="bg-slate-50/70">
              <tr>
                <th className="sticky top-0 z-10 border-b border-slate-100 bg-slate-50/70 px-4 py-3 text-left text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
                  Policy #
                </th>
                <th className="sticky top-0 z-10 border-b border-slate-100 bg-slate-50/70 px-4 py-3 text-left text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
                  Claimant
                </th>
                <th className="sticky top-0 z-10 border-b border-slate-100 bg-slate-50/70 px-4 py-3 text-left text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
                  Type
                </th>
                <th className="sticky top-0 z-10 border-b border-slate-100 bg-slate-50/70 px-4 py-3 text-left text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
                  Amount
                </th>
                <th className="sticky top-0 z-10 border-b border-slate-100 bg-slate-50/70 px-4 py-3 text-left text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
                  Date
                </th>
                <th className="sticky top-0 z-10 border-b border-slate-100 bg-slate-50/70 px-4 py-3 text-left text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
                  Status
                </th>
                {canEdit && (
                  <th className="sticky top-0 z-10 border-b border-slate-100 bg-slate-50/70 px-4 py-3 text-right text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {paginatedClaims.map((claim) => {
                const badge = getStatusBadge(claim.status);
                const Icon = badge.icon;
                return (
                  <tr
                    key={claim.id}
                    className="group border-b border-slate-100 transition-colors hover:bg-blue-50/40 bg-white"
                  >
                    <td className="px-4 py-4 align-top text-sm font-mono text-[#475569]">
                      {claim.policy?.policyNumber || "—"}
                    </td>
                    <td className="px-4 py-4 align-top">
                      <div className="flex gap-3 items-center">
                        <Seal name={claim.claimantName || "—"} size={36} />
                        <span className="font-semibold text-slate-900">
                          {claim.claimantName || "—"}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4 align-top text-sm text-slate-600">
                      {claim.claimType}
                    </td>
                    <td className="px-4 py-4 align-top text-sm font-medium text-slate-900">
                      ₹{Number(claim.claimAmount).toLocaleString("en-IN")}
                    </td>
                    <td className="px-4 py-4 align-top text-sm text-slate-600">
                      {claim.claimDate
                        ? new Date(claim.claimDate).toLocaleDateString("en-IN")
                        : "—"}
                    </td>
                    <td className="px-4 py-4 align-top">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${badge.color}`}
                      >
                        <Icon size={13} /> {claim.status}
                      </span>
                    </td>
                    {canEdit && (
                      <td className="px-4 py-4 text-right align-top">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() =>
                              router.push(`/dashboard/claims/${claim.id}`)
                            }
                            className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition-all hover:border-blue-200 hover:bg-blue-50 hover:text-[#1877F2] hover:scale-105"
                            title="View"
                          >
                            <Eye size={14} />
                          </button>
                          <button
                            onClick={() =>
                              router.push(`/dashboard/claims/edit/${claim.id}`)
                            }
                            className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-blue-100 bg-white text-[#1877F2] transition-all hover:border-blue-300 hover:bg-blue-50 hover:scale-105"
                            title="Edit"
                          >
                            <Edit size={14} />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(claim)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-rose-100 bg-white text-rose-600 transition-all hover:border-rose-300 hover:bg-rose-50 hover:scale-105"
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CustomerTableFrame>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex flex-col md:flex-row items-center justify-between px-4 py-3 border-t border-slate-200 bg-white rounded-xl">
          <p className="text-sm text-slate-500">
            Showing{" "}
            {filteredClaims.length === 0
              ? 0
              : (currentPage - 1) * itemsPerPage + 1}
            {" - "}
            {Math.min(currentPage * itemsPerPage, filteredClaims.length)}
            {" of "}
            {filteredClaims.length}
          </p>
          <div className="flex items-center gap-2 mt-2 md:mt-0">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => p - 1)}
              className="w-9 h-9 rounded-lg border border-slate-200 disabled:opacity-50 hover:bg-slate-50"
            >
              &lt;
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .slice(
                Math.max(0, currentPage - 2),
                Math.min(totalPages, currentPage + 1),
              )
              .map((p) => (
                <button
                  key={p}
                  onClick={() => setCurrentPage(p)}
                  className={`w-9 h-9 rounded-lg border text-sm ${currentPage === p ? "bg-blue-600 text-white border-blue-600" : "border-slate-200 hover:bg-slate-50"}`}
                >
                  {p}
                </button>
              ))}
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => p + 1)}
              className="w-9 h-9 rounded-lg border border-slate-200 disabled:opacity-50 hover:bg-slate-50"
            >
              &gt;
            </button>
            <select
              value={itemsPerPage}
              onChange={(e) => setItemsPerPage(Number(e.target.value))}
              className="h-9 rounded-lg border border-slate-200 px-2 text-sm"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>
        </div>
      )}

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
              canEdit && (
                <button
                  onClick={() => router.push("/dashboard/claims/new")}
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#5c67ff] to-[#3a47ff] px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-200 transition-all hover:brightness-110 active:scale-[0.98]"
                >
                  <Plus size={16} /> New Claim
                </button>
              )
            }
          />
        )
      )}

      {/* Delete Modal */}
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
            <p className="text-sm text-slate-600 mb-6">
              Delete claim for policy{" "}
              <strong>{deleteTarget.policy?.policyNumber}</strong>?
              <br />
              <span className="text-xs text-amber-600">
                Policy status will be restored to Active.
              </span>
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                disabled={isDeleting}
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-sm rounded-lg"
              >
                Cancel
              </button>
              <button
                disabled={isDeleting}
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold text-sm rounded-lg flex items-center gap-2"
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
