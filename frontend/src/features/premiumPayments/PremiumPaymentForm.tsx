"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm , Controller, Form} from "react-hook-form";
import { set, z } from "zod";
import { useDispatch, useSelector} from "react-redux";
import { useRouter } from "next/navigation";
import { useEffect, useState , useMemo } from "react";
import { FileText, Loader2, Save, User, Search } from "lucide-react";
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
export default function PremiumPaymentForm({ paymentId, mode = "create" }: { paymentId?: string; mode?: "create" | "edit" | "view" }) {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { policies } = useSelector((s: RootState) => s.policies);
  const { isSubmitting } = useSelector((s: RootState) => s.premiumPayments);
  const {modes} = useSelector ((s:RootState) => s.premiumModes)
  const [selectedPolicy,setSelectedPolicy] = useState<Policy | null>(null);
  const {paymentModes} = useSelector((s:RootState) => s.paymentModes);
  const [totalAmount,setTotatAmount] = useState(0);


  const input =`w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#B8873A] focus:ring-2 focus:ring-[#B8873A]/20 ${mode === "view" ? "bg-slate-50 cursor-not-allowed" : ""}`;
const label ="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500";

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
      paidDate : new Date().toDateString(),
      gstOnLateFee : 0,
      lateFee : 0,
      premiumAmount :0,
      paymentMode : "",
    },
  });

  const [policyId , premiumAmount , lateFeeAmount ,gstRate, gstOnLateFee] = watch(["policyId" , "premiumAmount" , "lateFee" , "gstRate", "gstOnLateFee"])
    //status = watch("paymentStatus");


    // load existing payment when editing
  useEffect(() => {
    if (!paymentId) 
      return;
    (async () => {
      const res = await dispatch(fetchPremiumPaymentById(paymentId as string));
      const p = res.payload;
      if (p && typeof p === 'object' && 'policyId' in p) {
        setValue("policyId",  p.policyId ?? "");
        setValue("installmentNo", p.installmentNo ?? 1);
        setValue("dueDate", p.dueDate ? p.dueDate.slice(0,10) : "");
        setValue("premiumAmount", p.premiumAmount ?? 0);
        setValue("paidDate", p.paidDate ? p.paidDate.slice(0,10) : "");
        setValue("lateFee", p.lateFee ?? 0);
        //setValue("gstOnLateFee", p.gstOnLateFee ?? 0);
        setValue("paymentMode", p.paymentMode ?? "");
        setValue("paymentDetails", p.paymentDetails ?? "");
        //setValue("futureDueDate", p.futureDueDate ?? "");

        const selectionPolicy = policies.find((x) => x.id === p.policyId);
      
        if(selectionPolicy)
        setSelectedPolicy(selectionPolicy);
      }
    })();
  }, [paymentId, dispatch, setValue]);

  useEffect(() => {
    dispatch(fetchPolicies());
    dispatch(fetchPremiumModes());
    dispatch(fetchPaymentModes());

  }, [dispatch]);

   useEffect(() => {
  
    setValue("gstOnLateFee",0);
    
    setValue("lateFee",0);
    setValue("paymentDetails","");

  }, [policyId]);

  useEffect(() => {

      
      if(mode === "create")
      {
        const p = policies.find((x) => x.id === policyId);

        if(p)
        {
          setSelectedPolicy(p);
          getInstallmentNumber(policyId,1);
          p?.policyRiders?.map((r) => {
            console.log("Id",r.id)
          })
        }

        if (p?.nextPremiumDueDate)
          setValue("dueDate", p.nextPremiumDueDate.slice(0, 10));

         if (p?.premium?.totalInstallmentPremium)
           setValue("premiumAmount", Number(p.premium.totalInstallmentPremium));

        const monthsToAdd = modes.find((x) => x.id === p?.premiumModeId)?.months;
        const futureDueDate = addMonths(p?.nextPremiumDueDate! , monthsToAdd!);
        setValue("futureDueDate" , futureDueDate.toDateString());
        

        if(p && p.nextPremiumDueDate! < new Date().toISOString())
        {

          const monthlyPremium = p?.premium?.installmentPremium;


          //New Code
          const firstDueDate = startOfDay(new Date(p.nextPremiumDueDate!));

          const today = startOfDay(new Date());

          const modeMonths = Number(p.premiumMode?.months ?? 1);

          let dueInstallments = 0;

          if (!isBefore(today, firstDueDate)) {
            const monthsElapsed = differenceInCalendarMonths(today,firstDueDate);

            dueInstallments =
              Math.floor(monthsElapsed / modeMonths) + 1;

            const calculatedDueDate = addMonths(
              firstDueDate,
              (dueInstallments - 1) * modeMonths
            );

            // If the calculated installment's actual day hasn't arrived,
            // don't count it.
            if (isBefore(today, calculatedDueDate)) {
              dueInstallments--;

            }
          }

          // const firstDueDate = new Date(p?.nextPremiumDueDate!);
          // const today = new Date();

          // let dueInstallments = Number(((differenceInCalendarMonths(today, firstDueDate) + 1)/p?.premiumMode?.months).toFixed(0));
          // //let dueInstallments = ((differenceInCalendarMonths(today, firstDueDate) + 1)/p?.premiumMode?.months);

          // // If today's date is before this month's due date,
          // // this month's installment isn't due yet.
          // const currentMonthDueDate = addMonths(firstDueDate,dueInstallments - 1);

          // if (isBefore(today, currentMonthDueDate)) {
          //   dueInstallments--;
          // }

           const totalPremiumDue = Number((dueInstallments * monthlyPremium!).toFixed(2));

           setValue("premiumAmount", totalPremiumDue);
          
           const overdueDays = Math.max(0,differenceInCalendarDays(today, firstDueDate));

            console.log("Overdue days -",overdueDays)
            console.log("Due installments -",dueInstallments)
            console.log("Single premium - ",p?.premium?.installmentPremium)

          //late fee and GST
          const lateFeeApplicable = Number(((totalPremiumDue * 12 * overdueDays)/36500).toFixed(2));
          const gstApplicableOnLateFee = Number(((lateFeeApplicable * gstRate)/100).toFixed(2));
          setValue("lateFee",lateFeeApplicable);
          setValue("gstOnLateFee",gstApplicableOnLateFee)

          const newFutureDueDate = addMonths(firstDueDate, (dueInstallments*p?.premiumMode?.months));
          setValue("futureDueDate" , newFutureDueDate.toDateString());

          // console.log("GSt",gstRate)
          // console.log(gstApplicableOnLateFee)
          // console.log(firstDueDate)
           //console.log("Next due ",newFutureDueDate)

          
          setValue("paymentDetails",`Payment of - ${dueInstallments} due premiums.`)        

          getInstallmentNumber(policyId,dueInstallments);
        }

      }
  }, [policyId, policies, setValue ,gstRate]);

  const getInstallmentNumber = async (policyId : string, dueInstallments : number) => {
    if(mode === "create")
    {
       const policyPayments =await dispatch(fetchPremiumPaymentsByPolicy(policyId));


        const lastPayment = policyPayments.payload?.reduce((latest, payment) => {
          const paymentDate = new Date(payment.createdAt);
          return !latest || paymentDate > new Date(latest.createdAt) ? payment : latest;
        }, null);

        if(lastPayment)
        {
          setValue("installmentNo",(dueInstallments + lastPayment?.installmentNo));
        }
        else
        {
          setValue("installmentNo",dueInstallments);
        }
       
    } 
  }

  useEffect(() => {
    setTotatAmount(Number((Number(premiumAmount)+Number(lateFeeAmount!)+Number(gstOnLateFee)).toFixed(2)))
  },[premiumAmount,lateFeeAmount,gstOnLateFee])

  const submit = async (v: FormValues) => {
    try {
      const totalLateFee = Number(v.lateFee) + (Number(v.gstOnLateFee) || 0);
      const totalPremiumAmount = Number(v.premiumAmount);
      if(mode === "edit") {
        await dispatch(updatePremiumPayment({
          id: paymentId!,
          policyId: v.policyId,
          installmentNo: v.installmentNo,
          dueDate: v.dueDate,
          premiumAmount: totalPremiumAmount,
          paidDate: v.paidDate,
          lateFee: totalLateFee ?? null,
          paymentMode: v.paymentMode?.trim() || null,
          paymentDetails : v.paymentDetails?.trim() || null,
          futureDueDate : v.futureDueDate,}));
          toast.success("Premium payment updated successfully");

        }
        else{
      await dispatch(
        createPremiumPayment({
          policyId: v.policyId,
          installmentNo: v.installmentNo,
          dueDate: v.dueDate,
          premiumAmount: totalPremiumAmount,
          paidDate: v.paidDate,
          lateFee: totalLateFee ?? null,
          paymentMode: v.paymentMode?.trim() || null,
          paymentDetails : v.paymentDetails?.trim() || null,
          futureDueDate : v.futureDueDate,
        }),
      ).unwrap();
          //console.log(v.futureDueDate)
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
            <label className={label}>Installment<span className="text-rose-500">*</span></label>
            <input
              type="number"
              {...register("installmentNo")}
              className={`${input} bg-slate-50 cursor-not-allowed`}
              disabled
            />
            {errors.installmentNo && (
              <p className="mt-1 text-xs text-rose-600">
                {errors.installmentNo.message}
              </p>
            )}
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
          {(selectedPolicy?.premium?.totalInstallmentPremium - selectedPolicy?.premium?.installmentPremium) > 0 &&
            <div className="flex gap-3 col-span-2">
            <div>
              <label className={label}>Base Premium Amount</label>
              <input
                type="text"
                value= {selectedPolicy?.premium?.installmentPremium ?? 0}
                className={`${input} bg-slate-50 cursor-not-allowed`}
                disabled
              />
            </div>  
            <div>
              <label className={label}>Rider Amount</label>
              <input
                type="text"
                value = {(selectedPolicy?.premium?.totalInstallmentPremium - selectedPolicy?.premium?.installmentPremium ?? 0).toFixed(2)}
                className={`${input} bg-slate-50 cursor-not-allowed`}
                disabled
              />
             
            </div>  
            <div>
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
          </div>}     
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
              value = {totalAmount}
              className={`${input} disabled:bg-slate-50`}
              disabled
            />
            {errors.lateFee && (
              <p className="mt-1 text-xs text-rose-600">
                {errors.lateFee.message}
              </p>
            )}
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
                  value = {new Date(selectedPolicy?.commencementDate).toLocaleDateString("en-IN")}
                  className={`${input} disabled:bg-slate-50`}
                  disabled
                />
              </div>
               <div>
                <label className={label}>Plan</label>
                <input
                  type="text"
                  value = {selectedPolicy?.product?.productName}
                  className={`${input} disabled:bg-slate-50`}
                  disabled
                />
              </div>
              <div className="flex gap-5 col-span-2">
                <div>
                  <label className={label}>Mode</label>
                  <input
                    type="text"
                    value = {selectedPolicy?.premiumMode?.modeName}
                    className={`${input} disabled:bg-slate-50`}
                    disabled
                  />
                </div>
                <div>
                  <label className={label}>PT</label>
                  <input
                    type="text"
                    value = {selectedPolicy?.policyTerm || 0}
                    className={`${input} disabled:bg-slate-50`}
                    disabled
                  />
                </div>
                 <div>
                  <label className={label}>PPT</label>
                  <input
                    type="text"
                    value = {selectedPolicy?.premiumPayingTerm || 0}
                    className={`${input} disabled:bg-slate-50`}
                    disabled
                  />
                </div>
              </div>
              <div>
                  <label className={label}>Agent Name</label>
                  <input
                    type="text"
                    value = {selectedPolicy?.advisor?.advisorName}
                    className={`${input} disabled:bg-slate-50`}
                    disabled
                  />
                </div>
                <div>
                  <label className={label}>Branch Code</label>
                  <input
                    type="text"
                    value = {selectedPolicy?.branch.branchCode}
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
            disabled={isSubmitting || !selectedPolicy}
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
