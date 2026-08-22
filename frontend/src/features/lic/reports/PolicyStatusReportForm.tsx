"use client";

import { useState, useEffect, useMemo } from "react";
import {
  RotateCcw,
  FileDown,
  ChevronLeft,
  Calendar,
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

    // DOB
    const dobStr = cm?.dob
      ? new Date(cm.dob).toISOString().split("T")[0]
      : "";

    // Comm Date
    const commDateStr = pol.commencementDate
      ? new Date(pol.commencementDate).toISOString().split("T")[0]
      : "";

    // Next due / FUP Date
    const fupDateStr = pol.nextPremiumDueDate
      ? new Date(pol.nextPremiumDueDate).toISOString().split("T")[0]
      : "";

    // Address
    const resAddr = (cm as any)?.addresses?.find((a: any) => a.addressType === "Residence") || (cm as any)?.addresses?.[0];
    const addressStr = resAddr
      ? [resAddr.addressLine1, resAddr.addressLine2, resAddr.city, resAddr.state, resAddr.pin]
          .filter(Boolean)
          .join(", ")
      : [(c as any)?.resAddressLine1, (c as any)?.resCity, (c as any)?.resState, (c as any)?.resPin]
          .filter(Boolean)
          .join(", ");

    // Numerical values
    const sumAssured = Number(pol.premium?.sumAssured) || 0;
    const premium =
      Number(pol.premium?.installmentPremium) ||
      Number(pol.premium?.totalYearlyPremium) ||
      0;
    const term = pol.policyTerm || 0;
    const ppt = pol.premiumPayingTerm || term || 0;

    // Mode
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

    // Branch
    const branchStr = pol.branch?.branchName || pol.branch?.branchCode || "Sbi";

    // Loan details if any
    const loan = (pol as any).loans?.[0];
    const loanTaken = Number(loan?.loanAmount) || 0;
    const loanDateStr = loan?.loanDate
      ? new Date(loan.loanDate).toISOString().split("T")[0]
      : "";

    // Calculation estimates
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
      {/* Top Header matching Screenshot */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="p-2 border border-slate-200 rounded-xl hover:bg-slate-100 text-slate-700 transition"
            title="Back to Reports"
          >
            <ChevronLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-[#02569B] tracking-tight">
              Policy Status Report
            </h1>
          </div>
        </div>

        {/* Top Right Actions */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            type="button"
            onClick={handleReset}
            className="p-2 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition shadow-xs"
            title="Reset Form"
          >
            <RotateCcw size={19} />
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="p-2 rounded-lg bg-[#02569B] text-white hover:bg-[#014175] transition shadow-xs"
            title="Generate & View PDF Report"
          >
            <FileDown size={19} />
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Main Grid: Left Policy Details & Right Calculation */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT SIDE: Policy Details & Calculation Options */}
          <div className="lg:col-span-7 space-y-6">
            {/* Policy Details Card */}
            <div className="rounded-2xl border border-blue-100 bg-white shadow-xs overflow-hidden">
              <div className="bg-gradient-to-r from-blue-50/90 via-sky-50/50 to-white px-6 py-3 border-b border-blue-100">
                <h2 className="text-sm font-bold text-[#02569B] tracking-wide">
                  Policy Details
                </h2>
              </div>

              <div className="p-6 space-y-4">
                {/* Policy No Searchable Dropdown */}
                <div>
                  <div className="relative border border-slate-300 rounded-lg px-3.5 pt-2 pb-1.5 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 bg-white shadow-xs">
                    <span className="absolute -top-2.5 left-3 bg-white px-1 text-[10px] font-semibold text-slate-500">
                      Policy No. (with Client Name)
                    </span>
                    <select
                      value={formData.policyId}
                      onChange={(e) => handleSelectPolicy(e.target.value)}
                      className="w-full text-xs text-slate-800 font-semibold bg-transparent outline-none cursor-pointer appearance-none pr-8"
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
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                    />
                  </div>
                </div>

                {/* Name, DOB, Comm Date */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                  <div className="sm:col-span-6">
                    <div className="relative border border-slate-300 rounded-lg px-3 py-1.5 focus-within:border-blue-500 bg-white shadow-xs">
                      <span className="text-[10px] text-slate-400 block">Name</span>
                      <input
                        type="text"
                        value={formData.clientName}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, clientName: e.target.value }))
                        }
                        className="w-full text-xs text-slate-800 font-medium bg-transparent outline-none"
                        placeholder="Client Name"
                      />
                    </div>
                  </div>

                  <div className="sm:col-span-3">
                    <div className="relative border border-slate-300 rounded-lg px-3 py-1.5 focus-within:border-blue-500 bg-white shadow-xs flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-slate-400 block">Date of Birth</span>
                        <input
                          type="date"
                          value={formData.dob}
                          onChange={(e) =>
                            setFormData((prev) => ({ ...prev, dob: e.target.value }))
                          }
                          className="w-full text-xs text-slate-800 font-medium bg-transparent outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="sm:col-span-3">
                    <div className="relative border border-slate-300 rounded-lg px-3 py-1.5 focus-within:border-blue-500 bg-white shadow-xs flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-slate-400 block">Comm. Date</span>
                        <input
                          type="date"
                          value={formData.commencementDate}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              commencementDate: e.target.value,
                            }))
                          }
                          className="w-full text-xs text-slate-800 font-medium bg-transparent outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Plan, Mode, Term, PPT */}
                <div className="grid grid-cols-2 sm:grid-cols-12 gap-3">
                  <div className="sm:col-span-5">
                    <div className="relative border border-slate-300 rounded-lg px-3 py-1.5 focus-within:border-blue-500 bg-white shadow-xs">
                      <span className="text-[10px] text-slate-400 block">Plan</span>
                      <input
                        type="text"
                        value={formData.plan}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, plan: e.target.value }))
                        }
                        className="w-full text-xs text-slate-800 font-medium bg-transparent outline-none"
                        placeholder="Plan"
                      />
                    </div>
                  </div>

                  <div className="sm:col-span-3">
                    <div className="relative border border-slate-300 rounded-lg px-3 py-1.5 focus-within:border-blue-500 bg-white shadow-xs">
                      <span className="text-[10px] text-slate-400 block">Mode</span>
                      <select
                        value={formData.mode}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, mode: e.target.value }))
                        }
                        className="w-full text-xs text-slate-800 font-medium bg-transparent outline-none"
                      >
                        <option value="Y">Yearly (Y)</option>
                        <option value="H">Half-Yearly (H)</option>
                        <option value="Q">Quarterly (Q)</option>
                        <option value="M">Monthly (M)</option>
                        <option value="S">Single (S)</option>
                        <option value="NACH">NACH</option>
                      </select>
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <div className="relative border border-slate-300 rounded-lg px-3 py-1.5 focus-within:border-blue-500 bg-white shadow-xs">
                      <span className="text-[10px] text-slate-400 block">Term</span>
                      <input
                        type="number"
                        value={formData.term}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, term: Number(e.target.value) }))
                        }
                        className="w-full text-xs text-slate-800 font-medium bg-transparent outline-none font-mono"
                      />
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <div className="relative border border-slate-300 rounded-lg px-3 py-1.5 focus-within:border-blue-500 bg-white shadow-xs">
                      <span className="text-[10px] text-slate-400 block">PPT</span>
                      <input
                        type="number"
                        value={formData.ppt}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, ppt: Number(e.target.value) }))
                        }
                        className="w-full text-xs text-slate-800 font-medium bg-transparent outline-none font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* Sum, Premium, DAB */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="relative border border-slate-300 rounded-lg px-3.5 pt-2 pb-1.5 focus-within:border-blue-500 bg-white shadow-xs">
                    <span className="absolute -top-2.5 left-3 bg-white px-1 text-[10px] font-semibold text-slate-500">
                      Sum
                    </span>
                    <input
                      type="number"
                      value={formData.sumAssured}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, sumAssured: Number(e.target.value) }))
                      }
                      className="w-full text-xs text-slate-800 font-semibold bg-transparent outline-none font-mono"
                    />
                  </div>

                  <div className="relative border border-slate-300 rounded-lg px-3.5 pt-2 pb-1.5 focus-within:border-blue-500 bg-white shadow-xs">
                    <span className="absolute -top-2.5 left-3 bg-white px-1 text-[10px] font-semibold text-slate-500">
                      Premium
                    </span>
                    <input
                      type="number"
                      value={formData.premium}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, premium: Number(e.target.value) }))
                      }
                      className="w-full text-xs text-slate-800 font-semibold bg-transparent outline-none font-mono"
                    />
                  </div>

                  <div className="relative border border-slate-300 rounded-lg px-3.5 pt-2 pb-1.5 focus-within:border-blue-500 bg-white shadow-xs">
                    <span className="absolute -top-2.5 left-3 bg-white px-1 text-[10px] font-semibold text-slate-500">
                      DAB
                    </span>
                    <input
                      type="number"
                      value={formData.dab}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, dab: Number(e.target.value) }))
                      }
                      className="w-full text-xs text-slate-800 font-semibold bg-transparent outline-none font-mono"
                    />
                  </div>
                </div>

                {/* Deposit Amount, Branch, FUP Date */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="relative border border-slate-300 rounded-lg px-3.5 pt-2 pb-1.5 focus-within:border-blue-500 bg-white shadow-xs">
                    <span className="absolute -top-2.5 left-3 bg-white px-1 text-[10px] font-semibold text-slate-500">
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
                      className="w-full text-xs text-slate-800 font-medium bg-transparent outline-none font-mono"
                    />
                  </div>

                  <div className="relative border border-slate-300 rounded-lg px-3 py-1.5 focus-within:border-blue-500 bg-white shadow-xs">
                    <span className="text-[10px] text-slate-400 block">Branch</span>
                    <input
                      type="text"
                      value={formData.branch}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, branch: e.target.value }))
                      }
                      className="w-full text-xs text-slate-800 font-medium bg-transparent outline-none"
                      placeholder="Branch"
                    />
                  </div>

                  <div className="relative border border-slate-300 rounded-lg px-3 py-1.5 focus-within:border-blue-500 bg-white shadow-xs">
                    <span className="text-[10px] text-slate-400 block">FUP Date</span>
                    <input
                      type="date"
                      value={formData.fupDate}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, fupDate: e.target.value }))
                      }
                      className="w-full text-xs text-slate-800 font-medium bg-transparent outline-none"
                    />
                  </div>
                </div>

                {/* Loan Taken, Loan Date, FULI Date */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="relative border border-slate-300 rounded-lg px-3 py-1.5 focus-within:border-blue-500 bg-white shadow-xs">
                    <span className="text-[10px] text-slate-400 block">Loan Taken</span>
                    <input
                      type="number"
                      value={formData.loanTaken}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          loanTaken: Number(e.target.value),
                        }))
                      }
                      className="w-full text-xs text-slate-800 font-medium bg-transparent outline-none font-mono"
                    />
                  </div>

                  <div className="relative border border-slate-300 rounded-lg px-3 py-1.5 focus-within:border-blue-500 bg-white shadow-xs">
                    <span className="text-[10px] text-slate-400 block">Loan Date</span>
                    <input
                      type="date"
                      value={formData.loanDate}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, loanDate: e.target.value }))
                      }
                      className="w-full text-xs text-slate-800 font-medium bg-transparent outline-none"
                    />
                  </div>

                  <div className="relative border border-slate-300 rounded-lg px-3 py-1.5 focus-within:border-blue-500 bg-white shadow-xs">
                    <span className="text-[10px] text-slate-400 block">FULI Date</span>
                    <input
                      type="date"
                      value={formData.fuliDate}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, fuliDate: e.target.value }))
                      }
                      className="w-full text-xs text-slate-800 font-medium bg-transparent outline-none"
                    />
                  </div>
                </div>

                {/* Address */}
                <div className="relative border border-slate-300 rounded-lg px-3 py-1.5 focus-within:border-blue-500 bg-white shadow-xs">
                  <span className="text-[10px] text-slate-400 block">Address</span>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, address: e.target.value }))
                    }
                    className="w-full text-xs text-slate-800 font-medium bg-transparent outline-none"
                    placeholder="Residential Address"
                  />
                </div>

                {/* Payment Type & Remarks */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                  <div className="sm:col-span-4">
                    <div className="relative border border-slate-300 rounded-lg px-3 py-1.5 focus-within:border-blue-500 bg-white shadow-xs">
                      <span className="text-[10px] text-slate-400 block">Payment Type</span>
                      <input
                        type="text"
                        value={formData.paymentType}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, paymentType: e.target.value }))
                        }
                        className="w-full text-xs text-slate-800 font-medium bg-transparent outline-none"
                        placeholder="Ordinary / NACH"
                      />
                    </div>
                  </div>

                  <div className="sm:col-span-8">
                    <div className="relative border border-slate-300 rounded-lg px-3 py-1.5 focus-within:border-blue-500 bg-white shadow-xs">
                      <span className="text-[10px] text-slate-400 block">Remarks</span>
                      <input
                        type="text"
                        value={formData.remarks}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, remarks: e.target.value }))
                        }
                        className="w-full text-xs text-slate-800 font-medium bg-transparent outline-none"
                        placeholder="Remarks"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Calculation Options */}
            <div className="rounded-2xl border border-blue-100 bg-white shadow-xs overflow-hidden">
              <div className="bg-gradient-to-r from-blue-50/90 via-sky-50/50 to-white px-6 py-3 border-b border-blue-100">
                <h2 className="text-sm font-bold text-[#02569B] tracking-wide">
                  Calculation Options
                </h2>
              </div>

              <div className="p-6 flex flex-wrap gap-8">
                <label className="flex items-center gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={formData.includeLoyaltyAddition}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        includeLoyaltyAddition: e.target.checked,
                      }))
                    }
                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-xs text-slate-700 font-medium">
                    Include Loyalty Addition
                  </span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={formData.includeFab}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        includeFab: e.target.checked,
                      }))
                    }
                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-xs text-slate-700 font-medium">
                    Include FAB
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* RIGHT SIDE: Calculation Box */}
          <div className="lg:col-span-5">
            <div className="rounded-2xl border border-blue-100 bg-white shadow-xs overflow-hidden h-full flex flex-col">
              <div className="bg-gradient-to-r from-blue-50/90 via-sky-50/50 to-white px-6 py-3 border-b border-blue-100">
                <h2 className="text-sm font-bold text-[#02569B] tracking-wide">
                  Calculation
                </h2>
              </div>

              <div className="p-6 space-y-2.5 flex-1 text-xs">
                {/* Total Premiums Paid */}
                <div className="grid grid-cols-12 items-center gap-2">
                  <span className="col-span-6 text-slate-700 font-medium">Total Premiums Paid :</span>
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
                      className="w-full border border-slate-300 rounded-lg px-2.5 py-1 text-xs text-right font-mono bg-slate-50 focus:bg-white focus:border-blue-500 outline-none"
                    />
                  </div>
                </div>

                {/* Policy Status */}
                <div className="grid grid-cols-12 items-center gap-2">
                  <span className="col-span-6 text-slate-700 font-medium">Policy Status :</span>
                  <div className="col-span-6">
                    <input
                      type="text"
                      value={formData.policyStatus}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, policyStatus: e.target.value }))
                      }
                      className="w-full border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-semibold bg-slate-50 focus:bg-white focus:border-blue-500 outline-none"
                    />
                  </div>
                </div>

                {/* Vested Bonus (for S.V.) */}
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
                      className="w-full border border-slate-300 rounded-lg px-2.5 py-1 text-xs text-right font-mono bg-slate-50 focus:bg-white focus:border-blue-500 outline-none"
                    />
                  </div>
                </div>

                {/* Paid Up Value */}
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
                      className="w-full border border-slate-300 rounded-lg px-2.5 py-1 text-xs text-right font-mono bg-slate-50 focus:bg-white focus:border-blue-500 outline-none"
                    />
                  </div>
                </div>

                {/* Total */}
                <div className="grid grid-cols-12 items-center gap-2">
                  <span className="col-span-6 text-slate-900 font-bold">Total :</span>
                  <div className="col-span-6">
                    <input
                      type="number"
                      value={formData.totalSV}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, totalSV: Number(e.target.value) }))
                      }
                      className="w-full border border-slate-300 rounded-lg px-2.5 py-1 text-xs text-right font-mono font-bold bg-slate-50 focus:bg-white focus:border-blue-500 outline-none"
                    />
                  </div>
                </div>

                {/* Vested Bonus (for Loan) */}
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
                      className="w-full border border-slate-300 rounded-lg px-2.5 py-1 text-xs text-right font-mono bg-slate-50 focus:bg-white focus:border-blue-500 outline-none"
                    />
                  </div>
                </div>

                {/* Paid Up Value */}
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
                      className="w-full border border-slate-300 rounded-lg px-2.5 py-1 text-xs text-right font-mono bg-slate-50 focus:bg-white focus:border-blue-500 outline-none"
                    />
                  </div>
                </div>

                {/* Total */}
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
                      className="w-full border border-slate-300 rounded-lg px-2.5 py-1 text-xs text-right font-mono font-bold bg-slate-50 focus:bg-white focus:border-blue-500 outline-none"
                    />
                  </div>
                </div>

                {/* S.V. Factor */}
                <div className="grid grid-cols-12 items-center gap-2">
                  <span className="col-span-6 text-slate-700">S.V. Factor :</span>
                  <div className="col-span-6">
                    <input
                      type="text"
                      value={formData.svFactor}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, svFactor: e.target.value }))
                      }
                      className="w-full border border-slate-300 rounded-lg px-2.5 py-1 text-xs text-right font-mono bg-slate-50 focus:bg-white focus:border-blue-500 outline-none"
                    />
                  </div>
                </div>

                {/* Special Sur. Value */}
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
                      className="w-full border border-slate-300 rounded-lg px-2.5 py-1 text-xs text-right font-mono bg-slate-50 focus:bg-white focus:border-blue-500 outline-none"
                    />
                  </div>
                </div>

                {/* Gaur. Surr. Value */}
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
                      className="w-full border border-slate-300 rounded-lg px-2.5 py-1 text-xs text-right font-mono bg-slate-50 focus:bg-white focus:border-blue-500 outline-none"
                    />
                  </div>
                </div>

                {/* Late Fee Interest */}
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
                      className="w-full border border-slate-300 rounded-lg px-2.5 py-1 text-xs text-right font-mono bg-slate-50 focus:bg-white focus:border-blue-500 outline-none"
                    />
                  </div>
                </div>

                {/* Discounted Value */}
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
                      className="w-full border border-slate-300 rounded-lg px-2.5 py-1 text-xs text-right font-mono bg-slate-50 focus:bg-white focus:border-blue-500 outline-none"
                    />
                  </div>
                </div>

                {/* Risk Cover */}
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
                      className="w-full border border-slate-300 rounded-lg px-2.5 py-1 text-xs text-right font-mono bg-slate-50 focus:bg-white focus:border-blue-500 outline-none"
                    />
                  </div>
                </div>

                {/* Loan Available */}
                <div className="grid grid-cols-12 items-center gap-2">
                  <span className="col-span-6 text-slate-700">Loan Available :</span>
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
                      className="w-full border border-slate-300 rounded-lg px-2.5 py-1 text-xs text-right font-mono bg-slate-50 focus:bg-white focus:border-blue-500 outline-none"
                    />
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
            className="px-6 py-2.5 bg-gradient-to-r from-[#02569B] to-[#014175] text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-md hover:brightness-110 transition flex items-center gap-2 cursor-pointer"
          >
            <span>Generate Policy Status Report</span>
            <ArrowRight size={15} />
          </button>
        </div>
      </form>
    </div>
  );
}
