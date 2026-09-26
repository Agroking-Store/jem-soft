"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useForm, Controller, FormProvider } from "react-hook-form";
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
  Activity,
  Building2,
  Calendar,
  Users,
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

import { policySchema, type PolicyFormValues } from "../new/schema";

export default function ViewLICPolicyPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const dispatch = useDispatch<AppDispatch>();

  const { selectedPolicy, isLoading, error } = useSelector(
    (state: RootState) => state.policies,
  );

  const methods = useForm<PolicyFormValues>({
    resolver: zodResolver(policySchema) as any,
    defaultValues: {
      riders: [],
      nominees: [],
    },
  });

  const { register, control, watch, reset, getValues } = methods;


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

    const insurerPolicyAttributes = selectedPolicy.policyAttributes || [];
    const getPolicyAttr = (code: string) =>
      insurerPolicyAttributes.find(
        (a: any) =>
          a.attribute?.attributeCode?.toLowerCase() === code.toLowerCase(),
      )?.value ?? "";

    const normalizeBooleanFromValue = (value: unknown) => {
      if (value === undefined || value === null || value === "") return false;

      const normalized = String(value).trim().toLowerCase();
      return ["true", "1", "yes", "y", "smoker"].includes(normalized);
    };

    const smokerValue = getPolicyAttr("smoker");
    const isSmoker = normalizeBooleanFromValue(smokerValue);

    const normalizeNumber = (value: unknown) => {
      if (value === undefined || value === null || value === "")
        return undefined;
      const numeric = Number(value);
      return Number.isFinite(numeric) ? numeric : undefined;
    };

    const optionValue =
      getPolicyAttr("option") ||
      getPolicyAttr("OPTION") ||
      (selectedPolicy.premium?.option != null
        ? String(selectedPolicy.premium.option)
        : "") ||
      "";

    const riderLookup = (selectedPolicy.policyRiders || []).map((r: any) => {
      const riderTerms = {
        term: normalizeNumber(
          r.term ?? r.rider?.term ?? r?.riderTerm ?? r?.rider?.riderTerm,
        ),
        ppt: normalizeNumber(
          r.ppt ?? r.rider?.ppt ?? r?.riderPpt ?? r?.rider?.riderPpt,
        ),
      };

      return {
        description: r.rider?.riderName ?? "",
        sum: normalizeNumber(r.riderAmount ?? r.sum ?? r.rider?.sum),
        premium: normalizeNumber(r.riderPremium ?? r.premium),
        term: riderTerms.term,
        ppt: riderTerms.ppt,
        mode: r.mode ?? selectedPolicy.premiumMode?.modeName ?? "",
      };
    });

    const riderTotal =
      (selectedPolicy.policyRiders || []).reduce(
        (sum: number, rider: any) => sum + (Number(rider.riderPremium) || 0),
        0,
      ) || undefined;

    const ageValue = selectedPolicy.CustomerMaster?.dob
      ? Math.floor(
          (Date.now() -
            new Date(selectedPolicy.CustomerMaster.dob).getTime()) /
            (365.25 * 24 * 60 * 60 * 1000),
        )
      : 0;

    const targetBankCustomer =
      (selectedPolicy as any).proposerId
        ? (selectedPolicy as any).proposer || masterCustomers.find((c: any) => c.id === (selectedPolicy as any).proposerId) || selectedPolicy.CustomerMaster
        : selectedPolicy.CustomerMaster;

    const targetBankDetails =
      targetBankCustomer?.bankDetails?.find((b: any) => b.isDefault) ||
      targetBankCustomer?.bankDetails?.[0] ||
      selectedPolicy.CustomerMaster?.bankDetails?.find((b: any) => b.isDefault) ||
      selectedPolicy.CustomerMaster?.bankDetails?.[0];

    const paymentModeCode = (selectedPolicy as any).paymentMode?.modeCode?.toUpperCase();
    const isPolicyNach = paymentModeCode === "NACH" || Boolean(targetBankDetails?.accountNumber && paymentModeCode !== "NEFT");
    const isPolicyNeft = paymentModeCode === "NEFT";

    reset({
      groupId: selectedPolicy.clientId ?? "",
      groupCode: selectedPolicy.customer?.groupCode ?? "",
      lifeAssuredId: selectedPolicy.CustomerMasterId ?? "",
      providerType:
        selectedPolicy.provider?.type ?? selectedPolicy.provider?.name ?? "",
      providerId: selectedPolicy.providerId ?? "",
      productId: selectedPolicy.productId ?? "",
      policyNumber: selectedPolicy.policyNumber ?? "",
      commencementDate: selectedPolicy.commencementDate?.substring(0, 10) ?? "",
      completionDate: selectedPolicy.maturityDate
        ? selectedPolicy.maturityDate.substring(0, 10)
        : "",
      advisorId: selectedPolicy.advisorId ?? "",
      agencyId: selectedPolicy.advisor?.agencyId ?? "",
      branchId: selectedPolicy.branchId ?? "",
      agentCode: selectedPolicy.agentCode ?? "",
      term: selectedPolicy.policyTerm ?? undefined,
      ppt: selectedPolicy.premiumPayingTerm ?? undefined,
      option: optionValue,
      mode: selectedPolicy.premiumMode?.modeName ?? selectedPolicy.mode ?? "",
      sumAssured: selectedPolicy.premium?.sumAssured ?? undefined,
      basicYearlyPremium:
        selectedPolicy.premium?.basicYearlyPremium ?? undefined,
      totalYearlyPremium:
        selectedPolicy.premium?.totalYearlyPremium ?? undefined,
      totalRiderPremium: riderTotal,
      installmentPremium:
        selectedPolicy.premium?.installmentPremium ?? undefined,
      totalInstallmentPremium:
        selectedPolicy.premium?.totalInstallmentPremium ?? undefined,
      gst: selectedPolicy.premium?.gst ?? undefined,
      statusId: selectedPolicy.statusId ?? "",
      fupDate: selectedPolicy.nextPremiumDueDate
        ? selectedPolicy.nextPremiumDueDate.substring(0, 10)
        : "",
      fuliDate: getPolicyAttr("fuliDate") || "",
      premiumAdjusted: selectedPolicy.premium?.extraClass?.toString() ?? "",
      dob: selectedPolicy.CustomerMaster?.dob
        ? new Date(selectedPolicy.CustomerMaster.dob)
            .toISOString()
            .substring(0, 10)
        : "",
      proposerDob: 
        (selectedPolicy as any).proposerId && targetBankCustomer?.dob
          ? new Date(targetBankCustomer.dob).toISOString().substring(0, 10)
          : "",
      proposerAge: 
        (selectedPolicy as any).proposerId && targetBankCustomer?.dob
          ? Math.floor(
              (Date.now() - new Date(targetBankCustomer.dob).getTime()) /
                (365.25 * 24 * 60 * 60 * 1000)
            )
          : undefined,
      age: ageValue || undefined,
      gender: selectedPolicy.CustomerMaster?.gender ?? "",
      pan: selectedPolicy.CustomerMaster?.panNumber ?? "",

      proposerId: (selectedPolicy as any).proposerId ?? "",
      spouseId: (selectedPolicy as any).spouseId ?? "",
      extraClass: selectedPolicy.premium?.extraClass?.toString() ?? "",
      ratePercent: (selectedPolicy.premium as any)?.ratePercent ?? undefined,

      loanTaken: getPolicyAttr("loanTaken") || "",
      annuityDetails: getPolicyAttr("annuityDetails") || "",
      otherInformation: selectedPolicy.remarks ?? "",
      bankName: isPolicyNach ? (targetBankDetails?.bankName ?? "") : "",
      bankBranch: isPolicyNach ? (targetBankDetails?.bankBranch ?? "") : "",
      city: isPolicyNach ? (targetBankDetails?.city ?? "") : "",
      accountType: isPolicyNach ? (targetBankDetails?.accountType ?? "") : "",
      accountNumber: isPolicyNach ? (targetBankDetails?.accountNumber ?? "") : "",
      ifscCode: isPolicyNach ? (targetBankDetails?.ifscCode ?? "") : "",
      micrNumber: isPolicyNach ? (targetBankDetails?.micrNumber ?? "") : "",
      accountHolderName: isPolicyNach
        ? (targetBankDetails?.accountHolderName || ((targetBankCustomer || selectedPolicy.CustomerMaster) ? getFullName((targetBankCustomer || selectedPolicy.CustomerMaster)!) : ""))
        : "",
      branchName: selectedPolicy.branch?.branchName ?? "",
      medical: getPolicyAttr("medical") || "",
      salesChannel: getPolicyAttr("salesChannel") || "",
      ageAdmitted: getPolicyAttr("ageAdmitted") || "",
      taxBeneficiary: getPolicyAttr("taxBeneficiary") || "",
      notes: selectedPolicy.remarks ?? "",
      smoker: isSmoker,
      riders: riderLookup,
      nominees:
        selectedPolicy.nominees?.map((nominee: any) => ({
          id: nominee.id,
          nomineeName: nominee.nomineeName ?? "",
          relationship: nominee.relationship ?? "",
          dateOfBirth: nominee.dateOfBirth
            ? nominee.dateOfBirth.substring(0, 10)
            : "",
          percentage: nominee.percentage ?? null,
          phone: nominee.phone ?? "",
          email: nominee.email ?? "",
        })) ?? [],
      neftBankName: isPolicyNeft ? (targetBankDetails?.bankName ?? "") : "",
      neftBankBranch: isPolicyNeft ? (targetBankDetails?.bankBranch ?? "") : "",
      neftAccountNumber: isPolicyNeft ? (targetBankDetails?.accountNumber ?? "") : "",
      neftIfscCode: isPolicyNeft ? (targetBankDetails?.ifscCode ?? "") : "",
      neftAccountHolderName: isPolicyNeft
        ? (targetBankDetails?.accountHolderName || ((targetBankCustomer || selectedPolicy.CustomerMaster) ? getFullName((targetBankCustomer || selectedPolicy.CustomerMaster)!) : ""))
        : "",
      neftSubmissionDate: getPolicyAttr("neftSubmissionDate") || "",
    } as any);
  }, [selectedPolicy, reset, masterCustomers]);

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

  const selectedPlanNumber = selectedProduct?.planNumber ?? "";
  const isSinglePremiumPlan = useMemo(() => {
    return ["717", "888", "883"].includes(selectedPlanNumber);
  }, [selectedPlanNumber]);

  const filteredModes = useMemo(() => {
    if (isSinglePremiumPlan) {
      return modes.filter(
        (m) =>
          m.modeName?.toLowerCase() === "single" ||
          m.modeCode?.toUpperCase() === "SIN",
      );
    }
    return modes;
  }, [modes, isSinglePremiumPlan]);
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
    <FormProvider {...methods}>
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
                      value={watch("mode") || (isSinglePremiumPlan ? "Single" : "Yearly")}
                      disabled
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-xl bg-slate-50 text-sm text-slate-500 cursor-not-allowed"
                    >
                      <option value="">Select Mode</option>
                      {filteredModes.map((mode) => (
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
                  {(selectedProduct?.planNumber === "774" || (watch("age") && parseFloat(String(watch("age"))) < 18) || !!watch("proposerId")) && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Proposer's Name
                        </label>
                        <input
                          type="text"
                          value={
                            masterCustomers.find(
                              (c: any) => c.id === watch("proposerId")
                            )
                              ? getFullName(
                                  masterCustomers.find(
                                    (c: any) => c.id === watch("proposerId")
                                  )!
                                )
                              : ""
                          }
                          readOnly
                          className="w-full px-3 py-2.5 border border-slate-200 rounded-xl bg-slate-50 text-sm text-slate-500 cursor-not-allowed"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Proposer DOB
                        </label>
                        <input
                          type="date"
                          value={watch("proposerDob") || ""}
                          readOnly
                          className="w-full px-3 py-2.5 border border-slate-200 rounded-xl bg-slate-50 text-sm text-slate-500 cursor-not-allowed"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Proposer Age
                        </label>
                        <input
                          type="number"
                          value={watch("proposerAge") || ""}
                          readOnly
                          className="w-full px-3 py-2.5 border border-slate-200 rounded-xl bg-slate-50 text-sm text-slate-500 cursor-not-allowed"
                        />
                      </div>
                    </>
                  )}

                  {(selectedProduct?.planNumber === "881" || selectedProduct?.planNumber === "912" || selectedProduct?.planNumber === "887") && (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Option <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={watch("option") ? `Option ${watch("option")}` : ""}
                        readOnly
                        className="w-full px-3 py-2.5 border border-slate-200 rounded-xl bg-slate-50 text-sm text-slate-500 cursor-not-allowed"
                      />
                    </div>
                  )}
                  {(selectedProduct?.planNumber === "888" || selectedProduct?.planNumber === "889") && (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Spouse's Name
                      </label>
                      <input
                        type="text"
                        value={
                          masterCustomers.find(
                            (c: any) => c.id === watch("spouseId")
                          )
                            ? getFullName(
                                masterCustomers.find(
                                  (c: any) => c.id === watch("spouseId")
                                )!
                              )
                            : ""
                        }
                        readOnly
                        className="w-full px-3 py-2.5 border border-slate-200 rounded-xl bg-slate-50 text-sm text-slate-500 cursor-not-allowed"
                      />
                    </div>
                  )}

                  {selectedProduct?.planNumber === "887" && (
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Smoker Status
                      </label>
                      <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-600">
                        <span
                          className={
                            watch("smoker")
                              ? "text-slate-500"
                              : "font-semibold text-slate-700"
                          }
                        >
                          Non-Smoker
                        </span>
                        <span
                          className={`inline-flex h-6 w-11 items-center rounded-full p-1 ${watch("smoker") ? "bg-[#B8873A]" : "bg-slate-300"}`}
                          aria-label="Smoker status"
                        >
                          <span
                            className={`h-4 w-4 rounded-full bg-white transition ${watch("smoker") ? "translate-x-5" : "translate-x-0"}`}
                          />
                        </span>
                        <span
                          className={
                            watch("smoker")
                              ? "font-semibold text-slate-700"
                              : "text-slate-500"
                          }
                        >
                          Smoker
                        </span>
                      </div>
                    </div>
                  )}
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

        <div
          ref={sectionRefs["advanced"]}
          className={`mt-6 space-y-4 transition-all duration-500 ${glowingSection === "advanced" ? "ring-2 ring-blue-500/30 rounded-2xl p-2" : ""}`}
        >
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-[#1877F2]">
              <Settings size={16} />
            </div>
            <div>
              <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-slate-700">
                Advanced Options
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Policy status, banking, nomination, annuity and agency details
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* ================= LEFT COLUMN ================= */}
            <div className="space-y-6">
              {/* ================= Current Status ================= */}
              <CustomerSectionCard
                title="Current Status"
                icon={Activity}
                subtitle="Check Current Status of Policy"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Policy Status
                    </label>
                    <input
                      type="text"
                      value={selectedPolicy.status?.statusName || (statuses.find(s => s.id === watch("statusId"))?.statusName) || ""}
                      readOnly
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-xl bg-slate-50 text-sm text-slate-700 cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      First Unpaid Premium (F.U.P.) Date
                    </label>
                    <input
                      type="text"
                      value={watch("fupDate") || ""}
                      readOnly
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-xl bg-slate-50 text-sm text-slate-700 cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Premium Adjusted
                    </label>
                    <input
                      type="text"
                      value={(selectedPolicy as any)?.premiumAdjusted || ""}
                      placeholder="Premium Adjusted"
                      readOnly
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-xl bg-slate-50 text-sm text-slate-700 cursor-not-allowed"
                    />
                  </div>
                  <div className="flex items-center gap-3 pt-6">
                    <input
                      id="premiumDeposit"
                      type="checkbox"
                      className="h-4 w-4 rounded border-slate-300 text-[#1877F2] cursor-not-allowed"
                      disabled
                    />
                    <label
                      htmlFor="premiumDeposit"
                      className="text-sm font-medium text-slate-700"
                    >
                      Create Premium Deposit Entries
                    </label>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Loan Taken
                    </label>
                    <input
                      type="text"
                      value={(selectedPolicy as any)?.loanTaken || ""}
                      placeholder="Loan Taken"
                      readOnly
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-xl bg-slate-50 text-sm text-slate-700 cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      First Unpaid Loan Int. (FULI) Date
                    </label>
                    <input
                      type="text"
                      value={watch("fuliDate") || ""}
                      readOnly
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-xl bg-slate-50 text-sm text-slate-700 cursor-not-allowed"
                    />
                  </div>
                </div>
              </CustomerSectionCard>

              {/* ================= NACH & NEFT ================= */}
              <CustomerSectionCard
                title="NACH & NEFT Details"
                icon={Building2}
                subtitle="Provide NACH / NEFT Details for Bank Transactions"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2 flex items-center gap-3">
                    <input
                      id="useNachCheckbox"
                      type="checkbox"
                      checked={Boolean(watch("bankName") || watch("accountNumber") || (selectedPolicy as any)?.paymentMode?.modeCode === "NACH")}
                      disabled
                      className="h-4 w-4 rounded border-slate-300 text-[#1877F2] cursor-not-allowed"
                    />
                    <label
                      htmlFor="useNachCheckbox"
                      className="text-sm font-medium text-slate-700"
                    >
                      NACH Details
                    </label>
                  </div>

                  {Boolean(watch("bankName") || watch("accountNumber") || (selectedPolicy as any)?.paymentMode?.modeCode === "NACH") && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Bank Name
                        </label>
                        <input
                          type="text"
                          value={watch("bankName") || ""}
                          placeholder="Bank Name"
                          readOnly
                          className="w-full px-3 py-2.5 border border-slate-200 rounded-xl bg-slate-50 text-sm text-slate-700 cursor-not-allowed"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Account Number
                        </label>
                        <input
                          type="text"
                          value={watch("accountNumber") || ""}
                          placeholder="Account Number"
                          readOnly
                          className="w-full px-3 py-2.5 border border-slate-200 rounded-xl bg-slate-50 text-sm text-slate-700 cursor-not-allowed"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          IFSC Code
                        </label>
                        <input
                          type="text"
                          value={watch("ifscCode") || ""}
                          placeholder="IFSC Code"
                          readOnly
                          className="w-full px-3 py-2.5 border border-slate-200 rounded-xl bg-slate-50 text-sm text-slate-700 cursor-not-allowed"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Account Holder Name
                        </label>
                        <input
                          type="text"
                          value={watch("accountHolderName") || ""}
                          placeholder="Account Holder Name"
                          readOnly
                          className="w-full px-3 py-2.5 border border-slate-200 rounded-xl bg-slate-50 text-sm text-slate-700 cursor-not-allowed"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Bank Branch
                        </label>
                        <input
                          type="text"
                          value={watch("bankBranch") || ""}
                          placeholder="Bank Branch"
                          readOnly
                          className="w-full px-3 py-2.5 border border-slate-200 rounded-xl bg-slate-50 text-sm text-slate-700 cursor-not-allowed"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          City
                        </label>
                        <input
                          type="text"
                          value={watch("city") || ""}
                          placeholder="City"
                          readOnly
                          className="w-full px-3 py-2.5 border border-slate-200 rounded-xl bg-slate-50 text-sm text-slate-700 cursor-not-allowed"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Account Type
                        </label>
                        <input
                          type="text"
                          value={watch("accountType") || ""}
                          placeholder="Account Type"
                          readOnly
                          className="w-full px-3 py-2.5 border border-slate-200 rounded-xl bg-slate-50 text-sm text-slate-700 cursor-not-allowed"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Debt Date
                        </label>
                        <input
                          value={watch("fupDate") || ""}
                          readOnly
                          className="w-full px-3 py-2.5 border border-slate-200 rounded-xl bg-slate-50 text-sm text-slate-500 cursor-not-allowed"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          MICR Number
                        </label>
                        <input
                          type="text"
                          value={watch("micrNumber") || ""}
                          placeholder="MICR Number"
                          readOnly
                          className="w-full px-3 py-2.5 border border-slate-200 rounded-xl bg-slate-50 text-sm text-slate-700 cursor-not-allowed"
                        />
                      </div>
                    </>
                  )}

                  {/* NEFT Section */}
                  <div className="md:col-span-2 my-2 border-t border-slate-200"></div>

                  <div className="md:col-span-2 flex items-center gap-3">
                    <input
                      id="useNeftCheckbox"
                      type="checkbox"
                      checked={Boolean(watch("neftBankName") || watch("neftAccountNumber") || (selectedPolicy as any)?.paymentMode?.modeCode === "NEFT")}
                      disabled
                      className="h-4 w-4 rounded border-slate-300 text-[#1877F2] cursor-not-allowed"
                    />
                    <label
                      htmlFor="useNeftCheckbox"
                      className="text-sm font-medium text-slate-700"
                    >
                      NEFT Details
                    </label>
                  </div>

                  {Boolean(watch("neftBankName") || watch("neftAccountNumber") || (selectedPolicy as any)?.paymentMode?.modeCode === "NEFT") && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Bank Name
                        </label>
                        <input
                          type="text"
                          value={watch("neftBankName") || ""}
                          placeholder="Bank Name"
                          readOnly
                          className="w-full px-3 py-2.5 border border-slate-200 rounded-xl bg-slate-50 text-sm text-slate-700 cursor-not-allowed"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Account Number
                        </label>
                        <input
                          type="text"
                          value={watch("neftAccountNumber") || ""}
                          placeholder="Account Number"
                          readOnly
                          className="w-full px-3 py-2.5 border border-slate-200 rounded-xl bg-slate-50 text-sm text-slate-700 cursor-not-allowed"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          IFSC Code
                        </label>
                        <input
                          type="text"
                          value={watch("neftIfscCode") || ""}
                          placeholder="IFSC Code"
                          readOnly
                          className="w-full px-3 py-2.5 border border-slate-200 rounded-xl bg-slate-50 text-sm text-slate-700 cursor-not-allowed"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Account Holder Name
                        </label>
                        <input
                          type="text"
                          value={watch("neftAccountHolderName") || ""}
                          placeholder="Account Holder Name"
                          readOnly
                          className="w-full px-3 py-2.5 border border-slate-200 rounded-xl bg-slate-50 text-sm text-slate-700 cursor-not-allowed"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Bank Branch
                        </label>
                        <input
                          type="text"
                          value={watch("neftBankBranch") || ""}
                          placeholder="Bank Branch"
                          readOnly
                          className="w-full px-3 py-2.5 border border-slate-200 rounded-xl bg-slate-50 text-sm text-slate-700 cursor-not-allowed"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Submission Date
                        </label>
                        <input
                          type="text"
                          value={watch("neftSubmissionDate") || ""}
                          readOnly
                          className="w-full px-3 py-2.5 border border-slate-200 rounded-xl bg-slate-50 text-sm text-slate-500 cursor-not-allowed"
                        />
                      </div>
                    </>
                  )}
                </div>
              </CustomerSectionCard>
            </div>

            {/* ================= RIGHT COLUMN ================= */}
            <div className="space-y-6">
              {/* ================= Nomination Details ================= */}
              <CustomerSectionCard
                title="Nomination Details"
                icon={Users}
                subtitle="Assign Policy Beneficiaries"
              >
                {selectedPolicy.nominees && selectedPolicy.nominees.length > 0 ? (
                  <div className="space-y-4">
                    {selectedPolicy.nominees.map((nominee: any, index: number) => (
                      <div
                        key={nominee.id || index}
                        className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 relative space-y-3"
                      >
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-medium text-slate-700 mb-1">
                              Nominee Name
                            </label>
                            <input
                              type="text"
                              value={nominee.nomineeName || ""}
                              readOnly
                              className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-sm text-slate-700 cursor-not-allowed"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-700 mb-1">
                              Relationship
                            </label>
                            <input
                              type="text"
                              value={nominee.relationship || ""}
                              readOnly
                              className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-sm text-slate-700 cursor-not-allowed"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-700 mb-1">
                              Date of Birth
                            </label>
                            <input
                              type="text"
                              value={nominee.dateOfBirth ? nominee.dateOfBirth.substring(0, 10) : ""}
                              readOnly
                              className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-sm text-slate-700 cursor-not-allowed"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-700 mb-1">
                              Share %
                            </label>
                            <input
                              type="text"
                              value={nominee.percentage != null ? String(nominee.percentage) : ""}
                              readOnly
                              className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-sm text-slate-700 cursor-not-allowed"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-700 mb-1">
                              Phone
                            </label>
                            <input
                              type="tel"
                              value={nominee.phone || ""}
                              readOnly
                              className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-sm text-slate-700 cursor-not-allowed"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-700 mb-1">
                              Email
                            </label>
                            <input
                              type="email"
                              value={nominee.email || ""}
                              readOnly
                              className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-sm text-slate-700 cursor-not-allowed"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 text-center py-6">
                    No nominees added.
                  </p>
                )}
              </CustomerSectionCard>

              {/* ================= Annuity Details ================= */}
              <CustomerSectionCard
                title="Annuity Details"
                icon={Calendar}
                subtitle="Annuity Policy Configuration"
              >
                <div className="py-2">
                  <p className="text-sm text-slate-500">
                    This will be enabled for Annuity Policies.
                  </p>
                </div>
              </CustomerSectionCard>

              {/* ================= Other Information ================= */}
              <CustomerSectionCard
                title="Other Information"
                icon={FileText}
                subtitle="Agency, Branch, Notes & Other Policy Information"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Agency <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={agencies.find((a) => a.id === watchAgencyId)?.agencyName || watchAgencyId || ""}
                      readOnly
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-xl bg-slate-50 text-sm text-slate-700 cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Branch
                    </label>
                    <input
                      type="text"
                      value={selectedPolicy.branch ? `[${selectedPolicy.branch.branchCode}] ${selectedPolicy.branch.branchName}` : ((selectedPolicy as any)?.branchName || "")}
                      readOnly
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-xl bg-slate-50 text-sm text-slate-700 cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Advisor <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={
                        advisors.find((a) => a.id === watchAdvisorId)
                          ? `[${advisors.find((a) => a.id === watchAdvisorId)?.advisorCode}] ${advisors.find((a) => a.id === watchAdvisorId)?.advisorName}`
                          : ""
                      }
                      readOnly
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-xl bg-slate-50 text-sm text-slate-700 cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Agent Code (Autofilled)
                    </label>
                    <input
                      type="text"
                      value={watch("agentCode") || ""}
                      readOnly
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-xl bg-slate-50 text-sm text-slate-500 cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Medical
                    </label>
                    <input
                      type="text"
                      value={(selectedPolicy as any)?.medical || ""}
                      placeholder="Medical Details"
                      readOnly
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-xl bg-slate-50 text-sm text-slate-700 cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Tax Beneficiary
                    </label>
                    <input
                      type="text"
                      value={(selectedPolicy as any)?.taxBeneficiary || ""}
                      placeholder="Tax Beneficiary"
                      readOnly
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-xl bg-slate-50 text-sm text-slate-700 cursor-not-allowed"
                    />
                  </div>
                  <div className="flex items-center gap-3 pt-6">
                    <input
                      id="ageAdmitted"
                      type="checkbox"
                      checked={Boolean((getValues as any)("ageAdmitted"))}
                      disabled
                      className="h-4 w-4 rounded border-slate-300 text-[#1877F2] cursor-not-allowed"
                    />
                    <label htmlFor="ageAdmitted" className="text-sm font-medium text-slate-700">
                      Age Admitted
                    </label>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Notes
                    </label>
                    <textarea
                      value={selectedPolicy?.remarks || (getValues as any)("notes") || ""}
                      rows={4}
                      placeholder="Enter Notes..."
                      readOnly
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-xl bg-slate-50 text-sm text-slate-700 cursor-not-allowed resize-none"
                    />
                  </div>
                </div>
              </CustomerSectionCard>
            </div>
          </div>
        </div>
      </div>
    </div>
    </FormProvider>
  );
}
