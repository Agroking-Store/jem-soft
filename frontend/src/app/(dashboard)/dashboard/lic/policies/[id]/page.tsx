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
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeft,
  User,
  DollarSign,
  FileText,
  ChevronDown,
  ChevronRight,
  Shield,
  Settings,
  Search,
  AlertCircle,
} from "lucide-react";
import toast from "react-hot-toast";

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

// Read-only Group Display
const GroupDisplay = ({
  value,
  groups,
}: {
  value: string;
  groups: {
    id: string;
    groupCode?: string | null;
    groupName?: string | null;
  }[];
}) => {
  const selected = groups.find((g) => g.id === value);

  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">
        Group Name <span className="text-red-500">*</span>
      </label>
      <div className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-sm text-slate-700">
        {selected
          ? `${selected.groupCode ? `[${selected.groupCode}] ` : ""}${selected.groupName || "—"}`
          : "—"}
      </div>
    </div>
  );
};

// Read-only Advisor Display
const AdvisorDisplay = ({
  value,
  advisors,
}: {
  value: string;
  advisors: { id: string; advisorCode: string; advisorName: string }[];
}) => {
  const selected = advisors.find((a) => a.id === value);

  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">
        Advisor
      </label>
      <div className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-sm text-slate-700">
        {selected ? `[${selected.advisorCode}] ${selected.advisorName}` : "—"}
      </div>
    </div>
  );
};

const riderSchema = z.object({
  description: z.string().optional(),
  sum: z.number().nullable().optional(),
  term: z.number().nullable().optional(),
  ppt: z.number().nullable().optional(),
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

  policyStatus: z.string().optional(),
  fupDate: z.string().optional(),
  premiumAdjusted: z.string().optional(),
  loanTaken: z.string().optional(),
  annuityDetails: z.string().optional(),
  otherInformation: z.string().optional(),
  bankName: z.string().optional(),
  accountNumber: z.string().optional(),
  ifscCode: z.string().optional(),
  accountHolderName: z.string().optional(),
  branchName: z.string().optional(),
  medical: z.string().optional(),
  salesChannel: z.string().optional(),
  ageAdmitted: z.string().optional(),
  taxBeneficiary: z.string().optional(),
  notes: z.string().optional(),
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

  const [activeSection, setActiveSection] = useState("policy-holder");
  const [showAdvanced, setShowAdvanced] = useState(false);
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

      policyStatus: selectedPolicy.status?.statusName ?? "",
      fupDate: selectedPolicy.nextPremiumDueDate
        ? selectedPolicy.nextPremiumDueDate.substring(0, 10)
        : "",
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
      accountHolderName: "",
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

  const selectedGroup = useMemo(
    () => groups.find((g) => g.id === watchGroupId),
    [watchGroupId, groups],
  );

  const groupMembers = useMemo(() => {
    if (!watchGroupId) return [];
    return masterCustomers.filter((m) => m.groupId === watchGroupId);
  }, [watchGroupId, masterCustomers]);

  const providerTypes = useMemo(() => {
    return [...new Set(providers.map((p) => p.type))];
  }, [providers]);

  const filteredProviders = useMemo(() => {
    if (!watchProviderType) return [];
    return providers.filter((p) => p.type === watchProviderType);
  }, [watchProviderType, providers]);

  const filteredProducts = useMemo(() => {
    if (!watchProviderId) return [];
    return products
      .filter((p) => p.providerId === watchProviderId)
      .sort((a, b) => (a.planNumber ?? "").localeCompare(b.planNumber ?? ""));
  }, [watchProviderId, products]);

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

  if (isLoading) {
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
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-gap-3">
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
      <div className="flex items-center gap-4 mb-6">
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
      <div>
        {/* Section 1: Policy Holder's Details */}
        <div
          ref={sectionRefs["policy-holder"]}
          className={`bg-white border border-slate-200 rounded-xl p-6 transition-all duration-500 ${
            glowingSection === "policy-holder"
              ? "shadow-lg shadow-blue-500/20"
              : ""
          }`}
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <User size={20} className="text-blue-600" />
              Policy Holder's Details
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <Controller
                name="groupId"
                control={control}
                render={({ field }) => (
                  <GroupDisplay value={field.value || ""} groups={groups} />
                )}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Group Code
              </label>
              <div className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-sm text-slate-700">
                {selectedGroup?.groupCode || "—"}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Life Assured
              </label>
              <div className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-sm text-slate-700">
                {selectedLifeAssured ? getFullName(selectedLifeAssured) : "—"}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Date of Birth
              </label>
              <div className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-sm text-slate-700">
                {watch("dob") || "—"}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Age
              </label>
              <div className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-sm text-slate-700">
                {watch("age") || "—"}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Gender
              </label>
              <div className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-sm text-slate-700">
                {watch("gender") || "—"}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                PAN Regi.
              </label>
              <div className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-sm text-slate-700">
                {watch("pan") || "—"}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Section 2: Policy Details */}
            <div
              ref={sectionRefs["policy-details"]}
              className={`bg-white border border-slate-200 rounded-xl p-6 transition-all duration-500 ${
                glowingSection === "policy-details"
                  ? "shadow-lg shadow-blue-500/20"
                  : ""
              }`}
            >
              <h2 className="text-lg font-semibold text-slate-900 mb-6 flex items-center gap-2">
                <FileText size={20} className="text-blue-600" />
                Policy Details
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Provider Type
                  </label>
                  <div className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-sm text-slate-700">
                    {watch("providerType") || "—"}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Provider Name
                  </label>
                  <div className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-sm text-slate-700">
                    {selectedProvider?.name || "—"}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Policy Number
                  </label>
                  <div className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-sm text-slate-700">
                    {watch("policyNumber") || "—"}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Plan
                  </label>
                  <div className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-sm text-slate-700">
                    {selectedProduct
                      ? `${selectedProduct.planNumber ? `[${selectedProduct.planNumber}] ` : ""}${selectedProduct.productName}`
                      : "—"}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Mode
                  </label>
                  <div className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-sm text-slate-700">
                    {selectedMode?.modeName || "—"}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Commencement Date
                  </label>
                  <div className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-sm text-slate-700">
                    {watch("commencementDate") || "—"}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Completion Date
                  </label>
                  <div className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-sm text-slate-700">
                    {watch("completionDate") || "—"}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Term
                  </label>
                  <div className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-sm text-slate-700">
                    {watch("term") || "—"}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    PPT
                  </label>
                  <div className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-sm text-slate-700">
                    {watch("ppt") || "—"}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Extra Class
                  </label>
                  <div className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-sm text-slate-700">
                    {watch("extraClass") || "—"}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Rate %
                  </label>
                  <div className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-sm text-slate-700">
                    {watch("ratePercent") || "—"}
                  </div>
                </div>
              </div>
            </div>

            {/* Section 4: Riders Details */}
            <div
              ref={sectionRefs["riders"]}
              className={`bg-white border border-slate-200 rounded-xl p-6 transition-all duration-500 ${
                glowingSection === "riders"
                  ? "shadow-lg shadow-blue-500/20"
                  : ""
              }`}
            >
              <h2 className="text-lg font-semibold text-slate-900 mb-6 flex items-center gap-2">
                <Shield size={20} className="text-blue-600" />
                Riders Details
              </h2>
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
                        Premium
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {riderData.length === 0 ? (
                      <tr>
                        <td
                          colSpan={3}
                          className="px-4 py-6 text-center text-slate-500 text-sm"
                        >
                          No Riders
                        </td>
                      </tr>
                    ) : (
                      riderData.map((rider, index) => (
                        <tr key={index}>
                          <td className="px-4 py-3 text-sm text-slate-700">
                            {rider.description || "—"}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-700">
                            {rider.sum || "—"}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-700">
                            {rider.premium || "—"}
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
              ref={sectionRefs["premium-calculation"]}
              className={`bg-white border border-slate-200 rounded-xl p-6 sticky top-6 transition-all duration-500 ${
                glowingSection === "premium-calculation"
                  ? "shadow-lg shadow-blue-500/20"
                  : ""
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
                  <div className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-sm text-slate-700">
                    {watch("sumAssured") || "—"}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Basic Yearly Premium
                  </label>
                  <div className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-sm text-slate-700">
                    {watch("basicYearlyPremium") || "—"}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Total Yearly Premium
                  </label>
                  <div className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-sm text-slate-700">
                    {watch("totalYearlyPremium") || "—"}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Total Rider Premium
                  </label>
                  <div className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-sm text-slate-700">
                    {watch("totalRiderPremium") || "—"}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Installment Premium
                  </label>
                  <div className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-sm text-slate-700">
                    {watch("installmentPremium") || "—"}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Rate %
                  </label>
                  <div className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-sm text-slate-700">
                    {watch("ratePercent") || "—"}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    GST
                  </label>
                  <div className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-sm text-slate-700">
                    {watch("gst") || "—"}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Total Installment Premium
                  </label>
                  <div className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-sm text-slate-700">
                    {watch("totalInstallmentPremium") || "—"}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div
          ref={sectionRefs["advanced"]}
          className={`bg-white border border-slate-200 rounded-xl p-6 mt-6 transition-all duration-500 ${
            glowingSection === "advanced" ? "shadow-lg shadow-blue-500/20" : ""
          }`}
        >
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center justify-between w-full text-left"
          >
            <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <Settings size={20} className="text-blue-600" />
              Advanced Options
            </h2>
            {showAdvanced ? (
              <ChevronDown size={20} />
            ) : (
              <ChevronRight size={20} />
            )}
          </button>

          {showAdvanced && (
            <div className="mt-6 grid grid-cols-1 gap-6">
              <div className="border border-slate-200 rounded-lg p-4">
                <h3 className="text-base font-semibold text-slate-800 mb-4">
                  Current Status
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Policy Status
                    </label>
                    <div className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-sm text-slate-700">
                      {watch("policyStatus") || "—"}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Premium Adjusted
                    </label>
                    <div className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-sm text-slate-700">
                      {watch("premiumAdjusted") || "—"}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Loan Taken
                    </label>
                    <div className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-sm text-slate-700">
                      {watch("loanTaken") || "—"}
                    </div>
                  </div>
                </div>
              </div>

              <div className="border border-slate-200 rounded-lg p-4">
                <h3 className="text-base font-semibold text-slate-800 mb-4">
                  Check Current Status of Policy
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      First Unpaid Premium (F.U.P.) Date
                    </label>
                    <div className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-sm text-slate-700">
                      {watch("fupDate") || "—"}
                    </div>
                  </div>
                </div>
              </div>

              <div className="border border-slate-200 rounded-lg p-4">
                <h3 className="text-base font-semibold text-slate-800 mb-4">
                  Nomination Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Annuity Details
                    </label>
                    <div className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-sm text-slate-700">
                      {watch("annuityDetails") || "—"}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Other Information
                    </label>
                    <div className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-sm text-slate-700">
                      {watch("otherInformation") || "—"}
                    </div>
                  </div>
                </div>
                {selectedPolicy.nominees &&
                  selectedPolicy.nominees.length > 0 && (
                    <div className="mt-4">
                      <h4 className="text-sm font-semibold text-slate-800 mb-3">
                        Nominee Summary
                      </h4>
                      <div className="space-y-3">
                        {selectedPolicy.nominees.map((nominee: any) => (
                          <div
                            key={nominee.id}
                            className="rounded-lg border border-slate-200 bg-slate-50 p-3"
                          >
                            <div className="text-sm text-slate-700 font-semibold">
                              {nominee.nomineeName}
                            </div>
                            <div className="text-xs text-slate-500">
                              {nominee.relationship} •{" "}
                              {nominee.percentage ?? "—"}%
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
              </div>

              <div className="border border-slate-200 rounded-lg p-4">
                <h3 className="text-base font-semibold text-slate-800 mb-4">
                  Advisor Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Controller
                      name="advisorId"
                      control={control}
                      render={({ field }) => (
                        <AdvisorDisplay
                          value={field.value || ""}
                          advisors={advisors}
                        />
                      )}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Agent Code
                    </label>
                    <div className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-sm text-slate-700">
                      {watch("agentCode") || "—"}
                    </div>
                  </div>
                </div>
              </div>

              <div className="border border-slate-200 rounded-lg p-4">
                <h3 className="text-base font-semibold text-slate-800 mb-4">
                  NACH & NEFT Details
                </h3>
                <p className="text-sm text-slate-500 mb-4">
                  Provide NACH / NEFT Details for Bank Transactions
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Bank Name
                    </label>
                    <div className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-sm text-slate-700">
                      {watch("bankName") || "—"}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Account Number
                    </label>
                    <div className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-sm text-slate-700">
                      {watch("accountNumber") || "—"}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      IFSC Code
                    </label>
                    <div className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-sm text-slate-700">
                      {watch("ifscCode") || "—"}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Account Holder Name
                    </label>
                    <div className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-sm text-slate-700">
                      {watch("accountHolderName") || "—"}
                    </div>
                  </div>
                </div>
              </div>

              <div className="border border-slate-200 rounded-lg p-4">
                <h3 className="text-base font-semibold text-slate-800 mb-4">
                  Additional Fields
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Branch
                    </label>
                    <div className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-sm text-slate-700">
                      {watch("branchName") || "—"}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Medical
                    </label>
                    <div className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-sm text-slate-700">
                      {watch("medical") || "—"}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Sales Channel
                    </label>
                    <div className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-sm text-slate-700">
                      {watch("salesChannel") || "—"}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Age Admitted
                    </label>
                    <div className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-sm text-slate-700">
                      {watch("ageAdmitted") || "—"}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Tax Beneficiary
                    </label>
                    <div className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-sm text-slate-700">
                      {watch("taxBeneficiary") || "—"}
                    </div>
                  </div>
                  <div className="lg:col-span-3">
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Notes
                    </label>
                    <div className="w-full min-h-[90px] px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-sm text-slate-700">
                      {watch("notes") || "—"}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Sticky Footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 flex justify-end gap-3">
        <button
          onClick={() => router.push("/dashboard/lic/policies")}
          className="px-6 py-2 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition text-sm font-medium"
        >
          Back
        </button>
      </div>
    </div>
  );
}
