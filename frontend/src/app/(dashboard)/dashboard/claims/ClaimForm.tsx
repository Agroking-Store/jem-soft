"use client";

import { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import type { RootState, AppDispatch } from "@/store/store";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { fetchPolicies } from "@/features/policy/policySlice";
import {
  calculateClaimAmount,
  createClaim,
  updateClaim,
  uploadClaimDocuments,
  deleteClaimDocument,
  type Claim,
  type ClaimCalculation,
} from "@/features/claim/claimSlice";
import {
  AlertCircle,
  Loader2,
  Save,
  User,
  FileText,
  Info,
  ChevronDown,
  Trash2,
  Calculator,
} from "lucide-react";
import toast from "react-hot-toast";
import type { Policy } from "@/features/policy/policySlice";
import { Button } from "@/shared/components/ui/Button";
import {
  CustomerSectionCard,
  CustomerBreadcrumbs,
} from "@/features/customers/components/CustomerUi";

interface ClaimFormProps {
  mode: "create" | "edit";
  initialClaim?: Claim | null;
}

type PaymentType = "NEFT" | "Cheque";

interface ChequeFields {
  chequeNumber: string;
  chequeDate: string;
  bankName: string;
  branchName: string;
  chequeAmount: string;
}

const CLAIM_TYPES = [
  { value: "Death", label: "Death" },
  { value: "Maturity", label: "Maturity" },
  { value: "Surrender", label: "Surrender" },
];

export default function ClaimForm({ mode, initialClaim }: ClaimFormProps) {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();

  const [selectedPolicy, setSelectedPolicy] = useState<Policy | null>(null);
  const [calculation, setCalculation] = useState<ClaimCalculation | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  const isCalculationSupported = (type: string) =>
    ["Death", "Maturity", "Surrender"].includes(type);

  /* ── Zod Schema ─────────────────────────────────────── */
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
        .min(10, "Reason must be at least 10 characters")
        .max(500, "Reason must not exceed 500 characters"),
    })
    .refine(
      (d) => {
        if (!calculation?.maxClaimAmount) return true;
        return d.claimAmount <= calculation.maxClaimAmount;
      },
      {
        message: "Claim amount cannot exceed the maximum claimable amount",
        path: ["claimAmount"],
      },
    )
    .refine(
      (d) => {
        if (!selectedPolicy) return true;
        return (
          new Date(d.claimDate) > new Date(selectedPolicy.commencementDate)
        );
      },
      {
        message: "Claim date must be after policy start date",
        path: ["claimDate"],
      },
    )
    .refine((d) => new Date(d.claimDate) <= new Date(), {
      message: "Claim date cannot be in the future",
      path: ["claimDate"],
    });

  type ClaimFormData = z.infer<typeof claimSchema>;

  const { policies } = useSelector((state: RootState) => state.policies);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  /* ── Payment State ──────────────────────────────────── */
  const [paymentType, setPaymentType] = useState<PaymentType | "">("");
  const [paymentError, setPaymentError] = useState("");
  const [chequeFields, setChequeFields] = useState<ChequeFields>({
    chequeNumber: "",
    chequeDate: "",
    bankName: "",
    branchName: "",
    chequeAmount: "",
  });

  /* ── Nominee State ──────────────────────────────────── */
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

  const nomineeList: Nominee[] = (selectedPolicy?.nominees || []).map(
    (n: any, i: number) => ({
      id: n.id || String(i),
      nomineeName: n.nomineeName || "",
      relationship: n.relationship || "",
      dateOfBirth: n.dateOfBirth
        ? new Date(n.dateOfBirth).toLocaleDateString("en-IN")
        : "-",
      phone: n.phone || "-",
      email: n.email || "-",
      percentage: n.percentage ? Number(n.percentage) : "-",
    }),
  );

  /* ── Document State ─────────────────────────────────── */
  interface SelectedDocument {
    file: File;
    id?: string;
  }
  const [selectedDocuments, setSelectedDocuments] = useState<
    SelectedDocument[]
  >([]);
  const [documentError, setDocumentError] = useState("");

  const ALLOWED_TYPES = ["application/pdf", "image/jpeg", "image/png"];
  const MAX_SIZE = 10 * 1024 * 1024;

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type))
      return "Only PDF, JPG, JPEG and PNG files are allowed.";
    if (file.size > MAX_SIZE) return "File size must not exceed 10 MB.";
    return null;
  };

  const handleDocumentSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setDocumentError("");
    const validFiles: SelectedDocument[] = [];
    for (const file of files) {
      const err = validateFile(file);
      if (err) {
        setDocumentError(err);
        return;
      }
      const dup = selectedDocuments.some(
        (d) => d.file.name === file.name && d.file.size === file.size,
      );
      if (!dup) validFiles.push({ file });
    }
    setSelectedDocuments((p) => [...p, ...validFiles]);
    e.target.value = "";
  };

  const removeDocument = (index: number) => {
    setSelectedDocuments((p) => p.filter((_, i) => i !== index));
    setDocumentError("");
  };

  /* ── Bank Defaults ──────────────────────────────────── */
  const getFullName = (cm: any) =>
    [cm?.salutation, cm?.firstName, cm?.middleName, cm?.lastName]
      .filter(Boolean)
      .join(" ");

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

  /* ── Form ───────────────────────────────────────────── */
  const {
    register,
    handleSubmit,
    watch,
    reset,
    setValue,
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

  const selectedPolicyId = watch("policyId");
  const selectedClaimType = watch("claimType");
  const claimDateValue = watch("claimDate");

  /* ── Effects ────────────────────────────────────────── */
  useEffect(() => {
    dispatch(fetchPolicies());
  }, [dispatch]);

  // Load initial claim for edit
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

      const policy = policies.find((p) => p.id === initialClaim.policyId);
      if (policy) setSelectedPolicy(policy);

      if (
        initialClaim.paymentType === "Cheque" ||
        initialClaim.paymentType === "NEFT"
      ) {
        setPaymentType(initialClaim.paymentType);
      }

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

  // Load existing documents
  useEffect(() => {
    if (mode === "edit" && initialClaim?.documents) {
      const docs = initialClaim.documents.map((d) => ({
        file: new File([], d.originalName, { type: d.fileType || "" }),
        id: d.id,
      }));
      setSelectedDocuments(docs);
    }
  }, [mode, initialClaim]);

  // Sync selected policy
  useEffect(() => {
    const policy = policies.find((p) => p.id === selectedPolicyId);
    setSelectedPolicy(policy || null);
    setSelectedNominee(null);
  }, [selectedPolicyId, policies]);

  // Pre-select nominee in edit mode
  useEffect(() => {
    if (
      mode === "edit" &&
      initialClaim?.nomineeId &&
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
            ? new Date(nom.dateOfBirth).toLocaleDateString("en-IN")
            : "-",
          phone: nom.phone || "-",
          email: nom.email || "-",
        });
      }
    }
  }, [mode, initialClaim, selectedPolicy]);

  // Fetch calculation when policy/type/date changes
  useEffect(() => {
    const fetchCalc = async () => {
      if (
        !selectedPolicyId ||
        !selectedClaimType ||
        !isCalculationSupported(selectedClaimType)
      ) {
        setCalculation(null);
        return;
      }
      setIsCalculating(true);
      try {
        const result = await dispatch(
          calculateClaimAmount({
            policyId: selectedPolicyId,
            claimType: selectedClaimType,
            claimDate: claimDateValue,
          }),
        ).unwrap();
        setCalculation(result);

        // Auto-fill claim amount with max claimable (only in create mode)
        if (mode === "create" && result.maxClaimAmount) {
          setValue("claimAmount", result.maxClaimAmount);
        }
      } catch {
        setCalculation(null);
      } finally {
        setIsCalculating(false);
      }
    };
    fetchCalc();
  }, [
    dispatch,
    selectedPolicyId,
    selectedClaimType,
    claimDateValue,
    mode,
    setValue,
  ]);

  // Clear nominee for non-death claims
  useEffect(() => {
    if (selectedClaimType !== "Death") setSelectedNominee(null);
  }, [selectedClaimType]);

  /* ── Handlers ───────────────────────────────────────── */
  const onValid = () => {
    if (!paymentType) {
      setPaymentError("Please select a payment method.");
      return;
    }
    setPaymentError("");
    setConfirmOpen(true);
  };

  const onSubmit = async (data: ClaimFormData) => {
    setIsSubmitting(true);

    const getClaimantName = () => {
      if (mode === "edit" && initialClaim?.claimantName)
        return initialClaim.claimantName;
      return getFullName(selectedPolicy?.CustomerMaster) || "";
    };

    const payload: any = {
      ...data,
      claimantName: getClaimantName(),
      nomineeId: selectedNominee?.id || undefined,
      paymentType: paymentType || undefined,
    };

    if (paymentType === "NEFT") {
      payload.accountHolderName = bankDefaults.accountHolderName || undefined;
      payload.bankName = bankDefaults.bankName || undefined;
      payload.accountNumber = bankDefaults.accountNumber || undefined;
      payload.ifscCode = bankDefaults.ifscCode || undefined;
      payload.branchName = bankDefaults.branchName || undefined;
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
      let claimId: string;
      if (mode === "create") {
        const result = await dispatch(createClaim(payload)).unwrap();
        claimId = result.id;
        toast.success("Claim created successfully");
      } else if (initialClaim) {
        await dispatch(
          updateClaim({ id: initialClaim.id, data: payload }),
        ).unwrap();
        claimId = initialClaim.id;
        toast.success("Claim updated successfully");
      } else {
        throw new Error("No claim data");
      }

      // Document deletions (edit mode)
      if (mode === "edit" && initialClaim?.documents) {
        const currentIds = selectedDocuments
          .filter((d) => d.id)
          .map((d) => d.id);
        const toDelete = initialClaim.documents.filter(
          (d) => !currentIds.includes(d.id),
        );
        for (const doc of toDelete) {
          try {
            await dispatch(
              deleteClaimDocument({ claimId, documentId: doc.id }),
            ).unwrap();
          } catch (e) {
            console.error(e);
          }
        }
      }

      // Upload new files
      const toUpload = selectedDocuments
        .filter((d) => !d.id)
        .map((d) => d.file);
      if (toUpload.length > 0) {
        try {
          await dispatch(
            uploadClaimDocuments({ claimId, files: toUpload }),
          ).unwrap();
          toast.success(`${toUpload.length} document(s) uploaded`);
        } catch (e: any) {
          toast.error(`Documents failed to upload: ${e}`);
        }
      }

      reset();
      router.push("/dashboard/claims");
    } catch (err: any) {
      toast.error(err || `Failed to ${mode} claim`);
    } finally {
      setIsSubmitting(false);
      setConfirmOpen(false);
    }
  };

  /* ── Styles ─────────────────────────────────────────── */
  const inputClass =
    "w-full rounded-xl border border-slate-200 bg-white py-2.75 px-3 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 hover:border-slate-300 focus:border-[#B8873A] focus:ring-2 focus:ring-[#B8873A]/20";
  const disabledInputClass =
    "w-full rounded-xl border border-slate-200 bg-slate-50 py-2.75 px-3 text-sm text-slate-500 cursor-not-allowed";
  const selectClass =
    "w-full rounded-xl border border-slate-200 bg-white py-2.75 px-3 text-sm text-slate-900 outline-none transition-all hover:border-slate-300 focus:border-[#B8873A] focus:ring-2 focus:ring-[#B8873A]/20";
  const labelClass =
    "mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500";

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
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
          {/* LEFT COLUMN */}
          <div className="lg:col-span-2 space-y-6">
            {/* Claim Information */}
            <CustomerSectionCard title="Claim Information" icon={FileText}>
              {/* Policy Select */}
              <div>
                <label className={labelClass}>
                  Policy <span className="text-rose-500">*</span>
                </label>
                <select
                  className={selectClass}
                  {...register("policyId")}
                  disabled={mode === "edit"}
                >
                  <option value="">Select Policy</option>
                  {policies.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.policyNumber} - {p.product?.productName}
                    </option>
                  ))}
                </select>
                {errors.policyId?.message && (
                  <p className="mt-1 text-xs text-rose-600">
                    {errors.policyId.message}
                  </p>
                )}
              </div>

              {/* Policy Info Table */}
              {selectedPolicy && (
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
                          Status
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">
                          Start Date
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      <tr>
                        <td className="px-4 py-3 text-sm font-semibold text-slate-900">
                          {getFullName(selectedPolicy.CustomerMaster) || "-"}
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-slate-900">
                          ₹
                          {Number(
                            selectedPolicy.premium?.sumAssured || 0,
                          ).toLocaleString("en-IN")}
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-slate-900">
                          {selectedPolicy.status?.statusName || "-"}
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-slate-900">
                          {new Date(
                            selectedPolicy.commencementDate,
                          ).toLocaleDateString("en-IN")}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}

              {/* Claim Type + Date */}
              <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className={labelClass}>
                    Claim Type <span className="text-rose-500">*</span>
                  </label>
                  <select {...register("claimType")} className={selectClass}>
                    <option value="">Select Type</option>
                    {CLAIM_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                  {errors.claimType?.message && (
                    <p className="mt-1 text-xs text-rose-600">
                      {errors.claimType.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className={labelClass}>
                    Claim Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    {...register("claimDate")}
                    className={inputClass}
                    max={today}
                  />
                  {errors.claimDate?.message && (
                    <p className="mt-1 text-xs text-rose-600">
                      {errors.claimDate.message}
                    </p>
                  )}
                </div>
              </div>

              {/* Amount + Reason */}
              <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className={labelClass}>
                    Claim Amount (₹) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    {...register("claimAmount")}
                    className={inputClass}
                    placeholder="Enter claim amount"
                  />
                  {errors.claimAmount?.message && (
                    <p className="mt-1 text-xs text-rose-600">
                      {errors.claimAmount.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className={labelClass}>
                    Reason for Claim <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    {...register("reasonForClaim")}
                    rows={3}
                    placeholder="Enter reason (min. 10 characters)"
                    className="w-full rounded-xl border border-slate-200 bg-white py-2.75 px-3 text-sm outline-none transition-all placeholder:text-slate-400 hover:border-slate-300 focus:border-[#B8873A] focus:ring-2 focus:ring-[#B8873A]/20 resize-none"
                  />
                  {errors.reasonForClaim?.message && (
                    <p className="mt-1 text-xs text-rose-600">
                      {errors.reasonForClaim.message}
                    </p>
                  )}
                </div>
              </div>

              {/* Calculation Breakdown */}
              {isCalculating && (
                <div className="mt-5 p-4 rounded-xl border border-blue-200 bg-blue-50 flex items-center gap-3">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                  <p className="text-sm text-blue-700">
                    Calculating claim amount...
                  </p>
                </div>
              )}

              {!isCalculating &&
                calculation?.maxClaimAmount !== null &&
                calculation && (
                  <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <Calculator className="w-5 h-5 text-emerald-700" />
                      <p className="text-xs font-semibold uppercase tracking-wider text-emerald-800">
                        Claim Calculation Breakdown
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                      <BreakRow
                        label="Sum Assured"
                        value={calculation.breakdown.sumAssured}
                      />
                      {calculation.breakdown.reversionaryBonus > 0 && (
                        <BreakRow
                          label="+ Reversionary Bonus"
                          value={calculation.breakdown.reversionaryBonus}
                        />
                      )}
                      {calculation.breakdown.finalAdditionalBonus > 0 && (
                        <BreakRow
                          label="+ Final Addl. Bonus"
                          value={calculation.breakdown.finalAdditionalBonus}
                        />
                      )}
                      {calculation.breakdown.loyaltyAddition > 0 && (
                        <BreakRow
                          label="+ Loyalty Addition"
                          value={calculation.breakdown.loyaltyAddition}
                        />
                      )}
                      {calculation.breakdown.outstandingLoan > 0 && (
                        <BreakRow
                          label="− Outstanding Loan"
                          value={-calculation.breakdown.outstandingLoan}
                          negative
                        />
                      )}
                      {calculation.breakdown.loanInterest > 0 && (
                        <BreakRow
                          label="− Accrued Interest"
                          value={-calculation.breakdown.loanInterest}
                          negative
                        />
                      )}
                    </div>

                    {calculation.surrenderInfo && (
                      <div className="mt-3 pt-3 border-t border-emerald-200 text-xs text-emerald-700 space-y-1">
                        <p>
                          Total Premium Paid: ₹
                          {(
                            calculation.surrenderInfo.basicPremium *
                            calculation.surrenderInfo.numberOfPremiumsPaid
                          ).toLocaleString("en-IN")}{" "}
                          ({calculation.surrenderInfo.numberOfPremiumsPaid}{" "}
                          premiums)
                        </p>
                        <p>
                          GSV @ {calculation.surrenderInfo.gsvPercentage}% = ₹
                          {calculation.surrenderInfo.gsv.toLocaleString(
                            "en-IN",
                          )}
                        </p>
                        <p>
                          SSV @ {calculation.surrenderInfo.ssvPercentage}% = ₹
                          {calculation.surrenderInfo.ssv.toLocaleString(
                            "en-IN",
                          )}
                        </p>
                        <p>
                          Surrender Value = MAX(GSV, SSV) = ₹
                          {calculation.surrenderInfo.surrenderValue.toLocaleString(
                            "en-IN",
                          )}
                        </p>
                      </div>
                    )}

                    <div className="mt-4 pt-3 border-t-2 border-emerald-300 flex justify-between items-center">
                      <span className="font-bold text-emerald-900">
                        Maximum Claimable:
                      </span>
                      <span className="font-bold text-emerald-900 text-lg">
                        ₹{calculation.maxClaimAmount!.toLocaleString("en-IN")}
                      </span>
                    </div>

                    {calculation.loanDetails && (
                      <div className="mt-3 pt-3 border-t border-emerald-200 text-xs text-slate-600">
                        <Info size={12} className="inline mr-1" />
                        Loan interest calculated for{" "}
                        {calculation.loanDetails.daysSinceLastPayment} days @{" "}
                        {calculation.loanDetails.interestRate}% p.a.
                      </div>
                    )}
                  </div>
                )}
            </CustomerSectionCard>

            {/* Payment Details */}
            <CustomerSectionCard title="Payment Details" icon={FileText}>
              <div className="mb-6">
                <label className={labelClass}>
                  Payment Type <span className="text-rose-500">*</span>
                </label>
                <div className="flex items-center gap-8 mt-2">
                  {["Cheque", "NEFT"].map((type) => (
                    <label
                      key={type}
                      className="flex items-center gap-2.5 cursor-pointer"
                    >
                      <input
                        type="radio"
                        name="paymentType"
                        value={type}
                        checked={paymentType === type}
                        onChange={() => setPaymentType(type as PaymentType)}
                        className="peer sr-only"
                      />
                      <span className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-slate-300 peer-checked:border-[#2563EB] peer-checked:bg-[#2563EB]">
                        <span
                          className={`h-2 w-2 rounded-full bg-white ${paymentType === type ? "scale-100" : "scale-0"}`}
                        />
                      </span>
                      <span className="text-sm font-medium text-slate-700">
                        {type}
                      </span>
                    </label>
                  ))}
                </div>
                {paymentError && (
                  <p className="mt-2 text-xs text-rose-600">{paymentError}</p>
                )}
              </div>

              {paymentType === "NEFT" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <ReadOnlyField
                    label="Account Holder Name"
                    value={bankDefaults.accountHolderName}
                    className={disabledInputClass}
                    labelClass={labelClass}
                  />
                  <ReadOnlyField
                    label="Bank Name"
                    value={bankDefaults.bankName}
                    className={disabledInputClass}
                    labelClass={labelClass}
                  />
                  <ReadOnlyField
                    label="Account Number"
                    value={bankDefaults.accountNumber}
                    className={disabledInputClass}
                    labelClass={labelClass}
                  />
                  <ReadOnlyField
                    label="IFSC Code"
                    value={bankDefaults.ifscCode}
                    className={disabledInputClass}
                    labelClass={labelClass}
                  />
                  <ReadOnlyField
                    label="Branch Name"
                    value={bankDefaults.branchName}
                    className={disabledInputClass}
                    labelClass={labelClass}
                  />
                  <ReadOnlyField
                    label="Account Type"
                    value={bankDefaults.accountType}
                    className={disabledInputClass}
                    labelClass={labelClass}
                  />
                </div>
              )}

              {paymentType === "Cheque" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <ChequeInput
                    label="Cheque Number"
                    value={chequeFields.chequeNumber}
                    onChange={(v) =>
                      setChequeFields((p) => ({ ...p, chequeNumber: v }))
                    }
                    required
                    inputClass={inputClass}
                    labelClass={labelClass}
                  />
                  <div>
                    <label className={labelClass}>
                      Cheque Date <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={chequeFields.chequeDate}
                      onChange={(e) =>
                        setChequeFields((p) => ({
                          ...p,
                          chequeDate: e.target.value,
                        }))
                      }
                      className={inputClass}
                    />
                  </div>
                  <ChequeInput
                    label="Bank Name"
                    value={chequeFields.bankName}
                    onChange={(v) =>
                      setChequeFields((p) => ({ ...p, bankName: v }))
                    }
                    required
                    inputClass={inputClass}
                    labelClass={labelClass}
                  />
                  <ChequeInput
                    label="Branch Name"
                    value={chequeFields.branchName}
                    onChange={(v) =>
                      setChequeFields((p) => ({ ...p, branchName: v }))
                    }
                    required
                    inputClass={inputClass}
                    labelClass={labelClass}
                  />
                  <ChequeInput
                    label="Cheque Amount"
                    value={chequeFields.chequeAmount}
                    onChange={(v) =>
                      setChequeFields((p) => ({ ...p, chequeAmount: v }))
                    }
                    required
                    inputClass={inputClass}
                    labelClass={labelClass}
                    type="number"
                  />
                </div>
              )}
            </CustomerSectionCard>
          </div>

          {/* RIGHT COLUMN - Nominee (only for Death claims) */}
          {selectedClaimType === "Death" && (
            <div className="lg:col-span-1">
              <div className="sticky top-6">
                <CustomerSectionCard title="Nominee Details" icon={User}>
                  <div className="relative">
                    <label className={labelClass}>Nominee</label>
                    <button
                      type="button"
                      onClick={() =>
                        selectedPolicy &&
                        nomineeList.length > 0 &&
                        setNomineeOpen((o) => !o)
                      }
                      disabled={!selectedPolicy || nomineeList.length === 0}
                      className={`flex w-full items-center justify-between gap-2 rounded-xl border bg-white py-2.75 px-3 text-sm outline-none transition-all ${!selectedPolicy || nomineeList.length === 0 ? "cursor-not-allowed bg-slate-50 text-slate-400" : "cursor-pointer text-slate-900 hover:border-slate-300"} ${nomineeOpen ? "border-[#B8873A] ring-2 ring-[#B8873A]/15" : "border-slate-200"}`}
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

                    {nomineeOpen && nomineeList.length > 0 && (
                      <div className="absolute z-[100] mt-1.5 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
                        <div className="max-h-60 overflow-y-auto py-1">
                          {nomineeList.map((n) => (
                            <button
                              key={n.id}
                              type="button"
                              onClick={() => {
                                setSelectedNominee(n);
                                setNomineeOpen(false);
                              }}
                              className={`flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm hover:bg-[#B8873A]/8 ${selectedNominee?.id === n.id ? "bg-[#B8873A]/10 font-semibold text-[#0B1220]" : "text-slate-700"}`}
                            >
                              <span className="min-w-0">
                                <span className="block truncate">
                                  {n.nomineeName}
                                </span>
                                <span className="block truncate text-xs text-slate-400">
                                  {n.relationship}
                                </span>
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <p className="mt-2 flex items-start gap-1.5 text-xs text-slate-400">
                    <Info size={12} className="mt-0.5 shrink-0" />
                    <span>
                      Nominee details are auto-fetched from the selected policy.
                    </span>
                  </p>

                  {selectedNominee && (
                    <div className="mt-5 space-y-4 border-t border-slate-100 pt-4">
                      <ReadOnlyField
                        label="Nominee Name"
                        value={selectedNominee.nomineeName}
                        className={disabledInputClass}
                        labelClass={labelClass}
                      />
                      <ReadOnlyField
                        label="Relationship"
                        value={selectedNominee.relationship}
                        className={disabledInputClass}
                        labelClass={labelClass}
                      />
                      <ReadOnlyField
                        label="Date of Birth"
                        value={selectedNominee.dateOfBirth}
                        className={disabledInputClass}
                        labelClass={labelClass}
                      />
                      <ReadOnlyField
                        label="Phone Number"
                        value={selectedNominee.phone}
                        className={disabledInputClass}
                        labelClass={labelClass}
                      />
                      <ReadOnlyField
                        label="Share %"
                        value={String(selectedNominee.percentage)}
                        className={disabledInputClass}
                        labelClass={labelClass}
                      />
                      <ReadOnlyField
                        label="Email Address"
                        value={selectedNominee.email}
                        className={disabledInputClass}
                        labelClass={labelClass}
                      />
                    </div>
                  )}

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

        {/* Documents */}
        <CustomerSectionCard title="Claim Documents" icon={FileText}>
          <div>
            <label className={labelClass}>Upload Documents</label>
            <div className="mt-3">
              <label className="flex items-center justify-center w-full px-4 py-6 border-2 border-dashed border-slate-200 rounded-xl cursor-pointer hover:border-slate-300">
                <div className="text-center">
                  <FileText size={32} className="mx-auto text-slate-400 mb-2" />
                  <span className="text-sm font-medium text-slate-700">
                    Choose Files or drag and drop
                  </span>
                  <p className="text-xs text-slate-500 mt-1">
                    PDF, JPG, JPEG, PNG (Max 10 MB)
                  </p>
                </div>
                <input
                  type="file"
                  multiple
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={handleDocumentSelect}
                  className="hidden"
                />
              </label>
            </div>

            {documentError && (
              <p className="mt-2 text-xs text-rose-600 flex items-start gap-1.5">
                <AlertCircle size={14} className="mt-0.5" />
                {documentError}
              </p>
            )}

            {mode === "edit" && selectedDocuments.some((d) => d.id) && (
              <div className="mt-5">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
                  Existing Documents
                </p>
                <div className="space-y-2">
                  {selectedDocuments
                    .filter((d) => d.id)
                    .map((doc, i) => (
                      <DocumentRow
                        key={i}
                        doc={doc}
                        onRemove={() =>
                          removeDocument(selectedDocuments.indexOf(doc))
                        }
                        existing
                      />
                    ))}
                </div>
              </div>
            )}

            {selectedDocuments.some((d) => !d.id) && (
              <div className="mt-5">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
                  {mode === "edit" ? "New Documents" : "Selected Documents"}
                </p>
                <div className="space-y-2">
                  {selectedDocuments
                    .filter((d) => !d.id)
                    .map((doc, i) => (
                      <DocumentRow
                        key={i}
                        doc={doc}
                        onRemove={() =>
                          removeDocument(selectedDocuments.indexOf(doc))
                        }
                      />
                    ))}
                </div>
              </div>
            )}

            {selectedDocuments.length === 0 && !documentError && (
              <p className="mt-4 text-xs text-slate-400 text-center">
                No documents selected yet
              </p>
            )}
          </div>
        </CustomerSectionCard>

        {/* Actions */}
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
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
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
            <p className="text-sm text-slate-600 mb-6">
              {mode === "create"
                ? "Are you sure you want to raise this claim? The policy status will change to CLAIMED."
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

/* ── Helper Components ────────────────────────────────── */

function BreakRow({
  label,
  value,
  negative,
}: {
  label: string;
  value: number;
  negative?: boolean;
}) {
  return (
    <div className="flex justify-between">
      <span className={negative ? "text-red-600" : "text-slate-600"}>
        {label}:
      </span>
      <span
        className={`font-semibold ${negative ? "text-red-600" : "text-slate-900"}`}
      >
        ₹{Math.abs(value).toLocaleString("en-IN")}
      </span>
    </div>
  );
}

function ReadOnlyField({ label, value, className, labelClass }: any) {
  return (
    <div>
      <label className={labelClass}>{label}</label>
      <input type="text" value={value || "-"} disabled className={className} />
    </div>
  );
}

function ChequeInput({
  label,
  value,
  onChange,
  required,
  inputClass,
  labelClass,
  type = "text",
}: any) {
  return (
    <div>
      <label className={labelClass}>
        {label} {required && <span className="text-rose-500">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={inputClass}
        placeholder={`Enter ${label.toLowerCase()}`}
      />
    </div>
  );
}

function DocumentRow({
  doc,
  onRemove,
  existing,
}: {
  doc: any;
  onRemove: () => void;
  existing?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between px-3 py-2.5 rounded-lg border ${existing ? "bg-blue-50 border-blue-200" : "bg-slate-50 border-slate-200"}`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <FileText
          size={16}
          className={existing ? "text-blue-400" : "text-slate-400"}
        />
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-900 truncate">
            {doc.file.name}
          </p>
          <p className="text-xs text-slate-500">
            {existing
              ? "Already uploaded"
              : `${(doc.file.size / 1024).toFixed(2)} KB`}
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={onRemove}
        className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"
      >
        <Trash2 size={16} />
      </button>
    </div>
  );
}
