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
import { ArrowLeft, Edit,FileText } from "lucide-react";
import { Input } from "@/shared/components/ui/Input";
import { CustomerBreadcrumbs,CustomerSectionCard } from "@/features/customers/components/CustomerUi";

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

  return (

     <div className="max-w-7xl mx-auto space-y-6">
          {/* Breadcrumb */}
          <CustomerBreadcrumbs
            items={[
              { label: "Loans", href: "/dashboard/loans" },
              { label: "Loan Details" },
            ]}
          />
         <div>
          <h1 className="mt-2 font-serif text-2xl font-semibold tracking-tight sm:text-[28px] text-slate-900">
            Loan Details
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
            View complete Loan information.
          </p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Left Column - Claim Information */}
                  <div className="lg:col-span-2 space-y-6">
                    <CustomerSectionCard title="Loan Information" icon={FileText}>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 mb-1">
                            Policy Number
                          </p>
                          <p className="font-semibold text-slate-900">
                            {selectedLoan?.policy?.policyNumber}
                          </p>
                        </div>
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 mb-1">
                            Loan Date
                          </p>
                          <p className="font-semibold text-slate-900">
                            {new Date(
                              selectedLoan?.createdAt || "",
                            ).toLocaleDateString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 mb-1">
                            Customer Name
                          </p>
                          <p className="font-semibold text-slate-900">
                             {customer?.firstName} {customer?.lastName}
                          </p>
                        </div>
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 mb-1">
                            Loan Amount
                          </p>
                          <p className="font-semibold text-slate-900">
                              ₹{selectedLoan?.loanAmount?.toLocaleString("en-IN")}
                          </p>
                        </div>
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 mb-1">
                            Interest Rate (%)
                          </p>
                          <p className="font-semibold text-slate-900">
                              {selectedLoan.interestRate?.toString() || ""}
                          </p>
                        </div>
                         <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 mb-1">
                            Loan Status
                          </p>
                          <p className="font-semibold text-slate-900">
                              {selectedLoan.loanStatus?.statusName || ""}
                          </p>
                        </div>
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 mb-1">
                            Loan Remarks
                          </p>
                          <p className="font-semibold text-slate-900">
                              {selectedLoan?.remarks || ""}
                          </p>
                        </div>
                      </div>
                    </CustomerSectionCard>
                  </div>
                  <div>      
                    <CustomerSectionCard title="Repayment Information" icon={FileText}>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                            Repayment Date
                          </p>
                          <p className="font-semibold text-slate-900 text-sm">
                            {selectedLoan?.repaymentDate ? new Date(
                              selectedLoan?.repaymentDate
                            ).toLocaleDateString() : "-"}
                          </p>
                        </div>
                        <div className="flex justify-between items-center">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                            Total Loan Amount Repaid
                          </p>
                          <p className="font-semibold text-slate-900 text-sm">
                            ₹{selectedLoan.totalLoanRepaidAmount?.toLocaleString("en-IN") || "—"}
                          </p>
                        </div>
                        <div className="flex justify-between items-center">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                            Total Loan Interest Paid
                          </p>
                          <p className="font-semibold text-slate-900 text-sm">
                            ₹{selectedLoan.totalLoanInterestPaid?.toLocaleString("en-IN") || "—" }
                          </p>
                        </div>
                         <div className="flex justify-between items-center">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                            Total Loan Balance
                          </p>
                          <p className="font-semibold text-slate-900 text-sm">
                            ₹{(selectedLoan.loanAmount - (selectedLoan?.totalLoanRepaidAmount? selectedLoan.totalLoanRepaidAmount : 0)).toLocaleString("en-IN")}
                          </p>
                        </div>
                      </div>
                    </CustomerSectionCard>
                 </div>
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
    
  );
}