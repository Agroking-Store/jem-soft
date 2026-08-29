"use client";

import CustomerModuleNav from "@/features/customers/components/CustomerModuleNav";

import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { RootState, AppDispatch } from "@/store/store";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { createCustomer } from "@/features/customers/customerSlice";
import { Button } from "@/shared/components/ui/Button";
import { SearchableSelect, type SelectOption } from "@/features/customers/components/CustomerUi";
import {
  ArrowLeft,
  Hash,
  User,
  UserCog,
  Phone,
  Mail,
  Lock,
  Eye,
  EyeOff,
  MapPin,
  Building,
  Home,
  Wand2,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";

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
const schema = z.object({
  // Basic
  groupCode: z.string().min(1, "Group code is required"),
  groupName: z.string().min(2, "Group name must be at least 2 characters"),
  category: z.string().optional().or(z.literal("")),


  // Contact
  mobilePersonal: z.string().optional().or(z.literal("")),
  emailPersonal: z.string().email("Invalid email").optional().or(z.literal("")),
  mobileBusiness: z.string().optional().or(z.literal("")),
  emailBusiness: z.string().email("Invalid email").optional().or(z.literal("")),

  // Address preference
  prefCommAddress: z.string().optional().or(z.literal("")),

  // Residence
  resAddressLine1: z.string().optional().or(z.literal("")),
  resAddressLine2: z.string().optional().or(z.literal("")),
  resAddressLine3: z.string().optional().or(z.literal("")),
  resAddressLine4: z.string().optional().or(z.literal("")),
  resCity: z.string().optional().or(z.literal("")),
  resPin: z.string().optional().or(z.literal("")),
  resState: z.string().optional().or(z.literal("")),
  resCountry: z.string().optional().or(z.literal("")),
  resArea: z.string().optional().or(z.literal("")),

  // Office
  offAddressLine1: z.string().optional().or(z.literal("")),
  offAddressLine2: z.string().optional().or(z.literal("")),
  offAddressLine3: z.string().optional().or(z.literal("")),
  offAddressLine4: z.string().optional().or(z.literal("")),
  offCity: z.string().optional().or(z.literal("")),
  offPin: z.string().optional().or(z.literal("")),
  offState: z.string().optional().or(z.literal("")),
  offCountry: z.string().optional().or(z.literal("")),
  offArea: z.string().optional().or(z.literal("")),

  // Portal
  email: z.string().min(1, "Email is required").email("Invalid email"),
  phone: z.string().min(10, "Phone must be at least 10 digits").max(15),
  password: z.string().min(6, "Password must be at least 6 characters"),
}).superRefine((data, ctx) => {
  if (data.prefCommAddress === "Residence") {
    const hasAddressLine = !!(
      data.resAddressLine1?.trim() ||
      data.resAddressLine2?.trim() ||
      data.resAddressLine3?.trim() ||
      data.resAddressLine4?.trim()
    );
    if (!hasAddressLine) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "At least one Residence Address Line is required",
        path: ["resAddressLine1"],
      });
    }
    if (!data.resCity?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "City is required for Residence Address",
        path: ["resCity"],
      });
    }
    if (!data.resPin?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Pin Code is required for Residence Address",
        path: ["resPin"],
      });
    }
  } else if (data.prefCommAddress === "Office") {
    const hasAddressLine = !!(
      data.offAddressLine1?.trim() ||
      data.offAddressLine2?.trim() ||
      data.offAddressLine3?.trim() ||
      data.offAddressLine4?.trim()
    );
    if (!hasAddressLine) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "At least one Office Address Line is required",
        path: ["offAddressLine1"],
      });
    }
    if (!data.offCity?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "City is required for Office Address",
        path: ["offCity"],
      });
    }
    if (!data.offPin?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Pin Code is required for Office Address",
        path: ["offPin"],
      });
    }
  }
});

type FormValues = z.infer<typeof schema>;

interface CustomerCreatePageProps {
  isModal?: boolean;
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

// ─── Main Component ───────────────────────────────────────────────
export default function CustomerCreatePage({ isModal = false, onClose, onSaved }: CustomerCreatePageProps = {}) {
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const { isLoading: isSubmitting } = useSelector((s: RootState) => s.customers);

  const [showPassword, setShowPassword] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
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
  }, []);

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
    try {
      await dispatch(
        createCustomer({
          name: data.groupName,
          email: data.email,
          phone: data.phone,
          password: data.password,
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
        })
      ).unwrap();
      toast.success("Customer group created successfully!");
      if (isModal) onSaved?.();
      else router.push("/dashboard/customers");
    } catch (err: any) {
      toast.error(err || "Failed to create customer group");
    }
  };

  if (!isMounted || authLoading) {
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
          className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft size={16} />
        </button>
        <div>
          <nav className="flex items-center gap-1 text-xs text-slate-400 mb-0.5">
            <button type="button" onClick={() => (isModal ? onClose?.() : router.push("/dashboard/customers"))} className="hover:text-slate-600">Customer Group</button>
            <ChevronRight size={12} />
            <span className="text-slate-600 font-medium">New Group</span>
          </nav>
          <h1 className="text-xl font-bold text-slate-900">Add Customer Group</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">

        {/* ── Section 1: Basic Info ── */}
        <SectionCard title="Group Information" icon={<Hash size={16} />}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Group Code */}
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
          {/* Preferred Communication Address */}
          <div className="mb-5">
            <FieldLabel label="Preferred Communication Address" />
            <div className="flex gap-3">
              {["Residence", "Office"].map((opt) => (
                <label
                  key={opt}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium cursor-pointer transition-all ${watch("prefCommAddress") === opt
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


          {/* Residence */}
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

          {/* Office */}
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
              <FieldLabel label="Portal Password" required />
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                  <Lock size={14} />
                </span>
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Min. 6 characters"
                  {...register("password")}
                  className={`w-full border rounded-lg py-2.5 pl-9 pr-10 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all focus:ring-2 focus:ring-blue-500/15 focus:border-[#1877F2]
                    ${errors.password ? "border-red-300 bg-red-50/30" : "border-slate-200 hover:border-slate-300"}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>}
              <p className="text-xs text-slate-400 mt-1.5">
                Customer will use this email &amp; password to log in to the customer portal.
              </p>
            </div>
          </div>
        </SectionCard>

        {/* ── Submit ── */}
        <div className="flex items-center justify-end gap-3 py-2">
          <button
            type="button"
            onClick={() => (isModal ? onClose?.() : router.push("/dashboard/customers"))}
          className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
        >
          Cancel
        </button>
        <Button
          type="submit"
          isLoading={isSubmitting}
          variant="primary"
          className="w-auto px-6 py-2.5"
        >
          Create Customer Group
        </Button>
      </div>
      </form>
    </div >
  );
}
