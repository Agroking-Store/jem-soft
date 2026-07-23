"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useForm, useFieldArray, Controller, type SubmitHandler, type Resolver } from "react-hook-form";
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
import { createPolicy, fetchPolicies } from "@/features/policy/policySlice";
import { fetchPolicyStatuses } from "@/features/policy/policyStatusMasterSlice";
import { fetchPremiumModes } from "@/features/policy/premiumModeMasterSlice";
import { fetchLicBranches } from "@/features/lic/licBranchSlice";
import { fetchAgencies } from "@/features/agency/agencySlice";
import { fetchProductAttributeValues } from "@/features/insurance/productAttributeValueSlice";
import { useNotificationStore } from "@/store/notificationStore";

import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeft,
  Save,
  X,
  User,
  IndianRupee,
  FileText,
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  Shield,
  Settings,
  Search,
  Hash,
  CreditCard,
  Banknote,
  Building,
  Home,
} from "lucide-react";
import toast from "react-hot-toast";
import DatePicker from "./DatePicker";
import { format, addYears, differenceInYears } from "date-fns";

function getFullName(customer: {
  salutation?: string | null;
  firstName: string;
  middleName?: string | null;
  lastName?: string | null;
}) {
  return [customer.salutation, customer.firstName, customer.middleName, customer.lastName]
    .filter(Boolean)
    .join(" ");
}

import {
  CustomerSectionCard,
  SearchableSelect,
  type SelectOption,
} from "@/features/customers/components/CustomerUi";

// A reusable component for selecting a customer group with search functionality.
const GroupAutoComplete = ({
  value,
  onChange,
  groups,
}: {
  value: string;
  onChange: (id: string) => void;
  groups: {
    id: string;
    groupCode?: string | null;
    groupName?: string | null;
  }[];
}) => {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = groups.find((g) => g.id === value);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = groups
    .filter((g) => {
      const q = query.toLowerCase();
      return (
        g.groupName?.toLowerCase().includes(q) ||
        g.groupCode?.toLowerCase().includes(q)
      );
    })
    .slice(0, 10);

  const { fetchNotifications } = useNotificationStore();

  return (
    <div ref={ref} className="relative">
      <label className="block text-sm font-medium text-slate-700 mb-1">
        Group Name <span className="text-red-500">*</span>
      </label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
          <Search size={16} />
        </span>
        <input
          value={
            selected
              ? `${selected.groupCode ? `[${selected.groupCode}] ` : ""}${selected.groupName || ""}`
              : query
          }
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            if (!e.target.value) onChange("");
          }}
          onFocus={() => setOpen(true)}
          placeholder="Search group by name or code..."
          className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#B8873A]/20 focus:border-[#B8873A] text-sm pl-9"
        />
        {selected && (
          <button
            type="button"
            onClick={() => {
              onChange(""); // Clear the value
              setQuery("");
            }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            <X size={13} />
          </button>
        )}
      </div>
      {open && filtered.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-lg z-50 max-h-52 overflow-y-auto">
          {filtered.map((g) => (
            <button
              key={g.id}
              type="button"
              onClick={() => {
                onChange(g.id);
                setQuery("");
                setOpen(false);
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[#B8873A]/10 transition-colors text-left"
            >
              <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-600">
                {g.groupCode || "—"}
              </span>
              <span className="text-sm font-medium text-slate-800">
                {g.groupName || "—"}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const AdvisorAutoComplete = ({
  value,
  onChange,
  advisors,
  disabled,
  placeholder,
}: {
  value: string;
  onChange: (id: string) => void;
  advisors: { id: string; advisorCode: string; advisorName: string }[];
  disabled?: boolean;
  placeholder?: string;
}) => {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = advisors.find((a) => a.id === value);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = advisors
    .filter((a) => {
      const q = query.toLowerCase();
      return (
        a.advisorName.toLowerCase().includes(q) ||
        a.advisorCode.toLowerCase().includes(q)
      );
    })
    .slice(0, 10);

  return (
    <div ref={ref} className="relative w-full">
      <label className="block text-sm font-medium text-slate-700 mb-1">
        Advisor <span className="text-red-500">*</span>
      </label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
          <Search size={16} />
        </span>
        <input
          value={
            selected
              ? `[${selected.advisorCode}] ${selected.advisorName}`
              : query
          }
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            if (!e.target.value) onChange("");
          }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder || "Search advisor by name or code..."}
          disabled={disabled}
          className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#B8873A]/20 focus:border-[#B8873A] text-sm pl-9 disabled:bg-slate-50 disabled:cursor-not-allowed"
        />
        {selected && (
          <button
            type="button"
            onClick={() => {
              onChange("");
              setQuery("");
            }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            <X size={13} />
          </button>
        )}
      </div>
      {open && filtered.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-lg z-50 max-h-52 overflow-y-auto">
          {filtered.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => {
                onChange(a.id);
                setQuery("");
                setOpen(false);
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[#B8873A]/10 transition-colors text-left"
            >
              <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-600">
                {a.advisorCode}
              </span>
              <span className="text-sm font-medium text-slate-800">
                {a.advisorName}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const LifeAssuredAutoComplete = ({
  value,
  onChange,
  members,
  disabled,
  placeholder,
}: {
  value: string;
  onChange: (id: string) => void;
  members: {
    id: string;
    firstName: string;
    middleName?: string | null;
    lastName?: string | null;
    salutation?: string | null;
  }[];
  disabled?: boolean;
  placeholder?: string;
}) => {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = members.find((m) => m.id === value);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = members
    .filter((m) => {
      const q = query.toLowerCase();
      return getFullName(m).toLowerCase().includes(q);
    })
    .slice(0, 10);

  return (
    <div ref={ref} className="relative">
      <label className="block text-sm font-medium text-slate-700 mb-1">
        Life Assured <span className="text-red-500">*</span>
      </label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
          <Search size={16} />
        </span>
        <input
          value={selected ? getFullName(selected) : query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); if (!e.target.value) onChange(""); }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#B8873A]/20 focus:border-[#B8873A] text-sm pl-9 disabled:bg-slate-50 disabled:cursor-not-allowed"
        />
        {selected && (<button type="button" onClick={() => { onChange(""); setQuery(""); }} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"><X size={14} /></button>)}
      </div>
      {open && filtered.length > 0 && (<div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-lg z-50 max-h-52 overflow-y-auto">{filtered.map((m) => (<button key={m.id} type="button" onClick={() => { onChange(m.id); setQuery(""); setOpen(false); }} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[#B8873A]/10 transition-colors text-left"><span className="text-sm font-medium text-slate-800">{getFullName(m)}</span></button>))}</div>)}
    </div>
  );
};

const BranchAutoComplete = ({
   value, 
   onChange, 
   branches, 
   disabled, 
   placeholder 
  }: 
  { 
    value: string; 
    onChange: (id: string) => void; 
    branches: {id: string; branchCode: string; branchName: string }[], 
    disabled?: boolean, placeholder?: string 
  }) => {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = branches.find((b) => b.id === value);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <label className="block text-sm font-medium text-slate-700 mb-1">Branch</label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"><Search size={16} /></span>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          disabled={disabled}
          className="w-full text-left px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#B8873A]/20 focus:border-[#B8873A] text-sm pl-9 disabled:bg-slate-50 disabled:cursor-not-allowed"
          aria-label={selected ? `[${selected.branchCode}] ${selected.branchName}` : placeholder || "Select a branch..."}
        >
          {selected ? `[${selected.branchCode}] ${selected.branchName}` : (placeholder || "Select a branch...")}
        </button>
        {selected && (<button type="button" onClick={() => { onChange(""); setQuery(""); }} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"><X size={14} /></button>)}
      </div>
      {open && branches.length > 0 && ( // This should use the DropdownPanel component for consistency
        <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-lg z-50 max-h-52 overflow-y-auto">{branches.map((b) => (<button key={b.id} type="button" onClick={() => { onChange(b.id); setQuery(""); setOpen(false); }} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[#B8873A]/10 transition-colors text-left"><span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-600">{b.branchCode}</span><span className="text-sm font-medium text-slate-800">{b.branchName}</span></button>))}</div>
      )}
    </div>
  );
};

const riderSchema = z.object({
  description: z.string().min(1, "Description is required"),

  sum: z.preprocess(
    (val) => (val === "" ? null : val),
    z.coerce.number().positive("Must be positive").nullable(),
  ),

  term: z.preprocess(
    (val) => (val === "" ? null : val),
    z.coerce.number().int().positive("Must be positive").nullable(),
  ),

  ppt: z.preprocess(
    (val) => (val === "" ? null : val),
    z.coerce.number().int().positive("Must be positive").nullable(),
  ),

  premium: z.preprocess(
    (val) => (val === "" ? null : val),
    z.coerce.number().positive("Must be positive").nullable(),
  ),
  mode: z.string().optional(),
});

const nomineeSchema = z.object({
  nomineeName: z.string().min(1, "Nominee name is required"),
  relationship: z.string().min(1, "Relationship is required"),
  dateOfBirth: z.string().optional(),
  percentage: z.preprocess(
    (val) => (val === "" ? null : val),
    z.coerce
      .number()
      .positive("Must be positive")
      .max(100, "Cannot exceed 100")
      .nullable(),
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
  productType: z.string().optional(),
  providerId: z.string().min(1, "Provider is required"),
  policyNumber: z
    .string()
    .regex(/^\d{9}$/, "Policy number must be exactly 9 digits."),
  productId: z.string().min(1, "Plan is required"),
  mode: z.string().min(1, "Mode is required"),
  commencementDate: z.string().min(1, "Commencement date is required."),
  completionDate: z.string().min(1, "Completion date is required."),
  term: z.preprocess(
    (val) => (val === "" ? undefined : val),
    z.coerce.number().int().positive().optional(),
  ),
  ppt: z.preprocess(
    (val) => (val === "" ? undefined : val),
    z.coerce.number().int().positive().optional(),
  ),
  extraClass: z.string().optional(),
  ratePercent: z.preprocess(
    (val) => (val === "" ? undefined : val),
    z.coerce.number().positive().optional(),
  ),

  sumAssured: z.preprocess(
    (val) => (val === "" ? undefined : val),
    z.coerce.number().positive().optional(),
  ),
  basicYearlyPremium: z.preprocess(
    (val) => (val === "" ? undefined : val),
    z.coerce.number().positive().optional(),
  ),
  totalYearlyPremium: z.preprocess(
    (val) => (val === "" ? undefined : val),
    z.coerce.number().positive().optional(),
  ),
  totalRiderPremium: z.preprocess(
    (val) => (val === "" ? undefined : val),
    z.coerce.number().positive().optional(),
  ),
  installmentPremium: z.preprocess(
    (val) => (val === "" ? undefined : val),
    z.coerce.number().positive().optional(),
  ),
  gst: z.preprocess(
    (val) => (val === "" ? undefined : val),
    z.coerce.number().positive().optional(),
  ),
  totalInstallmentPremium: z.preprocess(
    (val) => (val === "" ? undefined : val),
    z.coerce.number().positive().optional(),
  ),

  riders: z.array(riderSchema).optional(),
  nominees: z.array(nomineeSchema).optional(),

  advisorId: z.string().min(1, "Advisor is required."),
  agencyId: z.string().min(1, "Agency is required."),
  branchId: z.string().optional(),
  agentCode: z.string().optional(),
  fupDate: z.string().optional(),
  fuliDate: z.string().optional(),
  statusId: z.string().optional(),

  bankName: z.string().optional(),
  bankBranch: z.string().optional(),
  city: z.string().optional(),
  accountType: z.string().optional(),
  accountNumber: z.string().optional(),
  ifscCode: z.string().optional(),
  micrNumber: z.string().optional(),
  accountHolderName: z.string().optional(),
});

type PolicyFormValues = z.infer<typeof policySchema>;

export default function NewLICPolicyPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dispatch = useDispatch<AppDispatch>();
  const { user, isLoading: authLoading } = useAuth();

  const { customers: groups, isLoading: groupsLoading } = useSelector(
    (s: RootState) => s.customers,
  );
  const { customers: masterCustomers, isLoading: masterLoading } = useSelector(
    (s: RootState) => s.customerMaster,
  );
  const { providers, isLoading: providersLoading } = useSelector(
    (s: RootState) => s.insuranceProviders,
  );
  const { products, isLoading: productsLoading } = useSelector(
    (s: RootState) => s.products,
  );
  const { riders, isLoading: ridersLoading } = useSelector(
    (s: RootState) => s.riderMaster,
  );
  const { advisors, isLoading: advisorsLoading } = useSelector(
    (s: RootState) => s.advisors,
  );
  const { statuses, isLoading: statusesLoading } = useSelector(
    (s: RootState) => s.policyStatuses,
  );
  const { modes, isLoading: modesLoading } = useSelector(
    (s: RootState) => s.premiumModes,
  );
  const { branches, isLoading: branchesLoading } = useSelector(
    (s: RootState) => s.licBranch,
  );
  const { agencies, isLoading: agenciesLoading } = useSelector(
    (s: RootState) => s.agency,
  );
  const { values: productAttributeValues, isLoading: attributesLoading } = useSelector(
    (s: RootState) => s.productAttributeValues,
  );
  const { policies, isLoading: policiesLoading } = useSelector(
    (s: RootState) => s.policies,
  );

  const [activeSection, setActiveSection] = useState("policy-holder");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [glowingSection, setGlowingSection] = useState<string | null>(null);
  const { fetchNotifications } = useNotificationStore();
  const [attributeHints, setAttributeHints] = useState({
    term: '',
    ppt: '',
    sumAssured: '',
    age: '',
  });
  const policyTypeParam = searchParams.get("policyType")?.toLowerCase();
  const selectedPolicyType = policyTypeParam === "other" ? "other" : policyTypeParam === "lic" ? "lic" : null;

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
    dispatch(fetchProductAttributeValues());
    dispatch(fetchPolicies());
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

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    clearErrors,
    setError,
    formState: { errors },
  } = useForm<PolicyFormValues>({
    resolver: async (values, context, options) => {
      const selectedProductAttributes = productAttributeValues.filter(
        (attr) => attr.productId === values.productId,
      );
      const getAttributeValue = (code: string) =>
         selectedProductAttributes.find(
    (a) => a.attribute.attributeCode === code
  )?.value;

      let refinedSchema = policySchema;

      const minTerm = getAttributeValue("MIN_POLICY_TERM");
      const maxTerm = getAttributeValue("MAX_POLICY_TERM");
      if (minTerm || maxTerm) {
        refinedSchema = refinedSchema.refine((data) => {
          if (!data.term) return true;
          const term = Number(data.term);
          if (minTerm && term < Number(minTerm)) return false;
          if (maxTerm && term > Number(maxTerm)) return false;
          return true;
        }, { message: `Term must be between ${minTerm || 'N/A'} and ${maxTerm || 'N/A'}.`, path: ["term"] });
      }

      if (maxTerm) {
        refinedSchema = refinedSchema.refine((data) => {
          if (!data.commencementDate || !data.completionDate) return true;
          try {
            const startDate = new Date(data.commencementDate);
            const endDate = new Date(data.completionDate);
            const diffYears = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
            return diffYears <= Number(maxTerm);
          } catch (e) {
            return true; // Don't block if dates are invalid, other validators will catch it
          }
        }, { message: `The duration between commencement and completion cannot exceed the maximum term of ${maxTerm} years.`, path: ["completionDate"] });
      }


      const minSum = getAttributeValue("MIN_SUM_ASSURED");
      const maxSum = getAttributeValue("MAX_SUM_ASSURED");
      if (minSum || maxSum) {
        refinedSchema = refinedSchema.refine((data) => {
          if (!data.sumAssured) return true;
          const sum = Number(data.sumAssured);
          if (minSum && sum < Number(minSum)) return false;
          if (maxSum && sum > Number(maxSum)) return false;
          return true;
        }, { message: `Sum Assured must be between ${minSum || 'N/A'} and ${maxSum || 'N/A'}.`, path: ["sumAssured"] });
      }

      const minPpt = getAttributeValue("MIN_PPT");
      const maxPpt = getAttributeValue("MAX_PPT");
      if (minPpt || maxPpt) {
        refinedSchema = refinedSchema.refine(
          (data) => {
            if (!data.ppt) return true;
            const ppt = Number(data.ppt);
            if (minPpt && ppt < Number(minPpt)) return false;
            if (maxPpt && ppt > Number(maxPpt)) return false;
            return true;
          },
          { message: `PPT must be between ${minPpt || "N/A"} and ${maxPpt || "N/A"}.`, path: ["ppt"] },
        );
      }

      return zodResolver(refinedSchema as any)(values as any, context as any, options as any) as any;
    },
    defaultValues: {
      riders: [],
      nominees: [],
    },
  });

  const sectionRefs = {
    "policy-holder": useRef<HTMLDivElement>(null),
    "policy-details": useRef<HTMLDivElement>(null),
    "premium-calculation": useRef<HTMLDivElement>(null),
    riders: useRef<HTMLDivElement>(null),
    advanced: useRef<HTMLDivElement>(null),
  };

  const {
    fields: riderFields,
    append: appendRider,
    remove: removeRider,
  } = useFieldArray({
    control,
    name: "riders",
  });

  const {
    fields: nomineeFields,
    append: appendNominee,
    remove: removeNominee,
  } = useFieldArray({
    control,
    name: "nominees",
  });

  const watchGroupId = watch("groupId");
  const watchLifeAssuredId = watch("lifeAssuredId");
  const watchAdvisorId = watch("advisorId");
  const watchBasicYearlyPremium = watch("basicYearlyPremium");
  const watchBranchId = watch("branchId");
  const watchSumAssured = watch("sumAssured");
  const watchTerm = watch("term");
  const watchCommencementDate = watch("commencementDate");
  const watchCompletionDate = watch("completionDate");
  const watchPpt = watch("ppt");
  const watchMode = watch("mode");
  const watchAgencyId = watch("agencyId");
  const watchTotalRiderPremium = watch("totalRiderPremium");
  const watchRiders = watch("riders");
  const watchPolicyNumber = watch("policyNumber");

  const watchProductId = watch("productId");
  const selectedGroup = useMemo(
    () => groups.find((g) => g.id === watchGroupId),
    [watchGroupId, groups],
  );

  const groupMembers = useMemo(() => {
    if (!watchGroupId) return [];
    return masterCustomers.filter((m) => m.groupId === watchGroupId);
  }, [watchGroupId, masterCustomers]);

  useEffect(() => {
    if (watchPolicyNumber && policies.length > 0) {
      const policyExists = policies.some(
        (policy) => policy.policyNumber === watchPolicyNumber,
      );
      if (policyExists) {
        setError("policyNumber", {
          type: "manual",
          message: "Policy already exists with this number",
        });
      } else {
        clearErrors("policyNumber");
      }
    }
  }, [watchPolicyNumber, policies, setError, clearErrors]);

  useEffect(() => {
    setValue("groupCode", selectedGroup?.groupCode || "");
    setValue("lifeAssuredId", "");
  }, [watchGroupId, selectedGroup, setValue]);

  useEffect(() => {
    const member = masterCustomers.find((m) => m.id === watchLifeAssuredId);
    setValue(
      "dob",
      member?.dob ? new Date(member.dob).toISOString().split("T")[0] : "",
    );
    setValue(
      "age",
      member?.dob
        ? String(new Date().getFullYear() - new Date(member.dob).getFullYear())
        : "",
    );
    setValue("gender", member?.gender || "");
    setValue("pan", member?.panNumber || "");

    // Auto-fill bank details from the selected customer's default bank account
    if (member && member.bankDetails && member.bankDetails.length > 0) {
      const defaultBank =
        member.bankDetails.find((b) => b.isDefault) || member.bankDetails[0];
      if (defaultBank) {
        setValue("bankName", defaultBank.bankName || "");
        setValue("bankBranch", defaultBank.bankBranch || "");
        setValue("city", defaultBank.city || "");
        setValue("accountType", defaultBank.accountType || "");
        setValue("accountNumber", defaultBank.accountNumber || "");
        setValue("ifscCode", defaultBank.ifscCode || "");
        setValue("micrNumber", defaultBank.micrNumber || "");
      }
    }

    if (member) {
      setValue("accountHolderName", getFullName(member));
    }
  }, [watchLifeAssuredId, masterCustomers, setValue]);

  const availableProducts = useMemo(() => {
    return [...products]
      .filter((product) => {
        const provider = providers.find((provider) => provider.id === product.providerId);
        const providerCode = provider?.code?.toLowerCase();

        const isLICProvider = providerCode === "lic";

        if (selectedPolicyType === "lic") {
          return isLICProvider;
        }

        if (selectedPolicyType === "other") {
          return providerCode ? providerCode !== "lic" : false;
        }

        return true;
      })
      .sort((a, b) => (a.planNumber ?? "").localeCompare(b.planNumber ?? ""));
  }, [products, providers, selectedPolicyType]);

  const filteredAdvisors = useMemo(() => {
    if (!watchAgencyId) return [];
    return advisors.filter((a) => a.agencyId === watchAgencyId);
  }, [watchAgencyId, advisors]);

  useEffect(() => {
    if (selectedPolicyType === "lic") {
      setValue("providerType", "LIC", { shouldValidate: true });
    } else if (selectedPolicyType === "other") {
      setValue("providerType", "OTHER", { shouldValidate: true });
    } else {
      setValue("providerType", "", { shouldValidate: true });
    }
  }, [selectedPolicyType, setValue]);

  useEffect(() => {
    const agency = agencies.find(a => a.id === watchAgencyId);
    // When agency changes, reset the advisor
    setValue("advisorId", ""); 

    if (agency) {
      if (agency.agencyCode === 'AG002' || agency.agencyCode === 'AG003') {
        const directBranch = branches.find(b => b.branchCode === '955');
        setValue("branchId", directBranch?.id || "");
      } else {
        setValue("branchId", agency.branchId || "");
      }
    }
  }, [watchAgencyId, agencies, branches, setValue]);

  useEffect(() => {
    const advisor = advisors.find((a) => a.id === watchAdvisorId);
    setValue("agentCode", advisor?.advisorCode || "");
  }, [watchAdvisorId, advisors, setValue]);

  useEffect(() => {
    const basic = parseFloat(String(watchBasicYearlyPremium)) || 0;
    const rider = parseFloat(String(watchTotalRiderPremium)) || 0;
    const total = basic + rider;
    // Use setValue to update the form value
    setValue("totalYearlyPremium", total > 0 ? total : undefined);
  }, [watchBasicYearlyPremium, watchTotalRiderPremium, setValue]);

  // Auto-calculate individual rider premiums based on mode and sum up for total rider premium
  useEffect(() => {
    if (Array.isArray(watchRiders)) {
      let totalInstallmentRiderPremium = 0;
      let totalYearlyRiderPremium = 0;

      watchRiders.forEach((rider, index) => {
        const sum = parseFloat(String(rider.sum)) || 0;
        const term = parseFloat(String(rider.term)) || 0;
        const ppt = parseFloat(String(rider.ppt)) || 0;
        const mode = rider.mode;
        let currentPremium = parseFloat(String(rider.premium)) || 0;
        let yearlyRiderPremium = 0;

        if (sum > 0 && term > 0 && ppt > 0 && mode) {
          // Placeholder: Assume yearly premium is 1% of sum assured.
          yearlyRiderPremium = sum * 0.01;
          let installmentRiderPremium = 0;

          // Apply mode factors to calculate installment premium for the rider
          switch (mode) {
            case "Yearly": installmentRiderPremium = yearlyRiderPremium; break;
            case "Half-yearly": installmentRiderPremium = yearlyRiderPremium * 0.51; break;
            case "Half-Yearly": installmentRiderPremium = yearlyRiderPremium * 0.51; break;
            case "Quarterly": installmentRiderPremium = yearlyRiderPremium * 0.26; break;
            case "Monthly": installmentRiderPremium = yearlyRiderPremium * 0.088; break;
            default: installmentRiderPremium = 0;
          }

          const finalRiderPremium = parseFloat(installmentRiderPremium.toFixed(2));
          if (finalRiderPremium !== currentPremium) {
            setValue(`riders.${index}.premium`, finalRiderPremium);
            currentPremium = finalRiderPremium;
          }
        }
        totalInstallmentRiderPremium += currentPremium;
        totalYearlyRiderPremium += yearlyRiderPremium;
      });
      setValue("totalRiderPremium", totalInstallmentRiderPremium > 0 ? totalInstallmentRiderPremium : undefined);
    }
  }, [watchRiders, setValue]);

  // Auto-calculate Completion Date
  useEffect(() => {
    const term = Number(watchTerm);
    if (watchCommencementDate && term > 0) {
      try {
        const startDate = new Date(watchCommencementDate);
        const completionDate = addYears(startDate, term);
        setValue("completionDate", format(completionDate, "yyyy-MM-dd"));
      } catch (e) {
        // Do nothing if the date is invalid
      }
    }
  }, [watchCommencementDate, watchTerm, setValue]);

  // Auto-calculate Term from dates
  useEffect(() => {
    if (watchCommencementDate && watchCompletionDate) {
      try {
        const startDate = new Date(watchCommencementDate);
        const endDate = new Date(watchCompletionDate);
        const term = differenceInYears(endDate, startDate);
        if (term >= 0) setValue("term", term);
      } catch (e) {
        // Do nothing if dates are invalid
      }
    }
  }, [watchCommencementDate, watchCompletionDate, setValue]);

  useEffect(() => {
    const sum = parseFloat(String(watchSumAssured)) || 0;
    const term = parseFloat(String(watchTerm)) || 0;
    const ppt = parseFloat(String(watchPpt)) || 0;
    const mode = watchMode;

    if (sum > 0 && term > 0 && ppt > 0 && mode) {
      // Placeholder logic for basic yearly premium.
      // This should be replaced with your actual business logic.
      // For example, it could be a lookup from a rate table based on age, term, ppt.
      const basicYearlyPremium = sum * 0.05; // Example: 5% of sum assured
      setValue("basicYearlyPremium", basicYearlyPremium > 0 ? parseFloat(basicYearlyPremium.toFixed(2)) : undefined);

      // Calculate installment premium based on mode
      let installmentPremium = 0;
      switch (mode) {
        case "Yearly":
        case "Single":
          installmentPremium = basicYearlyPremium;
          break;
        case "Half-yearly":
        case "Half-Yearly":
          installmentPremium = basicYearlyPremium * 0.51; // Example factor for half-yearly
          break;
        case "Quarterly":
          installmentPremium = basicYearlyPremium * 0.26; // Example factor for quarterly
          break;
        case "Monthly":
          installmentPremium = basicYearlyPremium * 0.088; // Example factor for monthly
          break;
        default:
          installmentPremium = 0;
      }
      setValue("installmentPremium", installmentPremium > 0 ? parseFloat(installmentPremium.toFixed(2)) : undefined);
      setValue("gst", undefined);
      setValue("totalInstallmentPremium", installmentPremium > 0 ? parseFloat(installmentPremium.toFixed(2)) : undefined);
    }

  }, [watchSumAssured, watchTerm, watchPpt, watchMode, setValue]);

  // When product changes, update attribute hints and pre-fill fields with minimum values.
  useEffect(() => {
    if (!watchProductId || !productAttributeValues || !products.length) {
      setAttributeHints({ term: '', ppt: '', sumAssured: '', age: '' });
      // Clear fields if product is deselected
      setValue("term", undefined);
      setValue("ppt", undefined);
      setValue("sumAssured", undefined);
      return;
    }
  
    const selectedProductAttributes = productAttributeValues.filter(
      (attr) => attr.productId === watchProductId
    );
  
    const getAttributeValue = (code: string) =>
      selectedProductAttributes.find(
        (a) => a.attribute.attributeCode === code
      )?.value;
  
    const minTerm = getAttributeValue("MIN_POLICY_TERM");
    const maxTerm = getAttributeValue("MAX_POLICY_TERM");
    const minPpt = getAttributeValue("MIN_PPT");
    const maxPpt = getAttributeValue("MAX_PPT");
    const minSum = getAttributeValue("MIN_SUM_ASSURED");
    const maxSum = getAttributeValue("MAX_SUM_ASSURED");
    const minAge = getAttributeValue("MIN_ENTRY_AGE");
    const maxAge = getAttributeValue("MAX_ENTRY_AGE");
  
    // Pre-fill with minimum values. The `z.coerce` in the schema will handle the type.
    if (minTerm) setValue("term", minTerm as any);
    else setValue("term", undefined);

    if (minPpt) setValue("ppt", minPpt as any);
    else setValue("ppt", undefined);

    if (minSum) setValue("sumAssured", minSum as any);
    else setValue("sumAssured", undefined);

    setAttributeHints({
      term: minTerm || maxTerm ? `Range: ${minTerm || 'N/A'} - ${maxTerm || 'N/A'}` : '',
      ppt: minPpt || maxPpt ? `Range: ${minPpt || 'N/A'} - ${maxPpt || 'N/A'}` : '',
      sumAssured: minSum || maxSum ? `Range: ${minSum || 'N/A'} - ${maxSum || 'N/A'}` : '',
      age: minAge || maxAge ? `Required Age: ${minAge || 'N/A'} - ${maxAge || 'N/A'}` : '',
    });
  }, [watchProductId, productAttributeValues, products, setValue]);

  const onSubmit: SubmitHandler<PolicyFormValues> = async (data) => {
    const selectedProduct = products.find((p) => p.id === data.productId);
    if (selectedProduct && selectedProduct.productType === "Withdrawn") {
      toast.error(
        "This plan is withdrawn and cannot be used to create a new policy.",
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        ...data,
        attributes: {
          MIN_POLICY_TERM: data.term,
    MAX_POLICY_TERM: data.term,

    MIN_PPT: data.ppt,
    MAX_PPT: data.ppt,

    MIN_SUM_ASSURED: data.sumAssured,
    MAX_SUM_ASSURED: data.sumAssured,
        },
      };
      const result = await dispatch(createPolicy(payload)).unwrap();

      // Refresh notifications immediately
      await fetchNotifications();

      toast.success("Policy created successfully!");

      router.push("/dashboard/lic/policies");
    } catch (err: any) {
      toast.error(
        err.message || "Failed to create policy. Please check the details.",
      );
      console.error("Failed to create policy:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const states = [
    "Maharashtra",
    "Gujarat",
    "Rajasthan",
    "Uttar Pradesh",
    "Delhi",
    "Karnataka",
  ];

  const sections = [
    { id: "policy-holder", label: "Policy Holder's Details" },
    { id: "policy-details", label: "Policy Details" },
    { id: "premium-calculation", label: "Policy Premium Calculation" },
    { id: "riders", label: "Riders Details" },
    { id: "advanced", label: "Advanced Options" },
  ];

  const handleSectionClick = useCallback(
    (sectionId: keyof typeof sectionRefs) => {
      const ref = sectionRefs[sectionId];
      if (ref.current) {
        // We add an offset to account for the sticky header if you have one.
        const yOffset = -80;
        const y =
          ref.current.getBoundingClientRect().top +
          window.pageYOffset +
          yOffset;

        window.scrollTo({ top: y, behavior: 'smooth' });

        setActiveSection(sectionId);

        setGlowingSection(sectionId);
        // Remove the glow after 1.5 seconds
        setTimeout(() => setGlowingSection(null), 1500);
      }
    }, [sectionRefs]);

  if (!isMounted || authLoading || !canCreate) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
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
              <Link
                href="/dashboard/lic/policies"
                className="hover:text-blue-600"
              >
                Policies
              </Link>
              <ChevronRight size={16} />
              <span className="font-medium text-slate-700">
                New Policy Entry
              </span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mt-1">
              {selectedPolicyType === "lic"
                ? "Create a New LIC Policy"
                : "Create a New Policy"}
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/dashboard/lic/policies")}
            className="px-4 py-2 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition text-sm"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit(onSubmit)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm flex items-center gap-2"
          >
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
            onClick={() =>
              handleSectionClick(section.id as keyof typeof sectionRefs)
            }
            className={`
              px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition
              ${
                activeSection === section.id
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
          ref={sectionRefs["policy-holder"]} // Keep ref for scrolling
        >
          <CustomerSectionCard
            title="Policy Holder's Details"
            icon={User}
            actions={
              <Link
                href="/dashboard/customers/new"
                target="_blank"
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50"
              >
                <Plus size={14} />
                New Group
              </Link>
            }
          >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <Controller
                name="groupId"
                control={control}
                render={({ field }) => (
                  <GroupAutoComplete
                    value={field.value}
                    onChange={field.onChange}
                    groups={groups}
                  />
                )}
              />
              {errors.groupId && (
                <p className="text-xs text-red-500 mt-1">
                  {errors.groupId.message}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Group Code
              </label>
              <input
                type="text"
                value={selectedGroup?.groupCode || ""}
                placeholder="Autofilled"
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl bg-slate-50 text-sm text-slate-500 cursor-not-allowed"
                readOnly
              />
            </div>
            <div>
              <Controller
                name="lifeAssuredId"
                control={control}
                render={({ field }) => (
                  <LifeAssuredAutoComplete
                    value={field.value}
                    onChange={field.onChange}
                    members={groupMembers}
                    disabled={!watchGroupId || groupMembers.length === 0}
                    placeholder={watchGroupId ? (groupMembers.length > 0 ? "Search member..." : "No members in group") : "Select a group first"}
                  />
                )}
              />
              {errors.lifeAssuredId && (
                <p className="text-xs text-red-500 mt-1">
                  {errors.lifeAssuredId.message}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Date of Birth
              </label>
              <input
                {...register("dob")}
                type="date"
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl bg-slate-50 text-sm text-slate-500 cursor-not-allowed"
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
                placeholder="Autofilled"
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl bg-slate-50 text-sm text-slate-500 cursor-not-allowed"
                readOnly
              />
              {attributeHints.age && (
                <p className="text-xs text-slate-500 mt-1">{attributeHints.age}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Gender
              </label>
              <select
                {...register("gender")}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl bg-slate-50 text-sm text-slate-500 cursor-not-allowed"
                disabled
              >
                <option value="">Select Gender</option>
                <option value={watch("gender")} disabled>
                  {watch("gender")}
                </option>
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
                placeholder="Autofilled"
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl bg-slate-50 text-sm text-slate-500 cursor-not-allowed"
                readOnly
              />
            </div>
          </div>
          </CustomerSectionCard>
        </div>

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Section 2: Policy Details */}
            <div
              ref={sectionRefs["policy-details"]} // Keep ref for scrolling
            >
              <CustomerSectionCard title="Policy Details" icon={FileText}>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <input type="hidden" {...register("providerType")} />
                <input type="hidden" {...register("productType")} />

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Policy Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    {...register("policyNumber")}
                    placeholder="Enter policy number"
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#B8873A]/20 focus:border-[#B8873A] text-sm"
                  />
                  {errors.policyNumber && (
                    <p className="text-xs text-red-500 mt-1">
                      {errors.policyNumber.message}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Plan <span className="text-red-500">*</span>
                  </label>
                  <Controller
                    control={control}
                    name="productId" // Use Controller for custom components
                    render={({ field }) => (
                      <SearchableSelect
                        placeholder="Search plan..."
                        searchPlaceholder="Search by name or number"
                        options={availableProducts.map(p => ({
                          value: p.id,
                          label: p.productName,
                          sublabel: p.planNumber ? `Plan No: ${p.planNumber}` : undefined,
                        }))}
                        value={field.value}
                        onChange={(val) => {
                          field.onChange(val);
                          const selectedProduct = products.find((p) => p.id === val);
                          if (selectedProduct) {
                            setValue("providerId", selectedProduct.providerId || "");
                            setValue("productType", selectedProduct.productType || "");
                          }
                        }}
                        error={errors.productId?.message}
                        disabled={productsLoading}
                      />
                    )}
                  />
                  {errors.productId && <p className="text-xs text-red-500 mt-1">{errors.productId.message}</p>}
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
                  {errors.commencementDate && (
                    <p className="text-xs text-red-500 mt-1">
                      {errors.commencementDate.message}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Mode <span className="text-red-500">*</span>
                  </label>
                  <select
                    {...register("mode")}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#B8873A]/20 focus:border-[#B8873A] text-sm"
                  >
                    <option value="">Select Mode</option>
                    {modes.map((mode) => (
                      <option key={mode.id} value={mode.modeName}>
                        {mode.modeName}
                      </option>
                    ))}
                  </select>
                  {errors.mode && (
                    <p className="text-xs text-red-500 mt-1">
                      {errors.mode.message}
                    </p>
                  )}
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
                  {errors.completionDate && (
                    <p className="text-xs text-red-500 mt-1">
                      {errors.completionDate.message}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Term
                  </label>
                  <input
                    type="text"
                    {...register("term")}
                    placeholder="Enter term"
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#B8873A]/20 focus:border-[#B8873A] text-sm"
                  />
                  {errors.term && (
                    <p className="text-xs text-red-500 mt-1">
                      {errors.term.message}
                    </p>
                  )}
                  {attributeHints.term && !errors.term && (
                    <p className="text-xs text-slate-500 mt-1">{attributeHints.term}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    PPT
                  </label>
                  <input
                    type="text"
                    {...register("ppt")}
                    placeholder="Enter PPT"
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#B8873A]/20 focus:border-[#B8873A] text-sm"
                  />
                  {errors.ppt && (
                    <p className="text-xs text-red-500 mt-1">
                      {errors.ppt.message}
                    </p>
                  )}
                  {attributeHints.ppt && !errors.ppt && (
                    <p className="text-xs text-slate-500 mt-1">{attributeHints.ppt}</p>
                  )}
                </div>
              </div>
              </CustomerSectionCard>
            </div>
            {/* Section 4: Riders Details */}
            <div
              ref={sectionRefs["riders"]} // Keep ref for scrolling
            >
              <CustomerSectionCard
                title="Riders Details"
                icon={Shield}
                actions={
                  <button
                    type="button"
                    onClick={() => appendRider({ description: "", sum: null, term: null, mode: "", ppt: null, premium: null })}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50"
                  >
                    <Plus size={14} />
                    Add Rider
                  </button>
                }
              >
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">
                        Rider Description
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">
                        Sum
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">
                        Term
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">
                        PPT
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">
                        Mode
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">
                        Premium
                      </th>
                      <th className="px-4 py-2 text-center text-xs font-medium text-slate-500 uppercase">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {riderFields.length === 0 ? (
                      <tr>
                        <td
                          colSpan={7}
                          className="px-4 py-6 text-center text-slate-500 text-sm"
                        >
                          No Rider to Show
                        </td>
                      </tr>
                    ) : (
                      riderFields.map((field, index) => (
                        <tr key={field.id}>
                          <td className="px-2 py-1.5 w-1/3">
                            <select
                              {...register(`riders.${index}.description`)}
                              className="w-full text-sm border-slate-200 rounded-md focus:outline-none focus:ring-[#B8873A]/20 focus:border-[#B8873A]"
                            >
                              <option value="">Select Rider</option>
                              {riders.map((rider) => (
                                <option key={rider.id} value={rider.riderName}>
                                  {rider.riderCode
                                    ? `[${rider.riderCode}] `
                                    : ""}
                                  {rider.riderName}
                                </option>
                              ))}
                            </select>
                            {errors.riders?.[index]?.description && (
                              <p className="text-xs text-red-500 mt-1">
                                {errors.riders[index]?.description?.message}
                              </p>
                            )}
                          </td>
                          <td className="px-2 py-1.5">
                            <input
                              type="text"
                              {...register(`riders.${index}.sum`)}
                              placeholder="Sum"
                              className="w-full text-sm border-slate-200 rounded-md focus:outline-none focus:ring-[#B8873A]/20 focus:border-[#B8873A]"
                            />
                            {errors.riders?.[index]?.sum && (
                              <p className="text-xs text-red-500 mt-1">
                                {errors.riders[index]?.sum?.message}
                              </p>
                            )}
                          </td>
                          <td className="px-2 py-1.5">
                            <input
                              type="text"
                              {...register(`riders.${index}.term`)}
                              placeholder="Term"
                              className="w-20 text-sm border-slate-200 rounded-md focus:outline-none focus:ring-[#B8873A]/20 focus:border-[#B8873A]"
                            />
                            {errors.riders?.[index]?.term && (
                              <p className="text-xs text-red-500 mt-1">
                                {errors.riders[index]?.term?.message}
                              </p>
                            )}
                          </td>
                          
                          <td className="px-2 py-1.5">
                            <input
                              type="text"
                              {...register(`riders.${index}.ppt`)}
                              placeholder="PPT"
                              className="w-20 text-sm border-slate-200 rounded-md focus:outline-none focus:ring-[#B8873A]/20 focus:border-[#B8873A]"
                            />
                            {errors.riders?.[index]?.ppt && (
                              <p className="text-xs text-red-500 mt-1">
                                {errors.riders[index]?.ppt?.message}
                              </p>
                            )}
                          </td>
                          <td className="px-2 py-1.5">
                            <select {...register(`riders.${index}.mode`)} className="w-full text-sm border-slate-200 rounded-md focus:outline-none focus:ring-[#B8873A]/20 focus:border-[#B8873A]">
                                <option value="">Mode</option>
                                {modes.map(mode => (
                                    <option key={mode.id} value={mode.modeName}>
                                        {mode.modeName}
                                    </option>
                                ))}
                            </select>
                            {errors.riders?.[index]?.mode && <p className="text-xs text-red-500 mt-1">{errors.riders[index]?.mode?.message}</p>}
                          </td>
                          <td className="px-2 py-1.5">
                            <input
                              type="text"
                              {...register(`riders.${index}.premium`)}
                              placeholder="Premium"
                              className="w-full text-sm border-slate-200 rounded-md focus:outline-none focus:ring-[#B8873A]/20 focus:border-[#B8873A]"
                            />
                            {errors.riders?.[index]?.premium && (
                              <p className="text-xs text-red-500 mt-1">
                                {errors.riders[index]?.premium?.message}
                              </p>
                            )}
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
              </CustomerSectionCard>
            </div>
          </div>

          {/* Right Column */}
          <div className="lg:col-span-1">
            {/* Section 3: Policy Premium Calculation */}
            <div ref={sectionRefs["premium-calculation"]} className="sticky top-6">
              <CustomerSectionCard title="Policy Premium Calculation" icon={Banknote}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Sum Assured
                  </label>
                  <input
                    type="text"
                    {...register("sumAssured")}
                    placeholder="Enter sum assured"
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#B8873A]/20 focus:border-[#B8873A] text-sm"
                  />
                  {errors.sumAssured && (
                    <p className="text-xs text-red-500 mt-1">
                      {errors.sumAssured.message}
                    </p>
                  )}
                  {attributeHints.sumAssured && !errors.sumAssured && (
                    <p className="text-xs text-slate-500 mt-1">{attributeHints.sumAssured}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Basic Yearly Premium
                  </label>
                  <input
                    type="text"
                    {...register("basicYearlyPremium")}
                    placeholder="Enter basic yearly premium"
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#B8873A]/20 focus:border-[#B8873A] text-sm"
                  />
                  {errors.basicYearlyPremium && (
                    <p className="text-xs text-red-500 mt-1">
                      {errors.basicYearlyPremium.message}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Total Yearly Premium
                  </label>
                  <input
                    type="text"
                    {...register("totalYearlyPremium")}
                    placeholder="Enter total yearly premium"
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl bg-slate-50 text-sm text-slate-500 cursor-not-allowed"
                    readOnly
                  />
                  {errors.totalYearlyPremium && (
                    <p className="text-xs text-red-500 mt-1">
                      {errors.totalYearlyPremium.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Total Rider Premium
                  </label>
                  <input
                    type="text"
                    {...register("totalRiderPremium")}
                    placeholder="Total rider premium"
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#B8873A]/20 focus:border-[#B8873A] text-sm"
                  />
                  {errors.totalRiderPremium && (
                    <p className="text-xs text-red-500 mt-1">
                      {errors.totalRiderPremium.message}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Installment Premium
                  </label>
                  <input
                    type="text"
                    {...register("installmentPremium")}
                    placeholder="Installment premium"
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#B8873A]/20 focus:border-[#B8873A] text-sm"
                  />
                  {errors.installmentPremium && (
                    <p className="text-xs text-red-500 mt-1">
                      {errors.installmentPremium.message}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Rate %
                  </label>
                  <input
                    type="text"
                    {...register("ratePercent")}
                    placeholder="Rate %"
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#B8873A]/20 focus:border-[#B8873A] text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Total Installment Premium
                  </label>
                  <input
                    type="text"
                    {...register("totalInstallmentPremium")}
                    placeholder="Total installment premium"
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#B8873A]/20 focus:border-[#B8873A] text-sm"
                  />
                </div>
              </div>
              </CustomerSectionCard>
          </div>
          </div>
        </div>
        
        <div
          ref={sectionRefs["advanced"]} // Ref is on the main container
        >
          <CustomerSectionCard title="Advanced Options" icon={Settings} className={`bg-white border border-slate-200 rounded-xl mt-6 transition-all duration-500 ${glowingSection === "advanced" ? "shadow-lg shadow-blue-500/20" : ""}`}>
          <div className="mt-6 grid grid-cols-1 xl:grid-cols-2 gap-6">

              {/* ================= LEFT COLUMN ================= */}
              <div className="space-y-6">
                {/* ================= Current Status ================= */}
                <div className="border border-slate-200 rounded-xl">
                  <div className="flex items-center justify-between px-5 py-4 border-b bg-white">
                    <div>
                      <h3 className="font-semibold text-slate-900">
                        Current Status
                      </h3>
                    </div>
                    <span className="text-sm text-slate-500">
                      Check Current Status of Policy
                    </span>
                  </div>
                  <div className="p-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-sm font-medium mb-1.5">Policy Status</label>
                        <select {...register("statusId")} className="w-full rounded-lg border border-slate-300 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500">
                          {statuses.map((status) => (<option key={status.id} value={status.id}>{status.statusName}</option>))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          First Unpaid Premium (F.U.P.) Date
                        </label>
                        <Controller
                          control={control}
                          name="fupDate"
                          render={({ field }) => (
                            <DatePicker
                              value={
                                field.value ? new Date(field.value) : undefined
                              }
                              onChange={(date) =>
                                field.onChange(
                                  date ? format(date, "yyyy-MM-dd") : "",
                                )
                              }
                            />
                          )}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Premium Adjusted
                        </label>
                        <input
                          type="text"
                          placeholder="Premium Adjusted"
                          className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
                        />
                      </div>
                      <div className="flex items-center pt-8">
                        <input
                          id="premiumDeposit"
                          type="checkbox"
                          className="h-5 w-5"
                        />
                        <label
                          htmlFor="premiumDeposit"
                          className="ml-3 text-sm"
                        >
                          Create Premium Deposit Entries
                        </label>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Loan Taken
                        </label>
                        <input
                          type="text"
                          placeholder="Loan Taken"
                          className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          First Unpaid Loan Int. (FULI) Date
                        </label>
                        <Controller
                          control={control}
                          name="fuliDate"
                          render={({ field }) => (
                            <DatePicker
                              value={
                                field.value ? new Date(field.value) : undefined
                              }
                              onChange={(date) =>
                                field.onChange(
                                  date ? format(date, "yyyy-MM-dd") : "",
                                )
                              }
                            />
                          )}
                        />
                      </div>
                    </div>
                  </div>
                </div>
                {/* ================= NACH & NEFT ================= */}
                <div className="border border-slate-200 rounded-xl">
                  <div className="flex items-center justify-between px-5 py-4 border-b bg-white">
                    <h3 className="font-semibold text-slate-900">
                      NACH & NEFT Details
                    </h3>
                    <span className="text-sm text-slate-500">
                      Provide NACH / NEFT Details for Bank Transactions
                    </span>
                  </div>
                  <div className="p-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Bank Name
                        </label>
                        <input
                          type="text"
                          placeholder="Bank Name"
                          {...register("bankName")}
                          className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Account Number
                        </label>
                        <input
                          type="text"
                          placeholder="Account Number"
                          {...register("accountNumber")}
                          className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          IFSC Code
                        </label>
                        <input
                          type="text"
                          placeholder="IFSC Code"
                          {...register("ifscCode")}
                          className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Account Holder Name
                        </label>
                        <input
                          type="text"
                          placeholder="Account Holder Name"
                          {...register("accountHolderName")}
                          className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
                        />
                      </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Bank Branch
                      </label>
                      <input
                        {...register("bankBranch")}
                        type="text"
                        placeholder="Bank Branch"
                        className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        City
                      </label>
                      <input
                        {...register("city")}
                        type="text"
                        placeholder="City"
                        className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Account Type
                      </label>
                      <input
                      {...register("accountType")} 
                      placeholder="Account Type"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
                      />
                    </div>
                   
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        MICR Number
                      </label>
                      <input
                        {...register("micrNumber")}
                        type="text"
                        placeholder="MICR Number"
                        className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
                      />
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
                    <h3 className="font-semibold text-slate-900">
                      Nomination Details
                    </h3>
                    <button
                      type="button"
                      onClick={() =>
                        appendNominee({
                          nomineeName: "",
                          relationship: "",
                          dateOfBirth: "",
                          percentage: null,
                          phone: "",
                          email: "",
                        })
                      }
                      className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                    >
                      <Plus size={16} />
                      Add Nominee
                    </button>
                  </div>
                  <div className="p-5">
                    {nomineeFields.length === 0 ? (
                      <p className="text-sm text-slate-500 text-center py-4">
                        No nominees added. Click Add Nominee to start.
                      </p>
                    ) : (
                      <div className="space-y-4">
                        {nomineeFields.map((field, index) => (
                          <div
                            key={field.id}
                            className="border border-slate-200 rounded-lg p-4 space-y-3 relative"
                          >
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <label className="block text-xs font-medium mb-1">
                                  Nominee Name
                                </label>
                                <input
                                  {...register(`nominees.${index}.nomineeName`)}
                                  placeholder="Full Name"
                                  className="w-full text-sm border-slate-200 rounded-md focus:outline-none focus:ring-blue-500/20 focus:border-blue-500"
                                />
                                {errors.nominees?.[index]?.nomineeName && (
                                  <p className="text-xs text-red-500 mt-1">
                                    {
                                      errors.nominees[index]?.nomineeName
                                        ?.message
                                    }
                                  </p>
                                )}
                              </div>
                              <div>
                                <label className="block text-xs font-medium mb-1">
                                  Relationship
                                </label>
                                <input
                                  {...register(
                                    `nominees.${index}.relationship`,
                                  )}
                                  placeholder="e.g., Spouse, Son"
                                  className="w-full text-sm border-slate-200 rounded-md focus:outline-none focus:ring-blue-500/20 focus:border-blue-500"
                                />
                                {errors.nominees?.[index]?.relationship && (
                                  <p className="text-xs text-red-500 mt-1">
                                    {
                                      errors.nominees[index]?.relationship
                                        ?.message
                                    }
                                  </p>
                                )}
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
                                      value={
                                        field.value
                                          ? new Date(field.value)
                                          : undefined
                                      }
                                      onChange={(date) =>
                                        field.onChange(
                                          date
                                            ? format(date, "yyyy-MM-dd")
                                            : "",
                                        )
                                      }
                                    />
                                  )}
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium mb-1">
                                  Share %
                                </label>
                                <input
                                  type="number"
                                  {...register(`nominees.${index}.percentage`)}
                                  placeholder="e.g., 100"
                                  className="w-full text-sm border-slate-200 rounded-md focus:outline-none focus:ring-blue-500/20 focus:border-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                />
                                {errors.nominees?.[index]?.percentage && (
                                  <p className="text-xs text-red-500 mt-1">
                                    {
                                      errors.nominees[index]?.percentage
                                        ?.message
                                    }
                                  </p>
                                )}
                              </div>
                              <div>
                                <label className="block text-xs font-medium mb-1">
                                  Phone
                                </label>
                                <input
                                  type="tel"
                                  {...register(`nominees.${index}.phone`)}
                                  placeholder="Mobile Number"
                                  className="w-full text-sm border-slate-200 rounded-md focus:outline-none focus:ring-blue-500/20 focus:border-blue-500"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium mb-1">
                                  Email
                                </label>
                                <input
                                  type="email"
                                  {...register(`nominees.${index}.email`)}
                                  placeholder="Email Address"
                                  className="w-full text-sm border-slate-200 rounded-md focus:outline-none focus:ring-blue-500/20 focus:border-blue-500"
                                />
                                {errors.nominees?.[index]?.email && (
                                  <p className="text-xs text-red-500 mt-1">
                                    {errors.nominees[index]?.email?.message}
                                  </p>
                                )}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeNominee(index)}
                              className="absolute top-2 right-2 p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                              title="Remove Nominee"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                {/* ================= Annuity Details ================= */}
                <div className="border border-slate-200 rounded-xl">
                  <div className="flex items-center justify-between px-5 py-4 border-b">
                    <h3 className="font-semibold text-slate-900">
                      Annuity Details
                    </h3>
                  </div>
                  <div className="p-5">
                    <p className="text-sm text-slate-500">
                      This will be enabled for Annuity Policies.
                    </p>
                  </div>
                </div>
                {/* ================= Other Information ================= */}
                <div className="border border-slate-200 rounded-xl">
                  <div className="flex items-center justify-between px-5 py-4 border-b">
                    <h3 className="font-semibold text-slate-900">
                      Other Information
                    </h3>
                    <span className="text-sm text-slate-500">
                      Agency, Branch, Notes & Other Policy Information
                    </span>
                  </div>
                  <div className="p-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-sm font-medium mb-2">Agency <span className="text-red-500">*</span></label>
                        <select {...register("agencyId")} className="w-full rounded-lg border border-slate-300 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500">
                          <option value="">Select Agency</option>
                          {agencies.map((agency) => (
                            <option key={agency.id} value={agency.id}>
                              {agency.agencyName}
                            </option>
                          ))}
                        </select>
                        {errors.agencyId && <p className="text-xs text-red-500 mt-1">{errors.agencyId.message}</p>}
                      </div>
                      <div>
                        <Controller name="branchId" control={control} render={({ field }) => (<BranchAutoComplete value={field.value || ""} onChange={field.onChange} branches={branches} />)} />
                      </div>
                      <div className="relative">
                        <Controller name="advisorId" control={control} render={({ field }) => (<AdvisorAutoComplete value={field.value || ""} onChange={field.onChange} advisors={filteredAdvisors} disabled={!watchAgencyId} placeholder={watchAgencyId ? "Search Advisor..." : "Select Agency First"} />
                        )} />
                        {errors.advisorId && <p className="text-xs text-red-500 mt-1">{errors.advisorId.message}</p>}
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Agent Code (Autofilled)
                        </label>
                        <input
                          {...register("agentCode")}
                          readOnly
                          placeholder="Auto Filled"
                          className="w-full rounded-lg border border-slate-300 bg-slate-100 px-3 py-2.5"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Sales Channel
                        </label>
                        <select className="w-full rounded-lg border border-slate-300 px-3 py-2.5">
                          <option value="direct">Direct</option>
                          <option value="agent">Agent</option>
                          <option value="broker">Broker</option>
                          <option value="online">Online</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Medical
                        </label>
                        <input
                          type="text"
                          placeholder="Medical Details"
                          className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Tax Beneficiary
                        </label>
                        <input
                          type="text"
                          placeholder="Tax Beneficiary"
                          className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
                        />
                      </div>
                      <div className="flex items-center mt-8">
                        <input
                          id="ageAdmitted"
                          type="checkbox"
                          className="h-5 w-5"
                        />
                        <label htmlFor="ageAdmitted" className="ml-3 text-sm">
                          Age Admitted
                        </label>
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium mb-2">
                          Notes
                        </label>
                        <textarea
                          rows={4}
                          placeholder="Enter Notes..."
                          className="w-full rounded-lg border border-slate-300 px-3 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CustomerSectionCard>
        </div>

      </form>
  </div>
  
  );
}
