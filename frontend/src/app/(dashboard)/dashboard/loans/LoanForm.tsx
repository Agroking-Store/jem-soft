"use client";

import { useState, useEffect, FormEvent, useMemo } from "react";
import { useSelector, useDispatch } from "react-redux";
import type { RootState, AppDispatch } from "@/store/store";
import { useRouter } from "next/navigation";
import { fetchPolicies } from "@/features/policy/policySlice";
import { fetchLoanStatuses } from "@/features/loans/loanStatusMasterSlice";
import {
  createLoan,
  fetchLoans,
  updateLoan,
  type Loan,
} from "@/features/loans/loanSlice";
import { type Policy } from "@/features/policy/policySlice";
import toast from "react-hot-toast";
import { Save, Loader2, FileText, AlertTriangle } from "lucide-react";
import {
  CustomerSectionCard,
  CustomerBreadcrumbs,
} from "@/features/customers/components/CustomerUi";

/* ── Props ────────────────────────────────────────────── */

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
}

const emptyForm: FormState = {
  policyId: "",
  loanAmount: "",
  interestRate: "9.5",
  loanDate: "",
  loanStatusId: "",
  remarks: "",
};

function getMaxLoanAmount(policy: Policy | null): number {
  if (!policy) return 0;

  const sumAssured = Number(policy.premium?.sumAssured ?? 0);
  if (!sumAssured) return 0;

  const yearsCompleted =
    new Date().getFullYear() - new Date(policy.commencementDate).getFullYear();

  let gsvFactor = 0;
  if (yearsCompleted >= 10) gsvFactor = 0.7;
  else if (yearsCompleted >= 5) gsvFactor = 0.5;
  else if (yearsCompleted >= 3) gsvFactor = 0.3;

  const surrenderValue = sumAssured * gsvFactor;
  return Math.round(surrenderValue * 0.9); // 90% of GSV
}

function isPolicyEligible(policy: Policy | null): boolean {
  if (!policy?.commencementDate) return false;
  const years =
    new Date().getFullYear() - new Date(policy.commencementDate).getFullYear();
  return years > 3;
}

/* ── Component ────────────────────────────────────────── */

export default function LoanForm({ mode, initialLoan }: LoanFormProps) {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();

  const { policies } = useSelector((state: RootState) => state.policies);
  const { statuses: loanStatuses } = useSelector(
    (state: RootState) => state.loanStatuses,
  );
  const { loans } = useSelector((state: RootState) => state.loans);

  const [form, setForm] = useState<FormState>(emptyForm);
  const [errors, setErrors] = useState<
    Partial<Record<keyof FormState, string>>
  >({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedPolicy, setSelectedPolicy] = useState<Policy | null>(null);

  const eligible = isPolicyEligible(selectedPolicy);
  const maxLoan = getMaxLoanAmount(selectedPolicy);

  // Check if policy already has an active loan
  const hasActiveLoan = useMemo(() => {
    if (!form.policyId) return false;
    return loans.some(
      (l) =>
        l.policyId === form.policyId &&
        l.loanStatus?.statusCode === "ACTIVE" &&
        l.id !== initialLoan?.id, // exclude current loan in edit mode
    );
  }, [form.policyId, loans, initialLoan]);

  const validate = (): boolean => {
    const e: Partial<Record<keyof FormState, string>> = {};

    if (!form.policyId) e.policyId = "Policy is required";
    if (hasActiveLoan) e.policyId = "This policy already has an active loan";

    if (!form.loanAmount) {
      e.loanAmount = "Loan amount is required";
    } else if (isNaN(Number(form.loanAmount)) || Number(form.loanAmount) <= 0) {
      e.loanAmount = "Must be a positive number";
    } else if (maxLoan > 0 && Number(form.loanAmount) > maxLoan) {
      e.loanAmount = `Maximum loan allowed is ₹${maxLoan.toLocaleString("en-IN")}`;
    }

    if (!form.interestRate) {
      e.interestRate = "Interest rate is required";
    } else if (
      isNaN(Number(form.interestRate)) ||
      Number(form.interestRate) <= 0 ||
      Number(form.interestRate) > 100
    ) {
      e.interestRate = "Must be between 0.01 and 100";
    }

    if (!form.loanDate) {
      e.loanDate = "Loan date is required";
    } else if (new Date(form.loanDate) > new Date()) {
      e.loanDate = "Cannot be in the future";
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

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
      });

      const p = policies.find((p) => p.id === initialLoan.policyId);
      if (p) setSelectedPolicy(p);
    }
  }, [mode, initialLoan, policies]);

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
      interestRate: Number(form.interestRate),
      loanDate: form.loanDate,
      loanStatusId:
        loanStatuses.find((s) => s.statusCode === "ACTIVE")?.id ||
        loanStatuses[0].id,
      remarks: form.remarks || undefined,
    };

    try {
      if (mode === "create") {
        await dispatch(createLoan(payload)).unwrap();
        toast.success("Loan created successfully.");
      } else if (initialLoan) {
        await dispatch(
          updateLoan({ id: initialLoan.id, data: payload }),
        ).unwrap();
        toast.success("Loan updated successfully.");
      }
      router.push("/dashboard/loans");
    } catch (err: any) {
      toast.error(err?.message || err || "Failed to save loan.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClass =
    "w-full rounded-xl border border-slate-200 py-2.75 px-3 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 hover:border-slate-300 focus:border-[#B8873A] focus:ring-2 focus:ring-[#B8873A]/20";
  const labelClass =
    "mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500";

  return (
    <div className="max-w-7xl mx-auto space-y-6">
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
          {/* Policy Selector */}
          <div className="w-[50%]">
            <label className={labelClass}>
              Policy <span className="text-rose-500">*</span>
            </label>
            <select
              value={form.policyId}
              disabled={mode === "edit"}
              onChange={(e) => {
                handleChange("policyId", e.target.value);
                const p = policies.find((p) => p.id === e.target.value) || null;
                setSelectedPolicy(p);
              }}
              className={`mt-1.5 w-full px-3 py-2.5 text-sm border rounded-xl outline-none transition-all ${
                errors.policyId
                  ? "border-rose-300 focus:border-rose-400 focus:ring-2 focus:ring-rose-400/15"
                  : "border-slate-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              } ${mode === "edit" ? "bg-slate-50 cursor-not-allowed" : ""}`}
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
              <p className="mt-1 text-xs text-rose-600">{errors.policyId}</p>
            )}
          </div>

          {/* Policy Info Table */}
          {selectedPolicy && (
            <CustomerSectionCard
              className="mt-3"
              title="Policy Information"
              icon={FileText}
            >
              <div className="mt-5 border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">
                        Customer
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">
                        Sum Assured
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">
                        Policy Status
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">
                        Start Date
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">
                        Max Loan
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    <tr>
                      <td className="px-4 py-3 text-sm font-semibold text-slate-900">
                        {selectedPolicy.CustomerMaster?.firstName || "—"}{" "}
                        {selectedPolicy.CustomerMaster?.lastName}
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-slate-900">
                        ₹
                        {Number(
                          selectedPolicy.premium?.sumAssured,
                        )?.toLocaleString("en-IN") || "—"}
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-slate-900">
                        {selectedPolicy.status?.statusName || "—"}
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-slate-900">
                        {new Date(
                          selectedPolicy.commencementDate,
                        ).toLocaleDateString("en-IN")}
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-emerald-700">
                        ₹{maxLoan.toLocaleString("en-IN")}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CustomerSectionCard>
          )}

          {/* Eligibility Warning */}
          {!eligible && selectedPolicy && (
            <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 mt-0.5 shrink-0" />
              <p>
                This policy is <strong>not eligible</strong> for a loan. Loans
                are available only for policies older than 3 years.
              </p>
            </div>
          )}

          {hasActiveLoan && (
            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-700 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 mt-0.5 shrink-0" />
              <p>
                This policy <strong>already has an active loan</strong>. Only
                one active loan per policy is allowed.
              </p>
            </div>
          )}

          {/* Loan Fields */}
          {eligible && !hasActiveLoan && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mt-5">
              <div>
                <label className={labelClass}>
                  Loan Date <span className="text-rose-500">*</span>
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
              </div>

              <div>
                <label className={labelClass}>
                  Loan Amount (₹) <span className="text-rose-500">*</span>
                </label>
                <input
                  className={inputClass}
                  type="number"
                  min="1"
                  max={maxLoan || undefined}
                  placeholder={`Max: ₹${maxLoan.toLocaleString("en-IN")}`}
                  value={form.loanAmount}
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
                  Interest Rate (% p.a.){" "}
                  <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    className={inputClass}
                    type="number"
                    step="0.5"
                    min="0.5"
                    max="100"
                    placeholder="Standard: 9.5"
                    value={form.interestRate}
                    onChange={(e) =>
                      handleChange("interestRate", e.target.value)
                    }
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">
                    % p.a.
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-slate-400">
                  Standard LIC rate: 9.5%. Interest calculated half-yearly on
                  outstanding principal.
                </p>
                {errors.interestRate && (
                  <p className="mt-1 text-xs text-rose-600">
                    {errors.interestRate}
                  </p>
                )}
              </div>

              <div className="sm:col-span-2">
                <label className={labelClass}>Remarks (Optional)</label>
                <textarea
                  rows={3}
                  placeholder="Enter any remarks..."
                  value={form.remarks}
                  onChange={(e) => handleChange("remarks", e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none resize-none transition-all focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>
          )}
        </CustomerSectionCard>

        {/* Footer */}
        {eligible && !hasActiveLoan && (
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
          </div>
        )}
      </form>
    </div>
  );
}
