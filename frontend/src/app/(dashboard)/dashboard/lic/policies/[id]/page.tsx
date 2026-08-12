"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useForm, Controller } from "react-hook-form";
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
import { fetchPolicyById } from "@/features/policy/policySlice";
import { fetchPolicyStatuses } from "@/features/policy/policyStatusMasterSlice";
import { fetchPremiumModes } from "@/features/policy/premiumModeMasterSlice";
import { fetchLicBranches } from "@/features/lic/licBranchSlice";
import { fetchAgencies } from "@/features/agency/agencySlice";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeft,
  User,
  Banknote,
  FileText,
  ChevronRight,
  Shield,
  Settings,
  Search,
  AlertCircle,
} from "lucide-react";
import DatePicker from "../new/DatePicker";

function getFullName(customer: {
  salutation?: string | null;
  firstName: string;
  middleName?: string | null;
  lastName?: string | null;
}) {
  return [
    customer.salutation,
    customer.firstName,
    customer.middleName,
    customer.lastName,
  ]
    .filter(Boolean)
    .join(" ");
}

import {
  CustomerSectionCard,
  SearchableSelect,
  type SelectOption,
} from "@/features/customers/components/CustomerUi";

const riderSchema = z.object({
  description: z.string().optional(),
  sum: z.number().nullable().optional(),
  term: z.number().nullable().optional(),
  ppt: z.number().nullable().optional(),
  mode: z.string().optional(),
  premium: z.number().nullable().optional(),
});

const policySchema = z.object({
  groupId: z.string().optional(),
  groupCode: z.string().optional(),
  lifeAssuredId: z.string().optional(),
  dob: z.string().optional(),
  age: z.string().optional(),
  gender: z.string().optional(),
  pan: z.string().optional(),

  providerType: z.string().optional(),
  providerId: z.string().optional(),
  policyNumber: z.string().optional(),
  productId: z.string().optional(),
  mode: z.string().optional(),
  commencementDate: z.string().optional(),
  completionDate: z.string().optional(),
  term: z.number().optional(),
  ppt: z.number().optional(),
  extraClass: z.string().optional(),
  ratePercent: z.number().optional(),

  sumAssured: z.number().optional(),
  basicYearlyPremium: z.number().optional(),
  totalYearlyPremium: z.number().optional(),
  totalRiderPremium: z.number().optional(),
  installmentPremium: z.number().optional(),
  gst: z.number().optional(),
  totalInstallmentPremium: z.number().optional(),

  riders: z.array(riderSchema).optional(),

  advisorId: z.string().optional(),
  agentCode: z.string().optional(),
  agencyId: z.string().optional(),
  branchId: z.string().optional(),

  policyStatus: z.string().optional(),
  statusId: z.string().optional(),
  fupDate: z.string().optional(),
  fuliDate: z.string().optional(),
  premiumAdjusted: z.string().optional(),
  loanTaken: z.string().optional(),
  annuityDetails: z.string().optional(),
  otherInformation: z.string().optional(),
  bankName: z.string().optional(),
  bankBranch: z.string().optional(),
  city: z.string().optional(),
  accountType: z.string().optional(),
  accountNumber: z.string().optional(),
  ifscCode: z.string().optional(),
  micrNumber: z.string().optional(),
  accountHolderName: z.string().optional(),
  neftBankName: z.string().optional(),
  neftBankBranch: z.string().optional(),
  neftAccountNumber: z.string().optional(),
  neftIfscCode: z.string().optional(),
  neftAccountHolderName: z.string().optional(),
  neftSubmissionDate: z.string().optional(),
  branchName: z.string().optional(),
  medical: z.string().optional(),
  salesChannel: z.string().optional(),
  ageAdmitted: z.string().optional(),
  taxBeneficiary: z.string().optional(),
  notes: z.string().optional(),
  nominees: z.array(z.any()).optional(),
});

type PolicyFormValues = z.infer<typeof policySchema>;

export default function ViewLICPolicyPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const dispatch = useDispatch<AppDispatch>();

  const { selectedPolicy, isLoading, error } = useSelector(
    (state: RootState) => state.policies,
  );

  const { register, control, watch, reset } = useForm<PolicyFormValues>({
    resolver: zodResolver(policySchema) as any,
    defaultValues: {
      riders: [],
      nominees: [],
    },
  });

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

  const [activeSection, setActiveSection] = useState("policy-holder");
  const [glowingSection, setGlowingSection] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);

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
    if (id) {
      dispatch(fetchPolicyById(id as string));
    }
  }, [dispatch, id]);

  useEffect(() => {
    if (!selectedPolicy) return;

    reset({
      groupId: selectedPolicy.clientId,
      lifeAssuredId: selectedPolicy.CustomerMasterId,

      providerType: selectedPolicy.provider?.type,

      providerId: selectedPolicy.providerId,
      productId: selectedPolicy.productId,

      policyNumber: selectedPolicy.policyNumber,

      commencementDate: selectedPolicy.commencementDate?.substring(0, 10),

      completionDate: selectedPolicy.maturityDate
        ? selectedPolicy.maturityDate.substring(0, 10)
        : "",

      advisorId: selectedPolicy.advisorId ?? "",
      agencyId: selectedPolicy.advisor?.agencyId ?? "",
      branchId: selectedPolicy.branchId ?? "",

      agentCode: selectedPolicy.agentCode ?? "",

      term: selectedPolicy.policyTerm ?? undefined,

      ppt: selectedPolicy.premiumPayingTerm ?? undefined,

      mode: selectedPolicy.premiumMode?.modeName ?? "",

      sumAssured: selectedPolicy.premium?.sumAssured ?? undefined,

      basicYearlyPremium:
        selectedPolicy.premium?.basicYearlyPremium ?? undefined,

      totalYearlyPremium:
        selectedPolicy.premium?.totalYearlyPremium ?? undefined,

      installmentPremium:
        selectedPolicy.premium?.installmentPremium ?? undefined,

      totalInstallmentPremium:
        selectedPolicy.premium?.totalInstallmentPremium ?? undefined,

      gst: selectedPolicy.premium?.gst ?? undefined,

      statusId: selectedPolicy.statusId ?? "",
      policyStatus: selectedPolicy.status?.statusName ?? "",
      fupDate: selectedPolicy.nextPremiumDueDate
        ? selectedPolicy.nextPremiumDueDate.substring(0, 10)
        : "",
      fuliDate:
        selectedPolicy.policyAttributes?.find(
          (a: any) => a.attribute?.attributeCode === "fuliDate",
        )?.value ?? "",
      premiumAdjusted: selectedPolicy.premium?.extraClass?.toString() ?? "",
      dob: selectedPolicy.CustomerMaster?.dob
        ? new Date(selectedPolicy.CustomerMaster.dob)
            .toISOString()
            .substring(0, 10)
        : "",
      age: selectedPolicy.CustomerMaster?.dob
        ? Math.floor(
            (Date.now() -
              new Date(selectedPolicy.CustomerMaster.dob).getTime()) /
              (365.25 * 24 * 60 * 60 * 1000),
          ).toString()
        : "",
      gender: selectedPolicy.CustomerMaster?.gender ?? "",
      pan: selectedPolicy.CustomerMaster?.panNumber ?? "",
      loanTaken: "",
      annuityDetails:
        selectedPolicy.policyAttributes?.find(
          (a: any) => a.attribute?.attributeCode === "annuityDetails",
        )?.value ?? "",
      otherInformation: selectedPolicy.remarks ?? "",
      bankName:
        selectedPolicy.CustomerMaster?.bankDetails?.find(
          (b: any) => b.isDefault,
        )?.bankName ??
        selectedPolicy.CustomerMaster?.bankDetails?.[0]?.bankName ??
        "",
      bankBranch:
        selectedPolicy.CustomerMaster?.bankDetails?.find(
          (b: any) => b.isDefault,
        )?.bankBranch ??
        selectedPolicy.CustomerMaster?.bankDetails?.[0]?.bankBranch ??
        "",
      city:
        selectedPolicy.CustomerMaster?.bankDetails?.find(
          (b: any) => b.isDefault,
        )?.city ??
        selectedPolicy.CustomerMaster?.bankDetails?.[0]?.city ??
        "",
      accountType:
        selectedPolicy.CustomerMaster?.bankDetails?.find(
          (b: any) => b.isDefault,
        )?.accountType ??
        selectedPolicy.CustomerMaster?.bankDetails?.[0]?.accountType ??
        "",
      accountNumber:
        selectedPolicy.CustomerMaster?.bankDetails?.find(
          (b: any) => b.isDefault,
        )?.accountNumber ??
        selectedPolicy.CustomerMaster?.bankDetails?.[0]?.accountNumber ??
        "",
      ifscCode:
        selectedPolicy.CustomerMaster?.bankDetails?.find(
          (b: any) => b.isDefault,
        )?.ifscCode ??
        selectedPolicy.CustomerMaster?.bankDetails?.[0]?.ifscCode ??
        "",
      micrNumber:
        selectedPolicy.CustomerMaster?.bankDetails?.find(
          (b: any) => b.isDefault,
        )?.micrNumber ??
        selectedPolicy.CustomerMaster?.bankDetails?.[0]?.micrNumber ??
        "",
      accountHolderName: selectedPolicy.CustomerMaster
        ? getFullName(selectedPolicy.CustomerMaster)
        : "",
      branchName: selectedPolicy.branch?.branchName ?? "",
      medical: "",
      salesChannel: "",
      ageAdmitted: "",
      taxBeneficiary: "",
      notes: selectedPolicy.remarks ?? "",

      riders:
        selectedPolicy.policyRiders?.map((r: any) => ({
          description: r.rider.riderName,
          sum: r.riderAmount,
          premium: r.riderPremium,
          term: undefined,
          ppt: undefined,
          mode: r.mode ?? "",
        })) ?? [],
    });
  }, [selectedPolicy, reset]);

  const sectionRefs = {
    "policy-holder": useRef<HTMLDivElement>(null),
    "policy-details": useRef<HTMLDivElement>(null),
    "premium-calculation": useRef<HTMLDivElement>(null),
    riders: useRef<HTMLDivElement>(null),
    advanced: useRef<HTMLDivElement>(null),
  };

  const watchGroupId = watch("groupId");
  const watchLifeAssuredId = watch("lifeAssuredId");
  const watchProviderType = watch("providerType");
  const watchProviderId = watch("providerId");
  const riderData = watch("riders") || [];
  const watchAgencyId = watch("agencyId");
  const watchAdvisorId = watch("advisorId");

  const selectedGroup = useMemo(
    () => groups.find((g) => g.id === watchGroupId),
    [watchGroupId, groups],
  );

  const groupMembers = useMemo(() => {
    if (!watchGroupId) return [];
    return masterCustomers.filter((m) => m.groupId === watchGroupId);
  }, [watchGroupId, masterCustomers]);

  const filteredAdvisors = useMemo(() => {
    if (!watchAgencyId) return [];
    return advisors.filter((a) => a.agencyId === watchAgencyId);
  }, [watchAgencyId, advisors]);

  const selectedProvider = useMemo(
    () => providers.find((p) => p.id === watchProviderId),
    [watchProviderId, providers],
  );
  const selectedProduct = useMemo(
    () => products.find((p) => p.id === watch("productId")),
    [watch("productId"), products],
  );
  const selectedMode = useMemo(
    () => modes.find((m) => m.modeName === watch("mode")),
    [watch("mode"), modes],
  );
  const selectedLifeAssured = useMemo(
    () => masterCustomers.find((m) => m.id === watchLifeAssuredId),
    [watchLifeAssuredId, masterCustomers],
  );
  const selectedStatus = useMemo(
    () => statuses.find((s) => s.id === watch("statusId")),
    [watch("statusId"), statuses],
  );
  const selectedAgency = useMemo(
    () => agencies.find((a) => a.id === watchAgencyId),
    [watchAgencyId, agencies],
  );

  const handleSectionClick = (sectionId: keyof typeof sectionRefs) => {
    const ref = sectionRefs[sectionId];
    if (ref.current) {
      const yOffset = -80;
      const y =
        ref.current.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: "smooth" });
      setActiveSection(sectionId);
      setGlowingSection(sectionId);
      setTimeout(() => setGlowingSection(null), 1500);
    }
  };

  if (isLoading || !isMounted) {
    return (
      <div className="max-w-7xl mx-auto pb-20">
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => router.push("/dashboard/lic/policies")}
            className="p-2 hover:bg-slate-100 rounded-lg transition"
          >
            <ChevronLeft size={20} className="text-slate-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Loading Policy...
            </h1>
          </div>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      </div>
    );
  }

  if (error || !selectedPolicy) {
    return (
      <div className="max-w-7xl mx-auto pb-20">
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => router.push("/dashboard/lic/policies")}
            className="p-2 hover:bg-slate-100 rounded-lg transition"
          >
            <ChevronLeft size={20} className="text-slate-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Policy Not Found
            </h1>
          </div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="text-red-600 flex-shrink-0" size={20} />
          <div>
            <p className="text-red-800 font-medium">Unable to load policy</p>
            <p className="text-red-600 text-sm">
              {error ||
                "The policy you're looking for doesn't exist or you don't have permission to view it."}
            </p>
          </div>
        </div>
        <button
          onClick={() => router.push("/dashboard/lic/policies")}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm"
        >
          Back to Policies
        </button>
      </div>
    );
  }

  const sections = [
    { id: "policy-holder", label: "Policy Holder's Details" },
    { id: "policy-details", label: "Policy Details" },
    { id: "premium-calculation", label: "Policy Premium Calculation" },
    { id: "riders", label: "Riders Details" },
    { id: "advanced", label: "Advanced Options" },
  ];

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
              <span className="font-medium text-slate-700">View Policy</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mt-1">
              View LIC Policy
            </h1>
          </div>
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
      <div className="space-y-6">
        {/* Section 1: Policy Holder's Details */}
        <div ref={sectionRefs["policy-holder"]}>
          <CustomerSectionCard
            title="Policy Holder's Details"
            icon={User}
            actions={
              <Link
                href="/dashboard/customers/new"
                target="_blank"
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50"
              >
                <Search size={14} />
                View Group
              </Link>
            }
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Group Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={
                    selectedGroup
                      ? `${selectedGroup.groupCode ? `[${selectedGroup.groupCode}] ` : ""}${selectedGroup.groupName || ""}`
                      : ""
                  }
                  placeholder="Select group..."
                  readOnly
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl bg-slate-50 text-sm text-slate-500 cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Group Code
                </label>
                <input
                  type="text"
                  value={selectedGroup?.groupCode || ""}
                  placeholder="Autofilled"
                  readOnly
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl bg-slate-50 text-sm text-slate-500 cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Life Assured <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={
                    selectedLifeAssured ? getFullName(selectedLifeAssured) : ""
                  }
                  placeholder="Select life assured..."
                  readOnly
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl bg-slate-50 text-sm text-slate-500 cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Date of Birth
                </label>
                <input
                  type="date"
                  value={watch("dob") || ""}
                  readOnly
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl bg-slate-50 text-sm text-slate-500 cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Age
                </label>
                <input
                  type="number"
                  value={watch("age") || ""}
                  placeholder="Autofilled"
                  readOnly
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl bg-slate-50 text-sm text-slate-500 cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Gender
                </label>
                <select
                  value={watch("gender") || ""}
                  disabled
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl bg-slate-50 text-sm text-slate-500 cursor-not-allowed"
                >
                  <option value="">Select Gender</option>
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
                  type="text"
                  value={watch("pan") || ""}
                  placeholder="Autofilled"
                  readOnly
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl bg-slate-50 text-sm text-slate-500 cursor-not-allowed"
                />
              </div>
            </div>
          </CustomerSectionCard>
        </div>

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Section 2: Policy Details */}
            <div ref={sectionRefs["policy-details"]}>
              <CustomerSectionCard title="Policy Details" icon={FileText}>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <input type="hidden" {...register("providerType")} />

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Policy Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={watch("policyNumber") || ""}
                      placeholder="Enter policy number"
                      readOnly
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-xl bg-slate-50 text-sm text-slate-500 cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Plan <span className="text-red-500">*</span>
                    </label>
                    <Controller
                      control={control}
                      name="productId"
                      render={({ field }) => (
                        <SearchableSelect
                          placeholder="Search plan..."
                          searchPlaceholder="Search by name or number"
                          options={products.map((p) => ({
                            value: p.id,
                            label: p.productName,
                            sublabel: p.planNumber
                              ? `Plan No: ${p.planNumber}`
                              : undefined,
                          }))}
                          value={field.value || ""}
                          onChange={() => {}}
                          disabled={true}
                        />
                      )}
                    />
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
                          value={
                            field.value ? new Date(field.value) : undefined
                          }
                          onChange={() => {}}
                          readOnly={true}
                        />
                      )}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Mode <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={watch("mode") || ""}
                      disabled
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-xl bg-slate-50 text-sm text-slate-500 cursor-not-allowed"
                    >
                      <option value="">Select Mode</option>
                      {modes.map((mode) => (
                        <option key={mode.id} value={mode.modeName}>
                          {mode.modeName}
                        </option>
                      ))}
                    </select>
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
                          value={
                            field.value ? new Date(field.value) : undefined
                          }
                          onChange={() => {}}
                          readOnly={true}
                        />
                      )}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Term
                    </label>
                    <input
                      type="text"
                      value={watch("term") ?? ""}
                      placeholder="Enter term"
                      readOnly
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-xl bg-slate-50 text-sm text-slate-500 cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      PPT
                    </label>
                    <input
                      type="text"
                      value={watch("ppt") ?? ""}
                      placeholder="Enter PPT"
                      readOnly
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-xl bg-slate-50 text-sm text-slate-500 cursor-not-allowed"
                    />
                  </div>
                </div>
              </CustomerSectionCard>
            </div>

            {/* Section 4: Riders Details */}
            <div ref={sectionRefs["riders"]}>
              <CustomerSectionCard title="Riders Details" icon={Shield}>
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
                      {riderData.length === 0 ? (
                        <tr>
                          <td
                            colSpan={7}
                            className="px-4 py-6 text-center text-slate-500 text-sm"
                          >
                            No Rider to Show
                          </td>
                        </tr>
                      ) : (
                        riderData.map((rider, index) => (
                          <tr key={index}>
                            <td className="px-2 py-1.5 w-1/3">
                              <select
                                value={rider.description || ""}
                                disabled
                                className="w-full text-sm border-slate-200 rounded-md bg-slate-50 text-slate-500 cursor-not-allowed"
                              >
                                <option value="">Select Rider</option>
                                {riders.map((riderOpt) => (
                                  <option
                                    key={riderOpt.id}
                                    value={riderOpt.riderName}
                                  >
                                    {riderOpt.riderCode
                                      ? `[${riderOpt.riderCode}] `
                                      : ""}
                                    {riderOpt.riderName}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="px-2 py-1.5">
                              <input
                                type="text"
                                value={rider.sum ?? ""}
                                placeholder="Sum"
                                readOnly
                                className="w-full text-sm border-slate-200 rounded-md bg-slate-50 text-slate-500 cursor-not-allowed"
                              />
                            </td>
                            <td className="px-2 py-1.5">
                              <input
                                type="text"
                                value={rider.term ?? ""}
                                placeholder="Term"
                                readOnly
                                className="w-20 text-sm border-slate-200 rounded-md bg-slate-50 text-slate-500 cursor-not-allowed"
                              />
                            </td>
                            <td className="px-2 py-1.5">
                              <input
                                type="text"
                                value={rider.ppt ?? ""}
                                placeholder="PPT"
                                readOnly
                                className="w-20 text-sm border-slate-200 rounded-md bg-slate-50 text-slate-500 cursor-not-allowed"
                              />
                            </td>
                            <td className="px-2 py-1.5">
                              <select
                                value={rider.mode || ""}
                                disabled
                                className="w-full text-sm border-slate-200 rounded-md bg-slate-50 text-slate-500 cursor-not-allowed"
                              >
                                <option value="">Mode</option>
                                {modes.map((mode) => (
                                  <option key={mode.id} value={mode.modeName}>
                                    {mode.modeName}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="px-2 py-1.5">
                              <input
                                type="text"
                                value={rider.premium ?? ""}
                                placeholder="Premium"
                                readOnly
                                className="w-full text-sm border-slate-200 rounded-md bg-slate-50 text-slate-500 cursor-not-allowed"
                              />
                            </td>
                            <td className="px-2 py-1.5 text-center">
                              <button
                                type="button"
                                disabled
                                className="p-1.5 text-red-300 cursor-not-allowed"
                                title="Remove Rider"
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  width="14"
                                  height="14"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <path d="M3 6h18" />
                                  <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                                  <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                                </svg>
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
            <div
              ref={sectionRefs["premium-calculation"]}
              className="sticky top-6"
            >
              <CustomerSectionCard
                title="Policy Premium Calculation"
                icon={Banknote}
              >
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Sum Assured
                    </label>
                    <input
                      type="text"
                      value={watch("sumAssured") ?? ""}
                      placeholder="Enter sum assured"
                      readOnly
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-xl bg-slate-50 text-sm text-slate-500 cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Basic Yearly Premium
                    </label>
                    <input
                      type="text"
                      value={watch("basicYearlyPremium") ?? ""}
                      placeholder="Enter basic yearly premium"
                      readOnly
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-xl bg-slate-50 text-sm text-slate-500 cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Total Yearly Premium
                    </label>
                    <input
                      type="text"
                      value={watch("totalYearlyPremium") ?? ""}
                      placeholder="Enter total yearly premium"
                      readOnly
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-xl bg-slate-50 text-sm text-slate-500 cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Total Rider Premium
                    </label>
                    <input
                      type="text"
                      value={watch("totalRiderPremium") ?? ""}
                      placeholder="Total rider premium"
                      readOnly
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-xl bg-slate-50 text-sm text-slate-500 cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Installment Premium
                    </label>
                    <input
                      type="text"
                      value={watch("installmentPremium") ?? ""}
                      placeholder="Installment premium"
                      readOnly
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-xl bg-slate-50 text-sm text-slate-500 cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Total Installment Premium
                    </label>
                    <input
                      type="text"
                      value={watch("totalInstallmentPremium") ?? ""}
                      placeholder="Total installment premium"
                      readOnly
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-xl bg-slate-50 text-sm text-slate-500 cursor-not-allowed"
                    />
                  </div>
                </div>
              </CustomerSectionCard>
            </div>
          </div>
        </div>

        <div ref={sectionRefs["advanced"]}>
          <CustomerSectionCard
            title="Advanced Options"
            icon={Settings}
            className={`bg-white border border-slate-200 rounded-xl mt-6 transition-all duration-500 ${glowingSection === "advanced" ? "shadow-lg shadow-blue-500/20" : ""}`}
          >
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
                        <label className="block text-sm font-medium mb-1.5">
                          Policy Status
                        </label>
                        <select
                          value={watch("statusId") || ""}
                          disabled
                          className="w-full rounded-lg border border-slate-300 px-3 py-2.5 bg-slate-50 text-slate-500 cursor-not-allowed"
                        >
                          <option value="">Select Status</option>
                          {statuses.map((status) => (
                            <option key={status.id} value={status.id}>
                              {status.statusName}
                            </option>
                          ))}
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
                              onChange={() => {}}
                              readOnly={true}
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
                          value={watch("premiumAdjusted") || ""}
                          placeholder="Premium Adjusted"
                          readOnly
                          className="w-full rounded-lg border border-slate-300 px-3 py-2.5 bg-slate-50 text-slate-500 cursor-not-allowed"
                        />
                      </div>
                      <div className="flex items-center pt-8">
                        <input
                          id="premiumDeposit"
                          type="checkbox"
                          className="h-5 w-5"
                          disabled
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
                          value={watch("loanTaken") || ""}
                          placeholder="Loan Taken"
                          readOnly
                          className="w-full rounded-lg border border-slate-300 px-3 py-2.5 bg-slate-50 text-slate-500 cursor-not-allowed"
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
                              onChange={() => {}}
                              readOnly={true}
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
                          value={watch("bankName") || ""}
                          placeholder="Bank Name"
                          readOnly
                          className="w-full rounded-lg border border-slate-300 px-3 py-2.5 bg-slate-50 text-slate-500 cursor-not-allowed"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Account Number
                        </label>
                        <input
                          type="text"
                          value={watch("accountNumber") || ""}
                          placeholder="Account Number"
                          readOnly
                          className="w-full rounded-lg border border-slate-300 px-3 py-2.5 bg-slate-50 text-slate-500 cursor-not-allowed"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          IFSC Code
                        </label>
                        <input
                          type="text"
                          value={watch("ifscCode") || ""}
                          placeholder="IFSC Code"
                          readOnly
                          className="w-full rounded-lg border border-slate-300 px-3 py-2.5 bg-slate-50 text-slate-500 cursor-not-allowed"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Account Holder Name
                        </label>
                        <input
                          type="text"
                          value={watch("accountHolderName") || ""}
                          placeholder="Account Holder Name"
                          readOnly
                          className="w-full rounded-lg border border-slate-300 px-3 py-2.5 bg-slate-50 text-slate-500 cursor-not-allowed"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Bank Branch
                        </label>
                        <input
                          type="text"
                          value={watch("bankBranch") || ""}
                          placeholder="Bank Branch"
                          readOnly
                          className="w-full rounded-lg border border-slate-300 px-3 py-2.5 bg-slate-50 text-slate-500 cursor-not-allowed"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          City
                        </label>
                        <input
                          type="text"
                          value={watch("city") || ""}
                          placeholder="City"
                          readOnly
                          className="w-full rounded-lg border border-slate-300 px-3 py-2.5 bg-slate-50 text-slate-500 cursor-not-allowed"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Account Type
                        </label>
                        <input
                          type="text"
                          value={watch("accountType") || ""}
                          placeholder="Account Type"
                          readOnly
                          className="w-full rounded-lg border border-slate-300 px-3 py-2.5 bg-slate-50 text-slate-500 cursor-not-allowed"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Debt Date
                        </label>
                        <input
                          value={watch("fupDate") || ""}
                          readOnly
                          className="w-full rounded-lg border border-slate-300 bg-slate-100 px-3 py-2.5 text-slate-500 cursor-not-allowed"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          MICR Number
                        </label>
                        <input
                          type="text"
                          value={watch("micrNumber") || ""}
                          placeholder="MICR Number"
                          readOnly
                          className="w-full rounded-lg border border-slate-300 px-3 py-2.5 bg-slate-50 text-slate-500 cursor-not-allowed"
                        />
                      </div>

                      {/* NEFT Section */}
                      <div className="md:col-span-2 my-4 border-t border-slate-200"></div>
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          NEFT Bank Name
                        </label>
                        <input
                          type="text"
                          value={
                            watch("neftBankName") || watch("bankName") || ""
                          }
                          placeholder="Bank Name"
                          readOnly
                          className="w-full rounded-lg border border-slate-300 px-3 py-2.5 bg-slate-50 text-slate-500 cursor-not-allowed"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          NEFT Account Number
                        </label>
                        <input
                          type="text"
                          value={
                            watch("neftAccountNumber") ||
                            watch("accountNumber") ||
                            ""
                          }
                          placeholder="Account Number"
                          readOnly
                          className="w-full rounded-lg border border-slate-300 px-3 py-2.5 bg-slate-50 text-slate-500 cursor-not-allowed"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          NEFT IFSC Code
                        </label>
                        <input
                          type="text"
                          value={
                            watch("neftIfscCode") || watch("ifscCode") || ""
                          }
                          placeholder="IFSC Code"
                          readOnly
                          className="w-full rounded-lg border border-slate-300 px-3 py-2.5 bg-slate-50 text-slate-500 cursor-not-allowed"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          NEFT Account Holder Name
                        </label>
                        <input
                          type="text"
                          value={
                            watch("neftAccountHolderName") ||
                            watch("accountHolderName") ||
                            ""
                          }
                          placeholder="Account Holder Name"
                          readOnly
                          className="w-full rounded-lg border border-slate-300 px-3 py-2.5 bg-slate-50 text-slate-500 cursor-not-allowed"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          NEFT Bank Branch
                        </label>
                        <input
                          type="text"
                          value={
                            watch("neftBankBranch") || watch("bankBranch") || ""
                          }
                          placeholder="Bank Branch"
                          readOnly
                          className="w-full rounded-lg border border-slate-300 px-3 py-2.5 bg-slate-50 text-slate-500 cursor-not-allowed"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          NEFT Submission Date
                        </label>
                        <input
                          type="date"
                          value={watch("neftSubmissionDate") || ""}
                          readOnly
                          className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 text-slate-500 cursor-not-allowed"
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
                  </div>
                  <div className="p-5">
                    {selectedPolicy.nominees &&
                    selectedPolicy.nominees.length > 0 ? (
                      <div className="space-y-4">
                        {selectedPolicy.nominees.map(
                          (nominee: any, index: number) => (
                            <div
                              key={nominee.id || index}
                              className="border border-slate-200 rounded-lg p-4 space-y-3 relative"
                            >
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-xs font-medium mb-1">
                                    Nominee Name
                                  </label>
                                  <input
                                    type="text"
                                    value={nominee.nomineeName || ""}
                                    placeholder="Full Name"
                                    readOnly
                                    className="w-full text-sm border-slate-200 rounded-md bg-slate-50 text-slate-500 cursor-not-allowed"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-medium mb-1">
                                    Relationship
                                  </label>
                                  <input
                                    type="text"
                                    value={nominee.relationship || ""}
                                    placeholder="e.g., Spouse, Son"
                                    readOnly
                                    className="w-full text-sm border-slate-200 rounded-md bg-slate-50 text-slate-500 cursor-not-allowed"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-medium mb-1">
                                    Date of Birth
                                  </label>
                                  <input
                                    type="date"
                                    value={
                                      nominee.dateOfBirth
                                        ? new Date(nominee.dateOfBirth)
                                            .toISOString()
                                            .substring(0, 10)
                                        : ""
                                    }
                                    readOnly
                                    className="w-full text-sm border-slate-200 rounded-md bg-slate-50 text-slate-500 cursor-not-allowed"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-medium mb-1">
                                    Share %
                                  </label>
                                  <input
                                    type="number"
                                    value={nominee.percentage ?? ""}
                                    placeholder="e.g., 100"
                                    readOnly
                                    className="w-full text-sm border-slate-200 rounded-md bg-slate-50 text-slate-500 cursor-not-allowed"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-medium mb-1">
                                    Phone
                                  </label>
                                  <input
                                    type="tel"
                                    value={nominee.phone || ""}
                                    placeholder="Mobile Number"
                                    readOnly
                                    className="w-full text-sm border-slate-200 rounded-md bg-slate-50 text-slate-500 cursor-not-allowed"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-medium mb-1">
                                    Email
                                  </label>
                                  <input
                                    type="email"
                                    value={nominee.email || ""}
                                    placeholder="Email Address"
                                    readOnly
                                    className="w-full text-sm border-slate-200 rounded-md bg-slate-50 text-slate-500 cursor-not-allowed"
                                  />
                                </div>
                              </div>
                            </div>
                          ),
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-slate-500 text-center py-4">
                        No nominees added.
                      </p>
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
                        <label className="block text-sm font-medium mb-2">
                          Agency <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={watchAgencyId || ""}
                          disabled
                          className="w-full rounded-lg border border-slate-300 px-3 py-2.5 bg-slate-50 text-slate-500 cursor-not-allowed"
                        >
                          <option value="">Select Agency</option>
                          {agencies.map((agency) => (
                            <option key={agency.id} value={agency.id}>
                              {agency.agencyName}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Branch
                        </label>
                        <select
                          value={watch("branchId") || ""}
                          disabled
                          className="w-full rounded-lg border border-slate-300 px-3 py-2.5 bg-slate-50 text-slate-500 cursor-not-allowed"
                        >
                          <option value="">Select Branch</option>
                          {branches.map((branch) => (
                            <option key={branch.id} value={branch.id}>
                              [{branch.branchCode}] {branch.branchName}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Advisor <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={
                            advisors.find((a) => a.id === watchAdvisorId)
                              ? `[${advisors.find((a) => a.id === watchAdvisorId)?.advisorCode}] ${advisors.find((a) => a.id === watchAdvisorId)?.advisorName}`
                              : ""
                          }
                          placeholder="Select Advisor"
                          readOnly
                          className="w-full rounded-lg border border-slate-300 px-3 py-2.5 bg-slate-50 text-slate-500 cursor-not-allowed"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Agent Code (Autofilled)
                        </label>
                        <input
                          type="text"
                          value={watch("agentCode") || ""}
                          readOnly
                          placeholder="Auto Filled"
                          className="w-full rounded-lg border border-slate-300 bg-slate-100 px-3 py-2.5 text-slate-500 cursor-not-allowed"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Medical
                        </label>
                        <input
                          type="text"
                          value={watch("medical") || ""}
                          placeholder="Medical Details"
                          readOnly
                          className="w-full rounded-lg border border-slate-300 px-3 py-2.5 bg-slate-50 text-slate-500 cursor-not-allowed"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Tax Beneficiary
                        </label>
                        <input
                          type="text"
                          value={watch("taxBeneficiary") || ""}
                          placeholder="Tax Beneficiary"
                          readOnly
                          className="w-full rounded-lg border border-slate-300 px-3 py-2.5 bg-slate-50 text-slate-500 cursor-not-allowed"
                        />
                      </div>
                      <div className="flex items-center mt-8">
                        <input
                          id="ageAdmitted"
                          type="checkbox"
                          className="h-5 w-5"
                          disabled
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
                          value={watch("notes") || ""}
                          rows={4}
                          placeholder="Enter Notes..."
                          readOnly
                          className="w-full rounded-lg border border-slate-300 px-3 py-2.5 resize-none bg-slate-50 text-slate-500 cursor-not-allowed"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CustomerSectionCard>
        </div>
      </div>
    </div>
  );
}
