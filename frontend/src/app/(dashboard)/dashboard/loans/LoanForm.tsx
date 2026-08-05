"use client";

import { useState, useEffect, FormEvent } from "react";
import { useSelector, useDispatch } from "react-redux";
import type { RootState, AppDispatch } from "@/store/store";
import { useRouter } from "next/navigation";
import { fetchPolicies } from "@/features/policy/policySlice";
import { fetchLoanStatuses } from "@/features/loans/loanStatusMasterSlice";
import { createLoan, fetchLoans, updateLoan, type Loan } from "@/features/loans/loanSlice";
import { Input } from "@/shared/components/ui/Input";
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
  loanNumber: string;
  loanAmount: string;
  interestRate: string;
  loanDate: string;
  loanStatusId: string;
  loanTenure: string;
  remarks: string;
  totalLoanGranted: string;
  prevLoanTaken: string;
  prevLoanInterestRate: string;
  otherDeduction: string;
  xChargeDeduction: string;
  revivalDeduction: string;
  addDeposit: string;
  netAmount: string;
  chequeAmount: string;
  repaymentDate: string;
  loanRepaidAmount: string;
  totalLoanAmount: string;
  bpiInterest: string;
  hlyInterest: string;
  fuliDate: string;
  repaymentRemarks: string;
}

const emptyForm: FormState = {
  policyId: "",
  loanNumber: "",
  loanAmount: "",
  interestRate: "",
  loanDate: "",
  loanStatusId: "",
  loanTenure: "",
  remarks: "",
  totalLoanGranted: "",
  prevLoanTaken: "",
  prevLoanInterestRate: "",
  otherDeduction: "",
  xChargeDeduction: "",
  revivalDeduction: "",
  addDeposit: "",
  netAmount: "",
  chequeAmount: "",
  repaymentDate: "",
  loanRepaidAmount: "",
  totalLoanAmount: "",
  bpiInterest: "",
  hlyInterest: "",
  fuliDate: "",
  repaymentRemarks: "",
};

const validateOptionalNumber = (
  value: string,
  label: string,
  options?: { min?: number; max?: number },
) => {
  if (!value) return undefined;

  const num = Number(value);
  if (!Number.isFinite(num)) {
    return `${label} must be a valid number`;
  }

  if (options?.min !== undefined && num < options.min) {
    return `${label} must be at least ${options.min}`;
  }

  if (options?.max !== undefined && num > options.max) {
    return `${label} must be at most ${options.max}`;
  }

  return undefined;
};

const validateOptionalPercentage = (value: string, label: string) => {
  if (!value) return undefined;

  const num = Number(value);
  if (!Number.isFinite(num) || num < 0 || num > 100) {
    return `${label} must be between 0 and 100`;
  }

  return undefined;
};

const validateOptionalDate = (value: string, label: string) => {
  if (!value) return undefined;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return `${label} must be a valid date`;
  }

  if (date > new Date()) {
    return `${label} cannot be in the future`;
  }

  return undefined;
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

  const validate = (): boolean => {
  const newErrors: Partial<Record<keyof FormState, string>> = {};

  if (!form.policyId) newErrors.policyId = "Policy is required";

  if (!form.loanAmount) {
    newErrors.loanAmount = "Loan amount is required";
  } else if (isNaN(Number(form.loanAmount)) || Number(form.loanAmount) <= 0) {
    newErrors.loanAmount = "Loan amount must be a positive number";
  }

  if (
    form.interestRate &&
    (isNaN(Number(form.interestRate)) ||
      Number(form.interestRate) < 0 ||
      Number(form.interestRate) > 100)
  ) {
    newErrors.interestRate = "Interest rate must be between 0 and 100";
  }

  if (!form.loanDate) {
    newErrors.loanDate = "Loan date is required";
  } else if (new Date(form.loanDate) > new Date()) {
    newErrors.loanDate = "Loan date cannot be in the future";
  }

  if (!form.loanStatusId) newErrors.loanStatusId = "Loan status is required";

  if (form.loanTenure) {
    const tenure = Number(form.loanTenure);
    if (!Number.isFinite(tenure) || tenure <= 0) {
      newErrors.loanTenure = "Loan tenure must be a positive number";
    }
  }

  const optionalNumericFields: Array<{ key: keyof FormState; label: string }> = [
    { key: "totalLoanGranted", label: "Total loan granted" },
    { key: "prevLoanTaken", label: "Previous loan taken" },
    { key: "otherDeduction", label: "Other deduction" },
    { key: "xChargeDeduction", label: "XCharge deduction" },
    { key: "revivalDeduction", label: "Revival deduction" },
    { key: "addDeposit", label: "Additional deposit" },
    { key: "netAmount", label: "Net amount" },
    { key: "chequeAmount", label: "Cheque amount" },
    { key: "loanRepaidAmount", label: "Loan repaid amount" },
    { key: "totalLoanAmount", label: "Total loan amount" },
  ];

  for (const field of optionalNumericFields) {
    const error = validateOptionalNumber(form[field.key], field.label, { min: 0 });
    if (error) newErrors[field.key] = error;
  }

  const optionalPercentageFields: Array<{ key: keyof FormState; label: string }> = [
    { key: "prevLoanInterestRate", label: "Previous loan interest rate" },
    { key: "bpiInterest", label: "New BPI interest" },
    { key: "hlyInterest", label: "New HLY interest" },
  ];

  for (const field of optionalPercentageFields) {
    const error = validateOptionalPercentage(form[field.key], field.label);
    if (error) newErrors[field.key] = error;
  }

  const optionalDateFields: Array<{ key: keyof FormState; label: string }> = [
    { key: "repaymentDate", label: "Repayment date" },
    { key: "fuliDate", label: "Fuli date" },
  ];

  for (const field of optionalDateFields) {
    const error = validateOptionalDate(form[field.key], field.label);
    if (error) newErrors[field.key] = error;
  }

  setErrors(newErrors);
  return Object.keys(newErrors).length === 0;
};

  //const selectedPolicyDetails = policies.find((p) => p.id === form.policyId);
//  async function getTotalLoanForPolicy(policyId: string) {
//     const filteredLoans = loans.filter((loan) => loan.policyId === policyId);
//     const totalLoanAmount = filteredLoans.reduce((sum, loan) => {
//       return sum + (loan.loanAmount || 0);
//     }, 0);
//   };

const getTotalLoanForPolicy = (policyId: string) => {
  if (!policyId) return 0;

  const filteredLoans = loans.filter((loan) => loan.policyId === policyId);
  return filteredLoans.reduce((sum, loan) => {
    return sum + (Number(loan.loanAmount) || 0);
  }, 0);
};

const totalLoanGrantedValue = form.policyId
  ? ( getTotalLoanForPolicy(form.policyId).toString())
  : form.totalLoanGranted;

  useEffect(() => {
    dispatch(fetchPolicies());
    dispatch(fetchLoanStatuses());
  }, [dispatch]);

  useEffect(() => {
    if (mode === "edit" && initialLoan) {
      setForm({
        policyId: initialLoan.policyId || "",
        loanNumber: initialLoan.loanNumber || "",
        loanAmount: initialLoan.loanAmount?.toString() || "",
        interestRate: initialLoan.interestRate?.toString() || "",
        loanDate: initialLoan.loanDate
          ? new Date(initialLoan.loanDate).toISOString().slice(0, 10)
          : "",
        loanStatusId: initialLoan.loanStatusId || "",
        loanTenure: initialLoan.loanTenure?.toString() || "",
        remarks: initialLoan.remarks || "",
         totalLoanGranted: initialLoan.totalLoanGranted?.toString() || "",
      prevLoanTaken: initialLoan.prevLoanTaken?.toString() || "",
      prevLoanInterestRate: initialLoan.prevLoanInterestRate?.toString() || "",
      otherDeduction: initialLoan.otherDeduction?.toString() || "",
      xChargeDeduction: initialLoan.xChargeDeduction?.toString() || "",
      revivalDeduction: initialLoan.revivalDeduction?.toString() || "",
      addDeposit: initialLoan.addDeposit?.toString() || "",
      netAmount: initialLoan.netAmount?.toString() || "",
      chequeAmount: initialLoan.chequeAmount?.toString() || "",
      repaymentDate: initialLoan.repaymentDate
        ? new Date(initialLoan.repaymentDate).toISOString().slice(0, 10)
        : "",
      loanRepaidAmount: initialLoan.loanRepaidAmount?.toString() || "",
      totalLoanAmount: initialLoan.totalLoanAmount?.toString() || "",
      bpiInterest: initialLoan.bpiInterest?.toString() || "",
      hlyInterest: initialLoan.hlyInterest?.toString() || "",
      fuliDate: initialLoan.fuliDate
        ? new Date(initialLoan.fuliDate).toISOString().slice(0, 10)
        : "",
      repaymentRemarks: initialLoan.repaymentRemarks || "",
      });
    }
  }, [mode, initialLoan]);

  const loanNetAmount = Number(form.loanAmount) - Number(form.otherDeduction) - Number(form.xChargeDeduction) - Number(form.revivalDeduction) + Number(form.addDeposit);

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
      loanNumber: form.loanNumber || undefined,
      loanAmount: Number(form.loanAmount),
      interestRate: form.interestRate
        ? Number(form.interestRate)
        : undefined,
      loanDate: form.loanDate,
      loanStatusId: form.loanStatusId,
      loanTenure: form.loanTenure
        ? Number(form.loanTenure)
        : undefined,
      remarks: form.remarks || undefined,
      totalLoanGranted: form.totalLoanGranted ? Number(form.totalLoanGranted) : getTotalLoanForPolicy(form.policyId),
      prevLoanTaken: Number(form.prevLoanTaken),
      prevLoanInterestRate: form.prevLoanInterestRate,
      otherDeduction: Number(form.otherDeduction),
      xChargeDeduction: Number(form.xChargeDeduction),
      revivalDeduction: Number(form.revivalDeduction),
    addDeposit: Number(form.addDeposit),
    netAmount: loanNetAmount,
    chequeAmount: Number(form.chequeAmount),
    repaymentDate :form.repaymentDate,
    loanRepaidAmount: Number(form.loanRepaidAmount),
    totalLoanAmount: Number(form.totalLoanAmount),
    newBpiInterest: Number(form.bpiInterest),
    newHlyInterest: Number(form.hlyInterest),
    fuliDate: form.fuliDate,
    repaymentRemarks: form.repaymentRemarks || null,
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
                    setSelectedPolicy(policy)
               if (!form.totalLoanGranted) {
      handleChange(
        "totalLoanGranted",
        getTotalLoanForPolicy(nextPolicyId).toString(),
      );
    }
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
                    {selectedPolicy?.premium?.sumAssured || "-"}
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
          </CustomerSectionCard>
          {/* Form Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mt-5">

            <Input
              label="Loan Number"
              placeholder="e.g. LN-2026-001"
              value={form.loanNumber}
              onChange={(e) => handleChange("loanNumber", e.target.value)}
              error={errors.loanNumber}
            />

            <Input
              label="Loan Date"
              type="date"
              value={form.loanDate}
              onChange={(e) => handleChange("loanDate", e.target.value)}
              error={errors.loanDate}
            />

            <Input
              label="Total Loan Granted"
              placeholder="e.g. 500000"
              value={totalLoanGrantedValue}
              onChange={(e) => handleChange("totalLoanGranted", e.target.value)}
              error={errors.totalLoanGranted}
              disabled
            />

            <Input
              label="Prev. Loan Taken"
              placeholder="e.g. 50000"
              value={totalLoanGrantedValue}
              onChange={(e) => handleChange("prevLoanTaken", e.target.value)}
              error={errors.prevLoanTaken}
              disabled
            />

            <Input
              label="New Loan Amount (₹)"
              type="number"
              placeholder="e.g. 50000"
              value={form.loanAmount}
              onChange={(e) => handleChange("loanAmount", e.target.value)}
              error={errors.loanAmount}
            />
            
            <Input
              label="Interest Rate (%)"
              type="number"
              min="0"
              max="100"
              step="0.01"
              placeholder="e.g. 9.5"
              value={form.interestRate}
              onChange={(e) => handleChange("interestRate", e.target.value)}
              error={errors.interestRate}
            />

            <Input
              label="Other Deduction"
              placeholder="e.g. 2000"
              value={form.otherDeduction}
              onChange={(e) => handleChange("otherDeduction", e.target.value)}
              error={errors.otherDeduction}
            />

            <Input
              label="XCharge Deduction"
              placeholder="e.g. 1000"
              value={form.xChargeDeduction}
              onChange={(e) => handleChange("xChargeDeduction", e.target.value)}
              error={errors.xChargeDeduction}
            />

            <Input
              label="Revival Deduction"
              placeholder="e.g. 1000"
              value={form.revivalDeduction}
              onChange={(e) => handleChange("revivalDeduction", e.target.value)}
              error={errors.revivalDeduction}
            />

            <Input
              label="Add. Deposit"
              placeholder="e.g. 5000"
              value={form.addDeposit}
              onChange={(e) => handleChange("addDeposit", e.target.value)}
              error={errors.addDeposit}
            />

            <Input
              label="Loan Tenure (Months)"
              type="number"
              min="1"
              placeholder="e.g. 12"
              value={form.loanTenure}
              onChange={(e) => handleChange("loanTenure", e.target.value)}
            />

            <div>
              <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                Loan Status
              </label>

              <select
                value={form.loanStatusId}
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
            </div>

            <Input
              label="Net Amount"
              type="number"
              placeholder="e.g. 12"
              value={loanNetAmount}
              onChange={(e) => handleChange("netAmount", e.target.value)}
               error={errors.netAmount}
            />

            <Input
              label="Cheque Amount"
              type="number"
              min="1"
              placeholder="e.g. 12"
              value={form.chequeAmount}
              onChange={(e) => handleChange("chequeAmount", e.target.value)}
               error={errors.chequeAmount}
            />

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
          </div>
      </CustomerSectionCard>

      <CustomerSectionCard className="mt-5" title="Repayment Information" icon={FileText}>
              <div className="space-y-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                      label="Date Of Repayment"
                      type="date"
                      value={form.repaymentDate}
                      onChange={(e) => handleChange("repaymentDate", e.target.value)}
                      error={errors.repaymentDate}
                    />

                    <Input
              label="Prev. Loan Interest Rate (%)"
              type="number"
              min="0"
              max="100"
              step="0.01"
              placeholder="e.g. 9.5"
              value={form.prevLoanInterestRate}
              onChange={(e) => handleChange("prevLoanInterestRate", e.target.value)}
              error={errors.prevLoanInterestRate}
            />

            <Input
              label="Loan Repayed Amount (₹)"
              type="number"
              placeholder="e.g. 50000"
              value={form.loanRepaidAmount}
              onChange={(e) => handleChange("loanRepaidAmount", e.target.value)}
              error={errors.loanRepaidAmount}
            />

            <Input
              label="Total Loan Amount (₹)"
              type="number"
              min="0"
              step="0.01"
              placeholder="e.g. 50000"
              value={totalLoanGrantedValue}
              onChange={(e) => handleChange("totalLoanAmount", e.target.value)}
              error={errors.totalLoanAmount}
            />

              <Input
              label="New BPI Interest (%)"
              type="number"
              min="0"
              step="0.01"
              placeholder="e.g. 9.5"
              value={form.bpiInterest}
              onChange={(e) => handleChange("bpiInterest", e.target.value)}
              error={errors.bpiInterest}
            />

              <Input
              label="New HLY Interest (%)"
              type="number"
              min="0"
              step="0.01"
              placeholder="e.g. 9.5"
              value={form.hlyInterest}
              onChange={(e) => handleChange("hlyInterest", e.target.value)}
              error={errors.hlyInterest}
            />

            <Input
                      label="FULI Date"
                      type="date"
                      value={form.fuliDate}
                      onChange={(e) => handleChange("fuliDate", e.target.value)}
                      error={errors.fuliDate}
                    />
            <div className="sm:col-span-2">
                    <label className="w-full text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
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
        </div>
      </CustomerSectionCard>
       {/* Footer */}
        <div className="px-6 pb-6 pt-4 flex justify-end gap-3">

          <button
            type="button"
            onClick={() => router.push("/dashboard/loans")}
            className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition disabled:opacity-60"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}

            {mode === "create" ? "Create Loan" : "Save Changes"}
          </button>

        </div>
      </form>
    </div>
  );
}