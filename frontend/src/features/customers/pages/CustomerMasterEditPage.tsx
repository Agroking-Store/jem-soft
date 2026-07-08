"use client";

import CustomerModuleNav from "@/features/customers/components/CustomerModuleNav";

import { useEffect, useState, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useRouter, useParams } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { RootState, AppDispatch } from "@/store/store";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { fetchCustomerMaster, updateCustomerMaster } from "@/features/customers/customerMasterSlice";
import { fetchCustomers } from "@/features/customers/customerSlice";
import {
  ArrowLeft, User, Phone, MapPin, CreditCard, Info, Settings,
  ChevronRight, Plus, Trash2, Star, Search, X,
} from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";

const SALUTATIONS = ["Mr.", "Mrs.", "Ms.", "Dr.", "Prof.", "Er.", "CA", "Adv."];
const GENDERS = ["Male", "Female", "Other"];
const CUSTOMER_TYPES = ["Individual", "Corporate", "NRI", "Minor"];
const INDIAN_STATES = [
  "Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh","Goa","Gujarat",
  "Haryana","Himachal Pradesh","Jharkhand","Karnataka","Kerala","Madhya Pradesh","Maharashtra",
  "Manipur","Meghalaya","Mizoram","Nagaland","Odisha","Punjab","Rajasthan","Sikkim",
  "Tamil Nadu","Telangana","Tripura","Uttar Pradesh","Uttarakhand","West Bengal",
  "Andaman and Nicobar Islands","Chandigarh","Dadra and Nagar Haveli and Daman and Diu",
  "Delhi","Jammu and Kashmir","Ladakh","Lakshadweep","Puducherry",
];
const RELIGIONS = ["Hindu","Muslim","Christian","Sikh","Buddhist","Jain","Other"];
// const INCOME_SLABS = ["Below 1L","1L-2.5L","2.5L-5L","5L-10L","10L-25L","25L-50L","50L-1Cr","Above 1Cr"];
const OCCUPATION_TYPES = ["Salaried","Business","Professional","Agriculture","Retired","Homemaker","Student","Other"];
const RELATIONS = ["Self","Spouse","Son","Daughter","Father","Mother","Brother","Sister","Guardian","Other","Not Mapped"];
const ACCOUNT_TYPES = ["Saving Bank","Current Account","NRE Account","NRO Account","FCNR Account"];
const ADDRESS_TYPES = ["Residence","Office","Other"];

const bankDetailSchema = z.object({
  isDefault: z.boolean().default(false),
  ifscCode: z.string().optional().or(z.literal("")),
  bankName: z.string().optional().or(z.literal("")),
  bankBranch: z.string().optional().or(z.literal("")),
  city: z.string().optional().or(z.literal("")),
  accountType: z.string().optional().or(z.literal("")),
  accountNumber: z.string().optional().or(z.literal("")),
  micrNumber: z.string().optional().or(z.literal("")),
});

const addressSchema = z.object({
  addressType: z.string().min(1),
  addressLine1: z.string().optional().or(z.literal("")),
  addressLine2: z.string().optional().or(z.literal("")),
  addressLine3: z.string().optional().or(z.literal("")),
  addressLine4: z.string().optional().or(z.literal("")),
  city: z.string().optional().or(z.literal("")),
  pin: z.string().optional().or(z.literal("")),
  country: z.string().optional().or(z.literal("")),
  state: z.string().optional().or(z.literal("")),
  area: z.string().optional().or(z.literal("")),
  useGroupAddress: z.boolean().default(false),
});

const schema = z.object({
  groupId: z.string().min(1, "Customer Group is required"),
  salutation: z.string().optional().or(z.literal("")),
  firstName: z.string().min(1, "First name is required"),
  middleName: z.string().optional().or(z.literal("")),
  lastName: z.string().min(1, "Last name is required"),
  gender: z.string().min(1, "Gender is required"),
  dob: z.string().min(1, "Date of Birth is required"),
  isGroupHead: z.boolean().default(false),
  customerType: z.string().optional().or(z.literal("")),
  panNumber: z.string().optional().or(z.literal("")),
  aadhaarNumber: z.string().optional().or(z.literal("")),
  guardianId: z.string().optional().or(z.literal("")),
  salutationLetter: z.string().optional().or(z.literal("")),
  mobile1: z.string().optional().or(z.literal("")),
  mobile2: z.string().optional().or(z.literal("")),
  landline1Std: z.string().optional().or(z.literal("")),
  landline1Number: z.string().optional().or(z.literal("")),
  landline2Std: z.string().optional().or(z.literal("")),
  landline2Number: z.string().optional().or(z.literal("")),
  faxStd: z.string().optional().or(z.literal("")),
  faxNumber: z.string().optional().or(z.literal("")),
  emailPersonal: z.string().email("Invalid email").optional().or(z.literal("")),
  emailBusiness: z.string().email("Invalid email").optional().or(z.literal("")),
  skypeId: z.string().optional().or(z.literal("")),
  addresses: z.array(addressSchema).default([]),
  bankDetails: z.array(bankDetailSchema).default([]),
  relationToGroup: z.string().optional().or(z.literal("")),
  dobForGreetings: z.string().optional().or(z.literal("")),
  marriageDate: z.string().optional().or(z.literal("")),
  isMarried: z.boolean().default(false),
  demiseDate: z.string().optional().or(z.literal("")),
  isDead: z.boolean().default(false),
  fatherName: z.string().optional().or(z.literal("")),
  motherName: z.string().optional().or(z.literal("")),
  spouseName: z.string().optional().or(z.literal("")),
  nationality: z.string().optional().or(z.literal("")),
  qualification: z.string().optional().or(z.literal("")),
  occupationType: z.string().optional().or(z.literal("")),
  occupation: z.string().optional().or(z.literal("")),
  employer: z.string().optional().or(z.literal("")),
  natureOfDuties: z.string().optional().or(z.literal("")),
  referredBy: z.string().optional().or(z.literal("")),
  heightFt: z.string().optional().or(z.literal("")),
  weightKg: z.string().optional().or(z.literal("")),
  incomeSlab: z.string().optional().or(z.literal("")),
  religion: z.string().optional().or(z.literal("")),
  crmGroups: z.string().optional().or(z.literal("")),
  passportNumber: z.string().optional().or(z.literal("")),
  passportExpiryDate: z.string().optional().or(z.literal("")),
  gstNumber: z.string().optional().or(z.literal("")),
  specialNote: z.string().optional().or(z.literal("")),
  preferredCommAddress: z.string().optional().or(z.literal("")),
  smsMarketing: z.boolean().default(true),
  emailMarketing: z.boolean().default(true),
});

type FormInputValues = z.input<typeof schema>;
type FormValues = z.output<typeof schema>;

function FieldLabel({ label, required }: { label: string; required?: boolean }) {
  return <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{label}{required && <span className="ml-0.5 text-rose-500">*</span>}</label>;
}

function FormInput({ label, error, required, icon, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string; required?: boolean; icon?: React.ReactNode }) {
  return (
    <div>
      <FieldLabel label={label} required={required} />
      <div className="relative">
        {icon && <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">{icon}</span>}
        <input {...props} className={`w-full rounded-xl border bg-white py-2.75 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all focus:border-[#B8873A] focus:ring-2 focus:ring-[#B8873A]/15 ${error ? "border-rose-300 bg-rose-50/30" : "border-slate-200 hover:border-slate-300"} ${icon ? "pl-9 pr-3" : "px-3"}`} />
      </div>
      {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}
    </div>
  );
}

function FormSelect({ label, error, required, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { label: string; error?: string; required?: boolean }) {
  return (
    <div>
      <FieldLabel label={label} required={required} />
      <select {...props} className={`w-full rounded-xl border bg-white py-2.75 px-3 text-sm text-slate-900 outline-none transition-all focus:border-[#B8873A] focus:ring-2 focus:ring-[#B8873A]/15 ${error ? "border-rose-300 bg-rose-50/30" : "border-slate-200 hover:border-slate-300"}`}>{children}</select>
      {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}
    </div>
  );
}

function FormTextarea({ label, error, required, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; error?: string; required?: boolean }) {
  return (
    <div>
      <FieldLabel label={label} required={required} />
      <textarea {...props} rows={3} className={`w-full rounded-xl border bg-white py-2.75 px-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all resize-none focus:border-[#B8873A] focus:ring-2 focus:ring-[#B8873A]/15 ${error ? "border-rose-300 bg-rose-50/30" : "border-slate-200 hover:border-slate-300"}`} />
      {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}
    </div>
  );
}

function SectionCard({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.05)]">
      <div className="flex items-center gap-2.5 border-b border-slate-200 bg-slate-50 px-5 py-3.5">
        <span className="text-[#B8873A]">{icon}</span>
        <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">{title}</h2>
      </div>
      <div className="p-5 sm:p-6">{children}</div>
    </div>
  );
}

function GroupAutoComplete({ 
  value, 
  onChange, 
  groups,
  error,
}: { 
  value: string; 
  onChange: (id: string) => void; 
  groups: { id: string; groupCode?: string | null; groupName?: string | null }[];
  error?: string;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = groups.find((g) => g.id === value);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = groups.filter((g) => {
    const q = query.toLowerCase();
    return (g.groupName?.toLowerCase().includes(q) || g.groupCode?.toLowerCase().includes(q));
  }).slice(0, 10);

  return (
    <div ref={ref} className="relative">
      <FieldLabel label="Customer Group" required />
      <div className="flex gap-2">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"><Search size={14} /></span>
          <input
            value={selected ? `${selected.groupCode ? `[${selected.groupCode}] ` : ""}${selected.groupName || ""}` : query}
            onChange={(e) => { setQuery(e.target.value); setOpen(true); if (!e.target.value) onChange(""); }}
            onFocus={() => setOpen(true)}
            placeholder="Search group by name or code..."
            className={`w-full border rounded-lg py-2.5 pl-9 pr-8 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all cursor-pointer bg-white focus:ring-2 focus:ring-[#B8873A]/20 focus:border-[#B8873A]
              ${error ? "border-red-300 bg-red-50/30" : "border-slate-200 hover:border-slate-300"}`}
          />
          {selected && (
            <button type="button" onClick={() => { onChange(""); setQuery(""); }} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"><X size={13} /></button>
          )}
        </div>
        <Link href="/dashboard/customers/new" target="_blank" className="inline-flex items-center justify-center w-10 h-10 rounded-lg border border-slate-200 bg-[#B8873A]/10 text-[#B8873A] hover:bg-[#E8C77A]/20 transition-colors" title="Add new group">
          <Plus size={16} />
        </Link>
      </div>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
      {open && filtered.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-50 max-h-52 overflow-y-auto">
          {filtered.map((g) => (
            <button key={g.id} type="button" onClick={() => { onChange(g.id); setQuery(""); setOpen(false); }} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[#B8873A]/10 transition-colors text-left">
              <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-600">{g.groupCode || "—"}</span>
              <span className="text-sm font-medium text-slate-800">{g.groupName || "—"}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function formatDateForInput(dateStr?: string | null): string {
  if (!dateStr) return "";
  try { return new Date(dateStr).toISOString().split("T")[0]; } catch { return ""; }
}

export default function CustomerMasterEditPage() {
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const { user, isLoading: authLoading } = useAuth();
  const { currentCustomer, isLoading: customerLoading } = useSelector((s: RootState) => s.customerMaster);
  const { customers: groups } = useSelector((s: RootState) => s.customers);
  const [isMounted, setIsMounted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState("");

  const { register, handleSubmit, control, setValue, watch, reset, formState: { errors } } = useForm<FormInputValues, unknown, FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { isGroupHead: false, isMarried: false, isDead: false, smsMarketing: true, emailMarketing: true, nationality: "Indian", qualification: "", addresses: [], bankDetails: [] },
  });

  const { fields: addrFields, append: appendAddr, remove: removeAddr } = useFieldArray({ control, name: "addresses" });
  const { fields: bankFields, append: appendBank, remove: removeBank } = useFieldArray({ control, name: "bankDetails" });

  useEffect(() => {
    setIsMounted(true);
    dispatch(fetchCustomers());
    if (id) dispatch(fetchCustomerMaster(id));
  }, [dispatch, id]);

  useEffect(() => {
    if (isMounted && !authLoading && user) {
      if (user.role !== "ADMIN" && user.role !== "ADVISOR") {
        toast.error("You do not have permission.");
        router.replace("/dashboard/customers");
      }
    }
  }, [isMounted, authLoading, user, router]);

  useEffect(() => {
    if (currentCustomer && isMounted) {
      const c = currentCustomer;
      const grp = c.groupId || "";
      setSelectedGroupId(grp);
      const ci = c.contactInfo;
      const misc = c.miscInfo;
      const pref = c.preferences;
      reset({
        groupId: grp,
        salutation: c.salutation || "",
        firstName: c.firstName,
        middleName: c.middleName || "",
        lastName: c.lastName,
        gender: c.gender || "",
        dob: formatDateForInput(c.dob),
        isGroupHead: c.isGroupHead ?? false,
        customerType: c.customerType || "",
        panNumber: c.panNumber || "",
        aadhaarNumber: c.aadhaarNumber || "",
        guardianId: c.guardianId || "",
        salutationLetter: c.salutationLetter || "",
        mobile1: ci?.mobile1 || "", mobile2: ci?.mobile2 || "",
        landline1Std: ci?.landline1Std || "", landline1Number: ci?.landline1Number || "",
        landline2Std: ci?.landline2Std || "", landline2Number: ci?.landline2Number || "",
        faxStd: ci?.faxStd || "", faxNumber: ci?.faxNumber || "",
        emailPersonal: ci?.emailPersonal || "", emailBusiness: ci?.emailBusiness || "",
        skypeId: ci?.skypeId || "",
        addresses: (c.addresses || []).map((a) => ({ addressType: a.addressType, addressLine1: a.addressLine1 || "", addressLine2: a.addressLine2 || "", addressLine3: a.addressLine3 || "", addressLine4: a.addressLine4 || "", city: a.city || "", pin: a.pin || "", country: a.country || "India", state: a.state || "", area: a.area || "", useGroupAddress: a.useGroupAddress ?? false })),
        bankDetails: (c.bankDetails || []).map((b) => ({ isDefault: b.isDefault ?? false, ifscCode: b.ifscCode || "", bankName: b.bankName || "", bankBranch: b.bankBranch || "", city: b.city || "", accountType: b.accountType || "", accountNumber: b.accountNumber || "", micrNumber: b.micrNumber || "" })),
        relationToGroup: misc?.relationToGroup || "",
        dobForGreetings: formatDateForInput(misc?.dobForGreetings),
        marriageDate: formatDateForInput(misc?.marriageDate),
        isMarried: misc?.isMarried ?? false,
        demiseDate: formatDateForInput(misc?.demiseDate),
        isDead: misc?.isDead ?? false,
        fatherName: misc?.fatherName || "", motherName: misc?.motherName || "",
        spouseName: misc?.spouseName || "", nationality: misc?.nationality || "Indian", qualification: misc?.qualification || "",
        occupationType: misc?.occupationType || "", occupation: misc?.occupation || "",
        employer: misc?.employer || "", natureOfDuties: misc?.natureOfDuties || "",
        referredBy: misc?.referredBy || "", heightFt: misc?.heightFt || "",
        weightKg: misc?.weightKg || "", incomeSlab: misc?.incomeSlab || "",
        religion: misc?.religion || "", crmGroups: misc?.crmGroups || "",
        passportNumber: misc?.passportNumber || "",
        passportExpiryDate: formatDateForInput(misc?.passportExpiryDate),
        gstNumber: misc?.gstNumber || "", specialNote: misc?.specialNote || "",
        preferredCommAddress: pref?.preferredCommAddress || "",
        smsMarketing: pref?.smsMarketing ?? true,
        emailMarketing: pref?.emailMarketing ?? true,
      });
    }
  }, [currentCustomer, isMounted, reset]);

  const onSubmit = async (data: FormValues) => {
    setIsSubmitting(true);
    try {
      await dispatch(updateCustomerMaster({
        id,
        payload: {
          groupId: data.groupId || undefined, salutation: data.salutation || undefined,
          firstName: data.firstName, middleName: data.middleName || undefined, lastName: data.lastName,
          gender: data.gender || undefined, dob: data.dob || undefined, isGroupHead: data.isGroupHead,
          customerType: data.customerType || undefined, panNumber: data.panNumber || undefined,
          aadhaarNumber: data.aadhaarNumber || undefined, guardianId: data.guardianId || undefined,
          salutationLetter: data.salutationLetter || undefined,
          contactInfo: { mobile1: data.mobile1 || undefined, mobile2: data.mobile2 || undefined, landline1Std: data.landline1Std || undefined, landline1Number: data.landline1Number || undefined, landline2Std: data.landline2Std || undefined, landline2Number: data.landline2Number || undefined, faxStd: data.faxStd || undefined, faxNumber: data.faxNumber || undefined, emailPersonal: data.emailPersonal || undefined, emailBusiness: data.emailBusiness || undefined, skypeId: data.skypeId || undefined },
          addresses: data.addresses.map((a) => ({ ...a, country: a.country || "India" })),
          bankDetails: data.bankDetails.map((b) => ({ ...b })),
          miscInfo: { relationToGroup: data.relationToGroup || undefined, dobForGreetings: data.dobForGreetings || undefined, marriageDate: data.marriageDate || undefined, isMarried: data.isMarried, demiseDate: data.demiseDate || undefined, isDead: data.isDead, fatherName: data.fatherName || undefined, motherName: data.motherName || undefined, spouseName: data.spouseName || undefined, nationality: data.nationality || "Indian", qualification: data.qualification || undefined, occupationType: data.occupationType || undefined, occupation: data.occupation || undefined, employer: data.employer || undefined, natureOfDuties: data.natureOfDuties || undefined, referredBy: data.referredBy || undefined, heightFt: data.heightFt || undefined, weightKg: data.weightKg || undefined, incomeSlab: data.incomeSlab || undefined, religion: data.religion || undefined, crmGroups: data.crmGroups || undefined, passportNumber: data.passportNumber || undefined, passportExpiryDate: data.passportExpiryDate || undefined, gstNumber: data.gstNumber || undefined, specialNote: data.specialNote || undefined },
          preferences: { preferredCommAddress: data.preferredCommAddress || undefined, smsMarketing: data.smsMarketing, emailMarketing: data.emailMarketing },
        },
      })).unwrap();
      toast.success("Customer updated successfully!");
      router.push("/dashboard/customers?tab=master");
    } catch (err: any) {
      toast.error(err || "Failed to update customer");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isMounted || authLoading || (customerLoading && !currentCustomer)) {
    return <div className="flex items-center justify-center min-h-[60vh]"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0B1220]" /></div>;
  }
  if (user?.role !== "ADMIN" && user?.role !== "ADVISOR") return null;

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-8">
      <CustomerModuleNav />

      <div className="flex items-center gap-4">
        <Link href="/dashboard/customers?tab=master" className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition-colors">
          <ArrowLeft size={16} />
        </Link>
        <div>
          <nav className="flex items-center gap-1 text-xs text-slate-400 mb-0.5">
            <Link href="/dashboard/customers?tab=master" className="hover:text-slate-600">Customer Master</Link>
            <ChevronRight size={12} />
            <span className="text-slate-600 font-medium">Edit</span>
          </nav>
          <h1 className="text-xl font-bold text-slate-900">Edit Customer</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
        {/* Personal Details */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2.5 px-5 py-3.5 bg-slate-50 border-b border-slate-200">
            <span className="text-[#B8873A]"><User size={16} /></span>
            <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Personal Details</h2>
          </div>
          <div className="p-5 space-y-4">
            <GroupAutoComplete value={selectedGroupId} onChange={(id) => { setSelectedGroupId(id); setValue("groupId", id); }} groups={groups.map((g) => ({ id: g.id, groupCode: g.groupCode, groupName: g.groupName }))} error={errors.groupId?.message} />
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <FormSelect label="Salutation" {...register("salutation")}><option value="">—</option>{SALUTATIONS.map((s) => <option key={s}>{s}</option>)}</FormSelect>
              <FormInput label="First Name" required placeholder="First name" error={errors.firstName?.message} {...register("firstName")} />
              <FormInput label="Middle Name" placeholder="Middle name" {...register("middleName")} />
              <FormInput label="Last Name" required placeholder="Last name" error={errors.lastName?.message} {...register("lastName")} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <FormSelect label="Gender" required error={errors.gender?.message} {...register("gender")}><option value="">Select gender</option>{GENDERS.map((g) => <option key={g}>{g}</option>)}</FormSelect>
              <FormInput label="Date of Birth" type="date" required error={errors.dob?.message} {...register("dob")} />
              <FormSelect label="Customer Type" {...register("customerType")}><option value="">Select type</option>{CUSTOMER_TYPES.map((t) => <option key={t}>{t}</option>)}</FormSelect>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <FormInput label="PAN Number" placeholder="ABCDE1234F" {...register("panNumber")} />
              <FormInput label="Aadhaar Number" placeholder="1234 5678 9012" {...register("aadhaarNumber")} />
              <FormInput label="Salutation Letter" placeholder="Dear Mr. Sharma" {...register("salutationLetter")} />
            </div>
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input type="checkbox" {...register("isGroupHead")} className="w-4 h-4 rounded border-slate-300 text-[#B8873A] focus:ring-[#B8873A]/20" />
                <div>
                  <p className="text-sm font-semibold text-slate-700">Is Group Head</p>
                  <p className="text-xs text-slate-400">Mark as the primary person of the group</p>
                </div>
              </label>
              {watch("isGroupHead") && <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-100 text-amber-700"><Star size={11} /> Group Head</span>}
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2.5 px-5 py-3.5 bg-slate-50 border-b border-slate-200">
            <span className="text-[#B8873A]"><Phone size={16} /></span>
            <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Contact Information</h2>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormInput label="Mobile 1" type="tel" placeholder="9876543210" {...register("mobile1")} />
              <FormInput label="Mobile 2" type="tel" placeholder="9876543211" {...register("mobile2")} />
              <div><FieldLabel label="Landline 1" /><div className="flex gap-2"><input {...register("landline1Std")} placeholder="STD" className="w-20 border border-slate-200 rounded-lg py-2.5 px-3 text-sm outline-none focus:ring-2 focus:ring-[#B8873A]/20 focus:border-[#B8873A] hover:border-slate-300 bg-white" /><input {...register("landline1Number")} placeholder="Number" className="flex-1 border border-slate-200 rounded-lg py-2.5 px-3 text-sm outline-none focus:ring-2 focus:ring-[#B8873A]/20 focus:border-[#B8873A] hover:border-slate-300 bg-white" /></div></div>
              <div><FieldLabel label="Landline 2" /><div className="flex gap-2"><input {...register("landline2Std")} placeholder="STD" className="w-20 border border-slate-200 rounded-lg py-2.5 px-3 text-sm outline-none focus:ring-2 focus:ring-[#B8873A]/20 focus:border-[#B8873A] hover:border-slate-300 bg-white" /><input {...register("landline2Number")} placeholder="Number" className="flex-1 border border-slate-200 rounded-lg py-2.5 px-3 text-sm outline-none focus:ring-2 focus:ring-[#B8873A]/20 focus:border-[#B8873A] hover:border-slate-300 bg-white" /></div></div>
              <div><FieldLabel label="Fax" /><div className="flex gap-2"><input {...register("faxStd")} placeholder="STD" className="w-20 border border-slate-200 rounded-lg py-2.5 px-3 text-sm outline-none focus:ring-2 focus:ring-[#B8873A]/20 focus:border-[#B8873A] hover:border-slate-300 bg-white" /><input {...register("faxNumber")} placeholder="Fax Number" className="flex-1 border border-slate-200 rounded-lg py-2.5 px-3 text-sm outline-none focus:ring-2 focus:ring-[#B8873A]/20 focus:border-[#B8873A] hover:border-slate-300 bg-white" /></div></div>
              <FormInput label="Skype ID" placeholder="skype.username" {...register("skypeId")} />
              <FormInput label="E-Mail (Personal)" type="email" placeholder="personal@email.com" error={errors.emailPersonal?.message} {...register("emailPersonal")} />
              <FormInput label="E-Mail (Business)" type="email" placeholder="work@company.com" error={errors.emailBusiness?.message} {...register("emailBusiness")} />
            </div>
          </div>
        </div>

        {/* Addresses */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2.5 px-5 py-3.5 bg-slate-50 border-b border-slate-200">
            <span className="text-[#B8873A]"><MapPin size={16} /></span>
            <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Addresses</h2>
          </div>
          <div className="p-5 space-y-5">
            {addrFields.map((field, idx) => (
              <div key={field.id} className="border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex-1"><FormSelect label="Address Type" {...register(`addresses.${idx}.addressType`)}>{ADDRESS_TYPES.map((t) => <option key={t}>{t}</option>)}</FormSelect></div>
                  <button type="button" onClick={() => removeAddr(idx)} className="mt-5 inline-flex items-center justify-center w-8 h-8 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors"><Trash2 size={14} /></button>
                </div>
                <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer"><input type="checkbox" {...register(`addresses.${idx}.useGroupAddress`)} className="rounded border-slate-300 text-[#B8873A]" /> Use Group Address</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <FormInput label="Address Line 1" placeholder="House / Flat No." {...register(`addresses.${idx}.addressLine1`)} />
                  <FormInput label="Address Line 2" placeholder="Street / Colony" {...register(`addresses.${idx}.addressLine2`)} />
                  <FormInput label="Address Line 3" placeholder="Area / Locality" {...register(`addresses.${idx}.addressLine3`)} />
                  <FormInput label="Address Line 4" placeholder="Landmark" {...register(`addresses.${idx}.addressLine4`)} />
                  <FormInput label="City" placeholder="City" {...register(`addresses.${idx}.city`)} />
                  <FormInput label="Pin Code" placeholder="400001" {...register(`addresses.${idx}.pin`)} />
                  <FormSelect label="Country" {...register(`addresses.${idx}.country`)}><option>India</option><option>Other</option></FormSelect>
                  <FormSelect label="State" {...register(`addresses.${idx}.state`)}><option value="">Select state</option>{INDIAN_STATES.map((s) => <option key={s}>{s}</option>)}</FormSelect>
                  <FormInput label="Area" placeholder="Zone / Area" {...register(`addresses.${idx}.area`)} />
                </div>
              </div>
            ))}
            <button type="button" onClick={() => appendAddr({ addressType: "Residence", country: "India", useGroupAddress: false, addressLine1: "", addressLine2: "", addressLine3: "", addressLine4: "", city: "", pin: "", state: "", area: "" })} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-[#B8873A] bg-[#B8873A]/10 hover:bg-[#E8C77A]/20 border border-slate-200 rounded-lg transition-colors">
              <Plus size={14} /> Add Address
            </button>
          </div>
        </div>

        {/* Bank Details */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2.5 px-5 py-3.5 bg-slate-50 border-b border-slate-200">
            <span className="text-[#B8873A]"><CreditCard size={16} /></span>
            <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Bank Details</h2>
          </div>
          <div className="p-5 space-y-4">
            {bankFields.length > 0 && (
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full text-sm">
                  <thead><tr className="bg-gradient-to-r from-[#0B1220] to-[#16294D] text-white"><th className="py-2.5 px-3 text-left font-semibold text-xs">Default</th><th className="py-2.5 px-3 text-left font-semibold text-xs">IFSC Code</th><th className="py-2.5 px-3 text-left font-semibold text-xs">Bank Name</th><th className="py-2.5 px-3 text-left font-semibold text-xs">Branch</th><th className="py-2.5 px-3 text-left font-semibold text-xs">City</th><th className="py-2.5 px-3 text-left font-semibold text-xs">A/C Type</th><th className="py-2.5 px-3 text-left font-semibold text-xs">A/C No.</th><th className="py-2.5 px-3 text-left font-semibold text-xs">MICR No.</th><th className="py-2.5 px-3"></th></tr></thead>
                  <tbody className="divide-y divide-slate-100">
                    {bankFields.map((field, idx) => (
                      <tr key={field.id} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                        <td className="py-2 px-3"><input type="checkbox" {...register(`bankDetails.${idx}.isDefault`)} className="rounded border-slate-300 text-[#B8873A]" /></td>
                        <td className="py-2 px-2"><input {...register(`bankDetails.${idx}.ifscCode`)} placeholder="SBIN0001234" className="w-28 border border-slate-200 rounded px-2 py-1.5 text-xs outline-none focus:border-[#B8873A] bg-white" /></td>
                        <td className="py-2 px-2"><input {...register(`bankDetails.${idx}.bankName`)} placeholder="Bank Name" className="w-32 border border-slate-200 rounded px-2 py-1.5 text-xs outline-none focus:border-[#B8873A] bg-white" /></td>
                        <td className="py-2 px-2"><input {...register(`bankDetails.${idx}.bankBranch`)} placeholder="Branch" className="w-28 border border-slate-200 rounded px-2 py-1.5 text-xs outline-none focus:border-[#B8873A] bg-white" /></td>
                        <td className="py-2 px-2"><input {...register(`bankDetails.${idx}.city`)} placeholder="City" className="w-24 border border-slate-200 rounded px-2 py-1.5 text-xs outline-none focus:border-[#B8873A] bg-white" /></td>
                        <td className="py-2 px-2"><select {...register(`bankDetails.${idx}.accountType`)} className="w-36 border border-slate-200 rounded px-2 py-1.5 text-xs outline-none focus:border-[#B8873A] bg-white"><option value="">Select</option>{ACCOUNT_TYPES.map((t) => <option key={t}>{t}</option>)}</select></td>
                        <td className="py-2 px-2"><input {...register(`bankDetails.${idx}.accountNumber`)} placeholder="Account No." className="w-32 border border-slate-200 rounded px-2 py-1.5 text-xs outline-none focus:border-[#B8873A] bg-white" /></td>
                        <td className="py-2 px-2"><input {...register(`bankDetails.${idx}.micrNumber`)} placeholder="MICR No." className="w-28 border border-slate-200 rounded px-2 py-1.5 text-xs outline-none focus:border-[#B8873A] bg-white" /></td>
                        <td className="py-2 px-2"><button type="button" onClick={() => removeBank(idx)} className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors"><Trash2 size={13} /></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <button type="button" onClick={() => appendBank({ isDefault: bankFields.length === 0, ifscCode: "", bankName: "", bankBranch: "", city: "", accountType: "", accountNumber: "", micrNumber: "" })} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-[#B8873A] bg-[#B8873A]/10 hover:bg-[#E8C77A]/20 border border-slate-200 rounded-lg transition-colors"><Plus size={14} /> Add Bank Account</button>
          </div>
        </div>

        {/* Miscellaneous */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2.5 px-5 py-3.5 bg-slate-50 border-b border-slate-200">
            <span className="text-[#B8873A]"><Info size={16} /></span>
            <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Miscellaneous Information</h2>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <FormSelect label="Relation to Group" {...register("relationToGroup")}><option value="">Select relation</option>{RELATIONS.map((r) => <option key={r}>{r}</option>)}</FormSelect>
              <FormInput label="D.O.B (Greetings)" type="date" {...register("dobForGreetings")} />
              <FormInput label="Referred By" placeholder="Name of referrer" {...register("referredBy")} />
              <div className="space-y-2"><FormInput label="Marriage Date" type="date" {...register("marriageDate")} /><label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer"><input type="checkbox" {...register("isMarried")} className="rounded border-slate-300 text-[#B8873A]" /> Is Married</label></div>
              <div className="space-y-2"><FormInput label="Demise Date" type="date" {...register("demiseDate")} /><label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer"><input type="checkbox" {...register("isDead")} className="rounded border-slate-300 text-[#B8873A]" /> Is Deceased</label></div>
              <FormInput label="Nationality" placeholder="Indian" {...register("nationality")} />
              <FormSelect label="Qualification" {...register("qualification")}>
                <option value="">Select qualification</option>
                {[
                  "Not Applicable",
                  "School",
                  "Diploma",
                  "Graduate",
                  "Post Graduate",
                  "Doctorate",
                  "Other",
                ].map((q) => (
                  <option key={q} value={q}>
                    {q}
                  </option>
                ))}
              </FormSelect>
              <FormInput label="Father Name" placeholder="Father's full name" {...register("fatherName")} />
              <FormInput label="Mother Name" placeholder="Mother's full name" {...register("motherName")} />
              <FormInput label="Spouse Name" placeholder="Spouse's full name" {...register("spouseName")} />
              <FormSelect label="Occupation Type" {...register("occupationType")}><option value="">Select</option>{OCCUPATION_TYPES.map((o) => <option key={o}>{o}</option>)}</FormSelect>
              <FormInput label="Occupation" placeholder="Occupation details" {...register("occupation")} />
              <FormInput label="Employer" placeholder="Employer name" {...register("employer")} />
              <FormInput label="Nature of Duties" placeholder="Nature of duties" {...register("natureOfDuties")} />
              <div><FieldLabel label="Height / Weight" /><div className="flex gap-2"><input {...register("heightFt")} placeholder="Ft" className="w-20 border border-slate-200 rounded-lg py-2.5 px-3 text-sm outline-none focus:ring-2 focus:ring-[#B8873A]/20 focus:border-[#B8873A] hover:border-slate-300 bg-white" /><input {...register("weightKg")} placeholder="Kg" className="w-20 border border-slate-200 rounded-lg py-2.5 px-3 text-sm outline-none focus:ring-2 focus:ring-[#B8873A]/20 focus:border-[#B8873A] hover:border-slate-300 bg-white" /></div></div>
              <div>
                <FieldLabel label="Income Slab" />
                <input
                  {...register("incomeSlab")}
                  placeholder="Type income slab (e.g., 5L-10L)"
                  className="w-full border border-slate-200 rounded-lg py-2.5 px-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all focus:ring-2 focus:ring-[#B8873A]/20 focus:border-[#B8873A] hover:border-slate-300 bg-white"
                />
              </div>
              <FormSelect label="Religion" {...register("religion")}><option value="">Select</option>{RELIGIONS.map((r) => <option key={r}>{r}</option>)}</FormSelect>
              <FormInput label="CRM Groups" placeholder="Group tag" {...register("crmGroups")} />
              <FormInput label="Passport No." placeholder="Passport number" {...register("passportNumber")} />
              <FormInput label="Passport Expiry" type="date" {...register("passportExpiryDate")} />
              <FormInput label="GST No." placeholder="GST number" {...register("gstNumber")} />
              <div className="sm:col-span-2 lg:col-span-3"><FormTextarea label="Special Note" placeholder="Any special notes..." {...register("specialNote")} /></div>
            </div>
          </div>
        </div>

        {/* Service Preferences */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2.5 px-5 py-3.5 bg-slate-50 border-b border-slate-200">
            <span className="text-[#B8873A]"><Settings size={16} /></span>
            <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Service Preferences</h2>
          </div>
          <div className="p-5 space-y-4">
            <FormSelect label="Preferred Communication Address" {...register("preferredCommAddress")}><option value="">Select preference</option>{ADDRESS_TYPES.map((t) => <option key={t}>{t}</option>)}</FormSelect>
            <div className="flex items-center gap-8">
              <label className="flex items-center gap-2.5 cursor-pointer"><input type="checkbox" {...register("smsMarketing")} className="w-4 h-4 rounded border-slate-300 text-[#B8873A]" /><div><p className="text-sm font-semibold text-slate-700">SMS Marketing</p><p className="text-xs text-slate-400">Allow SMS notifications</p></div></label>
              <label className="flex items-center gap-2.5 cursor-pointer"><input type="checkbox" {...register("emailMarketing")} className="w-4 h-4 rounded border-slate-300 text-[#B8873A]" /><div><p className="text-sm font-semibold text-slate-700">Email Marketing</p><p className="text-xs text-slate-400">Allow email notifications</p></div></label>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 py-2">
          <Link href="/dashboard/customers?tab=master" className="px-5 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-sm rounded-lg transition-colors">Cancel</Link>
          <button type="submit" disabled={isSubmitting} className="rounded-xl bg-[#0B1220] px-6 py-2.5 text-sm font-semibold text-white shadow-sm shadow-[#0B1220]/20 transition-all duration-200 hover:bg-[#16294D] disabled:opacity-60">{isSubmitting ? "Saving..." : "Save Changes"}</button>
        </div>
      </form>
    </div>
  );
}
