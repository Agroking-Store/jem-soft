"use client";

import { useState, useEffect, useMemo, type ReactNode } from "react";
import { useSelector, useDispatch } from "react-redux";
import type { RootState, AppDispatch } from "@/store/store";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useRouter } from "next/navigation";
import { Seal } from "@/features/customers/pages/CustomerListPage";
import {
  Plus,
  Search,
  Eye,
  SquarePen,
  Trash2,
  AlertCircle,
  Landmark,
  HandCoins,
  Banknote,
  Activity,
} from "lucide-react";
import { fetchLoans, deleteLoan } from "@/features/loans/loanSlice";
import toast from "react-hot-toast";
import {
  CustomerEmptyState,
  CustomerPageHero,
  CustomerStatCard,
  CustomerToolbar,
  FilterSelect,
  CustomerTableFrame,
} from "@/features/customers/components/CustomerUi";

const STATUS_FILTER_OPTIONS = [
  { value: "", label: "All Statuses" },
  { value: "ACTIVE", label: "Active" },
  { value: "PAID_OFF", label: "Paid Off" },
  { value: "DEFAULTED", label: "Defaulted" },
  { value: "CLOSED", label: "Closed" },
];

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

export default function LoansPage() {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useAuth();

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [customerFilter, setCustomerFilter] = useState("ALL");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const canEdit = user?.role === "ADMIN" || user?.role === "ADVISOR";
  const { loans, isLoading } = useSelector((state: RootState) => state.loans);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    dispatch(fetchLoans());
  }, [dispatch]);

  useEffect(() => {
    setCurrentPage(1);
  }, [
    searchTerm,
    statusFilter,
    customerFilter,
    fromDate,
    toDate,
    itemsPerPage,
  ]);

  /* ── Stats ──────────────────────────────────────────── */
  const stats = useMemo(() => {
    const total = loans.length;
    const activeLoans = loans.filter(
      (l) => l.loanStatus?.statusCode === "ACTIVE",
    ).length;
    const totalDisbursed = loans.reduce(
      (s, l) => s + Number(l.loanAmount || 0),
      0,
    );
    const totalOutstanding = loans.reduce(
      (s, l) =>
        s + Number(l.summary?.outstandingPrincipal ?? l.loanAmount ?? 0),
      0,
    );
    return { total, activeLoans, totalDisbursed, totalOutstanding };
  }, [loans]);

  /* ── Filters ────────────────────────────────────────── */
  const customers = useMemo(
    () => [
      ...new Set(
        loans
          .map((l) =>
            l.policy?.CustomerMaster
              ? `${l.policy.CustomerMaster.firstName} ${l.policy.CustomerMaster.lastName}`
              : "",
          )
          .filter(Boolean),
      ),
    ],
    [loans],
  );

  const customerOptions = useMemo(
    () => [
      { value: "", label: "All Customers" },
      ...customers.map((c) => ({ value: c, label: c })),
    ],
    [customers],
  );

  const filteredLoans = loans.filter((loan) => {
    const cust = loan.policy?.CustomerMaster;
    const name = cust ? `${cust.firstName} ${cust.lastName}` : "";
    const date = loan.loanDate ? new Date(loan.loanDate) : null;

    return (
      (loan.policy?.policyNumber
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
        name.toLowerCase().includes(searchTerm.toLowerCase())) &&
      (statusFilter === "ALL" ||
        loan.loanStatus?.statusCode === statusFilter) &&
      (customerFilter === "ALL" || name === customerFilter) &&
      (!fromDate || (date && date >= new Date(fromDate))) &&
      (!toDate || (date && date <= new Date(toDate)))
    );
  });

  const totalPages = Math.ceil(filteredLoans.length / itemsPerPage);
  const paginatedLoans = filteredLoans.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  /* ── Delete ─────────────────────────────────────────── */
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const result = await dispatch(deleteLoan(deleteTarget.id)).unwrap();
      toast.success(`Loan for policy ${result.policyNumber} deleted.`);
    } catch (err: any) {
      toast.error(err?.message || err || "Failed to delete loan.");
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  };

  /* ── Status Badge ───────────────────────────────────── */
  const statusBadge = (code?: string, name?: string) => {
    const colors: Record<string, string> = {
      ACTIVE: "bg-emerald-50 text-emerald-700 border-emerald-200",
      PAID_OFF: "bg-blue-50 text-[#1877F2] border-blue-200",
      DEFAULTED: "bg-rose-50 text-rose-700 border-rose-200",
      CLOSED: "bg-slate-50 text-slate-600 border-slate-200",
    };
    return (
      <span
        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${colors[code || ""] || "bg-slate-50 text-slate-700 border-slate-200"}`}
      >
        {name || "Unknown"}
      </span>
    );
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-8">
      {/* Page Hero */}
      <CustomerPageHero
        title="Loans"
        subtitle="Browse and manage policy loan records."
        icon={Landmark}
        actions={
          isClient &&
          canEdit && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => router.push("/dashboard/loans/new")}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#5c67ff] to-[#3a47ff] px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-200 transition-all hover:brightness-110 active:scale-[0.98]"
              >
                <Plus size={16} /> New Loan
              </button>
              <button
                onClick={() => router.push("/dashboard/loans/repay")}
                className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 transition-colors active:scale-[0.98]"
              >
                <HandCoins size={16} /> Repay Loan
              </button>
            </div>
          )
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <CustomerStatCard
          label="Total Loans"
          value={isLoading ? "..." : stats.total}
          icon={Landmark}
          tone="accent"
        />
        <CustomerStatCard
          label="Active Loans"
          value={isLoading ? "..." : stats.activeLoans}
          icon={Activity}
          tone="warning"
        />
        <CustomerStatCard
          label="Total Disbursed"
          value={isLoading ? "..." : `₹${stats.totalDisbursed.toLocaleString("en-IN")}`}
          icon={HandCoins}
          tone="neutral"
        />
        <CustomerStatCard
          label="Total Outstanding"
          value={isLoading ? "..." : `₹${stats.totalOutstanding.toLocaleString("en-IN")}`}
          icon={Banknote}
          tone="success"
        />
      </div>

      {/* Filters Toolbar */}
      <CustomerToolbar>
        <div className="min-w-0 flex-1 sm:max-w-md">
          <div className="relative">
            <Search
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by policy # or customer..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pl-10 pr-4 text-sm text-slate-900 outline-none placeholder:text-slate-400 transition-all focus:border-[#1877F2] focus:bg-white focus:ring-2 focus:ring-blue-500/15"
            />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
          <FilterSelect
            placeholder="All Statuses"
            value={statusFilter === "ALL" ? "" : statusFilter}
            onChange={(v) => setStatusFilter(v || "ALL")}
            options={STATUS_FILTER_OPTIONS}
            searchPlaceholder="Search status..."
          />
          {customers.length > 0 && (
            <FilterSelect
              placeholder="All Customers"
              value={customerFilter === "ALL" ? "" : customerFilter}
              onChange={(v) => setCustomerFilter(v || "ALL")}
              options={customerOptions}
              searchPlaceholder="Search customer..."
            />
          )}
          {(searchTerm || statusFilter !== "ALL" || customerFilter !== "ALL" || fromDate || toDate) && (
            <button
              onClick={() => {
                setSearchTerm("");
                setStatusFilter("ALL");
                setCustomerFilter("ALL");
                setFromDate("");
                setToDate("");
              }}
              className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Reset
            </button>
          )}
        </div>
      </CustomerToolbar>

      {/* Content Table Card */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#1877F2] via-[#1877F2]/40 to-transparent" />

        {isLoading && loans.length === 0 ? (
          <div className="flex min-h-[18rem] items-center justify-center">
            <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-[#1877F2]" />
          </div>
        ) : filteredLoans.length === 0 ? (
          <CustomerEmptyState
            title={loans.length === 0 ? "No loans recorded yet" : "No matching loans found"}
            description={
              loans.length === 0
                ? "Get started by creating a new loan against a policy."
                : "Try adjusting your search keywords or status filter."
            }
            action={
              isClient && canEdit && !searchTerm && statusFilter === "ALL" ? (
                <button
                  onClick={() => router.push("/dashboard/loans/new")}
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#5c67ff] to-[#3a47ff] px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-200 transition-all hover:brightness-110"
                >
                  <Plus size={16} /> New Loan
                </button>
              ) : undefined
            }
          />
        ) : (
          <CustomerTableFrame
            footer={
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
                <span>
                  Showing <strong className="text-slate-700">{filteredLoans.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}</strong> to{" "}
                  <strong className="text-slate-700">{Math.min(currentPage * itemsPerPage, filteredLoans.length)}</strong> of{" "}
                  <strong className="text-slate-700">{filteredLoans.length}</strong> loans
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
                  <TableHeadCell>Customer</TableHeadCell>
                  <TableHeadCell>Loan Amount</TableHeadCell>
                  <TableHeadCell>Outstanding</TableHeadCell>
                  <TableHeadCell>Interest Rate</TableHeadCell>
                  <TableHeadCell>Loan Date</TableHeadCell>
                  <TableHeadCell align="center">Status</TableHeadCell>
                  {isClient && canEdit && <TableHeadCell align="right">Actions</TableHeadCell>}
                </tr>
              </thead>
              <tbody>
                {paginatedLoans.map((loan, index) => {
                  const cust = loan.policy?.CustomerMaster;
                  const custName = cust ? `${cust.firstName} ${cust.lastName}` : "—";
                  return (
                    <tr
                      key={loan.id}
                      onClick={() => router.push(`/dashboard/loans/${loan.id}`)}
                      className={`group cursor-pointer border-b border-slate-100 transition-colors hover:bg-blue-50/40 ${
                        index % 2 === 0 ? "bg-white" : "bg-slate-50/30"
                      }`}
                    >
                      <td className="px-4 py-4 align-top">
                        <span className="inline-flex rounded-lg bg-[#f1f5f9] px-3 py-1.5 font-mono text-xs font-semibold text-[#475569]">
                          {loan.policy?.policyNumber || "—"}
                        </span>
                      </td>
                      <td className="px-4 py-4 align-top">
                        <div className="flex items-center gap-3">
                          <Seal name={custName} size={36} />
                          <span className="font-semibold text-slate-900 transition-colors group-hover:text-[#1877F2]">
                            {custName}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4 align-top text-sm font-semibold text-slate-900">
                        ₹{Number(loan.loanAmount).toLocaleString("en-IN")}
                      </td>
                      <td className="px-4 py-4 align-top text-sm font-semibold text-slate-900">
                        ₹
                        {Number(
                          loan.summary?.outstandingPrincipal ?? loan.loanAmount,
                        ).toLocaleString("en-IN")}
                      </td>
                      <td className="px-4 py-4 align-top text-sm text-slate-600">
                        {loan.interestRate ? `${loan.interestRate}%` : "—"}
                      </td>
                      <td className="px-4 py-4 align-top text-sm text-slate-600">
                        {loan.loanDate
                          ? new Date(loan.loanDate).toLocaleDateString("en-IN")
                          : "—"}
                      </td>
                      <td className="px-4 py-4 align-top text-center">
                        {statusBadge(
                          loan.loanStatus?.statusCode,
                          loan.loanStatus?.statusName,
                        )}
                      </td>
                      {isClient && canEdit && (
                        <td className="px-4 py-4 text-right align-top">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push(`/dashboard/loans/${loan.id}`);
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
                                router.push(`/dashboard/loans/edit/${loan.id}`);
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
                                setDeleteTarget(loan);
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
                <h3 className="text-lg font-semibold text-slate-900">Delete Loan</h3>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Are you sure you want to delete the loan for policy{" "}
                  <strong className="text-slate-800">
                    {deleteTarget.policy?.policyNumber || deleteTarget.id}
                  </strong>
                  ?
                </p>
                <p className="mt-2 text-xs font-medium text-amber-600">
                  Note: Loans with recorded repayments cannot be deleted.
                </p>
              </div>
            </div>
            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                disabled={isDeleting}
                onClick={() => setDeleteTarget(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                disabled={isDeleting}
                onClick={handleDelete}
                className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 shadow-sm transition-colors"
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

