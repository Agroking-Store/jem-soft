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
import { ChevronRight, AlertCircle, Loader2, Save } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";
import DatePicker from "../lic/policies/new/DatePicker";
import type { Policy } from "@/features/policy/policySlice";

interface ClaimFormProps {
  mode: "create" | "edit";
  initialClaim?: Claim | null;
}

const claimSchema = z.object({
  policyId: z.string().min(1, "Policy is required"),
  claimantName: z.string().min(3, "Claimant name is required"),
  claimType: z.string().min(1, "Claim type is required"),
  claimAmount: z.coerce
    .number()
    .positive("Claim amount must be greater than 0"),
  claimDate: z.string().min(1, "Claim date is required"),
});

type ClaimFormData = z.infer<typeof claimSchema>;

export default function ClaimForm({ mode, initialClaim }: ClaimFormProps) {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();

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
      claimAmount: 0,
      claimDate: "",
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
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Link href="/dashboard/claims" className="hover:text-blue-600">
          Claims
        </Link>
        <ChevronRight size={16} />
        <span className="font-medium text-slate-700">
          {mode === "create" ? "New Claim" : "Edit Claim"}
        </span>
      </div>
      <h1 className="text-2xl font-bold text-slate-900 mt-5">
        {mode === "create" ? "New Claim" : "Edit Claim"}
      </h1>
      <p className="text-slate-500 text-sm mt-1">
        {mode === "create"
          ? "Record a new claim against a policy."
          : "Update the claim details below."}
      </p>

      <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white col-span-2 border border-slate-200 rounded-xl p-6 transition-all duration-500">
            <p className="text-xl font-bold">Claim Information</p>
            <div>
              <label className="block mt-5 text-slate-500 font-semibold">
                Policy
                <span className="text-red-500">*</span>
              </label>
              <select
                className="w-full px-3 py-2 border border-slate-200 rounded-lg 
                focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                {...register("policyId")}
                onChange={(e) => {
                  policyRegister.onChange(e);
                  const policy = policies.find((p) => p.id === e.target.value);
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
              <p className="text-xs text-red-500 mt-1">
                {errors.policyId?.message}
              </p>
            </div>

            {/* Policy Details Table */}
            <div className="bg-slate-50">
              <table className="w-full text-center mt-5">
                <thead>
                  <tr>
                    <th className="p-6 text-slate-500 font-semibold">
                      Customer
                    </th>
                    <th className="p-6 text-slate-500 font-semibold">
                      Sum assured
                    </th>
                    <th className="p-6 text-slate-500 font-semibold">
                      Policy Status
                    </th>
                    <th className="p-6 text-slate-500 font-semibold">
                      Policy Start Date
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="font-bold p-3">
                      {selectedPolicy?.CustomerMaster?.firstName || "-"}{" "}
                      {selectedPolicy?.CustomerMaster?.lastName}
                    </td>
                    <td className="font-bold p-3">
                      {selectedPolicy?.premium?.sumAssured || "-"}
                    </td>
                    <td className="font-bold p-3">
                      {selectedPolicy?.status?.statusName || "-"}
                    </td>
                    <td className="font-bold p-3">
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

            <div className="mt-5 w-full flex gap-6">
              <div className="flex-1">
                <label className="block text-slate-500 font-semibold">
                  Claim Type
                  <span className="text-red-500">*</span>
                </label>
                <select
                  {...register("claimType")}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg 
                  focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
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
                <p className="text-xs text-red-500 mt-1">
                  {errors.claimType?.message}
                </p>
              </div>

              <div className="flex-1">
                <label className="block text-slate-500 font-semibold">
                  Claim Date
                  <span className="text-red-500">*</span>
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
                <p className="text-xs text-red-500 mt-1">
                  {errors.claimDate?.message}
                </p>
              </div>
            </div>

            <div className="w-full flex gap-6 mt-5">
              <div className="flex-1">
                <label className="block text-slate-500 font-semibold">
                  Claimed Amount
                  <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  {...register("claimAmount")}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg 
                  focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                />
                <p className="text-xs text-red-500 mt-1">
                  {errors.claimAmount?.message}
                </p>
              </div>
            </div>
          </div>

          <div className="col-span-1 bg-white border border-slate-200 rounded-xl p-6 transition-all duration-500">
            <p className="text-xl font-bold">Claimant Information</p>
            <div className="mt-5">
              <label className="block text-slate-500 font-semibold">
                Claimant Name
                <span className="text-red-500">*</span>
              </label>
              <input
                {...register("claimantName")}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg 
                focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
              />
              <p className="text-xs text-red-500 mt-1">
                {errors.claimantName?.message}
              </p>
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => router.push("/dashboard/claims")}
            className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>

          <button
            disabled={isSubmitting}
            type="button"
            onClick={handleSubmit(onValid as any)}
            className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition disabled:opacity-60"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {mode === "create" ? "Create Claim" : "Save Changes"}
          </button>
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
              <button
                onClick={() => setConfirmOpen(false)}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-sm rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit(onSubmit as any)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-lg shadow-sm transition-colors flex items-center gap-2"
              >
                {mode === "create" ? "Create" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
