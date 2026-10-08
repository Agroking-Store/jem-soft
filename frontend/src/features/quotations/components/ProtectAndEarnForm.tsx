"use client";

import React, { useState, useEffect } from "react";
import { List, Save, Eye, Calculator, Loader2 } from "lucide-react";
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

interface ProtectAndEarnFormProps {
  onCancel: () => void;
  onSaved: (quotation: any, shouldViewReport: boolean) => void;
  editQuotation?: any;
}

export const ProtectAndEarnForm: React.FC<ProtectAndEarnFormProps> = ({
  onCancel,
  onSaved,
  editQuotation,
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

  const [combinationDetails, setCombinationDetails] = useState<any>(null);

  const termOptions = [10, 12, 15, 16, 18, 20, 21, 25, 30];

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
      setIsSmoker(editQuotation.isSmoker || false);
      setCoverRequired(editQuotation.coverRequired || 1000000);
      setPolicyTerm(editQuotation.policyTerm || 20);
      setSec80CLimit(editQuotation.sec80CLimit || 150000);
      setTaxSlabPercentage(editQuotation.taxSlabPercentage || 30.9);
    } else {
      dispatch(fetchNextRefNo("PROTECT_AND_EARN")).then((res: any) => {
        if (res.payload) {
          setQuotationRefNo(res.payload);
        }
      });
    }
  }, [dispatch, editQuotation]);

  const handleAutoFillRef = () => {
    const toastId = toast.loading("Generating next quote ref...");
    dispatch(fetchNextRefNo()).then((res: any) => {
      if (res.payload) {
        setQuotationRefNo(res.payload);
        toast.success(`Generated: ${res.payload}`, { id: toastId });
      } else {
        toast.error("Could not fetch ref", { id: toastId });
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

  const handleShowCombination = async () => {
    if (!coverRequired || coverRequired <= 0) {
      toast.error("Please enter valid Cover Required.");
      return;
    }

    const toastId = toast.loading("Calculating Protect & Earn solution combination...");
    const res: any = await dispatch(
      calculateQuotation({
        productType: "PROTECT_AND_EARN",
        planNumber: "736",
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
      toast.success("Solution combination calculated!", { id: toastId });
    } else {
      toast.error("Calculation failed", { id: toastId });
    }
  };

  const handleSave = async (shouldView: boolean) => {
    if (!proposerName.trim()) {
      toast.error("Please enter or select Proposer's Name.");
      return;
    }

    if (!coverRequired || coverRequired <= 0) {
      toast.error("Please enter a valid Cover Required amount.");
      return;
    }

    if (!combinationDetails) {
      toast.error("Please click 'Show Combination' first to calculate the quotation.");
      return;
    }

    const toastId = toast.loading("Saving Protect & Earn quotation...");

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

    const action = editQuotation
      ? await dispatch(updateQuotation({ id: editQuotation.id, payload }))
      : await dispatch(saveQuotation(payload));

    const isSuccess = editQuotation
      ? updateQuotation.fulfilled.match(action)
      : saveQuotation.fulfilled.match(action);

    if (isSuccess) {
      toast.success(
        editQuotation ? "Quotation updated successfully!" : "Protect & Earn quotation saved successfully!",
        { id: toastId }
      );
      onSaved(action.payload, shouldView);
    } else {
      toast.error("Failed to save quotation", { id: toastId });
    }
  };

  const formatCurrency = (val?: number | null) => {
    if (val === undefined || val === null) return "₹ 0";
    return `₹ ${Number(val).toLocaleString("en-IN")}`;
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

      {/* Section 1: Proposer's Details */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="bg-slate-50 px-5 py-3 border-b border-slate-200">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Proposer&apos;s Details
          </h2>
        </div>

        <div className="p-5 space-y-4">
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
                  placeholder="Enter proposer name or choose existing client"
                  className="flex-1 px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white text-slate-800 font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                />
                <button
                  type="button"
                  onClick={() => setIsClientModalOpen(true)}
                  title="Select Existing Client"
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
      </div>

      {/* Section 2: Protect and Earn Solution Requirements */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="bg-slate-50 px-5 py-3 border-b border-slate-200">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Protect and Earn Solution Requirements
          </h2>
        </div>

        <div className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
            <div className="sm:col-span-6">
              <label className="text-xs font-medium text-slate-600 block mb-1">
                Cover Required <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-500">
                  ₹
                </span>
                <input
                  type="number"
                  value={coverRequired}
                  onChange={(e) => setCoverRequired(Number(e.target.value))}
                  className="w-full pl-7 pr-3 py-2 text-xs border border-slate-300 rounded-lg bg-white text-slate-800 font-bold"
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
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white text-slate-800 font-medium"
              >
                {termOptions.map((t) => (
                  <option key={t} value={t}>
                    {t} Years
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 pt-3 border-t border-slate-100">
            <div className="sm:col-span-6">
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

      {/* Combination Result Card */}
      {combinationDetails && (
        <div className="p-5 bg-gradient-to-r from-emerald-50/90 to-teal-50/90 border border-emerald-200 rounded-2xl shadow-xs space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-950">
            Calculated Solution Combination:
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div className="p-3 bg-white/80 rounded-xl border border-emerald-100">
              <span className="text-slate-500 block text-[11px]">Recommended Plan</span>
              <span className="font-bold text-slate-900 text-sm">
                Plan {combinationDetails.planNumber} ({policyTerm} Yrs)
              </span>
            </div>
            <div className="p-3 bg-white/80 rounded-xl border border-emerald-100">
              <span className="text-slate-500 block text-[11px]">Sum Assured</span>
              <span className="font-bold text-slate-900 text-sm">
                {formatCurrency(combinationDetails.summaryRow?.sumAssured)}
              </span>
            </div>
            <div className="p-3 bg-white/80 rounded-xl border border-emerald-100">
              <span className="text-slate-500 block text-[11px]">Yearly Premium</span>
              <span className="font-black text-emerald-800 text-sm">
                {formatCurrency(combinationDetails.totalInstallmentPremium)}
              </span>
            </div>
            <div className="p-3 bg-white/80 rounded-xl border border-emerald-100">
              <span className="text-slate-500 block text-[11px]">Est. Maturity Value</span>
              <span className="font-black text-blue-900 text-sm">
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
          className="flex items-center gap-1.5 px-6 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 rounded-xl shadow-xs transition-all cursor-pointer"
        >
          {isCalculating ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Calculator size={16} />
          )}
          {isCalculating ? "Calculating Solution..." : "Show Combination"}
        </button>

        <button
          type="button"
          onClick={() => handleSave(false)}
          disabled={isLoading}
          className="flex items-center gap-1.5 px-6 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 rounded-xl shadow-xs transition-all cursor-pointer"
        >
          <Save size={16} />
          {isLoading ? "Saving..." : "Save to List"}
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
