"use client";
import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useRouter } from "next/navigation";
import { CalendarDays, Plus, Search, WalletCards } from "lucide-react";
import type { AppDispatch, RootState } from "@/store/store";
import {
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
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0B1220] text-[#E8C77A]">
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
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0B1220] px-4 py-2.5 text-sm font-semibold text-white cursor-pointer"
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
            className="rounded-xl bg-gradient-to-r from-[#0B1220] via-[#132342] to-[#16294D] p-5"
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
              className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-[#B8873A]"
            />
          </div>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
          >
            <option value="ALL">All Statuses</option>
            <option value="PAID">Paid</option>
            <option value="UNPAID">Unpaid</option>
          </select>
        </div>
      </div>
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
              <tr>
                {[
                  "Policy",
                  "Customer",
                  "Installment",
                  "Due Date",
                  "Amount",
                  "Status",
                  "Paid Date",
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
                        <CalendarDays size={14} />
                        {dt(p.dueDate)}
                      </span>
                    </td>
                    <td className="px-5 py-4 font-semibold">
                      {money(p.premiumAmount)}
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
                    <td className="px-5 py-4">{dt(p.paidDate)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
