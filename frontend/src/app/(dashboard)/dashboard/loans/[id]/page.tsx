"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch, RootState } from "@/store/store";
import { fetchLoanById, clearSelectedLoan } from "@/features/loans/loanSlice";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { ArrowLeft, Edit, Landmark } from "lucide-react";

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
        {label}
      </span>
      <span className="text-sm text-slate-900">{value ?? "—"}</span>
    </div>
  );
}

export default function LoanDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useAuth();

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

  return (
    <div className="max-w-3xl mx-auto">
      <button
        onClick={() => router.push("/dashboard/loans")}
        className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 mb-4 transition"
      >
        <ArrowLeft size={16} />
        Back to Loans
      </button>

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 rounded-xl">
            <Landmark size={22} className="text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              {selectedLoan.loanNumber || "Loan Details"}
            </h1>
            <p className="text-slate-500 text-sm">
              Policy {selectedLoan.policy?.policyNumber || "—"}
            </p>
          </div>
        </div>
        {canEdit && (
          <button
            onClick={() => router.push(`/dashboard/loans/edit/${selectedLoan.id}`)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-all"
          >
            <Edit size={16} />
            Edit
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
        <DetailRow
          label="Customer"
          value={customer ? `${customer.firstName} ${customer.lastName}` : "—"}
        />
        <DetailRow label="Policy Number" value={selectedLoan.policy?.policyNumber} />
        <DetailRow
          label="Loan Amount"
          value={`₹ ${Number(selectedLoan.loanAmount).toLocaleString("en-IN")}`}
        />
        <DetailRow
          label="Interest Rate"
          value={selectedLoan.interestRate ? `${selectedLoan.interestRate}%` : "—"}
        />
        <DetailRow
          label="Loan Date"
          value={
            selectedLoan.loanDate
              ? new Date(selectedLoan.loanDate).toLocaleDateString("en-IN")
              : "—"
          }
        />
        <DetailRow label="Status" value={selectedLoan.loanStatus?.statusName} />
        <DetailRow
          label="Created At"
          value={
            selectedLoan.createdAt
              ? new Date(selectedLoan.createdAt).toLocaleDateString("en-IN")
              : "—"
          }
        />
        <DetailRow
          label="Updated At"
          value={
            selectedLoan.updatedAt
              ? new Date(selectedLoan.updatedAt).toLocaleDateString("en-IN")
              : "—"
          }
        />
      </div>
    </div>
  );
}