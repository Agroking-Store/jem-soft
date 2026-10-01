"use client";

import React, { useState, useEffect } from "react";
import { List, Calculator } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/store/store";
import {
  fetchNextRefNo,
  calculateQuotation,
  saveQuotation,
} from "../quotationSlice";
import { ExistingClientModal } from "./ExistingClientModal";

interface RetireEnjoyFormProps {
  onCancel: () => void;
  onSaved: (quotation: any, shouldViewReport: boolean) => void;
}

export const RetireEnjoyForm: React.FC<RetireEnjoyFormProps> = ({
  onCancel,
  onSaved,
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const { isCalculating, isLoading } = useSelector(
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
  const [dob, setDob] = useState("1985-01-01");
  const [age, setAge] = useState<number>(41);
  const [extraPremiumClass, setExtraPremiumClass] = useState("None");
  const [sec80CLimit, setSec80CLimit] = useState(150000);
  const [taxSlabPercentage, setTaxSlabPercentage] = useState(30.9);

  // Retirement Income Requirement
  const [fromAge, setFromAge] = useState<number>(60);
  const [toAge, setToAge] = useState<number>(85);
  const [desiredAnnualIncome, setDesiredAnnualIncome] = useState<number>(600000);
  const [inflationRate, setInflationRate] = useState<number>(0);
  const [premiumPayingYears, setPremiumPayingYears] = useState<number>(15);
  const [planCombination, setPlanCombination] = useState(
    "745 + 771 (Umang + Utsav)"
  );
  const [surrenderMaturedPolicies, setSurrenderMaturedPolicies] = useState(false);
  const [dabLimit, setDabLimit] = useState<number>(10000000);
  const [processBasis, setProcessBasis] = useState("Last declared bonus");

  const [incomeRows, setIncomeRows] = useState<any[]>([]);
  const [formError, setFormError] = useState<string | null>(null);

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
    if (!dobString) return 40;
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
    setFromAge(Math.max(calculatedAge + 10, 60));
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
      setFromAge(Math.max(client.age + 10, 60));
    }
  };

  const handleProcess = () => {
    if (!proposerName.trim()) {
      setFormError("Please enter Proposer Name.");
      return;
    }
    if (!desiredAnnualIncome || desiredAnnualIncome <= 0) {
      setFormError("Please enter Desired Annual Income.");
      return;
    }

    setFormError(null);
    const rows = [];
    const currentYear = new Date().getFullYear();
    const yearsUntilRetirement = Math.max(0, fromAge - age);

    for (let i = 0; i < Math.min(10, toAge - fromAge + 1); i++) {
      const year = currentYear + yearsUntilRetirement + i;
      const retirementAge = fromAge + i;
      const inflatedIncome = Math.round(
        desiredAnnualIncome * Math.pow(1 + inflationRate / 100, yearsUntilRetirement + i)
      );

      rows.push({
        year,
        age: retirementAge,
        additionIncomeNeeded: `₹ ${inflatedIncome.toLocaleString("en-IN")}`,
        existingCashProvision: "₹ 0",
      });
    }

    setIncomeRows(rows);
  };

  const handleSave = async () => {
    if (!proposerName.trim()) {
      setFormError("Please enter Proposer Name.");
      return;
    }

    let finalRef = quotationRefNo.trim();
    if (!finalRef) {
      const res: any = await dispatch(fetchNextRefNo());
      finalRef = res.payload || "000000000001";
    }

    const estimatedSumAssured = Math.round(desiredAnnualIncome * 12.5);

    const payload = {
      quotationRefNo: finalRef,
      productType: "RETIRE_ENJOY_I",
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
      extraPremiumClass,
      sec80CLimit: Number(sec80CLimit),
      taxSlabPercentage: Number(taxSlabPercentage),
      bonusScenario: "LAST_DECLARED",
      planNumber: "745",
      basis: "Desired Annual Income",
      budget: Number(desiredAnnualIncome),
      sumAssured: Number(estimatedSumAssured),
      premiumMode: "Yearly",
      policyTerm: Number(toAge - age),
      ppt: Number(premiumPayingYears),
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
              Comm Date
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

            <div className="sm:col-span-4">
              <label className="text-xs font-medium text-slate-600 block mb-1">
                Name <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={proposerName}
                  onChange={(e) => setProposerName(e.target.value)}
                  placeholder="Enter name"
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

            <div className="sm:col-span-2">
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

            <div className="sm:col-span-3">
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

            <div className="sm:col-span-1">
              <label className="text-xs font-medium text-slate-600 block mb-1">
                Age <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={age}
                onChange={(e) => setAge(Number(e.target.value))}
                className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded bg-white text-slate-800"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end pt-2 border-t border-slate-100">
            <div className="sm:col-span-4">
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

            <div className="sm:col-span-4">
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

            <div className="sm:col-span-4">
              <label className="text-xs font-medium text-slate-600 block mb-1">
                Extra Premium Class <span className="text-red-500">*</span>
              </label>
              <select
                value={extraPremiumClass}
                onChange={(e) => setExtraPremiumClass(e.target.value)}
                className="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded bg-white text-slate-800"
              >
                <option value="None">None</option>
                <option value="Class I">Class I</option>
                <option value="Class II">Class II</option>
                <option value="Class III">Class III</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Section 2: Retirement Income Requirement */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-2.5 border-b border-blue-200">
          <h2 className="text-sm font-bold text-blue-900">
            Retirement Income Requirement
          </h2>
        </div>

        <div className="p-4 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Controls (6 cols) */}
          <div className="lg:col-span-6 space-y-4">
            <div className="flex items-center gap-3">
              <span className="text-xs font-medium text-slate-700">
                Retirement income needed from Age
              </span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  placeholder="From Age *"
                  value={fromAge}
                  onChange={(e) => setFromAge(Number(e.target.value))}
                  className="w-24 px-2 py-1 text-xs border border-slate-300 rounded bg-white text-slate-800"
                />
                <span className="text-xs font-bold text-slate-500">TO</span>
                <input
                  type="number"
                  placeholder="To Age *"
                  value={toAge}
                  onChange={(e) => setToAge(Number(e.target.value))}
                  className="w-24 px-2 py-1 text-xs border border-slate-300 rounded bg-white text-slate-800"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                <input
                  type="radio"
                  checked
                  readOnly
                  className="text-blue-600 focus:ring-blue-500"
                />
                Solution Basis: Desired Annual Income
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={desiredAnnualIncome}
                  onChange={(e) => setDesiredAnnualIncome(Number(e.target.value))}
                  className="flex-1 px-3 py-1.5 text-sm border border-slate-300 rounded bg-white text-slate-800 font-medium"
                />
                <button
                  type="button"
                  onClick={handleProcess}
                  className="p-2 text-blue-700 bg-blue-100 hover:bg-blue-200 rounded border border-blue-300"
                >
                  <Calculator size={18} />
                </button>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-48">
                <label className="text-xs font-medium text-slate-600 block mb-1">
                  Rate of inflation to be considered
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={inflationRate}
                    onChange={(e) => setInflationRate(Number(e.target.value))}
                    className="w-full pl-3 pr-7 py-1 text-xs border border-slate-300 rounded bg-white text-slate-800"
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-500">
                    %
                  </span>
                </div>
              </div>

              <div className="flex-1">
                <label className="text-xs font-medium text-slate-600 block mb-1">
                  How many years you want to pay premium
                </label>
                <select
                  value={premiumPayingYears}
                  onChange={(e) => setPremiumPayingYears(Number(e.target.value))}
                  className="w-full px-2 py-1 text-xs border border-slate-300 rounded bg-white text-slate-800"
                >
                  <option value={10}>10 Years</option>
                  <option value={15}>15 Years</option>
                  <option value={20}>20 Years</option>
                  <option value={25}>25 Years</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1">
                For solution use combination of plan <span className="text-red-500">*</span>
              </label>
              <select
                value={planCombination}
                onChange={(e) => setPlanCombination(e.target.value)}
                className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded bg-white text-slate-800"
              >
                <option value="745 + 771 (Umang + Utsav)">
                  745 + 771 (Jeevan Umang + Jeevan Utsav)
                </option>
                <option value="715 + 858 (Jeevan Anand + Shanti Pension)">
                  715 + 858 (Jeevan Anand + Shanti Pension)
                </option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="surrender"
                checked={surrenderMaturedPolicies}
                onChange={(e) => setSurrenderMaturedPolicies(e.target.checked)}
                className="rounded text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="surrender" className="text-xs font-medium text-slate-700">
                Surrender of matured policies
              </label>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">
                  DAB Limit available
                </label>
                <input
                  type="number"
                  value={dabLimit}
                  onChange={(e) => setDabLimit(Number(e.target.value))}
                  className="w-full px-2 py-1 text-xs border border-slate-300 rounded bg-white text-slate-800"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">
                  Process solution on the basis of
                </label>
                <select
                  value={processBasis}
                  onChange={(e) => setProcessBasis(e.target.value)}
                  className="w-full px-2 py-1 text-xs border border-slate-300 rounded bg-white text-slate-800"
                >
                  <option value="Last declared bonus">Last declared bonus</option>
                  <option value="LIC 8% Scenario">LIC 8% Scenario</option>
                  <option value="LIC 4% Scenario">LIC 4% Scenario</option>
                </select>
              </div>
            </div>
          </div>

          {/* Right Side Table: Addition Income Info (6 cols) */}
          <div className="lg:col-span-6 border border-slate-200 rounded-lg overflow-hidden flex flex-col bg-slate-50/50">
            <div className="p-2.5 bg-blue-50 border-b border-blue-200 font-semibold text-xs text-blue-900">
              Addition Income Info :
            </div>
            <div className="flex-1 overflow-y-auto max-h-64">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200">
                    <th className="py-2 px-3 font-semibold text-slate-700">Year</th>
                    <th className="py-2 px-3 font-semibold text-slate-700">Age</th>
                    <th className="py-2 px-3 font-semibold text-slate-700">
                      Addition Income needed
                    </th>
                    <th className="py-2 px-3 font-semibold text-slate-700">
                      Existing cash Provision
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {incomeRows.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-12 text-center text-slate-400">
                        Click Calculator/Process to view yearly income forecast
                      </td>
                    </tr>
                  ) : (
                    incomeRows.map((r, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="py-2 px-3 font-mono">{r.year}</td>
                        <td className="py-2 px-3">{r.age}</td>
                        <td className="py-2 px-3 font-semibold text-emerald-700">
                          {r.additionIncomeNeeded}
                        </td>
                        <td className="py-2 px-3 text-slate-500">
                          {r.existingCashProvision}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Action Buttons */}
      <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={handleProcess}
          disabled={isCalculating}
          className="px-6 py-2 text-sm font-semibold text-white bg-[#186a8e] hover:bg-[#135674] active:bg-[#0f445c] rounded shadow-sm transition-all"
        >
          {isCalculating ? "Processing..." : "Process"}
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
          Close
        </button>
      </div>
    </div>
  );
};
