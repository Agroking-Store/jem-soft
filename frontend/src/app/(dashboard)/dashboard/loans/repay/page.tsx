"use client";

import { useState, useEffect, FormEvent } from "react";
import { useSelector, useDispatch } from "react-redux";
import type { RootState, AppDispatch } from "@/store/store";
import { useRouter } from "next/navigation";
import { fetchLoans, updateLoan, type Loan } from "@/features/loans/loanSlice";
import toast from "react-hot-toast";
import { Save, Loader2 ,FileText} from "lucide-react";

import {
  CustomerSectionCard,
  CustomerBreadcrumbs,
} from "@/features/customers/components/CustomerUi";

interface FormState {
   repaymentDate: string;
   repayAmount : number;
   totalLoanRepaidAmount: Number;
   totalLoanInterestPaid: Number;
   repaymentRemarks: string;
}

const emptyForm: FormState = {
  repaymentDate: "",
  repayAmount : 0,
  totalLoanRepaidAmount: 0,
  totalLoanInterestPaid: 0,
  repaymentRemarks: "",
};

/* ── Shared class strings ──────────────────────────────────── */
  const inputClass =
    "w-full rounded-xl border border-slate-200 py-2.75 px-3 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 hover:border-slate-300 focus:border-[#B8873A] focus:ring-2 focus:ring-[#B8873A]/20";
  const disabledInputClass =
    "w-full rounded-xl border border-slate-200 bg-slate-50 py-2.75 px-3 text-sm text-slate-500 outline-none cursor-not-allowed";
  const selectClass =
    "w-full rounded-xl border border-slate-200 bg-white py-2.75 px-3 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 hover:border-slate-300 focus:border-[#B8873A] focus:ring-2 focus:ring-[#B8873A]/20";
  const labelClass =
    "mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500";


export default function RepayForm() 
{

  const [form, setForm] = useState<FormState>(emptyForm);
 const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
 const [isSubmitting, setIsSubmitting] = useState(false);

 const handleChange = (field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };


  const calculateInterest = () => {
    if (!selectedLoan)
      return 0;
    const interestAmount = (((selectedLoan.loanAmount - selectedLoan.totalLoanRepaidAmount!)) * (selectedLoan.interestRate!))/200

    return interestAmount;
  }

  const validate = (): boolean => {
  const newErrors: Partial<Record<keyof FormState, string>> = {};

  //if (!form.Loan) newErrors.policyId = "Loan is required";


  if (!form.repaymentDate) {
    newErrors.repaymentDate = "Loan Repayment date is required";
  } else if (new Date(form.repaymentDate) > new Date()) {
    newErrors.repaymentDate = "Loan Repayment date cannot be in the future";
  }

  if(!form.repayAmount)
  {
    newErrors.repayAmount = "Loan Repay Amount is required";
  }

  if(Number(form.repayAmount) > ((selectedLoan?.loanAmount! - selectedLoan?.totalLoanRepaidAmount!)))
  {
    newErrors.repayAmount = "Repay Amount cannot be greater than Loan Balance";
  }

   if(Number(form.repayAmount) < 0 || Number(form.repayAmount) == 0)
  {
    newErrors.repayAmount = "Repay Amount cannot be less than or equal to 0";
  }
  

  setErrors(newErrors);
  return Object.keys(newErrors).length === 0;
};

const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      toast.error("Please fix the highlighted fields.");
      return;
    }

    setIsSubmitting(true);


    const payload = {
      repaymentDate :form.repaymentDate,
      repayAmount : form.repayAmount,
      totalLoanRepaidAmount : (selectedLoan?.totalLoanRepaidAmount? selectedLoan.totalLoanRepaidAmount : 0)+ (Number(form.repayAmount) - (calculateInterest())) ,
      totalLoanInterestPaid : Number(selectedLoan?.totalLoanInterestPaid? selectedLoan.totalLoanInterestPaid :  0 )+ calculateInterest(),
      repaymentRemarks: form.repaymentRemarks || null,
    };

    try {

      if(!selectedLoan)
        return;
     
      console.log(payload)
        await dispatch(updateLoan({ id: selectedLoan.id, data: payload })).unwrap();
        toast.success("Loan Repayed successfully.");
      
      router.push("/dashboard/loans");
    } catch (err: any) {
      toast.error(err?.message || err || "Failed to Repay loan.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const router = useRouter();
    const dispatch = useDispatch<AppDispatch>();

  useEffect(() => {
     dispatch(fetchLoans())
    }, [dispatch]);

  const { loans } = useSelector((state: RootState) => state.loans);
    const [selectedLoan,setSelectedLoan] = useState<Loan | null>(null);

    return(
       <div className="max-w-7xl mx-auto space-y-6">
         {/* Breadcrumb */}
        <CustomerBreadcrumbs
          items={[
            { label: "Loans", href: "/dashboard/loans" },
            { label: "Repay Loan" },
          ]}
        />
        <div>
        <h1 className="mt-2 font-serif text-2xl font-semibold tracking-tight sm:text-[28px] text-slate-900">
          {"Repay Loan"}
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
          {"Create a new repayment against a loan."}
        </p>
      </div>
          <form onSubmit={handleSubmit}>
        <CustomerSectionCard className="mt-5" title="Repayment Information" icon={FileText}>
          <div className="space-y-5 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
               <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
               Loan
               </label>
               <span className="ml-0.5 text-rose-500">*</span>
               <select
              // value={form.policyId}
               onChange={(e) => { 
                const loan = loans.find(
                       (l) => l.policy?.policyNumber === e.target.value,
                     );
                     setSelectedLoan(loan!);calculateInterest()}}
              //  if (!form.totalLoanGranted) {
              //     handleChange("totalLoanGranted",getTotalLoanForPolicy(nextPolicyId).toString(),
              //       );
              //      }
              // checkPolicyLoanEligibility(policy)
          
              // }}
                // className={`mt-1.5 w-full px-3 py-2.5 text-sm border rounded-xl outline-none transition-all`} ${errors.policyId
                //  ? "border-rose-300 focus:border-rose-400 focus:ring-2 focus:ring-rose-400/15"
                //  : "border-slate-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                //  }`}
                className="mt-1.5 w-full px-3 py-2.5 text-sm border rounded-xl outline-none transition-all"
            >
              <option value="">Select a Loan</option>
              {loans.map((l) => (
                <option key={l.id} value={l.policy?.policyNumber}>
                  {l.policy?.policyNumber}-
                  {l.policy?.CustomerMaster?.firstName} {l.policy?.CustomerMaster?.lastName}
                </option>
              ))}
            </select>
            </div>
          </div>
          {selectedLoan ? (
            <div>
          <div className="mt-5 border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">
                    Policy Number
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">
                    Loan Amount
                  </th>
                   <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">
                    Loan Balance
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">
                    Interest Rate
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">
                    Loan Date
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                 <tr>
                  <td className="px-4 py-3 text-sm font-semibold text-slate-900">
                    {selectedLoan?.policy?.policyNumber}
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold text-slate-900">
                    ₹{Number(selectedLoan?.loanAmount)?.toLocaleString("en-IN")}
                  </td>
                   <td className="px-4 py-3 text-sm font-semibold text-slate-900">
                    ₹{(selectedLoan?.loanAmount - (selectedLoan?.totalLoanRepaidAmount? selectedLoan.totalLoanRepaidAmount : 0)).toLocaleString("en-IN")}
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold text-slate-900">
                    {selectedLoan?.interestRate} %
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold text-slate-900">
                    {selectedLoan
                      ? new Date(
                          selectedLoan?.createdAt
                        ).toLocaleDateString()
                      : "-"}
                  </td>
                </tr> 
              </tbody>
            </table>
        </div>
        <div className="space-y-5 grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
          <div>
                <label className={labelClass}>
                  Date Of Repayment
                   <span className="ml-0.5 text-rose-500">*</span>
                </label>
                        <input
                              type="date"
                               value={form.repaymentDate}
                               onChange={(e) => handleChange("repaymentDate", e.target.value)}
                               className={inputClass}
                            />
                            {errors.repaymentDate && (
                <p className="mt-1 text-xs text-rose-600">
                  {errors.repaymentDate}
                </p>
              )}
                  </div>
                        
         <div>
                <label className={labelClass}>
                  Repayment Amount (₹)
                   <span className="ml-0.5 text-rose-500">*</span>
                </label>
                    <input
                     className = {inputClass}
                      type="text"
                      placeholder="e.g. 50000"
                      value={form.repayAmount}
                      onChange={(e) => handleChange("repayAmount", e.target.value)}
                    />
                    {errors.repayAmount && (
                <p className="mt-1 text-xs text-rose-600">
                  {errors.repayAmount}
                </p>
              )}
        </div>

         <div>
                <label className={labelClass}>
                  Interest Amount (₹)
                   <span className="ml-0.5 text-rose-500">*</span>
                </label>
                     <input
                     className={`${inputClass} bg-slate-50 cursor-not-allowed`}
                      type="text"
                      min="0"
                      placeholder="e.g. 50000"
                      value={calculateInterest()}
                      onChange={(e) => handleChange("totalLoanInterestPaid", e.target.value)}
                       
                    /> 
                     {/* {errors.loanDate && (
                <p className="mt-1 text-xs text-rose-600">
                  {errors.loanDate}
                </p>
              )} */}
        </div>
         <div>
                <label className={labelClass}>
                  New Loan Balance (₹)
                   <span className="ml-0.5 text-rose-500">*</span>
                </label>
                    <input
                    className={`${inputClass} bg-slate-50 cursor-not-allowed`}
                      type="number"
                      min="0"
                      placeholder="e.g. 50000"
                      value={(selectedLoan?.loanAmount - selectedLoan.totalLoanRepaidAmount!) - (Number(form.repayAmount) - calculateInterest())}
                      //onChange={(e) => handleChange("totalLoanAmount", e.target.value)}
                      disabled
                    /> 
                     {/* {errors.loanDate && (
                <p className="mt-1 text-xs text-rose-600">
                  {errors.loanDate}
                </p>
              )} */}
          </div>
                    </div>
                    <div className="sm:col-span-2">
                    <label className={labelClass}>
                Remarks (Optional)
              </label>
              <textarea
                rows={3}
                placeholder="Enter any remarks..."
                 value={form.repaymentRemarks}
                 onChange={(e) => handleChange("repaymentRemarks", e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none resize-none transition-all focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              />
              </div>
          </div>) : (
            <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">         
                <p>Select a loan for repayment.</p>
            </div>
          )}
        </CustomerSectionCard>
         {/* Footer */}
               {selectedLoan && (
                <div className="px-6 pb-6 pt-4 flex justify-end gap-3">
        
                  <button
                    type="button"
                    onClick={() => router.push("/dashboard/loans")}
                    className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition disabled:opacity-60 cursor-pointer"
                    >
                      {isSubmitting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4" />
                      )}
                      { "Create Payment"}
                    </button>
                </div>)}
        </form>
      </div>
        
      )
}

      