"use client";
import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useRouter } from "next/navigation";
import { CalendarDays, IceCream, Plus, Search, WalletCards , Eye , Edit, Trash2 } from "lucide-react";
import type { AppDispatch, RootState } from "@/store/store";
import {
  deletePremiumPayment,
  fetchPremiumPayments,
  type PremiumPayment,
} from "@/features/premiumPayments/premiumPaymentSlice";
import toast from "react-hot-toast";
import { Seal } from "@/features/customers/pages/CustomerListPage";

const money = (v: number | undefined | null) => `
₹${Number(v ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const dt = (v?: string | null) =>
  v ? new Date(v).toLocaleDateString("en-IN") : "—";
export default function PremiumPaymentsPage() {
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  const { payments, isLoading, error } = useSelector(
    (s: RootState) => s.premiumPayments,
  );
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [paymentToDelete, setPaymentToDelete] = useState<PremiumPayment | null>(null);

  useEffect(() => {
    dispatch(fetchPremiumPayments());
  }, [dispatch]);
  useEffect(() => {
    if (error) toast.error(error);
  }, [error]);
  const filtered = useMemo(
    () =>
      payments.filter((p) => {
        const q = search.toLowerCase(),
          policy = p.policy?.policyNumber ?? "",
          customer = p.policy?.CustomerMaster
            ? `${p.policy.CustomerMaster.firstName} ${p.policy.CustomerMaster.lastName ?? ""}`
            : "";
        return (
          (!q ||
            policy.toLowerCase().includes(q) ||
            customer.toLowerCase().includes(q)) &&
          (status === "ALL" || p.paymentStatus?.statusCode === status)
        );
      }),
    [payments, search, status],
  );
  const stats = useMemo(
    () => ({
      total: payments.length,
      paid: payments.filter((p) => p.paymentStatus?.statusCode === "PAID")
        .length,
      unpaid: payments.filter((p) => p.paymentStatus?.statusCode === "UNPAID")
        .length,
      amount: payments.reduce((s, p) => s + Number(p.premiumAmount || 0), 0),
    }),
    [payments],
  );
  const badge = (p: PremiumPayment) =>
    p.paymentStatus?.statusCode === "PAID"
      ? "bg-emerald-100 text-emerald-700"
      : "bg-amber-100 text-amber-700";
      
  const handleDeletePayment = (payment: PremiumPayment) => {
    setPaymentToDelete(payment);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!paymentToDelete) return;
   try {
     await dispatch(deletePremiumPayment(paymentToDelete.id)).unwrap();
      toast.success("Premium payment deleted successfully.");
   } catch (message) {
      toast.error(String(message || "Failed to delete premium payment."));
    } finally {
      setShowDeleteModal(false);
      setPaymentToDelete(null);
    }
  };

  const totalPages = Math.max(
        1,
        Math.ceil(filtered.length / itemsPerPage),
      );
      const safePage = Math.min(currentPage, totalPages);
      const paginatedPolicies = filtered.slice(
        (safePage - 1) * itemsPerPage,
        safePage * itemsPerPage,
      );
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-2xl border border-blue-100 bg-[#f0f7ff] p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-b from-[#1e3a8a] to-[#2563eb] text-white shadow-lg shadow-blue-200/50">
            <WalletCards size={20} />
          </span>
          <div>
            <h1 className="font-serif text-2xl font-semibold text-slate-900">
              Premium Payments
            </h1>
            <p className="text-sm text-slate-500">
              View and manage policy premium installments.
            </p>
          </div>
        </div>
        <button
          onClick={() => router.push("/dashboard/premium-payments/new")}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#5c67ff] to-[#3a47ff] px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-200 transition-all hover:brightness-110 active:scale-[0.98] cursor-pointer"
        >
          <Plus size={18} />
          New Payment
        </button>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Total Payments", stats.total],
          ["Paid", stats.paid],
          ["Unpaid", stats.unpaid],
          ["Premium Amount", money(stats.amount)],
        ].map(([l, v]) => (
          <div
            key={String(l)}
            className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden"
          >
            <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#1877F2] via-[#1877F2]/40 to-transparent" />
            <div>
              <p className="text-sm font-semibold text-slate-500">
                {l}
              </p>
              <p className="mt-1 text-2xl font-bold text-slate-900">
                {isLoading ? "…" : v}
              </p>
            </div>
          </div>
        ))}
      </div>
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
              placeholder="Search policy or customer"
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pl-9 pr-3 text-sm focus:border-[#1877F2] focus:bg-white focus:ring-2 focus:ring-blue-500/15 outline-none transition-all"
            />
          </div>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2.5 text-sm focus:border-[#1877F2] focus:bg-white focus:ring-2 focus:ring-blue-500/15 outline-none transition-all"
          >
            <option value="ALL">All Statuses</option>
            <option value="PAID">Paid</option>
            <option value="UNPAID">Unpaid</option>
          </select>
        </div>
      </div>
      <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#1877F2] via-[#1877F2]/40 to-transparent" />
        <div className="overflow-x-auto mt-2">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50/70">
              <tr>
                {[
                  "Policy",
                  "Customer",
                  "Installment",
                  "Due Date",
                  "Paid Date",
                  "Amount",
                  "Late Fee",
                  "Status",
                  "Actions"
                ].map((h) => (
                  <th key={h} className="sticky top-0 z-10 border-b border-slate-100 px-5 py-3 text-left text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center">
                    Loading payments…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-5 py-12 text-center text-slate-500"
                  >
                    No premium payments found.
                  </td>
                </tr>
              ) : (
                filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="px-5 py-4 font-semibold">
                      {p.policy?.policyNumber ?? "—"}
                    </td>
                    <td className="px-5 py-4 text-slate-600">
                      {/* {p.policy?.CustomerMaster
                        ? `${p.policy.CustomerMaster.firstName} ${p.policy.CustomerMaster.lastName ?? ""}`
                        : "—"} */}
                        <div className="flex gap-3 items-center">
                        <Seal name={`${p.policy?.CustomerMaster?.firstName} ${p.policy?.CustomerMaster?.lastName ?? ""}` || "—"} size={34} />
                        <span className="text-sm text-slate-600">
                          {`${p.policy?.CustomerMaster?.firstName} ${p.policy?.CustomerMaster?.lastName ?? ""}` || "—"}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-4">#{p.installmentNo ?? "—"}</td>
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center gap-1">                    
                        {dt(p.dueDate)}
                      </span>
                    </td>
                    <td className="px-5 py-4">{dt(p.paidDate)}</td>
                    <td className="px-5 py-4 font-semibold">
                      {money(p.premiumAmount)}
                    </td>
                    <td className="px-5 py-4 font-semibold">
                      {money(p.lateFee)}
                    </td>                
                    <td className="px-5 py-4">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${badge(p)}`}
                      >
                        {p.paymentStatus?.statusName ??
                          p.paymentStatus?.statusCode ??
                          "Unknown"}
                      </span>
                    </td>
                    <td>
                      <button
                        onClick={() =>
                          router.push(`/dashboard/premium-payments/${p.id}`)
                        }
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                        title="View"
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        onClick={() =>
                          router.push(`/dashboard/premium-payments/edit/${p.id}`)
                        }
                        className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                        title="Edit"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleDeletePayment(p)}
                        className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                        title="Delete"
                        type="button"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>   

      {/* Delete Confirmation Modal */}
      {showDeleteModal && paymentToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => {
              setShowDeleteModal(false);
              setPaymentToDelete(null);
            }}
          />
          <div className="relative z-10 w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
            <h3 className="text-lg font-semibold">Confirm Delete</h3>
            <p className="mt-3 text-sm text-slate-600">
              Delete installment #{paymentToDelete.installmentNo } for Policy #{""}
            <span className="font-medium">
                {paymentToDelete.policy?.policyNumber ?? "this policy"}
              </span>
              ? This action cannot be undone.
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setPaymentToDelete(null);
               }}
                className="rounded-md border px-4 py-2 text-sm cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="rounded-md bg-rose-600 px-4 py-2 text-sm text-white cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
       </div>
      )}
      <div className="flex flex-col md:flex-row items-center justify-between px-4 py-3">
          {/* Left */}
          <p className="text-sm text-slate-500">
            Showing{" "}
            {filtered.length === 0
              ? 0
              : (currentPage - 1) * itemsPerPage + 1}
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
    </div>
    
  );
}
