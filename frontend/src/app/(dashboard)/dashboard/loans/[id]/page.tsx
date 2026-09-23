"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch, RootState } from "@/store/store";
import { fetchLoanById, clearSelectedLoan } from "@/features/loans/loanSlice";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { Edit, FileText, HandCoins, Receipt, Landmark } from "lucide-react";
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" />
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
    <div className="max-w-7xl mx-auto space-y-6">
      <CustomerBreadcrumbs
        items={[
          { label: "Loans", href: "/dashboard/loans" },
          { label: "Loan Details" },
        ]}
      />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-2xl border border-blue-100 bg-[#f0f7ff] p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-b from-[#1e3a8a] to-[#2563eb] text-white shadow-lg shadow-blue-200/50">
            <Landmark size={24} />
          </span>
          <div>
            <h1 className="font-serif text-2xl font-semibold text-slate-900">
              Loan #{selectedLoan.policy?.policyNumber || id.slice(0, 8)}
            </h1>
            <p className="text-sm text-slate-500">
              View complete loan information and repayment history.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {canEdit && (
            <button
              onClick={() =>
                router.push(`/dashboard/loans/edit/${selectedLoan.id}`)
              }
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 active:scale-[0.98] cursor-pointer"
            >
              <Edit size={16} /> Edit Loan
            </button>
          )}
          {isActive && canEdit && (
            <button
              onClick={() =>
                router.push(`/dashboard/loans/repay?loanId=${selectedLoan.id}`)
              }
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#5c67ff] to-[#3a47ff] px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-200 transition-all hover:brightness-110 active:scale-[0.98] cursor-pointer"
            >
              <HandCoins size={18} /> Record Repayment
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT: Loan Info */}
        <div className="lg:col-span-2 space-y-6">
          <CustomerSectionCard title="Loan Information" icon={FileText}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                <p className="text-sm text-slate-500">
                  No repayments recorded yet.
                </p>
              </div>
            ) : (
              <div className="mt-3 border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">
                        Date
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-slate-500 uppercase">
                        Amount
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-slate-500 uppercase">
                        Principal
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-slate-500 uppercase">
                        Interest
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">
                        Mode
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">
                        Ref #
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {repayments.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 text-slate-700">
                          {new Date(r.repaymentDate).toLocaleDateString(
                            "en-IN",
                          )}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-slate-900">
                          ₹{Number(r.repaymentAmount).toLocaleString("en-IN")}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-700">
                          ₹
                          {Number(r.principalComponent).toLocaleString("en-IN")}
                        </td>
                        <td className="px-4 py-3 text-right text-amber-700">
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
            <div className="space-y-4">
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
              <div className="border-t border-slate-200 pt-4">
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
                <div className="mt-3 p-3 bg-slate-900 rounded-lg">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#E8C77A] mb-1">
                    Total Due (as of today)
                  </p>
                  <p className="text-xl font-bold text-white">
                    ₹{Number(summary?.totalDue || 0).toLocaleString("en-IN")}
                  </p>
                </div>
              </div>
            </div>
          </CustomerSectionCard>
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 pb-6 pt-4 flex justify-end gap-3 border-t border-slate-100">
        <button
          onClick={() => router.push("/dashboard/loans")}
          className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
        >
          Back
        </button>
        {canEdit && (
          <button
            onClick={() =>
              router.push(`/dashboard/loans/edit/${selectedLoan.id}`)
            }
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#5c67ff] to-[#3a47ff] px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-200 transition-all hover:brightness-110 active:scale-[0.98] cursor-pointer"
          >
            <Edit className="w-4 h-4" />
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
    ACTIVE: "bg-green-100 text-green-700",
    PAID_OFF: "bg-blue-100 text-blue-700",
    DEFAULTED: "bg-red-100 text-red-700",
    CLOSED: "bg-slate-100 text-slate-600",
  };
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 mb-1">
        {label}
      </p>
      {badge ? (
        <span
          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${badgeColors[badge] || "bg-slate-100"}`}
        >
          {value || "—"}
        </span>
      ) : (
        <p
          className={`font-semibold text-slate-900 ${mono ? "font-mono" : ""}`}
        >
          {value || "—"}
        </p>
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
    <div className="flex justify-between items-center">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
        {label}
      </p>
      <p
        className={`font-semibold text-sm ${
          highlight
            ? "text-slate-900"
            : amber
              ? "text-amber-700"
              : "text-slate-700"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
