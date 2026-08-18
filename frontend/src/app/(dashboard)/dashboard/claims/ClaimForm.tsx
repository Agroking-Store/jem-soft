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
  calculateClaimAmount,
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
  Info,
  Search,
  ChevronDown,
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

type ClaimCalculation = {
  maxClaimAmount: number | null;
  calculation: {
    sumAssured: number;
    reversionaryBonus: number;
    finalAdditionalBonus: number;
    outstandingLoan: number;
    loanInterest: number;
  };
};

/* ────────────────────────────────────────────────────────────────
 * Payment Details types
 * ──────────────────────────────────────────────────────────────── */
type PaymentType = "NEFT" | "Cheque";

interface ChequeFields {
  chequeNumber: string;
  chequeDate: string;
  bankName: string;
  branchName: string;
  chequeAmount: string;
}

export default function ClaimForm({ mode, initialClaim }: ClaimFormProps) {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();

  const [selectedPolicy, setSelectedPolicy] = useState<Policy | null>(null);
  const [confirmedCalculation, setConfirmedCalculation] =
    useState<ClaimCalculation | null>(null);
  const [isCalculatingClaim, setIsCalculatingClaim] = useState(false);

  const isClaimCalculationSupported = (claimType: string) =>
    ["Death", "Maturity", "Surrender"].includes(claimType);

  const claimSchema = z
    .object({
      policyId: z.string().min(1, "Policy is required"),
      claimantName: z.string().optional(),
      claimType: z.string().min(1, "Claim type is required"),
      claimAmount: z.coerce
        .number()
        .positive("Claim amount must be greater than 0"),
      claimDate: z.string().min(1, "Claim date is required"),
      reasonForClaim: z
        .string()
        .min(10, "Reason for claim must be at least 10 characters")
        .max(500, "Reason for claim must not exceed 500 characters"),
    })
    .refine(
      (data) => {
        const sumAssured = selectedPolicy?.premium?.sumAssured;
        if (!sumAssured) return true;
        if (["Death", "Maturity", "Surrender"].includes(data.claimType)) {
          return true;
        }
        return data.claimAmount <= sumAssured;
      },
      {
        message: "Claim amount must be less than or equal to sum assured",
        path: ["claimAmount"],
      },
    )
    .refine(
      (data) => {
        if (!isClaimCalculationSupported(data.claimType)) return true;
        if (
          !confirmedCalculation?.maxClaimAmount &&
          confirmedCalculation?.maxClaimAmount !== 0
        )
          return true;
        return data.claimAmount <= confirmedCalculation.maxClaimAmount;
      },
      {
        message: "Claim amount cannot exceed the maximum claimable amount.",
        path: ["claimAmount"],
      },
    )
    .refine(
      (data) => {
        if (!selectedPolicy) return true;
        const claimDate = new Date(data.claimDate);
        const policyStartDate = new Date(selectedPolicy.commencementDate);

        return claimDate > policyStartDate;
      },
      {
        message: "Claim date must be after policy start date",
        path: ["claimDate"],
      },
    );

  type ClaimFormData = z.infer<typeof claimSchema>;

  const { policies } = useSelector((state: RootState) => state.policies);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [validatedData, setValidatedData] = useState<ClaimFormData | null>(
    null,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  /* ── Payment details state ─────────────────────────────────── */
  const [paymentType, setPaymentType] = useState<PaymentType | "">("");
  const [paymentError, setPaymentError] = useState<string>("");
  const [chequeFields, setChequeFields] = useState<ChequeFields>({
    chequeNumber: "",
    chequeDate: "",
    bankName: "",
    branchName: "",
    chequeAmount: "",
  });

  /* ── Nominee state ─────────────────────────────────────────── */
  interface Nominee {
    id: string;
    nomineeName: string;
    relationship: string;
    dateOfBirth: string;
    phone: string;
    email: string;
    percentage?: number | string;
  }

  const [nomineeOpen, setNomineeOpen] = useState(true);
  const [selectedNominee, setSelectedNominee] = useState<Nominee | null>(null);

  // Derive nominees from the selected policy (always read from policy data)
  const nomineeList: Nominee[] = (selectedPolicy?.nominees || []).map(
    (n: any, index: number) => ({
      id: n.id || String(index),
      nomineeName: n.nomineeName || "",
      relationship: n.relationship || "",
      dateOfBirth: n.dateOfBirth
        ? new Date(n.dateOfBirth).toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          })
        : "-",
      phone: n.phone || "-",
      email: n.email || "-",
      percentage: n.percentage ? Number(n.percentage) : "-",
    }),
  );

  /* ── Helper: default bank details from selected policy ─────── */
  // Derive account holder name from CustomerMaster (same as Policy view)
  const getFullName = (cm: any) => {
    return [cm?.salutation, cm?.firstName, cm?.middleName, cm?.lastName]
      .filter(Boolean)
      .join(" ");
  };

  const defaultBank = selectedPolicy?.CustomerMaster?.bankDetails?.[0];
  const bankDefaults = {
    accountHolderName:
      defaultBank?.accountHolderName ||
      getFullName(selectedPolicy?.CustomerMaster) ||
      "",
    bankName: defaultBank?.bankName ?? "",
    accountNumber: defaultBank?.accountNumber ?? "",
    ifscCode: defaultBank?.ifscCode ?? "",
    branchName: defaultBank?.bankBranch ?? "",
    accountType: defaultBank?.accountType ?? "",
  };

  const {
    register,
    handleSubmit,
    control,
    watch,
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

      // Set payment type
      if (
        initialClaim.paymentType === "Cheque" ||
        initialClaim.paymentType === "NEFT"
      ) {
        setPaymentType(initialClaim.paymentType);
      }

      // Set cheque fields in edit mode
      if (initialClaim.paymentType === "Cheque") {
        setChequeFields({
          chequeNumber: initialClaim.chequeNumber || "",
          chequeDate: initialClaim.chequeDate
            ? new Date(initialClaim.chequeDate).toISOString().slice(0, 10)
            : "",
          bankName: initialClaim.bankName || "",
          branchName: initialClaim.branchName || "",
          chequeAmount: initialClaim.chequeAmount
            ? String(initialClaim.chequeAmount)
            : "",
        });
      }
    }
  }, [mode, initialClaim, reset, policies]);

  // Pre-select nominee in edit mode
  useEffect(() => {
    if (
      mode === "edit" &&
      initialClaim &&
      initialClaim.nomineeId &&
      selectedPolicy?.nominees
    ) {
      const nom = selectedPolicy.nominees.find(
        (n: any) => n.id === initialClaim.nomineeId,
      );
      if (nom) {
        setSelectedNominee({
          id: nom.id,
          nomineeName: nom.nomineeName || "",
          relationship: nom.relationship || "",
          dateOfBirth: nom.dateOfBirth
            ? new Date(nom.dateOfBirth).toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
              })
            : "-",
          phone: nom.phone || "-",
          email: nom.email || "-",
        });
      }
    }
  }, [mode, initialClaim, selectedPolicy]);

  // Sync selectedPolicy when policyId changes
  const selectedPolicyId = watch("policyId");
  const selectedClaimType = watch("claimType");
  const claimDateValue = watch("claimDate");

  useEffect(() => {
    const policy = policies.find((p) => p.id === selectedPolicyId);
    setSelectedPolicy(policy || null);
    setSelectedNominee(null); // Reset nominee when policy changes
  }, [selectedPolicyId, policies]);

  useEffect(() => {
    const fetchCalculation = async () => {
      if (!selectedPolicyId || !selectedClaimType) {
        setConfirmedCalculation(null);
        return;
      }

      if (!isClaimCalculationSupported(selectedClaimType)) {
        setConfirmedCalculation(null);
        return;
      }

      setIsCalculatingClaim(true);
      try {
        const result = await dispatch(
          calculateClaimAmount({
            policyId: selectedPolicyId,
            claimType: selectedClaimType,
            claimDate: claimDateValue,
          }),
        ).unwrap();
        setConfirmedCalculation(result);
      } catch (error) {
        setConfirmedCalculation(null);
      } finally {
        setIsCalculatingClaim(false);
      }
    };

    fetchCalculation();
  }, [dispatch, selectedPolicyId, selectedClaimType, claimDateValue]);

  // Clear selected nominee when claim type is not "Death"
  useEffect(() => {
    if (selectedClaimType !== "Death") {
      setSelectedNominee(null);
    }
  }, [selectedClaimType]);

  const policyRegister = register("policyId");

  const onValid = (data: ClaimFormData) => {
    // Validate payment type
    if (!paymentType) {
      setPaymentError("Please select a payment method (NEFT or Cheque).");
      return;
    }
    setPaymentError("");
    setValidatedData(data);
    setConfirmOpen(true);
  };

  const onSubmit = async (data: ClaimFormData) => {
    setIsSubmitting(true);

    // Compute claimantName from selected policy's CustomerMaster (create mode)
    // or use the existing claim's saved name (edit mode)
    const getClaimantName = () => {
      if (mode === "edit" && initialClaim?.claimantName) {
        return initialClaim.claimantName;
      }
      return getFullName(selectedPolicy?.CustomerMaster) || "";
    };

    const payload: any = {
      ...data,
      claimantName: getClaimantName(),
      nomineeId: selectedNominee?.id || undefined,
      paymentType: paymentType || undefined,
    };

    // Add payment-specific fields
    if (paymentType === "NEFT") {
      payload.accountHolderName = bankDefaults.accountHolderName || undefined;
      payload.bankName = bankDefaults.bankName || undefined;
      payload.accountNumber = bankDefaults.accountNumber || undefined;
      payload.ifscCode = bankDefaults.ifscCode || undefined;
      payload.branchName = bankDefaults.branchName || undefined;
      // accountType is not stored in DB, so we skip it
    } else if (paymentType === "Cheque") {
      payload.chequeNumber = chequeFields.chequeNumber || undefined;
      payload.chequeDate = chequeFields.chequeDate || undefined;
      payload.bankName = chequeFields.bankName || undefined;
      payload.branchName = chequeFields.branchName || undefined;
      payload.chequeAmount = chequeFields.chequeAmount
        ? parseFloat(chequeFields.chequeAmount)
        : undefined;
    }

    try {
      if (mode === "create") {
        await dispatch(createClaim(payload)).unwrap();
        toast.success("Claim created successfully");
        reset();
        router.push("/dashboard/claims");
      } else if (initialClaim) {
        await dispatch(
          updateClaim({ id: initialClaim.id, data: payload }),
        ).unwrap();
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

  /* ── Shared class strings ──────────────────────────────────── */
  const inputClass =
    "w-full rounded-xl border border-slate-200 bg-white py-2.75 px-3 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 hover:border-slate-300 focus:border-[#B8873A] focus:ring-2 focus:ring-[#B8873A]/20";
  const disabledInputClass =
    "w-full rounded-xl border border-slate-200 bg-slate-50 py-2.75 px-3 text-sm text-slate-500 outline-none cursor-not-allowed";
  const selectClass =
    "w-full rounded-xl border border-slate-200 bg-white py-2.75 px-3 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 hover:border-slate-300 focus:border-[#B8873A] focus:ring-2 focus:ring-[#B8873A]/20";
  const labelClass =
    "mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500";

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
          {/* Left Column - Claim Information + Payment Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* ── Claim Information Card ─────────────────────────── */}
            <CustomerSectionCard title="Claim Information" icon={FileText}>
              {/* Policy Select */}
              <div>
                <label className={labelClass}>
                  Policy
                  <span className="ml-0.5 text-rose-500">*</span>
                </label>
                <select
                  className={selectClass}
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
                  <label className={labelClass}>
                    Claim Type
                    <span className="ml-0.5 text-rose-500">*</span>
                  </label>
                  <select {...register("claimType")} className={selectClass}>
                    <option value="">Select</option>
                    <option value="Maturity">Maturity</option>
                    <option value="Death">Death</option>
                    <option value="Surrender">Surrender</option>
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
                  <label className={labelClass}>
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
                  <label className={labelClass}>
                    Claimed Amount
                    <span className="ml-0.5 text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    {...register("claimAmount")}
                    className={inputClass}
                    placeholder="Enter Claim amount"
                  />
                  {errors.claimAmount?.message && (
                    <p className="mt-1 text-xs text-rose-600">
                      {errors.claimAmount?.message}
                    </p>
                  )}
                  {selectedPolicy &&
                    confirmedCalculation?.maxClaimAmount != null && (
                      <p className="mt-2 rounded-lg border border-emerald-200 bg-[#F0FDF4] px-3 py-2 text-sm text-emerald-700">
                        ✓ Maximum claimable amount:{" "}
                        {`₹${confirmedCalculation.maxClaimAmount.toLocaleString("en-IN")}`}
                      </p>
                    )}
                </div>
                <div>
                  <label className={labelClass}>
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

            {/* ── Payment Details Card ───────────────────────────── */}
            <CustomerSectionCard title="Payment Details">
              {/* Payment Type Radio Buttons */}
              <div className="mb-6">
                <label className={labelClass}>
                  Payment Type
                  <span className="ml-0.5 text-rose-500">*</span>
                </label>
                <div className="flex items-center gap-[35px] mt-2">
                  <label className="flex items-center gap-2.5 cursor-pointer group">
                    <input
                      type="radio"
                      name="paymentType"
                      value="Cheque"
                      checked={paymentType === "Cheque"}
                      onChange={() => setPaymentType("Cheque")}
                      className="peer sr-only"
                    />
                    <span className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-slate-300 transition-all peer-checked:border-[#2563EB] peer-checked:bg-[#2563EB] group-hover:border-slate-400">
                      <span className="h-2 w-2 rounded-full bg-white scale-0 transition-transform peer-checked:scale-100" />
                    </span>
                    <span className="text-sm font-medium text-slate-700 peer-checked:text-slate-900">
                      Cheque
                    </span>
                  </label>
                  <label className="flex items-center gap-2.5 cursor-pointer group">
                    <input
                      type="radio"
                      name="paymentType"
                      value="NEFT"
                      checked={paymentType === "NEFT"}
                      onChange={() => setPaymentType("NEFT")}
                      className="peer sr-only"
                    />
                    <span className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-slate-300 transition-all peer-checked:border-[#2563EB] peer-checked:bg-[#2563EB] group-hover:border-slate-400">
                      <span className="h-2 w-2 rounded-full bg-white scale-0 transition-transform peer-checked:scale-100" />
                    </span>
                    <span className="text-sm font-medium text-slate-700 peer-checked:text-slate-900">
                      NEFT
                    </span>
                  </label>
                </div>
                {paymentError && (
                  <p className="mt-2 text-xs text-rose-600">{paymentError}</p>
                )}
              </div>

              {/* ── NEFT: Read-only fields ──────────────────────── */}
              {paymentType === "NEFT" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className={labelClass}>Account Holder Name</label>
                    <input
                      type="text"
                      value={bankDefaults.accountHolderName}
                      disabled
                      className={disabledInputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Bank Name</label>
                    <input
                      type="text"
                      value={bankDefaults.bankName}
                      disabled
                      className={disabledInputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Account Number</label>
                    <input
                      type="text"
                      value={bankDefaults.accountNumber}
                      disabled
                      className={disabledInputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>IFSC Code</label>
                    <input
                      type="text"
                      value={bankDefaults.ifscCode}
                      disabled
                      className={disabledInputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Branch Name</label>
                    <input
                      type="text"
                      value={bankDefaults.branchName}
                      disabled
                      className={disabledInputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Account Type</label>
                    <input
                      type="text"
                      value={bankDefaults.accountType}
                      disabled
                      className={disabledInputClass}
                    />
                  </div>
                </div>
              )}

              {/* ── Cheque: Editable fields ─────────────────────── */}
              {paymentType === "Cheque" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className={labelClass}>
                      Cheque Number
                      <span className="ml-0.5 text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={chequeFields.chequeNumber}
                      onChange={(e) =>
                        setChequeFields((prev) => ({
                          ...prev,
                          chequeNumber: e.target.value,
                        }))
                      }
                      placeholder="Enter cheque number"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>
                      Cheque Date
                      <span className="ml-0.5 text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="date"
                        value={chequeFields.chequeDate}
                        onChange={(e) =>
                          setChequeFields((prev) => ({
                            ...prev,
                            chequeDate: e.target.value,
                          }))
                        }
                        className={inputClass}
                      />
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>
                      Bank Name
                      <span className="ml-0.5 text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={chequeFields.bankName}
                      onChange={(e) =>
                        setChequeFields((prev) => ({
                          ...prev,
                          bankName: e.target.value,
                        }))
                      }
                      placeholder="Enter bank name"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>
                      Branch Name
                      <span className="ml-0.5 text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={chequeFields.branchName}
                      onChange={(e) =>
                        setChequeFields((prev) => ({
                          ...prev,
                          branchName: e.target.value,
                        }))
                      }
                      placeholder="Enter branch name"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>
                      Cheque Amount
                      <span className="ml-0.5 text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={chequeFields.chequeAmount}
                      onChange={(e) =>
                        setChequeFields((prev) => ({
                          ...prev,
                          chequeAmount: e.target.value,
                        }))
                      }
                      placeholder="Enter cheque amount"
                      className={inputClass}
                    />
                  </div>
                </div>
              )}
            </CustomerSectionCard>
          </div>

          {/* Right Column - Nominee Details (shown only for Death claims) */}
          {selectedClaimType === "Death" && (
            <div className="lg:col-span-1">
              <div className="sticky top-6">
                <CustomerSectionCard title="Nominee Details" icon={User}>
                  {/* Nominee Dropdown */}
                  <div className="relative">
                    <label className={labelClass}>Nominee</label>
                    <button
                      type="button"
                      onClick={() => {
                        if (selectedPolicy && nomineeList.length > 0) {
                          setNomineeOpen((o) => !o);
                        }
                      }}
                      disabled={!selectedPolicy || nomineeList.length === 0}
                      className={`relative flex w-full items-center justify-between gap-2 rounded-xl border bg-white py-2.75 px-3 text-sm outline-none transition-all
                      ${!selectedPolicy || nomineeList.length === 0 ? "cursor-not-allowed bg-slate-50 text-slate-400" : "cursor-pointer text-slate-900 hover:border-slate-300"}
                      ${nomineeOpen ? "border-[#B8873A] ring-2 ring-[#B8873A]/15" : "border-slate-200"}
                    `}
                    >
                      <span
                        className={`truncate text-left ${!selectedNominee ? "text-slate-400" : ""}`}
                      >
                        {selectedNominee
                          ? selectedNominee.nomineeName
                          : nomineeList.length === 0
                            ? "No nominees available"
                            : "Select Nominee"}
                      </span>
                      <ChevronDown
                        size={15}
                        className={`shrink-0 text-slate-400 transition-transform ${nomineeOpen ? "rotate-180" : ""}`}
                      />
                    </button>

                    {/* Dropdown Panel */}
                    {nomineeOpen && nomineeList.length > 0 && (
                      <div className="absolute z-[100] mt-1.5 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_16px_40px_rgba(15,23,42,0.14)]">
                        <div className="max-h-60 overflow-y-auto py-1">
                          {nomineeList.map((nominee) => (
                            <button
                              key={nominee.id}
                              type="button"
                              onClick={() => {
                                setSelectedNominee(nominee);
                                setNomineeOpen(false);
                              }}
                              className={`flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-sm transition-colors hover:bg-[#B8873A]/8 ${
                                selectedNominee?.id === nominee.id
                                  ? "bg-[#B8873A]/10 font-semibold text-[#0B1220]"
                                  : "text-slate-700"
                              }`}
                            >
                              <span className="min-w-0">
                                <span className="block truncate">
                                  {nominee.nomineeName}
                                </span>
                                <span className="block truncate text-xs text-slate-400">
                                  {nominee.relationship}
                                </span>
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Helper Text */}
                  <p className="mt-2 flex items-start gap-1.5 text-xs text-slate-400">
                    <Info size={12} className="mt-0.5 shrink-0" />
                    <span>
                      Nominee details are automatically fetched from the
                      selected policy.
                    </span>
                  </p>

                  {/* Auto-filled Nominee Details (read-only) */}
                  {selectedNominee && (
                    <div className="mt-5 space-y-4">
                      <div className="border-t border-slate-100 pt-4">
                        <div className="grid grid-cols-1 gap-4">
                          <div>
                            <label className={labelClass}>Nominee Name</label>
                            <input
                              type="text"
                              value={selectedNominee.nomineeName}
                              disabled
                              className={disabledInputClass}
                            />
                          </div>
                          <div>
                            <label className={labelClass}>Relationship</label>
                            <input
                              type="text"
                              value={selectedNominee.relationship}
                              disabled
                              className={disabledInputClass}
                            />
                          </div>
                          <div>
                            <label className={labelClass}>Date of Birth</label>
                            <input
                              type="text"
                              value={selectedNominee.dateOfBirth}
                              disabled
                              className={disabledInputClass}
                            />
                          </div>
                          <div>
                            <label className={labelClass}>Phone Number</label>
                            <input
                              type="text"
                              value={selectedNominee.phone}
                              disabled
                              className={disabledInputClass}
                            />
                          </div>
                          <div>
                            <label className={labelClass}>Share %</label>
                            <input
                              type="text"
                              value={
                                selectedNominee.percentage !== undefined
                                  ? String(selectedNominee.percentage)
                                  : "-"
                              }
                              disabled
                              className={disabledInputClass}
                            />
                          </div>
                          <div>
                            <label className={labelClass}>Email Address</label>
                            <input
                              type="text"
                              value={selectedNominee.email}
                              disabled
                              className={disabledInputClass}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* No policy selected state */}
                  {!selectedPolicy && (
                    <div className="mt-5 border-t border-slate-100 pt-4">
                      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-4 py-6 text-center">
                        <p className="text-xs text-slate-400">
                          Select a policy to view nominee details.
                        </p>
                      </div>
                    </div>
                  )}
                </CustomerSectionCard>
              </div>
            </div>
          )}
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
