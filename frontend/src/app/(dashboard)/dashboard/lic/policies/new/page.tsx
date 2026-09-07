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
} from "lucide-react";
import toast from "react-hot-toast";
import DatePicker from "./DatePicker";
import { format, addYears, differenceInYears } from "date-fns";

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
  const [productOptionsData, setProductOptionsData] = useState<{terms: number[], ppts: number[], combinations: {term: number, ppt: number}[]}>({ terms: [], ppts: [], combinations: [] });
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
      const selectedProductAttributes = productAttributeValues.filter(
        (attr) => attr.productId === values.productId,
      );
      const getAttributeValue = (code: string) =>
        selectedProductAttributes.find(
          (a) => a.attribute.attributeCode === code,
        )?.value;

      let refinedSchema = policySchema;

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
          });
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
      member?.dob ? differenceInYears(new Date(), new Date(member.dob)) : undefined,
    );
    setValue("gender", member?.gender || "");
    setValue("pan", member?.panNumber || "");

    // Auto-fill bank details from the selected customer's default bank account
    if (member && member.bankDetails && member.bankDetails.length > 0) {
      const defaultBank =
        member.bankDetails.find((b) => b.isDefault) || member.bankDetails[0];
      if (defaultBank) {
        // NACH fields
        setValue("bankName", defaultBank.bankName || "");
        setValue("bankBranch", defaultBank.bankBranch || "");
        setValue("city", defaultBank.city || "");
        setValue("accountType", defaultBank.accountType || "");
        setValue("accountNumber", defaultBank.accountNumber || "");
        setValue("ifscCode", defaultBank.ifscCode || "");
        setValue("micrNumber", defaultBank.micrNumber || "");

        // NEFT fields
        setValue("neftBankName", defaultBank.bankName || "");
        setValue("neftBankBranch", defaultBank.bankBranch || "");
        setValue("neftAccountNumber", defaultBank.accountNumber || "");
        setValue("neftIfscCode", defaultBank.ifscCode || "");
      }
    } else {
      // Clear all bank fields if no bank details exist
      setValue("bankName", "");
      setValue("bankBranch", "");
      setValue("city", "");
      setValue("accountType", "");
      setValue("accountNumber", "");
      setValue("ifscCode", "");
      setValue("micrNumber", "");
      setValue("neftBankName", "");
      setValue("neftBankBranch", "");
      setValue("neftAccountNumber", "");
      setValue("neftIfscCode", "");
    }

    if (member) {
      setValue("accountHolderName", getFullName(member));
      setValue("neftAccountHolderName", getFullName(member));
    } else {
      setValue("accountHolderName", "");
      setValue("neftAccountHolderName", "");
    }
  }, [watchLifeAssuredId, masterCustomers, setValue]);

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

  useEffect(() => {
    const member = masterCustomers.find((m) => m.id === watchLifeAssuredId);
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
    // Do NOT clear fields when NACH is unchecked - user may have edited them manually
  }, [useNach, watchLifeAssuredId, masterCustomers, setValue]);

  useEffect(() => {
    const member = masterCustomers.find((m) => m.id === watchLifeAssuredId);
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
    // Do NOT clear fields when NEFT is unchecked - user may have edited them manually
  }, [useNeft, watchLifeAssuredId, masterCustomers, setValue]);

  const productOptions = useMemo(() => {
    const filteredProducts = [...products].filter((product) => {
      const provider = providers.find((p) => p.id === product.providerId);
      const providerCode = provider?.code?.toLowerCase();
      const isLICProvider = providerCode === "lic";

      if (selectedPolicyType === "lic") return isLICProvider;
      if (selectedPolicyType === "other") return providerCode ? !isLICProvider : false;
      return true;
    });

    const active = filteredProducts
      .filter(p => p.productType !== 'Withdrawn')
      .sort((a, b) => (a.planNumber ?? "").localeCompare(b.planNumber ?? ""))
      .map(p => ({
        value: p.id,
        label: p.productName,
        label: p.planNumber ? `${p.planNumber} - ${p.productName}` : p.productName,
        sublabel: p.planNumber ? `Plan No: ${p.planNumber}` : undefined,
      }));

    const withdrawn = filteredProducts
      .filter(p => p.productType === 'Withdrawn')
      .sort((a, b) => a.productName.localeCompare(b.productName))
      .map(p => ({
        value: p.id,
        label: p.productName,
        label: p.planNumber ? `${p.planNumber} - ${p.productName}` : p.productName,
        sublabel: p.planNumber ? `Plan No: ${p.planNumber}` : undefined,
      }));

    if (withdrawn.length > 0) {
      return [...active, { label: "Withdrawn Plans", options: withdrawn, isCollapsible: true }];
    }
    return active;
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
    ? watchRiders.map((r: any) => `${r.description}-${r.sum}-${r.term}-${r.ppt}`).join('|') 
    : "";

  // Auto-fill Term Rider fields
  useEffect(() => {
    if (Array.isArray(watchRiders)) {
      watchRiders.forEach((r, index) => {
        if (r.description && r.description.toLowerCase().includes("term")) {
          const expectedSum = watchSumAssured || "";
          const expectedTerm = watchTerm || "";
          const expectedPpt = watchPpt || "";
          
          if (r.sum != expectedSum || r.term != expectedTerm || r.ppt != expectedPpt) {
            setValue(`riders.${index}.sum`, expectedSum);
            setValue(`riders.${index}.term`, expectedTerm);
            setValue(`riders.${index}.ppt`, expectedPpt);
          }
        }
      });
    }
  }, [watchRiders, watchSumAssured, watchTerm, watchPpt, setValue]);

  // Auto-calculate individual rider premiums based on mode and sum up for total rider premium
  useEffect(() => {
    if (Array.isArray(watchRiders) && watchProductId && watchAge && watchMode) {
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
                    sumAssured: sum,
                    premiumMode: mode,
                    productId: watchProductId
                  },
                  {
                    signal: controller.signal,
                    headers: {
                      Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
                    },
                  }
                );
                const finalRiderPremium = response.data?.data?.premium || 0;
                return { index, newPremium: finalRiderPremium, currentPremium, isValid: true };
              } catch (error) {
                if (!axios.isCancel(error)) {
                  console.error("Failed to fetch rider premium preview", error);
                }
                return { index, newPremium: currentPremium, currentPremium, isValid: false };
              }
            }
            return { index, newPremium: currentPremium, currentPremium, isValid: false };
          })
        );

        updatedRiders.forEach(({ index, newPremium, currentPremium, isValid }) => {
          totalInstallmentRiderPremium += newPremium;
          if (isValid && newPremium !== currentPremium) {
            setValue(`riders.${index}.premium`, newPremium);
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
  }, [ridersPreviewKey, watchProductId, watchAge, watchMode, riders, setValue]);

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

  // Auto-select PPT when Term is selected
  useEffect(() => {
    if (watchTerm && productOptionsData.combinations.length > 0) {
      const termValue = Number(watchTerm);
      // Find combinations for this term
      const matchingCombs = productOptionsData.combinations.filter(c => c.term === termValue && c.ppt !== null);
      if (matchingCombs.length === 1) {
        // Only one possible PPT for this term, auto select it
        setValue("ppt", matchingCombs[0].ppt, { shouldValidate: true, shouldDirty: true });
      } else if (matchingCombs.length > 0 && watchPpt) {
        // If current PPT is not in the valid list for this term, clear or reset it
        const isValid = matchingCombs.some(c => c.ppt === Number(watchPpt));
        if (!isValid) {
          setValue("ppt", matchingCombs[0].ppt, { shouldValidate: true, shouldDirty: true });
        }
      } else if (matchingCombs.length > 0 && !watchPpt) {
        // If multiple and none selected, just pick the first or leave empty
        // setValue("ppt", matchingCombs[0].ppt, { shouldValidate: true, shouldDirty: true });
      }
    }
  }, [watchTerm, productOptionsData.combinations, setValue, watchPpt]);

  useEffect(() => {
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
  }, [premiumPreviewKey, products, setValue, watchAge, watchMode, watchOption, watchPpt, watchProductId, watchProposerAge, watchSpouseAge, watchSumAssured, watchTerm, watchTotalRiderPremium, watchSmoker, watchGender]);

  const selectedProduct = useMemo(
    () => products.find((p) => p.id === watchProductId),
    [watchProductId, products],
  );

  useEffect(() => {
    if (!selectedProduct) return;

    if (["771", "745", "883", "887"].includes(selectedProduct.planNumber) && watchAge) {
      setValue("term", String(100 - Number(watchAge)) as any, {
        shouldValidate: true,
        shouldDirty: true,
      });
    }
  }, [watchProductId, watchAge, selectedProduct, setValue]);

  // Auto-populate riders when a product is selected
  useEffect(() => {
    if (selectedProduct && Array.isArray(selectedProduct.productRiders)) {
      const newRiders = selectedProduct.productRiders.map((pr: any) => ({
        description: pr.rider?.riderName || "",
        sum: null,
        term: null,
        ppt: null,
        premium: null,
        mode: "",
      }));
      replaceRiders(newRiders);
    } else {
      replaceRiders([]);
    }
  }, [selectedProduct, replaceRiders]);

  // When product changes, update attribute hints and pre-fill fields with minimum values.
  useEffect(() => {
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
    const minPpt = getAttributeValue("MIN_PPT") || (isPlan889 ? "5" : undefined);
    const maxPpt = getAttributeValue("MAX_PPT") || (isPlan889 ? "15" : undefined);
    const minSum = getAttributeValue("MIN_SUM_ASSURED") || (isPlan889 ? "300000" : undefined);
    const maxSum = getAttributeValue("MAX_SUM_ASSURED");
    const minAge = getAttributeValue("MIN_ENTRY_AGE") || (isPlan889 ? "18" : undefined);
    const maxAge = getAttributeValue("MAX_ENTRY_AGE") || (isPlan889 ? "50" : undefined);

    // For plan 771, the term is calculated, not pre-filled from attributes.
    if (!["771", "745", "883", "887"].includes(selectedProduct?.planNumber ?? "")) {
      if (minTerm) setValue("term", minTerm as any);
      else setValue("term", undefined);
    }

    if (minPpt) setValue("ppt", minPpt as any);
    else setValue("ppt", undefined);

    if (minSum) setValue("sumAssured", minSum as any);
    else setValue("sumAssured", undefined);

    setAttributeHints({
      term:
        minTerm || maxTerm
          ? `Range: ${minTerm || "N/A"} - ${maxTerm || "N/A"}`
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
  }, [watchProductId, productAttributeValues, products, setValue]);

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
              setValue("term", String(minTerm), { shouldValidate: true, shouldDirty: true });
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
        attributes: {
          MIN_POLICY_TERM: normalizeNumber(data.term),
          MAX_POLICY_TERM: normalizeNumber(data.term),

          MIN_PPT: normalizeNumber(data.ppt),
          MAX_PPT: normalizeNumber(data.ppt),

          MIN_SUM_ASSURED: normalizeNumber(data.sumAssured),
          MAX_SUM_ASSURED: normalizeNumber(data.sumAssured),
        },
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
                      {selectedProduct?.planNumber === "774" && !modes.find(m => m.modeName === "SSS") && (
                        <option value="SSS">SSS</option>
                      )}
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
                    <select
                      {...register("term")}
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#B8873A]/20 focus:border-[#B8873A] text-sm disabled:bg-slate-50 disabled:cursor-not-allowed"
                      disabled={["771", "745", "883", "887"].includes(selectedProduct?.planNumber ?? "")}
                    >
                      <option value="">Select Term</option>
                      {["771", "745", "883", "887"].includes(selectedProduct?.planNumber ?? "") && watchAge ? (
                        <option value={String(100 - Number(watchAge))}>{100 - Number(watchAge)}</option>
                      ) : (
                        productOptionsData.terms.map(t => (
                          <option key={t} value={t}>{t}</option>
                        ))
                      )}
                    </select>
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
                      {selectedProduct?.planNumber === "883"
                        ? "Gua.Addn.Period"
                        : "PPT"}
                      {(selectedProduct?.planNumber === "889" ||
                        selectedProduct?.planNumber === "881" ||
                        selectedProduct?.planNumber === "912") && (
                        <span className="text-red-500"> *</span>
                      )}
                    </label>
                    <select
                      {...register("ppt")}
                      disabled={productOptionsData.combinations.length > 0 && productOptionsData.combinations.every(c => c.term === c.ppt)}
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#B8873A]/20 focus:border-[#B8873A] text-sm disabled:bg-slate-50 disabled:cursor-not-allowed"
                    >
                      <option value="">
                        {selectedProduct?.planNumber === "883" ? "Select Gua.Addn.Period" : "Select PPT"}
                      </option>
                      {(() => {
                        let optionsToRender = productOptionsData.ppts;
                        if (selectedProduct?.planNumber === "887") {
                          if (watchMode === "Single") {
                            optionsToRender = ["1"];
                          } else {
                            const currentTerm = Number(watch("term"));
                            const allowed = [5, 10, 15];
                            if (currentTerm && !allowed.includes(currentTerm)) {
                              allowed.push(currentTerm);
                            }
                            optionsToRender = productOptionsData.ppts.filter(p => allowed.includes(Number(p)));
                          }
                        }
                        return optionsToRender.map(p => (
                          <option key={p} value={p}>{p}</option>
                        ));
                      })()}
                    </select>
                    {errors.ppt && (
                      <p className="text-xs text-red-500 mt-1">
                        {errors.ppt.message}
                      </p>
                    )}
                    {attributeHints.ppt && !errors.ppt && !errors.term && (
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
                  {selectedProduct?.planNumber === "774" && (
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
                    </>
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
                          <tr key={field.id}>
                            <td className="px-2 py-1.5 w-1/3">
                              <select
                                {...register(`riders.${index}.description`)}
                                className="w-full text-sm border-slate-200 rounded-md focus:outline-none focus:ring-[#B8873A]/20 focus:border-[#B8873A]"
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
                              <input
                                type="text"
                                {...register(`riders.${index}.premium`)}
                                placeholder="Premium"
                                readOnly
                                className="w-20 text-sm border-slate-200 rounded-md bg-slate-50 cursor-not-allowed focus:outline-none"
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
                          {...register("statusId")}
                          className="w-full rounded-lg border border-slate-300 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
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
                {watchProductId && (
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
                        <div className="md:col-span-2 flex items-center gap-3">
                          <input
                            id="useNachCheckbox"
                            type="checkbox"
                            checked={useNach}
                            onChange={(e) => setUseNach(e.target.checked)}
                            className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          />
                          <label
                            htmlFor="useNachCheckbox"
                            className="text-sm font-medium text-slate-700 cursor-pointer"
                          >
                            Premiums will be paid through NACH
                          </label>
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2">
                            Bank Name
                          </label>
                          <input
                            type="text"
                            placeholder="Bank Name"
                            {...register("bankName")}
                            readOnly={!useNach}
                            className={`w-full rounded-lg border border-slate-300 px-3 py-2.5 ${!useNach ? "bg-slate-100 text-slate-500 cursor-not-allowed" : "bg-white"}`}
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
                            readOnly={!useNach}
                            className={`w-full rounded-lg border border-slate-300 px-3 py-2.5 ${!useNach ? "bg-slate-100 text-slate-500 cursor-not-allowed" : "bg-white"}`}
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
                            readOnly={!useNach}
                            className={`w-full rounded-lg border border-slate-300 px-3 py-2.5 ${!useNach ? "bg-slate-100 text-slate-500 cursor-not-allowed" : "bg-white"}`}
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
                            readOnly={!useNach}
                            className={`w-full rounded-lg border border-slate-300 px-3 py-2.5 ${!useNach ? "bg-slate-100 text-slate-500 cursor-not-allowed" : "bg-white"}`}
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
                            readOnly={!useNach}
                            className={`w-full rounded-lg border border-slate-300 px-3 py-2.5 ${!useNach ? "bg-slate-100 text-slate-500 cursor-not-allowed" : "bg-white"}`}
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
                            readOnly={!useNach}
                            className={`w-full rounded-lg border border-slate-300 px-3 py-2.5 ${!useNach ? "bg-slate-100 text-slate-500 cursor-not-allowed" : "bg-white"}`}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2">
                            Account Type
                          </label>
                          <input
                            {...register("accountType")}
                            placeholder="Account Type"
                            readOnly={!useNach}
                            className={`w-full rounded-lg border border-slate-300 px-3 py-2.5 ${!useNach ? "bg-slate-100 text-slate-500 cursor-not-allowed" : "bg-white"}`}
                          />
                        </div>
                        <div>
                          <label className="bolck text-sm font-medium mb-2">
                            Debt Date
                          </label>
                          <input
                            value={watchFupDate || ""}
                            readOnly
                            className="w-full rounded-lg border border-slate-300 bg-slate-100 px-3 py-2.5 text-slate-500 cursor-not-allowed"
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
                            readOnly={!useNach}
                            className={`w-full rounded-lg border border-slate-300 px-3 py-2.5 ${!useNach ? "bg-slate-100 text-slate-500 cursor-not-allowed" : "bg-white"}`}
                          />
                        </div>

                        {/* NEFT Section */}
                        <div className="md:col-span-2 my-4 border-t border-slate-200"></div>

                        <div className="md:col-span-2 flex items-center gap-3">
                          <input
                            id="useNeftCheckbox"
                            type="checkbox"
                            checked={useNeft}
                            onChange={(e) => setUseNeft(e.target.checked)}
                            className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          />
                          <label
                            htmlFor="useNeftCheckbox"
                            className="text-sm font-medium text-slate-700 cursor-pointer"
                          >
                            NEFT details are available
                          </label>
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-2">
                            Bank Name
                          </label>
                          <input
                            type="text"
                            placeholder="Bank Name"
                            {...register("neftBankName")}
                            readOnly={!useNeft}
                            className={`w-full rounded-lg border border-slate-300 px-3 py-2.5 ${!useNeft ? "bg-slate-100 text-slate-500 cursor-not-allowed" : "bg-white"}`}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2">
                            Account Number
                          </label>
                          <input
                            type="text"
                            placeholder="Account Number"
                            {...register("neftAccountNumber")}
                            readOnly={!useNeft}
                            className={`w-full rounded-lg border border-slate-300 px-3 py-2.5 ${!useNeft ? "bg-slate-100 text-slate-500 cursor-not-allowed" : "bg-white"}`}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2">
                            IFSC Code
                          </label>
                          <input
                            type="text"
                            placeholder="IFSC Code"
                            {...register("neftIfscCode")}
                            readOnly={!useNeft}
                            className={`w-full rounded-lg border border-slate-300 px-3 py-2.5 ${!useNeft ? "bg-slate-100 text-slate-500 cursor-not-allowed" : "bg-white"}`}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2">
                            Account Holder Name
                          </label>
                          <input
                            type="text"
                            placeholder="Account Holder Name"
                            {...register("neftAccountHolderName")}
                            readOnly={!useNeft}
                            className={`w-full rounded-lg border border-slate-300 px-3 py-2.5 ${!useNeft ? "bg-slate-100 text-slate-500 cursor-not-allowed" : "bg-white"}`}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2">
                            Bank Branch
                          </label>
                          <input
                            {...register("neftBankBranch")}
                            type="text"
                            placeholder="Bank Branch"
                            readOnly={!useNeft}
                            className={`w-full rounded-lg border border-slate-300 px-3 py-2.5 ${!useNeft ? "bg-slate-100 text-slate-500 cursor-not-allowed" : "bg-white"}`}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2">
                            Submission Date
                          </label>
                          <Controller
                            control={control}
                            name="neftSubmissionDate"
                            render={({ field }) => (
                              <DatePicker
                                value={
                                  field.value
                                    ? new Date(field.value)
                                    : undefined
                                }
                                onChange={(date) =>
                                  field.onChange(
                                    date ? format(date, "yyyy-MM-dd") : "",
                                  )
                                }
                                readOnly={!useNeft}
                              />
                            )}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
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
                        <label className="block text-sm font-medium mb-2">
                          Agency <span className="text-red-500">*</span>
                        </label>
                        <select
                          {...register("agencyId")}
                          className="w-full rounded-lg border border-slate-300 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Select Agency</option>
                          {agencies.map((agency) => (
                            <option key={agency.id} value={agency.id}>
                              {agency.agencyName}
                            </option>
                          ))}
                        </select>
                        {errors.agencyId && (
                          <p className="text-xs text-red-500 mt-1">
                            {errors.agencyId.message}
                          </p>
                        )}
                      </div>
                      <div>
                        <Controller
                          name="branchId"
                          control={control}
                          render={({ field }) => (
                            <BranchAutoComplete
                              value={field.value || ""}
                              onChange={field.onChange}
                              branches={branches}
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
      </FormProvider>
    </div>
  );
}
