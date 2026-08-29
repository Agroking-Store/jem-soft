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
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0B1220] text-[#E8C77A]">
          <ShieldUser />
        </span>
        <h1 className="text-2xl font-serif font-semibold tracking-tight text-slate-900">
          Claims
        </h1>
      </div>

      {/* Stats (FIXED) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[
          {
            label: "Total Claims",
            value: stats.total,
            icon: <ShieldAlert className="w-6 h-6 text-[#E8C77A]" />,
          },
          {
            label: "Pending Claims",
            value: stats.pending,
            icon: <ShieldQuestionMark className="w-6 h-6 text-[#E8C77A]" />,
          },
          {
            label: "Settled / Approved",
            value: stats.approved,
            icon: <ShieldCheck className="w-6 h-6 text-[#E8C77A]" />,
          },
          {
            label: "Total Claim Amount",
            value: `₹${stats.totalAmount.toLocaleString("en-IN")}`,
            icon: <IndianRupee className="w-6 h-6 text-[#E8C77A]" />,
          },
        ].map((card) => (
          <div
            key={card.label}
            className="bg-gradient-to-r from-[#0B1220] via-[#132342] to-[#16294D] p-6 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-md text-[#E8C77A] font-bold">{card.label}</p>
                <p className="text-2xl font-bold text-[#E8C77A]">
                  {isLoading ? (
                    <span className="inline-block w-16 h-8 bg-slate-200 animate-pulse rounded" />
                  ) : (
                    card.value
                  )}
                </p>
              </div>
              <div className="w-12 h-12 bg-slate-800 rounded-lg flex items-center justify-center">
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
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm text-slate-900 outline-none placeholder:text-slate-400 transition-all focus:border-[#B8873A] focus:bg-white focus:ring-2 focus:ring-[#B8873A]/20"
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
              className="inline-flex items-center gap-2 rounded-xl bg-[#0B1220] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#16294D] cursor-pointer"
            >
              <Plus size={16} /> New Claim
            </button>
          )}
        </div>
      </CustomerToolbar>

      {/* Table */}
      <section className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.05)]">
        <div className="flex flex-col gap-1 border-b border-slate-200 bg-slate-50/90 px-5 py-4">
          <h2 className="font-serif text-sm font-semibold uppercase tracking-[0.18em] text-slate-700">
            Claims
          </h2>
          <p className="text-sm text-slate-500">Browse all claim records.</p>
        </div>
        <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#B8873A] via-[#B8873A]/40 to-transparent" />
        <CustomerTableFrame>
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Policy #
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Claimant
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Status
                </th>
                {canEdit && (
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
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
                    className="group hover:bg-slate-50 transition"
                  >
                    <td className="px-4 py-3 text-sm text-slate-600 font-mono">
                      {claim.policy?.policyNumber || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-3 items-center">
                        <Seal name={claim.claimantName || "—"} size={34} />
                        <span className="text-sm text-slate-600">
                          {claim.claimantName || "—"}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {claim.claimType}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-slate-900">
                      ₹{Number(claim.claimAmount).toLocaleString("en-IN")}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {claim.claimDate
                        ? new Date(claim.claimDate).toLocaleDateString("en-IN")
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${badge.color}`}
                      >
                        <Icon size={13} /> {claim.status}
                      </span>
                    </td>
                    {canEdit && (
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity">
                          <button
                            onClick={() =>
                              router.push(`/dashboard/claims/${claim.id}`)
                            }
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                            title="View"
                          >
                            <Eye size={16} />
                          </button>
                          <button
                            onClick={() =>
                              router.push(`/dashboard/claims/edit/${claim.id}`)
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
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CustomerTableFrame>
      </section>

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
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#B8873A] to-[#E8C77A] px-4 py-2.5 text-sm font-semibold text-white"
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
