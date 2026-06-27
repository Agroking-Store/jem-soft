"use client";

import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useRouter, useParams } from "next/navigation";
import type { RootState, AppDispatch } from "@/store/store";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { fetchCustomerMaster, deleteCustomerMaster } from "@/features/customers/customerMasterSlice";
import {
  ArrowLeft, User, Phone, MapPin, CreditCard, Info, Settings,
  Edit, Trash2, AlertTriangle, ChevronRight, Star, Building,
  Mail, CheckCircle, XCircle, Calendar,
} from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";

function InfoRow({ label, value }: { label: string; value?: string | null | boolean }) {
  if (value === undefined || value === null || value === "") return null;
  return (
    <div className="flex flex-col">
      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-0.5">{label}</span>
      <span className="text-sm text-slate-800 font-medium">{String(value)}</span>
    </div>
  );
}

function SectionCard({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="flex items-center gap-2.5 px-5 py-3.5 bg-slate-50 border-b border-slate-200">
        <span className="text-blue-500">{icon}</span>
        <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">{title}</h2>
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

export default function CustomerMasterDetailsPage() {
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const { user } = useAuth();
  const { currentCustomer, isLoading, error } = useSelector((s: RootState) => s.customerMaster);

  const [isMounted, setIsMounted] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    if (id) dispatch(fetchCustomerMaster(id));
  }, [dispatch, id]);

  const canEdit = isMounted && (user?.role === "ADMIN" || user?.role === "ADVISOR");

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await dispatch(deleteCustomerMaster(id)).unwrap();
      toast.success("Customer deleted successfully");
      router.push("/dashboard/customers?tab=master");
    } catch (err: any) {
      toast.error(err || "Failed to delete customer");
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  if (!isMounted || (isLoading && !currentCustomer)) {
    return <div className="flex items-center justify-center min-h-[60vh]"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" /></div>;
  }

  if (error && !currentCustomer) {
    return (
      <div className="max-w-3xl mx-auto text-center py-16 px-4">
        <h3 className="text-lg font-semibold text-slate-900 mb-2">Error Loading Customer</h3>
        <p className="text-slate-500 mb-6">{error}</p>
        <Link href="/dashboard/customers?tab=master" className="inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold text-sm hover:bg-blue-700 transition-colors">Back to Customers</Link>
      </div>
    );
  }

  const c = currentCustomer;
  if (!c) return null;

  const fullName = [c.salutation, c.firstName, c.middleName, c.lastName].filter(Boolean).join(" ");

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/customers?tab=master" className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors">
            <ArrowLeft size={16} />
          </Link>
          <div>
            <nav className="flex items-center gap-1 text-xs text-slate-400 mb-0.5">
              <Link href="/dashboard/customers?tab=master" className="hover:text-slate-600">Customer Master</Link>
              <ChevronRight size={12} />
              <span className="text-slate-600 font-medium">{fullName}</span>
            </nav>
            <h1 className="text-xl font-bold text-slate-900">Customer Details</h1>
          </div>
        </div>
        {canEdit && (
          <div className="flex items-center gap-2">
            <Link href={`/dashboard/customers/master/${id}/edit`} className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg font-semibold text-sm transition-colors">
              <Edit size={14} /> Edit
            </Link>
            <button onClick={() => setShowDeleteModal(true)} className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-red-200 hover:bg-red-50 text-red-600 rounded-lg font-semibold text-sm transition-colors">
              <Trash2 size={14} /> Delete
            </button>
          </div>
        )}
      </div>

      {/* Hero card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 p-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur text-white flex items-center justify-center text-2xl font-bold shadow-sm border border-white/30">
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
                  {addr.useGroupAddress && <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-medium">Uses Group Address</span>}
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
                <tr className="bg-gradient-to-r from-orange-500 to-orange-400 text-white">
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
