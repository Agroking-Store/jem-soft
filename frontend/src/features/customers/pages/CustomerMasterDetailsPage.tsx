"use client";

import CustomerModuleNav from "@/features/customers/components/CustomerModuleNav";
import type { CustomerModalEntry } from "@/features/customers/components/CustomerModalStack";

import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useRouter, useParams } from "next/navigation";
import type { RootState, AppDispatch } from "@/store/store";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { fetchCustomerMaster, deleteCustomerMaster } from "@/features/customers/customerMasterSlice";
import {
  fetchFamilyHistoriesByMember,
  clearCurrentGroup,
  clearFamilyRecords,
  type FamilyHistoryItem,
} from "@/features/customers/familyHistorySlice";
import {
  fetchMedicalHistoriesByMember,
  clearMedicalRecords,
} from "@/features/customers/medicalHistorySlice";
import { fetchPoliciesByMember } from "@/features/policy/policySlice";
import {
  ArrowLeft, Phone, CreditCard, Info, Settings,
  Edit, Trash2, AlertTriangle, ChevronRight, Star, Building,
  CheckCircle, XCircle, Heart, Activity, FileText,
  Clock, AlertCircle, Megaphone, Smartphone, Mail,
} from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";
import { getCommunicationLogsApi } from "@/features/marketing/services/marketingApi";
import type { CommunicationLog } from "@/features/marketing/types";

interface CustomerMasterDetailsPageProps {
  isModal?: boolean;
  customerId?: string;
  onClose?: () => void;
  onDeleted?: () => void;
  onOpenModal?: (type: CustomerModalEntry["type"], id?: string, extraId?: string) => void;
  modalStackLength?: number;
}

function InfoRow({ label, value }: { label: string; value?: string | number | boolean | null }) {
  if (value === undefined || value === null || value === "") return null;
  return (
    <div className="flex flex-col">
      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-0.5">{label}</span>
      <span className="text-sm text-slate-800 font-medium">{String(value)}</span>
    </div>
  );
}

function SectionCard({ title, icon, children, headerActions }: { title: string; icon: React.ReactNode; children: React.ReactNode; headerActions?: React.ReactNode }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.05)]">
      <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#B8873A] via-[#B8873A]/40 to-transparent" />
      <div className="flex items-center justify-between px-5 py-3.5 bg-slate-50 border-b border-slate-200">
        <div className="flex items-center gap-2.5">
          <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-[#0B1220]/5 text-[#B8873A] shrink-0">{icon}</span>
          <h2 className="text-sm font-bold text-[#0B1220] uppercase tracking-wider">{title}</h2>
        </div>
        {headerActions}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return "—";
  try { return new Date(dateStr).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }); }
  catch { return "—"; }
}

function getStatusBadge(status: string) {
  const statusMap = {
    Active: { color: "bg-green-100 text-green-700", icon: CheckCircle },
    Pending: { color: "bg-yellow-100 text-yellow-700", icon: Clock },
    Lapsed: { color: "bg-red-100 text-red-700", icon: XCircle },
    Completed: { color: "bg-[#B8873A]/10 text-[#0B1220]", icon: CheckCircle },
  };
  const StatusIcon = statusMap[status as keyof typeof statusMap]?.icon || AlertCircle;
  return {
    className: statusMap[status as keyof typeof statusMap]?.color || "bg-gray-100 text-gray-700",
    icon: StatusIcon,
  };
}

export default function CustomerMasterDetailsPage({
  isModal = false,
  customerId,
  onClose,
  onDeleted,
  onOpenModal,
  modalStackLength,
}: CustomerMasterDetailsPageProps = {}) {
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  const params = useParams();
  const id = customerId || (params.id as string);

  const { user } = useAuth();
  const { currentCustomer, isLoading, error } = useSelector((s: RootState) => s.customerMaster);

  const [isMounted, setIsMounted] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  // Lists are sourced from the Redux store (scoped to this member).
  const familyRecords = useSelector((s: RootState) => s.familyHistory.records);
  const medicalRecords = useSelector((s: RootState) => s.medicalHistory.records);
  const memberPolicies = useSelector((s: RootState) => s.policies.policies);
  const [customerLogs, setCustomerLogs] = useState<CommunicationLog[]>([]);

  useEffect(() => {
    setIsMounted(true);
    if (id) {
      dispatch(fetchCustomerMaster(id));
      dispatch(fetchFamilyHistoriesByMember(id));
      dispatch(fetchMedicalHistoriesByMember(id));
      dispatch(fetchPoliciesByMember(id));

      getCommunicationLogsApi({ customerId: id, limit: 10 })
        .then((res) => {
          if (res.success && res.data) setCustomerLogs(res.data.logs);
        })
        .catch(() => {});
    }
    // Clear member-scoped history when this modal unmounts so a parent modal
    // (e.g. the group) never shows stale data for a different member.
    return () => {
      dispatch(clearCurrentGroup());
      dispatch(clearFamilyRecords());
      dispatch(clearMedicalRecords());
    };
  }, [dispatch, id, modalStackLength]);

  const canEdit = isMounted && (user?.role === "ADMIN" || user?.role === "ADVISOR");

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await dispatch(deleteCustomerMaster(id)).unwrap();
      toast.success("Customer deleted successfully");
      if (isModal) onDeleted?.();
      else router.push("/dashboard/customers?tab=master");
    } catch (err: any) {
      toast.error(err || "Failed to delete customer");
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  if (!isMounted || (isLoading && !currentCustomer)) {
    return <div className="flex items-center justify-center min-h-[60vh]"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0B1220]" /></div>;
  }

  if (error && !currentCustomer) {
    return (
      <div className="max-w-3xl mx-auto text-center py-16 px-4">
        <h3 className="text-lg font-semibold text-slate-900 mb-2">Error Loading Customer</h3>
        <p className="text-slate-500 mb-6">{error}</p>
        <button type="button" onClick={() => (isModal ? onClose?.() : router.push("/dashboard/customers?tab=master"))} className="inline-flex items-center justify-center px-4 py-2 bg-[#0B1220] text-white rounded-lg font-semibold text-sm hover:bg-[#16294D] transition-colors">Back to Customers</button>
      </div>
    );
  }

  const c = currentCustomer;
  if (!c) return null;

  const fullName = [c.salutation, c.firstName, c.middleName, c.lastName].filter(Boolean).join(" ");

  return (
    <div className={`mx-auto space-y-6 pb-8 ${isModal ? "max-w-5xl" : "max-w-7xl"}`}>
      {!isModal && <CustomerModuleNav />}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button type="button" onClick={() => (isModal ? onClose?.() : router.push("/dashboard/customers?tab=master"))} className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition-colors hover:bg-slate-50">
            <ArrowLeft size={16} />
          </button>
          <div>
            <nav className="flex items-center gap-1 text-xs text-slate-400 mb-0.5">
              <button type="button" onClick={() => (isModal ? onClose?.() : router.push("/dashboard/customers?tab=master"))} className="hover:text-slate-600">Customer Master</button>
              <ChevronRight size={12} />
              <span className="text-slate-600 font-medium">{fullName}</span>
            </nav>
            <h1 className="text-xl font-bold text-slate-900">Customer Details</h1>
          </div>
        </div>
        {canEdit && (
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => (isModal ? onOpenModal?.("master-edit", id) : router.push(`/dashboard/customers/master/${id}/edit`))} className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg font-semibold text-sm transition-colors">
              <Edit size={14} /> Edit
            </button>
            <button onClick={() => setShowDeleteModal(true)} className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 px-3.5 py-2 text-sm font-semibold text-rose-600 transition-colors hover:bg-rose-50">
              <Trash2 size={14} /> Delete
            </button>
          </div>
        )}
      </div>

      {/* Hero card */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.05)]">
        <div className="bg-gradient-to-r from-[#0B1220] via-[#132342] to-[#16294D] p-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-[#0B1220] text-[#E8C77A] flex items-center justify-center text-2xl font-serif font-semibold shadow-sm ring-2 ring-[#B8873A]/50 ring-offset-2 ring-offset-[#0B1220]">
              {c.firstName.charAt(0).toUpperCase()}
            </div>
            <div className="text-white">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold">{fullName}</h2>
                {c.isGroupHead && (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-400/30 text-amber-100 border border-amber-300/30">
                    <Star size={10} /> Group Head
                  </span>
                )}
              </div>
              {c.group && (
                <div className="flex items-center gap-2 mt-1 opacity-80 text-sm">
                  <Building size={13} />
                  <span>
                    {c.group.groupCode && <span className="font-mono bg-white/20 px-1.5 py-0.5 rounded text-xs mr-1">{c.group.groupCode}</span>}
                    {c.group.groupName}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-3 mt-2 text-xs opacity-70">
                {c.gender && <span>{c.gender}</span>}
                {c.dob && <span>• Born {formatDate(c.dob)}</span>}
                {c.customerType && <span>• {c.customerType}</span>}
              </div>
            </div>
          </div>
        </div>
        <div className="px-6 py-4 grid grid-cols-2 sm:grid-cols-4 gap-4 bg-slate-50 border-t border-slate-200">
          <InfoRow label="PAN No." value={c.panNumber} />
          <InfoRow label="Aadhaar No." value={c.aadhaarNumber} />
          <InfoRow label="Salutation Letter" value={c.salutationLetter} />
          <InfoRow label="Customer Type" value={c.customerType} />
        </div>
      </div>

      <div className="space-y-6">
          {/* Contact & Address — combined, compact */}
          {(c.contactInfo || (c.addresses && c.addresses.length > 0)) && (
            <SectionCard title="Contact & Address" icon={<Phone size={16} />}>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-6 gap-y-4">
                <div className="space-y-2">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Contact</h3>
                  {c.contactInfo ? (
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                      <InfoRow label="Mobile 1" value={c.contactInfo.mobile1} />
                      <InfoRow label="Mobile 2" value={c.contactInfo.mobile2} />
                      {(c.contactInfo.landline1Std || c.contactInfo.landline1Number) && (
                        <InfoRow label="Landline 1" value={`${c.contactInfo.landline1Std || ""}-${c.contactInfo.landline1Number || ""}`} />
                      )}
                      {(c.contactInfo.landline2Std || c.contactInfo.landline2Number) && (
                        <InfoRow label="Landline 2" value={`${c.contactInfo.landline2Std || ""}-${c.contactInfo.landline2Number || ""}`} />
                      )}
                      <InfoRow label="E-Mail Personal" value={c.contactInfo.emailPersonal} />
                      <InfoRow label="E-Mail Business" value={c.contactInfo.emailBusiness} />
                      <InfoRow label="Skype ID" value={c.contactInfo.skypeId} />
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400">No contact information.</p>
                  )}
                </div>
                <div className="space-y-2">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Address</h3>
                  {c.addresses && c.addresses.length > 0 ? (
                    <div className="space-y-2">
                      {c.addresses.map((addr, idx) => (
                        <div key={idx} className="border border-slate-200 rounded-lg px-3 py-2">
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">{addr.addressType}</span>
                            {addr.useGroupAddress && <span className="text-[10px] bg-[#B8873A]/10 text-[#B8873A] px-1.5 py-0.5 rounded-full font-medium">Group</span>}
                          </div>
                          <p className="text-xs text-slate-700 leading-snug">
                            {[addr.addressLine1, addr.addressLine2, addr.addressLine3, addr.addressLine4, addr.city, addr.state, addr.country, addr.pin].filter(Boolean).join(", ")}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400">No addresses.</p>
                  )}
                </div>
              </div>
            </SectionCard>
          )}

      {/* Policies — main focus, shown right after Contact & Address */}
      <SectionCard title="Policies" icon={<FileText size={16} />}>
            <div className="space-y-3">
              {memberPolicies.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-4">No policies found for this member.</p>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-slate-200">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                        <th className="py-3 px-4 text-left">Policy Number</th>
                        <th className="py-3 px-4 text-left">Provider / Product</th>
                        <th className="py-3 px-4 text-right">Sum Assured</th>
                        <th className="py-3 px-4 text-right">Installment Premium</th>
                        <th className="py-3 px-4 text-center">Commencement Date</th>
                        <th className="py-3 px-4 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {memberPolicies.map((policy: any) => {
                        const statusDetails = getStatusBadge(policy.status?.statusName || "Active");
                        const StatusIcon = statusDetails.icon;
                        return (
                          <tr key={policy.id} className="hover:bg-[#0B1220]/[0.03] transition-colors">
                            <td className="py-3 px-4 font-semibold text-slate-900">
                              {canEdit ? (
                                <Link href={`/dashboard/lic/policies/edit/${policy.id}`} className="text-[#0B1220] hover:text-[#16294D] hover:underline">
                                  {policy.policyNumber}
                                </Link>
                              ) : (
                                policy.policyNumber
                              )}
                            </td>
                            <td className="py-3 px-4">
                              <div className="text-slate-900 font-semibold">{policy.provider?.name || "—"}</div>
                              <div className="text-xs text-slate-500">{policy.product?.productName || "—"}</div>
                            </td>
                            <td className="py-3 px-4 text-right text-slate-900 font-medium">
                              {policy.premium?.sumAssured ? `₹${policy.premium.sumAssured.toLocaleString("en-IN")}` : "—"}
                            </td>
                            <td className="py-3 px-4 text-right text-slate-900 font-medium">
                              {policy.premium?.installmentPremium ? `₹${policy.premium.installmentPremium.toLocaleString("en-IN")}` : "—"}
                              <span className="text-xs text-slate-400 block font-normal">{policy.premiumMode?.modeName || ""}</span>
                            </td>
                            <td className="py-3 px-4 text-center text-slate-600 font-medium">
                              {policy.commencementDate ? formatDate(policy.commencementDate) : "—"}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${statusDetails.className}`}>
                                <StatusIcon size={11} />
                                {policy.status?.statusName || "Active"}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </SectionCard>

          {/* Bank Details */}
          {c.bankDetails && c.bankDetails.length > 0 && (
            <SectionCard title="Bank Details" icon={<CreditCard size={16} />}>
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-[#0B1220] text-white text-xs font-semibold">
                      {["Default","IFSC Code","Bank Name","Branch","City","A/C Type","A/C No.","MICR No."].map((h) => (
                        <th key={h} className="py-2.5 px-3 text-left font-semibold text-xs">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {c.bankDetails.map((b, idx) => (
                      <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                        <td className="py-2.5 px-3">{b.isDefault ? <CheckCircle size={15} className="text-green-500" /> : <XCircle size={15} className="text-slate-300" />}</td>
                        <td className="py-2.5 px-3 font-mono text-xs">{b.ifscCode || "—"}</td>
                        <td className="py-2.5 px-3">{b.bankName || "—"}</td>
                        <td className="py-2.5 px-3">{b.bankBranch || "—"}</td>
                        <td className="py-2.5 px-3">{b.city || "—"}</td>
                        <td className="py-2.5 px-3">{b.accountType || "—"}</td>
                        <td className="py-2.5 px-3 font-mono text-xs">{b.accountNumber || "—"}</td>
                        <td className="py-2.5 px-3 font-mono text-xs">{b.micrNumber || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SectionCard>
          )}

          {/* Miscellaneous */}
          {c.miscInfo && (
            <SectionCard title="Miscellaneous Information" icon={<Info size={16} />}>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <InfoRow label="Relation to Group" value={c.miscInfo.relationToGroup} />
                <InfoRow label="Referred By" value={c.miscInfo.referredBy} />
                <InfoRow label="Nationality" value={c.miscInfo.nationality} />
                <InfoRow label="D.O.B (Greetings)" value={formatDate(c.miscInfo.dobForGreetings)} />
                <InfoRow label="Marriage Date" value={c.miscInfo.isMarried ? formatDate(c.miscInfo.marriageDate) : undefined} />
                <InfoRow label="Marital Status" value={c.miscInfo.isMarried ? "Married" : "Unmarried"} />
                <InfoRow label="Father Name" value={c.miscInfo.fatherName} />
                <InfoRow label="Mother Name" value={c.miscInfo.motherName} />
                <InfoRow label="Spouse Name" value={c.miscInfo.spouseName} />
                <InfoRow label="Occupation Type" value={c.miscInfo.occupationType} />
                <InfoRow label="Occupation" value={c.miscInfo.occupation} />
                <InfoRow label="Employer" value={c.miscInfo.employer} />
                <InfoRow label="Nature of Duties" value={c.miscInfo.natureOfDuties} />
                <InfoRow label="Height / Weight" value={c.miscInfo.heightFt || c.miscInfo.weightKg ? `${c.miscInfo.heightFt || "—"} Ft / ${c.miscInfo.weightKg || "—"} Kg` : undefined} />
                <InfoRow label="Income Slab" value={c.miscInfo.incomeSlab} />
                <InfoRow label="Religion" value={c.miscInfo.religion} />
                <InfoRow label="Passport No." value={c.miscInfo.passportNumber} />
                <InfoRow label="Passport Expiry" value={formatDate(c.miscInfo.passportExpiryDate)} />
                <InfoRow label="GST No." value={c.miscInfo.gstNumber} />
                <InfoRow label="CRM Groups" value={c.miscInfo.crmGroups} />
                {c.miscInfo.specialNote && (
                  <div className="sm:col-span-2 lg:col-span-3">
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">Special Note</span>
                    <p className="text-sm text-slate-700 bg-slate-50 rounded-lg p-3 border border-slate-200">{c.miscInfo.specialNote}</p>
                  </div>
                )}
              </div>
            </SectionCard>
          )}

          {/* Service Preferences */}
          {c.preferences && (
            <SectionCard title="Service Preferences" icon={<Settings size={16} />}>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <InfoRow label="Preferred Comm. Address" value={c.preferences.preferredCommAddress} />
                <div className="flex items-center gap-2">
                  {c.preferences.smsMarketing ? <CheckCircle size={15} className="text-green-500" /> : <XCircle size={15} className="text-slate-300" />}
                  <span className="text-sm text-slate-700 font-medium">SMS Marketing</span>
                </div>
                <div className="flex items-center gap-2">
                  {c.preferences.emailMarketing ? <CheckCircle size={15} className="text-green-500" /> : <XCircle size={15} className="text-slate-300" />}
                  <span className="text-sm text-slate-700 font-medium">Email Marketing</span>
                </div>
              </div>
            </SectionCard>
          )}

          {/* Communication & Notices History */}
          <SectionCard title={`Communication & Notices History (${customerLogs.length})`} icon={<Megaphone size={16} />}>
            {customerLogs.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">No recent SMS or Email notices recorded for this customer.</p>
            ) : (
              <div className="space-y-2">
                {customerLogs.map((log) => (
                  <div key={log.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className={`font-semibold px-2 py-0.5 rounded text-[10px] ${log.channel === "SMS" ? "bg-amber-100 text-amber-800" : "bg-blue-100 text-blue-800"}`}>
                          {log.channel}
                        </span>
                        <span className="font-semibold text-slate-800">{log.triggerType}</span>
                        {log.policyNumber && <span className="text-slate-500 font-mono">Policy: {log.policyNumber}</span>}
                      </div>
                      <p className="text-slate-600 line-clamp-1">{log.content}</p>
                    </div>
                    <div className="text-right">
                      <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full ${log.status === "SENT" ? "bg-emerald-50 text-emerald-700" : log.status === "SKIPPED" ? "bg-slate-100 text-slate-600" : "bg-red-50 text-red-700"}`}>
                        {log.status}
                      </span>
                      <p className="text-[10px] font-mono text-slate-400 mt-0.5">{new Date(log.createdAt).toLocaleDateString("en-IN")}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </div>

      <SectionCard title="Family History" icon={<Heart size={16} />}>
        {familyRecords.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-4">No family history records found for this member.</p>
        ) : (
          <div className="space-y-4">
            {familyRecords.map((fh) => {
              const memberName = fh.member
                ? [fh.member.salutation, fh.member.firstName, fh.member.middleName, fh.member.lastName].filter(Boolean).join(" ")
                : "Member";
              return (
                <div key={fh.id} className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-800">{memberName}</p>
                    <span className="text-xs text-slate-400">{formatDate(fh.date)}</span>
                  </div>
                  <div className="mt-3 space-y-3">
                    {(fh.records ?? []).map((rec, idx) => (
                      <div key={idx} className="rounded-lg border border-slate-100 bg-slate-50/60 p-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          <InfoRow label="Relation" value={rec.relation} />
                          <InfoRow label="Age" value={rec.age} />
                          <InfoRow label="State of Health" value={rec.stateOfHealth} />
                          <InfoRow label="Is Dead" value={rec.isDead ? "Yes" : "No"} />
                          {rec.isDead && <InfoRow label="Age at Death" value={rec.ageAtDeath} />}
                          {rec.isDead && <InfoRow label="Cause of Death" value={rec.causeOfDeath} />}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>

      <SectionCard title="Medical History" icon={<Activity size={16} />}>
        {medicalRecords.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-4">No medical history records found for this member.</p>
        ) : (
          <div className="space-y-4">
            {medicalRecords.map((med) => (
              <div key={med.id} className="rounded-xl border border-slate-200 bg-white p-4">
                <span className="text-xs text-slate-400">{formatDate(med.date)}</span>
                <div className="mt-3 space-y-4">
                  {(med.records ?? []).map((rec, idx) => (
                    <div key={idx} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      <InfoRow label="Blood Group" value={rec.bloodGroup} />
                      <InfoRow label="Blood Pressure" value={rec.bloodPressure} />
                      <InfoRow label="Pulse" value={rec.pulse} />
                      <InfoRow label="Height (cm)" value={rec.height} />
                      <InfoRow label="Weight (kg)" value={rec.weight} />
                      <InfoRow label="Chest (cm)" value={rec.chest} />
                      <InfoRow label="Abdomen (cm)" value={rec.abdomen} />
                      <InfoRow label="Identification Mark" value={rec.identificationMark} />
                      <InfoRow label="Spectacles" value={rec.spectaclesDetails} />
                      <InfoRow label="Dental Details" value={rec.dentalDetails} />
                      <InfoRow label="Major Illness" value={rec.majorIllness} />
                      <InfoRow label="Operation / Accident" value={rec.operationAccident} />
                      <InfoRow label="Special Report" value={rec.specialReport} />
                      <InfoRow label="Doctor Name" value={rec.doctorName} />
                      <InfoRow label="Medical Exam Date" value={formatDate(rec.medicalExaminationDate)} />
                      <InfoRow label="Medical History Date" value={formatDate(rec.medicalHistoryDate)} />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {/* Delete Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-50 rounded-lg"><AlertTriangle size={24} className="text-red-500" /></div>
              <h3 className="text-lg font-bold text-slate-900">Delete Customer</h3>
            </div>
            <p className="text-sm text-slate-500 mb-6 leading-relaxed">
              Are you sure you want to delete <strong>{fullName}</strong>? This will also remove all their contact info, addresses, bank details, and miscellaneous records.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button disabled={isDeleting} onClick={() => setShowDeleteModal(false)} className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-sm rounded-lg transition-colors">Cancel</button>
              <button disabled={isDeleting} onClick={handleDelete} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold text-sm rounded-lg shadow-sm transition-colors flex items-center gap-2">
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
