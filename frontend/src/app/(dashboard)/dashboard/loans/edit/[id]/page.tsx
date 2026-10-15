"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch, RootState } from "@/store/store";
import { fetchLoanById, fetchLoans, clearSelectedLoan } from "@/features/loans/loanSlice";
import LoanForm from "../../LoanForm";

export default function EditLoanPage() {
  const params = useParams();
  const id = params.id as string;
  const dispatch = useDispatch<AppDispatch>();

  const { loans, selectedLoan, isLoading, error } = useSelector(
    (state: RootState) => state.loans,
  );

  const loanToEdit =
    (selectedLoan && selectedLoan.id === id ? selectedLoan : null) ||
    loans.find((l) => l.id === id) ||
    null;

  useEffect(() => {
    if (!loanToEdit) {
      dispatch(fetchLoanById(id));
      dispatch(fetchLoans());
    }
    return () => {
      dispatch(clearSelectedLoan());
    };
  }, [dispatch, id, loanToEdit]);

  if (loanToEdit) {
    return (
      <div className="w-full">
        <LoanForm mode="edit" initialLoan={loanToEdit} />
      </div>
    );
  }

  return (
    <div className="w-full">
      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" />
          <p className="mt-4 text-sm text-slate-500">Loading loan...</p>
        </div>
      ) : error ? (
        <div className="text-center py-12 space-y-4">
          <p className="text-red-500 text-sm font-medium">{error}</p>
          <button
            onClick={() => {
              dispatch(fetchLoanById(id));
              dispatch(fetchLoans());
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm"
          >
            Retry
          </button>
        </div>
      ) : (
        <div className="text-center py-12 text-slate-500">Loan not found.</div>
      )}
    </div>
  );
}