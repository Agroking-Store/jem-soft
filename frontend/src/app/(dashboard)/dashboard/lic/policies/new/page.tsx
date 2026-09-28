"use client";

import { useState, useEffect, useRef, useMemo, useCallback, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import axios from "axios";
import { useAuth } from "@/features/auth/hooks/useAuth";
import {
  useForm,
  useFieldArray,
  Controller,
  FormProvider,
  type SubmitHandler,
  type Resolver,
} from "react-hook-form";
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
  FileText,
  Plus,
  Trash2,
  ChevronRight,
  Shield,
  Settings,
  Search,
  Banknote,
  Activity,
  Building2,
  Users,
  Calendar,
} from "lucide-react";
import toast from "react-hot-toast";
import DatePicker from "./DatePicker";
import { format, addYears, differenceInYears, isValid } from "date-fns";

import { getFullName, GroupAutoComplete, AdvisorAutoComplete, LifeAssuredAutoComplete, BranchAutoComplete } from "./components/AutoCompleteSelects";
import { PolicyHolderSection } from "./components/PolicyHolderSection";
import {
  CustomerSectionCard,
  SearchableSelect,
  type SelectOption,
} from "@/features/customers/components/CustomerUi";

import { riderSchema, nomineeSchema, policySchema, type PolicyFormValues } from "./schema";

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
  const { values: productAttributeValues, isLoading: attributesLoading } =
    useSelector((s: RootState) => s.productAttributeValues);
  const { policies, isLoading: policiesLoading } = useSelector(
    (s: RootState) => s.policies,
  );

  const [activeSection, setActiveSection] = useState("policy-holder");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [glowingSection, setGlowingSection] = useState<string | null>(null);
  const [useNach, setUseNach] = useState(false);
  const [useNeft, setUseNeft] = useState(false);
  const { fetchNotifications } = useNotificationStore();
  const [attributeHints, setAttributeHints] = useState({
    term: "",
    ppt: "",
    sumAssured: "",
    age: "",
  });
  const [productOptionsData, setProductOptionsData] = useState<{ terms: number[], ppts: number[], combinations: { term: number, ppt: number }[] }>({ terms: [], ppts: [], combinations: [] });
  const policyTypeParam = searchParams.get("policyType")?.toLowerCase();
  const selectedPolicyType =
    policyTypeParam === "other"
      ? "other"
      : policyTypeParam === "lic"
        ? "lic"
        : null;

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

  const methods = useForm<PolicyFormValues>({
    resolver: async (values, context, options) => {
      const isOther =
        selectedPolicyType === "other" || values.providerType === "OTHER";
      if (isOther) {
        return zodResolver(policySchema as any)(
          values as any,
          context as any,
          options as any,
        ) as any;
      }

      let refinedSchema = policySchema.refine(
        (data) => !data.policyNumber || /^\d{9}$/.test(data.policyNumber),
        {
          message: "Policy number must be exactly 9 digits.",
          path: ["policyNumber"],
        },
      );

      const selectedProductAttributes = productAttributeValues.filter(
        (attr) => attr.productId === values.productId,
      );
      const getAttributeValue = (code: string) =>
        selectedProductAttributes.find(
          (a) => a.attribute.attributeCode === code,
        )?.value;

      const minTerm = getAttributeValue("MIN_POLICY_TERM");
      const maxTerm = getAttributeValue("MAX_POLICY_TERM");
      if (minTerm || maxTerm) {
        refinedSchema = refinedSchema.refine(
          (data) => {
            if (!data.term) return true;
            const term = Number(data.term);
            if (minTerm && term < Number(minTerm)) return false;
            if (maxTerm && term > Number(maxTerm)) return false;
            return true;
          },
          {
            message: `Term must be between ${minTerm || "N/A"} and ${maxTerm || "N/A"}.`,
            path: ["term"],
          },
        );
      }

      if (maxTerm) {
        refinedSchema = refinedSchema.refine(
          (data) => {
            if (!data.commencementDate || !data.completionDate) return true;
            try {
              const startDate = new Date(data.commencementDate);
              const endDate = new Date(data.completionDate);
              const diffYears =
                (endDate.getTime() - startDate.getTime()) /
                (1000 * 60 * 60 * 24 * 365.25);
              return diffYears <= Number(maxTerm);
            } catch (e) {
              return true; // Don't block if dates are invalid, other validators will catch it
            }
          },
          {
            message: `The duration between commencement and completion cannot exceed the maximum term of ${maxTerm} years.`,
            path: ["completionDate"],
          },
        );
      }

      const selectedProductPlan = products.find(
        (product) => product.id === values.productId,
      )?.planNumber;
      if (selectedProductPlan === "881" || selectedProductPlan === "912") {
        refinedSchema = refinedSchema.refine((data) => Boolean(data.option), {
          message: "Option is required for this plan.",
          path: ["option"],
        });
      }
      if (selectedProductPlan === "888" || selectedProductPlan === "889") {
        refinedSchema = refinedSchema
          .refine((data) => Boolean(data.spouseId), {
            message: "Spouse is required for this plan.",
            path: ["spouseId"],
          })
          .refine((data) => data.spouseAge != null, {
            message: "Spouse age is required for this plan.",
            path: ["spouseAge"],
          })
          .refine((data) => Boolean(data.option), {
            message: "Option is required for this plan.",
            path: ["option"],
          });
      }
      if (selectedProductPlan === "889" || selectedProductPlan === "881" || selectedProductPlan === "912") {
        refinedSchema = refinedSchema.refine((data) => data.ppt != null, {
          message: `PPT is required for LIC Plan ${selectedProductPlan}.`,
          path: ["ppt"],
        });
      }
      if (selectedProductPlan === "774") {
        refinedSchema = refinedSchema
          .refine((data) => Boolean(data.proposerId), {
            message: "Proposer is required for this plan.",
            path: ["proposerId"],
          })
          .refine((data) => data.proposerAge != null, {
            message: "Proposer age is required for this plan.",
            path: ["proposerAge"],
          })
          .refine((data) => Boolean(data.option), {
            message: "Option is required for this plan.",
            path: ["option"],
          });
      }
      if (selectedProductPlan === "887") {
        refinedSchema = refinedSchema
          .refine((data) => Boolean(data.option), {
            message: "Option is required for this plan.",
            path: ["option"],
          })
          .refine(
            (data) => {
              if (!data.term || !data.age) return true;
              const term = Number(data.term);
              const age = Number(data.age);
              const maxAllowed = Math.min(82, 100 - age);
              return term >= 10 && term <= maxAllowed;
            },
            {
              message: "Term must be between 10 and 100 minus age (maximum 82).",
              path: ["term"],
            },
          );
      }

      const minSum = getAttributeValue("MIN_SUM_ASSURED");
      const maxSum = getAttributeValue("MAX_SUM_ASSURED");
      if (minSum || maxSum) {
        refinedSchema = refinedSchema.refine(
          (data) => {
            if (!data.sumAssured) return true;
            const sum = Number(data.sumAssured);
            if (minSum && sum < Number(minSum)) return false;
            if (maxSum && sum > Number(maxSum)) return false;
            return true;
          },
          {
            message: `Sum Assured must be between ${minSum || "N/A"} and ${maxSum || "N/A"}.`,
            path: ["sumAssured"],
          },
        );
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
          {
            message: `PPT must be between ${minPpt || "N/A"} and ${maxPpt || "N/A"}.`,
            path: ["ppt"],
          },
        );
      }

      return zodResolver(refinedSchema as any)(
        values as any,
        context as any,
        options as any,
      ) as any;
    },
    defaultValues: {
      providerType: selectedPolicyType === "other" ? "OTHER" : "LIC",
      mode: "Yearly",
      riders: [],
      nominees: [],
    },
  });

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    clearErrors,
    setError,
    formState: { errors },
  } = methods;

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
    replace: replaceRiders,
    update: updateRider,
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
  const watchSpouseId = watch("spouseId");
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
  const watchAge = watch("age");
  const watchSpouseAge = watch("spouseAge");
  const watchProposerId = watch("proposerId");
  const watchProposerAge = watch("proposerAge");
  const watchOption = watch("option");
  const watchFupDate = watch("fupDate");
  const watchPolicyNumber = watch("policyNumber");
  const watchSmoker = watch("smoker");
  const watchGender = watch("gender");
  const watchInstallmentPremium = watch("installmentPremium");
  const watchGst = watch("gst");
  const watchProviderType = watch("providerType");
  const isOtherPolicy =
    selectedPolicyType === "other" || watchProviderType === "OTHER";
  const [selectedCompanyFilter, setSelectedCompanyFilter] = useState<string>("");

  useEffect(() => {
    if (selectedPolicyType === "other") {
      setValue("providerType", "OTHER");
    } else if (selectedPolicyType === "lic") {
      setValue("providerType", "LIC");
    }
  }, [selectedPolicyType, setValue]);

  const watchProductId = watch("productId");
  const premiumPreviewKey = [
    watchProductId ?? "",
    watchAge ?? "",
    watchSpouseAge ?? "",
    watchProposerAge ?? "",
    watchOption ?? "",
    watchMode ?? "",
    watchPpt ?? "",
    watchSumAssured ?? "",
    watchTerm ?? "",
    watchTotalRiderPremium ?? "",
    watchSmoker ?? "",
    watchGender ?? "",
  ].join("::");
  const selectedGroup = useMemo(
    () => groups.find((g) => g.id === watchGroupId),
    [watchGroupId, groups],
  );

  const selectedProduct = useMemo(
    () => products.find((p) => p.id === watchProductId),
    [watchProductId, products],
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
    setValue("proposerId", "");
  }, [watchGroupId, selectedGroup, setValue]);

  useEffect(() => {
    const member = masterCustomers.find((m) => m.id === watchLifeAssuredId);
    setValue(
      "dob",
      member?.dob ? new Date(member.dob).toISOString().split("T")[0] : "",
    );
    setValue(
      "age",
      member?.dob ? differenceInYears(new Date(), new Date(member.dob)) : (undefined as any),
    );
    setValue("gender", member?.gender || "");
    setValue("pan", member?.panNumber || "");

    if (member) {
      let targetMember = member;
      if (watchProposerId) {
        const proposer = masterCustomers.find((m) => m.id === watchProposerId);
        if (proposer) targetMember = proposer;
      }
      setValue("accountHolderName", getFullName(targetMember));
      setValue("neftAccountHolderName", getFullName(targetMember));
    } else {
      setValue("accountHolderName", "");
      setValue("neftAccountHolderName", "");
    }
  }, [watchLifeAssuredId, watchProposerId, watchAge, masterCustomers, setValue]);

  useEffect(() => {
    let member = masterCustomers.find((m) => m.id === watchLifeAssuredId);
    if (watchProposerId) {
      const proposer = masterCustomers.find((m) => m.id === watchProposerId);
      if (proposer) member = proposer;
    }

    if (useNach && member) {
      const defaultBank =
        member.bankDetails?.find((b) => b.isDefault) || member.bankDetails?.[0];
      if (defaultBank) {
        setValue("bankName", defaultBank.bankName || "");
        setValue("bankBranch", defaultBank.bankBranch || "");
        setValue("city", defaultBank.city || "");
        setValue("accountType", defaultBank.accountType || "");
        setValue("accountNumber", defaultBank.accountNumber || "");
        setValue("ifscCode", defaultBank.ifscCode || "");
        setValue("micrNumber", defaultBank.micrNumber || "");
        setValue("accountHolderName", getFullName(member));
      }
    }
  }, [useNach, watchLifeAssuredId, watchProposerId, watchAge, masterCustomers, setValue]);

  useEffect(() => {
    let member = masterCustomers.find((m) => m.id === watchLifeAssuredId);
    if (watchProposerId) {
      const proposer = masterCustomers.find((m) => m.id === watchProposerId);
      if (proposer) member = proposer;
    }

    if (useNeft && member) {
      const defaultBank =
        member.bankDetails?.find((b) => b.isDefault) || member.bankDetails?.[0];
      if (defaultBank) {
        setValue("neftBankName", defaultBank.bankName || "");
        setValue("neftBankBranch", defaultBank.bankBranch || "");
        setValue("neftAccountNumber", defaultBank.accountNumber || "");
        setValue("neftIfscCode", defaultBank.ifscCode || "");
        setValue("neftAccountHolderName", getFullName(member));
      }
    }
  }, [useNeft, watchLifeAssuredId, watchProposerId, watchAge, masterCustomers, setValue]);

  useEffect(() => {
    const spouse = masterCustomers.find((m) => m.id === watchSpouseId);
    if (spouse) {
      const dob = spouse.dob
        ? new Date(spouse.dob).toISOString().split("T")[0]
        : "";
      const age = spouse.dob
        ? differenceInYears(new Date(), new Date(spouse.dob))
        : undefined;
      setValue("spouseDob", dob);
      setValue("spouseAge", age);
    } else {
      setValue("spouseDob", "");
      setValue("spouseAge", undefined);
    }
  }, [watchSpouseId, masterCustomers, setValue]);

  useEffect(() => {
    const proposer = masterCustomers.find((m) => m.id === watchProposerId);
    if (proposer) {
      setValue(
        "proposerDob",
        proposer.dob ? new Date(proposer.dob).toISOString().split("T")[0] : "",
      );
      setValue(
        "proposerAge",
        proposer.dob
          ? differenceInYears(new Date(), new Date(proposer.dob))
          : undefined,
      );
    } else {
      setValue("proposerDob", "");
      setValue("proposerAge", undefined);
    }
  }, [watchProposerId, masterCustomers, setValue]);



  const productOptions = useMemo(() => {
    const filteredProducts = [...products].filter((product) => {
      const provider = providers.find((p) => p.id === product.providerId);
      const providerCode = provider?.code?.toLowerCase();
      const isLICProvider = providerCode === "lic";

      if (selectedPolicyType === "lic") return isLICProvider;
      if (selectedPolicyType === "other" || watchProviderType === "OTHER") {
        if (!providerCode || isLICProvider) return false;
        if (selectedCompanyFilter && product.providerId !== selectedCompanyFilter) {
          return false;
        }
        return true;
      }
      return true;
    });

    const active = filteredProducts
      .filter((p) => p.productType !== "Withdrawn")
      .sort((a, b) => (a.planNumber ?? a.productName).localeCompare(b.planNumber ?? b.productName))
      .map((p) => {
        const provider = providers.find((pr) => pr.id === p.providerId);
        return {
          value: p.id,
          label: p.planNumber ? `${p.planNumber} - ${p.productName}` : p.productName,
          sublabel: provider ? `${provider.name} (${provider.code})` : (p.planNumber ? `Plan No: ${p.planNumber}` : undefined),
        };
      });

    const withdrawn = filteredProducts
      .filter((p) => p.productType === "Withdrawn")
      .sort((a, b) => a.productName.localeCompare(b.productName))
      .map((p) => {
        const provider = providers.find((pr) => pr.id === p.providerId);
        return {
          value: p.id,
          label: p.planNumber ? `${p.planNumber} - ${p.productName}` : p.productName,
          sublabel: provider ? `${provider.name} (${provider.code})` : (p.planNumber ? `Plan No: ${p.planNumber}` : undefined),
        };
      });

    if (withdrawn.length > 0) {
      return [...active, { label: "Withdrawn Plans", options: withdrawn, isCollapsible: true }];
    }
    return active;
  }, [products, providers, selectedPolicyType, watchProviderType, selectedCompanyFilter]);

  const companyOptions = useMemo(() => {
    const nonLicProviders = providers.filter((p) => p.code?.toLowerCase() !== "lic");
    return [
      { value: "", label: "All Companies / Insurers" },
      ...nonLicProviders.map((p) => ({
        value: p.id,
        label: `${p.name} (${p.code})`,
      })),
    ];
  }, [providers]);

  const agencyOptions = useMemo(() => {
    return agencies
      .slice()
      .sort((a, b) => (a.agencyCode || a.agencyName || "").localeCompare(b.agencyCode || b.agencyName || ""))
      .map((agency) => ({
        value: agency.id,
        label: agency.agencyCode ? `${agency.agencyCode} - ${agency.agencyName}` : agency.agencyName,
        sublabel: agency.agencyCode ? `Code: ${agency.agencyCode}` : undefined,
      }));
  }, [agencies]);

  const branchOptions = useMemo(() => {
    return branches
      .slice()
      .sort((a, b) => (a.branchCode || a.branchName || "").localeCompare(b.branchCode || b.branchName || ""))
      .map((branch) => ({
        value: branch.id,
        label: branch.branchCode ? `${branch.branchCode} - ${branch.branchName}` : branch.branchName,
        sublabel: branch.branchCode ? `Branch Code: ${branch.branchCode}` : undefined,
      }));
  }, [branches]);

  const isSinglePremiumPlan = useMemo(() => {
    if (isOtherPolicy) return false;
    const plan = selectedProduct?.planNumber;
    return Boolean(plan && ["717", "888", "883"].includes(plan));
  }, [isOtherPolicy, selectedProduct?.planNumber]);

  const modeOptions = useMemo(() => {
    if (isSinglePremiumPlan) {
      const singleMode = modes.find(
        (m) =>
          m.modeName?.toLowerCase() === "single" ||
          m.modeCode?.toUpperCase() === "SIN",
      );
      return [
        {
          value: singleMode?.modeName || "Single",
          label: singleMode?.modeName || "Single",
          sublabel: singleMode?.modeCode ? `Code: ${singleMode.modeCode}` : "Code: SIN",
        },
      ];
    }

    const list = modes.map((mode) => ({
      value: mode.modeName,
      label: mode.modeName,
      sublabel: mode.modeCode ? `Code: ${mode.modeCode}` : undefined,
    }));
    if (selectedProduct?.planNumber === "774" && !modes.find((m) => m.modeName === "SSS")) {
      list.push({
        value: "SSS",
        label: "SSS",
        sublabel: "Salary Savings Scheme",
      });
    }
    return list;
  }, [modes, selectedProduct?.planNumber, isSinglePremiumPlan]);

  // Track previous isSinglePremiumPlan to know when switching from single to non-single
  const prevIsSingleRef = useRef<boolean>(false);

  // Fix mode to Single for single premium plans (717, 888, 883)
  // Default to Yearly for other LIC policies (user can modify in dropdown)
  useEffect(() => {
    if (isSinglePremiumPlan) {
      const singleMode = modes.find(
        (m) =>
          m.modeName?.toLowerCase() === "single" ||
          m.modeCode?.toUpperCase() === "SIN",
      );
      const targetMode = singleMode?.modeName || "Single";
      if (watchMode !== targetMode) {
        setValue("mode", targetMode, { shouldValidate: true, shouldDirty: true });
      }
      prevIsSingleRef.current = true;
    } else if (!isOtherPolicy) {
      const isCurrentlySingle = watchMode?.toLowerCase() === "single";
      if (!watchMode || (prevIsSingleRef.current && isCurrentlySingle)) {
        const yearlyMode = modes.find(
          (m) =>
            m.modeName?.toLowerCase() === "yearly" ||
            m.modeCode?.toUpperCase() === "YLY",
        );
        setValue("mode", yearlyMode?.modeName || "Yearly", { shouldValidate: true, shouldDirty: true });
      }
      prevIsSingleRef.current = false;
    }
  }, [isSinglePremiumPlan, isOtherPolicy, modes, watchMode, setValue]);

  const filteredAdvisors = useMemo(() => {
    if (!watchAgencyId) return [];
    return advisors.filter((a) => a.agencyId === watchAgencyId);
  }, [watchAgencyId, advisors]);

  useEffect(() => {
    if (selectedPolicyType === "lic") {
      setValue("providerType", "LIC", { shouldValidate: true });
    } else if (selectedPolicyType === "other") {
      setValue("providerType", "OTHER", { shouldValidate: true });
    }
  }, [selectedPolicyType, setValue]);

  useEffect(() => {
    if (!watchProductId || !products.length || !providers.length) return;

    const selectedProduct = products.find((p) => p.id === watchProductId);
    if (!selectedProduct) return;

    const provider = providers.find((p) => p.id === selectedProduct.providerId);
    const providerCode = provider?.code?.toLowerCase();

    setValue("providerId", selectedProduct.providerId || "");
    setValue("productType", selectedProduct.productType || "");
    setValue(
      "providerType",
      providerCode === "lic" ? "LIC" : "OTHER",
      { shouldValidate: true },
    );
    if (providerCode !== "lic" && selectedProduct.providerId) {
      setSelectedCompanyFilter(selectedProduct.providerId);
    }
  }, [watchProductId, products, providers, setValue]);

  useEffect(() => {
    const agency = agencies.find((a) => a.id === watchAgencyId);
    // When agency changes, reset the advisor
    setValue("advisorId", "");

    if (agency) {
      if (agency.agencyCode === "AG002" || agency.agencyCode === "AG003") {
        const directBranch = branches.find((b) => b.branchCode === "955");
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

  const ridersPreviewKey = Array.isArray(watchRiders)
    ? watchRiders.map((r: any) => `${r.description}-${r.sum}-${r.term}-${r.ppt}-${r.premium}-${r.option}-${r.selected}`).join('|')
    : "";

  // Auto-fill Term Rider and CIR fields, and Plan 774 defaults
  useEffect(() => {
    if (isOtherPolicy) return;
    if (Array.isArray(watchRiders)) {
      const selectedPlan = products.find((p) => p.id === watchProductId)?.planNumber;
      const isWholeLife = ["771", "745", "883", "887"].includes(selectedPlan || "");

      watchRiders.forEach((r, index) => {
        const desc = r.description?.toLowerCase() || "";

        if (selectedPlan === "774" || selectedPlan === "751" || selectedPlan === "880") {
          const expectedSum = watchSumAssured ? Number(watchSumAssured) : null;
          const expectedTerm = watchTerm ? Number(watchTerm) : null;
          const expectedPpt = watchPpt ? Number(watchPpt) : null;

          if (r.selected && (r.term == null || r.ppt == null || r.sum == null)) {
            updateRider(index, {
              ...r,
              sum: r.sum != null ? r.sum : expectedSum,
              term: r.term != null ? r.term : expectedTerm,
              ppt: r.ppt != null ? r.ppt : expectedPpt,
            });
          }
          return;
        }

        const isAddb = desc.includes("accidental death") || desc.includes("addb");

        if (
          desc.includes("term") ||
          desc.includes("critical illness") ||
          desc.includes("cir") ||
          ((selectedPlan === "717" || selectedPlan === "733" || selectedPlan === "736" || selectedPlan === "745" || selectedPlan === "760" || selectedPlan === "771" || selectedPlan === "881" || selectedPlan === "883" || selectedPlan === "888" || selectedPlan === "912") && isAddb)
        ) {
          const expectedSum = watchSumAssured ? Number(watchSumAssured) : null;
          let expectedTerm = watchTerm ? Number(watchTerm) : null;
          let expectedPpt = watchPpt ? Number(watchPpt) : null;

          if (isWholeLife && watchAge && expectedPpt) {
            const riderRecord = riders.find((rv: any) => rv.riderName === r.description);
            if (riderRecord) {
              const fetchOptions = async () => {
                try {
                  const response = await axios.get(
                    `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}/riders/${riderRecord.id}/options?age=${watchAge}&ppt=${expectedPpt}&productId=${watchProductId}`,
                    {
                      headers: {
                        Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
                      },
                    }
                  );
                  if (response.data?.data?.combinations?.length > 0) {
                    const validComb = response.data.data.combinations[0];
                    if (String(r.sum || "") !== String(expectedSum || "") || String(r.term || "") !== String(validComb.term || "") || String(r.ppt || "") !== String(validComb.ppt || "")) {
                      updateRider(index, {
                        ...r,
                        sum: expectedSum,
                        term: validComb.term,
                        ppt: validComb.ppt
                      });
                    }
                  }
                } catch (error) {
                  console.error("Failed to fetch rider options", error);
                }
              };
              if (String(r.sum || "") !== String(expectedSum || "")) {
                if (r.term && r.ppt) {
                  updateRider(index, {
                    ...r,
                    sum: expectedSum,
                  });
                } else {
                  fetchOptions();
                }
              } else if (!r.term || !r.ppt) {
                fetchOptions();
              }
              return;
            }
          }

          if (String(r.sum || "") !== String(expectedSum || "") || String(r.term || "") !== String(expectedTerm || "") || String(r.ppt || "") !== String(expectedPpt || "")) {
            updateRider(index, {
              ...r,
              sum: expectedSum,
              term: expectedTerm,
              ppt: expectedPpt
            });
          }
        }
      });
    }
  }, [watchRiders, watchSumAssured, watchTerm, watchPpt, watchAge, watchProductId, products, riders, updateRider, isOtherPolicy]);

  // Auto-calculate individual rider premiums based on mode and sum up for total rider premium
  useEffect(() => {
    if (isOtherPolicy) {
      let totalManualRiderPremium = 0;
      if (Array.isArray(watchRiders)) {
        watchRiders.forEach((rider: any) => {
          if (rider?.selected) {
            totalManualRiderPremium += parseFloat(String(rider.premium)) || 0;
          }
        });
      }
      setValue(
        "totalRiderPremium",
        totalManualRiderPremium > 0 ? totalManualRiderPremium : undefined,
        { shouldValidate: true, shouldDirty: true }
      );
      return;
    }

    if (Array.isArray(watchRiders)) {
      const selectedPlan = products.find((p) => p.id === watchProductId)?.planNumber;

      if (selectedPlan === "774" || selectedPlan === "751" || selectedPlan === "880") {
        let totalManualRiderPremium = 0;
        watchRiders.forEach((rider: any) => {
          if (rider?.selected) {
            totalManualRiderPremium += parseFloat(String(rider.premium)) || 0;
          }
        });
        setValue(
          "totalRiderPremium",
          totalManualRiderPremium > 0 ? totalManualRiderPremium : undefined,
          { shouldValidate: true, shouldDirty: true }
        );
        return;
      }

      if (watchProductId && watchAge && watchMode) {
        const controller = new AbortController();
        const timeoutId = window.setTimeout(async () => {
          let totalInstallmentRiderPremium = 0;

          const updatedRiders = await Promise.all(
            watchRiders.map(async (rider, index) => {
              const sum = parseFloat(String(rider.sum)) || 0;
              const term = parseFloat(String(rider.term)) || 0;
              const ppt = parseFloat(String(rider.ppt)) || 0;
              const mode = watchMode;
              const riderRecord = riders.find((rv: any) => rv.riderName === rider.description);
              const riderId = riderRecord?.id;
              const currentPremium = parseFloat(String(rider.premium)) || 0;

              if (sum > 0 && term > 0 && ppt > 0 && mode && riderId) {
                try {
                  const response = await axios.post(
                    `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}/policies/rider-premium-preview`,
                    {
                      riderId,
                      age: watchAge,
                      riderTerm: term,
                      premiumPayingTerm: ppt,
                      sumAssured: sum,
                      premiumMode: mode,
                      productId: watchProductId,
                      option: rider.option,
                      gender: watchGender
                    },
                    {
                      signal: controller.signal,
                      headers: {
                        Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
                      },
                    }
                  );
                  const finalRiderPremium = response.data?.data?.premium || 0;
                  if (response.data?.data?.rate) {
                    console.log(`Rider Premium Rate for index ${index}:`, response.data.data.rate);
                  }
                  return { index, newPremium: finalRiderPremium, currentPremium, isValid: true };
                } catch (error) {
                  if (!axios.isCancel(error)) {
                    console.error("Failed to fetch rider premium preview", error);
                  }
                  return { index, newPremium: 0, currentPremium, isValid: true };
                }
              }
              return { index, newPremium: 0, currentPremium, isValid: true };
            })
          );

          updatedRiders.forEach(({ index, newPremium, currentPremium, isValid }) => {
            if (watchRiders[index]?.selected) {
              totalInstallmentRiderPremium += newPremium;
            }
            if (isValid && newPremium !== currentPremium) {
              updateRider(index, {
                ...watchRiders[index],
                premium: newPremium
              });
            }
          });

          setValue(
            "totalRiderPremium",
            totalInstallmentRiderPremium > 0
              ? totalInstallmentRiderPremium
              : undefined,
          );

        }, 300);

        return () => {
          controller.abort();
          clearTimeout(timeoutId);
        };
      }
    }
  }, [ridersPreviewKey, watchProductId, watchAge, watchMode, riders, setValue, products]);

  // Auto-calculate Completion Date
  useEffect(() => {
    const term = Number(watchTerm);
    if (watchCommencementDate && term > 0) {
      try {
        const startDate = new Date(watchCommencementDate);
        if (isValid(startDate)) {
          const completionDate = addYears(startDate, term);
          const formatted = format(completionDate, "yyyy-MM-dd");
          if (watchCompletionDate !== formatted) {
            setValue("completionDate", formatted, { shouldValidate: true, shouldDirty: true });
          }
        }
      } catch (e) {
        // Do nothing if the date is invalid
      }
    }
  }, [watchCommencementDate, watchTerm, watchCompletionDate, setValue]);

  // Auto-calculate Term from dates only if term is not set
  useEffect(() => {
    if (watchCommencementDate && watchCompletionDate && !watchTerm) {
      try {
        const startDate = new Date(watchCommencementDate);
        const endDate = new Date(watchCompletionDate);
        if (isValid(startDate) && isValid(endDate)) {
          const calculatedTerm = differenceInYears(endDate, startDate);
          if (calculatedTerm > 0) {
            setValue("term", String(calculatedTerm) as any, { shouldValidate: true, shouldDirty: true });
          }
        }
      } catch (e) {
        // Do nothing if dates are invalid
      }
    }
  }, [watchCommencementDate, watchCompletionDate, watchTerm, setValue]);

  // Auto-select PPT when Term is selected
  useEffect(() => {
    if (isOtherPolicy) return;
    if (watchTerm && productOptionsData.combinations.length > 0) {
      const termValue = Number(watchTerm);
      // Find combinations for this term
      const matchingCombs = productOptionsData.combinations.filter(c => c.term === termValue && c.ppt !== null);
      if (matchingCombs.length === 1) {
        // Only one possible PPT for this term, auto select it
        if (Number(watchPpt) !== matchingCombs[0].ppt) {
          setValue("ppt", String(matchingCombs[0].ppt) as any, { shouldValidate: true, shouldDirty: true });
        }
      } else if (matchingCombs.length > 0 && watchPpt) {
        // If current PPT is not in the valid list for this term, clear or reset it
        const isValid = matchingCombs.some(c => c.ppt === Number(watchPpt));
        if (!isValid) {
          setValue("ppt", String(matchingCombs[0].ppt) as any, { shouldValidate: true, shouldDirty: true });
        }
      } else if (matchingCombs.length > 0 && !watchPpt) {
        setValue("ppt", String(matchingCombs[0].ppt) as any, { shouldValidate: true, shouldDirty: true });
      }
    }
  }, [watchTerm, productOptionsData.combinations, setValue, watchPpt, isOtherPolicy]);

  // Auto-select Term and PPT when product options load
  useEffect(() => {
    if (isOtherPolicy) return;
    if (!selectedProduct || productOptionsData.terms.length === 0) return;

    if (!["771", "745", "883", "887"].includes(selectedProduct.planNumber ?? "")) {
      const currentTerm = watchTerm ? Number(watchTerm) : null;
      let effectiveTerm = currentTerm;
      if (!currentTerm || !productOptionsData.terms.includes(currentTerm)) {
        effectiveTerm = Math.min(...productOptionsData.terms);
        if (Number(watchTerm) !== effectiveTerm) {
          setValue("term", String(effectiveTerm) as any, { shouldValidate: true, shouldDirty: true });
        }
      }

      if (effectiveTerm && productOptionsData.combinations.length > 0) {
        const matchingCombs = productOptionsData.combinations.filter(c => c.term === effectiveTerm && c.ppt !== null);
        if (matchingCombs.length > 0) {
          const currentPpt = watchPpt ? Number(watchPpt) : null;
          const isValidPpt = currentPpt && matchingCombs.some(c => c.ppt === currentPpt);
          if (!isValidPpt) {
            setValue("ppt", String(matchingCombs[0].ppt) as any, { shouldValidate: true, shouldDirty: true });
          }
        }
      }
    }
  }, [productOptionsData, selectedProduct, setValue, watchTerm, watchPpt, isOtherPolicy]);

  useEffect(() => {
    if (isOtherPolicy) return;
    const sum = parseFloat(String(watchSumAssured)) || 0;
    const term = parseFloat(String(watchTerm)) || 0;
    const ppt = parseFloat(String(watchPpt)) || 0;
    const mode = watchMode;
    const age = parseFloat(String(watchAge)) || 0;
    const selectedPlan = products.find((p) => p.id === watchProductId)?.planNumber;
    const secondaryAge = selectedPlan === "774"
      ? (watchProposerAge ? parseFloat(String(watchProposerAge)) : null)
      : (watchSpouseAge ? parseFloat(String(watchSpouseAge)) : null);
    const option = watchOption || null;
    const totalRider = parseFloat(String(watchTotalRiderPremium)) || 0;

    if (!watchProductId || !sum || !term || !ppt || !mode || !age) {
      return;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(async () => {
      console.log("Premium Payload:", {
        productId: watchProductId,
        age,
        policyTerm: term,
        premiumPayingTerm: ppt,
        sumAssured: sum,
        premiumMode: mode,
        smoker: watchSmoker,
        gender: watchGender,
      });

      console.log("watchSumAssured =", watchSumAssured);
      console.log("PREMIUM PREVIEW PAYLOAD:", {
        productId: watchProductId,
        age,
        secondaryAge,
        option,
        policyTerm: term,
        premiumPayingTerm: ppt,
        sumAssured: sum,
        premiumMode: mode,
        smoker: watchSmoker,
        gender: watchGender,
      });
      try {
        const response = await axios.post(
          `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}/policies/premium-preview`,
          {
            productId: watchProductId,
            age,
            secondaryAge,
            option,
            policyTerm: term,
            premiumPayingTerm: ppt,
            sumAssured: sum,
            premiumMode: mode,
            smoker: watchSmoker,
            gender: watchGender,
          },
          {
            signal: controller.signal,
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
            },
          },
        );

        const premium = response.data?.data?.premium;
        if (!premium) return;

        setValue(
          "basicYearlyPremium",
          premium.basicYearlyPremium > 0
            ? parseFloat(premium.basicYearlyPremium.toFixed(2))
            : undefined,
        );
        setValue(
          "installmentPremium",
          premium.installmentPremium > 0
            ? parseFloat(premium.installmentPremium.toFixed(2))
            : undefined,
        );
        setValue("gst", premium.gst ?? 0);

        const totalInstallmentPremium = premium.installmentPremium + totalRider;
        setValue(
          "totalInstallmentPremium",
          totalInstallmentPremium > 0
            ? parseFloat(totalInstallmentPremium.toFixed(2))
            : undefined,
        );
      } catch (error: any) {
        if (!axios.isCancel(error)) {
          const msg = error?.response?.data?.message || error?.message || "Failed to fetch premium preview";
          console.error("Failed to fetch premium preview", error);
          toast.error(msg);
        }
      }
    }, 300);

    return () => {
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, [premiumPreviewKey, products, setValue, watchAge, watchMode, watchOption, watchPpt, watchProductId, watchProposerAge, watchSpouseAge, watchSumAssured, watchTerm, watchTotalRiderPremium, watchSmoker, watchGender, isOtherPolicy]);

  // Auto-calculate Total Yearly Premium when in Other policy mode
  useEffect(() => {
    if (isOtherPolicy) {
      const basic = parseFloat(String(watchBasicYearlyPremium)) || 0;
      const rider = parseFloat(String(watchTotalRiderPremium)) || 0;
      if (basic > 0 || rider > 0) {
        setValue("totalYearlyPremium", basic + rider > 0 ? basic + rider : undefined, { shouldDirty: true });
      }
    }
  }, [isOtherPolicy, watchBasicYearlyPremium, watchTotalRiderPremium, setValue]);

  // Auto-calculate Total Installment Premium when in Other policy mode
  useEffect(() => {
    if (isOtherPolicy) {
      const installment = parseFloat(String(watchInstallmentPremium)) || 0;
      const rider = parseFloat(String(watchTotalRiderPremium)) || 0;
      const gstVal = parseFloat(String(watchGst)) || 0;
      const total = installment + rider + gstVal;
      setValue("totalInstallmentPremium", total > 0 ? parseFloat(total.toFixed(2)) : undefined, { shouldDirty: true });
    }
  }, [isOtherPolicy, watchInstallmentPremium, watchTotalRiderPremium, watchGst, setValue]);

  useEffect(() => {
    if (isOtherPolicy) return;
    if (!selectedProduct) return;

    if (["771", "745", "883", "887"].includes(selectedProduct.planNumber ?? "") && watchAge) {
      const defaultTerm =
        selectedProduct.planNumber === "887"
          ? Math.min(82, 100 - Number(watchAge))
          : 100 - Number(watchAge);
      if (Number(watchTerm) !== defaultTerm) {
        setValue("term", String(defaultTerm) as any, {
          shouldValidate: true,
          shouldDirty: true,
        });
      }
    }
  }, [watchProductId, watchAge, selectedProduct, setValue, watchTerm, isOtherPolicy]);

  // Auto-populate riders when a product is selected
  useEffect(() => {
    if (isOtherPolicy) {
      replaceRiders([]);
      return;
    }

    // Look for riders instead of productRiders to match the backend response
    if (selectedProduct) {
      if (selectedProduct.planNumber === "751" || selectedProduct.planNumber === "880") {
        replaceRiders([]);
        return;
      }

      if (Array.isArray(selectedProduct.riders) && selectedProduct.riders.length > 0) {
        const newRiders = selectedProduct.riders.map((pr: any) => ({
          description: pr.rider?.riderName || "",
          sum: null,
          term: null,
          ppt: null,
          premium: null,
          mode: "",
          selected: false,
        }));

        if (selectedProduct.planNumber === "717" || selectedProduct.planNumber === "733" || selectedProduct.planNumber === "736" || selectedProduct.planNumber === "745" || selectedProduct.planNumber === "760" || selectedProduct.planNumber === "771" || selectedProduct.planNumber === "881" || selectedProduct.planNumber === "883" || selectedProduct.planNumber === "888" || selectedProduct.planNumber === "912") {
          const addbRider = riders.find((r) => r.riderCode === "ADDB" || r.riderName.toLowerCase().includes("accidental death") || r.riderName.toLowerCase().includes("addb"));
          const hasAddb = newRiders.some((r: any) => r.description.toLowerCase().includes("accidental death") || r.description.toLowerCase().includes("addb"));
          if (addbRider && !hasAddb) {
            newRiders.push({
              description: addbRider.riderName,
              sum: null,
              term: null,
              ppt: null,
              premium: null,
              mode: "",
              selected: false,
            });
          }
        }

        replaceRiders(newRiders);
      } else {
        // Fallback: If DB hasn't mapped riders to this product yet, show appropriate default riders
        const termRider = riders.find((r) => r.riderName.toLowerCase().includes("term"));
        const cirRider = riders.find((r) => r.riderName.toLowerCase().includes("critical illness") || r.riderName.toLowerCase().includes("cir"));
        const wopRider = riders.find((r) => r.riderCode === "WOP" || r.riderCode === "PWB" || r.riderName.toLowerCase().includes("waiver") || r.riderName.toLowerCase().includes("pwb"));
        const addbRider = riders.find((r) => r.riderCode === "ADDB" || r.riderName.toLowerCase().includes("accidental death") || r.riderName.toLowerCase().includes("addb"));

        const defaultRiders = [];

        if (selectedProduct.planNumber === "774") {
          if (wopRider) {
            defaultRiders.push({
              description: wopRider.riderName,
              sum: null,
              term: null,
              ppt: null,
              premium: null,
              mode: "",
              selected: false,
            });
          }
        } else {
          if (termRider) {
            defaultRiders.push({
              description: termRider.riderName,
              sum: null,
              term: null,
              ppt: null,
              premium: null,
              mode: "",
              selected: false,
            });
          }

          if ((selectedProduct.planNumber === "717" || selectedProduct.planNumber === "733" || selectedProduct.planNumber === "736" || selectedProduct.planNumber === "745" || selectedProduct.planNumber === "760" || selectedProduct.planNumber === "771" || selectedProduct.planNumber === "881" || selectedProduct.planNumber === "883" || selectedProduct.planNumber === "888" || selectedProduct.planNumber === "912") && addbRider) {
            defaultRiders.push({
              description: addbRider.riderName,
              sum: null,
              term: null,
              ppt: null,
              premium: null,
              mode: "",
              selected: false,
            });
          }

          if ((selectedProduct.planNumber === "714" || selectedProduct.planNumber === "715" || selectedProduct.planNumber === "889") && cirRider) {
            defaultRiders.push({
              description: cirRider.riderName,
              sum: null,
              term: null,
              ppt: null,
              premium: null,
              mode: "",
              selected: false,
            });
          }
        }

        replaceRiders(defaultRiders);
      }
    } else {
      replaceRiders([]);
    }
  }, [selectedProduct, replaceRiders, riders, isOtherPolicy]);

  // When product changes, update attribute hints and pre-fill fields with minimum values.
  useEffect(() => {
    if (isOtherPolicy) {
      setAttributeHints({ term: "", ppt: "", sumAssured: "", age: "" });
      return;
    }

    if (!watchProductId || !productAttributeValues || !products.length) {
      setAttributeHints({ term: "", ppt: "", sumAssured: "", age: "" });
      // Clear fields if product is deselected
      setValue("term", undefined);
      setValue("ppt", undefined);
      setValue("sumAssured", undefined);
      return;
    }

    const selectedProductAttributes = productAttributeValues.filter(
      (attr) => attr.productId === watchProductId,
    );

    const getAttributeValue = (code: string) =>
      selectedProductAttributes.find((a) => a.attribute.attributeCode === code)
        ?.value;

    const selectedProduct = products.find((p) => p.id === watchProductId);
    const isPlan889 = selectedProduct?.planNumber === "889";
    const minTerm = getAttributeValue("MIN_POLICY_TERM") || (isPlan889 ? "10" : undefined);
    const maxTerm = getAttributeValue("MAX_POLICY_TERM") || (isPlan889 ? "25" : undefined);
    const effectiveMaxTerm =
      selectedProduct?.planNumber === "887" && watchAge
        ? String(Math.min(82, 100 - Number(watchAge)))
        : maxTerm;
    const minPpt = getAttributeValue("MIN_PPT") || (isPlan889 ? "5" : undefined);
    const maxPpt = getAttributeValue("MAX_PPT") || (isPlan889 ? "15" : undefined);
    const minSum = getAttributeValue("MIN_SUM_ASSURED") || (isPlan889 ? "300000" : undefined);
    const maxSum = getAttributeValue("MAX_SUM_ASSURED");
    const minAge = getAttributeValue("MIN_ENTRY_AGE") || (isPlan889 ? "18" : undefined);
    const maxAge = getAttributeValue("MAX_ENTRY_AGE") || (isPlan889 ? "50" : undefined);

    // For plan 771, the term is calculated, not pre-filled from attributes.
    if (!["771", "745", "883", "887"].includes(selectedProduct?.planNumber ?? "")) {
      if (minTerm && !watchTerm) setValue("term", minTerm as any);
    }

    if (minPpt && !watchPpt) setValue("ppt", minPpt as any);

    if (minSum && !watchSumAssured) setValue("sumAssured", minSum as any);

    setAttributeHints({
      term:
        minTerm || effectiveMaxTerm
          ? `Range: ${minTerm || "N/A"} - ${effectiveMaxTerm || "N/A"}`
          : "",
      ppt:
        minPpt || maxPpt
          ? `Range: ${minPpt || "N/A"} - ${maxPpt || "N/A"}`
          : "",
      sumAssured:
        minSum || maxSum
          ? `Range: ${minSum || "N/A"} - ${maxSum || "N/A"}`
          : "",
      age:
        minAge || maxAge
          ? `Required Age: ${minAge || "N/A"} - ${maxAge || "N/A"}`
          : "",
    });
  }, [watchProductId, productAttributeValues, products, setValue, watchAge, isOtherPolicy]);

  useEffect(() => {
    if (isOtherPolicy) {
      setProductOptionsData({ terms: [], ppts: [], combinations: [] });
      return;
    }

    if (!watchProductId) {
      setProductOptionsData({ terms: [], ppts: [], combinations: [] });
      return;
    }

    const selectedProductAttributes = productAttributeValues.filter(
      (attr) => attr.productId === watchProductId,
    );

    const getAttributeValue = (code: string) =>
      selectedProductAttributes.find((a) => a.attribute.attributeCode === code)
        ?.value;

    const selectedProduct = products.find((p) => p.id === watchProductId);
    const isPlan889 = selectedProduct?.planNumber === "889";
    const minTerm = getAttributeValue("MIN_POLICY_TERM") || (isPlan889 ? "10" : undefined);
    const maxTerm = getAttributeValue("MAX_POLICY_TERM") || (isPlan889 ? "25" : undefined);
    const effectiveMaxTerm =
      selectedProduct?.planNumber === "887" && watchAge
        ? String(Math.min(82, 100 - Number(watchAge)))
        : maxTerm;
    const minPpt = getAttributeValue("MIN_PPT") || (isPlan889 ? "5" : undefined);
    const maxPpt = getAttributeValue("MAX_PPT") || (isPlan889 ? "15" : undefined);
    const minSum = getAttributeValue("MIN_SUM_ASSURED") || (isPlan889 ? "300000" : undefined);
    const maxSum = getAttributeValue("MAX_SUM_ASSURED");
    const minAge = getAttributeValue("MIN_ENTRY_AGE") || (isPlan889 ? "18" : undefined);
    const maxAge = getAttributeValue("MAX_ENTRY_AGE") || (isPlan889 ? "50" : undefined);

    // For plan 771, the term is calculated, not pre-filled from attributes.
    if (!["771", "745", "883", "887"].includes(selectedProduct?.planNumber ?? "")) {
      if (minTerm && !watchTerm) setValue("term", minTerm as any);
    }

    if (minPpt && !watchPpt) setValue("ppt", minPpt as any);

    if (minSum && !watchSumAssured) setValue("sumAssured", minSum as any);

    setAttributeHints({
      term:
        minTerm || effectiveMaxTerm
          ? `Range: ${minTerm || "N/A"} - ${effectiveMaxTerm || "N/A"}`
          : "",
      ppt:
        minPpt || maxPpt
          ? `Range: ${minPpt || "N/A"} - ${maxPpt || "N/A"}`
          : "",
      sumAssured:
        minSum || maxSum
          ? `Range: ${minSum || "N/A"} - ${maxSum || "N/A"}`
          : "",
      age:
        minAge || maxAge
          ? `Required Age: ${minAge || "N/A"} - ${maxAge || "N/A"}`
          : "",
    });
  }, [watchProductId, productAttributeValues, products, setValue, watchAge]);

  useEffect(() => {
    if (!watchProductId) {
      setProductOptionsData({ terms: [], ppts: [], combinations: [] });
      return;
    }
    const fetchOptions = async () => {
      try {
        const response = await axios.get(
          `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}/products/${watchProductId}/options`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
            },
          }
        );
        if (response.data?.data) {
          setProductOptionsData(response.data.data);
          if (response.data.data.terms && response.data.data.terms.length > 0) {
            const product = products.find((p) => p.id === watchProductId);
            if (!["771", "745", "883", "887"].includes(product?.planNumber ?? "")) {
              const minTerm = Math.min(...response.data.data.terms);
              setValue("term", minTerm as any, { shouldValidate: true, shouldDirty: true });
            }
          }
        }
      } catch (error) {
        console.error("Failed to fetch product options", error);
      }
    };
    fetchOptions();
  }, [watchProductId, products, setValue]);

  const onSubmit: SubmitHandler<PolicyFormValues> = async (data) => {
    console.log("Submit clicked. Form data:", data);
    console.log("isSubmitting:", isSubmitting, "canCreate:", canCreate);

    if (!canCreate) {
      toast.error("You do not have permission to create a policy.");
      setIsSubmitting(false);
      return;
    }

    const selectedProduct = products.find((p) => p.id === data.productId);
    if (selectedProduct && selectedProduct.productType === "Withdrawn") {
      toast.error(
        "This plan is withdrawn and cannot be used to create a new policy.",
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const normalizeNumber = (value: any) =>
        value === undefined || value === null || value === ""
          ? undefined
          : Number(value);

      const payload = {
        ...data,
        paymentMethod: useNach ? "NACH" : useNeft ? "NEFT" : "CHQ",
        riders: data.riders?.filter(r => r.selected) || [],
        spouseAge:
          selectedProduct?.planNumber === "774"
            ? normalizeNumber(data.proposerAge)
            : normalizeNumber(data.spouseAge),
        age: normalizeNumber(data.age),
        term: normalizeNumber(data.term),
        ppt: normalizeNumber(data.ppt),
        sumAssured: normalizeNumber(data.sumAssured),
        basicYearlyPremium: normalizeNumber(data.basicYearlyPremium),
        totalYearlyPremium: normalizeNumber(data.totalYearlyPremium),
        totalRiderPremium: normalizeNumber(data.totalRiderPremium),
        installmentPremium: normalizeNumber(data.installmentPremium),
        totalInstallmentPremium: normalizeNumber(data.totalInstallmentPremium),
        gst: normalizeNumber(data.gst),
        attributes: isOtherPolicy
          ? {}
          : {
              MIN_POLICY_TERM: normalizeNumber(data.term),
              MAX_POLICY_TERM: normalizeNumber(data.term),

              MIN_PPT: normalizeNumber(data.ppt),
              MAX_PPT: normalizeNumber(data.ppt),

              MIN_SUM_ASSURED: normalizeNumber(data.sumAssured),
              MAX_SUM_ASSURED: normalizeNumber(data.sumAssured),
            },
        providerType: isOtherPolicy ? "OTHER" : "LIC",
        smoker: data.smoker,
        gender: data.gender || watchGender,
      };
      const result = await dispatch(createPolicy(payload)).unwrap();

      // Refresh notifications immediately
      await fetchNotifications();

      toast.success("Policy created successfully!");

      router.push("/dashboard/lic/policies");
    } catch (err: any) {
      const msg =
        typeof err === "string"
          ? err
          : err?.response?.data?.message || err?.message ||
          "Failed to create policy. Please check the details.";
      toast.error(msg);
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

        window.scrollTo({ top: y, behavior: "smooth" });

        setActiveSection(sectionId);

        setGlowingSection(sectionId);
        // Remove the glow after 1.5 seconds
        setTimeout(() => setGlowingSection(null), 1500);
      }
    },
    [sectionRefs],
  );

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
            type="button"
            onClick={() => router.push("/dashboard/lic/policies")}
            className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
          <div>
            <nav className="flex items-center gap-1 text-xs text-slate-400 mb-0.5">
              <button type="button" onClick={() => router.push("/dashboard/lic/policies")} className="hover:text-slate-600">
                Policies
              </button>
              <ChevronRight size={12} />
              <span className="text-slate-600 font-medium">New Policy</span>
            </nav>
            <h1 className="text-xl font-bold text-slate-900">
              {selectedPolicyType === "lic"
                ? "Create a New LIC Policy"
                : "Create a New Policy"}
            </h1>
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 py-2">
          <button
            type="button"
            onClick={() => router.push("/dashboard/lic/policies")}
            className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit(onSubmit, (errors) => {
              console.log("Validation Errors:", errors);
            })}
            disabled={isSubmitting || !canCreate}
            className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-gradient-to-r from-[#1e3a8a] to-[#2563eb] px-6 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-200 transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save size={16} />
            {isSubmitting ? "Saving..." : "Save Policy"}
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
      <FormProvider {...methods}>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
          {/* Section 1: Policy Holder's Details */}
          <div
            ref={sectionRefs["policy-holder"]} // Keep ref for scrolling
          >
            <PolicyHolderSection
              groups={groups}
              groupMembers={groupMembers}
              selectedGroup={selectedGroup}
              attributeHintsAge={attributeHints.age}
            />
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
                    {isOtherPolicy && (
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Company / Insurer
                        </label>
                        <SearchableSelect
                          placeholder="All Companies / Insurers"
                          searchPlaceholder="Search company..."
                          options={companyOptions}
                          value={selectedCompanyFilter}
                          onChange={(val) => {
                            setSelectedCompanyFilter(val);
                            if (val && watchProductId) {
                              const currProd = products.find((p) => p.id === watchProductId);
                              if (currProd && currProd.providerId !== val) {
                                setValue("productId", "");
                              }
                            }
                          }}
                          disabled={providersLoading}
                        />
                      </div>
                    )}
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
                            searchPlaceholder="Search by name or plan number"
                            options={productOptions}
                            value={field.value}
                            onChange={(val) => {
                              field.onChange(val);
                              const selectedProduct = products.find((p) => p.id === val);
                              if (selectedProduct) {
                                setValue("providerId", selectedProduct.providerId || "");
                                setValue("productType", selectedProduct.productType || "");
                                if (isOtherPolicy && selectedProduct.providerId) {
                                  setSelectedCompanyFilter(selectedProduct.providerId);
                                }
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
                            value={field.value}
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
                      <Controller
                        control={control}
                        name="mode"
                        render={({ field }) => (
                          <SearchableSelect
                            placeholder="Select Mode"
                            searchPlaceholder="Search mode..."
                            options={modeOptions}
                            value={field.value || (isSinglePremiumPlan ? "Single" : "Yearly")}
                            onChange={(val) => {
                              if (isSinglePremiumPlan) {
                                const singleMode = modes.find(
                                  (m) =>
                                    m.modeName?.toLowerCase() === "single" ||
                                    m.modeCode?.toUpperCase() === "SIN",
                                );
                                field.onChange(singleMode?.modeName || "Single");
                              } else {
                                field.onChange(val);
                              }
                            }}
                            error={errors.mode?.message}
                            disabled={modesLoading}
                          />
                        )}
                      />
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
                            value={field.value}
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
                        Term <span className="text-red-500">*</span>
                      </label>
                      {isOtherPolicy ? (
                        <input
                          type="number"
                          {...register("term")}
                          placeholder="Enter term in years"
                          className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#B8873A]/20 focus:border-[#B8873A] text-sm"
                        />
                      ) : (
                        <select
                          {...register("term")}
                          value={watchTerm != null && String(watchTerm) !== "" ? String(watchTerm) : ""}
                          onChange={(e) => {
                            register("term").onChange(e);
                          }}
                          className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#B8873A]/20 focus:border-[#B8873A] text-sm disabled:bg-slate-50 disabled:cursor-not-allowed"
                          disabled={["771", "745", "883"].includes(selectedProduct?.planNumber ?? "")}
                        >
                          <option value="">Select Term</option>
                          {["771", "745", "883"].includes(selectedProduct?.planNumber ?? "") && watchAge ? (
                            <option value={String(100 - Number(watchAge))}>{100 - Number(watchAge)}</option>
                          ) : selectedProduct?.planNumber === "887" ? (
                            (() => {
                              const maxTerm = watchAge ? Math.min(82, 100 - Number(watchAge)) : 82;
                              const optionsList: number[] = [];
                              for (let t = 10; t <= maxTerm; t++) {
                                optionsList.push(t);
                              }
                              return optionsList.map((t) => (
                                <option key={t} value={t}>{t}</option>
                              ));
                            })()
                          ) : (
                            productOptionsData.terms.map(t => (
                              <option key={t} value={t}>{t}</option>
                            ))
                          )}
                        </select>
                      )}
                      {errors.term && (
                        <p className="text-xs text-red-500 mt-1">
                          {errors.term.message}
                        </p>
                      )}
                      {!isOtherPolicy && attributeHints.term && !errors.term && (
                        <p className="text-xs text-slate-500 mt-1">{attributeHints.term}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        {selectedProduct?.planNumber === "883"
                          ? "Gua.Addn.Period"
                          : "PPT"}
                        {(isOtherPolicy ||
                          selectedProduct?.planNumber === "889" ||
                          selectedProduct?.planNumber === "881" ||
                          selectedProduct?.planNumber === "912") && (
                            <span className="text-red-500"> *</span>
                          )}
                      </label>
                      {isOtherPolicy ? (
                        <input
                          type="number"
                          {...register("ppt")}
                          placeholder="Enter PPT in years"
                          className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#B8873A]/20 focus:border-[#B8873A] text-sm"
                        />
                      ) : (
                        <select
                          {...register("ppt")}
                          value={watchPpt != null && String(watchPpt) !== "" ? String(watchPpt) : ""}
                          onChange={(e) => {
                            register("ppt").onChange(e);
                          }}
                          disabled={productOptionsData.combinations.length > 0 && productOptionsData.combinations.every(c => c.term === c.ppt)}
                          className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#B8873A]/20 focus:border-[#B8873A] text-sm disabled:bg-slate-50 disabled:cursor-not-allowed"
                        >
                          <option value="">
                            {selectedProduct?.planNumber === "883" ? "Select Gua.Addn.Period" : "Select PPT"}
                          </option>
                          {(() => {
                            let optionsToRender: (number | string)[] = productOptionsData.ppts;
                            if (selectedProduct?.planNumber === "887") {
                              if (watchMode === "Single") {
                                optionsToRender = ["1"];
                              } else {
                                const currentTerm = Number(watch("term"));
                                const allowed = [5, 10, 15];
                                if (currentTerm && !allowed.includes(currentTerm)) {
                                  allowed.push(currentTerm);
                                }
                                const filtered = productOptionsData.ppts.filter(p => allowed.includes(Number(p)));
                                optionsToRender = filtered.length > 0 ? filtered : allowed;
                              }
                            }
                            return optionsToRender.map(p => (
                              <option key={p} value={p}>{p}</option>
                            ));
                          })()}
                        </select>
                      )}
                      {errors.ppt && (
                        <p className="text-xs text-red-500 mt-1">
                          {errors.ppt.message}
                        </p>
                      )}
                      {!isOtherPolicy && attributeHints.ppt && !errors.ppt && !errors.term && (
                        <p className="text-xs text-slate-500 mt-1">{attributeHints.ppt}</p>
                      )}
                    </div>
                    {selectedProduct?.planNumber === "881" && (
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Option <span className="text-red-500">*</span>
                        </label>
                        <select
                          {...register("option")}
                          className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#B8873A]/20 focus:border-[#B8873A] text-sm"
                        >
                          <option value="">Select Option</option>
                          <option value="1">Option 1</option>
                          <option value="2">Option 2</option>
                          <option value="3">Option 3</option>
                        </select>
                        {errors.option && (
                          <p className="text-xs text-red-500 mt-1">
                            {errors.option.message}
                          </p>
                        )}
                      </div>
                    )}
                    {selectedProduct?.planNumber === "912" && (
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Option <span className="text-red-500">*</span>
                        </label>
                        <select
                          {...register("option")}
                          className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#B8873A]/20 focus:border-[#B8873A] text-sm"
                        >
                          <option value="">Select Option</option>
                          <option value="1">Option 1</option>
                          <option value="2">Option 2</option>
                        </select>
                        {errors.option && (
                          <p className="text-xs text-red-500 mt-1">
                            {errors.option.message}
                          </p>
                        )}
                      </div>
                    )}
                    {selectedProduct?.planNumber === "887" && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">
                            Option <span className="text-red-500">*</span>
                          </label>
                          <select
                            {...register("option")}
                            className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#B8873A]/20 focus:border-[#B8873A] text-sm"
                          >
                            <option value="">Select Option</option>
                            <option value="1">Option 1</option>
                            <option value="2">Option 2</option>
                          </select>
                          {errors.option && (
                            <p className="text-xs text-red-500 mt-1">
                              {errors.option.message}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-col justify-center">
                          <label className="block text-sm font-medium text-slate-700 mb-2">
                            Smoker Status
                          </label>
                          <div className="flex items-center gap-3">
                            <span className={`text-sm ${!watchSmoker ? 'font-bold text-slate-900' : 'text-slate-500'}`}>Non-Smoker</span>
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                {...register("smoker")}
                                className="sr-only peer"
                              />
                              <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#B8873A]"></div>
                            </label>
                            <span className={`text-sm ${watchSmoker ? 'font-bold text-slate-900' : 'text-slate-500'}`}>Smoker</span>
                          </div>
                        </div>
                      </>
                    )}
                    {(selectedProduct?.planNumber === "888" ||
                      selectedProduct?.planNumber === "889") && (
                        <>
                          <div>
                            <Controller
                              name="spouseId"
                              control={control}
                              render={({ field }) => (
                                <LifeAssuredAutoComplete
                                  label="Spouse"
                                  required
                                  value={field.value || ""}
                                  onChange={field.onChange}
                                  members={groupMembers}
                                  disabled={!watchGroupId || groupMembers.length === 0}
                                  placeholder={
                                    watchGroupId
                                      ? groupMembers.length > 0
                                        ? "Search spouse..."
                                        : "No members in group"
                                      : "Select a group first"
                                  }
                                  error={errors.spouseId?.message}
                                />
                              )}
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                              Option <span className="text-red-500">*</span>
                            </label>
                            <select
                              {...register("option")}
                              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#B8873A]/20 focus:border-[#B8873A] text-sm"
                            >
                              <option value="">Select Option</option>
                              <option value="1">Option 1</option>
                              <option value="2">Option 2</option>
                            </select>
                            {errors.option && (
                              <p className="text-xs text-red-500 mt-1">
                                {errors.option.message}
                              </p>
                            )}
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                              Spouse DOB
                            </label>
                            <input
                              {...register("spouseDob")}
                              type="date"
                              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl bg-slate-50 text-sm text-slate-500 cursor-not-allowed"
                              readOnly
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                              Spouse Age
                            </label>
                            <input
                              {...register("spouseAge")}
                              type="number"
                              placeholder="Autofilled"
                              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl bg-slate-50 text-sm text-slate-500 cursor-not-allowed"
                              readOnly
                            />
                            {errors.spouseAge && (
                              <p className="text-xs text-red-500 mt-1">
                                {errors.spouseAge.message}
                              </p>
                            )}
                          </div>
                        </>
                      )}
                    {(selectedProduct?.planNumber === "774" || (watchAge && parseFloat(String(watchAge)) < 18)) && (
                      <>
                        <div>
                          <Controller
                            name="proposerId"
                            control={control}
                            render={({ field }) => (
                              <LifeAssuredAutoComplete
                                label="Proposer's Name"
                                required
                                value={field.value || ""}
                                onChange={field.onChange}
                                members={groupMembers}
                                disabled={!watchGroupId || groupMembers.length === 0}
                                placeholder={
                                  watchGroupId
                                    ? groupMembers.length > 0
                                      ? "Search proposer..."
                                      : "No members in group"
                                    : "Select a group first"
                                }
                                error={errors.proposerId?.message}
                              />
                            )}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">
                            Proposer DOB
                          </label>
                          <input
                            {...register("proposerDob")}
                            type="date"
                            className="w-full px-3 py-2.5 border border-slate-200 rounded-xl bg-slate-50 text-sm text-slate-500 cursor-not-allowed"
                            readOnly
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">
                            Proposer Age
                          </label>
                          <input
                            {...register("proposerAge")}
                            type="number"
                            placeholder="Autofilled"
                            className="w-full px-3 py-2.5 border border-slate-200 rounded-xl bg-slate-50 text-sm text-slate-500 cursor-not-allowed"
                            readOnly
                          />
                          {errors.proposerAge && (
                            <p className="text-xs text-red-500 mt-1">
                              {errors.proposerAge.message}
                            </p>
                          )}
                        </div>
                      </>
                    )}
                    {selectedProduct?.planNumber === "774" && (
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Option <span className="text-red-500">*</span>
                        </label>
                          <select
                            {...register("option")}
                            className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#B8873A]/20 focus:border-[#B8873A] text-sm"
                          >
                            <option value="">Select Option</option>
                            {(watchMode === "Single" || watchMode === "SSS") ? (
                              <>
                                <option value="3">Option 3</option>
                                <option value="4">Option 4</option>
                              </>
                            ) : (
                              <>
                                <option value="1">Option 1</option>
                                <option value="2">Option 2</option>
                              </>
                            )}
                          </select>
                          {errors.option && (
                            <p className="text-xs text-red-500 mt-1">
                              {errors.option.message}
                            </p>
                          )}
                        </div>
                    )}
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
                      onClick={() =>
                        appendRider({
                          description: "",
                          sum: null,
                          term: null,
                          ppt: null,
                          premium: null,
                          selected: true,
                        })
                      }
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
                          <th className="px-4 py-2 text-center text-xs font-medium text-slate-500 uppercase w-12">
                            <input
                              type="checkbox"
                              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                              onChange={(e) => {
                                const checked = e.target.checked;
                                riderFields.forEach((_, idx) => {
                                  setValue(`riders.${idx}.selected`, checked, { shouldValidate: true, shouldDirty: true });
                                });
                              }}
                              checked={riderFields.length > 0 && riderFields.every((_, idx) => watchRiders?.[idx]?.selected)}
                            />
                          </th>
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
                              colSpan={6}
                              className="px-4 py-6 text-center text-slate-500 text-sm"
                            >
                              No Rider to Show
                            </td>
                          </tr>
                        ) : (
                          riderFields.map((field, index) => (
                            <tr key={field.id} className={watchRiders?.[index]?.selected ? "bg-white" : "bg-slate-50"}>
                              <td className="px-4 py-1.5 text-center">
                                <input
                                  type="checkbox"
                                  {...register(`riders.${index}.selected`)}
                                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                />
                              </td>
                              <td className="px-2 py-1.5 w-1/3">
                                {isOtherPolicy ? (
                                  <input
                                    type="text"
                                    {...register(`riders.${index}.description`)}
                                    placeholder="Enter Rider Name"
                                    disabled={!watchRiders?.[index]?.selected}
                                    className="w-full text-sm border-slate-200 rounded-md focus:outline-none focus:ring-[#B8873A]/20 focus:border-[#B8873A] disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed"
                                  />
                                ) : (
                                  <select
                                    {...register(`riders.${index}.description`)}
                                    disabled={!watchRiders?.[index]?.selected}
                                    className="w-full text-sm border-slate-200 rounded-md focus:outline-none focus:ring-[#B8873A]/20 focus:border-[#B8873A] disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed"
                                  >
                                    <option value="">Select Rider</option>
                                    {riders.map((rider) => (
                                      <option
                                        key={rider.id}
                                        value={rider.riderName}
                                      >
                                        {rider.riderCode
                                          ? `[${rider.riderCode}] `
                                          : ""}
                                        {rider.riderName}
                                      </option>
                                    ))}
                                  </select>
                                )}
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
                                  disabled={!watchRiders?.[index]?.selected}
                                  className="w-full text-sm border-slate-200 rounded-md focus:outline-none focus:ring-[#B8873A]/20 focus:border-[#B8873A] disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed"
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
                                  disabled={!watchRiders?.[index]?.selected}
                                  className="w-20 text-sm border-slate-200 rounded-md focus:outline-none focus:ring-[#B8873A]/20 focus:border-[#B8873A] disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed"
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
                                  disabled={!watchRiders?.[index]?.selected}
                                  className="w-20 text-sm border-slate-200 rounded-md focus:outline-none focus:ring-[#B8873A]/20 focus:border-[#B8873A] disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed"
                                />
                                {errors.riders?.[index]?.ppt && (
                                  <p className="text-xs text-red-500 mt-1">
                                    {errors.riders[index]?.ppt?.message}
                                  </p>
                                )}
                              </td>
                              <td className="px-2 py-1.5">
                                <input
                                  type="text"
                                  {...register(`riders.${index}.premium`)}
                                  placeholder="Premium"
                                  readOnly={!isOtherPolicy && selectedProduct?.planNumber !== "774" && selectedProduct?.planNumber !== "751" && selectedProduct?.planNumber !== "880"}
                                  disabled={!watchRiders?.[index]?.selected}
                                  className={`w-20 text-sm border-slate-200 rounded-md focus:outline-none focus:ring-[#B8873A]/20 focus:border-[#B8873A] ${
                                    !isOtherPolicy && selectedProduct?.planNumber !== "774" && selectedProduct?.planNumber !== "751" && selectedProduct?.planNumber !== "880"
                                      ? "bg-slate-50 cursor-not-allowed text-slate-500"
                                      : "bg-white text-slate-800"
                                  } disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed`}
                                />
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
                        <p className="text-xs text-slate-500 mt-1">
                          {attributeHints.sumAssured}
                        </p>
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
                        className={`w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm ${
                          !isOtherPolicy
                            ? "bg-slate-50 text-slate-500 cursor-not-allowed"
                            : "focus:outline-none focus:ring-2 focus:ring-[#B8873A]/20 focus:border-[#B8873A]"
                        }`}
                        readOnly={!isOtherPolicy}
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
                        GST / Tax
                      </label>
                      <input
                        type="text"
                        {...register("gst")}
                        placeholder="Enter GST / Tax"
                        className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#B8873A]/20 focus:border-[#B8873A] text-sm"
                      />
                      {errors.gst && (
                        <p className="text-xs text-red-500 mt-1">
                          {errors.gst.message}
                        </p>
                      )}
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
                      {errors.totalInstallmentPremium && (
                        <p className="text-xs text-red-500 mt-1">
                          {errors.totalInstallmentPremium.message}
                        </p>
                      )}
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
                      <select
                        {...register("statusId")}
                        className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#B8873A]/20 focus:border-[#B8873A] text-sm"
                      >
                        {statuses.map((status) => (
                          <option key={status.id} value={status.id}>
                            {status.statusName}
                          </option>
                        ))}
                      </select>
                      {errors.statusId && (
                        <p className="text-xs text-red-500 mt-1">
                          {errors.statusId.message}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        First Unpaid Premium (F.U.P.) Date
                      </label>
                      <Controller
                        control={control}
                        name="fupDate"
                        render={({ field }) => (
                          <DatePicker
                            value={field.value}
                            onChange={(date) =>
                              field.onChange(
                                date ? format(date, "yyyy-MM-dd") : "",
                              )
                            }
                          />
                        )}
                      />
                      {errors.fupDate && (
                        <p className="text-xs text-red-500 mt-1">
                          {errors.fupDate.message}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Premium Adjusted
                      </label>
                      <input
                        type="text"
                        placeholder="Premium Adjusted"
                        className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#B8873A]/20 focus:border-[#B8873A] text-sm"
                      />
                    </div>
                    <div className="flex items-center gap-3 pt-6">
                      <input
                        id="premiumDeposit"
                        type="checkbox"
                        className="h-4 w-4 rounded border-slate-300 text-[#1877F2] focus:ring-[#1877F2]/20 cursor-pointer"
                      />
                      <label
                        htmlFor="premiumDeposit"
                        className="text-sm font-medium text-slate-700 cursor-pointer"
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
                        placeholder="Loan Taken"
                        className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#B8873A]/20 focus:border-[#B8873A] text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        First Unpaid Loan Int. (FULI) Date
                      </label>
                      <Controller
                        control={control}
                        name="fuliDate"
                        render={({ field }) => (
                          <DatePicker
                            value={field.value}
                            onChange={(date) =>
                              field.onChange(
                                date ? format(date, "yyyy-MM-dd") : "",
                              )
                            }
                          />
                        )}
                      />
                      {errors.fuliDate && (
                        <p className="text-xs text-red-500 mt-1">
                          {errors.fuliDate.message}
                        </p>
                      )}
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
                          checked={useNach}
                          onChange={(e) => {
                            setUseNach(e.target.checked);
                            if (e.target.checked) setUseNeft(false);
                          }}
                          className="h-4 w-4 rounded border-slate-300 text-[#1877F2] focus:ring-[#1877F2]/20 cursor-pointer"
                        />
                        <label
                          htmlFor="useNachCheckbox"
                          className="text-sm font-medium text-slate-700 cursor-pointer"
                        >
                          NACH Details
                        </label>
                      </div>
                      {useNach && (
                        <>
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                              Bank Name
                            </label>
                            <input
                              type="text"
                              placeholder="Bank Name"
                              {...register("bankName")}
                              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#B8873A]/20 focus:border-[#B8873A] text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                              Account Number
                            </label>
                            <input
                              type="text"
                              placeholder="Account Number"
                              {...register("accountNumber")}
                              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#B8873A]/20 focus:border-[#B8873A] text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                              IFSC Code
                            </label>
                            <input
                              type="text"
                              placeholder="IFSC Code"
                              {...register("ifscCode")}
                              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#B8873A]/20 focus:border-[#B8873A] text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                              Account Holder Name
                            </label>
                            <input
                              type="text"
                              placeholder="Account Holder Name"
                              {...register("accountHolderName")}
                              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#B8873A]/20 focus:border-[#B8873A] text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                              Bank Branch
                            </label>
                            <input
                              {...register("bankBranch")}
                              type="text"
                              placeholder="Bank Branch"
                              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#B8873A]/20 focus:border-[#B8873A] text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                              City
                            </label>
                            <input
                              {...register("city")}
                              type="text"
                              placeholder="City"
                              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#B8873A]/20 focus:border-[#B8873A] text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                              Account Type
                            </label>
                            <input
                              {...register("accountType")}
                              placeholder="Account Type"
                              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#B8873A]/20 focus:border-[#B8873A] text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                              Debt Date
                            </label>
                            <input
                              value={watchFupDate || ""}
                              readOnly
                              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl bg-slate-50 text-sm text-slate-500 cursor-not-allowed"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                              MICR Number
                            </label>
                            <input
                              {...register("micrNumber")}
                              type="text"
                              placeholder="MICR Number"
                              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#B8873A]/20 focus:border-[#B8873A] text-sm"
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
                          checked={useNeft}
                          onChange={(e) => {
                            setUseNeft(e.target.checked);
                            if (e.target.checked) setUseNach(false);
                          }}
                          className="h-4 w-4 rounded border-slate-300 text-[#1877F2] focus:ring-[#1877F2]/20 cursor-pointer"
                        />
                        <label
                          htmlFor="useNeftCheckbox"
                          className="text-sm font-medium text-slate-700 cursor-pointer"
                        >
                          NEFT Details
                        </label>
                      </div>

                      {useNeft && (
                        <>
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                              Bank Name
                            </label>
                            <input
                              type="text"
                              placeholder="Bank Name"
                              {...register("neftBankName")}
                              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#B8873A]/20 focus:border-[#B8873A] text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                              Account Number
                            </label>
                            <input
                              type="text"
                              placeholder="Account Number"
                              {...register("neftAccountNumber")}
                              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#B8873A]/20 focus:border-[#B8873A] text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                              IFSC Code
                            </label>
                            <input
                              type="text"
                              placeholder="IFSC Code"
                              {...register("neftIfscCode")}
                              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#B8873A]/20 focus:border-[#B8873A] text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                              Account Holder Name
                            </label>
                            <input
                              type="text"
                              placeholder="Account Holder Name"
                              {...register("neftAccountHolderName")}
                              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#B8873A]/20 focus:border-[#B8873A] text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                              Bank Branch
                            </label>
                            <input
                              {...register("neftBankBranch")}
                              type="text"
                              placeholder="Bank Branch"
                              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#B8873A]/20 focus:border-[#B8873A] text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                              Submission Date
                            </label>
                            <Controller
                              control={control}
                              name="neftSubmissionDate"
                              render={({ field }) => (
                                <DatePicker
                                  value={field.value}
                                  onChange={(date) =>
                                    field.onChange(
                                      date ? format(date, "yyyy-MM-dd") : "",
                                    )
                                  }
                                />
                              )}
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
                  actions={
                    <button
                      type="button"
                      onClick={() => {
                        if (watchAge && Number(watchAge) < 18) {
                          toast.error("Insurer age is under 18. Nominee cannot be added.");
                          return;
                        }
                        appendNominee({
                          nomineeName: "",
                          relationship: "",
                          dateOfBirth: "",
                          percentage: null,
                          phone: "",
                          email: "",
                        });
                      }}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50"
                    >
                      <Plus size={14} />
                      Add Nominee
                    </button>
                  }
                >
                  {nomineeFields.length === 0 ? (
                    <p className="text-sm text-slate-500 text-center py-6">
                      No nominees added. Click Add Nominee to start.
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {nomineeFields.map((field, index) => (
                        <fieldset
                          key={field.id}
                          disabled={Boolean(watchAge && Number(watchAge) < 18)}
                          className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 relative disabled:opacity-60 space-y-3"
                        >
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-medium text-slate-700 mb-1">
                                Nominee Name
                              </label>
                              <input
                                {...register(`nominees.${index}.nomineeName`)}
                                placeholder="Full Name"
                                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#B8873A]/20 focus:border-[#B8873A] text-sm bg-white"
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
                              <label className="block text-xs font-medium text-slate-700 mb-1">
                                Relationship
                              </label>
                              <input
                                {...register(
                                  `nominees.${index}.relationship`,
                                )}
                                placeholder="e.g., Spouse, Son"
                                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#B8873A]/20 focus:border-[#B8873A] text-sm bg-white"
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
                              <label className="block text-xs font-medium text-slate-700 mb-1">
                                Date of Birth
                              </label>
                              <Controller
                                control={control}
                                name={`nominees.${index}.dateOfBirth`}
                                render={({ field }) => (
                                  <DatePicker
                                    value={field.value}
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
                              <label className="block text-xs font-medium text-slate-700 mb-1">
                                Share %
                              </label>
                              <input
                                type="number"
                                {...register(`nominees.${index}.percentage`)}
                                placeholder="e.g., 100"
                                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#B8873A]/20 focus:border-[#B8873A] text-sm bg-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
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
                              <label className="block text-xs font-medium text-slate-700 mb-1">
                                Phone
                              </label>
                              <input
                                type="tel"
                                {...register(`nominees.${index}.phone`)}
                                placeholder="Mobile Number"
                                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#B8873A]/20 focus:border-[#B8873A] text-sm bg-white"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-slate-700 mb-1">
                                Email
                              </label>
                              <input
                                type="email"
                                {...register(`nominees.${index}.email`)}
                                placeholder="Email Address"
                                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#B8873A]/20 focus:border-[#B8873A] text-sm bg-white"
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
                            className="absolute top-2.5 right-2.5 inline-flex items-center justify-center w-7 h-7 rounded-lg border border-slate-200 bg-white text-rose-500 hover:bg-rose-50 hover:border-rose-200 transition-colors shadow-sm"
                            title="Remove Nominee"
                          >
                            <Trash2 size={13} />
                          </button>
                        </fieldset>
                      ))}
                    </div>
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
                      <Controller
                        control={control}
                        name="agencyId"
                        render={({ field }) => (
                          <SearchableSelect
                            placeholder="Search agency..."
                            searchPlaceholder="Search by name or agency code"
                            options={agencyOptions}
                            value={field.value}
                            onChange={(val) => {
                              field.onChange(val);
                            }}
                            error={errors.agencyId?.message}
                            disabled={agenciesLoading}
                          />
                        )}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Branch
                      </label>
                      <Controller
                        name="branchId"
                        control={control}
                        render={({ field }) => (
                          <SearchableSelect
                            placeholder="Search branch..."
                            searchPlaceholder="Search by name or branch code"
                            options={branchOptions}
                            value={field.value || ""}
                            onChange={(val) => {
                              field.onChange(val);
                            }}
                            error={errors.branchId?.message}
                            disabled={branchesLoading}
                          />
                        )}
                      />
                    </div>
                    <div className="relative">
                      <Controller
                        name="advisorId"
                        control={control}
                        render={({ field }) => (
                          <AdvisorAutoComplete
                            value={field.value || ""}
                            onChange={field.onChange}
                            advisors={filteredAdvisors}
                            disabled={!watchAgencyId}
                            placeholder={
                              watchAgencyId
                                ? "Search Advisor..."
                                : "Select Agency First"
                            }
                          />
                        )}
                      />
                      {errors.advisorId && (
                        <p className="text-xs text-red-500 mt-1">
                          {errors.advisorId.message}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Agent Code (Autofilled)
                      </label>
                      <input
                        {...register("agentCode")}
                        readOnly
                        placeholder="Auto Filled"
                        className="w-full px-3 py-2.5 border border-slate-200 rounded-xl bg-slate-50 text-sm text-slate-500 cursor-not-allowed"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Medical
                      </label>
                      <input
                        type="text"
                        placeholder="Medical Details"
                        className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#B8873A]/20 focus:border-[#B8873A] text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Tax Beneficiary
                      </label>
                      <input
                        type="text"
                        placeholder="Tax Beneficiary"
                        className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#B8873A]/20 focus:border-[#B8873A] text-sm"
                      />
                    </div>
                    <div className="flex items-center gap-3 pt-6">
                      <input
                        id="ageAdmitted"
                        type="checkbox"
                        className="h-4 w-4 rounded border-slate-300 text-[#1877F2] focus:ring-[#1877F2]/20 cursor-pointer"
                      />
                      <label
                        htmlFor="ageAdmitted"
                        className="text-sm font-medium text-slate-700 cursor-pointer"
                      >
                        Age Admitted
                      </label>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Notes
                      </label>
                      <textarea
                        rows={4}
                        placeholder="Enter Notes..."
                        className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#B8873A]/20 focus:border-[#B8873A] text-sm resize-none"
                      />
                    </div>
                  </div>
                </CustomerSectionCard>
              </div>
            </div>
          </div>
        </form>
      </FormProvider>
    </div>
  );
}
