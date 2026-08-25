"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import {
  ChevronLeft,
  RotateCcw,
  Calculator,
  ChevronDown,
  Search,
  Download,
  AlertCircle,
} from "lucide-react";
import html2canvas from "html2canvas-pro";
import jsPDF from "jspdf";
import toast from "react-hot-toast";

interface RevivalPremiumCalculatorProps {
  onBack: () => void;
  policies: any[];
  customers: any[];
}

function fmtDate(d: string | Date | null | undefined) {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  if (isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function toInputDate(d: string | Date | null | undefined) {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  if (isNaN(date.getTime())) return "";
  return date.toISOString().split("T")[0];
}

function getMemberName(policy: any): string {
  if (policy.lifeAssured) {
    const la = policy.lifeAssured;
    if (typeof la === "string") return la;
    const sal = la.salutation ? `${la.salutation} ` : "";
    const full = [la.firstName, la.middleName, la.lastName].filter(Boolean).join(" ");
    if (full.trim()) return `${sal}${full.trim()}`;
    if (la.name) return la.name;
  }
  if (policy.CustomerMaster) {
    const cm = policy.CustomerMaster;
    const sal = cm.salutation ? `${cm.salutation} ` : "";
    const full = [cm.firstName, cm.middleName, cm.lastName].filter(Boolean).join(" ");
    if (full.trim()) return `${sal}${full.trim()}`;
    if (cm.name) return cm.name;
  }
  if (policy.lifeAssuredName) return policy.lifeAssuredName;
  if (policy.customer?.name) return policy.customer.name;
  return "Policy Holder";
}

function getMemberDOB(policy: any): string {
  return (
    policy.CustomerMaster?.dob ||
    policy.lifeAssured?.dob ||
    policy.dob ||
    ""
  );
}

// LIC Revival: interest rate is 9% p.a. compounded half-yearly
const REVIVAL_INTEREST_RATE = 0.09;
// GST on interest: 18%
const GST_RATE = 0.18;

function calcRevivalData(policy: any, calcDate: Date) {
  const fupDate = policy.fupDate || policy.nextPremiumDueDate;
  if (!fupDate) return null;

  const fup = new Date(fupDate);
  if (isNaN(fup.getTime())) return null;

  // Premium details
  const installmentPremium =
    Number(policy.premium?.installmentPremium || policy.premium?.totalInstallmentPremium || 0);
  const yearlyPremium =
    Number(policy.premium?.basicYearlyPremium || policy.premium?.totalYearlyPremium || installmentPremium);
  const sumAssured = Number(policy.premium?.sumAssured || 0);
  const gstAmount = Number(policy.premium?.gst || yearlyPremium * 0.045); // 4.5% approx
  const riderPremium = (policy.policyRiders || []).reduce(
    (s: number, r: any) => s + Number(r.premium || 0),
    0
  );

  // Mode factor
  const modeName = (policy.premiumMode?.modeName || "Yearly").toLowerCase();
  let modeFreq = 1; // times per year
  if (modeName.includes("half") || modeName.includes("semi")) modeFreq = 2;
  else if (modeName.includes("quarter")) modeFreq = 4;
  else if (modeName.includes("month")) modeFreq = 12;

  // Count pending premiums: from FUP to calcDate
  const daysDiff = Math.max(
    0,
    Math.floor((calcDate.getTime() - fup.getTime()) / (1000 * 60 * 60 * 24))
  );
  const monthsDiff = (calcDate.getFullYear() - fup.getFullYear()) * 12 + (calcDate.getMonth() - fup.getMonth());
  const premiumsPending = Math.max(0, Math.ceil((monthsDiff / 12) * modeFreq));
  const premiumAmountPending = premiumsPending * installmentPremium;

  // Interest calculation (simple interest on each premium from due date)
  // Rate: 9% p.a. → daily rate
  const dailyRate = REVIVAL_INTEREST_RATE / 365;
  const interestPayable = Math.round(premiumAmountPending * dailyRate * daysDiff);

  // GST on interest payable
  const gstOnInterest = Math.round(interestPayable * GST_RATE);

  // Total payable for revival
  const totalPayable = premiumAmountPending + interestPayable + gstOnInterest;

  // Revival factor (approx) = totalPayable / premiumAmountPending
  const revivalFactor = premiumAmountPending > 0
    ? parseFloat((totalPayable / premiumAmountPending).toFixed(4))
    : 0;

  // Validity: 6 months from calculation date
  const validityDate = new Date(calcDate);
  validityDate.setMonth(validityDate.getMonth() + 6);

  // Loan available (usually 90% of surrender value, approx 30% SA after 3 yrs)
  const policyYears = Math.floor((calcDate.getTime() - new Date(policy.commencementDate).getTime()) / (1000 * 60 * 60 * 24 * 365));
  const loanAvailable = policyYears >= 3 ? Math.round(sumAssured * 0.30) : 0;

  // Survival benefit due
  const sbDue = Number(policy.survivalBenefit || 0);

  // Documents required
  const docs: string[] = ["Signed Revival Form (3756/3757)"];
  if (premiumsPending > 3) docs.push("Health Declaration Form");
  if (premiumsPending > 5) docs.push("Medical Certificate from Doctor");
  if (daysDiff > 730) docs.push("Full Medical Examination Report");

  return {
    premiumsPending,
    premiumAmountPending,
    rateOfInterest: REVIVAL_INTEREST_RATE * 100,
    revivalFactor,
    interestPayable,
    gstOnInterest,
    totalPayable,
    validityDate,
    loanAvailable,
    sbDue,
    documentsRequired: docs.join("\n"),
  };
}

export default function RevivalPremiumCalculator({
  onBack,
  policies,
  customers,
}: RevivalPremiumCalculatorProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const reportRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  // Policy search/dropdown
  const [policySearch, setPolicySearch] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [selectedPolicy, setSelectedPolicy] = useState<any | null>(null);

  // Form fields (auto-filled + editable)
  const [name, setName] = useState("");
  const [dob, setDob] = useState("");
  const [commDate, setCommDate] = useState("");
  const [plan, setPlan] = useState("");
  const [mode, setMode] = useState("");
  const [term, setTerm] = useState("");
  const [ppt, setPpt] = useState("");
  const [extraClass, setExtraClass] = useState("");
  const [extraPremium, setExtraPremium] = useState("");
  const [sbOption, setSbOption] = useState("");
  const [fupDate, setFupDate] = useState("");
  const [sumAssured, setSumAssured] = useState("0");
  const [premium, setPremium] = useState("0");
  const [riderPremium, setRiderPremium] = useState("0");
  const [loanTaken, setLoanTaken] = useState("0");
  const [dateOfIntCalc, setDateOfIntCalc] = useState(toInputDate(new Date()));
  const [dateOfCalc, setDateOfCalc] = useState(toInputDate(new Date()));
  const [remarks, setRemarks] = useState("");

  // Calculation results
  const [calculated, setCalculated] = useState(false);
  const [calcResults, setCalcResults] = useState<any>(null);

  // Filtered dropdown policies
  const dropdownPolicies = useMemo(() => {
    const q = policySearch.toLowerCase();
    return policies
      .filter((p) => {
        const pno = (p.policyNumber || "").toLowerCase();
        const mname = getMemberName(p).toLowerCase();
        return pno.includes(q) || mname.includes(q);
      })
      .slice(0, 50);
  }, [policies, policySearch]);

  // Auto-fill when policy selected
  const handlePolicySelect = (p: any) => {
    setSelectedPolicy(p);
    setPolicySearch(p.policyNumber);
    setDropdownOpen(false);
    setCalculated(false);
    setCalcResults(null);

    setName(getMemberName(p));
    setDob(toInputDate(getMemberDOB(p)));
    setCommDate(toInputDate(p.commencementDate));
    setPlan(p.product?.productName || "");
    setMode(p.premiumMode?.modeName || "");
    setTerm(String(p.policyTerm || ""));
    setPpt(String(p.premiumPayingTerm || ""));
    setExtraClass(String(p.premium?.extraClass || ""));
    setExtraPremium(String(p.premium?.extraClass || ""));
    setSbOption(p.policyAttributes?.find((a: any) => a.attribute?.attributeCode === "SB_OPTION")?.value || "");
    setFupDate(toInputDate(p.fupDate || p.nextPremiumDueDate));
    setSumAssured(String(p.premium?.sumAssured || "0"));
    setPremium(String(p.premium?.installmentPremium || p.premium?.totalInstallmentPremium || "0"));
    const riders = (p.policyRiders || []).reduce((s: number, r: any) => s + Number(r.premium || 0), 0);
    setRiderPremium(String(riders));
    setLoanTaken(String(p.loanAmount || p.loanDetails?.amount || "0"));
  };

  const handleReset = () => {
    setSelectedPolicy(null);
    setPolicySearch("");
    setDropdownOpen(false);
    setCalculated(false);
    setCalcResults(null);
    setName(""); setDob(""); setCommDate(""); setPlan(""); setMode(""); setTerm(""); setPpt("");
    setExtraClass(""); setExtraPremium(""); setSbOption(""); setFupDate("");
    setSumAssured("0"); setPremium("0"); setRiderPremium("0"); setLoanTaken("0");
    setDateOfIntCalc(toInputDate(new Date())); setDateOfCalc(toInputDate(new Date()));
    setRemarks("");
  };

  const handleCalculate = () => {
    if (!selectedPolicy && !fupDate) {
      toast.error("Please select a policy or enter FUP Date.");
      return;
    }
    const calcDate = dateOfCalc ? new Date(dateOfCalc) : new Date();

    // Build a synthetic policy object from form fields
    const syntheticPolicy = {
      ...selectedPolicy,
      fupDate: fupDate || selectedPolicy?.fupDate || selectedPolicy?.nextPremiumDueDate,
      commencementDate: commDate || selectedPolicy?.commencementDate,
      premium: {
        sumAssured: Number(sumAssured),
        installmentPremium: Number(premium),
        basicYearlyPremium: Number(premium),
        gst: Number(premium) * 0.045,
      },
      premiumMode: { modeName: mode || "Yearly" },
      policyRiders: [],
    };

    const result = calcRevivalData(syntheticPolicy, calcDate);
    if (!result) {
      toast.error("Could not calculate. Please check the FUP Date and Policy details.");
      return;
    }
    setCalcResults(result);
    setCalculated(true);
    toast.success("Calculation complete!");
  };

  const handleDownloadPDF = async () => {
    if (!reportRef.current) return;
    setIsExporting(true);
    const toastId = toast.loading("Generating PDF report...");
    try {
      const canvas = await html2canvas(reportRef.current, {
        scale: 2, useCORS: true, allowTaint: true, backgroundColor: "#ffffff", logging: false,
      });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const imgWidth = 210;
      const pageHeight = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;
      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      pdf.save(`Revival_Quote_${selectedPolicy?.policyNumber || "Policy"}_${dateOfCalc}.pdf`);
      toast.success("PDF downloaded successfully!", { id: toastId });
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to generate PDF.", { id: toastId });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-[#0B1220] p-6 text-white border border-slate-800 shadow-xl">
        <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#B8873A] via-[#E8C77A] to-transparent" />
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-xl transition flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider"
            >
              <ChevronLeft size={18} />
              <span>Reports</span>
            </button>
            <div className="h-6 w-px bg-white/15" />
            <h1 className="font-serif text-xl font-bold text-[#E8C77A] tracking-wider uppercase">
              Revival Premium Calculator
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleReset} className="p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-xl transition" title="Reset">
              <RotateCcw size={20} />
            </button>
            {calculated && (
              <button
                onClick={handleDownloadPDF}
                disabled={isExporting}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#B8873A] to-[#D9AE63] text-[#0B1220] font-bold text-xs rounded-xl hover:brightness-105 transition disabled:opacity-50"
              >
                <Download size={16} />
                {isExporting ? "Exporting..." : "Download PDF"}
              </button>
            )}
          </div>
        </div>
      </div>

      <div ref={printRef}>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* LEFT: Policy Details Form */}
          <div className="lg:col-span-3 space-y-4">
            {/* Revival Type */}
            <div className="relative rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="absolute inset-x-0 top-0 h-[3px] rounded-t-2xl bg-gradient-to-r from-[#B8873A] via-[#B8873A]/40 to-transparent" />
              <label className="flex items-center gap-2.5 text-xs font-bold text-[#0B1220] cursor-pointer w-fit">
                <input type="radio" defaultChecked className="w-4 h-4 text-[#B8873A] focus:ring-[#B8873A]" />
                <span className="font-serif text-sm uppercase tracking-wider text-[#0B1220]">Ordinary Revival</span>
              </label>

              {/* Policy No Dropdown */}
              <div className="mt-4 relative">
                <div className="relative">
                  <span className="absolute -top-2 left-3 bg-white px-1 text-[10px] text-[#B8873A] font-bold uppercase tracking-wider z-10">
                    Policy No.
                  </span>
                  <div className="flex items-center border border-slate-300 rounded-xl overflow-hidden focus-within:border-[#B8873A] focus-within:ring-2 focus-within:ring-[#B8873A]/20 transition bg-white">
                    <Search size={15} className="ml-3 text-slate-400 shrink-0" />
                    <input
                      type="text"
                      value={policySearch}
                      onChange={(e) => { setPolicySearch(e.target.value); setDropdownOpen(true); }}
                      onFocus={(e) => {
                        setDropdownOpen(true);
                        // Reopening after a selection: clear the filter so the full list shows again
                        if (selectedPolicy && policySearch === selectedPolicy.policyNumber) {
                          setPolicySearch("");
                        }
                        e.target.select();
                      }}
                      placeholder="Search by policy number or member name..."
                      className="flex-1 px-3 py-2.5 text-xs text-slate-800 font-semibold focus:outline-none bg-transparent"
                    />
                    <ChevronDown size={15} className="mr-3 text-slate-400 shrink-0" />
                  </div>
                </div>

                {/* Dropdown List */}
                {dropdownOpen && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl max-h-64 overflow-y-auto">
                    {dropdownPolicies.length === 0 ? (
                      <div className="px-4 py-3 text-xs text-slate-500 italic">
                        No policies found. Try a different search.
                      </div>
                    ) : (
                      dropdownPolicies.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => handlePolicySelect(p)}
                          className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-[#B8873A]/10 transition text-left border-b border-slate-100 last:border-none"
                        >
                          <span className="font-mono font-bold text-xs text-[#0B1220]">{p.policyNumber}</span>
                          <span className="text-xs text-slate-600 truncate ml-3 max-w-[200px]">{getMemberName(p)}</span>
                          <span className="text-[10px] text-slate-400 ml-2 whitespace-nowrap">
                            {p.status?.statusName || ""}
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Overlay to close dropdown */}
            {dropdownOpen && (
              <div
                className="fixed inset-0 z-40"
                onClick={() => {
                  setDropdownOpen(false);
                  // Closed without picking a new one — restore the previously selected policy's number
                  if (selectedPolicy && !policySearch) {
                    setPolicySearch(selectedPolicy.policyNumber);
                  }
                }}
              />
            )}

            {/* Policy Details */}
            <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#B8873A] via-[#B8873A]/40 to-transparent" />
              <h2 className="font-serif text-sm font-bold uppercase tracking-wider text-slate-900 mb-5">
                Policy Details
              </h2>

              <div className="space-y-4">
                {/* Row 1: Name, DOB, Comm Date */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: "Name", value: name, set: setName, type: "text" },
                    { label: "Date of Birth", value: dob, set: setDob, type: "date" },
                    { label: "Comm. Date", value: commDate, set: setCommDate, type: "date" },
                  ].map(({ label, value, set, type }) => (
                    <div key={label} className="relative">
                      <span className="absolute -top-2 left-3 bg-white px-1 text-[10px] text-[#B8873A] font-bold uppercase tracking-wider">
                        {label}
                      </span>
                      <input
                        type={type}
                        value={value}
                        onChange={(e) => set(e.target.value)}
                        className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#B8873A]"
                      />
                    </div>
                  ))}
                </div>

                {/* Row 2: Plan, Mode, Term, PPT */}
                <div className="grid grid-cols-4 gap-3">
                  {[
                    { label: "Plan", value: plan, set: setPlan },
                    { label: "Mode", value: mode, set: setMode },
                    { label: "Term", value: term, set: setTerm },
                    { label: "PPT", value: ppt, set: setPpt },
                  ].map(({ label, value, set }) => (
                    <div key={label} className="relative">
                      <span className="absolute -top-2 left-3 bg-white px-1 text-[10px] text-[#B8873A] font-bold uppercase tracking-wider">
                        {label}
                      </span>
                      <input
                        type="text"
                        value={value}
                        onChange={(e) => set(e.target.value)}
                        className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#B8873A]"
                      />
                    </div>
                  ))}
                </div>

                {/* Row 3: Extra Class, Extra Premium, SB Option, FUP Date */}
                <div className="grid grid-cols-4 gap-3">
                  {[
                    { label: "Extra Class", value: extraClass, set: setExtraClass, type: "text" },
                    { label: "Extra Premium", value: extraPremium, set: setExtraPremium, type: "text" },
                    { label: "SB Option", value: sbOption, set: setSbOption, type: "text" },
                    { label: "FUP Date", value: fupDate, set: setFupDate, type: "date" },
                  ].map(({ label, value, set, type }) => (
                    <div key={label} className="relative">
                      <span className="absolute -top-2 left-3 bg-white px-1 text-[10px] text-[#B8873A] font-bold uppercase tracking-wider">
                        {label}
                      </span>
                      <input
                        type={type}
                        value={value}
                        onChange={(e) => set(e.target.value)}
                        className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#B8873A]"
                      />
                    </div>
                  ))}
                </div>

                {/* Row 4: Sum Assured, Premium, Rider Premium */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: "Sum Assured", value: sumAssured, set: setSumAssured },
                    { label: "Premium", value: premium, set: setPremium },
                    { label: "Rider Premium", value: riderPremium, set: setRiderPremium },
                  ].map(({ label, value, set }) => (
                    <div key={label} className="relative">
                      <span className="absolute -top-2 left-3 bg-white px-1 text-[10px] text-[#B8873A] font-bold uppercase tracking-wider">
                        {label}
                      </span>
                      <input
                        type="number"
                        value={value}
                        onChange={(e) => set(e.target.value)}
                        className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#B8873A] font-mono"
                      />
                    </div>
                  ))}
                </div>

                {/* Row 5: Loan Taken, Date of Int Calc, Date of Calculation */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: "Loan Taken", value: loanTaken, set: setLoanTaken, type: "number" },
                    { label: "Date of Int Calc", value: dateOfIntCalc, set: setDateOfIntCalc, type: "date" },
                    { label: "Date of Calculation", value: dateOfCalc, set: setDateOfCalc, type: "date" },
                  ].map(({ label, value, set, type }) => (
                    <div key={label} className="relative">
                      <span className="absolute -top-2 left-3 bg-white px-1 text-[10px] text-[#B8873A] font-bold uppercase tracking-wider">
                        {label}
                      </span>
                      <input
                        type={type}
                        value={value}
                        onChange={(e) => set(e.target.value)}
                        className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#B8873A] font-mono"
                      />
                    </div>
                  ))}
                </div>

                {/* Remarks + Calculate */}
                <div className="flex items-center gap-3">
                  <div className="relative flex-1">
                    <span className="absolute -top-2 left-3 bg-white px-1 text-[10px] text-[#B8873A] font-bold uppercase tracking-wider">
                      Remarks
                    </span>
                    <input
                      type="text"
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                      className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#B8873A]"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleCalculate}
                    className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-[#0B1220] to-[#1A2942] text-[#E8C77A] font-bold text-xs rounded-xl shadow-lg hover:brightness-110 transition uppercase tracking-wider whitespace-nowrap"
                  >
                    <Calculator size={16} />
                    Calculate
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: Calculation Panel */}
          <div className="lg:col-span-2">
            <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm sticky top-4">
              <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#B8873A] via-[#B8873A]/40 to-transparent" />
              <div className="p-5">
                <h2 className="font-serif text-sm font-bold uppercase tracking-wider text-slate-900 mb-5">
                  Calculation
                </h2>

                {!calculated ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center space-y-3">
                    <div className="w-14 h-14 rounded-full bg-[#B8873A]/10 flex items-center justify-center">
                      <Calculator size={28} className="text-[#B8873A]" />
                    </div>
                    <p className="text-xs text-slate-500 max-w-[180px]">
                      Select a policy and click <strong>Calculate</strong> to see the revival quote
                    </p>
                  </div>
                ) : (
                  <div className="space-y-0.5">
                    {[
                      { label: "No. of Premiums Pending", value: calcResults.premiumsPending, mono: true },
                      { label: "Premium Amount Pending", value: `₹ ${Number(calcResults.premiumAmountPending).toLocaleString("en-IN")}`, mono: true },
                      null, // divider
                      { label: "Rate of Interest", value: `${calcResults.rateOfInterest.toFixed(2)} %`, mono: true },
                      { label: "Revival Factor", value: calcResults.revivalFactor.toFixed(4), mono: true },
                      { label: "Interest Payable", value: `₹ ${Number(calcResults.interestPayable).toLocaleString("en-IN")}`, mono: true },
                      { label: "GST", value: `₹ ${Number(calcResults.gstOnInterest).toLocaleString("en-IN")}`, mono: true },
                      null, // divider
                      { label: "Amt. Payable for Revival", value: `₹ ${Number(calcResults.totalPayable).toLocaleString("en-IN")}`, mono: true, highlight: true },
                      { label: "Validity of Quotation", value: fmtDate(calcResults.validityDate), mono: false },
                      null, // divider
                      { label: "Loan Available", value: calcResults.loanAvailable > 0 ? `₹ ${Number(calcResults.loanAvailable).toLocaleString("en-IN")}` : "Not Eligible", mono: true },
                      { label: "Survival Benefit Due", value: calcResults.sbDue > 0 ? `₹ ${Number(calcResults.sbDue).toLocaleString("en-IN")}` : "0", mono: true },
                    ].map((row, i) =>
                      row === null ? (
                        <div key={i} className="h-px bg-slate-100 my-2" />
                      ) : (
                        <div
                          key={i}
                          className={`flex items-center justify-between py-1.5 px-2 rounded-lg ${row.highlight ? "bg-[#0B1220] text-white" : "hover:bg-slate-50"}`}
                        >
                          <span className={`text-xs font-semibold ${row.highlight ? "text-[#E8C77A]" : "text-slate-600"}`}>
                            {row.label}
                          </span>
                          <span className={`text-xs font-bold ${row.mono ? "font-mono" : ""} ${row.highlight ? "text-white text-sm" : "text-slate-900"}`}>
                            {row.value}
                          </span>
                        </div>
                      )
                    )}

                    {/* Documents Required */}
                    <div className="mt-4 pt-4 border-t border-slate-100">
                      <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider block mb-2">
                        Documents Required for Revival
                      </label>
                      <textarea
                        readOnly
                        value={calcResults.documentsRequired}
                        rows={3}
                        className="w-full border border-slate-200 rounded-xl px-3 py-2 text-[11px] text-slate-700 bg-slate-50 resize-none focus:outline-none"
                      />
                    </div>

                    {/* Warning if very lapsed */}
                    {calcResults.premiumsPending > 5 && (
                      <div className="mt-3 flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3">
                        <AlertCircle size={14} className="text-amber-600 mt-0.5 shrink-0" />
                        <p className="text-[11px] text-amber-700 font-medium">
                          This policy has lapsed for more than 5 premiums. Medical examination may be required for revival.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Hidden formatted report — used only for PDF export, styled like the other LIC reports */}
      <div className="fixed top-0 -left-[10000px] -z-10">
        <div ref={reportRef} className="bg-white p-8 border border-slate-300 text-slate-900 font-sans w-[850px] space-y-4">
          {/* Letterhead */}
          <div className="flex justify-between items-start border-b-2 border-[#0B1220] pb-3">
            <div className="space-y-0.5">
              <h1 className="text-2xl font-bold text-[#0B1220] tracking-tight">Jayant Mahabole</h1>
              <p className="text-xs font-semibold text-slate-700">MBA in Insurance & Finance</p>
              <p className="text-[11px] text-slate-600 max-w-xs leading-tight">84/2, Darpan Bldg., 201 Sarang Society, Sahakarnagar No. 2 Parvati Pune 411009</p>
              <p className="text-[11px] text-slate-600 font-mono">9822452896</p>
              <p className="text-[11px] text-slate-600">office@jayantmahbole.com</p>
            </div>
            <div className="h-16 w-36 bg-[#0B1220] rounded-bl-3xl p-3 flex flex-col justify-end text-right">
              <span className="text-[10px] font-serif font-bold text-[#E8C77A] uppercase tracking-widest">LIC INDIA</span>
            </div>
          </div>

          {/* Title bar */}
          <div className="bg-[#0B1220] text-white rounded-lg px-4 py-2.5 flex items-center justify-between border-l-4 border-[#B8873A]">
            <h2 className="text-base font-serif font-bold text-[#E8C77A] uppercase tracking-wider">Revival Premium Quotation</h2>
            <span className="text-xs font-bold text-slate-200">As on {fmtDate(dateOfCalc) || fmtDate(new Date())}</span>
          </div>

          {/* Policy Details */}
          <div>
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider border-b border-slate-200 pb-1 mb-2">
              Policy Details
            </h3>
            <table className="w-full text-[11px] border-collapse">
              <tbody>
                <tr>
                  <td className="py-1 pr-2 font-semibold text-slate-600 w-[18%]">Policy No.</td>
                  <td className="py-1 pr-6 font-mono font-bold w-[32%]">{selectedPolicy?.policyNumber || policySearch || "-"}</td>
                  <td className="py-1 pr-2 font-semibold text-slate-600 w-[18%]">Name</td>
                  <td className="py-1 font-bold">{name || "-"}</td>
                </tr>
                <tr>
                  <td className="py-1 pr-2 font-semibold text-slate-600">Date of Birth</td>
                  <td className="py-1 pr-6 font-mono">{fmtDate(dob) || "-"}</td>
                  <td className="py-1 pr-2 font-semibold text-slate-600">Comm. Date</td>
                  <td className="py-1 font-mono">{fmtDate(commDate) || "-"}</td>
                </tr>
                <tr>
                  <td className="py-1 pr-2 font-semibold text-slate-600">Plan</td>
                  <td className="py-1 pr-6">{plan || "-"}</td>
                  <td className="py-1 pr-2 font-semibold text-slate-600">Mode</td>
                  <td className="py-1">{mode || "-"}</td>
                </tr>
                <tr>
                  <td className="py-1 pr-2 font-semibold text-slate-600">Term / PPT</td>
                  <td className="py-1 pr-6 font-mono">{term || "-"} / {ppt || "-"}</td>
                  <td className="py-1 pr-2 font-semibold text-slate-600">FUP Date</td>
                  <td className="py-1 font-mono">{fmtDate(fupDate) || "-"}</td>
                </tr>
                <tr>
                  <td className="py-1 pr-2 font-semibold text-slate-600">Sum Assured</td>
                  <td className="py-1 pr-6 font-mono">₹ {Number(sumAssured || 0).toLocaleString("en-IN")}</td>
                  <td className="py-1 pr-2 font-semibold text-slate-600">Premium</td>
                  <td className="py-1 font-mono">₹ {Number(premium || 0).toLocaleString("en-IN")}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Calculation Summary */}
          {calcResults && (
            <div>
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider border-b border-slate-200 pb-1 mb-2">
                Revival Calculation
              </h3>
              <table className="w-full text-[11px] border-collapse">
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="py-1.5 font-semibold text-slate-600">No. of Premiums Pending</td>
                    <td className="py-1.5 text-right font-mono">{calcResults.premiumsPending}</td>
                  </tr>
                  <tr>
                    <td className="py-1.5 font-semibold text-slate-600">Premium Amount Pending</td>
                    <td className="py-1.5 text-right font-mono">₹ {Number(calcResults.premiumAmountPending).toLocaleString("en-IN")}</td>
                  </tr>
                  <tr>
                    <td className="py-1.5 font-semibold text-slate-600">Rate of Interest</td>
                    <td className="py-1.5 text-right font-mono">{calcResults.rateOfInterest.toFixed(2)} %</td>
                  </tr>
                  <tr>
                    <td className="py-1.5 font-semibold text-slate-600">Revival Factor</td>
                    <td className="py-1.5 text-right font-mono">{calcResults.revivalFactor.toFixed(4)}</td>
                  </tr>
                  <tr>
                    <td className="py-1.5 font-semibold text-slate-600">Interest Payable</td>
                    <td className="py-1.5 text-right font-mono">₹ {Number(calcResults.interestPayable).toLocaleString("en-IN")}</td>
                  </tr>
                  <tr>
                    <td className="py-1.5 font-semibold text-slate-600">GST on Interest</td>
                    <td className="py-1.5 text-right font-mono">₹ {Number(calcResults.gstOnInterest).toLocaleString("en-IN")}</td>
                  </tr>
                  <tr className="bg-slate-100 border-y-2 border-slate-700">
                    <td className="py-2 font-bold text-[#0B1220]">Amount Payable for Revival</td>
                    <td className="py-2 text-right font-mono font-bold text-[#0B1220]">₹ {Number(calcResults.totalPayable).toLocaleString("en-IN")}</td>
                  </tr>
                  <tr>
                    <td className="py-1.5 font-semibold text-slate-600">Validity of Quotation</td>
                    <td className="py-1.5 text-right">{fmtDate(calcResults.validityDate)}</td>
                  </tr>
                  <tr>
                    <td className="py-1.5 font-semibold text-slate-600">Loan Available</td>
                    <td className="py-1.5 text-right font-mono">
                      {calcResults.loanAvailable > 0 ? `₹ ${Number(calcResults.loanAvailable).toLocaleString("en-IN")}` : "Not Eligible"}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-1.5 font-semibold text-slate-600">Survival Benefit Due</td>
                    <td className="py-1.5 text-right font-mono">
                      {calcResults.sbDue > 0 ? `₹ ${Number(calcResults.sbDue).toLocaleString("en-IN")}` : "0"}
                    </td>
                  </tr>
                </tbody>
              </table>

              <div className="mt-3 pt-3 border-t border-slate-200">
                <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Documents Required for Revival
                </p>
                <p className="text-[11px] text-slate-700 whitespace-pre-line leading-relaxed">
                  {calcResults.documentsRequired}
                </p>
              </div>

              {calcResults.premiumsPending > 5 && (
                <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <p className="text-[10px] text-amber-700 font-medium">
                    This policy has lapsed for more than 5 premiums. Medical examination may be required for revival.
                  </p>
                </div>
              )}
            </div>
          )}

          {remarks && (
            <div className="pt-1">
              <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">Remarks</p>
              <p className="text-[11px] text-slate-700">{remarks}</p>
            </div>
          )}

          {/* Footer */}
          <div className="pt-6 border-t border-slate-300 space-y-1 text-[10px] text-slate-700 font-medium">
            <p>
              This is a system-generated indicative quotation for policy revival, calculated at {REVIVAL_INTEREST_RATE * 100}% p.a. interest plus {GST_RATE * 100}% GST. Actual amount payable may vary — please confirm with your LIC branch office before making payment.
            </p>
            <div className="flex justify-between items-center pt-2 font-mono text-[9px] text-slate-500 border-t border-slate-200">
              <span>Generated via Revival Premium Calculator</span>
              <span>Report Date: {fmtDate(dateOfCalc)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}