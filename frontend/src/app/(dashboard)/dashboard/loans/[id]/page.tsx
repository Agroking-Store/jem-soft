"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch, RootState } from "@/store/store";
import {
  fetchLoanById,
  clearSelectedLoan,
} from "@/features/loans/loanSlice";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { ArrowLeft, Edit } from "lucide-react";
import { Input } from "@/shared/components/ui/Input";

export default function LoanDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useAuth();

  const id = params.id as string;

  const canEdit =
    user?.role === "ADMIN" || user?.role === "ADVISOR";

  const { selectedLoan, isLoading } = useSelector(
    (state: RootState) => state.loans
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
        <p className="mt-4 text-sm text-slate-500">
          Loading loan...
        </p>
      </div>
    );
  }

  const customer = selectedLoan.policy?.CustomerMaster;

  const detailFields = [
  { key: "totalLoanGranted", label: "Total Loan Granted" },
  { key: "prevLoanTaken", label: "Previous Loan Taken" },
  { key: "prevLoanInterestRate", label: "Previous Loan Interest Rate" },
  { key: "otherDeduction", label: "Other Deduction" },
  { key: "xChargeDeduction", label: "XCharge Deduction" },
  { key: "revivalDeduction", label: "Revival Deduction" },
  { key: "addDeposit", label: "Add Deposit" },
  { key: "netAmount", label: "Net Amount" },
  { key: "chequeAmount", label: "Cheque Amount" },
  { key: "repaymentDate", label: "Repayment Date" },
  { key: "loanRepaidAmount", label: "Loan Repaid Amount" },
  { key: "totalLoanAmount", label: "Total Loan Amount" },
  { key: "bpiInterest", label: "BPI Interest" },
  { key: "hlyInterest", label: "HLY Interest" },
  { key: "fuliDate", label: "Fuli Date" },
  { key: "repaymentRemarks", label: "Repayment Remarks" },
];

const formatLoanValue = (value: unknown) => {
  if (value === null || value === undefined || value === "") return "—";

  if (typeof value === "number") {
    return new Intl.NumberFormat("en-IN", {
      maximumFractionDigits: 2,
    }).format(value);
  }

  if (typeof value === "string" && !Number.isNaN(Date.parse(value))) {
    return new Date(value).toLocaleDateString("en-GB");
  }

  return String(value);
};

// const loanData = (loan ?? selectedLoan) as Record<string, unknown> | null;

  return (

    
    <div className="w-full">
      {/* Top */}

      <button
        onClick={() => router.push("/dashboard/loans")}
        className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 transition mb-4"
      >
        <ArrowLeft size={16} />
        Back to Loans
      </button>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">
          Loan Details
        </h1>

        <p className="text-slate-500 text-sm mt-1">
          View loan information
        </p>
      </div>

      {/* Card */}

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">

        {/* Header */}

        <div className="px-6 pt-6 pb-2">
          <h2 className="text-lg font-semibold text-slate-900">
            Loan Information
          </h2>
        </div>

        {/* Body */}

        <div className="p-6 space-y-5">

          {/* Policy */}

          <div>
            <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              Policy
            </label>

            <input
              type="text"
              disabled
              value={`${selectedLoan.policy?.policyNumber ?? ""}${customer
                  ? ` — ${customer.firstName} ${customer.lastName}`
                  : ""
                }`}
              className="mt-1.5 w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm"
            />
          </div>

          {/* Grid */}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">

            <Input
              label="Loan Number"
              value={selectedLoan.loanNumber || ""}
              disabled
            />

            <Input
              label="Loan Date"
              value={
                selectedLoan.loanDate
                  ? new Date(selectedLoan.loanDate)
                    .toISOString()
                    .slice(0, 10)
                  : ""
              }
              disabled
            />

            <Input
              label="Loan Amount (₹)"
              value={selectedLoan.loanAmount.toString()}
              disabled
            />

            <Input
              label="Interest Rate (%)"
              value={
                selectedLoan.interestRate?.toString() || ""
              }
              disabled
            />

            <Input
              label="Loan Tenure (Months)"
              value={
                selectedLoan.loanTenure?.toString() || ""
              }
              disabled
            />

            <div>
              <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                Loan Status
              </label>

              <input
                type="text"
                disabled
                value={
                  selectedLoan.loanStatus?.statusName || ""
                }
                className="mt-1.5 w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm"
              />
            </div>

            {/* Remarks */}

            <div className="sm:col-span-2">
              <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                Remarks (Optional)
              </label>

              <textarea
                rows={3}
                disabled
                value={selectedLoan.remarks || ""}
                className="mt-1.5 w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm resize-none"
              />
            </div>

          </div>
        </div>

        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6">
  <h2 className="text-lg font-semibold text-slate-900">Additional Loan Details</h2>

  <dl className="mt-4 grid gap-4 md:grid-cols-2">
    {detailFields.map(({ key, label }) => (
      <div
        key={key}
        className="rounded-xl border border-slate-100 bg-slate-50 p-3"
      >
        <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
          {label}
        </dt>
        <dd className="mt-1 text-sm font-semibold text-slate-900">
          {selectedLoan[key] ? formatLoanValue(selectedLoan[key]) : "—"}
        </dd>
      </div>
    ))}
  </dl>
</div>

        {/* Footer */}

        <div className="px-6 pb-6 pt-4 flex justify-end gap-3">

          <button
            onClick={() => router.push("/dashboard/loans")}
            className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
          >
            Back
          </button>

          {canEdit && (
            <button
              onClick={() =>
                router.push(
                  `/dashboard/loans/edit/${selectedLoan.id}`
                )
              }
              className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition"
            >
              <Edit className="w-4 h-4" />
              Edit Loan
            </button>
          )}

        </div>

      </div>
    </div>
  );
}