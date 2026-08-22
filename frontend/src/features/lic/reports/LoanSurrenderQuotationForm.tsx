"use client";

import { useState, useMemo } from "react";
import {
  RotateCcw,
  FileText,
  ChevronLeft,
  ChevronDown,
  ArrowRight,
  Calculator,
  Shield,
  X,
} from "lucide-react";
import type { Policy } from "@/features/policy/policySlice";
import type { Customer, CustomerMaster } from "@/features/customers/types";

export interface LoanSurrenderQuotationFormData {
  quotationType: "loan" | "surrender";
  policyId: string;
  policyNumber: string;
  clientName: string;
  dob: string;
  commencementDate: string;
  plan: string;
  mode: string;
  term: number | string;
  ppt: number | string;
  sumAssured: number | string;
  basicPremium: number | string;
  riderPremium: number | string;
  premium: number | string;
  premiumSubYear: number | string;
  fupDate: string;
  loanTaken: number | string;
  dateOfCalculation: string;
  remarks: string;

  // Calculation Results
  yearsPremiumsPaid: number | string;
  yearsElapsed: number | string;
  vestedBonusSV: number | string;
  paidUpValueSV: number | string;
  totalSV: number | string;
  vestedBonusLoan: number | string;
  paidUpValueLoan: number | string;
  totalLoan: number | string;
  svFactor: number | string;
  specialSurrenderValue: number | string;
  guaranteedSurrenderValue: number | string;
  surrenderValuePayable: number | string;
  loanAvailable: number | string;
  projectedMaturityAmount: number | string;
}

interface LoanSurrenderQuotationFormProps {
  onBack: () => void;
  onGenerateReport: (formData: LoanSurrenderQuotationFormData) => void;
  initialData?: LoanSurrenderQuotationFormData | null;
  policies: Policy[];
  customers: Customer[];
  customersMaster: CustomerMaster[];
}

export default function LoanSurrenderQuotationForm({
  onBack,
  onGenerateReport,
  initialData,
  policies = [],
  customers = [],
  customersMaster = [],
}: LoanSurrenderQuotationFormProps) {
  const getTodayDateStr = () => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  const defaultFormData: LoanSurrenderQuotationFormData = {
    quotationType: "surrender",
    policyId: "",
    policyNumber: "",
    clientName: "",
    dob: "",
    commencementDate: "",
    plan: "",
    mode: "Y",
    term: 0,
    ppt: 0,
    sumAssured: 0,
    basicPremium: 0,
    riderPremium: 0,
    premium: 0,
    premiumSubYear: 0,
    fupDate: "",
    loanTaken: 0,
    dateOfCalculation: getTodayDateStr(),
    remarks: "",

    yearsPremiumsPaid: 0,
    yearsElapsed: 0,
    vestedBonusSV: 0,
    paidUpValueSV: 0,
    totalSV: 0,
    vestedBonusLoan: 0,
    paidUpValueLoan: 0,
    totalLoan: 0,
    svFactor: "0.00",
    specialSurrenderValue: 0,
    guaranteedSurrenderValue: 0,
    surrenderValuePayable: 0,
    loanAvailable: 0,
    projectedMaturityAmount: 0,
  };

  const [formData, setFormData] = useState<LoanSurrenderQuotationFormData>(() => {
    if (initialData) return initialData;
    return defaultFormData;
  });

  const [isRidersModalOpen, setIsRidersModalOpen] = useState(false);

  // Prepare policies with client names for dropdown
  const policyOptions = useMemo(() => {
    return policies.map((p) => {
      const cm =
        customersMaster.find((m) => m.id === p.CustomerMasterId) ||
        p.CustomerMaster;
      const c =
        customers.find((cust) => cust.id === p.clientId) || p.customer;

      const clientFullName = cm
        ? [cm.salutation, cm.firstName, cm.middleName, cm.lastName]
            .filter(Boolean)
            .join(" ")
            .trim()
        : c?.name || "Client";

      return {
        id: p.id,
        policyNumber: p.policyNumber,
        label: `${p.policyNumber} - ${clientFullName}`,
        clientName: clientFullName,
        rawPolicy: p,
      };
    });
  }, [policies, customersMaster, customers]);

  // Selected policy riders for inspection modal
  const selectedPolicyRiders = useMemo(() => {
    if (!formData.policyId) return [];
    const found = policies.find((p) => p.id === formData.policyId);
    return found?.policyRiders || [];
  }, [formData.policyId, policies]);

  // Autofill whenever policy is selected
  const handleSelectPolicy = (policyId: string) => {
    if (!policyId) {
      setFormData((prev) => ({
        ...defaultFormData,
        quotationType: prev.quotationType,
        dateOfCalculation: prev.dateOfCalculation,
      }));
      return;
    }

    const selectedOption = policyOptions.find((opt) => opt.id === policyId);
    if (!selectedOption) return;

    const pol = selectedOption.rawPolicy;
    const cm =
      customersMaster.find((m) => m.id === pol.CustomerMasterId) ||
      pol.CustomerMaster;

    const clientFullName = selectedOption.clientName;

    const dobStr = cm?.dob
      ? new Date(cm.dob).toISOString().split("T")[0]
      : "";

    const commDateStr = pol.commencementDate
      ? new Date(pol.commencementDate).toISOString().split("T")[0]
      : "";

    const fupDateStr = pol.nextPremiumDueDate
      ? new Date(pol.nextPremiumDueDate).toISOString().split("T")[0]
      : "";

    const sumAssured = Number(pol.premium?.sumAssured) || 0;
    const basicPrem =
      Number(pol.premium?.basicYearlyPremium) ||
      Number(pol.premium?.installmentPremium) ||
      0;
    const riderPrem = Number((pol.premium as any)?.riderPremium) || 0;
    const totalInstPrem =
      Number(pol.premium?.totalInstallmentPremium) ||
      Number(pol.premium?.totalYearlyPremium) ||
      basicPrem + riderPrem;

    const term = pol.policyTerm || 0;
    const ppt = pol.premiumPayingTerm || term || 0;

    const modeName = pol.premiumMode?.modeName || pol.mode || "Y";
    const modeShort =
      modeName.toLowerCase().startsWith("y")
        ? "Y"
        : modeName.toLowerCase().startsWith("h")
        ? "H"
        : modeName.toLowerCase().startsWith("q")
        ? "Q"
        : modeName.toLowerCase().startsWith("m")
        ? "M"
        : modeName.toLowerCase().startsWith("s")
        ? "S"
        : "Y";

    const loan = (pol as any).loans?.[0];
    const loanTaken = Number(loan?.loanAmount) || 0;

    // Calculation estimates
    const commYear = commDateStr ? new Date(commDateStr).getFullYear() : new Date().getFullYear();
    const currentYear = new Date().getFullYear();
    const yearsElapsed = Math.max(1, currentYear - commYear);
    const yearsPaid = Math.min(yearsElapsed, Number(ppt) || yearsElapsed);

    const paidUpVal = ppt > 0 ? Math.round((sumAssured * yearsPaid) / Number(ppt)) : sumAssured;
    const vestedBonusVal = Math.round((sumAssured * 0.045) * yearsPaid);
    const totalSvVal = paidUpVal + vestedBonusVal;
    const svFactorVal = (Math.min(0.9, 0.3 + (yearsPaid * 0.03))).toFixed(2);
    const specialSurVal = Math.round(totalSvVal * Number(svFactorVal));
    const gaurSurVal = Math.round(basicPrem * yearsPaid * 0.35);
    const surPayable = Math.max(specialSurVal, gaurSurVal) - loanTaken;
    const loanAvail = Math.max(0, Math.round(specialSurVal * 0.9) - loanTaken);
    const projMaturity = sumAssured + Math.round((sumAssured * 0.048) * Number(term || 20));

    setFormData((prev) => ({
      ...prev,
      policyId: pol.id,
      policyNumber: pol.policyNumber,
      clientName: clientFullName,
      dob: dobStr,
      commencementDate: commDateStr,
      plan: pol.product?.planNumber || pol.product?.productName || "14",
      mode: modeShort,
      term: term,
      ppt: ppt,
      sumAssured: sumAssured,
      basicPremium: basicPrem,
      riderPremium: riderPrem,
      premium: totalInstPrem,
      premiumSubYear: basicPrem,
      fupDate: fupDateStr,
      loanTaken: loanTaken,
      remarks: pol.remarks || "",

      yearsPremiumsPaid: yearsPaid,
      yearsElapsed: yearsElapsed,
      vestedBonusSV: vestedBonusVal,
      paidUpValueSV: paidUpVal,
      totalSV: totalSvVal,
      vestedBonusLoan: vestedBonusVal,
      paidUpValueLoan: paidUpVal,
      totalLoan: totalSvVal,
      svFactor: svFactorVal,
      specialSurrenderValue: specialSurVal,
      guaranteedSurrenderValue: gaurSurVal,
      surrenderValuePayable: Math.max(0, surPayable),
      loanAvailable: loanAvail,
      projectedMaturityAmount: projMaturity,
    }));
  };

  // Re-calculate button handler
  const handleCalculate = () => {
    const sumAssured = Number(formData.sumAssured) || 0;
    const basicPrem = Number(formData.basicPremium) || Number(formData.premium) || 0;
    const term = Number(formData.term) || 20;
    const ppt = Number(formData.ppt) || term;
    const loanTaken = Number(formData.loanTaken) || 0;

    const commYear = formData.commencementDate
      ? new Date(formData.commencementDate).getFullYear()
      : new Date().getFullYear();
    const currentYear = formData.dateOfCalculation
      ? new Date(formData.dateOfCalculation).getFullYear()
      : new Date().getFullYear();

    const yearsElapsed = Math.max(1, currentYear - commYear);
    const yearsPaid = Math.min(yearsElapsed, ppt || yearsElapsed);

    const paidUpVal = ppt > 0 ? Math.round((sumAssured * yearsPaid) / ppt) : sumAssured;
    const vestedBonusVal = Math.round((sumAssured * 0.045) * yearsPaid);
    const totalSvVal = paidUpVal + vestedBonusVal;
    const svFactorVal = (Math.min(0.9, 0.3 + (yearsPaid * 0.03))).toFixed(2);
    const specialSurVal = Math.round(totalSvVal * Number(svFactorVal));
    const gaurSurVal = Math.round(basicPrem * yearsPaid * 0.35);
    const surPayable = Math.max(specialSurVal, gaurSurVal) - loanTaken;
    const loanAvail = Math.max(0, Math.round(specialSurVal * 0.9) - loanTaken);
    const projMaturity = sumAssured + Math.round((sumAssured * 0.048) * term);

    setFormData((prev) => ({
      ...prev,
      yearsPremiumsPaid: yearsPaid,
      yearsElapsed: yearsElapsed,
      vestedBonusSV: vestedBonusVal,
      paidUpValueSV: paidUpVal,
      totalSV: totalSvVal,
      vestedBonusLoan: vestedBonusVal,
      paidUpValueLoan: paidUpVal,
      totalLoan: totalSvVal,
      svFactor: svFactorVal,
      specialSurrenderValue: specialSurVal,
      guaranteedSurrenderValue: gaurSurVal,
      surrenderValuePayable: Math.max(0, surPayable),
      loanAvailable: loanAvail,
      projectedMaturityAmount: projMaturity,
    }));
  };

  const handleReset = () => {
    setFormData(defaultFormData);
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    onGenerateReport(formData);
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Action Bar matching Policy Register */}
      <div className="relative overflow-hidden bg-[#0B1220] rounded-2xl p-4 sm:p-5 text-white shadow-xl border border-slate-800">
        <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#B8873A] via-[#E8C77A] to-transparent" />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-300 bg-white/10 rounded-xl hover:bg-white/20 transition uppercase tracking-wider cursor-pointer"
            >
              <ChevronLeft size={16} />
              <span>Reports</span>
            </button>
            <div className="h-6 w-px bg-white/15" />
            <h1 className="font-serif text-lg sm:text-xl font-bold text-[#E8C77A] tracking-wider uppercase">
              Loan / Surrender / Maturity Value Calculation
            </h1>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              type="button"
              onClick={handleReset}
              className="p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-xl transition cursor-pointer"
              title="Reset Form"
            >
              <RotateCcw size={19} />
            </button>
            <button
              type="button"
              onClick={() => onGenerateReport(formData)}
              className="p-2 text-[#E8C77A] hover:bg-white/10 rounded-xl transition cursor-pointer"
              title="Generate Quotation Report"
            >
              <FileText size={19} />
            </button>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Top Type Selector & Search Policy Bar matching Screenshot 4 */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#B8873A] via-[#B8873A]/40 to-transparent" />

          {/* Quotation Type Radios */}
          <div className="flex items-center gap-8 pb-4 border-b border-slate-100">
            <label className="flex items-center gap-2.5 cursor-pointer font-bold text-xs text-slate-800">
              <input
                type="radio"
                name="quotationType"
                value="loan"
                checked={formData.quotationType === "loan"}
                onChange={() => setFormData((prev) => ({ ...prev, quotationType: "loan" }))}
                className="w-4 h-4 text-[#B8873A] focus:ring-[#B8873A] cursor-pointer"
              />
              <span>Loan Quotation</span>
            </label>

            <label className="flex items-center gap-2.5 cursor-pointer font-bold text-xs text-slate-800">
              <input
                type="radio"
                name="quotationType"
                value="surrender"
                checked={formData.quotationType === "surrender"}
                onChange={() => setFormData((prev) => ({ ...prev, quotationType: "surrender" }))}
                className="w-4 h-4 text-[#B8873A] focus:ring-[#B8873A] cursor-pointer"
              />
              <span>Surrender Value Quotation</span>
            </label>
          </div>

          {/* Search Policy Select Dropdown */}
          <div className="pt-4 max-w-lg">
            <div className="relative">
              <span className="absolute -top-2 left-3 bg-white px-1 text-[10px] text-[#B8873A] font-bold uppercase tracking-wider">
                Search By Policy Number / Name
              </span>
              <select
                value={formData.policyId}
                onChange={(e) => handleSelectPolicy(e.target.value)}
                className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-xs text-slate-900 font-semibold bg-white outline-none focus:border-[#B8873A] focus:ring-2 focus:ring-[#B8873A]/20 cursor-pointer appearance-none pr-10"
              >
                <option value="">-- Search By Policy Number / Name --</option>
                {policyOptions.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={16}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />
            </div>
          </div>
        </div>

        {/* Main Grid: Left Policy Details & Right Calculation */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT: Policy Details Card */}
          <div className="lg:col-span-7">
            <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
              <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#B8873A] via-[#B8873A]/40 to-transparent" />
              <div className="flex items-center gap-2 mb-2">
                <h2 className="font-serif text-sm font-bold uppercase tracking-wider text-slate-900">
                  Policy Details
                </h2>
              </div>

              {/* Name, DOB, Comm Date */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                <div className="sm:col-span-6 space-y-1">
                  <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Name</span>
                  <input
                    type="text"
                    value={formData.clientName}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, clientName: e.target.value }))
                    }
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 font-medium bg-white focus:outline-none focus:border-[#B8873A]"
                    placeholder="Name"
                  />
                </div>

                <div className="sm:col-span-3 space-y-1">
                  <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Date of Birth</span>
                  <input
                    type="date"
                    value={formData.dob}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, dob: e.target.value }))
                    }
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 font-medium bg-white focus:outline-none focus:border-[#B8873A]"
                  />
                </div>

                <div className="sm:col-span-3 space-y-1">
                  <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Comm. Date</span>
                  <input
                    type="date"
                    value={formData.commencementDate}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        commencementDate: e.target.value,
                      }))
                    }
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 font-medium bg-white focus:outline-none focus:border-[#B8873A]"
                  />
                </div>
              </div>

              {/* Plan, Mode, Term, PPT */}
              <div className="grid grid-cols-2 sm:grid-cols-12 gap-3">
                <div className="sm:col-span-5 space-y-1">
                  <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Plan</span>
                  <input
                    type="text"
                    value={formData.plan}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, plan: e.target.value }))
                    }
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 font-medium bg-white focus:outline-none focus:border-[#B8873A]"
                    placeholder="Plan"
                  />
                </div>

                <div className="sm:col-span-3 space-y-1">
                  <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Mode</span>
                  <select
                    value={formData.mode}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, mode: e.target.value }))
                    }
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 font-medium bg-white focus:outline-none focus:border-[#B8873A] cursor-pointer"
                  >
                    <option value="Y">Yearly (Y)</option>
                    <option value="H">Half-Yearly (H)</option>
                    <option value="Q">Quarterly (Q)</option>
                    <option value="M">Monthly (M)</option>
                    <option value="S">Single (S)</option>
                    <option value="NACH">NACH</option>
                  </select>
                </div>

                <div className="sm:col-span-2 space-y-1">
                  <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Term</span>
                  <input
                    type="number"
                    value={formData.term}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, term: Number(e.target.value) }))
                    }
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 font-medium font-mono bg-white focus:outline-none focus:border-[#B8873A]"
                  />
                </div>

                <div className="sm:col-span-2 space-y-1">
                  <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">PPT</span>
                  <input
                    type="number"
                    value={formData.ppt}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, ppt: Number(e.target.value) }))
                    }
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 font-medium font-mono bg-white focus:outline-none focus:border-[#B8873A]"
                  />
                </div>
              </div>

              {/* Sum Assured, Basic Premium, Rider Premium, Riders Button */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                <div className="sm:col-span-3 relative">
                  <span className="absolute -top-2 left-3 bg-white px-1 text-[10px] text-[#B8873A] font-bold uppercase tracking-wider">
                    Sum Assured
                  </span>
                  <input
                    type="number"
                    value={formData.sumAssured}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, sumAssured: Number(e.target.value) }))
                    }
                    className="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 font-semibold font-mono bg-white focus:outline-none focus:border-[#B8873A]"
                  />
                </div>

                <div className="sm:col-span-3 relative">
                  <span className="absolute -top-2 left-3 bg-white px-1 text-[10px] text-[#B8873A] font-bold uppercase tracking-wider">
                    Basic Premium
                  </span>
                  <input
                    type="number"
                    value={formData.basicPremium}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, basicPremium: Number(e.target.value) }))
                    }
                    className="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 font-semibold font-mono bg-white focus:outline-none focus:border-[#B8873A]"
                  />
                </div>

                <div className="sm:col-span-3 relative">
                  <span className="absolute -top-2 left-3 bg-white px-1 text-[10px] text-[#B8873A] font-bold uppercase tracking-wider">
                    Rider Premium
                  </span>
                  <input
                    type="number"
                    value={formData.riderPremium}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, riderPremium: Number(e.target.value) }))
                    }
                    className="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 font-semibold font-mono bg-white focus:outline-none focus:border-[#B8873A]"
                  />
                </div>

                <div className="sm:col-span-3">
                  <button
                    type="button"
                    onClick={() => setIsRidersModalOpen(true)}
                    className="w-full py-2 px-3 bg-[#0B1220] hover:bg-[#1a253a] text-[#E8C77A] text-xs font-bold rounded-xl border border-[#B8873A]/40 transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Shield size={14} />
                    <span>Riders</span>
                  </button>
                </div>
              </div>

              {/* Premium & Premium Sub Year */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="relative">
                  <span className="absolute -top-2 left-3 bg-white px-1 text-[10px] text-[#B8873A] font-bold uppercase tracking-wider">
                    Premium
                  </span>
                  <input
                    type="number"
                    value={formData.premium}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, premium: Number(e.target.value) }))
                    }
                    className="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 font-semibold font-mono bg-white focus:outline-none focus:border-[#B8873A]"
                  />
                </div>

                <div className="relative">
                  <span className="absolute -top-2 left-3 bg-white px-1 text-[10px] text-[#B8873A] font-bold uppercase tracking-wider">
                    Premium Sub Year
                  </span>
                  <input
                    type="number"
                    value={formData.premiumSubYear}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        premiumSubYear: Number(e.target.value),
                      }))
                    }
                    className="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 font-semibold font-mono bg-white focus:outline-none focus:border-[#B8873A]"
                  />
                </div>
              </div>

              {/* Fup Date & Loan Taken */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="relative">
                  <span className="absolute -top-2 left-3 bg-white px-1 text-[10px] text-[#B8873A] font-bold uppercase tracking-wider">
                    Fup Date
                  </span>
                  <input
                    type="date"
                    value={formData.fupDate}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, fupDate: e.target.value }))
                    }
                    className="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 font-medium bg-white focus:outline-none focus:border-[#B8873A]"
                  />
                </div>

                <div className="relative">
                  <span className="absolute -top-2 left-3 bg-white px-1 text-[10px] text-[#B8873A] font-bold uppercase tracking-wider">
                    Loan taken
                  </span>
                  <input
                    type="number"
                    value={formData.loanTaken}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, loanTaken: Number(e.target.value) }))
                    }
                    className="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 font-medium font-mono bg-white focus:outline-none focus:border-[#B8873A]"
                  />
                </div>
              </div>

              {/* Date of Calculation, Remarks, Calculate Button */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                <div className="sm:col-span-4 relative">
                  <span className="absolute -top-2 left-3 bg-white px-1 text-[10px] text-[#B8873A] font-bold uppercase tracking-wider">
                    Date of Calculation
                  </span>
                  <input
                    type="date"
                    value={formData.dateOfCalculation}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        dateOfCalculation: e.target.value,
                      }))
                    }
                    className="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 font-medium bg-white focus:outline-none focus:border-[#B8873A]"
                  />
                </div>

                <div className="sm:col-span-5 space-y-1">
                  <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Remarks</span>
                  <input
                    type="text"
                    value={formData.remarks}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, remarks: e.target.value }))
                    }
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 font-medium bg-white focus:outline-none focus:border-[#B8873A]"
                    placeholder="Remarks"
                  />
                </div>

                <div className="sm:col-span-3">
                  <button
                    type="button"
                    onClick={handleCalculate}
                    className="w-full py-2.5 px-3 bg-gradient-to-r from-[#B8873A] to-[#D9AE63] text-[#0B1220] text-xs font-bold rounded-xl shadow-md hover:brightness-105 transition flex items-center justify-center gap-1.5 cursor-pointer uppercase tracking-wider"
                  >
                    <Calculator size={15} />
                    <span>Calculate</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: Calculation Summary */}
          <div className="lg:col-span-5">
            <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm h-full flex flex-col justify-between">
              <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#B8873A] via-[#B8873A]/40 to-transparent" />
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <h2 className="font-serif text-sm font-bold uppercase tracking-wider text-slate-900">
                    Calculation
                  </h2>
                </div>

                <div className="space-y-2.5 text-xs pt-2">
                  <div className="grid grid-cols-12 items-center gap-2">
                    <span className="col-span-7 text-slate-700 font-medium">No. of Years Premiums Paid :</span>
                    <div className="col-span-5 text-right font-mono font-bold text-slate-900">
                      {formData.yearsPremiumsPaid || 0}
                    </div>
                  </div>

                  <div className="grid grid-cols-12 items-center gap-2">
                    <span className="col-span-7 text-slate-700 font-medium">No. of Years Elapsed :</span>
                    <div className="col-span-5 text-right font-mono font-bold text-slate-900">
                      {formData.yearsElapsed || 0}
                    </div>
                  </div>

                  <div className="grid grid-cols-12 items-center gap-2 pt-1 border-t border-slate-100">
                    <span className="col-span-7 text-slate-700">Vested Bonus (for S.V.) :</span>
                    <div className="col-span-5 text-right font-mono text-slate-900">
                      {Number(formData.vestedBonusSV).toLocaleString("en-IN")}
                    </div>
                  </div>

                  <div className="grid grid-cols-12 items-center gap-2">
                    <span className="col-span-7 text-slate-700">Paid Up Value :</span>
                    <div className="col-span-5 text-right font-mono text-slate-900">
                      {Number(formData.paidUpValueSV).toLocaleString("en-IN")}
                    </div>
                  </div>

                  <div className="grid grid-cols-12 items-center gap-2 font-bold bg-[#B8873A]/10 p-1.5 rounded-lg">
                    <span className="col-span-7 text-slate-900 font-bold">Total :</span>
                    <div className="col-span-5 text-right font-mono text-slate-900 font-bold">
                      {Number(formData.totalSV).toLocaleString("en-IN")}
                    </div>
                  </div>

                  <div className="grid grid-cols-12 items-center gap-2 pt-1">
                    <span className="col-span-7 text-slate-700">Vested Bonus (for Loan) :</span>
                    <div className="col-span-5 text-right font-mono text-slate-900">
                      {Number(formData.vestedBonusLoan).toLocaleString("en-IN")}
                    </div>
                  </div>

                  <div className="grid grid-cols-12 items-center gap-2">
                    <span className="col-span-7 text-slate-700">Paid Up Value :</span>
                    <div className="col-span-5 text-right font-mono text-slate-900">
                      {Number(formData.paidUpValueLoan).toLocaleString("en-IN")}
                    </div>
                  </div>

                  <div className="grid grid-cols-12 items-center gap-2 font-bold bg-[#B8873A]/10 p-1.5 rounded-lg">
                    <span className="col-span-7 text-slate-900 font-bold">Total :</span>
                    <div className="col-span-5 text-right font-mono text-slate-900 font-bold">
                      {Number(formData.totalLoan).toLocaleString("en-IN")}
                    </div>
                  </div>

                  <div className="grid grid-cols-12 items-center gap-2 pt-1">
                    <span className="col-span-7 text-slate-700">S.V. Factor :</span>
                    <div className="col-span-5 text-right font-mono text-slate-900">
                      {formData.svFactor || "0.00"}
                    </div>
                  </div>

                  <div className="grid grid-cols-12 items-center gap-2">
                    <span className="col-span-7 text-slate-700">Special Sur. Value :</span>
                    <div className="col-span-5 text-right font-mono text-slate-900 font-semibold">
                      {Number(formData.specialSurrenderValue).toLocaleString("en-IN")}
                    </div>
                  </div>

                  <div className="grid grid-cols-12 items-center gap-2">
                    <span className="col-span-7 text-slate-700">Gaur. Sur. Value :</span>
                    <div className="col-span-5 text-right font-mono text-slate-900">
                      {Number(formData.guaranteedSurrenderValue).toLocaleString("en-IN")}
                    </div>
                  </div>

                  <div className="grid grid-cols-12 items-center gap-2 font-bold text-emerald-800 bg-emerald-50 p-1.5 rounded-lg border border-emerald-200">
                    <span className="col-span-7 font-bold">Surrender Value Payable :</span>
                    <div className="col-span-5 text-right font-mono font-bold">
                      {Number(formData.surrenderValuePayable).toLocaleString("en-IN")}
                    </div>
                  </div>

                  <div className="grid grid-cols-12 items-center gap-2 font-bold text-[#B8873A] bg-[#0B1220] p-1.5 rounded-lg">
                    <span className="col-span-7 text-white font-bold">Loan Available :</span>
                    <div className="col-span-5 text-right font-mono font-bold text-[#E8C77A]">
                      {Number(formData.loanAvailable).toLocaleString("en-IN")}
                    </div>
                  </div>

                  <div className="grid grid-cols-12 items-center gap-2 pt-1 font-semibold text-slate-900">
                    <span className="col-span-7">Projected Maturity Amount :</span>
                    <div className="col-span-5 text-right font-mono font-bold text-blue-900">
                      {Number(formData.projectedMaturityAmount).toLocaleString("en-IN")}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Generate Report Button */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            className="px-8 py-3 bg-gradient-to-r from-[#B8873A] to-[#D9AE63] text-[#0B1220] font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg hover:brightness-105 transition flex items-center gap-2 cursor-pointer"
          >
            <span>Generate Value Quotation Report</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </form>

      {/* Riders Modal */}
      {isRidersModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0B1220]/75 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden space-y-4">
            <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#B8873A] via-[#E8C77A] to-transparent" />
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-[#0B1220] text-white">
              <div className="flex items-center gap-2">
                <Shield size={18} className="text-[#E8C77A]" />
                <h3 className="font-serif text-sm font-bold tracking-wider text-[#E8C77A] uppercase">
                  Policy Riders Details
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsRidersModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg transition"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              {selectedPolicyRiders.length > 0 ? (
                <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                  <div className="bg-slate-100 px-3 py-2 font-bold grid grid-cols-12 text-slate-800">
                    <div className="col-span-6">Rider Name</div>
                    <div className="col-span-3 text-right">Sum</div>
                    <div className="col-span-3 text-right">Premium</div>
                  </div>
                  {selectedPolicyRiders.map((r: any, idx: number) => (
                    <div key={r.id || idx} className="px-3 py-2 grid grid-cols-12 text-slate-700">
                      <div className="col-span-6 font-medium">
                        {r.rider?.riderName || r.description || "Accidental Rider"}
                      </div>
                      <div className="col-span-3 text-right font-mono">
                        {Number(r.riderAmount || r.sum || 0).toLocaleString("en-IN")}
                      </div>
                      <div className="col-span-3 text-right font-mono font-semibold">
                        {Number(r.riderPremium || r.premium || 0).toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-slate-400 italic border-2 border-dashed border-slate-200 rounded-xl">
                  No optional riders attached to this policy
                </div>
              )}
            </div>

            <div className="flex justify-end p-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsRidersModalOpen(false)}
                className="px-5 py-2 bg-[#0B1220] text-[#E8C77A] font-bold text-xs rounded-xl uppercase tracking-wider hover:brightness-110 transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
