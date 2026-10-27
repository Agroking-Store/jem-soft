"use client";

import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useRouter } from "next/navigation";
import { Plus, Search, Eye, Edit, Trash2, ShieldAlert } from "lucide-react";
import type { AppDispatch, RootState } from "@/store/store";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { fetchClaims, deleteClaim, type Claim } from "@/features/claim/claimSlice";
import toast from "react-hot-toast";
import { Seal } from "@/features/customers/pages/CustomerListPage";

const money = (v: number | undefined | null) =>
  `₹${Number(v ?? 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const dt = (v?: string | null) =>
  v ? new Date(v).toLocaleDateString("en-IN") : "—";

const STATUS_MAP: Record<string, string> = {
  Approved: "bg-emerald-100 text-emerald-700",
  Settled: "bg-blue-100 text-blue-700",
  Rejected: "bg-rose-100 text-rose-700",
  "In Progress": "bg-blue-100 text-blue-700",
  Pending: "bg-amber-100 text-amber-700",
};

export default function ClaimsPage() {
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  const { user } = useAuth();
  const [isClient, setIsClient] = useState(false);
  const canEdit = user?.role === "ADMIN" || user?.role === "ADVISOR";

  const { claims, isLoading, error } = useSelector(
    (s: RootState) => s.claims,
  );

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [claimToDelete, setClaimToDelete] = useState<Claim | null>(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    dispatch(fetchClaims());
  }, [dispatch]);

  useEffect(() => {
    if (error) toast.error(error);
  }, [error]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, itemsPerPage]);

  const filtered = useMemo(() => {
    return claims.filter((claim) => {
      const q = search.toLowerCase();
      const policy = claim.policy?.policyNumber ?? "";
      const name = claim.claimantName ?? "";
      const type = claim.claimType ?? "";
      const amount = claim.claimAmount?.toString() ?? "";

      const matchesSearch =
        !q ||
        policy.toLowerCase().includes(q) ||
        name.toLowerCase().includes(q) ||
        type.toLowerCase().includes(q) ||
        amount.includes(q);

      const matchesStatus =
        statusFilter === "ALL" || claim.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [claims, search, statusFilter]);

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

  const badge = (status?: string) =>
    STATUS_MAP[status || ""] || "bg-slate-100 text-slate-700";

  const handleDeleteClaim = (claim: Claim) => {
    setClaimToDelete(claim);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!claimToDelete) return;
    try {
      await dispatch(deleteClaim(claimToDelete.id)).unwrap();
      toast.success("Claim deleted successfully.");
    } catch (message: any) {
      toast.error(String(message?.message || message || "Failed to delete claim."));
    } finally {
      setShowDeleteModal(false);
      setClaimToDelete(null);
    }
  };

  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedClaims = filtered.slice(
    (safePage - 1) * itemsPerPage,
    safePage * itemsPerPage,
  );

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-2xl border border-blue-100 bg-[#f0f7ff] p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-b from-[#1e3a8a] to-[#2563eb] text-white shadow-lg shadow-blue-200/50">
            <ShieldAlert size={20} />
          </span>
          <div>
            <h1 className="font-serif text-2xl font-semibold text-slate-900">
              Claims
            </h1>
            <p className="text-sm text-slate-500">
              View and manage policy claim requests and settlements.
            </p>
          </div>
        </div>
        {isClient && canEdit && (
          <button
            onClick={() => router.push("/dashboard/claims/new")}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#5c67ff] to-[#3a47ff] px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-200 transition-all hover:brightness-110 active:scale-[0.98] cursor-pointer"
          >
            <Plus size={18} />
            New Claim
          </button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Total Claims", stats.total],
          ["Pending", stats.pending],
          ["Settled / Approved", stats.approved],
          ["Claim Amount", money(stats.totalAmount)],
        ].map(([l, v]) => (
          <div
            key={String(l)}
            className="rounded-xl bg-gradient-to-b from-[#1e3a8a] to-[#2563eb] text-white shadow-lg shadow-blue-200/50 p-5"
          >
            <p className="text-xs font-bold uppercase tracking-wider text-[#E8C77A]">
              {l}
            </p>
            <p className="mt-2 text-2xl font-bold text-white">
              {isLoading ? "…" : v}
            </p>
          </div>
        ))}
      </div>

      {/* Search & Filter Toolbar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row">
          <div className="relative flex-1">
            <Search
              size={17}
              className="absolute left-3 top-3 text-slate-400"
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search policy, claimant, or type"
              className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-[#B8873A]"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
          >
            <option value="ALL">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="In Progress">In Progress</option>
            <option value="Approved">Approved</option>
            <option value="Settled">Settled</option>
            <option value="Rejected">Rejected</option>
          </select>
        </div>
      </div>

      {/* Table Card */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
              <tr>
                {[
                  "Policy",
                  "Claimant",
                  "Type",
                  "Amount",
                  "Claim Date",
                  "Status",
                  "Actions",
                ].map((h) => (
                  <th key={h} className="px-5 py-3">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-slate-500">
                    Loading claims…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-5 py-12 text-center text-slate-500"
                  >
                    No claims found.
                  </td>
                </tr>
              ) : (
                paginatedClaims.map((claim) => (
                  <tr key={claim.id} className="hover:bg-slate-50">
                    <td className="px-5 py-4 font-semibold font-mono text-slate-900">
                      {claim.policy?.policyNumber ?? "—"}
                    </td>
                    <td className="px-5 py-4 text-slate-600">
                      <div className="flex gap-3 items-center">
                        <Seal name={claim.claimantName || "—"} size={34} />
                        <span className="text-sm text-slate-600">
                          {claim.claimantName || "—"}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-slate-600">
                      {claim.claimType ?? "—"}
                    </td>
                    <td className="px-5 py-4 font-semibold text-slate-900">
                      {money(claim.claimAmount)}
                    </td>
                    <td className="px-5 py-4 text-slate-600">
                      {dt(claim.claimDate)}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${badge(claim.status)}`}
                      >
                        {claim.status ?? "Unknown"}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() =>
                            router.push(`/dashboard/claims/${claim.id}`)
                          }
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                          title="View"
                        >
                          <Eye size={16} />
                        </button>
                        {isClient && canEdit && (
                          <>
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
                              onClick={() => handleDeleteClaim(claim)}
                              className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                              title="Delete"
                              type="button"
                            >
                              <Trash2 size={16} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && claimToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => {
              setShowDeleteModal(false);
              setClaimToDelete(null);
            }}
          />
          <div className="relative z-10 w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
            <h3 className="text-lg font-semibold text-slate-900">Confirm Delete</h3>
            <p className="mt-3 text-sm text-slate-600">
              Delete claim for Policy #{""}
              <span className="font-medium text-slate-900">
                {claimToDelete.policy?.policyNumber ?? "this policy"}
              </span>
              ? Policy status will be restored to Active. This action cannot be undone.
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setClaimToDelete(null);
                }}
                className="rounded-md border px-4 py-2 text-sm cursor-pointer text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="rounded-md bg-rose-600 px-4 py-2 text-sm text-white cursor-pointer hover:bg-rose-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pagination Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between px-4 py-3">
        {/* Left */}
        <p className="text-sm text-slate-500">
          Showing{" "}
          {filtered.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}
          {" - "}
          {Math.min(currentPage * itemsPerPage, filtered.length)}
          {" of "}
          {filtered.length} entries
        </p>

        {/* Right */}
        <div className="flex items-center gap-3 mt-3 md:mt-0">
          {/* Previous */}
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((p) => p - 1)}
            className="w-9 h-9 rounded-lg border border-slate-200 disabled:opacity-50 hover:bg-slate-50"
          >
            &lt;
          </button>

          {/* Page Numbers */}
          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .slice(
                Math.max(0, currentPage - 2),
                Math.min(totalPages, currentPage + 1),
              )
              .map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`w-9 h-9 rounded-lg border text-sm ${
                    currentPage === page
                      ? "bg-blue-600 text-white border-blue-600"
                      : "border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  {page}
                </button>
              ))}

            {totalPages > 3 && currentPage < totalPages - 1 && (
              <>
                <span className="px-1 text-slate-400">...</span>
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  className="w-9 h-9 rounded-lg border border-slate-200 hover:bg-slate-50"
                >
                  {totalPages}
                </button>
              </>
            )}
          </div>

          {/* Next */}
          <button
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage((p) => p + 1)}
            className="w-9 h-9 rounded-lg border border-slate-200 disabled:opacity-50 hover:bg-slate-50"
          >
            &gt;
          </button>

          {/* Rows Per Page */}
          <select
            value={itemsPerPage}
            onChange={(e) => setItemsPerPage(Number(e.target.value))}
            className="h-9 rounded-lg border border-slate-200 px-2 text-sm"
          >
            <option value={5}>5 / page</option>
            <option value={10}>10 / page</option>
            <option value={20}>20 / page</option>
            <option value={50}>50 / page</option>
          </select>
        </div>
      </div>
    </div>
  );
}
