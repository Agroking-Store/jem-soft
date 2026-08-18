"use client";

import { useState, useEffect, useMemo } from "react";
import { useSelector, useDispatch } from "react-redux";
import type { RootState, AppDispatch } from "@/store/store";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useRouter } from "next/navigation";
import { Seal } from "@/features/customers/pages/CustomerListPage";
import {
  Plus,
  Search,
  Eye,
  Edit,
  Trash2,
  AlertCircle,
  Landmark,
  HandCoins,
  Banknote,
  Activity,
} from "lucide-react";
import { fetchLoans, deleteLoan } from "@/features/loans/loanSlice";
import toast from "react-hot-toast";

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

  const canEdit = user?.role === "ADMIN" || user?.role === "ADVISOR";

  const { loans, isLoading } = useSelector((state: RootState) => state.loans);

  const [currentPage, setCurrentPage] = useState(1);

  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    dispatch(fetchLoans());
  }, [dispatch]);


  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, customerFilter, fromDate, toDate, itemsPerPage]);

  const stats = useMemo(() => {
    const total = loans.length;

    const totalAmount = loans.reduce(
      (sum, loan) => sum + Number(loan.loanAmount || 0),
      0
    );

    const avgAmount =
      total > 0 ? totalAmount / total : 0;

    const activeLoans = loans.filter(
      (loan) =>
        loan.loanStatus?.statusName?.toLowerCase() === "active"
    ).length;

    return {
      total,
      totalAmount,
      avgAmount,
      activeLoans,
    };
  }, [loans]);



  const customers = [
    ...new Set(
      loans
        .map((loan) => {
          const customer = loan.policy?.CustomerMaster;

          return customer
            ? `${customer.firstName} ${customer.lastName}`
            : "";
        })
        .filter(Boolean)
    ),
  ];




  const filteredLoans = loans.filter((loan) => {
    const customer = loan.policy?.CustomerMaster;

    const customerName = customer
      ? `${customer.firstName} ${customer.lastName}`
      : "";

    const matchesSearch =
      loan.loanNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      loan.policy?.policyNumber
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      customerName.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === "ALL" ||
      loan.loanStatus?.statusName === statusFilter;

    const matchesCustomer =
      customerFilter === "ALL" ||
      customerName === customerFilter;

    const loanDate = loan.loanDate
      ? new Date(loan.loanDate)
      : null;

    const matchesFrom =
      !fromDate ||
      (loanDate && loanDate >= new Date(fromDate));

    const matchesTo =
      !toDate ||
      (loanDate && loanDate <= new Date(toDate));

    return (
      matchesSearch &&
      matchesStatus &&
      matchesCustomer &&
      matchesFrom &&
      matchesTo
    );
  });




  const totalPages = Math.ceil(filteredLoans.length / itemsPerPage);

  const paginatedLoans = filteredLoans.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );


  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const result = await dispatch(deleteLoan(deleteTarget.id)).unwrap();
      toast.success(`Loan ${result.loanNumber} deleted successfully.`);
    } catch (err: any) {
      toast.error(err?.message || err || "Failed to delete loan.");
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0B1220] text-[#E8C77A]">
          <Landmark />
        </span>
        <span>
          <h1 className="text-2xl font-serif font-semibold tracking-tight text-slate-900">
            Loans
          </h1>
        </span>
      </div>
        {isClient && canEdit && (
          <div className="flex gap-4">
            <button
              onClick={() => router.push("/dashboard/loans/new")}
              className="inline-flex items-center gap-2 rounded-xl bg-[#0B1220] px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-[#0B1220]/20 transition-colors hover:bg-[#16294D] cursor-pointer"
            >
              <Plus size={18} />
              New Loan
            </button>
            <button
              onClick={() => router.push("/dashboard/loans/repay")}
              className="inline-flex items-center gap-2 rounded-xl bg-[#0B1220] px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-[#0B1220]/20 transition-colors hover:bg-[#16294D] cursor-pointer"
            >
              <Plus size={18} />
              Repay Loan
            </button>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div
          className="bg-gradient-to-r from-[#0B1220] via-[#132342] to-[#16294D] p-6 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow cursor-pointer"
          onClick={() => router.push("/dashboard/loans")}
          role="button">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-md text-[#E8C77A] font-bold">
                Total Loans
              </p>
              <p className="text-2xl font-bold text-[#E8C77A]">
                {isLoading ? (
                  <span className="inline-block w-16 h-8 bg-slate-200 animate-pulse rounded"></span>
                ) : (
                  stats.total
                )}
              </p>
            </div>
            <div className="w-12 h-12 bg-slate-800 rounded-lg flex items-center justify-center">
              <Landmark className="w-6 h-6 text-[#E8C77A]" />
            </div>
          </div>
        </div>
        <div
          className="bg-gradient-to-r from-[#0B1220] via-[#132342] to-[#16294D] p-6 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow cursor-pointer"
          onClick={() => router.push("/dashboard/loans")}
          role="button">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-md text-[#E8C77A] font-bold">
                Total Loan Amount
              </p>
              <p className="text-2xl font-bold text-[#E8C77A]">
                {isLoading ? (
                  <span className="inline-block w-16 h-8 bg-slate-200 animate-pulse rounded"></span>
                ) : (
                  <span>₹ {stats.totalAmount.toLocaleString("en-IN")}</span>
                )}
              </p>
            </div>
            <div className="w-12 h-12 bg-slate-800 rounded-lg flex items-center justify-center">
              <HandCoins className="w-6 h-6 text-[#E8C77A]" />
            </div>
          </div>
        </div>

         <div
          className="bg-gradient-to-r from-[#0B1220] via-[#132342] to-[#16294D] p-6 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow cursor-pointer"
          onClick={() => router.push("/dashboard/loans")}
          role="button">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-md text-[#E8C77A] font-bold">
                Avg Loan Amount
              </p>
              <p className="text-2xl font-bold text-[#E8C77A]">
                {isLoading ? (
                  <span className="inline-block w-16 h-8 bg-slate-200 animate-pulse rounded"></span>
                ) : (
                  <span>₹{" "}
              {stats.avgAmount.toLocaleString("en-IN", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}</span>
                )}
              </p>
            </div>
            <div className="w-12 h-12 bg-slate-800 rounded-lg flex items-center justify-center">
              <Banknote className="w-6 h-6 text-[#E8C77A]" />
            </div>
          </div>
        </div>

        <div
          className="bg-gradient-to-r from-[#0B1220] via-[#132342] to-[#16294D] p-6 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow cursor-pointer"
          onClick={() => router.push("/dashboard/loans")}
          role="button">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-md text-[#E8C77A] font-bold">
                Active Loans
              </p>
              <p className="text-2xl font-bold text-[#E8C77A]">
                {isLoading ? (
                  <span className="inline-block w-16 h-8 bg-slate-200 animate-pulse rounded"></span>
                ) : (
                  stats.activeLoans
                )}
              </p>
            </div>
            <div className="w-12 h-12 bg-slate-800 rounded-lg flex items-center justify-center">
              <Activity className="w-6 h-6 text-[#E8C77A]" />
            </div>
          </div>
        </div>
      </div>


      <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6">
        <div className="flex flex-wrap items-end gap-4">

          {/* Search */}
          <div className="relative flex-1 min-w-[300px]">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by loan #, policy #, or customer..."
              className="w-full h-11 pl-10 pr-4 rounded-lg border border-slate-200 bg-white text-sm placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
            />
          </div>

          {/* Status */}
          <div className="flex flex-col">
            <label className="mb-1 text-xs font-medium text-slate-500">
              Status
            </label>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-11 w-40 rounded-lg border border-slate-200 bg-white px-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
            >
              <option value="ALL">All Status</option>
              <option value="Active">Active</option>
              <option value="Closed">Closed</option>
              <option value="Pending">Pending</option>
              <option value="Defaulted">Defaulted</option>
            </select>
          </div>

          {/* From Date */}
          <div className="flex flex-col">
            <label className="mb-1 text-xs font-medium text-slate-500">
              From
            </label>

            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="h-11 w-44 rounded-lg border border-slate-200 bg-white px-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
            />
          </div>

          {/* To Date */}
          <div className="flex flex-col">
            <label className="mb-1 text-xs font-medium text-slate-500">
              To
            </label>

            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="h-11 w-44 rounded-lg border border-slate-200 bg-white px-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
            />
          </div>

          {/* Customer */}
          <div className="flex flex-col">
            <label className="mb-1 text-xs font-medium text-slate-500">
              Customer
            </label>

            <select
              value={customerFilter}
              onChange={(e) => setCustomerFilter(e.target.value)}
              className="h-11 w-48 rounded-lg border border-slate-200 bg-white px-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
            >
              <option value="ALL">All Customers</option>

              {customers.map((customer) => (
                <option key={customer} value={customer}>
                  {customer}
                </option>
              ))}
            </select>
          </div>

          {/* Buttons */}
          <div className="ml-auto flex items-center gap-2">



            <button
              onClick={() => {
                setSearchTerm("");
                setStatusFilter("ALL");
                setCustomerFilter("ALL");
                setFromDate("");
                setToDate("");
              }}
              className="h-11 px-5 rounded-lg text-blue-600 text-sm font-medium hover:bg-blue-50 transition"
            >
              Reset
            </button>

          </div>

        </div>
      </div>




      {/* Table */}
      <section className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.05)]">
        <div className="flex flex-col gap-4 border-b border-slate-200 bg-slate-50/90 px-5 py-4">
          <h2 className="font-serif text-sm font-semibold uppercase tracking-[0.18em] text-slate-700">
            Loans
          </h2>
          <p className="block mt-1 text-sm text-slate-500">
            Browse all Loan records.
          </p>
        </div>
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#B8873A] via-[#B8873A]/40 to-transparent"></div>
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {/* <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Loan #
                </th> */}
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Policy #
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Loan Amount
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Interest Rate
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Loan Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Status
                </th>
                {isClient && canEdit && (
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {paginatedLoans.map((loan) => {
                const customer = loan.policy?.CustomerMaster;
                return (
                  <tr key={loan.id} className="hover:bg-slate-50 transition">
                    {/* <td className="px-4 py-3">
                      <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 font-mono text-xs font-semibold text-slate-700">
                        {loan.loanNumber || "—"}
                      </span>
                    </td> */}
                    <td className="px-4 py-3">
                      <span className="text-sm text-slate-600">
                        {loan.policy?.policyNumber || "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {/* <span className="text-sm text-slate-600">
                        {customer
                          ? `${customer.firstName} ${customer.lastName}`
                          : "—"}
                      </span> */}
                      <div className="flex gap-3 items-center text-left">
                        <span className="text-sm text-slate-600">
                          <Seal name={`${customer?.firstName} ${customer?.lastName}` || "-"} size={34} />
                        </span>
                        <span className="text-sm text-slate-600">
                          {customer
                          ? `${customer.firstName} ${customer.lastName}`
                          : "—"}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-medium text-slate-900">
                        ₹ {Number(loan.loanAmount).toLocaleString("en-IN")}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-slate-600">
                        {loan.interestRate ? `${loan.interestRate}%` : "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-slate-600">
                        {loan.loanDate
                          ? new Date(loan.loanDate).toLocaleDateString("en-IN")
                          : "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium
      ${loan.loanStatus?.statusName === "Active"
                            ? "bg-green-100 text-green-700"
                            : loan.loanStatus?.statusName === "Defaulted"
                              ? "bg-yellow-100 text-yellow-700"
                              : loan.loanStatus?.statusName === "Paid Off"
                                ? "bg-blue-100 text-blue-700"
                                : "bg-slate-100 text-slate-700"
                          }`}
                      >
                        {loan.loanStatus?.statusName || "Unknown"}
                      </span>
                    </td>
                    {isClient && canEdit && (
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() =>
                              router.push(`/dashboard/loans/${loan.id}`)
                            }
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                            title="View"
                          >
                            <Eye size={16} />
                          </button>
                          <button
                            onClick={() =>
                              router.push(`/dashboard/loans/edit/${loan.id}`)
                            }
                            className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition"
                            title="Edit"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(loan)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition"
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
          
        </div>
      </div>
</section>

      <div className="flex flex-col md:flex-row items-center justify-between px-4 py-3 border-t border-slate-200 bg-white">

        {/* Left */}
        <p className="text-sm text-slate-500">
          Showing{" "}
          {filteredLoans.length === 0
            ? 0
            : (currentPage - 1) * itemsPerPage + 1}
          {" - "}
          {Math.min(currentPage * itemsPerPage, filteredLoans.length)}
          {" of "}
          {filteredLoans.length} entries
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
                Math.min(totalPages, currentPage + 1)
              )
              .map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`w-9 h-9 rounded-lg border text-sm ${currentPage === page
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





      {/* Empty / Loading */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" />
          <p className="mt-4 text-sm text-slate-500">Loading loans...</p>
        </div>
      ) : (
        filteredLoans.length === 0 && (
          <div className="text-center py-12 bg-white rounded-xl border border-slate-200 mt-4">
            <Landmark size={48} className="mx-auto text-slate-300 mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              No Loans Found
            </h3>
            <p className="text-slate-500 text-sm">
              Try adjusting your search, or add a new loan.
            </p>
          </div>
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
                  Delete Loan
                </h3>
                <p className="text-xs text-slate-400">
                  This action cannot be undone
                </p>
              </div>
            </div>
            <p className="text-sm text-slate-600 mb-6 leading-relaxed">
              Are you sure you want to delete loan{" "}
              <strong>{deleteTarget.loanNumber || deleteTarget.id}</strong>?
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