"use client";

import { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import type { RootState, AppDispatch } from "@/store/store";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { fetchPolicies } from "@/features/policy/policySlice";
import {
  createClaim,
  updateClaim,
  type Claim,
} from "@/features/claim/claimSlice";
import { format } from "date-fns";
import {
  ChevronRight,
  AlertCircle,
  Loader2,
  Save,
  User,
  FileText,
  IndianRupee,
} from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";
import DatePicker from "../lic/policies/new/DatePicker";
import type { Policy } from "@/features/policy/policySlice";
import { Button } from "@/shared/components/ui/Button";
import { Input } from "@/shared/components/ui/Input";
import {
  CustomerSectionCard,
  CustomerBreadcrumbs,
} from "@/features/customers/components/CustomerUi";

interface ClaimFormProps {
  mode: "create" | "edit";
  initialClaim?: Claim | null;
}

export default function ClaimForm({ mode, initialClaim }: ClaimFormProps) {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();

  const claimSchema = z.object({
  policyId: z.string().min(1, "Policy is required"),
  claimantName: z.string().min(3, "Claimant name is required"),
  claimType: z.string().min(1, "Claim type is required"),
  claimAmount: z.coerce
    .number()
    .positive("Claim amount must be greater than 0"),
  claimDate: z.string().min(1, "Claim date is required"),
  reasonForClaim: z
    .string()
    .min(10, "Reason for claim must be at least 10 characters")
    .max(500, "Reason for claim must not exceed 500 characters"),
}).refine(
  (data) => {
    
    const sumAssured = selectedPolicy?.premium?.sumAssured;
     if (!sumAssured) return true;
    return data.claimAmount <= sumAssured;
  },
  {
    message: "Claim amount must be less than or equal to sum assured",
    path: ["claimAmount"],
  }
).refine(
  (data) => {
    if (!selectedPolicy) return true;
     const claimDate = new Date(data.claimDate);
    const policyStartDate = new Date(selectedPolicy.commencementDate);
    
    return claimDate > policyStartDate;
  },
  {
    message: "Claim date must be after policy start date",
    path: ["claimDate"],
  }
);

type ClaimFormData = z.infer<typeof claimSchema>;

  const { policies } = useSelector((state: RootState) => state.policies);

  const [selectedPolicy, setSelectedPolicy] = useState<Policy | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [validatedData, setValidatedData] = useState<ClaimFormData | null>(
    null,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<ClaimFormData>({
    resolver: zodResolver(claimSchema) as any,
    defaultValues: {
      policyId: "",
      claimantName: "",
      claimType: "",
      claimDate: "",
      reasonForClaim: "",
    },
  });

  useEffect(() => {
    dispatch(fetchPolicies());
  }, [dispatch]);

  // Pre-fill form in edit mode
  useEffect(() => {
    if (mode === "edit" && initialClaim) {
      reset({
        policyId: initialClaim.policyId || "",
        claimantName: initialClaim.claimantName || "",
        claimType: initialClaim.claimType || "",
        claimAmount: initialClaim.claimAmount || 0,
        claimDate: initialClaim.claimDate
          ? new Date(initialClaim.claimDate).toISOString().slice(0, 10)
          : "",
        reasonForClaim: initialClaim.reasonForClaim || "",
      });

      // Set selected policy
      const policy = policies.find((p) => p.id === initialClaim.policyId);
      if (policy) {
        setSelectedPolicy(policy);
      }
    }
  }, [mode, initialClaim, reset, policies]);

  // Sync selectedPolicy when policyId changes
  useEffect(() => {
    const subscription = (control as any).watch?.(
      (value: any, { name }: any) => {
        if (name === "policyId") {
          const policy = policies.find((p) => p.id === value.policyId);
          setSelectedPolicy(policy || null);
        }
      },
    );
    return () => subscription?.unsubscribe();
  }, [control, policies]);

  const policyRegister = register("policyId");

  const onValid = (data: ClaimFormData) => {
    setValidatedData(data);
    setConfirmOpen(true);
  };

  const onSubmit = async (data: ClaimFormData) => {
    if (!validatedData) return;

    setIsSubmitting(true);

    try {
      if (mode === "create") {
        await dispatch(createClaim(data)).unwrap();
        toast.success("Claim created successfully");
        reset();
        router.push("/dashboard/claims");
      } else if (initialClaim) {
        await dispatch(updateClaim({ id: initialClaim.id, data })).unwrap();
        toast.success("Claim updated successfully");
        router.push("/dashboard/claims");
      }
    } catch (error: any) {
      toast.error(error || `Failed to ${mode} claim`);
    } finally {
      setIsSubmitting(false);
      setConfirmOpen(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <CustomerBreadcrumbs
        items={[
          { label: "Claims", href: "/dashboard/claims" },
          { label: mode === "create" ? "New Claim" : "Edit Claim" },
        ]}
      />

      <div>
        <h1 className="mt-2 font-serif text-2xl font-semibold tracking-tight sm:text-[28px] text-slate-900">
          {mode === "create" ? "New Claim" : "Edit Claim"}
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
          {mode === "create"
            ? "Record a new claim against a policy."
            : "Update the claim details below."}
        </p>
      </div>

      <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Claim Information */}
          <div className="lg:col-span-2 space-y-6">
            <CustomerSectionCard title="Claim Information" icon={FileText}>
              {/* Policy Select */}
              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Policy
                  <span className="ml-0.5 text-rose-500">*</span>
                </label>
                <select
                  className="w-full rounded-xl border border-slate-200 bg-white py-2.75 px-3 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 hover:border-slate-300 focus:border-[#B8873A] focus:ring-2 focus:ring-[#B8873A]/20"
                  {...register("policyId")}
                  onChange={(e) => {
                    policyRegister.onChange(e);
                    const policy = policies.find(
                      (p) => p.id === e.target.value,
                    );
                    setSelectedPolicy(policy || null);
                  }}
                >
                  <option value="">Select Policy</option>
                  {policies.map((policy) => (
                    <option key={policy.id} value={policy.id}>
                      {policy.policyNumber} - {policy.product?.productName}
                    </option>
                  ))}
                </select>
                {errors.policyId?.message && (
                  <p className="mt-1 text-xs text-rose-600">
                    {errors.policyId?.message}
                  </p>
                )}
              </div>

              {/* Policy Details Table */}
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

              <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Claim Type
                    <span className="ml-0.5 text-rose-500">*</span>
                  </label>
                  <select
                    {...register("claimType")}
                    className="w-full rounded-xl border border-slate-200 bg-white py-2.75 px-3 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 hover:border-slate-300 focus:border-[#B8873A] focus:ring-2 focus:ring-[#B8873A]/20"
                  >
                    <option value="">Select</option>
                    <option value="Active">Active</option>
                    <option value="Completed">Completed</option>
                    <option value="Fully Paid Up">Fully Paid Up</option>
                    <option value="Lapsed">Lapsed</option>
                    <option value="Maturity Claimed">Maturity Claimed</option>
                    <option value="Pending">Pending</option>
                    <option value="Surrendered">Surrendered</option>
                    <option value="Death">Death</option>
                    <option value="Maturity">Maturity</option>
                    <option value="Rider">Rider</option>
                    <option value="Other">Other</option>
                  </select>
                  {errors.claimType?.message && (
                    <p className="mt-1 text-xs text-rose-600">
                      {errors.claimType?.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Claim Date
                    <span className="ml-0.5 text-rose-500">*</span>
                  </label>
                  <Controller
                    control={control}
                    name="claimDate"
                    render={({ field }) => (
                      <DatePicker
                        value={field.value ? new Date(field.value) : undefined}
                        onChange={(date: any) =>
                          field.onChange(date ? format(date, "yyyy-MM-dd") : "")
                        }
                      />
                    )}
                  />
                  {errors.claimDate?.message && (
                    <p className="mt-1 text-xs text-rose-600">
                      {errors.claimDate?.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Claimed Amount
                    <span className="ml-0.5 text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    {...register("claimAmount")}
                    className="w-full rounded-xl border border-slate-200 bg-white py-2.75 px-3 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 hover:border-slate-300 focus:border-[#B8873A] focus:ring-2 focus:ring-[#B8873A]/20"
                    placeholder="Enter Claim amount"
                  />
                  {errors.claimAmount?.message && (
                    <p className="mt-1 text-xs text-rose-600">
                      {errors.claimAmount?.message}
                    </p>
                  )}
                </div>
                <div>
                  <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Reason for Claim
                    <span className="ml-0.5 text-rose-500">*</span>
                  </label>
                  <textarea
                    {...register("reasonForClaim")}
                    rows={3}
                    placeholder="Enter reason for claim"
                    className="w-full rounded-xl border border-slate-200 bg-white py-2.75 px-3 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 hover:border-slate-300 focus:border-[#B8873A] focus:ring-2 focus:ring-[#B8873A]/20 resize-none"
                  />
                  {errors.reasonForClaim?.message && (
                    <p className="mt-1 text-xs text-rose-600">
                      {errors.reasonForClaim?.message}
                    </p>
                  )}
                </div>
              </div>
            </CustomerSectionCard>
          </div>

          {/* Right Column - Claimant Information */}
          <div className="lg:col-span-1">
            <div className="sticky top-6">
              <CustomerSectionCard title="Claimant Information" icon={User}>
                <div>
                  <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Claimant Name
                    <span className="ml-0.5 text-rose-500">*</span>
                  </label>
                  <input
                    {...register("claimantName")}
                    className="w-full rounded-xl border border-slate-200 bg-white py-2.75 px-3 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 hover:border-slate-300 focus:border-[#B8873A] focus:ring-2 focus:ring-[#B8873A]/20"
                  />
                  {errors.claimantName?.message && (
                    <p className="mt-1 text-xs text-rose-600">
                      {errors.claimantName?.message}
                    </p>
                  )}
                </div>
              </CustomerSectionCard>
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/dashboard/claims")}
          >
            Cancel
          </Button>

          <Button
            disabled={isSubmitting}
            type="button"
            variant="primary"
            leftIcon={
              isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )
            }
            onClick={handleSubmit(onValid as any)}
          >
            {mode === "create" ? "Create Claim" : "Save Changes"}
          </Button>
        </div>
      </form>

      {/* Confirmation Modal */}
      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-50 rounded-xl">
                <AlertCircle size={22} className="text-red-500" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {mode === "create" ? "Raise Claim" : "Update Claim"}
                </h3>
                <p className="text-xs text-slate-400">
                  This action cannot be undone
                </p>
              </div>
            </div>
            <p className="text-sm text-slate-600 mb-6 leading-relaxed">
              {mode === "create"
                ? "Are you sure you want to raise this claim?"
                : "Are you sure you want to update this claim?"}
            </p>
            <div className="flex items-center justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setConfirmOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={handleSubmit(onSubmit as any)}
              >
                {mode === "create" ? "Create" : "Save"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
