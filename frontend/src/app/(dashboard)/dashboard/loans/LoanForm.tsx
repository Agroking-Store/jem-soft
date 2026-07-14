"use client";

import { useState, useEffect, FormEvent } from "react";
import { useSelector, useDispatch } from "react-redux";
import type { RootState, AppDispatch } from "@/store/store";
import { useRouter } from "next/navigation";
import { fetchPolicies } from "@/features/policy/policySlice";
import { fetchLoanStatuses } from "@/features/loans/loanStatusMasterSlice";
import { createLoan, updateLoan, type Loan } from "@/features/loans/loanSlice";
import { Input } from "@/shared/components/ui/Input";
import toast from "react-hot-toast";
import { Save, Loader2 } from "lucide-react";

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
      });
    }
  }, [mode, initialLoan]);

  const handleChange = (field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

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
    <form onSubmit={handleSubmit} className="w-full">
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

            <select
              value={form.policyId}
              onChange={(e) => handleChange("policyId", e.target.value)}
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

          {/* Form Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">

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
              label="Loan Amount (₹)"
              type="number"
              min="0"
              step="0.01"
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
        </div>

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

      </div>
    </form>
  );
}