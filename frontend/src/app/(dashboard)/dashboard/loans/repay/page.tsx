"use client";

import { useState, useEffect, FormEvent, useMemo, Suspense } from "react";
import { useSelector, useDispatch } from "react-redux";
import type { RootState, AppDispatch } from "@/store/store";
import { useRouter, useSearchParams } from "next/navigation";
import {
  fetchLoans,
  fetchLoanById,
  type Loan,
} from "@/features/loans/loanSlice";
import { createRepayment } from "@/features/loans/loanRepaymentSlice";
import toast from "react-hot-toast";
import {
  Save,
  Loader2,
  FileText,
  HandCoins,
  AlertTriangle,
} from "lucide-react";
import {
  CustomerSectionCard,
  CustomerBreadcrumbs,
} from "@/features/customers/components/CustomerUi";

const PAYMENT_MODES = [
  { code: "CASH", label: "Cash" },
  { code: "CHEQUE", label: "Cheque" },
  { code: "NEFT", label: "NEFT" },
  { code: "UPI", label: "UPI" },
  { code: "OTHER", label: "Other" },
];

interface FormState {
  loanId: string;
  repaymentDate: string;
  repaymentAmount: string;
  paymentMode: string;
  referenceNumber: string;
  remarks: string;
}

const emptyForm: FormState = {
  loanId: "",
  repaymentDate: new Date().toISOString().slice(0, 10),
  repaymentAmount: "",
  paymentMode: "",
  referenceNumber: "",
  remarks: "",
};

const inputClass =
  "w-full rounded-xl border border-slate-200 py-2.5 px-3 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 hover:border-slate-300 focus:border-[#B8873A] focus:ring-2 focus:ring-[#B8873A]/20";
const labelClass =
  "mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500";

function RepayFormInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dispatch = useDispatch<AppDispatch>();

  const preselectedLoanId = searchParams.get("loanId") || "";

  const { loans, selectedLoan } = useSelector(
    (state: RootState) => state.loans,
  );
  const { isSubmitting } = useSelector(
    (state: RootState) => state.loanRepayments,
  );

  const [form, setForm] = useState<FormState>({
    ...emptyForm,
    loanId: preselectedLoanId,
  });
  const [errors, setErrors] = useState<
    Partial<Record<keyof FormState, string>>
  >({});

  useEffect(() => {
    dispatch(fetchLoans());
  }, [dispatch]);

  useEffect(() => {
    if (form.loanId) {
      dispatch(fetchLoanById(form.loanId));
    }
  }, [form.loanId, dispatch]);

  // Only active loans are eligible for repayment
  const activeLoans = useMemo(
    () => loans.filter((l) => l.loanStatus?.statusCode === "ACTIVE"),
    [loans],
  );

  const currentLoan: Loan | null =
    selectedLoan?.id === form.loanId ? selectedLoan : null;

  const outstandingPrincipal = currentLoan?.summary?.outstandingPrincipal ?? 0;
  const accruedInterest = currentLoan?.summary?.accruedInterest ?? 0;
  const totalDue = currentLoan?.summary?.totalDue ?? 0;

  // Preview split
  const repayAmountNum = Number(form.repaymentAmount) || 0;
  const previewInterest = Math.min(repayAmountNum, accruedInterest);
  const previewPrincipal = Math.max(0, repayAmountNum - previewInterest);
  const newOutstanding = Math.max(0, outstandingPrincipal - previewPrincipal);

  const handleChange = (field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const validate = (): boolean => {
    const e: Partial<Record<keyof FormState, string>> = {};

    if (!form.loanId) e.loanId = "Please select a loan";
    if (!form.repaymentDate) {
      e.repaymentDate = "Repayment date is required";
    } else if (new Date(form.repaymentDate) > new Date()) {
      e.repaymentDate = "Cannot be in the future";
    } else if (
      currentLoan &&
      new Date(form.repaymentDate) < new Date(currentLoan.loanDate)
    ) {
      e.repaymentDate = "Cannot be before loan date";
    }

    if (!form.repaymentAmount) {
      e.repaymentAmount = "Repayment amount is required";
    } else if (repayAmountNum <= 0) {
      e.repaymentAmount = "Must be greater than zero";
    } else if (repayAmountNum > totalDue + 0.5) {
      e.repaymentAmount = `Cannot exceed total due (₹${totalDue.toLocaleString("en-IN")})`;
    }

    if (!form.paymentMode) e.paymentMode = "Payment mode is required";

    if (form.paymentMode !== "CASH" && !form.referenceNumber.trim()) {
      e.referenceNumber = "Reference number is required for non-cash payments";
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      toast.error("Please fix the highlighted fields.");
      return;
    }

    try {
      await dispatch(
        createRepayment({
          loanId: form.loanId,
          data: {
            repaymentDate: form.repaymentDate,
            repaymentAmount: repayAmountNum,
            paymentMode: form.paymentMode,
            referenceNumber: form.referenceNumber || undefined,
            remarks: form.remarks || undefined,
          },
        }),
      ).unwrap();

      toast.success("Repayment recorded successfully.");
      router.push(`/dashboard/loans/${form.loanId}`);
    } catch (err: any) {
      toast.error(err?.message || err || "Failed to record repayment.");
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <CustomerBreadcrumbs
        items={[
          { label: "Loans", href: "/dashboard/loans" },
          { label: "Record Repayment" },
        ]}
      />

      <div>
        <h1 className="mt-2 font-serif text-2xl font-semibold tracking-tight sm:text-[28px] text-slate-900">
          Record Loan Repayment
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
          Record a repayment against an active loan. Interest is auto-calculated
          from the last payment date.
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <CustomerSectionCard title="Select Loan" icon={FileText}>
          <div className="w-full sm:w-1/2">
            <label className={labelClass}>
              Active Loan <span className="text-rose-500">*</span>
            </label>
            <select
              value={form.loanId}
              onChange={(e) => handleChange("loanId", e.target.value)}
              className={inputClass}
              disabled={!!preselectedLoanId}
            >
              <option value="">Select an active loan</option>
              {activeLoans.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.policy?.policyNumber} —{" "}
                  {l.policy?.CustomerMaster?.firstName}{" "}
                  {l.policy?.CustomerMaster?.lastName} (₹
                  {Number(l.loanAmount).toLocaleString("en-IN")})
                </option>
              ))}
            </select>
            {errors.loanId && (
              <p className="mt-1 text-xs text-rose-600">{errors.loanId}</p>
            )}
            {activeLoans.length === 0 && (
              <p className="mt-2 text-xs text-slate-500">
                No active loans available for repayment.
              </p>
            )}
          </div>

          {/* Loan Info */}
          {currentLoan && (
            <>
              <div className="mt-5 border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">
                        Policy #
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">
                        Loan Amount
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">
                        Outstanding
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">
                        Accrued Interest
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">
                        Total Due
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">
                        Rate
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    <tr>
                      <td className="px-4 py-3 text-sm font-semibold text-slate-900 font-mono">
                        {currentLoan.policy?.policyNumber}
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-slate-900">
                        ₹
                        {Number(currentLoan.loanAmount).toLocaleString("en-IN")}
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-slate-900">
                        ₹{outstandingPrincipal.toLocaleString("en-IN")}
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-amber-700">
                        ₹{accruedInterest.toLocaleString("en-IN")}
                      </td>
                      <td className="px-4 py-3 text-sm font-bold text-emerald-700">
                        ₹{totalDue.toLocaleString("en-IN")}
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-slate-900">
                        {currentLoan.interestRate}%
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Repayment Fields */}
              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className={labelClass}>
                    Repayment Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={form.repaymentDate}
                    onChange={(e) =>
                      handleChange("repaymentDate", e.target.value)
                    }
                    className={inputClass}
                    max={new Date().toISOString().slice(0, 10)}
                  />
                  {errors.repaymentDate && (
                    <p className="mt-1 text-xs text-rose-600">
                      {errors.repaymentDate}
                    </p>
                  )}
                </div>

                <div>
                  <label className={labelClass}>
                    Repayment Amount (₹){" "}
                    <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    placeholder={`Max: ₹${totalDue.toLocaleString("en-IN")}`}
                    value={form.repaymentAmount}
                    onChange={(e) =>
                      handleChange("repaymentAmount", e.target.value)
                    }
                    className={inputClass}
                  />
                  {errors.repaymentAmount && (
                    <p className="mt-1 text-xs text-rose-600">
                      {errors.repaymentAmount}
                    </p>
                  )}
                </div>

                <div>
                  <label className={labelClass}>
                    Payment Mode <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={form.paymentMode}
                    onChange={(e) =>
                      handleChange("paymentMode", e.target.value)
                    }
                    className={inputClass}
                  >
                    <option value="">Select mode</option>
                    {PAYMENT_MODES.map((m) => (
                      <option key={m.code} value={m.code}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                  {errors.paymentMode && (
                    <p className="mt-1 text-xs text-rose-600">
                      {errors.paymentMode}
                    </p>
                  )}
                </div>

                <div>
                  <label className={labelClass}>
                    Reference Number{" "}
                    {form.paymentMode && form.paymentMode !== "CASH" && (
                      <span className="text-rose-500">*</span>
                    )}
                  </label>
                  <input
                    type="text"
                    placeholder="Cheque no. / UTR / Txn ID"
                    value={form.referenceNumber}
                    onChange={(e) =>
                      handleChange("referenceNumber", e.target.value)
                    }
                    className={inputClass}
                    disabled={form.paymentMode === "CASH"}
                  />
                  {errors.referenceNumber && (
                    <p className="mt-1 text-xs text-rose-600">
                      {errors.referenceNumber}
                    </p>
                  )}
                </div>

                <div className="md:col-span-2">
                  <label className={labelClass}>Remarks (Optional)</label>
                  <textarea
                    rows={3}
                    placeholder="Enter any notes..."
                    value={form.remarks}
                    onChange={(e) => handleChange("remarks", e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none resize-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>

              {/* Live Preview */}
              {repayAmountNum > 0 && (
                <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <HandCoins className="w-5 h-5 text-emerald-700" />
                    <h4 className="text-sm font-semibold text-emerald-900 uppercase tracking-wider">
                      Payment Preview
                    </h4>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                    <PreviewCell
                      label="Interest Component"
                      value={`₹${previewInterest.toLocaleString("en-IN")}`}
                      color="amber"
                    />
                    <PreviewCell
                      label="Principal Component"
                      value={`₹${previewPrincipal.toLocaleString("en-IN")}`}
                      color="blue"
                    />
                    <PreviewCell
                      label="New Outstanding"
                      value={`₹${newOutstanding.toLocaleString("en-IN")}`}
                      color="emerald"
                    />
                  </div>
                  {newOutstanding <= 0.5 && (
                    <div className="mt-3 flex items-center gap-2 text-xs text-emerald-800 bg-emerald-100 rounded-lg px-3 py-2">
                      <AlertTriangle size={14} />
                      This payment will fully close the loan. Status will change
                      to <b>Paid Off</b>.
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {!form.loanId && (
            <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-600">
              Select a loan to begin recording a repayment.
            </div>
          )}
        </CustomerSectionCard>

        {currentLoan && (
          <div className="px-6 pb-6 pt-4 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => router.push("/dashboard/loans")}
              className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-sm font-medium transition disabled:opacity-60"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Record Repayment
            </button>
          </div>
        )}
      </form>
    </div>
  );
}

function PreviewCell({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: "amber" | "blue" | "emerald";
}) {
  const colors = {
    amber: "text-amber-700",
    blue: "text-blue-700",
    emerald: "text-emerald-700",
  };
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 mb-1">
        {label}
      </p>
      <p className={`font-bold text-lg ${colors[color]}`}>{value}</p>
    </div>
  );
}

export default function RepayLoanPage() {
  return (
    <Suspense
      fallback={
        <div className="text-center py-12 text-slate-500">Loading...</div>
      }
    >
      <RepayFormInner />
    </Suspense>
  );
}
