"use client";

import { useRouter } from "next/navigation";
import { useSelector, useDispatch } from "react-redux";
import type { RootState, AppDispatch } from "@/store/store";
import { useState, useEffect, useMemo, type ReactNode } from "react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { fetchClaims, deleteClaim } from "@/features/claim/claimSlice";
import toast from "react-hot-toast";
import { Seal } from "@/features/customers/pages/CustomerListPage";
import {
  Plus,
  Search,
  Eye,
  SquarePen,
  Trash2,
  ShieldCheck,
  ShieldAlert,
  ShieldQuestionMark,
  ShieldUser,
  IndianRupee,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
} from "lucide-react";
import {
  CustomerEmptyState,
  CustomerPageHero,
  CustomerStatCard,
  CustomerToolbar,
  FilterSelect,
  CustomerTableFrame,
} from "@/features/customers/components/CustomerUi";

const STATUS_OPTIONS = [
  { value: "", label: "All Statuses" },
  { value: "Pending", label: "Pending" },
  { value: "Approved", label: "Approved" },
  { value: "Rejected", label: "Rejected" },
  { value: "In Progress", label: "In Progress" },
  { value: "Settled", label: "Settled" },
];

const STATUS_MAP: Record<string, { color: string; dot: string; icon: any }> = {
  Approved: { color: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500", icon: CheckCircle },
  Settled: { color: "bg-blue-50 text-[#1877F2] border-blue-200", dot: "bg-[#1877F2]", icon: CheckCircle },
  Rejected: { color: "bg-rose-50 text-rose-700 border-rose-200", dot: "bg-rose-500", icon: XCircle },
  "In Progress": { color: "bg-blue-50 text-blue-700 border-blue-200", dot: "bg-blue-500", icon: Clock },
  Pending: { color: "bg-amber-50 text-amber-700 border-amber-200", dot: "bg-amber-500", icon: Clock },
};

function TableHeadCell({
  children,
  align = "left",
}: {
  children: ReactNode;
  align?: "left" | "center" | "right";
}) {
  return (
    <th
      className={`sticky top-0 z-10 border-b border-slate-100 bg-slate-50/70 px-4 py-3 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400 ${
        align === "center" ? "text-center" : align === "right" ? "text-right" : "text-left"
      }`}
    >
      {children}
    </th>
  );
}

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

  /* ── Stats ── */
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

  /* ── Filters ── */
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
    return STATUS_MAP[status] || {
      color: "bg-slate-50 text-slate-700 border-slate-200",
      dot: "bg-slate-400",
      icon: AlertCircle,
    };
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-8">
      {/* Page Hero */}
      <CustomerPageHero
        title="Claims"
        subtitle="Browse and manage policy claims."
        icon={ShieldUser}
        actions={
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

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <CustomerStatCard
          label="Total Claims"
          value={isLoading ? "..." : stats.total}
          icon={ShieldAlert}
          tone="accent"
        />
        <CustomerStatCard
          label="Pending Claims"
          value={isLoading ? "..." : stats.pending}
          icon={ShieldQuestionMark}
          tone="warning"
        />
        <CustomerStatCard
          label="Settled / Approved"
          value={isLoading ? "..." : stats.approved}
          icon={ShieldCheck}
          tone="success"
        />
        <CustomerStatCard
          label="Total Claim Amount"
          value={isLoading ? "..." : `₹${stats.totalAmount.toLocaleString("en-IN")}`}
          icon={IndianRupee}
          tone="neutral"
        />
      </div>

      {/* Toolbar */}
      <CustomerToolbar>
        <div className="min-w-0 flex-1 sm:max-w-md">
          <div className="relative">
            <Search
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              size={16}
            />
            <input
              type="text"
              placeholder="Search by policy #, claimant, amount, type..."
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
        </div>
      </CustomerToolbar>

      {/* Content Table Card */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#1877F2] via-[#1877F2]/40 to-transparent" />

        {isLoading && claims.length === 0 ? (
          <div className="flex min-h-[18rem] items-center justify-center">
            <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-[#1877F2]" />
          </div>
        ) : filteredClaims.length === 0 ? (
          <CustomerEmptyState
            title={claims.length === 0 ? "No claims have been added yet" : "No matching claims found"}
            description={
              claims.length === 0
                ? "Get started by creating a new claim against a policy."
                : "Try adjusting your search keywords or status filter."
            }
            action={
              canEdit && !searchTerm && !statusFilter ? (
                <button
                  onClick={() => router.push("/dashboard/claims/new")}
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#5c67ff] to-[#3a47ff] px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-200 transition-all hover:brightness-110"
                >
                  <Plus size={16} /> New Claim
                </button>
              ) : undefined
            }
          />
        ) : (
          <CustomerTableFrame
            footer={
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
                <span>
                  Showing <strong className="text-slate-700">{filteredClaims.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}</strong> to{" "}
                  <strong className="text-slate-700">{Math.min(currentPage * itemsPerPage, filteredClaims.length)}</strong> of{" "}
                  <strong className="text-slate-700">{filteredClaims.length}</strong> claims
                </span>
                {totalPages > 1 && (
                  <div className="flex items-center gap-2">
                    <button
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage((p) => p - 1)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
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
                          className={`inline-flex h-8 w-8 items-center justify-center rounded-xl text-xs font-semibold transition-all ${
                            currentPage === p
                              ? "bg-gradient-to-r from-[#5c67ff] to-[#3a47ff] text-white shadow-sm"
                              : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                          }`}
                        >
                          {p}
                        </button>
                      ))}
                    <button
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage((p) => p + 1)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      &gt;
                    </button>
                    <select
                      value={itemsPerPage}
                      onChange={(e) => setItemsPerPage(Number(e.target.value))}
                      className="h-8 rounded-xl border border-slate-200 bg-white px-2 text-xs font-medium text-slate-700 outline-none"
                    >
                      <option value={5}>5 / page</option>
                      <option value={10}>10 / page</option>
                      <option value={20}>20 / page</option>
                      <option value={50}>50 / page</option>
                    </select>
                  </div>
                )}
              </div>
            }
          >
            <table className="min-w-full border-separate border-spacing-0 text-left text-sm">
              <thead>
                <tr>
                  <TableHeadCell>Policy #</TableHeadCell>
                  <TableHeadCell>Claimant</TableHeadCell>
                  <TableHeadCell>Type</TableHeadCell>
                  <TableHeadCell>Amount</TableHeadCell>
                  <TableHeadCell>Date</TableHeadCell>
                  <TableHeadCell align="center">Status</TableHeadCell>
                  {canEdit && <TableHeadCell align="right">Actions</TableHeadCell>}
                </tr>
              </thead>
              <tbody>
                {paginatedClaims.map((claim, index) => {
                  const badge = getStatusBadge(claim.status);
                  const Icon = badge.icon;
                  return (
                    <tr
                      key={claim.id}
                      onClick={() => router.push(`/dashboard/claims/${claim.id}`)}
                      className={`group cursor-pointer border-b border-slate-100 transition-colors hover:bg-blue-50/40 ${
                        index % 2 === 0 ? "bg-white" : "bg-slate-50/30"
                      }`}
                    >
                      <td className="px-4 py-4 align-top">
                        <span className="inline-flex rounded-lg bg-[#f1f5f9] px-3 py-1.5 font-mono text-xs font-semibold text-[#475569]">
                          {claim.policy?.policyNumber || "—"}
                        </span>
                      </td>
                      <td className="px-4 py-4 align-top">
                        <div className="flex items-center gap-3">
                          <Seal name={claim.claimantName || "—"} size={36} />
                          <span className="font-semibold text-slate-900 transition-colors group-hover:text-[#1877F2]">
                            {claim.claimantName || "—"}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4 align-top text-sm text-slate-600">
                        {claim.claimType}
                      </td>
                      <td className="px-4 py-4 align-top text-sm font-semibold text-slate-900">
                        ₹{Number(claim.claimAmount).toLocaleString("en-IN")}
                      </td>
                      <td className="px-4 py-4 align-top text-sm text-slate-600">
                        {claim.claimDate
                          ? new Date(claim.claimDate).toLocaleDateString("en-IN")
                          : "—"}
                      </td>
                      <td className="px-4 py-4 align-top text-center">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${badge.color}`}
                        >
                          <Icon size={12} /> {claim.status}
                        </span>
                      </td>
                      {canEdit && (
                        <td className="px-4 py-4 text-right align-top">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push(`/dashboard/claims/${claim.id}`);
                              }}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition-all hover:border-blue-200 hover:bg-blue-50 hover:text-[#1877F2] hover:scale-105"
                              title="View"
                            >
                              <Eye size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push(`/dashboard/claims/edit/${claim.id}`);
                              }}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-blue-100 bg-white text-[#1877F2] transition-all hover:border-blue-300 hover:bg-blue-50 hover:scale-105"
                              title="Edit"
                            >
                              <SquarePen size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteTarget(claim);
                              }}
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
        )}
      </div>

      {/* Delete Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 px-4 py-6 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.28)]">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
                <Trash2 size={18} />
              </div>
              <div className="min-w-0">
                <h3 className="text-lg font-semibold text-slate-900">Delete Claim</h3>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Delete claim for policy{" "}
                  <strong className="text-slate-800">{deleteTarget.policy?.policyNumber}</strong>?
                </p>
                <p className="mt-2 text-xs font-medium text-amber-600">
                  Policy status will be restored to Active.
                </p>
              </div>
            </div>
            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                disabled={isDeleting}
                onClick={() => setDeleteTarget(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                disabled={isDeleting}
                onClick={handleDelete}
                className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 shadow-sm"
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

