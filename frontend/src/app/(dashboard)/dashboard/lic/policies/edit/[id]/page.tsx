"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
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
import {
    fetchPolicyById,
    updatePolicy,
} from "@/features/policy/policySlice";
import { fetchPolicyStatuses } from "@/features/policy/policyStatusMasterSlice";
import { fetchLicBranches } from "@/features/lic/licBranchSlice";
import { fetchPremiumModes } from "@/features/policy/premiumModeMasterSlice";
import { useRouter, useParams } from "next/navigation";
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
import { useNotificationStore } from "@/store/notificationStore";
import { SearchableSelect } from "@/features/customers/components/CustomerUi";


function getFullName(customer: {
    salutation?: string | null;
    firstName: string;
    middleName?: string | null;
    lastName?: string | null;
}) {
    return [customer.salutation, customer.firstName, customer.middleName, customer.lastName].filter(Boolean).join(" ");
}


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
    mode: z.string().optional(),
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
        .trim()
        .min(1, "Policy number is required")
        .regex(/^\d{9}$/, "Policy number must be exactly 9 digits"),
    productId: z.string().min(1, "Plan is required"),
    mode: z.string().min(1, "Mode is required"),
    commencementDate: z.string().min(1, "Commencement date is required"),
    completionDate: z.string().min(1, "Completion date is required"),

    term: z.preprocess(
        (val) => (val === "" ? undefined : val),
        z.coerce.number().int().nonnegative().optional()
    ),

    ppt: z.preprocess(
        (val) => (val === "" ? undefined : val),
        z.coerce.number().int().nonnegative().optional()
    ),

    extraClass: z.string().optional(),

    ratePercent: z.preprocess(
        (val) => (val === "" ? undefined : val),
        z.coerce.number().nonnegative().optional()
    ),

    sumAssured: z.preprocess(
        (val) => (val === "" ? undefined : val),
        z.coerce.number().nonnegative().optional()
    ),

    basicYearlyPremium: z.preprocess(
        (val) => (val === "" ? undefined : val),
        z.coerce.number().nonnegative().optional()
    ),

    totalYearlyPremium: z.preprocess(
        (val) => (val === "" ? undefined : val),
        z.coerce.number().nonnegative().optional()
    ),

    totalRiderPremium: z.preprocess(
        (val) => (val === "" ? undefined : val),
        z.coerce.number().nonnegative().optional()
    ),

    installmentPremium: z.preprocess(
        (val) => (val === "" ? undefined : val),
        z.coerce.number().nonnegative().optional()
    ),

    gst: z.preprocess(
        (val) => (val === "" ? undefined : val),
        z.coerce.number().nonnegative().optional()
    ),

    totalInstallmentPremium: z.preprocess(
        (val) => (val === "" ? undefined : val),
        z.coerce.number().nonnegative().optional()
    ),

    riders: z.array(riderSchema).optional(),

    advisorId: z.string().optional(),
    agentCode: z.string().optional(),
    accountHolderName: z.string().optional(),
    branchId: z.string().optional(),
});

type PolicyFormValues = z.infer<typeof policySchema>;

export default function EditLICPolicyPage() {
    const router = useRouter();

    const params = useParams();
    const id = params.id as string;

    const dispatch = useDispatch<AppDispatch>();

    const { fetchNotifications } = useNotificationStore();

    const { selectedPolicy } = useSelector(
        (state: RootState) => state.policies
    );

    const {
        register,
        handleSubmit,
        control,
        watch,
        setValue,
        reset,
        formState: { errors },
    } = useForm<PolicyFormValues>({
        resolver: zodResolver(policySchema),
        defaultValues: {
            riders: [],
            statusId: "",
            fupDate: ""
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
    const { branches: licBranches, isLoading: licBranchesLoading } = useSelector((s: RootState) => s.licBranch);

    const [activeSection, setActiveSection] = useState("policy-holder");
    const [isSubmitting, setIsSubmitting] = useState(false);
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
    }, [dispatch]);

    useEffect(() => {
        if (id) {
            dispatch(fetchPolicyById(id as string));
        }
    }, [dispatch, id]);



    useEffect(() => {
        if (!selectedPolicy) return;

        const policyBranch = licBranches.find(b => b.id === selectedPolicy.branchId);


        reset({
            groupId: selectedPolicy.clientId,
            lifeAssuredId: selectedPolicy.CustomerMasterId,

            providerType:
                selectedPolicy.provider?.type ?? "",

            providerId: selectedPolicy.providerId,
            productId: selectedPolicy.productId,

            policyNumber: selectedPolicy.policyNumber,

            statusId: selectedPolicy.statusId,

            fupDate: selectedPolicy.nextPremiumDueDate
                ? selectedPolicy.nextPremiumDueDate.substring(0, 10)
                : "",

            commencementDate: selectedPolicy.commencementDate
                ?.substring(0, 10),

            completionDate: selectedPolicy.maturityDate
                ? selectedPolicy.maturityDate.substring(0, 10)
                : "",

            productType: selectedPolicy.product?.productType ?? "",

            advisorId: selectedPolicy.advisorId ?? "",

            agentCode: selectedPolicy.agentCode ?? "",

            branchId: policyBranch?.branchCode ?? "",

            accountHolderName: selectedPolicy.CustomerMaster
                ? getFullName(selectedPolicy.CustomerMaster)
                : "",

            term: selectedPolicy.policyTerm ?? undefined,

            ppt:
                selectedPolicy.premiumPayingTerm ?? undefined,

            mode: selectedPolicy.premiumMode?.modeName ?? "",

            sumAssured:
                selectedPolicy.premium?.sumAssured ?? undefined,

            basicYearlyPremium:
                selectedPolicy.premium?.basicYearlyPremium ?? undefined,

            totalYearlyPremium:
                selectedPolicy.premium?.totalYearlyPremium ?? undefined,

            installmentPremium:
                selectedPolicy.premium?.installmentPremium ?? undefined,

            totalInstallmentPremium:
                selectedPolicy.premium?.totalInstallmentPremium ??
                undefined,

            gst:
                selectedPolicy.premium?.gst ?? undefined,

            riders:
                selectedPolicy.policyRiders?.map((r: any) => ({
                    description: r.rider.riderName,
                    sum: r.riderAmount,
                    premium: r.riderPremium,
                    term: "",
                    mode: r.rider.mode,
                    ppt: "",
                })) ?? [],
        });
    }, [selectedPolicy, reset, licBranches]);


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

    const watchGroupId = watch("groupId");
    const watchLifeAssuredId = watch("lifeAssuredId");
    const watchProviderType = watch("providerType");
    const watchProviderId = watch("providerId");
    const watchProductType = watch("productType");
    const watchAdvisorId = watch("advisorId");
    const watchBasicYearlyPremium = watch("basicYearlyPremium");
    const watchTotalRiderPremium = watch("totalRiderPremium");
    const watchRiders = watch("riders");


    const selectedGroup = useMemo(() => groups.find(g => g.id === watchGroupId), [watchGroupId, groups]);

    const groupMembers = useMemo(() => {
        if (!watchGroupId) return [];
        return masterCustomers.filter(m => m.groupId === watchGroupId);
    }, [watchGroupId, masterCustomers]);

    const previousGroupId = useRef<string | undefined>(undefined);

    useEffect(() => {
        setValue("groupCode", selectedGroup?.groupCode || "");

        // Only clear Life Assured when the user changes the group,
        // not during the initial form load.
        if (
            previousGroupId.current !== undefined &&
            previousGroupId.current !== watchGroupId
        ) {
            setValue("lifeAssuredId", "");
        }

        previousGroupId.current = watchGroupId;
    }, [watchGroupId, selectedGroup, setValue]);

    useEffect(() => {
        const member = masterCustomers.find(m => m.id === watchLifeAssuredId);
        setValue("dob", member?.dob ? new Date(member.dob).toISOString().split("T")[0] : "");
        setValue("age", member?.dob ? String(new Date().getFullYear() - new Date(member.dob).getFullYear()) : "");
        setValue("gender", member?.gender || "");
        setValue("pan", member?.panNumber || "");

        if (member) {
            setValue("accountHolderName", getFullName(member));
        }
    }, [watchLifeAssuredId, masterCustomers, setValue]);

    const providerTypes = useMemo(() => {
        return [...new Set(providers.map(p => p.type))];
    }, [providers]);

    const filteredProviders = useMemo(() => {
        if (!watchProviderType) return [];
        return providers.filter(p => p.type === watchProviderType);
    }, [watchProviderType, providers]);

    const selectedProvider = useMemo(() => {
        return providers.find((p) => p.id === watchProviderId);
    }, [watchProviderId, providers]);
    const isLicProviderSelected = selectedProvider?.code === 'LIC';


    const filteredProducts = useMemo(() => {
        return [...products].sort((a, b) =>
            (a.planNumber ?? "").localeCompare(b.planNumber ?? "")
        );
    }, [products]);


    useEffect(() => {
        const advisor = advisors.find(a => a.id === watchAdvisorId);
        setValue("agentCode", advisor?.advisorCode || "");
    }, [watchAdvisorId, advisors, setValue]);

    useEffect(() => {
        const basic = parseFloat(String(watchBasicYearlyPremium)) || 0;
        const rider = parseFloat(String(watchTotalRiderPremium)) || 0;
        const total = basic + rider;
        // Use setValue to update the form value; using a string to avoid potential issues with number formatting
        setValue(
            "totalYearlyPremium",
            total > 0 ? total : undefined
        );
    }, [watchBasicYearlyPremium, watchTotalRiderPremium, setValue]);

    const onSubmit = async (data: PolicyFormValues) => {
        setIsSubmitting(true);

        try {

            const payload = {
                ...data,

                advisorId: data.advisorId || null,
                branchId: data.branchId || null,
                attributes: {
                    SUM_ASSURED: data.sumAssured,
                    POLICY_TERM: data.term,
                    PREMIUM_PAYING_TERM: data.ppt,
                    // Add other dynamic attributes here if they are on the form
                },

                policyTerm: data.term,
                premiumPayingTerm: data.ppt,
            };

            console.log("Advisor ID:", payload.advisorId);
            console.log(payload);

            await dispatch(
                updatePolicy({
                    id,
                    data: payload,
                })
            ).unwrap();


            await fetchNotifications();

            toast.success("Policy updated successfully!");
            router.push("/dashboard/lic/policies");

        } catch (err: any) {

            toast.error(err.message || "Failed to update policy.");
            console.error("Failed to update policy:", err);

        } finally {

            setIsSubmitting(false);

        }
    };



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
                            <span className="font-medium text-slate-700">Edit Policy</span>
                        </div>
                        <h1 className="text-2xl font-bold text-slate-900 mt-1">Edit LIC Policy</h1>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={() => router.push("/dashboard/lic/policies")} className="px-4 py-2 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition text-sm">
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit(onSubmit)}
                        className="..."
                    >
                        <Save size={16} />
                        Update Policy
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
            <form onSubmit={handleSubmit(onSubmit)} noValidate>
                {/* Section 1: Policy Holder's Details */}
                <div
                    ref={sectionRefs['policy-holder']}
                    className={`bg-white border border-slate-200 rounded-xl p-6 transition-all duration-500 ${glowingSection === 'policy-holder' ? 'shadow-lg shadow-blue-500/20' : ''
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
                    <SearchableSelect
                      label="Group Name"
                      required
                      placeholder="Search group..."
                      searchPlaceholder="Search by name or code"
                      options={groups.map(g => ({ value: g.id, label: g.groupName || "Unnamed", sublabel: g.groupCode }))}
                      value={field.value}
                      onChange={field.onChange}
                      error={errors.groupId?.message}
                    />
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

                            <select
                                {...register("gender")}
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm bg-slate-50"
                                disabled
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
                            className={`bg-white border border-slate-200 rounded-xl p-6 transition-all duration-500 ${glowingSection === 'policy-details' ? 'shadow-lg shadow-blue-500/20' : ''
                                }`}
                        >
                            <h2 className="text-lg font-semibold text-slate-900 mb-6 flex items-center gap-2">
                                <FileText size={20} className="text-blue-600" />
                                Policy Details
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">


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
                  <Controller
                    name="productId"
                    control={control}
                    render={({ field }) => (
                      <SearchableSelect
                        label="Plan"
                        required
                        placeholder="Search plan..."
                        searchPlaceholder="Search by name or number"
                        options={filteredProducts.map(p => ({ value: p.id, label: p.productName, sublabel: `Plan No. ${p.planNumber}` }))}
                        value={field.value || ""}
                        onChange={(productId) => {
                          field.onChange(productId);
                          const selectedProduct = products.find((p) => p.id === productId);
                          if (selectedProduct) {
                            setValue("providerId", selectedProduct.providerId);
                            if (selectedProduct.productType) setValue("productType", selectedProduct.productType);
                          }
                        }}
                        error={errors.productId?.message}
                      />
                    )}
                  />

                                    {errors.productId && (
                                        <p className="text-xs text-red-500 mt-1">
                                            {errors.productId.message}
                                        </p>
                                    )}
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
                                    <input
                                        type="date"
                                        {...register("commencementDate")}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                                    />
                                    {errors.commencementDate && <p className="text-xs text-red-500 mt-1">{errors.commencementDate.message}</p>}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">
                                        Completion Date <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="date"
                                        {...register("completionDate")}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                                    />
                                    {errors.completionDate && <p className="text-xs text-red-500 mt-1">{errors.completionDate.message}</p>}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">
                                        Term
                                    </label>
                                    <input
                                        type="number"
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
                                        type="number"
                                        {...register("ppt")}
                                        placeholder="Enter PPT"
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                                    />
                                    {errors.ppt && <p className="text-xs text-red-500 mt-1">{errors.ppt.message}</p>}
                                </div>
                            </div>
                        </div>
                        {/* Section 4: Riders Details */}
                        <div
                            ref={sectionRefs['riders']}
                            className={`bg-white border border-slate-200 rounded-xl p-6 transition-all duration-500 ${glowingSection === 'riders' ? 'shadow-lg shadow-blue-500/20' : ''
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
                                            <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Mode</th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Premium</th>
                                            <th className="px-4 py-2 text-center text-xs font-medium text-slate-500 uppercase">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200">
                                        {riderFields.length === 0 ? (
                                            <tr>
                                                <td colSpan={7} className="px-4 py-6 text-center text-slate-500 text-sm">
                                                    No Rider to Show
                                                </td>
                                            </tr>
                                        ) : (
                                            riderFields.map((field, index) => (
                                                <tr key={field.id}>
                                                    <td className="px-2 py-1.5 w-1/3">
                                                        <select {...register(`riders.${index}.description`)} className="w-full text-sm border-slate-200 rounded-md focus:ring-blue-500/20 focus:border-blue-500">
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
                                                        <input type="text" {...register(`riders.${index}.sum`)} placeholder="Sum" className="w-full text-sm border-slate-200 rounded-md focus:ring-blue-500/20 focus:border-blue-500" />
                                                        {errors.riders?.[index]?.sum && <p className="text-xs text-red-500 mt-1">{errors.riders[index]?.sum?.message}</p>}
                                                    </td>
                                                    <td className="px-2 py-1.5">
                                                        <input type="text" {...register(`riders.${index}.term`)} placeholder="Term" className="w-20 text-sm border-slate-200 rounded-md focus:ring-blue-500/20 focus:border-blue-500" />
                                                        {errors.riders?.[index]?.term && <p className="text-xs text-red-500 mt-1">{errors.riders[index]?.term?.message}</p>}
                                                    </td>
                                                    <td className="px-2 py-1.5">
                                                        <input type="text" {...register(`riders.${index}.ppt`)} placeholder="PPT" className="w-20 text-sm border-slate-200 rounded-md focus:ring-blue-500/20 focus:border-blue-500" />
                                                        {errors.riders?.[index]?.ppt && <p className="text-xs text-red-500 mt-1">{errors.riders[index]?.ppt?.message}</p>}
                                                    </td>
                                                    <td className="px-2 py-1.5">
                                                        <select {...register(`riders.${index}.mode`)} className="w-full text-sm border-slate-200 rounded-md focus:ring-blue-500/20 focus:border-blue-500" defaultValue="">
                                                          <option value="">Mode</option>
                                                          {modes.map(mode => (
                                                              <option key={mode.id} value={mode.modeName}>
                                                                  {mode.modeName}
                                                              </option>
                                                          ))}
                                                      </select>
                                                    </td>
                                                    <td className="px-2 py-1.5">
                                                        <input type="text" {...register(`riders.${index}.premium`)} placeholder="Premium" className="w-full text-sm border-slate-200 rounded-md focus:ring-blue-500/20 focus:border-blue-500" />
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
                            className={`bg-white border border-slate-200 rounded-xl p-6 sticky top-6 transition-all duration-500 ${glowingSection === 'premium-calculation' ? 'shadow-lg shadow-blue-500/20' : ''
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
                                        type="number"
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
                    className={`bg-white border border-slate-200 rounded-xl p-6 mt-6 transition-all duration-500 ${glowingSection === 'advanced' ? 'shadow-lg shadow-blue-500/20' : ''
                        }`}
                >
                    <div className="flex items-center">
                        <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                            <Settings size={20} className="text-blue-600" />
                            Advanced Options
                        </h2>
                    </div>


                    <div className="mt-6 grid grid-cols-1 gap-6">
                        {/* Current Status */}
                        <div className="border border-slate-200 rounded-lg p-4">
                            <h3 className="text-base font-semibold text-slate-800 mb-4">Current Status</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Policy Status</label>
                                    <select
                                        {...register("statusId")}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                                    >
                                        <option value="">Select Status</option>

                                        {statuses.map((status) => (
                                            <option
                                                key={status.id}
                                                value={status.id}
                                            >
                                                {status.statusName}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Premium Adjusted</label>
                                    <input type="text" placeholder="Premium adjusted" className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Loan Taken</label>
                                    <input type="text" placeholder="Loan taken" className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm" />
                                </div>
                            </div>
                        </div>

                        <div className="border border-slate-200 rounded-lg p-4">
                            <h3 className="text-base font-semibold text-slate-800 mb-4">Check Current Status of Policy</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">
                                        First Unpaid Premium (F.U.P) Date
                                    </label>

                                    <input
                                        type="date"
                                        {...register("fupDate")}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="border border-slate-200 rounded-lg p-4">
                            <h3 className="text-base font-semibold text-slate-800 mb-4">Nomination Details</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Annuity Details</label>
                                    <input type="text" placeholder="Annuity details" className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Other Information</label>
                                    <input type="text" placeholder="Other information" className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm" />
                                </div>
                            </div>
                            <button className="mt-3 text-sm text-blue-600 hover:text-blue-700 font-medium">Add / Edit Nomination Details</button>
                            <p className="text-xs text-slate-400 mt-1">This will be enable for Annuity Policies</p>
                        </div>

                        <div className="border border-slate-200 rounded-lg p-4">
                            <h3 className="text-base font-semibold text-slate-800 mb-4">Advisor Details</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                  <Controller
                    name="advisorId"
                    control={control}
                    render={({ field }) => (
                      <SearchableSelect
                        label="Advisor"
                        placeholder="Search advisor..."
                        options={advisors.map(a => ({ value: a.id, label: a.advisorName, sublabel: a.advisorCode }))}
                        value={field.value || ""}
                        onChange={field.onChange}
                      />
                    )}
                  />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Agent Code</label>
                                    <input
                                        {...register("agentCode")}
                                        type="text" placeholder="Auto-filled"
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm bg-slate-50" readOnly
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="border border-slate-200 rounded-lg p-4">
                            <h3 className="text-base font-semibold text-slate-800 mb-4">NACH & NEFT Details</h3>
                            <p className="text-sm text-slate-500 mb-4">Provide NACH / NEFT Details for bank transactions</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Bank Name</label>
                                    <input type="text" placeholder="Enter bank name" className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Account Number</label>
                                    <input type="text" placeholder="Enter account number" className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">IFSC Code</label>
                                    <input type="text" placeholder="Enter IFSC code" className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Account Holder Name</label>
                                    <input type="text" placeholder="Enter account holder name" className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm" />
                                    <input
                                        {...register("accountHolderName")}
                                        type="text" placeholder="Enter account holder name"
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="border border-slate-200 rounded-lg p-4">
                            <h3 className="text-base font-semibold text-slate-800 mb-4">Additional Fields</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Branch</label>
                                    <select {...register("branchId")} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm">
                                        <option value="">Select Branch</option>
                                        {licBranches.map((branch) => (
                                            <option key={branch.branchCode} value={branch.branchCode}>{branch.branchCode} - {branch.branchName}</option>
                                        ))}
                                    </select>
                                    {errors.branchId && <p className="text-xs text-red-500 mt-1">{errors.branchId.message}</p>}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Medical</label>
                                    <input type="text" placeholder="Medical details" className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Sales Channel</label>
                                    <select className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm">
                                        <option value="direct">Direct</option>
                                        <option value="agent">Agent</option>
                                        <option value="broker">Broker</option>
                                        <option value="online">Online</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Age Admitted</label>
                                    <input type="number" placeholder="Age admitted" className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Tax Beneficiary</label>
                                    <input type="text" placeholder="Tax beneficiary" className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm" />
                                </div>
                                <div className="lg:col-span-3">
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
                                    <textarea
                                        placeholder="Add notes"
                                        rows={2}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm resize-y"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </form>

            {/* Sticky Footer */}
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 flex justify-end gap-3">
                <button onClick={() => router.push("/dashboard/lic/policies")} className="px-6 py-2 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition text-sm font-medium">
                    Cancel
                </button>
                <button onClick={handleSubmit(onSubmit)} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium flex items-center gap-2 disabled:opacity-60" disabled={isSubmitting}>
                    <Save size={16} />
                    {isSubmitting ? "Saving..." : "Update Policy"}
                </button>
            </div>
        </div>
    );
}