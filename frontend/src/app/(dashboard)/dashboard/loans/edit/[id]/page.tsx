"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch, RootState } from "@/store/store";
import { fetchLoanById, clearSelectedLoan } from "@/features/loans/loanSlice";
import LoanForm from "../../LoanForm";

export default function EditLoanPage() {
  const params = useParams();
  const id = params.id as string;
  const dispatch = useDispatch<AppDispatch>();

  const { selectedLoan, isLoading } = useSelector(
    (state: RootState) => state.loans,
  );

  useEffect(() => {
    dispatch(fetchLoanById(id));
    return () => {
      dispatch(clearSelectedLoan());
    };
  }, [dispatch, id]);

  return (
    <div className="w-full">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Edit Loan</h1>
        <p className="text-slate-500 text-sm mt-1">
          Update the loan details below
        </p>
      </div>

      {isLoading || !selectedLoan ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" />
          <p className="mt-4 text-sm text-slate-500">Loading loan...</p>
        </div>
      ) : (
        <LoanForm mode="edit" initialLoan={selectedLoan} />
      )}
    </div>
  );
}