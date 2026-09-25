"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm , Controller, Form} from "react-hook-form";
import { set, z } from "zod";
import { useDispatch, useSelector} from "react-redux";
import { useRouter } from "next/navigation";
import { useEffect, useState , useMemo } from "react";
import { FileText, Loader2, Save, User, Search, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";
import type { AppDispatch, RootState } from "@/store/store";
import { fetchPolicies } from "@/features/policy/policySlice";
import { createPremiumPayment, fetchPremiumPaymentsByPolicy , fetchPremiumPaymentById , updatePremiumPayment, PremiumPayment } from "./premiumPaymentSlice";
import { fetchPremiumModes } from "../policy/premiumModeMasterSlice";
import Link from "next/link";
import DatePicker from "@/app/(dashboard)/dashboard/lic/policies/new/DatePicker";
import { format, addYears,differenceInCalendarMonths,isBefore,addMonths , differenceInCalendarDays, toDate, startOfDay } from "date-fns";
import {
  CustomerSectionCard,
  SearchableSelect,
  CustomerBreadcrumbs,
} from "@/features/customers/components/CustomerUi";
import type { Policy } from "@/features/policy/policySlice";
import { fetchPaymentModes } from "./paymentModeMasterSlice";
import { useNotificationStore } from "@/store/notificationStore";

const schema = z
  .object({
    policyId: z.string().min(1, "Policy is required"),
    installmentNo: z.coerce
      .number()
      .int()
      .min(1, "Installment number must be at least 1"),
    dueDate: z.string(),
    premiumAmount: z.coerce.number().positive("Premium amount must be greater than zero"),
    paidDate: z.string().min(1,"Paid date is required"),
    lateFee: z.coerce.number().min(0, "Late fee cannot be negative").optional(),
    paymentMode: z.string().min(1, "Payment mode is required"),
    paymentStatus: z.string(),
    gstOnLateFee : z.coerce.number().optional(),
    paymentDetails : z.string().optional(),
    futureDueDate : z.string().optional(),
    gstRate: z.string().optional(),
  })

type FormValues = z.infer<typeof schema>;
export default function PremiumPaymentForm({
  paymentId,
  mode = "create",
  initialPolicyId,
}: {
  paymentId?: string;
  mode?: "create" | "edit" | "view";
  initialPolicyId?: string;
}) {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { fetchNotifications } = useNotificationStore();
  const { policies } = useSelector((s: RootState) => s.policies);
  const { isSubmitting } = useSelector((s: RootState) => s.premiumPayments);
  const { modes } = useSelector((s: RootState) => s.premiumModes);
  const [selectedPolicy, setSelectedPolicy] = useState<Policy | null>(null);
  const [lastPayment, setLastPayment] = useState<any>(null);
  const [highestPaidInstallment, setHighestPaidInstallment] = useState(0);
  const [pendingOverdueCount, setPendingOverdueCount] = useState(0);
  const { paymentModes } = useSelector((s: RootState) => s.paymentModes);
  const [totalAmount, setTotatAmount] = useState(0);

  const totalInstallments = useMemo(() => {
    if (!selectedPolicy) return null;
    const modeObj = selectedPolicy.premiumMode || modes.find((x) => x.id === selectedPolicy.premiumModeId);
    const isSingle =
      modeObj?.modeCode === "SIN" ||
      modeObj?.modeName?.toLowerCase() === "single" ||
      modeObj?.months === 0 ||
      selectedPolicy.premiumPayingTerm === 1 ||
      selectedPolicy.product?.planNumber === "717";

    if (isSingle) return 1;
    if (selectedPolicy.premiumPayingTerm && selectedPolicy.premiumPayingTerm > 0) {
      const modeMonths = Math.max(1, Number(modeObj?.months || 1));
      const perYear = 12 / modeMonths;
      return Math.floor(perYear * Number(selectedPolicy.premiumPayingTerm));
    }
    return null;
  }, [selectedPolicy, modes]);

  const input = `w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#B8873A] focus:ring-2 focus:ring-[#B8873A]/20 ${mode === "view" ? "bg-slate-50 cursor-not-allowed" : ""}`;
  const label = "mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500";

  const policyOptions = useMemo(
    () =>
      policies.map((policy) => {
        const customerName = policy.CustomerMaster
          ? `${policy.CustomerMaster.firstName} ${policy.CustomerMaster.lastName ?? ""}`.trim()
          : "";

        return {
          value: policy.id,
          label: `${policy.policyNumber}${customerName ? ` - ${customerName}` : ""}`,
          sublabel: policy.product?.productName || "Policy",
        };
      }),
    [policies],
  );

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    control,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema) as any,
    defaultValues: {
      installmentNo: 1,
      paymentStatus: "PAID",
      dueDate: "",
      paidDate: new Date().toISOString().slice(0, 10),
      gstOnLateFee: 0,
      lateFee: 0,
      premiumAmount: 0,
      paymentMode: "",
      futureDueDate: "",
      paymentDetails: "",
      gstRate: "0",
    },
  });

  const [policyId, premiumAmount, lateFeeAmount, gstRate, gstOnLateFee, installmentNo, dueDate] = watch([
    "policyId",
    "premiumAmount",
    "lateFee",
    "gstRate",
    "gstOnLateFee",
    "installmentNo",
    "dueDate",
  ]);

  // Handle initialPolicyId from query param
  useEffect(() => {
    if (initialPolicyId && mode === "create") {
      setValue("policyId", initialPolicyId);
    }
  }, [initialPolicyId, mode, setValue]);

  // load existing payment when editing
  useEffect(() => {
    if (!paymentId) return;
    (async () => {
      const res = await dispatch(fetchPremiumPaymentById(paymentId as string));
      const p = res.payload;
      if (p && typeof p === "object" && "policyId" in p) {
        setValue("policyId", p.policyId ?? "");
        setValue("installmentNo", p.installmentNo ?? 1);
        setValue("dueDate", p.dueDate ? p.dueDate.slice(0, 10) : "");
        setValue("premiumAmount", p.premiumAmount ?? 0);
        setValue("paidDate", p.paidDate ? p.paidDate.slice(0, 10) : "");
        setValue("lateFee", p.lateFee ?? 0);
        setValue("paymentMode", p.paymentMode ?? "");
        setValue("paymentDetails", p.paymentDetails ?? "");

        const selectionPolicy = policies.find((x) => x.id === p.policyId);
        if (selectionPolicy) {
          setSelectedPolicy(selectionPolicy);
        }

        // Fetch existing payments to set highestPaidInstallment for edit mode (excluding current payment)
        if (p.policyId) {
          const policyPayments = await dispatch(fetchPremiumPaymentsByPolicy(p.policyId));
          const paymentsList = Array.isArray(policyPayments.payload) ? policyPayments.payload : [];
          const otherValidPayments = paymentsList.filter((payment: any) => {
            const statusCode = payment.paymentStatus?.statusCode;
            return payment.id !== paymentId && statusCode !== "FAILED" && statusCode !== "CANCELLED";
          });
          const highestPaid = otherValidPayments.reduce((max: number, payment: any) => {
            const num = Number(payment.installmentNo);
            return Number.isFinite(num) && num > max ? num : max;
          }, 0);
          setHighestPaidInstallment(highestPaid);
        }
      }
    })();
  }, [paymentId, dispatch, setValue, policies]);

  useEffect(() => {
    dispatch(fetchPolicies());
    dispatch(fetchPremiumModes());
    dispatch(fetchPaymentModes());
  }, [dispatch]);

  useEffect(() => {
    setValue("gstOnLateFee", 0);
    setValue("lateFee", 0);
    setValue("paymentDetails", "");
    setHighestPaidInstallment(0);
    setPendingOverdueCount(0);
    setLastPayment(null);
  }, [policyId, setValue]);

  // When policy changes in create mode: setup initial values and auto-fetch due installments
  useEffect(() => {
    if (mode === "create" && policyId) {
      const p = policies.find((x) => x.id === policyId);
      if (!p) return;

      setSelectedPolicy(p);

      const modeObj = p.premiumMode || modes.find((x) => x.id === p.premiumModeId);
      const isSinglePremium =
        modeObj?.modeCode === "SIN" ||
        modeObj?.modeName?.toLowerCase() === "single" ||
        modeObj?.months === 0 ||
        modes.find((x) => x.id === p.premiumModeId)?.modeCode === "SIN" ||
        modes.find((x) => x.id === p.premiumModeId)?.months === 0 ||
        p.premiumPayingTerm === 1 ||
        p.product?.planNumber === "717";

      // Fetch existing payments for sequence tracking and default due installments
      (async () => {
        const policyPayments = await dispatch(fetchPremiumPaymentsByPolicy(policyId));
        const paymentsList = Array.isArray(policyPayments.payload) ? policyPayments.payload : [];

        // Filter valid payments (paid or not cancelled/failed)
        const validPayments = paymentsList.filter((payment: any) => {
          const statusCode = payment.paymentStatus?.statusCode;
          return statusCode !== "FAILED" && statusCode !== "CANCELLED";
        });

        const highestPaid = validPayments.reduce((max: number, payment: any) => {
          const num = Number(payment.installmentNo);
          return Number.isFinite(num) && num > max ? num : max;
        }, 0);

        setHighestPaidInstallment(highestPaid);

        const latestPayment = paymentsList.reduce((latest: any, payment: any) => {
          if (!latest) return payment;
          const pDate = new Date(payment.paidDate || payment.createdAt || 0);
          const lDate = new Date(latest.paidDate || latest.createdAt || 0);
          const pNo = Number(payment.installmentNo) || 0;
          const lNo = Number(latest.installmentNo) || 0;
          if (pNo !== lNo) return pNo > lNo ? payment : latest;
          return pDate > lDate ? payment : latest;
        }, null);

        setLastPayment(latestPayment);

        const modeMonths = Math.max(1, Number(modeObj?.months || 1));
        const commencementDate = p.commencementDate ? startOfDay(new Date(p.commencementDate)) : null;

        // Calculate next unpaid due date
        let nextDueDate: Date;
        if (isSinglePremium) {
          if (p.nextPremiumDueDate && !isNaN(new Date(p.nextPremiumDueDate).getTime())) {
            nextDueDate = startOfDay(new Date(p.nextPremiumDueDate));
          } else if (commencementDate && !isNaN(commencementDate.getTime())) {
            nextDueDate = commencementDate;
          } else {
            nextDueDate = startOfDay(new Date());
          }
          setValue("dueDate", format(nextDueDate, "yyyy-MM-dd"));
          setValue("installmentNo", 1);
          setPendingOverdueCount(0);
        } else {
          const nextSeq = highestPaid + 1;

          if (p.nextPremiumDueDate && !isNaN(new Date(p.nextPremiumDueDate).getTime())) {
            nextDueDate = startOfDay(new Date(p.nextPremiumDueDate));
          } else if (commencementDate && !isNaN(commencementDate.getTime())) {
            nextDueDate = addMonths(commencementDate, nextSeq * modeMonths);
          } else {
            nextDueDate = startOfDay(new Date());
          }

          const nextDueDateStr = format(nextDueDate, "yyyy-MM-dd");
          setValue("dueDate", nextDueDateStr);

          // installmentNo holds the installment number to pay (e.g. 5 for 5th installment, 7 for 7th)
          setValue("installmentNo", nextSeq);

          // Calculate how many installments are pending/overdue for informational display
          const today = startOfDay(new Date());
          let overdueCount = 0;
          if (isBefore(nextDueDate, today)) {
            const monthsElapsed = differenceInCalendarMonths(today, nextDueDate);
            let count = Math.floor(monthsElapsed / modeMonths) + 1;
            const calculatedDueDate = addMonths(nextDueDate, (count - 1) * modeMonths);
            if (isBefore(today, calculatedDueDate)) {
              count--;
            }
            overdueCount = Math.max(1, count);
          }
          setPendingOverdueCount(overdueCount);
        }
      })();
    }
  }, [policyId, policies, modes, setValue, mode, dispatch]);

  // Recalculate amounts, due dates, late fees when installmentNo (or policy/gstRate) changes
  useEffect(() => {
    if (!selectedPolicy || mode !== "create") return;

    const modeObj = selectedPolicy.premiumMode || modes.find((x) => x.id === selectedPolicy.premiumModeId);
    const isSinglePremium =
      modeObj?.modeCode === "SIN" ||
      modeObj?.modeName?.toLowerCase() === "single" ||
      modeObj?.months === 0 ||
      modes.find((x) => x.id === selectedPolicy.premiumModeId)?.modeCode === "SIN" ||
      modes.find((x) => x.id === selectedPolicy.premiumModeId)?.months === 0 ||
      selectedPolicy.premiumPayingTerm === 1 ||
      selectedPolicy.product?.planNumber === "717";

    const instNo = Number(installmentNo) || (highestPaidInstallment + 1);
    const isBelowPaid = highestPaidInstallment > 0 && Number(installmentNo) <= highestPaidInstallment;

    if (isBelowPaid) {
      setValue("premiumAmount", 0);
      setValue("lateFee", 0);
      setValue("gstOnLateFee", 0);
      setValue("futureDueDate", "");
      setValue("paymentDetails", `Warning: Installment #${Number(installmentNo)} has already been paid.`);
      return;
    }

    const count = isSinglePremium
      ? 1
      : Math.max(1, instNo - highestPaidInstallment);

    const basePrem = Number(selectedPolicy.premium?.installmentPremium ?? 0);
    const totalPrem = Number(selectedPolicy.premium?.totalInstallmentPremium ?? basePrem ?? 0);
    const singlePrem = totalPrem > 0 ? totalPrem : basePrem;

    // Recalculate total premium based on installment count
    const totalPremiumDue = Number((count * singlePrem).toFixed(2));
    setValue("premiumAmount", totalPremiumDue);

    const activeDueDate = dueDate ? startOfDay(new Date(dueDate)) : null;
    const today = startOfDay(new Date());

    if (isSinglePremium) {
      setValue("futureDueDate", "");
      setValue("paymentDetails", "Payment of Single Premium");

      if (activeDueDate && !isNaN(activeDueDate.getTime()) && isBefore(activeDueDate, today)) {
        const overdueDays = Math.max(0, differenceInCalendarDays(today, activeDueDate));
        const lateFeeApplicable = Number(((totalPremiumDue * 12 * overdueDays) / 36500).toFixed(2));
        const rateVal = Number(gstRate) || 0;
        const gstApplicable = Number(((lateFeeApplicable * rateVal) / 100).toFixed(2));
        setValue("lateFee", lateFeeApplicable);
        setValue("gstOnLateFee", gstApplicable);
      } else {
        setValue("lateFee", 0);
        setValue("gstOnLateFee", 0);
      }
    } else {
      const modeMonths = Math.max(1, Number(modeObj?.months || 1));

      if (activeDueDate && !isNaN(activeDueDate.getTime())) {
        const newFutureDueDate = addMonths(activeDueDate, count * modeMonths);
        setValue("futureDueDate", newFutureDueDate.toDateString());

        const overdueDays = isBefore(activeDueDate, today)
          ? Math.max(0, differenceInCalendarDays(today, activeDueDate))
          : 0;

        const lateFeeApplicable = overdueDays > 0
          ? Number(((totalPremiumDue * 12 * overdueDays) / 36500).toFixed(2))
          : 0;
        const rateVal = Number(gstRate) || 0;
        const gstApplicable = Number(((lateFeeApplicable * rateVal) / 100).toFixed(2));

        setValue("lateFee", lateFeeApplicable);
        setValue("gstOnLateFee", gstApplicable);
      }

      const startSeq = highestPaidInstallment + 1;
      const endSeq = instNo;
      setValue(
        "paymentDetails",
        count === 1
          ? `Payment of installment #${startSeq}.`
          : `Payment of ${count} installments (#${startSeq} to #${endSeq}).`,
      );
    }
  }, [installmentNo, dueDate, selectedPolicy, gstRate, modes, setValue, mode, highestPaidInstallment]);

  useEffect(() => {
    const prem = Number(premiumAmount) || 0;
    const late = Number(lateFeeAmount) || 0;
    const gst = Number(gstOnLateFee) || 0;
    const total = Number((prem + late + gst).toFixed(2));
    setTotatAmount(Number.isNaN(total) ? 0 : total);
  }, [premiumAmount, lateFeeAmount, gstOnLateFee]);

  const submit = async (v: FormValues) => {
    try {
      if (highestPaidInstallment > 0 && Number(v.installmentNo) <= highestPaidInstallment) {
        toast.error(`Installment #${v.installmentNo} has already been paid for this policy (Highest paid: #${highestPaidInstallment}). Next installment cannot go behind #${highestPaidInstallment + 1}.`);
        return;
      }

      if (totalInstallments !== null && Number(v.installmentNo) > totalInstallments) {
        toast.error(`Installment #${v.installmentNo} exceeds the policy's Premium Paying Term (${totalInstallments} installments for ${selectedPolicy?.premiumPayingTerm} years PPT).`);
        return;
      }

      const totalLateFee = Number(v.lateFee) + (Number(v.gstOnLateFee) || 0);
      const totalPremiumAmount = Number(v.premiumAmount);
      const isSingle =
        selectedPolicy?.premiumMode?.modeCode === "SIN" ||
        selectedPolicy?.premiumMode?.months === 0 ||
        selectedPolicy?.product?.planNumber === "717";

      const effectiveInstallmentNo = isSingle
        ? 1
        : Number(v.installmentNo);

      if (mode === "edit") {
        await dispatch(
          updatePremiumPayment({
            id: paymentId!,
            policyId: v.policyId,
            installmentNo: v.installmentNo,
            dueDate: v.dueDate,
            premiumAmount: totalPremiumAmount,
            paidDate: v.paidDate,
            lateFee: totalLateFee ?? null,
            paymentMode: v.paymentMode?.trim() || null,
            paymentDetails: v.paymentDetails?.trim() || null,
            futureDueDate: v.futureDueDate,
          }),
        );
        await fetchNotifications();
        toast.success("Premium payment updated successfully");
      } else {
        await dispatch(
          createPremiumPayment({
            policyId: v.policyId,
            installmentNo: effectiveInstallmentNo,
            dueDate: v.dueDate,
            premiumAmount: totalPremiumAmount,
            paidDate: v.paidDate,
            lateFee: totalLateFee ?? null,
            paymentMode: v.paymentMode?.trim() || null,
            paymentDetails: v.paymentDetails?.trim() || null,
            futureDueDate: v.futureDueDate,
          }),
        ).unwrap();
        await dispatch(fetchPolicies());
        await fetchNotifications();
        toast.success("Premium payment created successfully");
      }
      router.push("/dashboard/premium-payments");
    } catch (e) {
      toast.error(String(e || "Failed to create premium payment"));
    }
  };
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <CustomerBreadcrumbs
              items={[
                { label: "Premium Payment", href: "/dashboard/premium-payments" },
                { label: mode === "create" ? "Create Payment" : mode === "edit" ? "Edit Payment" : "View Payment" },
              ]}
            />
      <div>
        <h1 className="font-serif text-2xl font-semibold text-slate-900">
          {mode === "create" ? "Create Payment" : mode === "edit" ? "Edit Payment" : "View Payment"}
        </h1>
        {mode === "create" && <p className="mt-2 text-sm text-slate-500">
          Create an installment against an existing policy.
        </p>}
      </div>
      <form
        onSubmit={handleSubmit(submit)}
        className="rounded-2xl bg-white"
      >
        <CustomerSectionCard
          title="Premium Payment Information"
          icon={FileText}
        >
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className={label}>Policy  <span className="text-rose-500">*</span></label>
            <Controller
                control={control}
                name="policyId" // Use Controller for custom components
                render={({ field }) => (
                  <SearchableSelect
                    placeholder="Search policy..."
                    searchPlaceholder="Search by policy number or customer name"
                    options={policyOptions}
                    value={field.value}
                    disabled = {mode === "edit" || mode === "view"}
                    onChange={(val) => {
                      field.onChange(val);
                      const selectedPolicyFromList = policies.find((p) => p.id === val);
                      if (selectedPolicyFromList) {
                        setSelectedPolicy(selectedPolicyFromList);
                      }
                    }}
                  />
                )}
              />
            {errors.policyId && (
              <p className="mt-1 text-xs text-rose-600">
                {errors.policyId.message}
              </p>
            )}
          </div>

          <div>
            <label className={label}>
              Installment No. <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              min={highestPaidInstallment > 0 ? highestPaidInstallment + 1 : 1}
              max={totalInstallments ?? undefined}
              onWheel={(e) => e.currentTarget.blur()}
              {...register("installmentNo")}
              className={`${input} ${highestPaidInstallment > 0 && Number(installmentNo) <= highestPaidInstallment ? "!border-amber-500 !ring-2 !ring-amber-200" : ""} ${totalInstallments !== null && Number(installmentNo) > totalInstallments ? "!border-rose-500 !ring-2 !ring-rose-200" : ""} ${mode === "view" || Boolean(selectedPolicy && (selectedPolicy.premiumMode?.modeCode === "SIN" || selectedPolicy.premiumMode?.months === 0 || selectedPolicy.product?.planNumber === "717")) ? "bg-slate-50 cursor-not-allowed" : ""}`}
              disabled={mode === "view" || Boolean(selectedPolicy && (selectedPolicy.premiumMode?.modeCode === "SIN" || selectedPolicy.premiumMode?.months === 0 || selectedPolicy.product?.planNumber === "717"))}
              placeholder={selectedPolicy ? `e.g. ${highestPaidInstallment + 1}` : "e.g. 1"}
            />
            {errors.installmentNo && (
              <p className="mt-1 text-xs text-rose-600">
                {errors.installmentNo.message}
              </p>
            )}
            {highestPaidInstallment > 0 && Number(installmentNo) <= highestPaidInstallment && (
              <div className="mt-1.5 flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
                <AlertCircle size={15} className="shrink-0 text-amber-600" />
                <span>
                  Warning: Installment #{Number(installmentNo)} has already been paid for this policy (Highest paid: #{highestPaidInstallment}). Next installment cannot go behind #{highestPaidInstallment + 1}.
                </span>
              </div>
            )}
            {totalInstallments !== null && Number(installmentNo) > totalInstallments && (
              <div className="mt-1.5 flex items-center gap-1.5 rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
                <AlertCircle size={15} className="shrink-0 text-rose-600" />
                <span>
                  Warning: Installment #{Number(installmentNo)} exceeds the policy&apos;s Premium Paying Term (Total allowed: {totalInstallments} installments for {selectedPolicy?.premiumPayingTerm} yrs PPT).
                </span>
              </div>
            )}
            {totalInstallments !== null && highestPaidInstallment >= totalInstallments && (
              <div className="mt-1.5 flex items-center gap-1.5 rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
                <AlertCircle size={15} className="shrink-0 text-rose-600" />
                <span>
                  All {totalInstallments} installments for this policy have already been completed (PPT: {selectedPolicy?.premiumPayingTerm} yrs).
                </span>
              </div>
            )}
            {selectedPolicy && (selectedPolicy.premiumMode?.modeCode === "SIN" || selectedPolicy.premiumMode?.months === 0 || selectedPolicy.product?.planNumber === "717") ? (
              highestPaidInstallment >= 1 ? (
                <div className="mt-1.5 rounded-lg bg-amber-50 border border-amber-200 px-3 py-1.5 text-xs font-medium text-amber-800">
                  ⚠️ Single premium policy: Already paid (Installment #1 recorded).
                </div>
              ) : (
                <p className="mt-1 text-xs text-slate-500">Single premium policy (1 payment)</p>
              )
            ) : mode === "create" && highestPaidInstallment > 0 ? (
              <div className="mt-1.5 rounded-lg bg-amber-50 border border-amber-200 px-3 py-1.5 text-xs text-amber-900">
                <span className="font-semibold">Previous Paid:</span> {highestPaidInstallment} {highestPaidInstallment === 1 ? "installment" : "installments"} (#1{highestPaidInstallment > 1 ? ` to #${highestPaidInstallment}` : ""})
                <span className="mx-1.5 text-amber-400">•</span>
                <span className="font-semibold">Now Paying:</span> {(() => {
                  const inst = Number(installmentNo) || (highestPaidInstallment + 1);
                  const cnt = Math.max(1, inst - highestPaidInstallment);
                  return cnt === 1
                    ? `Installment #${inst} only`
                    : `${cnt} installments (#${highestPaidInstallment + 1} to #${inst})`;
                })()}
                {pendingOverdueCount > 1 && (
                  <span className="ml-2 font-normal text-amber-700">({pendingOverdueCount} installments pending)</span>
                )}
                {totalInstallments !== null && (
                  <span className="ml-2 text-slate-500 font-normal">| PPT Max: #{totalInstallments}</span>
                )}
              </div>
            ) : mode === "create" && selectedPolicy ? (
              <div className="mt-1.5 rounded-lg bg-slate-50 border border-slate-200 px-3 py-1.5 text-xs text-slate-700">
                <span className="font-semibold">Now Paying:</span> {(() => {
                  const inst = Number(installmentNo) || 1;
                  return inst === 1 ? "Installment #1 only" : `${inst} installments (#1 to #${inst})`;
                })()}
                {pendingOverdueCount > 1 && (
                  <span className="ml-2 font-normal text-slate-500">({pendingOverdueCount} installments pending)</span>
                )}
                {totalInstallments !== null && (
                  <span className="ml-2 text-slate-500 font-normal">| PPT Max: #{totalInstallments}</span>
                )}
              </div>
            ) : null}
          </div>
          <div>
            <label className={label}>Premium Due Date  <span className="text-rose-500">*</span></label>
            <input type="text" {...register("dueDate")} className={`${input} bg-slate-50 cursor-not-allowed`} disabled/>
            {errors.dueDate && (
              <p className="mt-1 text-xs text-rose-600">
                {errors.dueDate.message}
              </p>
            )}
          </div>
          {(() => {
            const isSingle = selectedPolicy && (selectedPolicy.premiumMode?.modeCode === "SIN" || selectedPolicy.premiumMode?.months === 0 || selectedPolicy.product?.planNumber === "717");
            const instNo = Number(installmentNo) || (highestPaidInstallment + 1);
            const count = isSingle ? 1 : Math.max(1, instNo - highestPaidInstallment);
            const singleBasePrem = Number(selectedPolicy?.premium?.installmentPremium ?? 0);
            const singleTotalPrem = Number(selectedPolicy?.premium?.totalInstallmentPremium ?? selectedPolicy?.premium?.installmentPremium ?? 0);
            const singleRiderAmt = Math.max(0, Number((singleTotalPrem - singleBasePrem).toFixed(2)));

            const basePrem = Number((singleBasePrem * count).toFixed(2));
            const riderAmt = Number((singleRiderAmt * count).toFixed(2));

            if (singleRiderAmt > 0) {
              return (
                <div className="flex gap-3 col-span-2">
                  <div className="flex-1">
                    <label className={label}>Base Premium Amount {count > 1 ? `(${count}x)` : ""}</label>
                    <input
                      type="text"
                      value={basePrem}
                      className={`${input} bg-slate-50 cursor-not-allowed`}
                      disabled
                    />
                  </div>  
                  <div className="flex-1">
                    <label className={label}>Rider Amount {count > 1 ? `(${count}x)` : ""}</label>
                    <input
                      type="text"
                      value={riderAmt.toFixed(2)}
                      className={`${input} bg-slate-50 cursor-not-allowed`}
                      disabled
                    />
                  </div>  
                  <div className="flex-1">
                    <label className={label}>Total Premium Amount  <span className="text-rose-500">*</span></label>
                    <input
                      type="text"
                      {...register("premiumAmount")}
                      className={`${input} bg-slate-50 cursor-not-allowed`}
                      disabled
                    />
                    {errors.premiumAmount && (
                      <p className="mt-1 text-xs text-rose-600">
                        {errors.premiumAmount.message}
                      </p>
                    )}
                  </div>             
                </div>
              );
            }

            return (
              <div>
                <label className={label}>Premium Amount {count > 1 ? `(${count} installments)` : ""} <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  {...register("premiumAmount")}
                  className={`${input} bg-slate-50 cursor-not-allowed`}
                  disabled
                />
                {errors.premiumAmount && (
                  <p className="mt-1 text-xs text-rose-600">
                    {errors.premiumAmount.message}
                  </p>
                )}
              </div>
            );
          })()}
          {/* <div>
            <label className={label}>Payment Status *</label>
            <select {...register("paymentStatus")} className={input}>
              <option value="UNPAID">Unpaid</option>
              <option value="PAID">Paid</option>
            </select>
          </div> */}
          <div className="flex col-span-1 gap-5">   
            {mode === "create" &&  
            <>
            <div className="flex-1">
              <label className={label}>Late Fee GST(%)</label>     
              <select
                {...register("gstRate")}
                className={input}
              >
                <option value={0}>Select Rate</option>
                {
                  Array.from({ length: 20 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>{i + 1}</option>
                  ))
                }
              </select>
                {errors.gstRate && (
                  <p className="mt-1 text-xs text-rose-600">
                    {errors.gstRate.message}
                  </p>
                )}
            </div>
            <div className="flex-1">
              <label className={label}>GST on Late Fee</label>
              <input
                type="text"
                {...register("gstOnLateFee")}
                className={input}
              />
              {errors.lateFee && (
                <p className="mt-1 text-xs text-rose-600">
                  {errors.lateFee.message}
                </p>
              )}
            </div>
            </>}
            <div className="flex-1">
              <label className={label}>Late Fee</label>
              <input
                type="text"
                {...register("lateFee")}
                className={input}
              />
              {errors.lateFee && (
                <p className="mt-1 text-xs text-rose-600">
                  {errors.lateFee.message}
                </p>
              )}
            </div>
          </div>
          
          <div>
            <label className={label}>Total Amount</label>
            <input
              type="number"
              value={Number.isNaN(totalAmount) ? 0 : totalAmount}
              className={`${input} disabled:bg-slate-50`}
              disabled
            />
          </div>
          <div>
            <label className={label}>
              Payment Date{" "}
              <span className="text-rose-500">*</span>
            </label>
             <Controller
                control={control}
                name="paidDate"
                render={({ field }) => (
                  <DatePicker
                    value={field.value ? new Date(field.value) : undefined}
                    readOnly = {mode === "view"}
                    onChange={(date) =>
                      field.onChange(date ? format(date, "yyyy-MM-dd") : "")
                    }
                  />
                )}
              />
            {errors.paidDate && (
              <p className="mt-1 text-xs text-rose-600">
                {errors.paidDate.message}
              </p>
            )}
          </div>
          <div>
            <label className={label}>
              Payment Mode{" "}
              <span className="text-rose-500">*</span>
            </label>
            <select
              {...register("paymentMode")}
              className={input}
              disabled = {mode === "view"}
            >
              <option value="">Select mode</option>
              {
                paymentModes.map((p) => {
                  return(
                    <option key={p.id} value = {p.id}>{p.modeName}</option>
                  )
                })
              }
            </select>
            {errors.paymentMode && (
              <p className="mt-1 text-xs text-rose-600">
                {errors.paymentMode.message}
              </p>
            )}
          </div>
          <div className="col-span-2">
            <label className={label}>Payment Details</label>
            <input {...register("paymentDetails")} className={input} disabled = {mode === "view"}/>
          </div>
        </div>

        </CustomerSectionCard>
        {selectedPolicy &&
         <CustomerSectionCard
                    title="Policy Information"
                    icon={FileText}
                    className="mt-5"
                  >
            <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
              <div>
                <label className={label}>Life Assured Name</label>
                <input
                  type="text"
                  value = {`${selectedPolicy?.CustomerMaster?.firstName} ${selectedPolicy?.CustomerMaster?.lastName}`}
                  className={`${input} disabled:bg-slate-50`}
                  disabled
                />               
              </div>
              <div>
                <label className={label}>Group Code</label>
                <input
                  type="text"
                  value = {selectedPolicy?.customer?.groupCode || ""}
                  className={`${input} disabled:bg-slate-50`}
                  disabled
                />
              </div>
              <div>
                <label className={label}>Commencement Date</label>
                <input
                  type="text"
                  value={selectedPolicy?.commencementDate ? new Date(selectedPolicy.commencementDate).toLocaleDateString("en-IN") : ""}
                  className={`${input} disabled:bg-slate-50`}
                  disabled
                />
              </div>
               <div>
                <label className={label}>Plan</label>
                <input
                  type="text"
                  value={selectedPolicy?.product?.productName || ""}
                  className={`${input} disabled:bg-slate-50`}
                  disabled
                />
              </div>
              <div className="flex gap-5 col-span-2">
                <div>
                  <label className={label}>Mode</label>
                  <input
                    type="text"
                    value={selectedPolicy?.premiumMode?.modeName || ""}
                    className={`${input} disabled:bg-slate-50`}
                    disabled
                  />
                </div>
                <div>
                  <label className={label}>PT</label>
                  <input
                    type="text"
                    value={selectedPolicy?.policyTerm || 0}
                    className={`${input} disabled:bg-slate-50`}
                    disabled
                  />
                </div>
                 <div>
                  <label className={label}>PPT</label>
                  <input
                    type="text"
                    value={selectedPolicy?.premiumPayingTerm || 0}
                    className={`${input} disabled:bg-slate-50`}
                    disabled
                  />
                </div>
              </div>
              <div>
                  <label className={label}>Agent Name</label>
                  <input
                    type="text"
                    value={selectedPolicy?.advisor?.advisorName || ""}
                    className={`${input} disabled:bg-slate-50`}
                    disabled
                  />
                </div>
                <div>
                  <label className={label}>Branch Code</label>
                  <input
                    type="text"
                    value={selectedPolicy?.branch?.branchCode || ""}
                    className={`${input} disabled:bg-slate-50`}
                    disabled
                  />
                </div>
            </div>
        </CustomerSectionCard>}
        {mode != "view" &&
        <div className="mt-8 flex justify-end gap-3 border-t border-slate-100 pt-5">
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold cursor-pointer"
          >
            Cancel
          </button>
          <button
            disabled={
              isSubmitting ||
              !selectedPolicy ||
              (totalInstallments !== null && Number(installmentNo) > totalInstallments) ||
              (totalInstallments !== null && highestPaidInstallment >= totalInstallments) ||
              (mode === "create" &&
                Boolean(
                  selectedPolicy &&
                    (selectedPolicy.premiumMode?.modeCode === "SIN" ||
                      selectedPolicy.premiumMode?.months === 0 ||
                      selectedPolicy.product?.planNumber === "717") &&
                    highestPaidInstallment >= 1,
                ))
            }
            type="submit"
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#5c67ff] to-[#3a47ff] px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-200 transition-all hover:brightness-110 active:scale-[0.98] cursor-pointer disabled:opacity-[60%]"
          >
            {isSubmitting ? (
              <Loader2 className="animate-spin" size={17} />
            ) : (
              <Save size={17} />
            )}
            {mode === "create" ? "Create Payment" : "Update Payment"}
          </button>
        </div>}
      </form>
    </div>
  );
}
