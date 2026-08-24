"use client";

import CustomerModuleNav from "@/features/customers/components/CustomerModuleNav";

import React, { useEffect, useState, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray, Controller, FormProvider, useFormContext, useController } from "react-hook-form";
import { format } from "date-fns";
import DatePicker from "@/app/(dashboard)/dashboard/lic/policies/new/DatePicker";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { SearchableSelect, type SelectOption } from "@/features/customers/components/CustomerUi";
import type { RootState, AppDispatch } from "@/store/store";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { createCustomerMaster } from "@/features/customers/customerMasterSlice";
import { fetchCustomers } from "@/features/customers/customerSlice";
import {
  createFamilyHistory,
  type FamilyHistoryRecordItem,
} from "@/features/customers/familyHistorySlice";
import {
  createMedicalHistory,
  type MedicalHistoryRecordItem,
} from "@/features/customers/medicalHistorySlice";
import FamilyHistoryRecordsEditor from "@/features/customers/forms/FamilyHistoryRecordsEditor";
import MedicalHistoryInlineEditor from "@/features/customers/forms/MedicalHistoryInlineEditor";
import {
  ArrowLeft, User, Phone, MapPin, Building, CreditCard, Info,
  Settings, ChevronRight, Plus, Trash2, Star, Search, X,
  Heart, Activity,
} from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";

// ─── Constants ────────────────────────────────────────────────────
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
const INCOME_SLABS = [
  "Below 1L","1L-2.5L","2.5L-5L","5L-10L","10L-25L","25L-50L","50L-1Cr","Above 1Cr",
];
const OCCUPATION_TYPES = ["Salaried","Business","Professional","Agriculture","Retired","Homemaker","Student","Other"];
const RELATIONS = ["Self","Spouse","Son","Daughter","Father","Mother","Brother","Sister","Guardian","Other","Not Mapped"];
const ACCOUNT_TYPES = ["Saving", "Current"];

// ─── Schema ───────────────────────────────────────────────────────
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
  // Contact Info
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
  // Addresses (dynamic)
  addresses: z.array(addressSchema).default([]),
  // Bank Details (dynamic)
  bankDetails: z.array(bankDetailSchema).default([]),
  // Misc Info
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
  // Service Preferences
  preferredCommAddress: z.string().optional().or(z.literal("")),
  smsMarketing: z.boolean().default(true),
  emailMarketing: z.boolean().default(true),
});

type FormInputValues = z.input<typeof schema>;
type FormValues = z.output<typeof schema>;

// ─── Reusable UI Components ───────────────────────────────────────
function FieldLabel({ label, required }: { label: string; required?: boolean }) {
  return (
    <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
      {label}{required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  );
}

function FormInput({ label, error, required, icon, className: cls, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string; required?: boolean; icon?: React.ReactNode }) {
  return (
    <div>
      <FieldLabel label={label} required={required} />
      <div className="relative">
        {icon && <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">{icon}</span>}
        <input {...props} className={`w-full rounded-xl border bg-white py-2.75 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all focus:border-[#B8873A] focus:ring-2 focus:ring-[#B8873A]/15 ${error ? "border-rose-300 bg-rose-50/30" : "border-slate-200 hover:border-slate-300"} ${icon ? "pl-9 pr-3" : "px-3"} ${cls || ""}`} />
      </div>
      {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}
    </div>
  );
}

function optionChildrenToOptions(children: React.ReactNode): SelectOption[] {
  // React.Children.toArray flattens nested arrays (e.g. options produced by
  // .map()) and drops non-element nodes, so every <option> is processed.
  return React.Children.toArray(children).flatMap((child) => {
    if (!React.isValidElement(child)) return [];
    const option = child as React.ReactElement<{ value?: string; children?: React.ReactNode }>;
    const labelText = String(option.props?.children ?? option.props?.value ?? "");
    const valueText = String(option.props?.value ?? labelText);
    if (!valueText) return [];
    return [{ value: valueText, label: labelText }];
  });
}

function FormSelect({
  label, error, required, children, name,
}: {
  label: string; error?: string; required?: boolean; children?: React.ReactNode; name: string;
}) {
  const { control } = useFormContext();
  const { field } = useController({ name, control });
  return (
    <SearchableSelect
      label={label}
      required={required}
      error={error}
      options={optionChildrenToOptions(children)}
      value={String(field.value ?? "")}
      onChange={field.onChange}
      placeholder="Select..."
      searchPlaceholder={`Search ${label.toLowerCase()}...`}
    />
  );
}

function BankAccountTypeCell({ index }: { index: number }) {
  const { control } = useFormContext();
  const { field } = useController({ name: `bankDetails.${index}.accountType`, control });
  return (
    <SearchableSelect
      options={ACCOUNT_TYPES.map((t) => ({ value: t, label: t }))}
      value={String(field.value ?? "")}
      onChange={field.onChange}
      placeholder="Select"
      searchPlaceholder="Search account type..."
    />
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

function SectionCard({ title, icon, children, accent }: { title: string; icon: React.ReactNode; children: React.ReactNode; accent?: string }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.05)]">
      <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#B8873A] via-[#B8873A]/40 to-transparent" />
      <div className={`flex items-center gap-2.5 border-b border-slate-200 px-5 py-3.5 ${accent || "bg-slate-50"}`}>
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-[#0B1220]/5 text-[#B8873A]">{icon}</span>
        <h2 className="text-sm font-bold text-[#0B1220] uppercase tracking-wider">{title}</h2>
      </div>
      <div className="p-5 sm:p-6">{children}</div>
    </div>
  );
}

// Group Autocomplete
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
            <button type="button" onClick={() => { onChange(""); setQuery(""); }} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <X size={13} />
            </button>
          )}
        </div>
        <Link
          href="/dashboard/customers/new"
          target="_blank"
          className="inline-flex items-center justify-center w-10 h-10 rounded-lg border border-slate-200 bg-slate-50 text-[#0B1220] hover:bg-slate-100 transition-colors"
          title="Add new group"
        >
          <Plus size={16} />
        </Link>
      </div>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
      {open && filtered.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-50 max-h-52 overflow-y-auto">
          {filtered.map((g) => (
            <button
              key={g.id}
              type="button"
              onClick={() => { onChange(g.id); setQuery(""); setOpen(false); }}
              className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[#0B1220]/5 transition-colors text-left"
            >
              <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-600">{g.groupCode || "—"}</span>
              <span className="text-sm font-medium text-slate-800">{g.groupName || "—"}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function calcAgeFromDob(dob?: string | null): number | null {
  if (!dob) return null;
  try {
    const birth = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age >= 0 ? age : null;
  } catch {
    return null;
  }
}

interface CustomerMasterCreatePageProps {
  isModal?: boolean;
  onClose?: () => void;
  onSaved?: () => void;
  onOpenGroupCreate?: () => void;
  groupId?: string;
}

// ─── Main Component ───────────────────────────────────────────────
export default function CustomerMasterCreatePage({ isModal = false, onClose, onSaved, onOpenGroupCreate, groupId }: CustomerMasterCreatePageProps = {}) {
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const { customers: groups } = useSelector((s: RootState) => s.customers);
  const [isMounted, setIsMounted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState(groupId || "");

  const methods = useForm<FormInputValues, unknown, FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      isGroupHead: false, isMarried: false, isDead: false,
      smsMarketing: true, emailMarketing: true,
      nationality: "Indian",
      qualification: "" ,
      addresses: [{ addressType: "Residence", country: "India", useGroupAddress: false }],
      bankDetails: [{ isDefault: true, ifscCode: "", bankName: "", bankBranch: "", city: "", accountType: "", accountNumber: "", micrNumber: "" }],
    },
  });
  const { register, handleSubmit, control, setValue, watch, formState: { errors } } = methods;

  const { fields: bankFields, append: appendBank, remove: removeBank } = useFieldArray({ control, name: "bankDetails" });

  // Inline Family History + Medical History (first record) captured at create time.
  const [familyHistoryDate, setFamilyHistoryDate] = useState(() => new Date().toISOString().substring(0, 10));
  const [familyRecords, setFamilyRecords] = useState<FamilyHistoryRecordItem[]>([]);
  const [medicalRecord, setMedicalRecord] = useState<MedicalHistoryRecordItem>({
    medicalHistoryDate: new Date().toISOString().substring(0, 10),
    bloodGroup: "",
  });

  useEffect(() => {
    setIsMounted(true);
    dispatch(fetchCustomers());
    if (groupId) {
      setSelectedGroupId(groupId);
      setValue("groupId", groupId);
    }
  }, [dispatch, groupId, setValue]);

  useEffect(() => {
    if (isMounted && !authLoading && user) {
      if (user.role !== "ADMIN" && user.role !== "ADVISOR") {
        toast.error("You do not have permission.");
        if (isModal) onClose?.();
        else router.replace("/dashboard/customers");
      }
    }
  }, [isMounted, authLoading, user, router, isModal, onClose]);

  const onSubmit = async (data: FormValues) => {
    setIsSubmitting(true);
    try {
      const created = await dispatch(createCustomerMaster({
        groupId: data.groupId || undefined,
        salutation: data.salutation || undefined,
        firstName: data.firstName,
        middleName: data.middleName || undefined,
        lastName: data.lastName,
        gender: data.gender || undefined,
        dob: data.dob || undefined,
        isGroupHead: data.isGroupHead,
        customerType: data.customerType || undefined,
        panNumber: data.panNumber || undefined,
        aadhaarNumber: data.aadhaarNumber || undefined,
        guardianId: data.guardianId || undefined,
        salutationLetter: data.salutationLetter || undefined,
        contactInfo: {
          mobile1: data.mobile1 || undefined, mobile2: data.mobile2 || undefined,
          landline1Std: data.landline1Std || undefined, landline1Number: data.landline1Number || undefined,
          landline2Std: data.landline2Std || undefined, landline2Number: data.landline2Number || undefined,
          faxStd: data.faxStd || undefined, faxNumber: data.faxNumber || undefined,
          emailPersonal: data.emailPersonal || undefined, emailBusiness: data.emailBusiness || undefined,
          skypeId: data.skypeId || undefined,
        },
        addresses: data.addresses.map((a) => ({ ...a, country: a.country || "India" })),
        bankDetails: data.bankDetails.map((b) => ({ ...b })),
        miscInfo: {
          relationToGroup: data.relationToGroup || undefined, dobForGreetings: data.dobForGreetings || undefined,
          marriageDate: data.marriageDate || undefined, isMarried: data.isMarried,
          demiseDate: data.demiseDate || undefined, isDead: data.isDead,
          fatherName: data.fatherName || undefined, motherName: data.motherName || undefined,
          spouseName: data.spouseName || undefined, nationality: data.nationality || "Indian",
          qualification: data.qualification || undefined,
          occupationType: data.occupationType || undefined, occupation: data.occupation || undefined,
          employer: data.employer || undefined, natureOfDuties: data.natureOfDuties || undefined,
          referredBy: data.referredBy || undefined, heightFt: data.heightFt || undefined,
          weightKg: data.weightKg || undefined, incomeSlab: data.incomeSlab || undefined,
          religion: data.religion || undefined, crmGroups: data.crmGroups || undefined,
          passportNumber: data.passportNumber || undefined, passportExpiryDate: data.passportExpiryDate || undefined,
          gstNumber: data.gstNumber || undefined, specialNote: data.specialNote || undefined,
        },
        preferences: {
          preferredCommAddress: data.preferredCommAddress || undefined,
          smsMarketing: data.smsMarketing, emailMarketing: data.emailMarketing,
        },
      })).unwrap();

      const memberId = (created as { id?: string })?.id;
      if (!memberId) throw new Error("Created member id was not returned by the server.");

      let secondaryFailed = false;

      // Family History — skip entirely if no relative rows were filled in.
      if (familyRecords.length > 0) {
        try {
          await dispatch(createFamilyHistory({
            groupId: data.groupId || undefined,
            memberId,
            date: new Date(familyHistoryDate).toISOString(),
            records: familyRecords,
          })).unwrap();
        } catch (err: any) {
          secondaryFailed = true;
          toast.error(err || "Failed to save family history");
        }
      }

      // Medical History — skip if required fields (bloodGroup + date) are empty.
      if (medicalRecord.bloodGroup && medicalRecord.medicalHistoryDate) {
        try {
          await dispatch(createMedicalHistory({
            memberId,
            date: new Date(medicalRecord.medicalHistoryDate).toISOString(),
            records: [{
              ...medicalRecord,
              age: calcAgeFromDob(data.dob),
              gender: data.gender || null,
              medicalHistoryDate: new Date(medicalRecord.medicalHistoryDate).toISOString(),
            }],
          })).unwrap();
        } catch (err: any) {
          secondaryFailed = true;
          toast.error(err || "Failed to save medical history");
        }
      }

      if (secondaryFailed) {
        toast("Customer was created, but family/medical history failed to save. You can retry those from the Member Details page.", { icon: "⚠️" });
      } else {
        toast.success("Customer created successfully!");
      }

      if (isModal) onSaved?.();
      else router.push("/dashboard/customers?tab=master");
    } catch (err: any) {
      toast.error(err || "Failed to create customer");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isMounted || authLoading) {
    return <div className="flex items-center justify-center min-h-[60vh]"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0B1220]" /></div>;
  }
  if (user?.role !== "ADMIN" && user?.role !== "ADVISOR") return null;

  return (
    <div className={`mx-auto space-y-6 pb-8 ${isModal ? "max-w-5xl" : "max-w-7xl"}`}>
      {!isModal && <CustomerModuleNav />}

      {/* Header */}
      {!isModal && (
        <div className="flex items-center gap-4">
          <Link href="/dashboard/customers?tab=master" className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition-colors">
            <ArrowLeft size={16} />
          </Link>
          <div>
            <nav className="flex items-center gap-1 text-xs text-slate-400 mb-0.5">
              <Link href="/dashboard/customers?tab=master" className="hover:text-slate-600">Customer Master</Link>
              <ChevronRight size={12} />
              <span className="text-slate-600 font-medium">New Customer</span>
            </nav>
            <h1 className="text-xl font-bold text-slate-900">Add Customer</h1>
          </div>
        </div>
      )}

      <FormProvider {...methods}>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">

        {/* ── Section 1: Personal Details ── */}
        <SectionCard title="Personal Details" icon={<User size={16} />}>
          <div className="space-y-4">
            {/* Group autocomplete */}
            <GroupAutoComplete
              value={selectedGroupId}
              onChange={(id) => { setSelectedGroupId(id); setValue("groupId", id); }}
              groups={groups.map((g) => ({ id: g.id, groupCode: g.groupCode, groupName: g.groupName }))}
              error={errors.groupId?.message}
            />

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <FormSelect label="Salutation" {...register("salutation")}>
                <option value="">—</option>
                {SALUTATIONS.map((s) => <option key={s}>{s}</option>)}
              </FormSelect>
              <FormInput label="First Name" required placeholder="First name" error={errors.firstName?.message} {...register("firstName")} />
              <FormInput label="Middle Name" placeholder="Middle name" {...register("middleName")} />
              <FormInput label="Last Name" required placeholder="Last name" error={errors.lastName?.message} {...register("lastName")} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <FormSelect label="Gender" required {...register("gender")} error={errors.gender?.message}>
                <option value="">Select gender</option>
                {GENDERS.map((g) => <option key={g}>{g}</option>)}
              </FormSelect>
              <div>
                <FieldLabel label="Date of Birth" required />
                <Controller
                  control={control}
                  name="dob"
                  render={({ field }) => (
                    <DatePicker
                      value={field.value ? new Date(field.value) : undefined}
                      onChange={(date) => field.onChange(date ? format(date, "yyyy-MM-dd") : "")}
                    />
                  )}
                />
                {errors.dob && <p className="mt-1 text-xs text-rose-600">{errors.dob.message}</p>}
              </div>
              <FormSelect label="Customer Type" {...register("customerType")}>
                <option value="">Select type</option>
                {CUSTOMER_TYPES.map((t) => <option key={t}>{t}</option>)}
              </FormSelect>
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
              {watch("isGroupHead") && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-[#B8873A]/10 text-[#B8873A]">
                  <Star size={11} /> Group Head
                </span>
              )}
            </div>
          </div>
        </SectionCard>

        {/* ── Section 2: Contact Information ── */}
        <SectionCard title="Contact Information" icon={<Phone size={16} />}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormInput label="Mobile 1" type="tel" placeholder="9876543210" {...register("mobile1")} />
            <FormInput label="Mobile 2" type="tel" placeholder="9876543211" {...register("mobile2")} />
            <div>
              <FieldLabel label="Landline 1" />
              <div className="flex gap-2">
                <input {...register("landline1Std")} placeholder="STD" className="w-20 border border-slate-200 rounded-lg py-2.5 px-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-[#B8873A]/20 focus:border-[#B8873A] hover:border-slate-300 transition-all bg-white" />
                <input {...register("landline1Number")} placeholder="Number" className="flex-1 border border-slate-200 rounded-lg py-2.5 px-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-[#B8873A]/20 focus:border-[#B8873A] hover:border-slate-300 transition-all bg-white" />
              </div>
            </div>
            <div>
              <FieldLabel label="Landline 2" />
              <div className="flex gap-2">
                <input {...register("landline2Std")} placeholder="STD" className="w-20 border border-slate-200 rounded-lg py-2.5 px-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-[#B8873A]/20 focus:border-[#B8873A] hover:border-slate-300 transition-all bg-white" />
                <input {...register("landline2Number")} placeholder="Number" className="flex-1 border border-slate-200 rounded-lg py-2.5 px-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-[#B8873A]/20 focus:border-[#B8873A] hover:border-slate-300 transition-all bg-white" />
              </div>
            </div>
            <div>
              <FieldLabel label="Fax" />
              <div className="flex gap-2">
                <input {...register("faxStd")} placeholder="STD" className="w-20 border border-slate-200 rounded-lg py-2.5 px-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-[#B8873A]/20 focus:border-[#B8873A] hover:border-slate-300 transition-all bg-white" />
                <input {...register("faxNumber")} placeholder="Fax Number" className="flex-1 border border-slate-200 rounded-lg py-2.5 px-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-[#B8873A]/20 focus:border-[#B8873A] hover:border-slate-300 transition-all bg-white" />
              </div>
            </div>
            <FormInput label="Skype ID" placeholder="skype.username" {...register("skypeId")} />
            <FormInput label="E-Mail (Personal)" type="email" placeholder="personal@email.com" error={errors.emailPersonal?.message} {...register("emailPersonal")} />
            <FormInput label="E-Mail (Business)" type="email" placeholder="work@company.com" error={errors.emailBusiness?.message} {...register("emailBusiness")} />
          </div>
        </SectionCard>

        {/* ── Section 3: Address ── */}
        <SectionCard title="Address" icon={<MapPin size={16} />}>
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
              <input type="checkbox" {...register(`addresses.0.useGroupAddress`)} className="rounded border-slate-300 text-[#B8873A]" />
              Use Group Address
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormInput label="Address Line 1" placeholder="House / Flat No." {...register(`addresses.0.addressLine1`)} />
              <FormInput label="Address Line 2" placeholder="Street / Colony" {...register(`addresses.0.addressLine2`)} />
              <FormInput label="Address Line 3" placeholder="Area / Locality" {...register(`addresses.0.addressLine3`)} />
              <FormInput label="Address Line 4" placeholder="Landmark" {...register(`addresses.0.addressLine4`)} />
              <FormInput label="City" placeholder="City" {...register(`addresses.0.city`)} />
              <FormInput label="Pin Code" placeholder="400001" {...register(`addresses.0.pin`)} />
              <FormSelect label="Country" {...register(`addresses.0.country`)}>
                <option>India</option><option>Other</option>
              </FormSelect>
              <FormSelect label="State" {...register(`addresses.0.state`)}>
                <option value="">Select state</option>
                {INDIAN_STATES.map((s) => <option key={s}>{s}</option>)}
              </FormSelect>
              <FormInput label="Area" placeholder="Zone / Area" {...register(`addresses.0.area`)} />
            </div>
          </div>
        </SectionCard>

        {/* ── Section 4: Bank Details ── */}
        <SectionCard title="Bank Details" icon={<CreditCard size={16} />}>
          <div className="space-y-3">
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-[#0B1220] text-white">
                      <th className="py-2.5 px-3 text-left font-semibold text-xs">Default</th>
                      <th className="py-2.5 px-3 text-left font-semibold text-xs">IFSC Code</th>
                      <th className="py-2.5 px-3 text-left font-semibold text-xs">Bank Name</th>
                      <th className="py-2.5 px-3 text-left font-semibold text-xs">Branch</th>
                      <th className="py-2.5 px-3 text-left font-semibold text-xs">City</th>
                      <th className="py-2.5 px-3 text-left font-semibold text-xs">A/C Type</th>
                      <th className="py-2.5 px-3 text-left font-semibold text-xs">A/C No.</th>
                      <th className="py-2.5 px-3 text-left font-semibold text-xs">MICR No.</th>
                      <th className="py-2.5 px-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {bankFields.map((field, idx) => (
                      <tr key={field.id} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                        <td className="py-2 px-3">
                          <input type="checkbox" {...register(`bankDetails.${idx}.isDefault`)} className="rounded border-slate-300 accent-[#0B1220]" />
                        </td>
                        <td className="py-2 px-2"><input {...register(`bankDetails.${idx}.ifscCode`)} placeholder="SBIN0001234" className="w-28 border border-slate-200 rounded px-2 py-1.5 text-xs outline-none focus:border-[#B8873A] bg-white" /></td>
                        <td className="py-2 px-2"><input {...register(`bankDetails.${idx}.bankName`)} placeholder="Bank Name" className="w-32 border border-slate-200 rounded px-2 py-1.5 text-xs outline-none focus:border-[#B8873A] bg-white" /></td>
                        <td className="py-2 px-2"><input {...register(`bankDetails.${idx}.bankBranch`)} placeholder="Branch" className="w-28 border border-slate-200 rounded px-2 py-1.5 text-xs outline-none focus:border-[#B8873A] bg-white" /></td>
                        <td className="py-2 px-2"><input {...register(`bankDetails.${idx}.city`)} placeholder="City" className="w-24 border border-slate-200 rounded px-2 py-1.5 text-xs outline-none focus:border-[#B8873A] bg-white" /></td>
                        <td className="py-2 px-2">
                          <BankAccountTypeCell index={idx} />
                        </td>
                        <td className="py-2 px-2"><input {...register(`bankDetails.${idx}.accountNumber`)} placeholder="Account No." className="w-32 border border-slate-200 rounded px-2 py-1.5 text-xs outline-none focus:border-[#B8873A] bg-white" /></td>
                        <td className="py-2 px-2"><input {...register(`bankDetails.${idx}.micrNumber`)} placeholder="MICR No." className="w-28 border border-slate-200 rounded px-2 py-1.5 text-xs outline-none focus:border-[#B8873A] bg-white" /></td>
                        <td className="py-2 px-2">
                          <button type="button" onClick={() => removeBank(idx)} className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors">
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            <button type="button"
              onClick={() => appendBank({ isDefault: bankFields.length === 0, ifscCode: "", bankName: "", bankBranch: "", city: "", accountType: "", accountNumber: "", micrNumber: "" })}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#B8873A] hover:text-[#0B1220] transition-colors"
            >
              <Plus size={13} /> Add another bank account
            </button>
          </div>
        </SectionCard>

        {/* ── Section: Family History ── */}
        <SectionCard title="Family History" icon={<Heart size={16} />}>
          <FamilyHistoryRecordsEditor
            familyHistoryDate={familyHistoryDate}
            onFamilyHistoryDateChange={setFamilyHistoryDate}
            records={familyRecords}
            onChange={setFamilyRecords}
            dob={watch("dob")}
          />
        </SectionCard>

        {/* ── Section: Medical History (Initial Examination) ── */}
        <SectionCard title="Medical History (Initial Examination)" icon={<Activity size={16} />}>
          <MedicalHistoryInlineEditor
            record={medicalRecord}
            onChange={setMedicalRecord}
            derivedAge={calcAgeFromDob(watch("dob"))}
            derivedGender={watch("gender") || null}
          />
          <p className="mt-4 text-xs text-slate-400">
            This captures the member's first medical record. After saving, use the Member Details page to view the full log or add additional past checkups.
          </p>
        </SectionCard>

        {/* ── Section 5: Miscellaneous Info ── */}
        <SectionCard title="Miscellaneous Information" icon={<Info size={16} />}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <FormSelect label="Relation to Group" {...register("relationToGroup")}>
              <option value="">Select relation</option>
              {RELATIONS.map((r) => <option key={r}>{r}</option>)}
            </FormSelect>
            <div>
              <FieldLabel label="D.O.B (Greetings)" />
              <Controller
                control={control}
                name="dobForGreetings"
                render={({ field }) => (
                  <DatePicker
                    value={field.value ? new Date(field.value) : undefined}
                    onChange={(date) => field.onChange(date ? format(date, "yyyy-MM-dd") : "")}
                  />
                )}
              />
            </div>
            <FormInput label="Referred By" placeholder="Name of referrer" {...register("referredBy")} />
            <div className="space-y-2">
              <div>
                <FieldLabel label="Marriage Date" />
                <Controller
                  control={control}
                  name="marriageDate"
                  render={({ field }) => (
                    <DatePicker
                      value={field.value ? new Date(field.value) : undefined}
                      onChange={(date) => field.onChange(date ? format(date, "yyyy-MM-dd") : "")}
                    />
                  )}
                />
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer mt-1">
                <input type="checkbox" {...register("isMarried")} className="rounded border-slate-300 text-[#B8873A]" />
                Is Married
              </label>
            </div>
            <div className="space-y-2">
              <div>
                <FieldLabel label="Demise Date" />
                <Controller
                  control={control}
                  name="demiseDate"
                  render={({ field }) => (
                    <DatePicker
                      value={field.value ? new Date(field.value) : undefined}
                      onChange={(date) => field.onChange(date ? format(date, "yyyy-MM-dd") : "")}
                    />
                  )}
                />
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer mt-1">
                <input type="checkbox" {...register("isDead")} className="rounded border-slate-300 text-[#B8873A]" />
                Is Deceased
              </label>
            </div>
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
            <FormSelect label="Occupation Type" {...register("occupationType")}>
              <option value="">Select</option>
              {OCCUPATION_TYPES.map((o) => <option key={o}>{o}</option>)}
            </FormSelect>
            <FormInput label="Occupation" placeholder="Occupation details" {...register("occupation")} />
            <FormInput label="Employer" placeholder="Employer name" {...register("employer")} />
            <FormInput label="Nature of Duties" placeholder="Nature of duties" {...register("natureOfDuties")} />
            <div>
              <FieldLabel label="Height / Weight" />
              <div className="flex gap-2">
                <input {...register("heightFt")} placeholder="Ft" className="w-20 border border-slate-200 rounded-lg py-2.5 px-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-[#B8873A]/20 focus:border-[#B8873A] hover:border-slate-300 bg-white" />
                <input {...register("weightKg")} placeholder="Kg" className="w-20 border border-slate-200 rounded-lg py-2.5 px-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-[#B8873A]/20 focus:border-[#B8873A] hover:border-slate-300 bg-white" />
              </div>
            </div>
            <div>
              <FieldLabel label="Income Slab" />
              <input
                {...register("incomeSlab")}
                placeholder="Type income slab (e.g., 5L-10L)"
                className="w-full border border-slate-200 rounded-lg py-2.5 px-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all focus:ring-2 focus:ring-[#B8873A]/20 focus:border-[#B8873A] hover:border-slate-300 bg-white"
              />
            </div>
            <FormSelect label="Religion" {...register("religion")}>
              <option value="">Select</option>
              {RELIGIONS.map((r) => <option key={r}>{r}</option>)}
            </FormSelect>
            <FormInput label="Passport No." placeholder="Passport number" {...register("passportNumber")} />
            <div>
              <FieldLabel label="Passport Expiry" />
              <Controller
                control={control}
                name="passportExpiryDate"
                render={({ field }) => (
                  <DatePicker
                    value={field.value ? new Date(field.value) : undefined}
                    onChange={(date) => field.onChange(date ? format(date, "yyyy-MM-dd") : "")}
                  />
                )}
              />
            </div>
            <FormInput label="GST No." placeholder="GST number" {...register("gstNumber")} />
            <div className="sm:col-span-2 lg:col-span-3">
              <FormTextarea label="Special Note" placeholder="Any special notes about this customer..." {...register("specialNote")} />
            </div>
          </div>
        </SectionCard>

        {/* ── Section 6: Service Preferences ── */}
        <SectionCard title="Service Preferences" icon={<Settings size={16} />}>
          <div className="space-y-4">
            <div className="flex items-center gap-8">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input type="checkbox" {...register("smsMarketing")} className="w-4 h-4 rounded border-slate-300 text-[#B8873A]" />
                <div>
                  <p className="text-sm font-semibold text-slate-700">SMS Marketing</p>
                  <p className="text-xs text-slate-400">Allow SMS notifications</p>
                </div>
              </label>
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input type="checkbox" {...register("emailMarketing")} className="w-4 h-4 rounded border-slate-300 text-[#B8873A]" />
                <div>
                  <p className="text-sm font-semibold text-slate-700">Email Marketing</p>
                  <p className="text-xs text-slate-400">Allow email notifications</p>
                </div>
              </label>
            </div>
          </div>
        </SectionCard>

        {/* ── Submit ── */}
        <div className="flex items-center justify-end gap-3 py-2">
          {isModal ? (
            <button type="button" onClick={onClose} className="px-5 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-sm rounded-lg transition-colors">
              Cancel
            </button>
          ) : (
            <Link href="/dashboard/customers?tab=master" className="px-5 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-sm rounded-lg transition-colors">
              Cancel
            </Link>
          )}
          <button type="submit" disabled={isSubmitting}
            className="rounded-xl bg-[#0B1220] px-6 py-2.5 text-sm font-semibold text-white shadow-sm shadow-[#0B1220]/20 transition-all duration-200 hover:bg-[#16294D] disabled:opacity-60">
            {isSubmitting ? "Saving..." : "Save Customer"}
          </button>
        </div>
      </form>
      </FormProvider>
    </div>
  );
}