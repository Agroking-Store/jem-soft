"use client";

import React, { useState, useEffect } from "react";
import { List } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/store/store";
import {
  fetchNextRefNo,
  calculateQuotation,
  saveQuotation,
} from "../quotationSlice";
import { ExistingClientModal } from "./ExistingClientModal";

interface ProtectAndEarnFormProps {
  onCancel: () => void;
  onSaved: (quotation: any, shouldViewReport: boolean) => void;
}

export const ProtectAndEarnForm: React.FC<ProtectAndEarnFormProps> = ({
  onCancel,
  onSaved,
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const { calculationResult, isCalculating, isLoading } = useSelector(
    (state: RootState) => state.quotations
  );

  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [quotationRefNo, setQuotationRefNo] = useState("");
  const [quotationDate, setQuotationDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [commencementDate, setCommencementDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  // Proposer's Details
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [selectedGroupCode, setSelectedGroupCode] = useState<string | null>(null);
  const [title, setTitle] = useState("Mr.");
  const [proposerName, setProposerName] = useState("");
  const [gender, setGender] = useState("Male");
  const [dob, setDob] = useState("1995-01-01");
  const [age, setAge] = useState<number>(31);
  const [isSmoker, setIsSmoker] = useState(false);

  // Protect and Earn Solution Requirements
  const [coverRequired, setCoverRequired] = useState<number>(1000000);
  const [policyTerm, setPolicyTerm] = useState<number>(20);
  const [sec80CLimit, setSec80CLimit] = useState(150000);
  const [taxSlabPercentage, setTaxSlabPercentage] = useState(30.9);

  const [formError, setFormError] = useState<string | null>(null);
  const [combinationDetails, setCombinationDetails] = useState<any>(null);

  const termOptions = [10, 12, 15, 16, 18, 20, 21, 25, 30];

  useEffect(() => {
    dispatch(fetchNextRefNo()).then((res: any) => {
      if (res.payload) {
        setQuotationRefNo(res.payload);
      }
    });
  }, [dispatch]);

  const handleAutoFillRef = () => {
    dispatch(fetchNextRefNo()).then((res: any) => {
      if (res.payload) {
        setQuotationRefNo(res.payload);
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
  };

  const handleShowCombination = async () => {
    if (!proposerName.trim()) {
      setFormError("Please enter Proposer Name.");
      return;
    }
    if (!coverRequired || coverRequired <= 0) {
      setFormError("Please enter valid Cover Required.");
      return;
    }

    setFormError(null);
    const res: any = await dispatch(
      calculateQuotation({
        productType: "PROTECT_AND_EARN",
        planNumber: "736", // Jeevan Labh / Endowment combination
        age: Number(age),
        gender,
        isSmoker,
        policyTerm: Number(policyTerm),
        ppt: policyTerm >= 25 ? 16 : policyTerm >= 21 ? 15 : 10,
        sumAssured: Number(coverRequired),
        premiumMode: "Yearly",
        bonusScenario: "LAST_DECLARED",
        sec80CLimit: Number(sec80CLimit),
        taxSlabPercentage: Number(taxSlabPercentage),
      })
    );

    if (calculateQuotation.fulfilled.match(res)) {
      setCombinationDetails(res.payload);
    }
  };

  const handleSave = async () => {
    if (!proposerName.trim()) {
      setFormError("Please enter Proposer's Name.");
      return;
    }

    let finalRef = quotationRefNo.trim();
    if (!finalRef) {
      const res: any = await dispatch(fetchNextRefNo());
      finalRef = res.payload || "000000000001";
    }

    const payload = {
      quotationRefNo: finalRef,
      productType: "PROTECT_AND_EARN",
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
      sec80CLimit: Number(sec80CLimit),
      taxSlabPercentage: Number(taxSlabPercentage),
      bonusScenario: "LAST_DECLARED",
      planNumber: "736",
      basis: "Cover Required",
      coverRequired: Number(coverRequired),
      sumAssured: Number(coverRequired),
      premiumMode: "Yearly",
      policyTerm: Number(policyTerm),
      ppt: policyTerm >= 25 ? 16 : policyTerm >= 21 ? 15 : 10,
      reportOptions: {
        coverPage: true,
        benefitsForecast: true,
        agentsCopy: true,
        medicalRequirement: true,
        yield: false,
      },
    };

    const action = await dispatch(saveQuotation(payload));
    if (saveQuotation.fulfilled.match(action)) {
      onSaved(action.payload, false);
    }
  };

  const formatCurrency = (val?: number | null) => {
    if (val === undefined || val === null) return "₹ 0";
    return `₹ ${Number(val).toLocaleString("en-IN")}`;
  };

  return (
    <div className="w-full space-y-6">
      {/* Existing Client Modal */}
      <ExistingClientModal
        isOpen={isClientModalOpen}
        onClose={() => setIsClientModalOpen(false)}
        onSelectClient={handleSelectClient}
      />

      {/* Top Row: Ref No & Dates */}
      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
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
              className={`px-3 py-1.5 text-sm font-mono border rounded ${
                !quotationRefNo.trim() ? "border-red-400" : "border-slate-300"
              } bg-white text-slate-800 w-44`}
            />
          </div>
          <button
            type="button"
            onClick={handleAutoFillRef}
            className="mt-5 px-4 py-1.5 text-sm font-semibold text-white bg-[#186a8e] hover:bg-[#135674] active:bg-[#0f445c] rounded shadow-sm transition-all"
          >
            Auto Fill
          </button>
        </div>

        {/* Dates */}
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <label className="text-xs font-semibold text-slate-500 block mb-1">
              Quotation Date
            </label>
            <input
              type="date"
              value={quotationDate}
              onChange={(e) => setQuotationDate(e.target.value)}
              className="px-3 py-1.5 text-sm border border-slate-300 rounded bg-white text-slate-800 font-medium"
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
              className="px-3 py-1.5 text-sm border border-slate-300 rounded bg-white text-slate-800 font-medium"
            />
          </div>
        </div>
      </div>

      {formError && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg font-medium">
          {formError}
        </div>
      )}

      {/* Section 1: Proposer's Details */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-2.5 border-b border-blue-200">
          <h2 className="text-sm font-bold text-blue-900">Proposer&apos;s Details</h2>
        </div>

        <div className="p-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-slate-600 block mb-1">
                Title <span className="text-red-500">*</span>
              </label>
              <select
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded bg-white text-slate-800"
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
                  placeholder="Enter proposer name"
                  className="flex-1 px-3 py-1.5 text-sm border border-slate-300 rounded bg-white text-slate-800"
                />
                <button
                  type="button"
                  onClick={() => setIsClientModalOpen(true)}
                  title="Select Existing Client"
                  className="p-1.5 text-blue-700 hover:bg-blue-100/80 active:bg-blue-200 rounded border border-blue-300 transition-colors"
                >
                  <List size={20} className="stroke-[2.5]" />
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
                className="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded bg-white text-slate-800"
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
                className="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded bg-white text-slate-800 font-medium"
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
                className="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded bg-white text-slate-800"
              />
            </div>

            <div className="sm:col-span-3">
              <label className="text-xs font-medium text-slate-600 block mb-1">
                Smoker
              </label>
              <select
                value={isSmoker ? "Yes" : "No"}
                onChange={(e) => setIsSmoker(e.target.value === "Yes")}
                className="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded bg-white text-slate-800"
              >
                <option value="No">No</option>
                <option value="Yes">Yes</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Section 2: Protect and Earn Solution Requirements */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-2.5 border-b border-blue-200">
          <h2 className="text-sm font-bold text-blue-900">
            Protect and Earn Solution Requirements
          </h2>
        </div>

        <div className="p-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
            <div className="sm:col-span-6">
              <label className="text-xs font-medium text-slate-600 block mb-1">
                Cover Required <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">
                  ₹
                </span>
                <input
                  type="number"
                  value={coverRequired}
                  onChange={(e) => setCoverRequired(Number(e.target.value))}
                  className="w-full pl-7 pr-3 py-1.5 text-sm border border-slate-300 rounded bg-white text-slate-800 font-medium"
                />
              </div>
            </div>

            <div className="sm:col-span-6">
              <label className="text-xs font-medium text-slate-600 block mb-1">
                Term <span className="text-red-500">*</span>
              </label>
              <select
                value={policyTerm}
                onChange={(e) => setPolicyTerm(Number(e.target.value))}
                className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded bg-white text-slate-800"
              >
                {termOptions.map((t) => (
                  <option key={t} value={t}>
                    {t} Years
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 pt-2 border-t border-slate-100">
            <div className="sm:col-span-6">
              <label className="text-xs font-medium text-slate-600 block mb-1">
                Sec.80 C Investment Limit
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">
                  ₹
                </span>
                <input
                  type="number"
                  value={sec80CLimit}
                  onChange={(e) => setSec80CLimit(Number(e.target.value))}
                  className="w-full pl-7 pr-3 py-1.5 text-sm border border-slate-300 rounded bg-white text-slate-800 font-medium"
                />
              </div>
            </div>

            <div className="sm:col-span-6">
              <label className="text-xs font-medium text-slate-600 block mb-1">
                Sec.80 C Tax Savings will be @
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  value={taxSlabPercentage}
                  onChange={(e) => setTaxSlabPercentage(Number(e.target.value))}
                  className="w-full pl-3 pr-8 py-1.5 text-sm border border-slate-300 rounded bg-white text-slate-800 font-medium"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">
                  %
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Combination Result Card if generated */}
      {combinationDetails && (
        <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-lg space-y-2">
          <h3 className="text-sm font-bold text-emerald-900">
            Recommended Solution Combination:
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div>
              <span className="text-slate-600 block">Plan:</span>
              <span className="font-bold text-slate-800">
                {combinationDetails.planNumber} ({policyTerm} Yrs)
              </span>
            </div>
            <div>
              <span className="text-slate-600 block">Sum Assured:</span>
              <span className="font-bold text-slate-800">
                {formatCurrency(combinationDetails.summaryRow?.sumAssured)}
              </span>
            </div>
            <div>
              <span className="text-slate-600 block">Yearly Premium:</span>
              <span className="font-bold text-emerald-800">
                {formatCurrency(combinationDetails.totalInstallmentPremium)}
              </span>
            </div>
            <div>
              <span className="text-slate-600 block">Estimated Maturity:</span>
              <span className="font-bold text-blue-800">
                {formatCurrency(combinationDetails.maturityAmount)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Action Buttons */}
      <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={handleShowCombination}
          disabled={isCalculating}
          className="px-6 py-2 text-sm font-semibold text-white bg-[#186a8e] hover:bg-[#135674] active:bg-[#0f445c] rounded shadow-sm transition-all"
        >
          {isCalculating ? "Calculating..." : "Show Combination"}
        </button>

        <button
          type="button"
          onClick={handleSave}
          disabled={isLoading}
          className="px-6 py-2 text-sm font-semibold text-white bg-[#186a8e] hover:bg-[#135674] active:bg-[#0f445c] rounded shadow-sm transition-all"
        >
          {isLoading ? "Saving..." : "Save"}
        </button>

        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-2 text-sm font-semibold text-white bg-[#186a8e] hover:bg-[#135674] active:bg-[#0f445c] rounded shadow-sm transition-all"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};
