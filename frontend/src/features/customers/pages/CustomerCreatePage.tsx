"use client";

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
});

type FormValues = z.infer<typeof schema>;

// ─── Reusable field components ────────────────────────────────────
function FieldLabel({ label, required }: { label: string; required?: boolean }) {
  return (
    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
      {label}
      {required && <span className="text-red-500 ml-0.5">*</span>}
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
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
            {icon}
          </span>
        )}
        <input
          {...props}
          className={`w-full border rounded-lg py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all cursor-pointer
            focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500
            ${error ? "border-red-300 bg-red-50/30" : "border-slate-200 bg-white hover:border-slate-300"}
            ${icon ? "pl-9 pr-3" : "px-3"}`}
        />
      </div>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}

function FormSelect({
  label,
  error,
  required,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  error?: string;
  required?: boolean;
}) {
  return (
    <div>
      <FieldLabel label={label} required={required} />
      <select
        {...props}
        className={`w-full border rounded-lg py-2.5 px-3 text-sm text-slate-900 outline-none transition-all bg-white cursor-pointer
          focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500
          ${error ? "border-red-300 bg-red-50/30" : "border-slate-200 hover:border-slate-300"}`}
      >
        {children}
      </select>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
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
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="flex items-center gap-2.5 px-5 py-3.5 bg-slate-50 border-b border-slate-200">
        <span className="text-blue-500">{icon}</span>
        <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────
export default function CustomerCreatePage() {
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
        router.replace("/dashboard/customers");
      }
    }
  }, [isMounted, authLoading, user, router]);

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
      router.push("/dashboard/customers");
    } catch (err: any) {
      toast.error(err || "Failed to create customer group");
    }
  };

  if (!isMounted || authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (user?.role !== "ADMIN" && user?.role !== "ADVISOR") return null;

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/customers"
          className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft size={16} />
        </Link>
        <div>
          <nav className="flex items-center gap-1 text-xs text-slate-400 mb-0.5">
            <Link href="/dashboard/customers" className="hover:text-slate-600">Customer Group</Link>
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
                className={`w-full border rounded-lg py-2.5 px-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all cursor-pointer focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500
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
              {...register("category")}
              error={errors.category?.message}
            >
              <option value="">Select category</option>
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </FormSelect>
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
                    ? "border-blue-500 bg-blue-50 text-blue-700"
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
                <FormInput label="Address Line 1" placeholder="House / Flat No." {...register("resAddressLine1")} />
                <FormInput label="Address Line 2" placeholder="Street / Colony" {...register("resAddressLine2")} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <FormInput label="Address Line 3" placeholder="Area / Locality" {...register("resAddressLine3")} />
                <FormInput label="Address Line 4" placeholder="Landmark" {...register("resAddressLine4")} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <FormInput label="City" placeholder="City" {...register("resCity")} />
                <FormInput label="Pin Code" placeholder="400001" {...register("resPin")} />
              </div>

              <div className="grid grid-cols-2 gap-3">

                <FormSelect label="State" {...register("resState")}>
                  <option value="">Select state</option>
                  {INDIAN_STATES.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </FormSelect>

                <FormSelect label="Country" {...register("resCountry")}>
                  <option>India</option>
                  <option>Other</option>
                </FormSelect>



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
                <FormInput label="Address Line 1" placeholder="Office / Building No." {...register("offAddressLine1")} />
                <FormInput label="Address Line 2" placeholder="Street / Road" {...register("offAddressLine2")} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <FormInput label="Address Line 3" placeholder="Area / Locality" {...register("offAddressLine3")} />
                <FormInput label="Address Line 4" placeholder="Landmark" {...register("offAddressLine4")} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <FormInput label="City" placeholder="City" {...register("offCity")} />
                <FormInput label="Pin Code" placeholder="400001" {...register("offPin")} />
              </div>


              <div className="grid grid-cols-2 gap-3">
                <FormSelect label="State" {...register("offState")}>
                  <option value="">Select state</option>
                  {INDIAN_STATES.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </FormSelect>


                <FormSelect label="Country" {...register("offCountry")}>
                  <option>India</option>
                  <option>Other</option>
                </FormSelect>

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
                  className={`w-full border rounded-lg py-2.5 pl-9 pr-10 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500
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
          <Link
            href="/dashboard/customers"
            className="px-5 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-sm rounded-lg transition-colors"
          >
            Cancel
          </Link>
          <Button
            type="submit"
            isLoading={isSubmitting}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-sm shadow-sm transition-all duration-200 w-auto"
          >
            Create Customer Group
          </Button>
        </div>
      </form>
    </div >
  );
}
