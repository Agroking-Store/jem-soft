"use client";

import CustomerModuleNav from "@/features/customers/components/CustomerModuleNav";

import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useDispatch, useSelector } from "react-redux";
import { useRouter, useParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { RootState, AppDispatch } from "@/store/store";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { fetchCustomer, updateCustomer } from "@/features/customers/customerSlice";
import {
  ArrowLeft,
  Hash,
  User,
  Phone,
  Mail,
  Lock,
  Eye,
  EyeOff,
  MapPin,
  Building,
  Home,
  ChevronRight,
  Search,
  X,
  Plus,
} from "lucide-react";
import toast from "react-hot-toast";
import { SearchableSelect, type SelectOption } from "@/features/customers/components/CustomerUi";

// ─── Constants ────────────────────────────────────────────────────
const CATEGORIES = ["Client", "Personal", "Prospect", "Others"];

const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat",
  "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra",
  "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim",
  "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry",
];

// ─── Schema ───────────────────────────────────────────────────────
// Same shape as CustomerCreatePage's schema (Customer Group entity fields)
// except password is optional here — leaving it blank on Edit means
// "keep the existing password unchanged".
const schema = z.object({
  groupCode: z.string().min(1, "Group code is required"),
  groupName: z.string().min(2, "Group name must be at least 2 characters"),
  category: z.string().optional().or(z.literal("")),

  mobilePersonal: z.string().optional().or(z.literal("")),
  emailPersonal: z.string().email("Invalid email").optional().or(z.literal("")),
  mobileBusiness: z.string().optional().or(z.literal("")),
  emailBusiness: z.string().email("Invalid email").optional().or(z.literal("")),

  prefCommAddress: z.string().optional().or(z.literal("")),

  resAddressLine1: z.string().optional().or(z.literal("")),
  resAddressLine2: z.string().optional().or(z.literal("")),
  resAddressLine3: z.string().optional().or(z.literal("")),
  resAddressLine4: z.string().optional().or(z.literal("")),
  resCity: z.string().optional().or(z.literal("")),
  resPin: z.string().optional().or(z.literal("")),
  resState: z.string().optional().or(z.literal("")),
  resCountry: z.string().optional().or(z.literal("")),
  resArea: z.string().optional().or(z.literal("")),

  offAddressLine1: z.string().optional().or(z.literal("")),
  offAddressLine2: z.string().optional().or(z.literal("")),
  offAddressLine3: z.string().optional().or(z.literal("")),
  offAddressLine4: z.string().optional().or(z.literal("")),
  offCity: z.string().optional().or(z.literal("")),
  offPin: z.string().optional().or(z.literal("")),
  offState: z.string().optional().or(z.literal("")),
  offCountry: z.string().optional().or(z.literal("")),
  offArea: z.string().optional().or(z.literal("")),

  email: z.string().min(1, "Email is required").email("Invalid email"),
  phone: z.string().min(10, "Phone must be at least 10 digits").max(15),
  // Optional on edit — blank means "don't change the password".
  password: z
    .string()
    .optional()
    .or(z.literal(""))
    .refine((val) => !val || val.length >= 6, { message: "Password must be at least 6 characters" }),
}).superRefine((data, ctx) => {
  if (data.prefCommAddress === "Residence") {
    const hasAddressLine = !!(
      data.resAddressLine1?.trim() ||
      data.resAddressLine2?.trim() ||
      data.resAddressLine3?.trim() ||
      data.resAddressLine4?.trim()
    );
    if (!hasAddressLine) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "At least one Residence Address Line is required", path: ["resAddressLine1"] });
    }
    if (!data.resCity?.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "City is required for Residence Address", path: ["resCity"] });
    }
    if (!data.resPin?.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Pin Code is required for Residence Address", path: ["resPin"] });
    }
  } else if (data.prefCommAddress === "Office") {
    const hasAddressLine = !!(
      data.offAddressLine1?.trim() ||
      data.offAddressLine2?.trim() ||
      data.offAddressLine3?.trim() ||
      data.offAddressLine4?.trim()
    );
    if (!hasAddressLine) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "At least one Office Address Line is required", path: ["offAddressLine1"] });
    }
    if (!data.offCity?.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "City is required for Office Address", path: ["offCity"] });
    }
    if (!data.offPin?.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Pin Code is required for Office Address", path: ["offPin"] });
    }
  }
});

type FormValues = z.infer<typeof schema>;

interface CustomerEditPageProps {
  isModal?: boolean;
  customerId?: string;
  onClose?: () => void;
  onSaved?: () => void;
}

// ─── Reusable field components ────────────────────────────────────
function FieldLabel({ label, required }: { label: string; required?: boolean }) {
  return (
    <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
      {label}
      {required && <span className="ml-0.5 text-rose-500">*</span>}
    </label>
  );
}

function FormInput({
  label,
  error,
  required,
  icon,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
  required?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <div>
      <FieldLabel label={label} required={required} />
      <div className="relative">
        {icon && (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            {icon}
          </span>
        )}
        <input
          {...props}
          className={`w-full rounded-xl border bg-white py-2.75 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all cursor-pointer
            focus:border-[#1877F2] focus:ring-2 focus:ring-blue-500/15
            ${error ? "border-rose-300 bg-rose-50/30" : "border-slate-200 hover:border-slate-300"}
            ${icon ? "pl-9 pr-3" : "px-3"}`}
        />
      </div>
      {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}
    </div>
  );
}

function FormSelect({
  label,
  error,
  required,
  options,
  value,
  onChange,
  placeholder = "Select...",
}: {
  label: string;
  error?: string;
  required?: boolean;
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <SearchableSelect
      label={label}
      required={required}
      error={error}
      options={options}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      searchPlaceholder={`Search ${label.toLowerCase()}...`}
    />
  );
}

function SectionCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.05)]">
      <div className="flex items-center gap-2.5 border-b border-slate-200 bg-slate-50 px-5 py-3.5">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#1877F2]">{icon}</span>
        <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider">{title}</h2>
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
            className={`w-full border rounded-lg py-2.5 pl-9 pr-8 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all cursor-pointer bg-white focus:ring-2 focus:ring-blue-500/15 focus:border-[#1877F2]
              ${error ? "border-red-300 bg-red-50/30" : "border-slate-200 hover:border-slate-300"}`}
          />
          {selected && (
            <button type="button" onClick={() => { onChange(""); setQuery(""); }} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"><X size={13} /></button>
          )}
        </div>
        <Link href="/dashboard/customers/new" target="_blank" className="inline-flex items-center justify-center w-10 h-10 rounded-lg border border-slate-200 bg-blue-50 text-[#1877F2] hover:bg-blue-50 transition-colors" title="Add new group">
          <Plus size={16} />
        </Link>
      </div>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
      {open && filtered.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-50 max-h-52 overflow-y-auto">
          {filtered.map((g) => (
            <button key={g.id} type="button" onClick={() => { onChange(g.id); setQuery(""); setOpen(false); }} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-blue-50 transition-colors text-left">
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

interface CustomerMasterEditPageProps {
  isModal?: boolean;
  customerId?: string;
  onClose?: () => void;
  onSaved?: () => void;
  onOpenModal?: (type: any, id?: string, extraId?: string) => void;
}

export default function CustomerMasterEditPage({ isModal = false, customerId, onClose, onSaved, onOpenModal }: CustomerMasterEditPageProps = {}) {
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  const params = useParams();
  const id = customerId ?? (params?.id as string);

  const { user, isLoading: authLoading } = useAuth();
  const { currentCustomer, isLoading: isSubmitting } = useSelector((s: RootState) => s.customers);

  const [showPassword, setShowPassword] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      groupCode: "",
      groupName: "",
      category: "",
      mobilePersonal: "",
      emailPersonal: "",
      mobileBusiness: "",
      emailBusiness: "",
      prefCommAddress: "Residence",
      resCountry: "India",
      offCountry: "India",
      email: "",
      phone: "",
      password: "",
    },
  });

  const preferredAddress = watch("prefCommAddress");

  useEffect(() => {
    setIsMounted(true);
    if (id) dispatch(fetchCustomer(id));
  }, [dispatch, id]);

  useEffect(() => {
    if (isMounted && !authLoading && user) {
      if (user.role !== "ADMIN" && user.role !== "ADVISOR") {
        toast.error("You do not have permission.");
        if (isModal) onClose?.();
        else router.replace("/dashboard/customers");
      }
    }
  }, [isMounted, authLoading, user, router, isModal, onClose]);

  // Only populate once the fetched record actually matches the id this
  // page/modal was opened for — avoids showing empty/stale data if a
  // previous customer's data is still in the store when this mounts.
  useEffect(() => {
    if (currentCustomer && isMounted && currentCustomer.id === id) {
      const c = currentCustomer;
      reset({
        groupCode: c.groupCode || "",
        groupName: c.groupName || c.name || "",
        category: c.category || "",
        mobilePersonal: c.mobilePersonal || "",
        emailPersonal: c.emailPersonal || "",
        mobileBusiness: c.mobileBusiness || "",
        emailBusiness: c.emailBusiness || "",
        prefCommAddress: c.prefCommAddress || "Residence",
        resAddressLine1: c.resAddressLine1 || "",
        resAddressLine2: c.resAddressLine2 || "",
        resAddressLine3: c.resAddressLine3 || "",
        resAddressLine4: c.resAddressLine4 || "",
        resCity: c.resCity || "",
        resPin: c.resPin || "",
        resState: c.resState || "",
        resCountry: c.resCountry || "India",
        resArea: c.resArea || "",
        offAddressLine1: c.offAddressLine1 || "",
        offAddressLine2: c.offAddressLine2 || "",
        offAddressLine3: c.offAddressLine3 || "",
        offAddressLine4: c.offAddressLine4 || "",
        offCity: c.offCity || "",
        offPin: c.offPin || "",
        offState: c.offState || "",
        offCountry: c.offCountry || "India",
        offArea: c.offArea || "",
        email: c.email || "",
        phone: c.phone || "",
        password: "",
      });
    }
  }, [currentCustomer, isMounted, id, reset]);

  const onSubmit = async (data: FormValues) => {
    try {
      await dispatch(
        updateCustomer({
          id,
          payload: {
            name: data.groupName,
            email: data.email,
            phone: data.phone,
            // Only send password if the user actually typed a new one.
            password: data.password ? data.password : undefined,
            groupCode: data.groupCode || undefined,
            groupName: data.groupName,
            category: data.category || undefined,

            mobilePersonal: data.mobilePersonal || undefined,
            emailPersonal: data.emailPersonal || undefined,
            mobileBusiness: data.mobileBusiness || undefined,
            emailBusiness: data.emailBusiness || undefined,
            prefCommAddress: data.prefCommAddress || undefined,
            resAddressLine1: data.resAddressLine1 || undefined,
            resAddressLine2: data.resAddressLine2 || undefined,
            resAddressLine3: data.resAddressLine3 || undefined,
            resAddressLine4: data.resAddressLine4 || undefined,
            resCity: data.resCity || undefined,
            resPin: data.resPin || undefined,
            resState: data.resState || undefined,
            resCountry: data.resCountry || "India",
            resArea: data.resArea || undefined,
            offAddressLine1: data.offAddressLine1 || undefined,
            offAddressLine2: data.offAddressLine2 || undefined,
            offAddressLine3: data.offAddressLine3 || undefined,
            offAddressLine4: data.offAddressLine4 || undefined,
            offCity: data.offCity || undefined,
            offPin: data.offPin || undefined,
            offState: data.offState || undefined,
            offCountry: data.offCountry || "India",
            offArea: data.offArea || undefined,
          },
        })
      ).unwrap();
      toast.success("Customer group updated successfully!");
      if (isModal) onSaved?.();
      else router.push("/dashboard/customers");
    } catch (err: any) {
      toast.error(err || "Failed to update customer group");
    }
  };

  // Keep the spinner up until the fetched group's id actually matches the
  // one this page was opened for (this is the exact check that was missing
  // before, and it's what let a mismatched fetch — like a Customer Master
  // lookup being run for a Group id — surface as a blank/broken form
  // instead of a clear loading state).
  const customerReady = !id || currentCustomer?.id === id;
  if (!isMounted || authLoading || !customerReady) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1877F2]" />
      </div>
    );
  }

  if (user?.role !== "ADMIN" && user?.role !== "ADVISOR") return null;

  return (
    <div className={`mx-auto space-y-6 pb-8 ${isModal ? "max-w-5xl" : "max-w-7xl"}`}>
      {!isModal && <CustomerModuleNav />}

      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => (isModal ? onClose?.() : router.push("/dashboard/customers"))}
          className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition-colors cursor-pointer"
        >
          <ArrowLeft size={16} />
        </button>
        <div>
          <nav className="flex items-center gap-1 text-xs text-slate-400 mb-0.5">
            <button type="button" onClick={() => (isModal ? onClose?.() : router.push("/dashboard/customers"))} className="hover:text-slate-600 cursor-pointer">Customer Group</button>
            <ChevronRight size={12} />
            <span className="text-slate-600 font-medium">Edit Group</span>
          </nav>
          <h1 className="text-xl font-bold text-slate-900">Edit Customer Group</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">

        {/* ── Section 1: Basic Info ── */}
        <SectionCard title="Group Information" icon={<Hash size={16} />}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <FieldLabel label="Group Code" required />
              <input
                {...register("groupCode")}
                placeholder="e.g. A001"
                className={`w-full border rounded-lg py-2.5 px-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all cursor-pointer focus:ring-2 focus:ring-blue-500/15 focus:border-[#1877F2]
                  ${errors.groupCode ? "border-red-300 bg-red-50/30" : "border-slate-200 hover:border-slate-300"}`}
              />
              {errors.groupCode && <p className="text-xs text-red-500 mt-1">{errors.groupCode.message}</p>}
            </div>

            <FormInput
              label="Group Name"
              required
              placeholder="e.g. Jayant Shinde"
              icon={<User size={14} />}
              error={errors.groupName?.message}
              {...register("groupName")}
            />

            <FormSelect
              label="Category"
              value={watch("category") || ""}
              onChange={(value) => setValue("category", value, { shouldValidate: true })}
              error={errors.category?.message}
              placeholder="Select category"
              options={CATEGORIES.map((c) => ({ value: c, label: c }))}
            />
          </div>
        </SectionCard>

        {/* ── Section 2: Contact Info ── */}
        <SectionCard title="Contact Information" icon={<Phone size={16} />}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormInput
              label="Mobile (Personal)"
              type="tel"
              placeholder="e.g. 9876543210"
              icon={<Phone size={14} />}
              {...register("mobilePersonal")}
            />
            <FormInput
              label="E-Mail (Personal)"
              type="email"
              placeholder="e.g. personal@email.com"
              icon={<Mail size={14} />}
              {...register("emailPersonal")}
            />
            <FormInput
              label="Mobile (Business)"
              type="tel"
              placeholder="e.g. 9876543211"
              icon={<Phone size={14} />}
              {...register("mobileBusiness")}
            />
            <FormInput
              label="E-Mail (Business)"
              type="email"
              placeholder="e.g. work@company.com"
              icon={<Mail size={14} />}
              {...register("emailBusiness")}
            />
          </div>
        </SectionCard>

        {/* ── Section 3: Addresses ── */}
        <SectionCard title="Addresses" icon={<MapPin size={16} />}>
          <div className="mb-5">
            <FieldLabel label="Preferred Communication Address" />
            <div className="flex gap-3">
              {["Residence", "Office"].map((opt) => (
                <label
                  key={opt}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium cursor-pointer transition-all ${preferredAddress === opt
                    ? "border-[#1877F2] bg-blue-50 text-[#1877F2]"
                    : "border-slate-200 text-slate-600 hover:border-slate-300"
                    }`}
                >
                  <input
                    type="radio"
                    value={opt}
                    {...register("prefCommAddress")}
                    className="sr-only"
                  />
                  {opt === "Residence" ? <Home size={14} /> : <Building size={14} />}
                  {opt}
                </label>
              ))}
            </div>
          </div>

          {preferredAddress === "Residence" && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <Home size={14} className="text-slate-400" />
                <h3 className="text-sm font-bold text-slate-700">Residence</h3>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <FormInput label="Address Line 1" required placeholder="House / Flat No." error={errors.resAddressLine1?.message} {...register("resAddressLine1")} />
                <FormInput label="Address Line 2" placeholder="Street / Colony" error={errors.resAddressLine2?.message} {...register("resAddressLine2")} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <FormInput label="Address Line 3" placeholder="Area / Locality" error={errors.resAddressLine3?.message} {...register("resAddressLine3")} />
                <FormInput label="Address Line 4" placeholder="Landmark" error={errors.resAddressLine4?.message} {...register("resAddressLine4")} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <FormInput label="City" required placeholder="City" error={errors.resCity?.message} {...register("resCity")} />
                <FormInput label="Pin Code" required placeholder="400001" error={errors.resPin?.message} {...register("resPin")} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <FormSelect
                  label="State"
                  value={watch("resState") || ""}
                  onChange={(value) => setValue("resState", value, { shouldValidate: true })}
                  placeholder="Select state"
                  options={INDIAN_STATES.map((s) => ({ value: s, label: s }))}
                />
                <FormSelect
                  label="Country"
                  value={watch("resCountry") || ""}
                  onChange={(value) => setValue("resCountry", value, { shouldValidate: true })}
                  options={["India", "Other"].map((c) => ({ value: c, label: c }))}
                />
              </div>
            </div>
          )}

          {preferredAddress === "Office" && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <Building size={14} className="text-slate-400" />
                <h3 className="text-sm font-bold text-slate-700">Office</h3>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <FormInput label="Address Line 1" required placeholder="Office / Building No." error={errors.offAddressLine1?.message} {...register("offAddressLine1")} />
                <FormInput label="Address Line 2" placeholder="Street / Road" error={errors.offAddressLine2?.message} {...register("offAddressLine2")} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <FormInput label="Address Line 3" placeholder="Area / Locality" error={errors.offAddressLine3?.message} {...register("offAddressLine3")} />
                <FormInput label="Address Line 4" placeholder="Landmark" error={errors.offAddressLine4?.message} {...register("offAddressLine4")} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <FormInput label="City" required placeholder="City" error={errors.offCity?.message} {...register("offCity")} />
                <FormInput label="Pin Code" required placeholder="400001" error={errors.offPin?.message} {...register("offPin")} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <FormSelect
                  label="State"
                  value={watch("offState") || ""}
                  onChange={(value) => setValue("offState", value, { shouldValidate: true })}
                  placeholder="Select state"
                  options={INDIAN_STATES.map((s) => ({ value: s, label: s }))}
                />
                <FormSelect
                  label="Country"
                  value={watch("offCountry") || ""}
                  onChange={(value) => setValue("offCountry", value, { shouldValidate: true })}
                  options={["India", "Other"].map((c) => ({ value: c, label: c }))}
                />
              </div>
            </div>
          )}
        </SectionCard>

        {/* ── Section 4: Portal Access ── */}
        <SectionCard title="Portal Access" icon={<Lock size={16} />}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormInput
              label="Portal Email"
              required
              type="email"
              placeholder="e.g. user@example.com"
              icon={<Mail size={14} />}
              error={errors.email?.message}
              {...register("email")}
            />
            <FormInput
              label="Phone Number"
              required
              type="tel"
              placeholder="e.g. 9876543210"
              icon={<Phone size={14} />}
              error={errors.phone?.message}
              {...register("phone")}
            />
            <div className="sm:col-span-2">
              <FieldLabel label="Portal Password" />
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                  <Lock size={14} />
                </span>
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Leave blank to keep current password"
                  {...register("password")}
                  className={`w-full border rounded-lg py-2.5 pl-9 pr-10 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all focus:ring-2 focus:ring-blue-500/15 focus:border-[#1877F2]
                    ${errors.password ? "border-red-300 bg-red-50/30" : "border-slate-200 hover:border-slate-300"}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>}
              <p className="text-xs text-slate-400 mt-1.5">
                Leave this blank to keep the customer&apos;s existing portal password unchanged.
              </p>
            </div>
          </div>
        </SectionCard>

        {/* ── Submit ── */}
        <div className="flex items-center justify-end gap-3 py-2">
          <button
            type="button"
            onClick={() => (isModal ? onClose?.() : router.push("/dashboard/customers"))}
            className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-xl bg-gradient-to-r from-[#5c67ff] to-[#3a47ff] px-6 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-200 transition-all hover:brightness-110 disabled:opacity-60"
          >
            {isSubmitting ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
}