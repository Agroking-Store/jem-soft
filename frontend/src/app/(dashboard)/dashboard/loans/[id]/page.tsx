"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch, RootState } from "@/store/store";
import { fetchLoanById, clearSelectedLoan } from "@/features/loans/loanSlice";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { FileText, HandCoins, Receipt, SquarePen } from "lucide-react";
import {
  CustomerBreadcrumbs,
  CustomerSectionCard,
} from "@/features/customers/components/CustomerUi";

export default function LoanDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useAuth();

  const id = params.id as string;
  const canEdit = user?.role === "ADMIN" || user?.role === "ADVISOR";
  const { selectedLoan, isLoading } = useSelector(
    (state: RootState) => state.loans,
  );

  useEffect(() => {
    dispatch(fetchLoanById(id));
    return () => {
      dispatch(clearSelectedLoan());
    };
  }, [dispatch, id]);

  if (isLoading || !selectedLoan) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1877F2] mx-auto" />
        <p className="mt-4 text-sm text-slate-500">Loading loan...</p>
      </div>
    );
  }

  const customer = selectedLoan.policy?.CustomerMaster;
  const summary = selectedLoan.summary;
  const repayments = selectedLoan.repayments || [];
  const isActive = selectedLoan.loanStatus?.statusCode === "ACTIVE";

  const paymentModeLabel = (code: string) => {
    const map: Record<string, string> = {
      CASH: "Cash",
      CHEQUE: "Cheque",
      NEFT: "NEFT",
      UPI: "UPI",
      OTHER: "Other",
    };
    return map[code] || code;
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-8">
      <CustomerBreadcrumbs
        items={[
          { label: "Loans", href: "/dashboard/loans" },
          { label: "Loan Details" },
        ]}
      />

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0f172a]">
            Loan Details
          </h1>
          <p className="mt-1 text-sm font-medium text-slate-500">
            View complete loan information and repayment history.
          </p>
        </div>
        {isActive && canEdit && (
          <button
            onClick={() =>
              router.push(`/dashboard/loans/repay?loanId=${selectedLoan.id}`)
            }
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-emerald-200 transition-all hover:brightness-110 active:scale-[0.98]"
          >
            <HandCoins size={16} /> Record Repayment
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT: Loan Info */}
        <div className="lg:col-span-2 space-y-6">
          <CustomerSectionCard title="Loan Information" icon={FileText}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field
                label="Policy Number"
                value={selectedLoan.policy?.policyNumber}
                mono
              />
              <Field
                label="Loan Date"
                value={new Date(selectedLoan.loanDate).toLocaleDateString(
                  "en-IN",
                )}
              />
              <Field
                label="Customer Name"
                value={
                  customer ? `${customer.firstName} ${customer.lastName}` : "—"
                }
              />
              <Field
                label="Loan Amount"
                value={`₹${Number(selectedLoan.loanAmount).toLocaleString("en-IN")}`}
              />
              <Field
                label="Interest Rate (p.a.)"
                value={`${selectedLoan.interestRate}%`}
              />
              <Field
                label="Loan Status"
                value={selectedLoan.loanStatus?.statusName}
                badge={selectedLoan.loanStatus?.statusCode}
              />
              <div className="md:col-span-2">
                <Field label="Remarks" value={selectedLoan.remarks || "—"} />
              </div>
            </div>
          </CustomerSectionCard>

          {/* Repayment History */}
          <CustomerSectionCard title="Repayment History" icon={Receipt}>
            {repayments.length === 0 ? (
              <div className="text-center py-8">
                <Receipt size={40} className="mx-auto text-slate-300 mb-2" />
                <p className="text-sm text-slate-400 font-medium">
                  No repayments recorded yet.
                </p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-slate-200">
                <table className="min-w-full border-separate border-spacing-0 text-left text-sm">
                  <thead className="bg-slate-50/70 border-b border-slate-100">
                    <tr>
                      <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
                        Date
                      </th>
                      <th className="px-4 py-3 text-right text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
                        Amount
                      </th>
                      <th className="px-4 py-3 text-right text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
                        Principal
                      </th>
                      <th className="px-4 py-3 text-right text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
                        Interest
                      </th>
                      <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
                        Mode
                      </th>
                      <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
                        Ref #
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {repayments.map((r, index) => (
                      <tr
                        key={r.id}
                        className={`transition-colors hover:bg-blue-50/40 ${
                          index % 2 === 0 ? "bg-white" : "bg-slate-50/30"
                        }`}
                      >
                        <td className="px-4 py-3 text-slate-700">
                          {new Date(r.repaymentDate).toLocaleDateString(
                            "en-IN",
                          )}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-slate-900">
                          ₹{Number(r.repaymentAmount).toLocaleString("en-IN")}
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-slate-700">
                          ₹
                          {Number(r.principalComponent).toLocaleString("en-IN")}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-amber-700">
                          ₹{Number(r.interestComponent).toLocaleString("en-IN")}
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          {paymentModeLabel(r.paymentMode)}
                        </td>
                        <td className="px-4 py-3 text-slate-500 font-mono text-xs">
                          {r.referenceNumber || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CustomerSectionCard>
        </div>

        {/* RIGHT: Summary */}
        <div>
          <CustomerSectionCard title="Loan Summary" icon={HandCoins}>
            <div className="space-y-3">
              <SummaryRow
                label="Total Repaid"
                value={`₹${Number(summary?.totalRepaid || 0).toLocaleString("en-IN")}`}
              />
              <SummaryRow
                label="Principal Repaid"
                value={`₹${Number(summary?.totalPrincipalRepaid || 0).toLocaleString("en-IN")}`}
              />
              <SummaryRow
                label="Interest Paid"
                value={`₹${Number(summary?.totalInterestPaid || 0).toLocaleString("en-IN")}`}
              />
              <div className="border-t border-slate-100 pt-3 space-y-3">
                <SummaryRow
                  label="Outstanding Principal"
                  value={`₹${Number(summary?.outstandingPrincipal || 0).toLocaleString("en-IN")}`}
                  highlight
                />
                <SummaryRow
                  label="Accrued Interest (Today)"
                  value={`₹${Number(summary?.accruedInterest || 0).toLocaleString("en-IN")}`}
                  amber
                />
                <div className="mt-4 rounded-2xl bg-gradient-to-b from-[#1e3a8a] to-[#2563eb] p-5 text-white shadow-lg shadow-blue-200/50">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-blue-200 mb-1">
                    Total Due (as of today)
                  </p>
                  <p className="text-2xl font-bold tracking-tight text-white">
                    ₹{Number(summary?.totalDue || 0).toLocaleString("en-IN")}
                  </p>
                </div>
              </div>
            </div>
          </CustomerSectionCard>
        </div>
      </div>

      {/* Footer */}
      <div className="pt-4 flex justify-end gap-3">
        <button
          onClick={() => router.push("/dashboard/loans")}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
        >
          Back
        </button>
        {canEdit && (
          <button
            onClick={() =>
              router.push(`/dashboard/loans/edit/${selectedLoan.id}`)
            }
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#5c67ff] to-[#3a47ff] px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-200 transition-all hover:brightness-110 active:scale-[0.98]"
          >
            <SquarePen size={16} />
            Edit Loan
          </button>
        )}
      </div>
    </div>
  );
}

/* ── Helpers ────────────────────────────────────────── */

function Field({
  label,
  value,
  mono,
  badge,
}: {
  label: string;
  value?: string | null;
  mono?: boolean;
  badge?: string;
}) {
  const badgeColors: Record<string, string> = {
    ACTIVE: "bg-emerald-50 text-emerald-700 border-emerald-200",
    PAID_OFF: "bg-blue-50 text-[#1877F2] border-blue-200",
    DEFAULTED: "bg-rose-50 text-rose-700 border-rose-200",
    CLOSED: "bg-slate-50 text-slate-600 border-slate-200",
  };
  return (
    <div className="flex flex-col rounded-xl border border-[#F1F3F6] bg-[#F8F9FB] p-3.5 transition-all duration-200 hover:border-blue-100 hover:bg-white hover:shadow-sm">
      <span className="text-[10px] font-bold uppercase tracking-wider text-[#8E99AF] mb-1">
        {label}
      </span>
      {badge ? (
        <div>
          <span
            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${badgeColors[badge] || "bg-slate-50 text-slate-700 border-slate-200"}`}
          >
            {value || "—"}
          </span>
        </div>
      ) : (
        <span
          className={`text-[13px] font-semibold break-words text-[#2D3748] ${mono ? "font-mono" : ""}`}
        >
          {value || "—"}
        </span>
      )}
    </div>
  );
}

function SummaryRow({
  label,
  value,
  highlight,
  amber,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  amber?: boolean;
}) {
  return (
    <div className="flex justify-between items-center py-1">
      <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#8E99AF]">
        {label}
      </span>
      <span
        className={`text-sm font-semibold ${
          highlight
            ? "text-[#0f172a] font-bold"
            : amber
              ? "text-amber-700 font-bold"
              : "text-slate-700"
        }`}
      >
        {value}
      </span>
    </div>
  );
}
