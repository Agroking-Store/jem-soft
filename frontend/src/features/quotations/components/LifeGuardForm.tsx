"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Calculator, List, Save, Eye, Loader2 } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import { AppDispatch, RootState } from "@/store/store";
import {
  fetchNextRefNo,
  calculateQuotation,
  saveQuotation,
  updateQuotation,
} from "../quotationSlice";
import { ExistingClientModal } from "./ExistingClientModal";

interface LifeGuardFormProps {
  onCancel: () => void;
  onSaved: (quotation: any, shouldViewReport: boolean) => void;
  editQuotation?: any;
}

export const LifeGuardForm: React.FC<LifeGuardFormProps> = ({
  onCancel,
  onSaved,
  editQuotation,
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const { calculationResult, isCalculating, isLoading } = useSelector(
    (state: RootState) => state.quotations
  );

  // Form State
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [quotationRefNo, setQuotationRefNo] = useState("");
  const [quotationDate, setQuotationDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [commencementDate, setCommencementDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  // Proposer / Life Assured
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [selectedGroupCode, setSelectedGroupCode] = useState<string | null>(null);
  const [title, setTitle] = useState("Mr.");
  const [proposerName, setProposerName] = useState("");
  const [gender, setGender] = useState("Male");
  const [dob, setDob] = useState("1995-01-01");
  const [age, setAge] = useState<number>(31);
  const [extraPremiumClass, setExtraPremiumClass] = useState("None");
  const [isSmoker, setIsSmoker] = useState(false);

  // Tax Slab
  const [sec80CLimit, setSec80CLimit] = useState(150000);
  const [taxSlabPercentage, setTaxSlabPercentage] = useState(30.9);

  // Bonus Scenario
  const [bonusScenario, setBonusScenario] = useState<
    "LAST_DECLARED" | "LIC_8" | "LIC_4" | "FORECAST"
  >("LAST_DECLARED");

  // Quotation Basis
  const [basis, setBasis] = useState("Sum");
  const [budget, setBudget] = useState<number>(500000);
  const [selectedPlan, setSelectedPlan] = useState("714");
  const [premiumMode, setPremiumMode] = useState("Yearly");
  const [policyTerm, setPolicyTerm] = useState<number>(15);
  const [ppt, setPpt] = useState<number>(15);

  const planOptions = [
    { value: "714", label: "714 - New Endowment Plan" },
    { value: "715", label: "715 - New Jeevan Anand" },
    { value: "733", label: "733 - Jeevan Lakshya" },
    { value: "736", label: "736 - Jeevan Labh" },
    { value: "760", label: "760 - Bima Jyoti" },
    { value: "748", label: "748 - Bima Shree" },
    { value: "720", label: "720 - Money Back 20 Yrs" },
    { value: "721", label: "721 - Money Back 25 Yrs" },
  ];

  const getTermsForPlan = (plan: string) => {
    switch (plan) {
      case "714":
      case "715":
        return Array.from({ length: 24 }, (_, i) => 12 + i);
      case "733":
        return Array.from({ length: 13 }, (_, i) => 13 + i);
      case "736":
        return [16, 21, 25];
      case "760":
        return [15, 16, 17, 18, 19, 20];
      case "748":
        return [14, 16, 18, 20];
      case "720":
        return [20];
      case "721":
        return [25];
      default:
        return [15, 20, 25];
    }
  };

  const getPptForPlanAndTerm = (plan: string, term: number) => {
    switch (plan) {
      case "714":
      case "715":
        return [term];
      case "733":
        return [term - 3];
      case "736":
        if (term === 16) return [10];
        if (term === 21) return [15];
        if (term === 25) return [16];
        return [10];
      case "760":
        return [term - 5];
      case "748":
        if (term === 14) return [10];
        if (term === 16) return [12];
        if (term === 18) return [14];
        if (term === 20) return [16];
        return [10];
      case "720":
        return [15];
      case "721":
        return [20];
      default:
        return [term];
    }
  };

  const availableTerms = getTermsForPlan(selectedPlan);
  const availablePpts = getPptForPlanAndTerm(selectedPlan, policyTerm);

  useEffect(() => {
    if (!availableTerms.includes(policyTerm)) {
      setPolicyTerm(availableTerms[0] || 15);
    }
  }, [selectedPlan, availableTerms, policyTerm]);

  useEffect(() => {
    const validPpts = getPptForPlanAndTerm(selectedPlan, policyTerm);
    if (!validPpts.includes(ppt)) {
      setPpt(validPpts[0] || policyTerm);
    }
  }, [selectedPlan, policyTerm, ppt]);

  // Autofill Ref No on Mount
  useEffect(() => {
    if (editQuotation) {
      setQuotationRefNo(editQuotation.quotationRefNo || "");
      setQuotationDate(editQuotation.quotationDate ? new Date(editQuotation.quotationDate).toISOString().split("T")[0] : new Date().toISOString().split("T")[0]);
      setCommencementDate(editQuotation.commencementDate ? new Date(editQuotation.commencementDate).toISOString().split("T")[0] : new Date().toISOString().split("T")[0]);
      setSelectedCustomerId(editQuotation.customerId || null);
      setSelectedMemberId(editQuotation.memberId || null);
      setSelectedGroupCode(editQuotation.groupCode || null);
      setTitle(editQuotation.title || "Mr.");
      setProposerName(editQuotation.proposerName || "");
      setGender(editQuotation.gender || "Male");
      setDob(editQuotation.dateOfBirth ? new Date(editQuotation.dateOfBirth).toISOString().split("T")[0] : "1995-01-01");
      setAge(editQuotation.age || 31);
      setExtraPremiumClass(editQuotation.extraPremiumClass || "None");
      setIsSmoker(editQuotation.isSmoker || false);
      setSec80CLimit(editQuotation.sec80CLimit || 150000);
      setTaxSlabPercentage(editQuotation.taxSlabPercentage || 30.9);
      setBonusScenario((editQuotation.bonusScenario as any) || "LAST_DECLARED");
      setBasis(editQuotation.basis || "Sum");
      setBudget(editQuotation.budget || 500000);
      setSelectedPlan(editQuotation.planNumber || "714");
      setPremiumMode(editQuotation.premiumMode || "Yearly");
      setPolicyTerm(editQuotation.policyTerm || 15);
      setPpt(editQuotation.ppt || 15);
    } else {
      dispatch(fetchNextRefNo("LIFE_GUARD")).then((res: any) => {
        if (res.payload) {
          setQuotationRefNo(res.payload);
        }
      });
    }
  }, [dispatch, editQuotation]);

  const handleAutoFillRef = () => {
    const toastId = toast.loading("Fetching next reference number...");
    dispatch(fetchNextRefNo()).then((res: any) => {
      if (res.payload) {
        setQuotationRefNo(res.payload);
        toast.success(`Generated Ref No: ${res.payload}`, { id: toastId });
      } else {
        toast.error("Could not generate ref number", { id: toastId });
      }
    });
  };

  const calculateAgeFromDob = (dobString: string) => {
    if (!dobString) return 30;
    const birthDate = new Date(dobString);
    const commDate = new Date(commencementDate || Date.now());
    let calculatedAge = commDate.getFullYear() - birthDate.getFullYear();
    const m = commDate.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && commDate.getDate() < birthDate.getDate())) {
      calculatedAge--;
    }
    return Math.max(0, calculatedAge);
  };

  const handleDobChange = (newDob: string) => {
    setDob(newDob);
    const calculatedAge = calculateAgeFromDob(newDob);
    setAge(calculatedAge);
  };

  const handleSelectClient = (client: any) => {
    setSelectedCustomerId(client.customerId || null);
    setSelectedMemberId(client.memberId);
    setSelectedGroupCode(client.groupCode || null);
    setTitle(client.title || "Mr.");
    setProposerName(client.fullName);
    setGender(client.gender);
    if (client.dob) {
      setDob(client.dob);
      setAge(client.age);
    }
    toast.success(`Selected client: ${client.fullName}`);
  };

  const runCalculation = useCallback(async () => {
    if (!budget || budget <= 0) return null;

    const res: any = await dispatch(
      calculateQuotation({
        productType: "LIFE_GUARD",
        planNumber: selectedPlan,
        age: Number(age),
        gender,
        isSmoker,
        extraPremiumClass,
        policyTerm: Number(policyTerm),
        ppt: Number(ppt),
        sumAssured: Number(budget),
        premiumMode,
        bonusScenario,
        sec80CLimit: Number(sec80CLimit),
        taxSlabPercentage: Number(taxSlabPercentage),
      })
    );
    return res.payload;
  }, [
    dispatch,
    selectedPlan,
    age,
    gender,
    isSmoker,
    extraPremiumClass,
    policyTerm,
    ppt,
    budget,
    premiumMode,
    bonusScenario,
    sec80CLimit,
    taxSlabPercentage,
  ]);

  // Trigger calculation when user clicks calculator button
  const handleProcessCalculation = async () => {
    if (!budget || budget <= 0) {
      toast.error("Please enter a valid Sum Assured/Budget.");
      return;
    }
    const toastId = toast.loading("Calculating policy premium and maturity...");
    const result = await runCalculation();
    if (result) {
      toast.success("Calculation complete!", { id: toastId });
    } else {
      toast.error("Calculation failed. Please verify inputs.", { id: toastId });
    }
  };

  const handleSave = async (shouldView: boolean) => {
    if (!proposerName.trim()) {
      toast.error("Please enter or select Proposer's Name.");
      return;
    }

    if (!budget || budget <= 0) {
      toast.error("Please enter a valid Sum Assured/Budget.");
      return;
    }

    if (!calculationResult) {
      toast.error("Please click Calculate first to generate the quotation.");
      return;
    }

    const toastId = toast.loading("Saving quotation...");

    let finalRef = quotationRefNo.trim();
    if (!finalRef) {
      const res: any = await dispatch(fetchNextRefNo());
      finalRef = res.payload || "000000000001";
    }

    const payload = {
      quotationRefNo: finalRef,
      productType: "LIFE_GUARD",
      quotationDate,
      commencementDate,
      customerId: selectedCustomerId,
      memberId: selectedMemberId,
      groupCode: selectedGroupCode,
      title,
      proposerName,
      gender,
      dateOfBirth: dob ? new Date(dob).toISOString() : null,
      age: Number(age),
      isSmoker,
      extraPremiumClass,
      sec80CLimit: Number(sec80CLimit),
      taxSlabPercentage: Number(taxSlabPercentage),
      bonusScenario,
      planNumber: selectedPlan,
      basis,
      budget: Number(budget),
      premiumMode,
      policyTerm: Number(policyTerm),
      ppt: Number(ppt),
      sumAssured: Number(budget),
      reportOptions: {
        coverPage: true,
        benefitsIllustration: true,
        agentsCopy: true,
        taxBreakup: true,
        medicalRequirement: true,
        yield: true,
      },
    };

    const action = editQuotation
      ? await dispatch(updateQuotation({ id: editQuotation.id, payload }))
      : await dispatch(saveQuotation(payload));

    const isSuccess = editQuotation
      ? updateQuotation.fulfilled.match(action)
      : saveQuotation.fulfilled.match(action);

    if (isSuccess) {
      toast.success(
        editQuotation ? "Quotation updated successfully!" : "Quotation created and saved successfully!",
        { id: toastId }
      );
      onSaved(action.payload, shouldView);
    } else {
      toast.error("Failed to save quotation. Please try again.", { id: toastId });
    }
  };

  const formatCurrency = (val?: number | null) => {
    if (val === undefined || val === null) return "₹ 0";
    return `₹ ${Number(val).toLocaleString("en-IN")}`;
  };

  const currentSummary = calculationResult?.summaryRow || {
    planText: `${selectedPlan}/${policyTerm}/${ppt}`,
    sumAssured: budget,
    basicPremium: 0,
    gst: 0,
    installmentPremium: 0,
  };

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-200">
      {/* Existing Client Modal */}
      <ExistingClientModal
        isOpen={isClientModalOpen}
        onClose={() => setIsClientModalOpen(false)}
        onSelectClient={handleSelectClient}
      />

      {/* Top Row: Ref No & Dates */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        {/* Quotation Ref No */}
        <div className="flex items-center gap-2">
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
              Quotation Ref No. <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={quotationRefNo}
              onChange={(e) => setQuotationRefNo(e.target.value)}
              placeholder="000000000001"
              className={`px-3 py-2 text-xs font-mono font-bold border rounded-lg ${
                !quotationRefNo.trim() ? "border-red-300 ring-2 ring-red-50" : "border-slate-300"
              } bg-white text-blue-900 w-48`}
            />
          </div>
          <button
            type="button"
            onClick={handleAutoFillRef}
            className="mt-5 px-3.5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-lg shadow-xs transition-all cursor-pointer"
          >
            Auto Fill
          </button>
        </div>

        {/* Quotation Date & Comm. Date */}
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <label className="text-xs font-semibold text-slate-500 block mb-1">
              Quotation Date
            </label>
            <input
              type="date"
              value={quotationDate}
              onChange={(e) => setQuotationDate(e.target.value)}
              className="px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white text-slate-800 font-medium cursor-pointer"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500 block mb-1">
              Comm. Date
            </label>
            <input
              type="date"
              value={commencementDate}
              onChange={(e) => {
                setCommencementDate(e.target.value);
                setAge(calculateAgeFromDob(dob));
              }}
              className="px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white text-slate-800 font-medium cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Section 1: Life Assured Details */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="bg-slate-50 px-5 py-3 border-b border-slate-200">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Life Assured Details
          </h2>
        </div>

        <div className="p-5 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Personal Details (8 cols) */}
          <div className="lg:col-span-8 p-4 border border-slate-200 rounded-xl bg-slate-50/40 space-y-4">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide">
              Personal Details
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
              <div className="sm:col-span-2">
                <label className="text-xs font-medium text-slate-600 block mb-1">
                  Title <span className="text-red-500">*</span>
                </label>
                <select
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-2.5 py-2 text-xs border border-slate-300 rounded-lg bg-white text-slate-800 font-medium"
                >
                  <option value="Mr.">Mr.</option>
                  <option value="Mrs.">Mrs.</option>
                  <option value="Ms.">Ms.</option>
                  <option value="Dr.">Dr.</option>
                </select>
              </div>

              <div className="sm:col-span-7">
                <label className="text-xs font-medium text-slate-600 block mb-1">
                  Name <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={proposerName}
                    onChange={(e) => setProposerName(e.target.value)}
                    placeholder="Enter full name or select from client list"
                    className="flex-1 px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white text-slate-800 font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                  />
                  <button
                    type="button"
                    onClick={() => setIsClientModalOpen(true)}
                    title="Select Existing Client from Database"
                    className="p-2 text-blue-700 bg-blue-50 hover:bg-blue-100 active:bg-blue-200 rounded-lg border border-blue-200 transition-colors cursor-pointer"
                  >
                    <List size={18} className="stroke-[2.5]" />
                  </button>
                </div>
              </div>

              <div className="sm:col-span-3">
                <label className="text-xs font-medium text-slate-600 block mb-1">
                  Gender <span className="text-red-500">*</span>
                </label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full px-2.5 py-2 text-xs border border-slate-300 rounded-lg bg-white text-slate-800 font-medium"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
              <div className="sm:col-span-4">
                <label className="text-xs font-medium text-slate-600 block mb-1">
                  Date of Birth <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={dob}
                  onChange={(e) => handleDobChange(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white text-slate-800 font-medium"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-xs font-medium text-slate-600 block mb-1">
                  Age <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={age}
                  onChange={(e) => setAge(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white text-slate-800 font-medium"
                />
              </div>

              <div className="sm:col-span-3">
                <label className="text-xs font-medium text-slate-600 block mb-1">
                  Extra Premium Class
                </label>
                <select
                  value={extraPremiumClass}
                  onChange={(e) => setExtraPremiumClass(e.target.value)}
                  className="w-full px-2.5 py-2 text-xs border border-slate-300 rounded-lg bg-white text-slate-800"
                >
                  <option value="None">None</option>
                  <option value="Class I">Class I</option>
                  <option value="Class II">Class II</option>
                  <option value="Class III">Class III</option>
                </select>
              </div>

              <div className="sm:col-span-3">
                <label className="text-xs font-medium text-slate-600 block mb-1">
                  Smoker
                </label>
                <select
                  value={isSmoker ? "Yes" : "No"}
                  onChange={(e) => setIsSmoker(e.target.value === "Yes")}
                  className="w-full px-2.5 py-2 text-xs border border-slate-300 rounded-lg bg-white text-slate-800 font-medium"
                >
                  <option value="No">No</option>
                  <option value="Yes">Yes</option>
                </select>
              </div>
            </div>
          </div>

          {/* Tax Slab (4 cols) */}
          <div className="lg:col-span-4 p-4 border border-slate-200 rounded-xl bg-slate-50/40 space-y-4">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide">
              Tax Slab
            </h3>

            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1">
                Sec.80 C Investment Limit
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-500">
                  ₹
                </span>
                <input
                  type="number"
                  value={sec80CLimit}
                  onChange={(e) => setSec80CLimit(Number(e.target.value))}
                  className="w-full pl-7 pr-3 py-2 text-xs border border-slate-300 rounded-lg bg-white text-slate-800 font-bold"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1">
                I.T. Slab
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  value={taxSlabPercentage}
                  onChange={(e) => setTaxSlabPercentage(Number(e.target.value))}
                  className="w-full pl-3 pr-8 py-2 text-xs border border-slate-300 rounded-lg bg-white text-slate-800 font-bold"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 font-bold">
                  %
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Section 2: Bonus Scenario */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="bg-slate-50 px-5 py-3 border-b border-slate-200">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Bonus Scenario
          </h2>
        </div>

        <div className="p-4 flex flex-wrap items-center gap-x-8 gap-y-3">
          <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
            <input
              type="radio"
              name="bonusScenario"
              checked={bonusScenario === "LAST_DECLARED"}
              onChange={() => setBonusScenario("LAST_DECLARED")}
              className="w-4 h-4 text-blue-600 focus:ring-blue-500 cursor-pointer"
            />
            Last Declared
          </label>

          <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
            <input
              type="radio"
              name="bonusScenario"
              checked={bonusScenario === "LIC_8"}
              onChange={() => setBonusScenario("LIC_8")}
              className="w-4 h-4 text-blue-600 focus:ring-blue-500 cursor-pointer"
            />
            LIC 8% Scenario
          </label>

          <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
            <input
              type="radio"
              name="bonusScenario"
              checked={bonusScenario === "LIC_4"}
              onChange={() => setBonusScenario("LIC_4")}
              className="w-4 h-4 text-blue-600 focus:ring-blue-500 cursor-pointer"
            />
            LIC 4% Scenario
          </label>

          <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
            <input
              type="radio"
              name="bonusScenario"
              checked={bonusScenario === "FORECAST"}
              onChange={() => setBonusScenario("FORECAST")}
              className="w-4 h-4 text-blue-600 focus:ring-blue-500 cursor-pointer"
            />
            Forecast
          </label>
        </div>
      </div>

      {/* Section 3: Quotation Basis */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="bg-slate-50 px-5 py-3 border-b border-slate-200">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Quotation Basis &amp; Premium Calculation
          </h2>
        </div>

        <div className="p-5 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Input Controls (5 cols) */}
          <div className="lg:col-span-5 p-4 border border-slate-200 rounded-xl bg-slate-50/40 space-y-4">
            <div className="grid grid-cols-3 gap-2.5">
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">
                  Basis
                </label>
                <input
                  type="text"
                  value={basis}
                  readOnly
                  className="w-full px-2 py-2 text-xs border border-slate-300 rounded-lg bg-slate-100 text-slate-700 font-bold"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">
                  Budget <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-slate-500">
                    ₹
                  </span>
                  <input
                    type="number"
                    value={budget}
                    onChange={(e) => setBudget(Number(e.target.value))}
                    className="w-full pl-5 pr-2 py-2 text-xs border border-slate-300 rounded-lg bg-white text-slate-800 font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">
                  Plans
                </label>
                <select
                  value={selectedPlan}
                  onChange={(e) => setSelectedPlan(e.target.value)}
                  className="w-full px-2 py-2 text-xs border border-slate-300 rounded-lg bg-white text-blue-900 font-bold"
                >
                  {planOptions.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.value}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2 items-end">
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">
                  Mode
                </label>
                <select
                  value={premiumMode}
                  onChange={(e) => setPremiumMode(e.target.value)}
                  className="w-full px-2 py-2 text-xs border border-slate-300 rounded-lg bg-white text-slate-800 font-medium"
                >
                  <option value="Yearly">Yearly</option>
                  <option value="Half-Yearly">Half-Yearly</option>
                  <option value="Quarterly">Quarterly</option>
                  <option value="Monthly">Monthly</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">
                  Term
                </label>
                <select
                  value={policyTerm}
                  onChange={(e) => setPolicyTerm(Number(e.target.value))}
                  className="w-full px-2 py-2 text-xs border border-slate-300 rounded-lg bg-white text-slate-800 font-medium"
                >
                  {availableTerms.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">
                  PPT
                </label>
                <select
                  value={ppt}
                  onChange={(e) => setPpt(Number(e.target.value))}
                  className="w-full px-2 py-2 text-xs border border-slate-300 rounded-lg bg-white text-slate-800 font-medium"
                >
                  {availablePpts.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <button
                  type="button"
                  onClick={handleProcessCalculation}
                  disabled={isCalculating}
                  title="Run Premium Calculation"
                  className="w-full py-2 text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-lg flex items-center justify-center transition-colors shadow-xs cursor-pointer"
                >
                  {isCalculating ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Calculator size={18} />
                  )}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-200">
              <div>
                <label className="text-[11px] font-medium text-slate-500 block">
                  Sum Assured
                </label>
                <div className="text-xs font-bold text-slate-900">
                  {formatCurrency(budget)}
                </div>
              </div>

              <div>
                <label className="text-[11px] font-medium text-slate-500 block">
                  Installment Prem.
                </label>
                <div className="text-xs font-black text-emerald-700">
                  {formatCurrency(calculationResult?.totalInstallmentPremium || 0)}
                </div>
              </div>

              <div>
                <label className="text-[11px] font-medium text-slate-500 block">
                  Maturity Est.
                </label>
                <div className="text-xs font-black text-blue-900">
                  {formatCurrency(calculationResult?.maturityAmount || 0)}
                </div>
              </div>
            </div>
          </div>

          {/* Premium Calculation Output Table (7 cols) */}
          <div className="lg:col-span-7 border border-slate-200 rounded-xl overflow-hidden bg-white flex flex-col justify-between shadow-xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gradient-to-r from-blue-50/80 to-indigo-50/80 border-b border-blue-100">
                  <th
                    rowSpan={2}
                    className="py-2.5 px-3 font-bold text-blue-950 border-r border-blue-100 text-center"
                  >
                    PI/Trm/PPT
                  </th>
                  <th
                    rowSpan={2}
                    className="py-2.5 px-3 font-bold text-blue-950 border-r border-blue-100 text-center"
                  >
                    Sum Assured
                  </th>
                  <th
                    colSpan={3}
                    className="py-1.5 px-3 font-bold text-blue-950 text-center border-b border-blue-100"
                  >
                    Premium
                  </th>
                </tr>
                <tr className="bg-blue-50/60 border-b border-blue-100">
                  <th className="py-1.5 px-2 font-semibold text-blue-900 border-r border-blue-100 text-center">
                    Basic
                  </th>
                  <th className="py-1.5 px-2 font-semibold text-blue-900 border-r border-blue-100 text-center">
                    GST
                  </th>
                  <th className="py-1.5 px-2 font-semibold text-blue-900 text-center">
                    Installment Premium
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-center">
                <tr>
                  <td className="py-3 px-2 border-r border-slate-100 font-mono font-bold text-blue-950">
                    {currentSummary.planText}
                  </td>
                  <td className="py-3 px-2 border-r border-slate-100 font-bold text-slate-800">
                    {formatCurrency(currentSummary.sumAssured)}
                  </td>
                  <td className="py-3 px-2 border-r border-slate-100 font-medium">
                    {formatCurrency(currentSummary.basicPremium)}
                  </td>
                  <td className="py-3 px-2 border-r border-slate-100 font-medium">
                    {formatCurrency(currentSummary.gst)}
                  </td>
                  <td className="py-3 px-2 font-black text-emerald-700">
                    {formatCurrency(currentSummary.installmentPremium)}
                  </td>
                </tr>

                <tr className="text-slate-400 bg-slate-50/30">
                  <td className="py-3 px-2 border-r border-slate-100">-</td>
                  <td className="py-3 px-2 border-r border-slate-100">₹ 0</td>
                  <td className="py-3 px-2 border-r border-slate-100">₹ 0</td>
                  <td className="py-3 px-2 border-r border-slate-100">₹ 0</td>
                  <td className="py-3 px-2">₹ 0</td>
                </tr>
              </tbody>
              <tfoot>
                <tr className="bg-slate-100/80 font-bold border-t border-slate-200 text-center text-slate-900">
                  <td className="py-2.5 px-2 border-r border-slate-200">Total</td>
                  <td className="py-2.5 px-2 border-r border-slate-200">
                    {formatCurrency(currentSummary.sumAssured)}
                  </td>
                  <td className="py-2.5 px-2 border-r border-slate-200">
                    {formatCurrency(currentSummary.basicPremium)}
                  </td>
                  <td className="py-2.5 px-2 border-r border-slate-200">
                    {formatCurrency(currentSummary.gst)}
                  </td>
                  <td className="py-2.5 px-2 text-emerald-700 font-black">
                    {formatCurrency(currentSummary.installmentPremium)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>

      {/* Bottom Action Buttons */}
      <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={() => handleSave(false)}
          disabled={isLoading}
          className="flex items-center gap-1.5 px-6 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 rounded-xl shadow-xs transition-all cursor-pointer"
        >
          <Save size={16} />
          {isLoading ? "Saving Quotation..." : "Save to List"}
        </button>

        <button
          type="button"
          onClick={() => handleSave(true)}
          disabled={isLoading}
          className="flex items-center gap-1.5 px-6 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 rounded-xl shadow-xs transition-all cursor-pointer"
        >
          <Eye size={16} />
          Save &amp; View PDF Report
        </button>

        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-2.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl shadow-xs transition-all cursor-pointer"
        >
          Cancel &amp; Return
        </button>
      </div>
    </div>
  );
};
