"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  User,
  DollarSign,
  FileText,
  Shield,
  Settings,
} from "lucide-react";
import axios from "@/lib/axios";

function formatDisplay(value?: string | null) {
  return value && value.trim() ? value : "—";
}

function formatDate(value?: string | null) {
  if (!value) return "";
  return new Date(value).toISOString().split("T")[0];
}

function toDisplayValue(value: unknown) {
  if (value === null || value === undefined || value === "") return "";
  if (typeof value === "number") return String(value);
  return String(value);
}

function getAgeFromDob(value?: string | null) {
  if (!value) return "";
  const dob = new Date(value);
  if (Number.isNaN(dob.getTime())) return "";
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const monthDiff = now.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < dob.getDate())) {
    age -= 1;
  }
  return String(age);
}

export default function ViewLICPolicyPage() {
  const router = useRouter();
  const params = useParams<{ id?: string }>();
  const policyId = params?.id;

  const [policy, setPolicy] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState("policy-holder");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [glowingSection, setGlowingSection] = useState<string | null>(null);

  useEffect(() => {
    const fetchPolicy = async () => {
      if (!policyId) return;
      try {
        setLoading(true);
        setError(null);
        const response = await axios.get(`/policies/${policyId}`);
        setPolicy(response?.data?.data?.policy ?? null);
      } catch (err: any) {
        setError(
          err?.response?.data?.message || "Failed to load policy details.",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchPolicy();
  }, [policyId]);

  const sectionRefs = {
    "policy-holder": useRef<HTMLDivElement>(null),
    "policy-details": useRef<HTMLDivElement>(null),
    "premium-calculation": useRef<HTMLDivElement>(null),
    riders: useRef<HTMLDivElement>(null),
    advanced: useRef<HTMLDivElement>(null),
  };

  const sections = [
    { id: "policy-holder", label: "Policy Holder's Details" },
    { id: "policy-details", label: "Policy Details" },
    { id: "premium-calculation", label: "Policy Premium Calculation" },
    { id: "riders", label: "Riders Details" },
    { id: "advanced", label: "Advanced Options" },
  ];

  const handleSectionClick = (sectionId: keyof typeof sectionRefs) => {
    const ref = sectionRefs[sectionId];
    if (ref.current) {
      const yOffset = -80;
      const y =
        ref.current.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: "smooth" });
      setActiveSection(sectionId);
      setGlowingSection(sectionId);
      setTimeout(() => setGlowingSection(null), 1500);
    }
  };

  const lifeAssuredName = useMemo(() => {
    const firstName = policy?.CustomerMaster?.firstName;
    const lastName = policy?.CustomerMaster?.lastName;
    return [firstName, lastName].filter(Boolean).join(" ") || "—";
  }, [policy]);

  const groupName = useMemo(() => {
    return formatDisplay(
      policy?.customer?.groupName ||
        policy?.customer?.groupCode ||
        policy?.customer?.name,
    );
  }, [policy]);

  const groupCode = useMemo(
    () => formatDisplay(policy?.customer?.groupCode),
    [policy],
  );
  const providerType = useMemo(
    () => formatDisplay(policy?.provider?.type),
    [policy],
  );
  const providerName = useMemo(
    () => formatDisplay(policy?.provider?.name),
    [policy],
  );
  const planDisplay = useMemo(() => {
    const planNumber = policy?.product?.planNumber;
    const productName = policy?.product?.productName;
    return (
      [planNumber ? `[${planNumber}]` : null, productName]
        .filter(Boolean)
        .join(" ") || "—"
    );
  }, [policy]);
  const modeName = useMemo(
    () => formatDisplay(policy?.premiumMode?.modeName),
    [policy],
  );
  const policyStatus = useMemo(
    () => formatDisplay(policy?.status?.statusName),
    [policy],
  );
  const advisorName = useMemo(
    () => formatDisplay(policy?.advisor?.advisorName),
    [policy],
  );
  const agentCode = useMemo(() => formatDisplay(policy?.agentCode), [policy]);
  const branchCode = useMemo(() => formatDisplay(policy?.branchCode), [policy]);
  const remarks = useMemo(() => formatDisplay(policy?.remarks), [policy]);
  const bankDetails = policy?.CustomerMaster?.bankDetails?.[0];
  const nominee = policy?.nominees?.[0];

  return (
    <div className="max-w-7xl mx-auto pb-20">
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
              <Link
                href="/dashboard/lic/policies"
                className="hover:text-blue-600"
              >
                Policies
              </Link>
              <ChevronRight size={16} />
              <span className="font-medium text-slate-700">Policy Details</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mt-1">
              {loading
                ? "Loading Policy"
                : policy?.policyNumber || "LIC Policy Details"}
            </h1>
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-1 mb-6 overflow-x-auto flex">
        {sections.map((section) => (
          <button
            type="button"
            key={section.id}
            onClick={() =>
              handleSectionClick(section.id as keyof typeof sectionRefs)
            }
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition ${activeSection === section.id ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-50"}`}
          >
            {section.label}
          </button>
        ))}
      </div>

      {error ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div>
        <div
          ref={sectionRefs["policy-holder"]}
          className={`bg-white border border-slate-200 rounded-xl p-6 transition-all duration-500 ${glowingSection === "policy-holder" ? "shadow-lg shadow-blue-500/20" : ""}`}
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <User size={20} className="text-blue-600" />
              Policy Holder's Details
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Group Name
              </label>
              <input
                type="text"
                value={groupName}
                placeholder="Auto-filled"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50"
                readOnly
                disabled
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Group Code
              </label>
              <input
                type="text"
                value={groupCode}
                placeholder="Auto-filled"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50"
                readOnly
                disabled
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Life Assured
              </label>
              <input
                type="text"
                value={lifeAssuredName}
                placeholder="Auto-filled"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50"
                readOnly
                disabled
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Date of Birth
              </label>
              <input
                type="date"
                value={formatDate(policy?.CustomerMaster?.dob)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50"
                readOnly
                disabled
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Age
              </label>
              <input
                type="number"
                value={getAgeFromDob(policy?.CustomerMaster?.dob)}
                placeholder="Age"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50"
                readOnly
                disabled
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Gender
              </label>
              <select
                value={toDisplayValue(policy?.CustomerMaster?.gender)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50"
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
                type="text"
                value={toDisplayValue(policy?.CustomerMaster?.panNumber)}
                placeholder="Enter PAN number"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50"
                readOnly
                disabled
              />
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div
              ref={sectionRefs["policy-details"]}
              className={`bg-white border border-slate-200 rounded-xl p-6 transition-all duration-500 ${glowingSection === "policy-details" ? "shadow-lg shadow-blue-500/20" : ""}`}
            >
              <h2 className="text-lg font-semibold text-slate-900 mb-6 flex items-center gap-2">
                <FileText size={20} className="text-blue-600" />
                Policy Details
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Provider Type
                  </label>
                  <input
                    type="text"
                    value={providerType}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50"
                    readOnly
                    disabled
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Provider Name
                  </label>
                  <input
                    type="text"
                    value={providerName}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50"
                    readOnly
                    disabled
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Policy Number
                  </label>
                  <input
                    type="text"
                    value={toDisplayValue(policy?.policyNumber)}
                    placeholder="Enter policy number"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50"
                    readOnly
                    disabled
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Plan
                  </label>
                  <input
                    type="text"
                    value={planDisplay}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50"
                    readOnly
                    disabled
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Mode
                  </label>
                  <input
                    type="text"
                    value={modeName}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50"
                    readOnly
                    disabled
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Commencement Date
                  </label>
                  <input
                    type="date"
                    value={formatDate(policy?.commencementDate)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50"
                    readOnly
                    disabled
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Completion Date
                  </label>
                  <input
                    type="date"
                    value={formatDate(policy?.maturityDate)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50"
                    readOnly
                    disabled
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Term
                  </label>
                  <input
                    type="number"
                    value={toDisplayValue(policy?.policyTerm)}
                    placeholder="Enter term"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50"
                    readOnly
                    disabled
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    PPT
                  </label>
                  <input
                    type="number"
                    value={toDisplayValue(policy?.premiumPayingTerm)}
                    placeholder="Enter PPT"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50"
                    readOnly
                    disabled
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Extra Class
                  </label>
                  <input
                    type="text"
                    value={toDisplayValue(policy?.premium?.extraClass)}
                    placeholder="Extra class"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50"
                    readOnly
                    disabled
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Rate %
                  </label>
                  <input
                    type="number"
                    value={toDisplayValue(policy?.premium?.extraClass)}
                    placeholder="Rate %"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50"
                    readOnly
                    disabled
                  />
                </div>
              </div>
            </div>

            <div
              ref={sectionRefs["riders"]}
              className={`bg-white border border-slate-200 rounded-xl p-6 transition-all duration-500 ${glowingSection === "riders" ? "shadow-lg shadow-blue-500/20" : ""}`}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                  <Shield size={20} className="text-blue-600" />
                  Riders Details
                </h2>
              </div>
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
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {!policy?.policyRiders?.length ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-4 py-6 text-center text-slate-500 text-sm"
                        >
                          No Rider to Show
                        </td>
                      </tr>
                    ) : (
                      policy.policyRiders.map(
                        (policyRider: any, index: number) => (
                          <tr key={policyRider.id || index}>
                            <td className="px-2 py-1.5 w-1/3">
                              <input
                                type="text"
                                value={formatDisplay(
                                  policyRider?.rider?.riderName ||
                                    policyRider?.rider?.riderCode,
                                )}
                                className="w-full text-sm border-slate-200 rounded-md bg-slate-50"
                                readOnly
                                disabled
                              />
                            </td>
                            <td className="px-2 py-1.5">
                              <input
                                type="text"
                                value={toDisplayValue(policyRider?.riderAmount)}
                                className="w-full text-sm border-slate-200 rounded-md bg-slate-50"
                                readOnly
                                disabled
                              />
                            </td>
                            <td className="px-2 py-1.5">
                              <input
                                type="text"
                                value={toDisplayValue(policy?.policyTerm)}
                                className="w-20 text-sm border-slate-200 rounded-md bg-slate-50"
                                readOnly
                                disabled
                              />
                            </td>
                            <td className="px-2 py-1.5">
                              <input
                                type="text"
                                value={toDisplayValue(
                                  policy?.premiumPayingTerm,
                                )}
                                className="w-20 text-sm border-slate-200 rounded-md bg-slate-50"
                                readOnly
                                disabled
                              />
                            </td>
                            <td className="px-2 py-1.5">
                              <input
                                type="text"
                                value={toDisplayValue(
                                  policyRider?.riderPremium,
                                )}
                                className="w-full text-sm border-slate-200 rounded-md bg-slate-50"
                                readOnly
                                disabled
                              />
                            </td>
                          </tr>
                        ),
                      )
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="lg:col-span-1">
            <div
              ref={sectionRefs["premium-calculation"]}
              className={`bg-white border border-slate-200 rounded-xl p-6 sticky top-6 transition-all duration-500 ${glowingSection === "premium-calculation" ? "shadow-lg shadow-blue-500/20" : ""}`}
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
                    value={toDisplayValue(policy?.premium?.sumAssured)}
                    placeholder="Enter sum assured"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50"
                    readOnly
                    disabled
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Basic Yearly Premium
                  </label>
                  <input
                    type="text"
                    value={toDisplayValue(policy?.premium?.basicYearlyPremium)}
                    placeholder="Enter basic yearly premium"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50"
                    readOnly
                    disabled
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Total Yearly Premium
                  </label>
                  <input
                    type="text"
                    value={toDisplayValue(policy?.premium?.totalYearlyPremium)}
                    placeholder="Enter total yearly premium"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50"
                    readOnly
                    disabled
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Total Rider Premium
                  </label>
                  <input
                    type="text"
                    value={toDisplayValue(
                      policy?.policyRiders?.reduce(
                        (acc: number, item: any) =>
                          acc + Number(item?.riderPremium || 0),
                        0,
                      ),
                    )}
                    placeholder="Total rider premium"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50"
                    readOnly
                    disabled
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Installment Premium
                  </label>
                  <input
                    type="text"
                    value={toDisplayValue(policy?.premium?.installmentPremium)}
                    placeholder="Installment premium"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50"
                    readOnly
                    disabled
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Rate %
                  </label>
                  <input
                    type="number"
                    value={toDisplayValue(policy?.premium?.extraClass)}
                    placeholder="Rate %"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50"
                    readOnly
                    disabled
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    GST
                  </label>
                  <input
                    type="text"
                    value={toDisplayValue(policy?.premium?.gst)}
                    placeholder="Enter GST"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50"
                    readOnly
                    disabled
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Total Installment Premium
                  </label>
                  <input
                    type="text"
                    value={toDisplayValue(
                      policy?.premium?.totalInstallmentPremium,
                    )}
                    placeholder="Total with GST"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50"
                    readOnly
                    disabled
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div
          ref={sectionRefs["advanced"]}
          className={`bg-white border border-slate-200 rounded-xl p-6 mt-6 transition-all duration-500 ${glowingSection === "advanced" ? "shadow-lg shadow-blue-500/20" : ""}`}
        >
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center justify-between w-full text-left"
          >
            <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <Settings size={20} className="text-blue-600" />
              Advanced Options
            </h2>
            <span className="text-slate-500">{showAdvanced ? "▾" : "▸"}</span>
          </button>

          {showAdvanced && (
            <div className="mt-6 grid grid-cols-1 gap-6">
              <div className="border border-slate-200 rounded-lg p-4">
                <h3 className="text-base font-semibold text-slate-800 mb-4">
                  Current Status
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Policy Status
                    </label>
                    <input
                      type="text"
                      value={policyStatus}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50"
                      readOnly
                      disabled
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Premium Adjusted
                    </label>
                    <input
                      type="text"
                      value={toDisplayValue(policy?.premium?.rebate)}
                      placeholder="Premium adjusted"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50"
                      readOnly
                      disabled
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Loan Taken
                    </label>
                    <input
                      type="text"
                      value={policy?.loans?.length ? "Yes" : "No"}
                      placeholder="Loan taken"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50"
                      readOnly
                      disabled
                    />
                  </div>
                </div>
              </div>

              <div className="border border-slate-200 rounded-lg p-4">
                <h3 className="text-base font-semibold text-slate-800 mb-4">
                  Check Current Status of Policy
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      First Unpaid Premium (F.U.P) Date
                    </label>
                    <input
                      type="date"
                      value={formatDate(policy?.nextPremiumDueDate)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50"
                      readOnly
                      disabled
                    />
                  </div>
                </div>
              </div>

              <div className="border border-slate-200 rounded-lg p-4">
                <h3 className="text-base font-semibold text-slate-800 mb-4">
                  Nomination Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Annuity Details
                    </label>
                    <input
                      type="text"
                      value={formatDisplay(nominee?.nomineeName)}
                      placeholder="Annuity details"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50"
                      readOnly
                      disabled
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Other Information
                    </label>
                    <input
                      type="text"
                      value={formatDisplay(nominee?.relationship)}
                      placeholder="Other information"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50"
                      readOnly
                      disabled
                    />
                  </div>
                </div>
              </div>

              <div className="border border-slate-200 rounded-lg p-4">
                <h3 className="text-base font-semibold text-slate-800 mb-4">
                  Advisor Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Advisor
                    </label>
                    <input
                      type="text"
                      value={advisorName}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50"
                      readOnly
                      disabled
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Agent Code
                    </label>
                    <input
                      type="text"
                      value={agentCode}
                      placeholder="Auto-filled"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50"
                      readOnly
                      disabled
                    />
                  </div>
                </div>
              </div>

              <div className="border border-slate-200 rounded-lg p-4">
                <h3 className="text-base font-semibold text-slate-800 mb-4">
                  NACH & NEFT Details
                </h3>
                <p className="text-sm text-slate-500 mb-4">
                  Provide NACH / NEFT Details for bank transactions
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Bank Name
                    </label>
                    <input
                      type="text"
                      value={formatDisplay(bankDetails?.bankName)}
                      placeholder="Enter bank name"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50"
                      readOnly
                      disabled
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Account Number
                    </label>
                    <input
                      type="text"
                      value={formatDisplay(bankDetails?.accountNumber)}
                      placeholder="Enter account number"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50"
                      readOnly
                      disabled
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      IFSC Code
                    </label>
                    <input
                      type="text"
                      value={formatDisplay(bankDetails?.ifscCode)}
                      placeholder="Enter IFSC code"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50"
                      readOnly
                      disabled
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Account Holder Name
                    </label>
                    <input
                      type="text"
                      value={formatDisplay(
                        policy?.CustomerMaster?.firstName
                          ? `${policy.CustomerMaster.firstName} ${policy.CustomerMaster.lastName || ""}`.trim()
                          : "",
                      )}
                      placeholder="Enter account holder name"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50"
                      readOnly
                      disabled
                    />
                  </div>
                </div>
              </div>

              <div className="border border-slate-200 rounded-lg p-4">
                <h3 className="text-base font-semibold text-slate-800 mb-4">
                  Additional Fields
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Branch
                    </label>
                    <input
                      type="text"
                      value={branchCode}
                      placeholder="Branch"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50"
                      readOnly
                      disabled
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Medical
                    </label>
                    <input
                      type="text"
                      value={remarks}
                      placeholder="Medical details"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50"
                      readOnly
                      disabled
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Sales Channel
                    </label>
                    <input
                      type="text"
                      value={providerType}
                      placeholder="Sales channel"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50"
                      readOnly
                      disabled
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Age Admitted
                    </label>
                    <input
                      type="number"
                      value={getAgeFromDob(policy?.CustomerMaster?.dob)}
                      placeholder="Age admitted"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50"
                      readOnly
                      disabled
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Tax Beneficiary
                    </label>
                    <input
                      type="text"
                      value={formatDisplay(nominee?.nomineeName)}
                      placeholder="Tax beneficiary"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50"
                      readOnly
                      disabled
                    />
                  </div>
                  <div className="lg:col-span-3">
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Notes
                    </label>
                    <textarea
                      value={remarks}
                      placeholder="Add notes"
                      rows={2}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm resize-y bg-slate-50"
                      readOnly
                      disabled
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
