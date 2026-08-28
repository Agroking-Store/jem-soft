"use client";

import CustomerModuleNav from "@/features/customers/components/CustomerModuleNav";
import type { CustomerModalEntry } from "@/features/customers/components/CustomerModalStack";

import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useRouter, useParams } from "next/navigation";
import type { RootState, AppDispatch } from "@/store/store";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { fetchCustomer, deleteCustomer } from "@/features/customers/customerSlice";
import { fetchCustomersMaster, deleteCustomerMaster } from "@/features/customers/customerMasterSlice";
import {
  ArrowLeft,
  Eye,
  Mail,
  Phone,
  Calendar,
  SquarePen,
  Trash2,
  Clock,
  AlertTriangle,
  Users,
  MapPin,
  Home,
  Briefcase,
  Tag,
  ChevronRight,
  Star,
  CheckCircle,
  XCircle,
  AlertCircle,
  FileText,
  Plus,
} from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";

interface CustomerDetailsPageProps {
  isModal?: boolean;
  customerId?: string;
  onClose?: () => void;
  onDeleted?: () => void;
  onOpenModal?: (type: CustomerModalEntry["type"], id?: string, extraId?: string) => void;
  modalStackLength?: number;
}

function InfoRow({ label, value, icon: Icon }: { label: string; value?: string | null; icon?: any }) {
  if (!value) return null;
  return (
    <div className="flex flex-col rounded-xl border border-[#F1F3F6] bg-[#F8F9FB] p-3.5 transition-all duration-200 hover:border-blue-100 hover:bg-white hover:shadow-sm">
      <div className="flex items-center gap-1.5 mb-1">
        {Icon && <Icon size={12} className="text-[#8E99AF]" />}
        <span className="text-[10px] font-bold uppercase tracking-wider text-[#8E99AF]">{label}</span>
      </div>
      <span className="text-[13px] font-semibold text-[#2D3748] break-words">{value}</span>
    </div>
  );
}

function SectionCard({
  title,
  icon,
  children,
  headerActions,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  headerActions?: React.ReactNode;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#1877F2] via-[#1877F2]/40 to-transparent" />
      <div className="flex items-center justify-between px-5 py-3.5 bg-slate-50/80 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <span className="flex items-center justify-center w-7 h-7 rounded-xl bg-blue-50 text-[#1877F2] shrink-0">{icon}</span>
          <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider">{title}</h2>
        </div>
        {headerActions}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function formatDate(dateStr?: string | null) {
  if (!dateStr) return "-";
  try {
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "-";
  }
}

function getAddressLines(parts: Array<string | null | undefined>) {
  return parts.filter(Boolean);
}

function getFullName(customer: {
  salutation?: string | null;
  firstName: string;
  middleName?: string | null;
  lastName?: string | null;
}) {
  return [customer.salutation, customer.firstName, customer.middleName, customer.lastName]
    .filter(Boolean)
    .join(" ");
}

const getStatusBadge = (status: string) => {
  const statusMap = {
    Active: { color: "bg-green-100 text-green-700", icon: CheckCircle },
    Pending: { color: "bg-yellow-100 text-yellow-700", icon: Clock },
    Lapsed: { color: "bg-red-100 text-red-700", icon: XCircle },
    Completed: { color: "bg-blue-50 text-blue-700", icon: CheckCircle },
  };
  const StatusIcon = statusMap[status as keyof typeof statusMap]?.icon || AlertCircle;
  return {
    className: statusMap[status as keyof typeof statusMap]?.color || "bg-gray-100 text-gray-700",
    icon: StatusIcon,
  };
};

export default function CustomerDetailsPage({
  isModal = false,
  customerId,
  onClose,
  onDeleted,
  onOpenModal,
  modalStackLength,
}: CustomerDetailsPageProps = {}) {
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  const params = useParams();
  const id = customerId || (params.id as string);

  const { user } = useAuth();
  const { currentCustomer, isLoading, error } = useSelector((s: RootState) => s.customers);
  const { customers: masterCustomers } = useSelector((s: RootState) => s.customerMaster);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<"overview" | "members">("overview");

  useEffect(() => {
    if (id) {
      dispatch(fetchCustomer(id));
      dispatch(fetchCustomersMaster());
    }
  }, [dispatch, id, modalStackLength]);

  const handleDeleteMember = async (memberId: string, memberName: string) => {
    if (confirm(`Are you sure you want to delete ${memberName}?`)) {
      try {
        await dispatch(deleteCustomerMaster(memberId)).unwrap();
        toast.success("Member deleted successfully");
        if (id) {
          dispatch(fetchCustomer(id));
        }
      } catch (err: any) {
        toast.error(err || "Failed to delete member");
      }
    }
  };

  const canEdit = user?.role === "ADMIN" || user?.role === "ADVISOR";
  const groupMembers = masterCustomers.filter((customer) => customer.groupId === id);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await dispatch(deleteCustomer(id)).unwrap();
      toast.success("Customer group deleted successfully");
      if (isModal) onDeleted?.();
      else router.push("/dashboard/customers");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to delete customer group");
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  if (isLoading && !currentCustomer) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1877F2]" />
      </div>
    );
  }

  if (error && !currentCustomer) {
    return (
      <div className="max-w-3xl mx-auto text-center py-16 px-4">
        <h3 className="text-lg font-semibold text-slate-900 mb-2">Error Loading Customer Group</h3>
        <p className="text-slate-500 mb-6">{error}</p>
        <button
          type="button"
          onClick={() => (isModal ? onClose?.() : router.push("/dashboard/customers"))}
          className="inline-flex items-center justify-center px-4 py-2 bg-gradient-to-r from-[#5c67ff] to-[#3a47ff] text-white rounded-xl font-semibold text-sm hover:brightness-110 transition-all shadow-md shadow-blue-200"
        >
          Back to Customers
        </button>
      </div>
    );
  }

  if (!currentCustomer) return null;

  const groupName = currentCustomer.groupName || currentCustomer.name;

  const residenceAddress = getAddressLines([
    currentCustomer.resAddressLine1,
    currentCustomer.resAddressLine2,
    currentCustomer.resAddressLine3,
    currentCustomer.resAddressLine4,
  ]);

  const officeAddress = getAddressLines([
    currentCustomer.offAddressLine1,
    currentCustomer.offAddressLine2,
    currentCustomer.offAddressLine3,
    currentCustomer.offAddressLine4,
  ]);

  return (
    <div className={`mx-auto space-y-6 pb-8 ${isModal ? "max-w-5xl" : "max-w-7xl"}`}>
      {!isModal && <CustomerModuleNav />}

      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => (isModal ? onClose?.() : router.push("/dashboard/customers"))}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition-all hover:bg-blue-50 hover:text-[#1877F2] hover:border-blue-200"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <nav className="flex items-center gap-1 text-xs text-slate-400 mb-0.5">
              <button type="button" onClick={() => (isModal ? onClose?.() : router.push("/dashboard/customers"))} className="hover:text-[#1877F2]">Customer Group</button>
              <ChevronRight size={12} />
              <span className="text-slate-600 font-medium">{groupName}</span>
            </nav>
            <h1 className="text-xl font-bold text-[#0f172a]">Customer Group Details</h1>
          </div>
        </div>

        {canEdit && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => (isModal ? onOpenModal?.("group-edit", currentCustomer.id) : router.push(`/dashboard/customers/${currentCustomer.id}/edit`))}
              className="inline-flex items-center gap-1.5 px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 hover:border-blue-200 hover:text-[#1877F2] text-slate-700 rounded-xl font-semibold text-sm transition-all shadow-sm"
            >
              <SquarePen size={14} />
              Edit
            </button>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-rose-200 bg-white text-sm font-semibold text-rose-600 transition-all hover:bg-rose-50 shadow-sm"
            >
              <Trash2 size={14} />
              Delete
            </button>
          </div>
        )}
      </div>

      <div className="overflow-hidden rounded-2xl border border-blue-100 bg-[#f0f7ff] shadow-sm">
        <div className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-b from-[#1e3a8a] to-[#2563eb] text-white flex items-center justify-center text-2xl font-bold shadow-lg shadow-blue-200/50">
                {groupName.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2.5">
                  <h2 className="text-2xl font-bold text-[#0f172a]">{groupName}</h2>
                  {currentCustomer.groupCode && (
                    <span className="bg-[#1e293b] text-white text-xs font-bold tracking-widest px-3 py-1 rounded-xl shadow-sm border border-slate-700 font-mono">
                      {currentCustomer.groupCode}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-slate-500 font-medium">
                  {currentCustomer.category && (
                    <span className="inline-flex items-center gap-1.5 bg-white border border-blue-100 px-2.5 py-0.5 rounded-lg text-xs font-semibold text-blue-700">
                      <Tag size={12} />
                      {currentCustomer.category}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1.5 bg-white border border-slate-200 px-2.5 py-0.5 rounded-lg text-xs font-semibold text-slate-600">
                    <Users size={12} />
                    {groupMembers.length} member{groupMembers.length === 1 ? "" : "s"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white/70 border-t border-blue-100">
          <InfoRow label="Portal Email" value={currentCustomer.email} icon={Mail} />
          <InfoRow label="Phone" value={currentCustomer.phone} icon={Phone} />
          <InfoRow label="Preferred Comm. Address" value={currentCustomer.prefCommAddress} icon={MapPin} />
        </div>
      </div>

      {/* Sub tabs for Group Details */}
      <div className="flex gap-2 border-b border-slate-200 pb-2">
        <button
          type="button"
          onClick={() => setActiveSubTab("overview")}
          className={`px-5 py-2.5 text-sm font-bold rounded-xl transition-all ${
            activeSubTab === "overview"
              ? "bg-[#1877F2] text-white shadow-md shadow-blue-200"
              : "text-slate-500 hover:text-[#1877F2] hover:bg-blue-50/50"
          }`}
        >
          Overview
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab("members")}
          className={`px-5 py-2.5 text-sm font-bold rounded-xl transition-all flex items-center gap-2 ${
            activeSubTab === "members"
              ? "bg-[#1877F2] text-white shadow-md shadow-blue-200"
              : "text-slate-500 hover:text-[#1877F2] hover:bg-blue-50/50"
          }`}
        >
          Members <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${activeSubTab === "members" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"}`}>{groupMembers.length}</span>
        </button>
      </div>

      {activeSubTab === "overview" && (
        <div className="space-y-6">
          <SectionCard title="Contact Information" icon={<Phone size={16} />}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              <InfoRow label="Mobile Personal" value={currentCustomer.mobilePersonal} icon={Phone} />
              <InfoRow label="E-Mail Personal" value={currentCustomer.emailPersonal} icon={Mail} />
              <InfoRow label="Mobile Business" value={currentCustomer.mobileBusiness} icon={Phone} />
              <InfoRow label="E-Mail Business" value={currentCustomer.emailBusiness} icon={Mail} />
              <InfoRow label="Portal Email" value={currentCustomer.email} icon={Mail} />
              <InfoRow label="Portal Phone" value={currentCustomer.phone} icon={Phone} />
            </div>
          </SectionCard>

          <SectionCard title="Addresses" icon={<MapPin size={16} />}>
            <div className="space-y-5">
              {/* Residence */}
              <div className="border border-slate-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                  <Home size={13} />
                  Residence
                </div>

                <div className="space-y-1 text-sm text-slate-700">
                  {residenceAddress.length ? (
                    residenceAddress.map((line, index) => (
                      <p key={index}>{line}</p>
                    ))
                  ) : (
                    <p>-</p>
                  )}

                  <p>
                    {[
                      currentCustomer.resCity,
                      currentCustomer.resState,
                      currentCustomer.resCountry,
                      currentCustomer.resPin,
                    ]
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-4">
                  <InfoRow label="City" value={currentCustomer.resCity} />
                  <InfoRow label="Area" value={currentCustomer.resArea} />
                </div>
              </div>

              {/* Office */}
              <div className="border border-slate-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                  <Briefcase size={13} />
                  Office
                </div>

                <div className="space-y-1 text-sm text-slate-700">
                  {officeAddress.length ? (
                    officeAddress.map((line, index) => (
                      <p key={index}>{line}</p>
                    ))
                  ) : (
                    <p>-</p>
                  )}

                  <p>
                    {[
                      currentCustomer.offCity,
                      currentCustomer.offState,
                      currentCustomer.offCountry,
                      currentCustomer.offPin,
                    ]
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-4">
                  <InfoRow label="City" value={currentCustomer.offCity} />
                  <InfoRow label="Area" value={currentCustomer.offArea} />
                </div>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Record Details" icon={<Calendar size={16} />}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-slate-50 rounded-lg text-slate-400">
                  <Calendar size={18} />
                </div>
                <div>
                  <p className="text-xs text-slate-400">Created At</p>
                  <p className="text-slate-900 font-medium mt-0.5">{formatDate(currentCustomer.createdAt)}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="p-2 bg-slate-50 rounded-lg text-slate-400">
                  <Clock size={18} />
                </div>
                <div>
                  <p className="text-xs text-slate-400">Last Updated</p>
                  <p className="text-slate-900 font-medium mt-0.5">{formatDate(currentCustomer.updatedAt)}</p>
                </div>
              </div>
            </div>
          </SectionCard>
        </div>
      )}

      {activeSubTab === "members" && (
        <SectionCard
          title="Group Members"
          icon={<Users size={16} />}
          headerActions={
            canEdit && (
              <button
                type="button"
                onClick={() => onOpenModal?.("master-create", currentCustomer.id)}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-[#5c67ff] to-[#3a47ff] hover:brightness-110 text-white rounded-xl text-xs font-semibold shadow-md shadow-blue-200 transition-all cursor-pointer"
              >
                <Plus size={13} /> Add Member
              </button>
            )
          }
        >
          {groupMembers.length === 0 ? (
            <div className="text-center py-10">
              <Users size={28} className="text-slate-300 mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-slate-800 mb-1">No members mapped</h3>
              <p className="text-sm text-slate-500 mb-4">Create an individual customer and select this group.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-100">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50/70 border-b border-slate-100 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    <th className="py-3 px-4 text-left">Name</th>
                    <th className="py-3 px-4 text-left">Relation</th>
                    <th className="py-3 px-4 text-left">Contact</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    {canEdit && <th className="py-3 px-4 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {groupMembers.map((member) => {
                    const fullName = getFullName(member);
                    return (
                      <tr key={member.id} className="hover:bg-blue-50/40 transition-colors">
                        <td className="py-3 px-4">
                          <button
                            type="button"
                            onClick={() => onOpenModal?.("master-details", member.id)}
                            className="font-semibold text-slate-900 hover:text-[#1877F2] transition-colors flex items-center gap-1 group"
                          >
                            {fullName}
                            <ChevronRight size={13} className="opacity-0 group-hover:opacity-100 transition-opacity text-[#1877F2]" />
                          </button>
                          <span className="text-xs text-slate-400">{member.customerType || "Customer"}</span>
                        </td>
                        <td className="py-3 px-4 text-slate-600 font-medium">{member.miscInfo?.relationToGroup || "-"}</td>
                        <td className="py-3 px-4">
                          <div className="space-y-1">
                            {member.contactInfo?.mobile1 && (
                              <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
                                <Phone size={11} />
                                {member.contactInfo.mobile1}
                              </div>
                            )}
                            {member.contactInfo?.emailPersonal && (
                              <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                                <Mail size={11} />
                                {member.contactInfo.emailPersonal}
                              </div>
                            )}
                            {!member.contactInfo?.mobile1 && !member.contactInfo?.emailPersonal && (
                              <span className="text-xs text-slate-300">-</span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          {member.isGroupHead ? (
                            <span className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-xl bg-blue-50 text-blue-700">
                              <Star size={11} />
                              Head
                            </span>
                          ) : (
                            <span className="inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-500">
                              Member
                            </span>
                          )}
                        </td>
                        {canEdit && (
                          <td className="py-3 px-4 text-right">
                            <div className="flex justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => onOpenModal?.("master-details", member.id)}
                                className="p-2 text-slate-500 hover:text-[#1877F2] hover:bg-blue-50 border border-slate-200 hover:border-blue-200 rounded-xl transition-all cursor-pointer"
                                title="View Member"
                              >
                                <Eye size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={() => onOpenModal?.("master-edit", member.id)}
                                className="p-2 text-[#1877F2] hover:bg-blue-50 border border-blue-100 hover:border-blue-300 rounded-xl transition-all cursor-pointer"
                                title="Edit Member"
                              >
                                <SquarePen size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteMember(member.id, fullName)}
                                className="p-2 text-rose-600 hover:bg-rose-50 border border-rose-100 hover:border-rose-300 rounded-xl transition-all cursor-pointer"
                                title="Delete Member"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>
      )}

      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 text-red-600 mb-4">
              <div className="p-2 bg-red-50 rounded-lg">
                <AlertTriangle size={24} />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Delete Customer Group</h3>
            </div>
            <p className="text-sm text-slate-500 mb-6 leading-relaxed">
              Are you sure you want to delete <strong>{groupName}</strong>? This action is permanent.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                disabled={isDeleting}
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-sm rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                disabled={isDeleting}
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold text-sm rounded-lg shadow-sm transition-colors flex items-center gap-2"
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}