"use client";

import { useState, useEffect, FormEvent } from "react";
import { useSelector, useDispatch } from "react-redux";
import type { RootState, AppDispatch } from "@/store/store";
import { useRouter } from "next/navigation";
import { fetchPolicies } from "@/features/policy/policySlice";
import { fetchLoanStatuses } from "@/features/loans/loanStatusMasterSlice";
import { createLoan, fetchLoans, updateLoan, type Loan } from "@/features/loans/loanSlice";
import { type Policy } from "@/features/policy/policySlice";
import toast from "react-hot-toast";
import { Save, Loader2 ,FileText} from "lucide-react";
import DatePicker from "../lic/policies/new/DatePicker";
import { format } from "date-fns";
import {
  CustomerSectionCard,
  CustomerBreadcrumbs,
} from "@/features/customers/components/CustomerUi";
import CustomerModuleNav from "@/features/customers/components/CustomerModuleNav";
import { Controller, useForm } from "react-hook-form";
import { get } from "http";


interface LoanFormProps {
  mode: "create" | "edit";
  initialLoan?: Loan | null;
}

interface FormState {
  policyId: string;
  loanAmount: string;
  interestRate: string;
  loanDate: string;
  loanStatusId: string;
  remarks: string;
   totalLoanRepaidAmount: Number;
   totalLoanInterestPaid: Number;
}

const emptyForm: FormState = {
  policyId: "",
  loanAmount: "",
  interestRate: "",
  loanDate: "",
  loanStatusId: "",
  remarks: "",
   totalLoanRepaidAmount: 0,
   totalLoanInterestPaid: 0,
};


export default function LoanForm({ mode, initialLoan }: LoanFormProps) {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();

  const { policies } = useSelector((state: RootState) => state.policies);
  const { statuses: loanStatuses } = useSelector(
    (state: RootState) => state.loanStatuses,
  );

  const [form, setForm] = useState<FormState>(emptyForm);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedPolicy, setSelectedPolicy] = useState<Policy | null>(null);
  const { loans, isLoading } = useSelector((state: RootState) => state.loans);
  const [policyLoanEligiblity , setPolicyLoanEligiblity] = useState(false);
  let totalLoans = 0;

  const validate = (): boolean => {
  const newErrors: Partial<Record<keyof FormState, string>> = {};

  if (!form.policyId) newErrors.policyId = "Policy is required";

  if (!form.loanAmount) {
    newErrors.loanAmount = "Loan amount is required";
  } else if (isNaN(Number(form.loanAmount)) || Number(form.loanAmount) <= 0) {
    newErrors.loanAmount = "Loan amount must be a positive number";
  }

  if(!form.interestRate)
    newErrors.interestRate = "Interest rate is required"

  if (
    form.interestRate &&
    (isNaN(Number(form.interestRate)) ||
      Number(form.interestRate) < 0 ||
      Number(form.interestRate) > 100 ||
      Number(form.interestRate) == 0
    )
  ) {
    newErrors.interestRate = "Interest rate must be between 0 and 100";
  }

  if (!form.loanDate) {
    newErrors.loanDate = "Loan date is required";
  } else if (new Date(form.loanDate) > new Date()) {
    newErrors.loanDate = "Loan date cannot be in the future";
  }

  if(Number(form.loanAmount) > totalLoanGrantableValue)
  {
    newErrors.loanAmount = `Loan Amount can be maximum - ${totalLoanGrantableValue}`
  }

  setErrors(newErrors);
  return Object.keys(newErrors).length === 0;
};

  function checkPolicyLoanEligibility(selectedPolicy : Policy)
  {
    const loanEligible =(new Date().getFullYear() - new Date(selectedPolicy?.commencementDate)?.getFullYear()) > 3;
    setPolicyLoanEligiblity(loanEligible);
  }

  const getPrevLoanDetails= (policyId: string) => {
    const filteredLoans = loans.filter((loan) => loan.policyId === policyId);
    const previousLoanDetails = filteredLoans.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
    return previousLoanDetails;
  }

const getTotalLoanForPolicy = (policyId: string) => {
  const policy : Policy = policies.find((p) => p.id === policyId);
  if (!policy) return 0;

  const premium = Number(policy.premium!.basicYearlyPremium ?? 0);
  if (!premium) return 0;

  const filteredLoans = loans.filter((loan) => loan.policyId === policyId);

  totalLoans =  filteredLoans.reduce((sum, loan) => {
    return sum + (Number(loan.loanAmount) || 0);
  }, 0);

  const policyDuration = (new Date().getFullYear() - new Date(policy.commencementDate)?.getFullYear());
  let gsv = 0;
  if(3 < policyDuration && policyDuration < 5)
  {
    //Guaranteed Surrender Value Factor
     gsv = 0.3
  }
  else if(5 < policyDuration && policyDuration < 10)
  {
     gsv = 0.5
  }
  else if(policyDuration > 10)
  {
     gsv = 0.9
  }
 
  const policySurrenderValue = ((premium * policyDuration) - (premium)) * gsv;
  console.log(premium)
   console.log(policySurrenderValue)
  console.log(policySurrenderValue * 0.9)
  return((policySurrenderValue * 0.9))

};

const totalLoanGrantableValue =  getTotalLoanForPolicy(form.policyId);
 

const prevLoanDetails = form.policyId ? (getPrevLoanDetails(form.policyId)) : null;


  /* ── Shared class strings ──────────────────────────────────── */
  const inputClass =
    "w-full rounded-xl border border-slate-200 py-2.75 px-3 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 hover:border-slate-300 focus:border-[#B8873A] focus:ring-2 focus:ring-[#B8873A]/20";
  const disabledInputClass =
    "w-full rounded-xl border border-slate-200 bg-slate-50 py-2.75 px-3 text-sm text-slate-500 outline-none cursor-not-allowed";
  const selectClass =
    "w-full rounded-xl border border-slate-200 bg-white py-2.75 px-3 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 hover:border-slate-300 focus:border-[#B8873A] focus:ring-2 focus:ring-[#B8873A]/20";
  const labelClass =
    "mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500";

  useEffect(() => {
    dispatch(fetchPolicies());
    dispatch(fetchLoanStatuses());
    dispatch(fetchLoans());
  }, [dispatch]);

  useEffect(() => {
    if (mode === "edit" && initialLoan) {
      setForm({
        policyId: initialLoan.policyId || "",
        loanAmount: initialLoan.loanAmount?.toString() || "",
        interestRate: initialLoan.interestRate?.toString() || "",
        loanDate: initialLoan.loanDate
          ? new Date(initialLoan.loanDate).toISOString().slice(0, 10)
          : "",
        loanStatusId: initialLoan.loanStatusId || "",
        remarks: initialLoan.remarks || "",

      
      totalLoanRepaidAmount: initialLoan.totalLoanRepaidAmount || 0,
      totalLoanInterestPaid: initialLoan.totalLoanInterestPaid|| 0,
      });
    }
  }, [mode, initialLoan]);

  const handleChange = (field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      toast.error("Please fix the highlighted fields.");
      return;
    }

    setIsSubmitting(true);

    const payload = {
      policyId: form.policyId,
      loanAmount: Number(form.loanAmount),
      interestRate: form.interestRate
        ? Number(form.interestRate)
        : undefined,
      loanDate: form.loanDate,
      loanStatusId: loanStatuses[0].id,
      remarks: form.remarks || undefined,
      totalLoanRepaidAmount :  0,
      totalLoanInterestPaid : 0,
    };

    try {
      if (mode === "create") {
        await dispatch(createLoan(payload)).unwrap();
        toast.success("Loan created successfully.");
      } else if (initialLoan) {
        await dispatch(updateLoan({ id: initialLoan.id, data: payload })).unwrap();
        toast.success("Loan updated successfully.");
      }
      router.push("/dashboard/loans");
    } catch (err: any) {
      toast.error(err?.message || err || "Failed to save loan.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
       {/* Breadcrumb */}
            <CustomerBreadcrumbs
              items={[
                { label: "Loans", href: "/dashboard/loans" },
                { label: mode === "create" ? "New Loan" : "Edit Loan" },
              ]}
            />
      <div>
        <h1 className="mt-2 font-serif text-2xl font-semibold tracking-tight sm:text-[28px] text-slate-900">
          {mode === "create" ? "New Loan" : "Edit Loan"}
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
          {mode === "create"
            ? "Create a new loan against a policy."
            : "Update the loan details below."}
        </p>
      </div>
      
      <form onSubmit={handleSubmit} className="w-full">
      <CustomerSectionCard title="Loan Information" icon={FileText}>
          <div className="w-[50%]">
            <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              Policy
            </label>
            <span className="ml-0.5 text-rose-500">*</span>
            <select
            
              value={form.policyId}
              onChange={(e) => { 
                const nextPolicyId = e.target.value;
                handleChange("policyId", e.target.value);
                const policy = policies.find(
                      (p) => p.id === e.target.value,
                    );
                    setSelectedPolicy(policy!)
              //  if (!form.totalLoanGranted) {
              //     handleChange("totalLoanGranted",getTotalLoanForPolicy(nextPolicyId).toString(),
              //       );
              //      }
              checkPolicyLoanEligibility(policy!)
          
              }}
              className={`mt-1.5 w-full px-3 py-2.5 text-sm border rounded-xl outline-none transition-all ${errors.policyId
                ? "border-rose-300 focus:border-rose-400 focus:ring-2 focus:ring-rose-400/15"
                : "border-slate-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                }`}
            >
              <option value="">Select a policy</option>

              {policies.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.policyNumber}
                  {p.CustomerMaster
                    ? ` — ${p.CustomerMaster.firstName} ${p.CustomerMaster.lastName}`
                    : ""}
                </option>
              ))}
            </select>

            {errors.policyId && (
              <p className="mt-1 text-xs text-rose-600">
                {errors.policyId}
              </p>
            )}
          </div>
          {/* Policy Details Table */}
           {selectedPolicy && (
          <CustomerSectionCard className="mt-3" title="Policy Information" icon={FileText}>
          <div className="mt-5 border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">
                    Customer
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">
                    Sum assured
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">
                    Policy Status
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">
                    Policy Start Date
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                <tr>
                  <td className="px-4 py-3 text-sm font-semibold text-slate-900">
                    {selectedPolicy?.CustomerMaster?.firstName || "-"}{" "}
                    {selectedPolicy?.CustomerMaster?.lastName}
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold text-slate-900">
                    ₹{Number(selectedPolicy?.premium?.sumAssured)?.toLocaleString("en-IN") || "-"}
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold text-slate-900">
                    {selectedPolicy?.status?.statusName || "-"}
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold text-slate-900">
                    {selectedPolicy
                      ? new Date(
                          selectedPolicy?.commencementDate,
                        ).toLocaleDateString()
                      : "-"}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          </CustomerSectionCard>)}
          {!policyLoanEligiblity ? (
            <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
              {selectedPolicy ? (
                "This policy is not eligible for loan creation. Loans are available only for policies older than 3 years."
              ) : (
                "Select a policy to determine loan eligibility."
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mt-5">
            <div>
              <label className={labelClass}>
                Loan Date
                <span className="ml-0.5 text-rose-500">*</span>
              </label>
              <input
                className={inputClass}
                type="date"
                value={form.loanDate}
                onChange={(e) => handleChange("loanDate", e.target.value)}
              />
              {errors.loanDate && (
                <p className="mt-1 text-xs text-rose-600">
                  {errors.loanDate}
                </p>
              )}
              {/* <Controller
                // control={control}
                name="claimDate"
                render={({ field }) => (
                  <DatePicker
                    value={field.value ? new Date(field.value) : undefined}
                    onChange={(date: any) =>
                      field.onChange(date ? format(date, "yyyy-MM-dd") : "")
                    }
                  />
                )}
              /> */}
            </div>

            <div>
                <label className={labelClass}>
                  Prev. Loan Taken (₹)
                </label>
                <input
                  value={prevLoanDetails?.loanAmount || 0}
                  //onChange={(e) => handleChange("prevLoanTaken", e.target.value)}
                  // error={errors.prevLoanTaken}
                  className={`${inputClass} bg-slate-50 cursor-not-allowed`}
                  disabled
                />
            </div>

            <div>
                <label className={labelClass}>
                  Loan Amount (₹)
                  <span className="ml-0.5 text-rose-500">*</span>
                </label>
                <input
                  className={inputClass}
                  type="text"
                  placeholder="e.g. 50000"
                  value={form.loanAmount}
                  max={totalLoanGrantableValue}
                  onChange={(e) => handleChange("loanAmount", e.target.value)}
                />
                 {errors.loanAmount && (
                <p className="mt-1 text-xs text-rose-600">
                  {errors.loanAmount}
                </p>
              )}
            </div>
           
            <div>
                <label className={labelClass}>
                  Interest Rate (%)
                  <span className="ml-0.5 text-rose-500">*</span>
                </label>
                <input
                  className={inputClass}
                  type="text"
                  min="0"
                  max="100"
                  placeholder="e.g. 9.5"
                  value={form.interestRate}
                  onChange={(e) => handleChange("interestRate", e.target.value)}
                />
                 {errors.interestRate && (
                <p className="mt-1 text-xs text-rose-600">
                  {errors.interestRate}
                </p>
              )}
            </div>

             {/* <div>
                <label className={labelClass}>
                  Loan Tenure (Months)
                </label>
                <input
                  className={inputClass}
                  type="text"
                  min="1"
                  placeholder="e.g. 12"
                  value={form.loanTenure}
                  onChange={(e) => handleChange("loanTenure", e.target.value)}
                />
          </div> */}
            {/* <div>
              <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                Loan Status
              </label>

              <select
                value={form.loanStatusId}
                defaultValue={loanStatuses[0].id}
                onChange={(e) => handleChange("loanStatusId", e.target.value)}
                className={`mt-1.5 w-full px-3 py-2.5 text-sm border rounded-xl outline-none transition-all ${errors.loanStatusId
                  ? "border-rose-300 focus:border-rose-400 focus:ring-2 focus:ring-rose-400/15"
                  : "border-slate-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  }`}
              >
                <option value="">Select status</option>

                {loanStatuses.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.statusName}
                  </option>
                ))}
              </select>

              {errors.loanStatusId && (
                <p className="mt-1 text-xs text-rose-600">
                  {errors.loanStatusId}
                </p>
              )}
            </div> */}
            <div className="sm:col-span-2">
              <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                Remarks (Optional)
              </label>

              <textarea
                rows={3}
                placeholder="Enter any remarks..."
                value={form.remarks}
                onChange={(e) => handleChange("remarks", e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none resize-none transition-all focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>)}
      </CustomerSectionCard>
       {/* Footer */}
       {policyLoanEligiblity && (
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
              {mode === "create" ? "Create Loan" : "Save Changes"}
            </button>
        </div>)}
      </form>
    </div>
  );
}