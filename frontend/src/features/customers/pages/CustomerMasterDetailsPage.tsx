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
  deleteFamilyHistory,
  clearCurrentGroup,
  type FamilyHistoryItem,
} from "@/features/customers/familyHistorySlice";
import {
  fetchMedicalHistoriesByMember,
  deleteMedicalHistory,
  clearMedicalRecords,
} from "@/features/customers/medicalHistorySlice";
import { fetchPoliciesByMember } from "@/features/policy/policySlice";
import {
  ArrowLeft, Phone, MapPin, CreditCard, Info, Settings,
  Edit, Trash2, AlertTriangle, ChevronRight, Star, Building,
  CheckCircle, XCircle, Heart, Plus, Activity, FileText,
} from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";

interface CustomerMasterDetailsPageProps {
  isModal?: boolean;
  customerId?: string;
  onClose?: () => void;
  onDeleted?: () => void;
  onOpenModal?: (type: CustomerModalEntry["type"], id?: string, extraId?: string) => void;
  modalStackLength?: number;
}

function InfoRow({ label, value }: { label: string; value?: string | null | boolean }) {
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
  const [activeSubTab, setActiveSubTab] = useState<"overview" | "family" | "medical" | "policies">("overview");

  // Lists are sourced from the Redux store (scoped to this member).
  const familyRecords = useSelector((s: RootState) => s.familyHistory.records);
  const medicalRecords = useSelector((s: RootState) => s.medicalHistory.records);
  const memberPolicies = useSelector((s: RootState) => s.policies.policies);

  const handleDeleteMedical = async (medId: string) => {
    if (confirm("Are you sure you want to delete this medical history record?")) {
      try {
        await dispatch(deleteMedicalHistory(medId)).unwrap();
        toast.success("Medical record deleted successfully");
      } catch (err: any) {
        toast.error(err || "Failed to delete record");
      }
    }
  };

  const handleDeleteFamily = async (fhId: string) => {
    if (confirm("Are you sure you want to delete this family history record?")) {
      try {
        await dispatch(deleteFamilyHistory(fhId)).unwrap();
        toast.success("Family history record deleted successfully");
      } catch (err: any) {
        toast.error(err || "Failed to delete record");
      }
    }
  };

  useEffect(() => {
    setIsMounted(true);
    if (id) {
      dispatch(fetchCustomerMaster(id));
      dispatch(fetchFamilyHistoriesByMember(id));
      dispatch(fetchMedicalHistoriesByMember(id));
      dispatch(fetchPoliciesByMember(id));
    }
    // Clear member-scoped history when this modal unmounts so a parent modal
    // (e.g. the group) never shows stale data for a different member.
    return () => {
      dispatch(clearCurrentGroup());
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

      {/* Sub tabs for Member Details */}
      <div className="flex border-b border-slate-200">
        <button
          type="button"
          onClick={() => setActiveSubTab("overview")}
          className={`px-5 py-3 text-sm font-semibold border-b-2 transition-all ${
            activeSubTab === "overview"
              ? "border-[#B8873A] text-[#0B1220]"
              : "border-transparent text-slate-400 hover:text-slate-600"
          }`}
        >
          Overview
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab("family")}
          className={`px-5 py-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
            activeSubTab === "family"
              ? "border-[#B8873A] text-[#0B1220]"
              : "border-transparent text-slate-400 hover:text-slate-600"
          }`}
        >
          Family History ({familyRecords.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab("medical")}
          className={`px-5 py-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
            activeSubTab === "medical"
              ? "border-[#B8873A] text-[#0B1220]"
              : "border-transparent text-slate-400 hover:text-slate-600"
          }`}
        >
          Medical History ({medicalRecords.length})
        </button>
      </div>

      {activeSubTab === "overview" && (
        <div className="space-y-6">
          {/* Contact Info */}
          {c.contactInfo && (
            <SectionCard title="Contact Information" icon={<Phone size={16} />}>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
            </SectionCard>
          )}

          {/* Addresses */}
          {c.addresses && c.addresses.length > 0 && (
            <SectionCard title="Addresses" icon={<MapPin size={16} />}>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {c.addresses.map((addr, idx) => (
                  <div key={idx} className="border border-slate-200 rounded-lg p-4 space-y-2">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">{addr.addressType}</span>
                      {addr.useGroupAddress && <span className="text-xs bg-[#B8873A]/10 text-[#B8873A] px-2 py-0.5 rounded-full font-medium">Uses Group Address</span>}
                    </div>
                    <p className="text-sm text-slate-700 leading-relaxed">
                      {[addr.addressLine1, addr.addressLine2, addr.addressLine3, addr.addressLine4, addr.city, addr.state, addr.country, addr.pin].filter(Boolean).join(", ")}
                    </p>
                  </div>
                ))}
              </div>
            </SectionCard>
          )}

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
        </div>
      )}

      {activeSubTab === "family" && (
        <SectionCard
          title="Family History"
          icon={<Heart size={16} />}
          headerActions={
            canEdit && (
              <button
                type="button"
                onClick={() => onOpenModal?.("family-create", id, c.groupId || undefined)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#0B1220] text-white rounded-lg text-xs font-semibold hover:bg-[#16294D] transition-colors cursor-pointer"
              >
                <Plus size={12} /> Add Record
              </button>
            )
          }
        >
          <div className="space-y-3">
            {familyRecords.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">No family history records found for this member.</p>
            ) : (
              familyRecords.map((fh) => {
                const memberName = fh.member
                  ? [fh.member.salutation, fh.member.firstName, fh.member.middleName, fh.member.lastName].filter(Boolean).join(" ")
                  : "Member";
                return (
                  <div key={fh.id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{memberName}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{fh.records?.length ?? 0} relation{(fh.records?.length ?? 0) !== 1 ? "s" : ""} &bull; {formatDate(fh.date)}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button type="button" onClick={() => onOpenModal?.("family-details", fh.id)} className="inline-flex items-center gap-1 px-2.5 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg text-xs font-semibold transition-colors cursor-pointer">View</button>
                      {canEdit && (
                        <>
                          <button type="button" onClick={() => onOpenModal?.("family-edit", fh.id)} className="inline-flex items-center gap-1 px-2.5 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg text-xs font-semibold transition-colors cursor-pointer"><Edit size={11} /> Edit</button>
                          <button type="button" onClick={() => handleDeleteFamily(fh.id)} className="inline-flex items-center gap-1 px-2.5 py-1.5 border border-red-200 hover:bg-red-50 text-red-600 rounded-lg text-xs font-semibold transition-colors cursor-pointer"><Trash2 size={11} /> Delete</button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </SectionCard>
      )}

      {activeSubTab === "medical" && (
        <SectionCard
          title="Medical History"
          icon={<Activity size={16} />}
          headerActions={
            canEdit && (
              <button
                type="button"
                onClick={() => onOpenModal?.("medical-create", id)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#0B1220] text-white rounded-lg text-xs font-semibold hover:bg-[#16294D] transition-colors cursor-pointer"
              >
                <Plus size={12} /> Add Record
              </button>
            )
          }
        >
          <div className="space-y-3">
            {medicalRecords.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">No medical history records found for this member.</p>
            ) : (
              medicalRecords.flatMap((med) =>
                (med.records ?? []).map((rec, idx) => (
                  <div key={`${med.id}-${rec.id ?? idx}`} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-slate-800 truncate">{rec.bloodGroup}</p>
                        {rec.doctorName && (
                          <span className="inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                            Dr. {rec.doctorName}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Exam Date: {formatDate(rec.medicalHistoryDate || med.date)}
                        {rec.medicalExaminationDate ? ` &bull; Examined: ${formatDate(rec.medicalExaminationDate)}` : ""}
                        {rec.bloodPressure ? ` &bull; BP: ${rec.bloodPressure}` : ""}
                        {rec.pulse ? ` &bull; Pulse: ${rec.pulse}` : ""}
                      </p>
                      {rec.majorIllness && <p className="text-xs text-slate-500 italic mt-1 bg-slate-50 p-1.5 rounded">Major Illness: {rec.majorIllness}</p>}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {canEdit && (
                        <>
                          <button type="button" onClick={() => onOpenModal?.("medical-edit", med.id, id)} className="inline-flex items-center gap-1 px-2.5 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg text-xs font-semibold transition-colors cursor-pointer"><Edit size={11} /> Edit</button>
                          <button type="button" onClick={() => handleDeleteMedical(med.id)} className="inline-flex items-center gap-1 px-2.5 py-1.5 border border-red-200 hover:bg-red-50 text-red-600 rounded-lg text-xs font-semibold transition-colors cursor-pointer"><Trash2 size={11} /> Delete</button>
                        </>
                      )}
                    </div>
                  </div>
                ))
              )
            )}
          </div>
        </SectionCard>
      )}

      {/* Policies — shown in the customer's Overview (no separate tab), so it
          does NOT appear inside the Family History or Medical History tabs. */}
      {activeSubTab === "overview" && (
        <SectionCard
          title="Policies"
          icon={<FileText size={16} />}
          headerActions={
            canEdit && (
              <Link
                href="/dashboard/lic/policies/new"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#0B1220] text-white rounded-lg text-xs font-semibold hover:bg-[#16294D] transition-colors cursor-pointer"
              >
                <Plus size={12} /> Create Policy
              </Link>
            )
          }
        >
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
      )}

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
