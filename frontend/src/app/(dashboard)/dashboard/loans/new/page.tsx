"use client";

import LoanForm from "../LoanForm";

export default function NewLoanPage() {
  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">New Loan</h1>
        <p className="text-slate-500 text-sm mt-1">
          Record a new loan against a policy
        </p>
      </div>
      <LoanForm mode="create" />
    </div>
  );
}