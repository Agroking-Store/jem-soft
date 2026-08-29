"use client";

import { useState, useMemo } from "react";
import {
  RotateCcw,
  FileText,
  ChevronLeft,
  ChevronDown,
  ArrowRight,
} from "lucide-react";
import type { Policy } from "@/features/policy/policySlice";
import type { Customer, CustomerMaster } from "@/features/customers/types";

export interface PolicyStatusFormData {
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
  premium: number | string;
  dab: number | string;
  depositAmount: number | string;
  branch: string;
  fupDate: string;
  loanTaken: number | string;
  loanDate: string;
  fuliDate: string;
  address: string;
  paymentType: string;
  remarks: string;

  // Calculation Options
  includeLoyaltyAddition: boolean;
  includeFab: boolean;

  // Calculation Fields
  totalPremiumsPaid: number | string;
  policyStatus: string;
  vestedBonusSV: number | string;
  paidUpValueSV: number | string;
  totalSV: number | string;
  vestedBonusLoan: number | string;
  paidUpValueLoan: number | string;
  totalLoan: number | string;
  svFactor: number | string;
  specialSurrenderValue: number | string;
  guaranteedSurrenderValue: number | string;
  lateFeeInterest: number | string;
  discountedValue: number | string;
  riskCover: number | string;
  loanAvailable: number | string;
  reportDate: string;
}

interface PolicyStatusReportFormProps {
  onBack: () => void;
  onGenerateReport: (formData: PolicyStatusFormData) => void;
  initialData?: PolicyStatusFormData | null;
  policies: Policy[];
  customers: Customer[];
  customersMaster: CustomerMaster[];
}

export default function PolicyStatusReportForm({
  onBack,
  onGenerateReport,
  initialData,
  policies = [],
  customers = [],
  customersMaster = [],
}: PolicyStatusReportFormProps) {
  const getTodayDateStr = () => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  const defaultFormData: PolicyStatusFormData = {
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
    premium: 0,
    dab: 0,
    depositAmount: 0,
    branch: "",
    fupDate: "",
    loanTaken: 0,
    loanDate: "",
    fuliDate: "",
    address: "",
    paymentType: "Ordinary",
    remarks: "",

    includeLoyaltyAddition: false,
    includeFab: true,

    totalPremiumsPaid: 0,
    policyStatus: "Inforce",
    vestedBonusSV: 0,
    paidUpValueSV: 0,
    totalSV: 0,
    vestedBonusLoan: 0,
    paidUpValueLoan: 0,
    totalLoan: 0,
    svFactor: "0.00",
    specialSurrenderValue: 0,
    guaranteedSurrenderValue: 0,
    lateFeeInterest: "0.00",
    discountedValue: 0,
    riskCover: 0,
    loanAvailable: 0,
    reportDate: getTodayDateStr(),
  };

  const [formData, setFormData] = useState<PolicyStatusFormData>(() => {
    if (initialData) return initialData;
    return defaultFormData;
  });

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

  // Autofill form whenever a policy is selected
  const handleSelectPolicy = (policyId: string) => {
    if (!policyId) {
      setFormData((prev) => ({
        ...defaultFormData,
        reportDate: prev.reportDate,
      }));
      return;
    }

    const selectedOption = policyOptions.find((opt) => opt.id === policyId);
    if (!selectedOption) return;

    const pol = selectedOption.rawPolicy;
    const cm =
      customersMaster.find((m) => m.id === pol.CustomerMasterId) ||
      pol.CustomerMaster;
    const c =
      customers.find((cust) => cust.id === pol.clientId) || pol.customer;

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

    const resAddr = (cm as any)?.addresses?.find((a: any) => a.addressType === "Residence") || (cm as any)?.addresses?.[0];
    const addressStr = resAddr
      ? [resAddr.addressLine1, resAddr.addressLine2, resAddr.city, resAddr.state, resAddr.pin]
          .filter(Boolean)
          .join(", ")
      : [(c as any)?.resAddressLine1, (c as any)?.resCity, (c as any)?.resState, (c as any)?.resPin]
          .filter(Boolean)
          .join(", ");

    const sumAssured = Number(pol.premium?.sumAssured) || 0;
    const premium =
      Number(pol.premium?.installmentPremium) ||
      Number(pol.premium?.totalYearlyPremium) ||
      0;
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

    const branchStr = pol.branch?.branchName || pol.branch?.branchCode || "Sbi";

    const loan = (pol as any).loans?.[0];
    const loanTaken = Number(loan?.loanAmount) || 0;
    const loanDateStr = loan?.loanDate
      ? new Date(loan.loanDate).toISOString().split("T")[0]
      : "";

    const commYear = commDateStr ? new Date(commDateStr).getFullYear() : new Date().getFullYear();
    const currentYear = new Date().getFullYear();
    const yearsElapsed = Math.max(1, currentYear - commYear);
    const completedPPT = Math.min(yearsElapsed, Number(ppt) || yearsElapsed);

    let modeMultiplier = 1;
    if (modeShort === "H") modeMultiplier = 2;
    if (modeShort === "Q") modeMultiplier = 4;
    if (modeShort === "M") modeMultiplier = 12;

    const totalPaid = completedPPT * premium * (modeShort === "Y" ? 1 : modeMultiplier);
    const paidUpVal = ppt > 0 ? Math.round((sumAssured * completedPPT) / Number(ppt)) : sumAssured;
    const riskCoverage = sumAssured;
    const statusStr = pol.status?.statusName || "Inforce";

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
      premium: premium,
      dab: 0,
      depositAmount: 0,
      branch: branchStr,
      fupDate: fupDateStr,
      loanTaken: loanTaken,
      loanDate: loanDateStr,
      fuliDate: "",
      address: addressStr,
      paymentType: modeName.includes("NACH") ? "NACH" : "Ordinary",
      remarks: pol.remarks || "",

      totalPremiumsPaid: totalPaid,
      policyStatus: statusStr,
      vestedBonusSV: 0,
      paidUpValueSV: 0,
      totalSV: 0,
      vestedBonusLoan: 0,
      paidUpValueLoan: 0,
      totalLoan: 0,
      svFactor: "0.00",
      specialSurrenderValue: 0,
      guaranteedSurrenderValue: 0,
      lateFeeInterest: "0.00",
      discountedValue: 0,
      riskCover: riskCoverage,
      loanAvailable: Math.round(paidUpVal * 0.8),
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
              Policy Status Report
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
              title="Generate Report"
            >
              <FileText size={19} />
            </button>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Main Grid: Left Policy Details & Right Calculation */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT SIDE: Policy Details & Calculation Options */}
          <div className="lg:col-span-7 space-y-6">
            {/* Policy Details Card */}
            <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#B8873A] via-[#B8873A]/40 to-transparent" />
              <div className="flex items-center gap-2 mb-4">
                <h2 className="font-serif text-sm font-bold uppercase tracking-wider text-slate-900">
                  Policy Details
                </h2>
              </div>

              <div className="space-y-4 pt-2">
                {/* Policy No Searchable Dropdown */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Policy No. (with Client Name)
                  </label>
                  <div className="relative">
                    <span className="absolute -top-2 left-3 bg-white px-1 text-[10px] text-[#B8873A] font-bold uppercase tracking-wider">
                      Policy No.
                    </span>
                    <select
                      value={formData.policyId}
                      onChange={(e) => handleSelectPolicy(e.target.value)}
                      className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-xs text-slate-900 font-semibold bg-white outline-none focus:border-[#B8873A] focus:ring-2 focus:ring-[#B8873A]/20 cursor-pointer appearance-none pr-10"
                    >
                      <option value="">-- Select Policy No. with Name --</option>
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
                      placeholder="Client Name"
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

                {/* Sum, Premium, DAB */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="relative">
                    <span className="absolute -top-2 left-3 bg-white px-1 text-[10px] text-[#B8873A] font-bold uppercase tracking-wider">
                      Sum
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
                      DAB
                    </span>
                    <input
                      type="number"
                      value={formData.dab}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, dab: Number(e.target.value) }))
                      }
                      className="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 font-semibold font-mono bg-white focus:outline-none focus:border-[#B8873A]"
                    />
                  </div>
                </div>

                {/* Deposit Amount, Branch, FUP Date */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="relative">
                    <span className="absolute -top-2 left-3 bg-white px-1 text-[10px] text-[#B8873A] font-bold uppercase tracking-wider">
                      Deposit Amount
                    </span>
                    <input
                      type="number"
                      value={formData.depositAmount}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          depositAmount: Number(e.target.value),
                        }))
                      }
                      className="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 font-medium font-mono bg-white focus:outline-none focus:border-[#B8873A]"
                    />
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Branch</span>
                    <input
                      type="text"
                      value={formData.branch}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, branch: e.target.value }))
                      }
                      className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 font-medium bg-white focus:outline-none focus:border-[#B8873A]"
                      placeholder="Branch"
                    />
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">FUP Date</span>
                    <input
                      type="date"
                      value={formData.fupDate}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, fupDate: e.target.value }))
                      }
                      className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 font-medium bg-white focus:outline-none focus:border-[#B8873A]"
                    />
                  </div>
                </div>

                {/* Loan Taken, Loan Date, FULI Date */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Loan Taken</span>
                    <input
                      type="number"
                      value={formData.loanTaken}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          loanTaken: Number(e.target.value),
                        }))
                      }
                      className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 font-medium font-mono bg-white focus:outline-none focus:border-[#B8873A]"
                    />
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Loan Date</span>
                    <input
                      type="date"
                      value={formData.loanDate}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, loanDate: e.target.value }))
                      }
                      className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 font-medium bg-white focus:outline-none focus:border-[#B8873A]"
                    />
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">FULI Date</span>
                    <input
                      type="date"
                      value={formData.fuliDate}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, fuliDate: e.target.value }))
                      }
                      className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 font-medium bg-white focus:outline-none focus:border-[#B8873A]"
                    />
                  </div>
                </div>

                {/* Address */}
                <div className="space-y-1">
                  <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Address</span>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, address: e.target.value }))
                    }
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 font-medium bg-white focus:outline-none focus:border-[#B8873A]"
                    placeholder="Residential Address"
                  />
                </div>

                {/* Payment Type & Remarks */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                  <div className="sm:col-span-4 space-y-1">
                    <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Payment Type</span>
                    <input
                      type="text"
                      value={formData.paymentType}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, paymentType: e.target.value }))
                      }
                      className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 font-medium bg-white focus:outline-none focus:border-[#B8873A]"
                      placeholder="Ordinary / NACH"
                    />
                  </div>

                  <div className="sm:col-span-8 space-y-1">
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
                </div>
              </div>
            </div>

            {/* Calculation Options */}
            <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#B8873A] via-[#B8873A]/40 to-transparent" />
              <div className="flex items-center gap-2 mb-4">
                <h2 className="font-serif text-sm font-bold uppercase tracking-wider text-slate-900">
                  Calculation Options
                </h2>
              </div>

              <div className="flex flex-wrap gap-8 pt-2">
                <label className="flex items-center gap-3 cursor-pointer select-none bg-slate-50 hover:bg-[#B8873A]/5 p-3 rounded-xl border border-slate-200 transition">
                  <input
                    type="checkbox"
                    checked={formData.includeLoyaltyAddition}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        includeLoyaltyAddition: e.target.checked,
                      }))
                    }
                    className="w-4 h-4 rounded border-slate-300 text-[#B8873A] focus:ring-[#B8873A] cursor-pointer"
                  />
                  <span className="text-xs text-slate-800 font-semibold">
                    Include Loyalty Addition
                  </span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer select-none bg-slate-50 hover:bg-[#B8873A]/5 p-3 rounded-xl border border-slate-200 transition">
                  <input
                    type="checkbox"
                    checked={formData.includeFab}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        includeFab: e.target.checked,
                      }))
                    }
                    className="w-4 h-4 rounded border-slate-300 text-[#B8873A] focus:ring-[#B8873A] cursor-pointer"
                  />
                  <span className="text-xs text-slate-800 font-semibold">
                    Include FAB
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* RIGHT SIDE: Calculation Box */}
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
                    <span className="col-span-6 text-slate-700 font-semibold">Total Premiums Paid :</span>
                    <div className="col-span-6">
                      <input
                        type="number"
                        value={formData.totalPremiumsPaid}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            totalPremiumsPaid: Number(e.target.value),
                          }))
                        }
                        className="w-full border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-right font-mono bg-slate-50 focus:bg-white focus:border-[#B8873A] outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-12 items-center gap-2">
                    <span className="col-span-6 text-slate-700 font-semibold">Policy Status :</span>
                    <div className="col-span-6">
                      <input
                        type="text"
                        value={formData.policyStatus}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, policyStatus: e.target.value }))
                        }
                        className="w-full border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-semibold bg-slate-50 focus:bg-white focus:border-[#B8873A] outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-12 items-center gap-2">
                    <span className="col-span-6 text-slate-700">Vested Bonus (for S.V.) :</span>
                    <div className="col-span-6">
                      <input
                        type="number"
                        value={formData.vestedBonusSV}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            vestedBonusSV: Number(e.target.value),
                          }))
                        }
                        className="w-full border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-right font-mono bg-slate-50 focus:bg-white focus:border-[#B8873A] outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-12 items-center gap-2">
                    <span className="col-span-6 text-slate-700">Paid Up Value :</span>
                    <div className="col-span-6">
                      <input
                        type="number"
                        value={formData.paidUpValueSV}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            paidUpValueSV: Number(e.target.value),
                          }))
                        }
                        className="w-full border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-right font-mono bg-slate-50 focus:bg-white focus:border-[#B8873A] outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-12 items-center gap-2">
                    <span className="col-span-6 text-slate-900 font-bold">Total :</span>
                    <div className="col-span-6">
                      <input
                        type="number"
                        value={formData.totalSV}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, totalSV: Number(e.target.value) }))
                        }
                        className="w-full border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-right font-mono font-bold bg-[#B8873A]/10 text-slate-900 focus:bg-white focus:border-[#B8873A] outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-12 items-center gap-2">
                    <span className="col-span-6 text-slate-700">Vested Bonus (for Loan) :</span>
                    <div className="col-span-6">
                      <input
                        type="number"
                        value={formData.vestedBonusLoan}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            vestedBonusLoan: Number(e.target.value),
                          }))
                        }
                        className="w-full border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-right font-mono bg-slate-50 focus:bg-white focus:border-[#B8873A] outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-12 items-center gap-2">
                    <span className="col-span-6 text-slate-700">Paid Up Value :</span>
                    <div className="col-span-6">
                      <input
                        type="number"
                        value={formData.paidUpValueLoan}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            paidUpValueLoan: Number(e.target.value),
                          }))
                        }
                        className="w-full border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-right font-mono bg-slate-50 focus:bg-white focus:border-[#B8873A] outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-12 items-center gap-2">
                    <span className="col-span-6 text-slate-900 font-bold">Total :</span>
                    <div className="col-span-6">
                      <input
                        type="number"
                        value={formData.totalLoan}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            totalLoan: Number(e.target.value),
                          }))
                        }
                        className="w-full border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-right font-mono font-bold bg-[#B8873A]/10 text-slate-900 focus:bg-white focus:border-[#B8873A] outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-12 items-center gap-2">
                    <span className="col-span-6 text-slate-700">S.V. Factor :</span>
                    <div className="col-span-6">
                      <input
                        type="text"
                        value={formData.svFactor}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, svFactor: e.target.value }))
                        }
                        className="w-full border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-right font-mono bg-slate-50 focus:bg-white focus:border-[#B8873A] outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-12 items-center gap-2">
                    <span className="col-span-6 text-slate-700">Special Sur. Value :</span>
                    <div className="col-span-6">
                      <input
                        type="number"
                        value={formData.specialSurrenderValue}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            specialSurrenderValue: Number(e.target.value),
                          }))
                        }
                        className="w-full border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-right font-mono bg-slate-50 focus:bg-white focus:border-[#B8873A] outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-12 items-center gap-2">
                    <span className="col-span-6 text-slate-700">Gaur. Surr. Value :</span>
                    <div className="col-span-6">
                      <input
                        type="number"
                        value={formData.guaranteedSurrenderValue}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            guaranteedSurrenderValue: Number(e.target.value),
                          }))
                        }
                        className="w-full border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-right font-mono bg-slate-50 focus:bg-white focus:border-[#B8873A] outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-12 items-center gap-2">
                    <span className="col-span-6 text-slate-700">Late Fee Interest :</span>
                    <div className="col-span-6">
                      <input
                        type="text"
                        value={formData.lateFeeInterest}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            lateFeeInterest: e.target.value,
                          }))
                        }
                        className="w-full border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-right font-mono bg-slate-50 focus:bg-white focus:border-[#B8873A] outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-12 items-center gap-2">
                    <span className="col-span-6 text-slate-700">Discounted Value :</span>
                    <div className="col-span-6">
                      <input
                        type="number"
                        value={formData.discountedValue}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            discountedValue: Number(e.target.value),
                          }))
                        }
                        className="w-full border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-right font-mono bg-slate-50 focus:bg-white focus:border-[#B8873A] outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-12 items-center gap-2">
                    <span className="col-span-6 text-slate-700">Risk Cover :</span>
                    <div className="col-span-6">
                      <input
                        type="number"
                        value={formData.riskCover}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            riskCover: Number(e.target.value),
                          }))
                        }
                        className="w-full border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-right font-mono bg-slate-50 focus:bg-white focus:border-[#B8873A] outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-12 items-center gap-2">
                    <span className="col-span-6 text-slate-700 font-semibold">Loan Available :</span>
                    <div className="col-span-6">
                      <input
                        type="number"
                        value={formData.loanAvailable}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            loanAvailable: Number(e.target.value),
                          }))
                        }
                        className="w-full border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-right font-mono font-bold text-[#B8873A] bg-slate-50 focus:bg-white focus:border-[#B8873A] outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Submission Action */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            className="px-8 py-3 bg-gradient-to-r from-[#B8873A] to-[#D9AE63] text-[#0B1220] font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg hover:brightness-105 transition flex items-center gap-2 cursor-pointer"
          >
            <span>Generate Policy Status Report</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </form>
    </div>
  );
}
