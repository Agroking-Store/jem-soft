"use client";

import { useState, useEffect, useRef, useMemo, useCallback, FC } from "react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useDispatch, useSelector } from "react-redux";
import type { RootState, AppDispatch } from "@/store/store";
import { fetchCustomers } from "@/features/customers/customerSlice";
import { fetchCustomersMaster } from "@/features/customers/customerMasterSlice";
import { fetchInsuranceProviders } from "@/features/insurance/insuranceProviderSlice";
import { fetchRiders } from "@/features/riders/riderMasterSlice";
import { fetchProducts } from "@/features/insurance/productMasterSlice";
import { fetchAdvisors } from "@/features/advisor/advisorSlice";
import { createPolicy } from "@/features/policy/policySlice";
import { fetchPolicyStatuses } from "@/features/policy/policyStatusMasterSlice";
import { fetchPremiumModes } from "@/features/policy/premiumModeMasterSlice";
import { fetchLicBranches } from "@/features/lic/licBranchSlice";
import { fetchAgencies } from "@/features/agency/agencySlice";

import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeft,
  Save,
  X,
  User,
  DollarSign,
  FileText,
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  Shield,
  Settings,
  Search,
} from "lucide-react";
import toast from "react-hot-toast";
import DatePicker from "./DatePicker";
import { format } from "date-fns";

function getFullName(customer: {
  salutation?: string | null;
  firstName: string;
  middleName?: string | null;
  lastName?: string | null;
}) {
  return [customer.salutation, customer.firstName, customer.middleName, customer.lastName].filter(Boolean).join(" ");
}

// A reusable component for selecting a customer group with search functionality.
const GroupAutoComplete = ({ value, onChange, groups }: { value: string; onChange: (id: string) => void; groups: { id: string; groupCode?: string | null; groupName?: string | null }[] }) => {
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
      <label className="block text-sm font-medium text-slate-700 mb-1">
        Group Name <span className="text-red-500">*</span>
      </label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"><Search size={16} /></span>
        <input
          value={selected ? `${selected.groupCode ? `[${selected.groupCode}] ` : ""}${selected.groupName || ""}` : query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); if (!e.target.value) onChange(""); }}
          onFocus={() => setOpen(true)}
          placeholder="Search group by name or code..."
          className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm pl-9"
        />
        {selected && (
          <button type="button" onClick={() => { onChange(""); setQuery(""); }} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
            <X size={13} />
          </button>
        )}
      </div>
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
};

const AdvisorAutoComplete = ({ value, onChange, advisors, disabled, placeholder }: { value: string; onChange: (id: string) => void; advisors: { id: string; advisorCode: string; advisorName: string }[], disabled?: boolean, placeholder?: string }) => {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = advisors.find((a) => a.id === value);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = advisors.filter((a) => {
    const q = query.toLowerCase();
    return (a.advisorName.toLowerCase().includes(q) || a.advisorCode.toLowerCase().includes(q));
  }).slice(0, 10);

  return (
    <div ref={ref} className="relative">
      <label className="block text-sm font-medium text-slate-700 mb-1">Advisor</label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"><Search size={16} /></span>
        <input
          value={selected ? `[${selected.advisorCode}] ${selected.advisorName}` : query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); if (!e.target.value) onChange(""); }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder || "Search advisor by name or code..."}
          disabled={disabled}
          className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm pl-9 disabled:bg-slate-50 disabled:cursor-not-allowed"
        />
        {selected && (<button type="button" onClick={() => { onChange(""); setQuery(""); }} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"><X size={13} /></button>)}
      </div>
      {open && filtered.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-50 max-h-52 overflow-y-auto">
          {filtered.map((a) => (<button key={a.id} type="button" onClick={() => { onChange(a.id); setQuery(""); setOpen(false); }} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-blue-50 transition-colors text-left"><span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-600">{a.advisorCode}</span><span className="text-sm font-medium text-slate-800">{a.advisorName}</span></button>))}
        </div>
      )}
    </div>
  );
};

const riderSchema = z.object({
  description: z.string().min(1, "Description is required"),

  sum: z.preprocess(
    (val) => (val === "" ? null : val),
    z.coerce.number().positive("Must be positive").nullable()
  ),

  term: z.preprocess(
    (val) => (val === "" ? null : val),
    z.coerce.number().int().positive("Must be positive").nullable()
  ),

  ppt: z.preprocess(
    (val) => (val === "" ? null : val),
    z.coerce.number().int().positive("Must be positive").nullable()
  ),

  premium: z.preprocess(
    (val) => (val === "" ? null : val),
    z.coerce.number().positive("Must be positive").nullable()
  ),
});

const nomineeSchema = z.object({
  nomineeName: z.string().min(1, "Nominee name is required"),
  relationship: z.string().min(1, "Relationship is required"),
  dateOfBirth: z.string().optional(),
  percentage: z.preprocess(
    (val) => (val === "" ? null : val),
    z.coerce.number().positive("Must be positive").max(100, "Cannot exceed 100").nullable()
  ),
  phone: z.string().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
});

const policySchema = z.object({
  groupId: z.string().min(1, "Group is required"),
  groupCode: z.string().optional(),
  lifeAssuredId: z.string().min(1, "Life Assured is required"),
  dob: z.string().optional(),
  age: z.string().optional(),
  gender: z.string().optional(),
  pan: z.string().optional(),

  providerType: z.string().min(1, "Provider type is required"),
  providerId: z.string().min(1, "Provider is required"),
  policyNumber: z.string().regex(/^\d{9}$/, "Policy number must be exactly 9 digits."),
  productId: z.string().min(1, "Plan is required"),
  mode: z.string().min(1, "Mode is required"),
  commencementDate: z.string().min(1, "Commencement date is required."),
  completionDate: z.string().min(1, "Completion date is required."),
  term: z.preprocess((val) => (val === "" ? undefined : val), z.coerce.number().int().positive().optional()),
  ppt: z.preprocess((val) => (val === "" ? undefined : val), z.coerce.number().int().positive().optional()),
  extraClass: z.string().optional(),
  ratePercent: z.preprocess((val) => (val === "" ? undefined : val), z.coerce.number().positive().optional()),

  sumAssured: z.preprocess((val) => (val === "" ? undefined : val), z.coerce.number().positive().optional()),
  basicYearlyPremium: z.preprocess((val) => (val === "" ? undefined : val), z.coerce.number().positive().optional()),
  totalYearlyPremium: z.preprocess((val) => (val === "" ? undefined : val), z.coerce.number().positive().optional()),
  totalRiderPremium: z.preprocess((val) => (val === "" ? undefined : val), z.coerce.number().positive().optional()),
  installmentPremium: z.preprocess((val) => (val === "" ? undefined : val), z.coerce.number().positive().optional()),
  gst: z.preprocess((val) => (val === "" ? undefined : val), z.coerce.number().positive().optional()),
  totalInstallmentPremium: z.preprocess((val) => (val === "" ? undefined : val), z.coerce.number().positive().optional()),

  riders: z.array(riderSchema).optional(),
  nominees: z.array(nomineeSchema).optional(),

  advisorId: z.string().optional(),
  agencyId: z.string().optional(),
  branchId: z.string().optional(),
  agentCode: z.string().optional(),
  fupDate: z.string().optional(),
  fuliDate: z.string().optional(),
});

type PolicyFormValues = z.infer<typeof policySchema>;

export default function NewLICPolicyPage() {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { user, isLoading: authLoading } = useAuth();

  const { register, handleSubmit, control, watch, setValue, formState: { errors } } = useForm<PolicyFormValues>({
     resolver: zodResolver(policySchema),
    defaultValues: {
      riders: [],
      nominees: [],
    },
  });

  const { customers: groups, isLoading: groupsLoading } = useSelector((s: RootState) => s.customers);
  const { customers: masterCustomers, isLoading: masterLoading } = useSelector((s: RootState) => s.customerMaster);
  const { providers, isLoading: providersLoading } = useSelector((s: RootState) => s.insuranceProviders);
  const { products, isLoading: productsLoading } = useSelector((s: RootState) => s.products);
  const { riders, isLoading: ridersLoading } = useSelector((s: RootState) => s.riderMaster);
  const { advisors, isLoading: advisorsLoading } = useSelector((s: RootState) => s.advisors);
  const { statuses, isLoading: statusesLoading } = useSelector((s: RootState) => s.policyStatuses);
  const { modes, isLoading: modesLoading } = useSelector((s: RootState) => s.premiumModes);
  const { branches, isLoading: branchesLoading } = useSelector((s: RootState) => s.licBranch);
  const { agencies, isLoading: agenciesLoading } = useSelector((s: RootState) => s.agency);

  const [activeSection, setActiveSection] = useState("policy-holder");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [glowingSection, setGlowingSection] = useState<string | null>(null);

  useEffect(() => {
    dispatch(fetchCustomers());
    dispatch(fetchCustomersMaster());
    dispatch(fetchInsuranceProviders());
    dispatch(fetchProducts());
    dispatch(fetchRiders());
    dispatch(fetchAdvisors());
    dispatch(fetchPolicyStatuses());
    dispatch(fetchPremiumModes());
    dispatch(fetchLicBranches());
    dispatch(fetchAgencies());
    setIsMounted(true);
  }, [dispatch]);

  useEffect(() => {
    if (isMounted && !authLoading && user) {
      if (user.role !== "ADMIN" && user.role !== "ADVISOR") {
        toast.error("You do not have permission to create a policy.");
        router.replace("/dashboard/lic/policies");
      }
    }
  }, [isMounted, authLoading, user, router]);

  const canCreate = user?.role === "ADMIN" || user?.role === "ADVISOR";


  const sectionRefs = {
    'policy-holder': useRef<HTMLDivElement>(null),
    'policy-details': useRef<HTMLDivElement>(null),
    'premium-calculation': useRef<HTMLDivElement>(null),
    'riders': useRef<HTMLDivElement>(null),
    'advanced': useRef<HTMLDivElement>(null),
  };

  const { fields: riderFields, append: appendRider, remove: removeRider } = useFieldArray({
    control,
    name: "riders",
  });

  const { fields: nomineeFields, append: appendNominee, remove: removeNominee } = useFieldArray({
    control,
    name: "nominees",
  });

  const watchGroupId = watch("groupId");
  const watchLifeAssuredId = watch("lifeAssuredId");
  const watchProviderType = watch("providerType");
  const watchProviderId = watch("providerId");
  const watchAdvisorId = watch("advisorId");
  const watchBasicYearlyPremium = watch("basicYearlyPremium");
  const watchBranchId = watch("branchId");
  const watchAgencyId = watch("agencyId");
  const watchTotalRiderPremium = watch("totalRiderPremium");


  const selectedGroup = useMemo(() => groups.find(g => g.id === watchGroupId), [watchGroupId, groups]);

  const groupMembers = useMemo(() => {
    if (!watchGroupId) return [];
    return masterCustomers.filter(m => m.groupId === watchGroupId);
  }, [watchGroupId, masterCustomers]);

  useEffect(() => {
    setValue("groupCode", selectedGroup?.groupCode || "");
    setValue("lifeAssuredId", "");
  }, [watchGroupId, selectedGroup, setValue]);

  useEffect(() => {
    const member = masterCustomers.find(m => m.id === watchLifeAssuredId);
    setValue("dob", member?.dob ? new Date(member.dob).toISOString().split('T')[0] : "");
    setValue("age", member?.dob ? String(new Date().getFullYear() - new Date(member.dob).getFullYear()) : "");
    setValue("gender", member?.gender || "");
    setValue("pan", member?.panNumber || "");
  }, [watchLifeAssuredId, masterCustomers, setValue]);

  const providerTypes = useMemo(() => {
    return [...new Set(providers.map(p => p.type))];
  }, [providers]);

  const filteredProviders = useMemo(() => {
    if (!watchProviderType) return [];
    return providers.filter(p => p.type === watchProviderType);
  }, [watchProviderType, providers]);

  const filteredProducts = useMemo(() => {
  if (!watchProviderId) return [];

  return products
    .filter((p) => p.providerId === watchProviderId)
    .sort((a, b) =>
      (a.planNumber ?? "").localeCompare(b.planNumber ?? "")
    );
}, [watchProviderId, products]);

  const filteredAdvisors = useMemo(() => {
    if (!watchAgencyId) return [];
    return advisors.filter(a => a.agencyId === watchAgencyId);
  }, [watchAgencyId, advisors]);

  useEffect(() => {
    setValue("providerId", "");
  }, [watchProviderType, setValue]);

  useEffect(() => {
    const agency = agencies.find(a => a.id === watchAgencyId);
    setValue("branchId", agency?.branchId || "");
    setValue("advisorId", ""); // Reset advisor when agency changes
  }, [watchAgencyId, agencies, setValue]);

  useEffect(() => {
    const advisor = advisors.find(a => a.id === watchAdvisorId);
    setValue("agentCode", advisor?.advisorCode || "");
  }, [watchAdvisorId, advisors, setValue]);

  useEffect(() => {
    const basic = parseFloat(String(watchBasicYearlyPremium)) || 0;
    const rider = parseFloat(String(watchTotalRiderPremium)) || 0;
    const total = basic + rider;
    // Use setValue to update the form value; using a string to avoid potential issues with number formatting
    setValue("totalYearlyPremium", total > 0 ? String(total) : "");
  }, [watchBasicYearlyPremium, watchTotalRiderPremium, setValue]);

  const onSubmit = async (data: PolicyFormValues) => {
    setIsSubmitting(true);
    try {
      const result = await dispatch(createPolicy(data)).unwrap();
      toast.success("Policy created successfully!");
      router.push("/dashboard/lic/policies");
    } catch (err: any) {
      toast.error(err.message || "Failed to create policy. Please check the details.");
      console.error("Failed to create policy:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const states = ["Maharashtra", "Gujarat", "Rajasthan", "Uttar Pradesh", "Delhi", "Karnataka"];

  const sections = [
    { id: "policy-holder", label: "Policy Holder's Details" },
    { id: "policy-details", label: "Policy Details" },
    { id: "premium-calculation", label: "Policy Premium Calculation" },
    { id: "riders", label: "Riders Details" },
    { id: "advanced", label: "Advanced Options" },
  ];

  const handleSectionClick = useCallback((sectionId: keyof typeof sectionRefs) => {
    const ref = sectionRefs[sectionId];
    if (ref.current) {
      // We add an offset to account for the sticky header if you have one.
      const yOffset = -80; 
      const y = ref.current.getBoundingClientRect().top + window.pageYOffset + yOffset;

      window.scrollTo({ top: y, behavior: 'smooth' });
      
      setActiveSection(sectionId);
      setGlowingSection(sectionId);
      // Remove the glow after 1.5 seconds
      setTimeout(() => setGlowingSection(null), 1500);
    }
  }, [sectionRefs]);

  if (!isMounted || authLoading || !canCreate) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" /></div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto pb-20">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/dashboard/lic/policies")}
            className="p-2 hover:bg-slate-100 rounded-lg transition"
          >
            <ChevronLeft size={20} className="text-slate-600" />
          </button>
          <div>
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Link href="/dashboard/lic/policies" className="hover:text-blue-600">
                Policies
              </Link>
              <ChevronRight size={16} />
              <span className="font-medium text-slate-700">New Policy Entry</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mt-1">Create a New LIC Policy</h1>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/dashboard/lic/policies")} className="px-4 py-2 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition text-sm">
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit(onSubmit)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm flex items-center gap-2">
            <Save size={16} />
            Save Policy
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border border-slate-200 rounded-xl p-1 mb-6 overflow-x-auto flex">
        {sections.map((section) => (
          <button
            type="button"
            key={section.id}
            onClick={() => handleSectionClick(section.id as keyof typeof sectionRefs)}
            className={`
              px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition
              ${activeSection === section.id
                ? "bg-blue-50 text-blue-700"
                : "text-slate-600 hover:bg-slate-50"
              }
            `}
          >
            {section.label}
          </button>
        ))}
      </div>

      {/* Form Content - Grid Layout */}
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
        {/* Section 1: Policy Holder's Details */}
        <div
          ref={sectionRefs['policy-holder']}
          className={`bg-white border border-slate-200 rounded-xl p-6 transition-all duration-500 ${
            glowingSection === 'policy-holder' ? 'shadow-lg shadow-blue-500/20' : ''
          }`}
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <User size={20} className="text-blue-600" />
              Policy Holder's Details
            </h2>
            <Link
              href="/dashboard/customers/new"
              target="_blank"
              className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              <Plus size={16} />
              Add New Group
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <Controller
                name="groupId"
                control={control}
                render={({ field }) => (
                  <GroupAutoComplete value={field.value} onChange={field.onChange} groups={groups} />
                )}
              />
              {errors.groupId && <p className="text-xs text-red-500 mt-1">{errors.groupId.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Group Code
              </label>
              <input
                type="text"
                value={selectedGroup?.groupCode || ""}
                placeholder="Auto-filled"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm bg-slate-50" readOnly
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Life Assured
              </label>
              <select
                {...register("lifeAssuredId")}
                disabled={!watchGroupId || groupMembers.length === 0}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm disabled:bg-slate-50 disabled:cursor-not-allowed"
              >
                <option value="">
                  {watchGroupId ? (groupMembers.length > 0 ? "Select a member" : "No members in group") : "Select a group first"}
                </option>
                {groupMembers.map(member => (
                  <option key={member.id} value={member.id}>{getFullName(member)}</option>
                ))}
              </select>
              {errors.lifeAssuredId && <p className="text-xs text-red-500 mt-1">{errors.lifeAssuredId.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Date of Birth
              </label>
              <input
                {...register("dob")}
                type="date"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm bg-slate-50"
                readOnly
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Age
              </label>
              <input
                {...register("age")}
                type="number"
                placeholder="Age"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm bg-slate-50"
                readOnly
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Gender
              </label>
              <select {...register("gender")} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm bg-slate-50" disabled>
                <option value="">Select Gender</option>
                <option value={watch("gender")} disabled>{watch("gender")}</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                PAN Regi.
              </label>
              <input
                {...register("pan")}
                type="text"
                placeholder="Enter PAN number"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm bg-slate-50"
                readOnly
              />
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column */} 
          <div className="lg:col-span-2 space-y-6">
            {/* Section 2: Policy Details */}
            <div
              ref={sectionRefs['policy-details']}
              className={`bg-white border border-slate-200 rounded-xl p-6 transition-all duration-500 ${
                glowingSection === 'policy-details' ? 'shadow-lg shadow-blue-500/20' : ''
              }`}
            >
              <h2 className="text-lg font-semibold text-slate-900 mb-6 flex items-center gap-2">
                <FileText size={20} className="text-blue-600" />
                Policy Details
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Provider Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    {...register("providerType")}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                  >
                    <option value="">Select Provider Type</option>
                    {providerTypes.map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                  {errors.providerType && <p className="text-xs text-red-500 mt-1">{errors.providerType.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Provider Name <span className="text-red-500">*</span>
                  </label>
                  <select
                    {...register("providerId")}
                    disabled={!watchProviderType}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm disabled:bg-slate-50"
                  >
                    <option value="">Select Provider</option>
                    {filteredProviders.map((provider) => (
                      <option key={provider.id} value={provider.id}>{provider.name}</option>
                    ))}
                  </select>
                  {errors.providerId && <p className="text-xs text-red-500 mt-1">{errors.providerId.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Policy Number <span className="text-red-500">*</span>
                  </label> 
                  <input
                    type="text"
                    {...register("policyNumber")}
                    placeholder="Enter policy number"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                  />
                  {errors.policyNumber && <p className="text-xs text-red-500 mt-1">{errors.policyNumber.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Plan <span className="text-red-500">*</span>
                  </label>
                  <select
                    {...register("productId")}
                    disabled={!watchProviderId || filteredProducts.length === 0}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm disabled:bg-slate-50"
                  >
                    <option value="">
                      {watchProviderId ? (filteredProducts.length > 0 ? "Select a plan" : "No plans for this provider") : "Select a provider first"}
                    </option>
                    {filteredProducts.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.planNumber ? `[${product.planNumber}] ` : ""}{product.productName}
                      </option>
                    ))}
                  </select>
                  {errors.productId && <p className="text-xs text-red-500 mt-1">{errors.productId.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Mode <span className="text-red-500">*</span>
                  </label>
                  <select {...register("mode")} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm">
                    <option value="">Select Mode</option>
                    {modes.map((mode) => (
                      <option key={mode.id} value={mode.modeName}>{mode.modeName}</option>
                    ))}
                  </select>
                  {errors.mode && <p className="text-xs text-red-500 mt-1">{errors.mode.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Commencement Date <span className="text-red-500">*</span>
                  </label>
                  <Controller
                  control={control}
                  name="commencementDate"
                  render={({ field }) => (
                  <DatePicker
                  value={field.value ? new Date(field.value) : undefined}
                  onChange={(date) =>
                    field.onChange(date ? format(date, "yyyy-MM-dd") : "")
                  }
                  />
                  )}
                  />
                  {errors.commencementDate && <p className="text-xs text-red-500 mt-1">{errors.commencementDate.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Completion Date <span className="text-red-500">*</span>
                  </label> 
                  <Controller
  control={control}
  name="completionDate"
  render={({ field }) => (
    <DatePicker
      value={field.value ? new Date(field.value) : undefined}
      onChange={(date) =>
        field.onChange(date ? format(date, "yyyy-MM-dd") : "")
      }
    />
  )}
/>
                  {errors.completionDate && <p className="text-xs text-red-500 mt-1">{errors.completionDate.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Term
                  </label>
                  <input
                    type="text"
                    {...register("term")}
                    placeholder="Enter term"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                  />
                  {errors.term && <p className="text-xs text-red-500 mt-1">{errors.term.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    PPT
                  </label>
                  <input
                    type="text"
                    {...register("ppt")}
                    placeholder="Enter PPT"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                  />
                  {errors.ppt && <p className="text-xs text-red-500 mt-1">{errors.ppt.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Extra Class
                  </label>
                  <input
                    type="text"
                    {...register("extraClass")}
                    placeholder="Extra class"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Rate %
                  </label>
                  <input
                    type="text"
                    {...register("ratePercent")}
                    placeholder="Rate %"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                  />
                  {errors.ratePercent && <p className="text-xs text-red-500 mt-1">{errors.ratePercent.message}</p>}
                </div>
              </div>
            </div>
            {/* Section 4: Riders Details */}
            <div
              ref={sectionRefs['riders']}
              className={`bg-white border border-slate-200 rounded-xl p-6 transition-all duration-500 ${
                glowingSection === 'riders' ? 'shadow-lg shadow-blue-500/20' : ''
              }`}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                  <Shield size={20} className="text-blue-600" />
                  Riders Details
                </h2>
                <button
                  type="button"
                  onClick={() => appendRider({ description: "", sum: null, term: null, ppt: null, premium: null })}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
                  <Plus size={16} />
                  Add Rider
                </button>
              </div>
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Rider Description</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Sum</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Term</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">PPT</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Premium</th>
                      <th className="px-4 py-2 text-center text-xs font-medium text-slate-500 uppercase">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {riderFields.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-6 text-center text-slate-500 text-sm">
                          No Rider to Show
                        </td>
                      </tr>
                    ) : (
                      riderFields.map((field, index) => (
                        <tr key={field.id}>
                          <td className="px-2 py-1.5 w-1/3">
                            <select {...register(`riders.${index}.description`)} className="w-full text-sm border-slate-200 rounded-md focus:outline-none focus:ring-blue-500/20 focus:border-blue-500">
                              <option value="">Select Rider</option>
                              {riders.map(rider => (
                                <option key={rider.id} value={rider.riderName}>
                                  {rider.riderCode ? `[${rider.riderCode}] ` : ""}{rider.riderName}
                                </option>
                              ))}
                            </select>
                            {errors.riders?.[index]?.description && <p className="text-xs text-red-500 mt-1">{errors.riders[index]?.description?.message}</p>}
                          </td>
                          <td className="px-2 py-1.5">
                            <input type="text" {...register(`riders.${index}.sum`)} placeholder="Sum" className="w-full text-sm border-slate-200 rounded-md focus:outline-none focus:ring-blue-500/20 focus:border-blue-500" />
                            {errors.riders?.[index]?.sum && <p className="text-xs text-red-500 mt-1">{errors.riders[index]?.sum?.message}</p>}
                          </td>
                          <td className="px-2 py-1.5">
                            <input type="text" {...register(`riders.${index}.term`)} placeholder="Term" className="w-20 text-sm border-slate-200 rounded-md focus:outline-none focus:ring-blue-500/20 focus:border-blue-500" />
                            {errors.riders?.[index]?.term && <p className="text-xs text-red-500 mt-1">{errors.riders[index]?.term?.message}</p>}
                          </td>
                          <td className="px-2 py-1.5">
                            <input type="text" {...register(`riders.${index}.ppt`)} placeholder="PPT" className="w-20 text-sm border-slate-200 rounded-md focus:outline-none focus:ring-blue-500/20 focus:border-blue-500" />
                            {errors.riders?.[index]?.ppt && <p className="text-xs text-red-500 mt-1">{errors.riders[index]?.ppt?.message}</p>}
                          </td>
                          <td className="px-2 py-1.5">
                            <input type="text" {...register(`riders.${index}.premium`)} placeholder="Premium" className="w-full text-sm border-slate-200 rounded-md focus:outline-none focus:ring-blue-500/20 focus:border-blue-500" />
                            {errors.riders?.[index]?.premium && <p className="text-xs text-red-500 mt-1">{errors.riders[index]?.premium?.message}</p>}
                          </td>
                          <td className="px-2 py-1.5 text-center">
                            <button
                              type="button"
                              onClick={() => removeRider(index)}
                              className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                              title="Remove Rider"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="lg:col-span-1">
            {/* Section 3: Policy Premium Calculation */}
            <div
              ref={sectionRefs['premium-calculation']}
              className={`bg-white border border-slate-200 rounded-xl p-6 sticky top-6 transition-all duration-500 ${
                glowingSection === 'premium-calculation' ? 'shadow-lg shadow-blue-500/20' : ''
              }`}
            >
              <h2 className="text-lg font-semibold text-slate-900 mb-6 flex items-center gap-2">
                <DollarSign size={20} className="text-blue-600" />
                Policy Premium Calculation
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Sum Assured
                  </label>
                  <input
                    type="text"
                    {...register("sumAssured")}
                    placeholder="Enter sum assured"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                  />
                  {errors.sumAssured && <p className="text-xs text-red-500 mt-1">{errors.sumAssured.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Basic Yearly Premium
                  </label>
                  <input
                    type="text"
                    {...register("basicYearlyPremium")}
                    placeholder="Enter basic yearly premium"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                  />
                  {errors.basicYearlyPremium && <p className="text-xs text-red-500 mt-1">{errors.basicYearlyPremium.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Total Yearly Premium
                  </label>
                  <input
                    type="text"
                    {...register("totalYearlyPremium")}
                    placeholder="Enter total yearly premium"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                    
                    readOnly
                  />
                  {errors.totalYearlyPremium && <p className="text-xs text-red-500 mt-1">{errors.totalYearlyPremium.message}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Total Rider Premium
                  </label>
                  <input
                    type="text"
                    {...register("totalRiderPremium")}
                    placeholder="Total rider premium"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                  />
                  {errors.totalRiderPremium && <p className="text-xs text-red-500 mt-1">{errors.totalRiderPremium.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Installment Premium
                  </label>
                  <input
                    type="text"
                    {...register("installmentPremium")}
                    placeholder="Installment premium"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                  />
                  {errors.installmentPremium && <p className="text-xs text-red-500 mt-1">{errors.installmentPremium.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Rate %
                  </label>
                  <input
                    type="text"
                    {...register("ratePercent")}
                    placeholder="Rate %"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    GST
                  </label>
                  <input
                    type="text"
                    {...register("gst")}
                    placeholder="Enter GST"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                  />
                  {errors.gst && <p className="text-xs text-red-500 mt-1">{errors.gst.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Total Installment Premium
                  </label>
                  <input
                    type="text"
                    {...register("totalInstallmentPremium")}
                    placeholder="Total with GST"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div
          ref={sectionRefs['advanced']}
          className={`bg-white border border-slate-200 rounded-xl p-6 mt-6 transition-all duration-500 ${
            glowingSection === 'advanced' ? 'shadow-lg shadow-blue-500/20' : ''
          }`}
        >
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            type="button"
            className="flex items-center justify-between w-full text-left"
          > 
            <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <Settings size={20} className="text-blue-600" />
              Advanced Options
            </h2>
            {showAdvanced ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
          </button>

          {showAdvanced && (
            <div className="mt-6 grid grid-cols-1 xl:grid-cols-2 gap-6">
              {/* ================= LEFT COLUMN ================= */}
              <div className="space-y-6">
                {/* ================= Current Status ================= */}
                <div className="border border-slate-200 rounded-xl">
                  <div className="flex items-center justify-between px-5 py-4 border-b bg-white">
                    <div><h3 className="font-semibold text-slate-900">Current Status</h3></div>
                    <span className="text-sm text-slate-500">Check Current Status of Policy</span>
                  </div>
                  <div className="p-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-sm font-medium mb-2">Policy Status</label>
                        <select className="w-full rounded-lg border border-slate-300 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500">
                          {statuses.map((status) => (<option key={status.id} value={status.statusName}>{status.statusName}</option>))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">First Unpaid Premium (F.U.P.) Date</label>
                        <Controller control={control} name="fupDate" render={({ field }) => (<DatePicker value={field.value ? new Date(field.value) : undefined} onChange={(date) => field.onChange(date ? format(date, "yyyy-MM-dd") : "")} />)} />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Premium Adjusted</label>
                        <input type="text" placeholder="Premium Adjusted" className="w-full rounded-lg border border-slate-300 px-3 py-2.5" />
                      </div>
                      <div className="flex items-center pt-8">
                        <input id="premiumDeposit" type="checkbox" className="h-5 w-5" />
                        <label htmlFor="premiumDeposit" className="ml-3 text-sm">Create Premium Deposit Entries</label>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Loan Taken</label>
                        <input type="text" placeholder="Loan Taken" className="w-full rounded-lg border border-slate-300 px-3 py-2.5" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">First Unpaid Loan Int. (FULI) Date</label>
                        <Controller control={control} name="fuliDate" render={({ field }) => (<DatePicker value={field.value ? new Date(field.value) : undefined} onChange={(date) => field.onChange(date ? format(date, "yyyy-MM-dd") : "")} />)} />
                      </div>
                    </div>
                  </div>
                </div>
                {/* ================= NACH & NEFT ================= */}
                <div className="border border-slate-200 rounded-xl">
                  <div className="flex items-center justify-between px-5 py-4 border-b bg-white">
                    <h3 className="font-semibold text-slate-900">NACH & NEFT Details</h3>
                    <span className="text-sm text-slate-500">Provide NACH / NEFT Details for Bank Transactions</span>
                  </div>
                  <div className="p-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-sm font-medium mb-2">Bank Name</label>
                        <input type="text" placeholder="Bank Name" className="w-full rounded-lg border border-slate-300 px-3 py-2.5" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Account Number</label>
                        <input type="text" placeholder="Account Number" className="w-full rounded-lg border border-slate-300 px-3 py-2.5" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">IFSC Code</label>
                        <input type="text" placeholder="IFSC Code" className="w-full rounded-lg border border-slate-300 px-3 py-2.5" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Account Holder Name</label>
                        <input type="text" placeholder="Account Holder Name" className="w-full rounded-lg border border-slate-300 px-3 py-2.5" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              {/* ================= RIGHT COLUMN ================= */}
              <div className="space-y-6">
                {/* ================= Nomination Details ================= */}
                <div className="border border-slate-200 rounded-xl">
                  <div className="flex items-center justify-between px-5 py-4 border-b bg-white">
                    <h3 className="font-semibold text-slate-900">Nomination Details</h3>
                    <button
                      type="button"
                      onClick={() => appendNominee({ nomineeName: "", relationship: "", dateOfBirth: "", percentage: null, phone: "", email: "" })}
                      className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                    >
                      <Plus size={16} />
                      Add Nominee
                    </button>
                  </div>
                  <div className="p-5">
                    {nomineeFields.length === 0 ? (
                      <p className="text-sm text-slate-500 text-center py-4">No nominees added. Click 'Add Nominee' to start.</p>
                    ) : (
                      <div className="space-y-4">
                        {nomineeFields.map((field, index) => (
                          <div key={field.id} className="border border-slate-200 rounded-lg p-4 space-y-3 relative">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <label className="block text-xs font-medium mb-1">Nominee Name</label>
                                <input {...register(`nominees.${index}.nomineeName`)} placeholder="Full Name" className="w-full text-sm border-slate-200 rounded-md focus:outline-none focus:ring-blue-500/20 focus:border-blue-500" />
                                {errors.nominees?.[index]?.nomineeName && <p className="text-xs text-red-500 mt-1">{errors.nominees[index]?.nomineeName?.message}</p>}
                              </div>
                              <div>
                                <label className="block text-xs font-medium mb-1">Relationship</label>
                                <input {...register(`nominees.${index}.relationship`)} placeholder="e.g., Spouse, Son" className="w-full text-sm border-slate-200 rounded-md focus:outline-none focus:ring-blue-500/20 focus:border-blue-500" />
                                {errors.nominees?.[index]?.relationship && <p className="text-xs text-red-500 mt-1">{errors.nominees[index]?.relationship?.message}</p>}
                              </div>
                              <div>
                                <label className="block text-xs font-medium mb-1">
                                  Date of Birth
                                </label>
                                <Controller
                                  control={control}
                                  name={`nominees.${index}.dateOfBirth`}
                                  render={({ field }) => (
                                    <DatePicker
                                      value={field.value ? new Date(field.value) : undefined}
                                      onChange={(date) => field.onChange(date ? format(date, "yyyy-MM-dd") : "")}
                                    />
                                  )}
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium mb-1">Share %</label>
                                <input type="number" {...register(`nominees.${index}.percentage`)} placeholder="e.g., 100" className="w-full text-sm border-slate-200 rounded-md focus:outline-none focus:ring-blue-500/20 focus:border-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                                {errors.nominees?.[index]?.percentage && <p className="text-xs text-red-500 mt-1">{errors.nominees[index]?.percentage?.message}</p>}
                              </div>
                              <div>
                                <label className="block text-xs font-medium mb-1">Phone</label>
                                <input type="tel" {...register(`nominees.${index}.phone`)} placeholder="Mobile Number" className="w-full text-sm border-slate-200 rounded-md focus:outline-none focus:ring-blue-500/20 focus:border-blue-500" />
                              </div>
                              <div>
                                <label className="block text-xs font-medium mb-1">Email</label>
                                <input type="email" {...register(`nominees.${index}.email`)} placeholder="Email Address" className="w-full text-sm border-slate-200 rounded-md focus:outline-none focus:ring-blue-500/20 focus:border-blue-500" />
                                {errors.nominees?.[index]?.email && <p className="text-xs text-red-500 mt-1">{errors.nominees[index]?.email?.message}</p>}
                              </div>
                            </div>
                            <button type="button" onClick={() => removeNominee(index)} className="absolute top-2 right-2 p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Remove Nominee"><Trash2 size={14} /></button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                {/* ================= Annuity Details ================= */}
                <div className="border border-slate-200 rounded-xl">
                  <div className="flex items-center justify-between px-5 py-4 border-b"><h3 className="font-semibold text-slate-900">Annuity Details</h3></div>
                  <div className="p-5"><p className="text-sm text-slate-500">This will be enabled for Annuity Policies.</p></div>
                </div>
                {/* ================= Other Information ================= */}
                <div className="border border-slate-200 rounded-xl">
                  <div className="flex items-center justify-between px-5 py-4 border-b">
                    <h3 className="font-semibold text-slate-900">Other Information</h3>
                    <span className="text-sm text-slate-500">Agency, Branch, Notes & Other Policy Information</span>
                  </div>
                  <div className="p-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-sm font-medium mb-2">Agency</label> 
                        <select {...register("agencyId")} className="w-full rounded-lg border border-slate-300 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500">
                          <option value="">Select Agency</option>
                          {agencies.map((agency) => (<option key={agency.id} value={agency.id}>{agency.agencyName}</option>))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Branch</label>
                        <select {...register("branchId")} className="w-full rounded-lg border border-slate-300 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500">
                          <option value="">Select Branch</option>
                          {branches.map((branch) => (<option key={branch.id} value={branch.id}>{branch.branchName}</option>))}
                        </select>
                      </div>
                      <div>
                        <Controller name="advisorId" control={control} render={({ field }) => (<AdvisorAutoComplete value={field.value || ""} onChange={field.onChange} advisors={filteredAdvisors} disabled={!watchAgencyId} placeholder={watchAgencyId ? "Search Advisor..." : "Select Agency First"} />)} />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Agent Code</label>
                        <input {...register("agentCode")} readOnly placeholder="Auto Filled" className="w-full rounded-lg border border-slate-300 bg-slate-100 px-3 py-2.5" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Sales Channel</label>
                        <select className="w-full rounded-lg border border-slate-300 px-3 py-2.5">
                          <option value="direct">Direct</option>
                          <option value="agent">Agent</option>
                          <option value="broker">Broker</option>
                          <option value="online">Online</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Medical</label>
                        <input type="text" placeholder="Medical Details" className="w-full rounded-lg border border-slate-300 px-3 py-2.5" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Tax Beneficiary</label>
                        <input type="text" placeholder="Tax Beneficiary" className="w-full rounded-lg border border-slate-300 px-3 py-2.5" />
                      </div>
                      <div className="flex items-center mt-8">
                        <input id="ageAdmitted" type="checkbox" className="h-5 w-5" />
                        <label htmlFor="ageAdmitted" className="ml-3 text-sm">Age Admitted</label>
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium mb-2">Notes</label>
                        <textarea rows={4} placeholder="Enter Notes..." className="w-full rounded-lg border border-slate-300 px-3 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </form>
    </div>
  );
}