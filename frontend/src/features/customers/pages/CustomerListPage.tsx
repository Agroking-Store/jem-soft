"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  Building2,
  ChevronRight,
  Eye,
  Mail,
  Phone,
  Plus,
  Search,
  SquarePen,
  Star,
  Trash2,
  UserCog,
  Users,
} from "lucide-react";
import toast from "react-hot-toast";

import type { AppDispatch, RootState } from "@/store/store";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { deleteCustomer, fetchCustomers } from "@/features/customers/customerSlice";
import { deleteCustomerMaster, fetchCustomersMaster } from "@/features/customers/customerMasterSlice";
import { fetchFamilyHistoriesByMember } from "@/features/customers/familyHistorySlice";
import { fetchMedicalHistoriesByMember } from "@/features/customers/medicalHistorySlice";
import FamilyHistoryForm from "../forms/FamilyHistoryForm";
import FamilyHistoryView from "../forms/FamilyHistoryView";
import MedicalHistoryForm from "../forms/MedicalHistoryForm";
import CustomerCreatePage from "./CustomerCreatePage";
import CustomerDetailsPage from "./CustomerDetailsPage";
import CustomerEditPage from "./CustomerEditPage";
import CustomerMasterCreatePage from "./CustomerMasterCreatePage";
import CustomerMasterDetailsPage from "./CustomerMasterDetailsPage";
import CustomerMasterEditPage from "./CustomerMasterEditPage";
import CustomerModuleNav from "@/features/customers/components/CustomerModuleNav";
import {
  CustomerModalShell,
  type CustomerModalEntry,
} from "@/features/customers/components/CustomerModalStack";
import {
  CustomerEmptyState,
  CustomerTableFrame,
} from "@/features/customers/components/CustomerUi";

const CATEGORY_DOT: Record<string, string> = {
  Client: "bg-slate-900",
  Personal: "bg-amber-500",
  Others: "bg-slate-400",
  Prospect: "bg-emerald-500",
};

type Tab = "group" | "master";
type DeleteTarget = {
  id: string;
  type: "group" | "master";
  label: string;
} | null;

type ModalType = CustomerModalEntry["type"];

function getErrorMessage(error: unknown, fallback: string) {
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message;
  return fallback;
}

function getFullName(customer: {
  salutation?: string | null;
  firstName: string;
  middleName?: string | null;
  lastName?: string | null;
}) {
  return [
    customer.salutation,
    customer.firstName,
    customer.middleName,
    customer.lastName,
  ]
    .filter(Boolean)
    .join(" ");
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function Seal({ name, size = 36 }: { name: string; size?: number }) {
  return (
    <div
      style={{ width: size, height: size, minWidth: size }}
      className="flex shrink-0 items-center justify-center rounded-xl bg-gradient-to-b from-[#1e3a8a] to-[#2563eb] font-bold text-white shadow-sm"
    >
      <span style={{ fontSize: size * 0.36, lineHeight: 1 }}>{getInitials(name)}</span>
    </div>
  );
}

function Chip({ dotColor, children }: { dotColor: string; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700">
      <span className={`h-1.5 w-1.5 rounded-full ${dotColor}`} />
      {children}
    </span>
  );
}

function TableHeadCell({
  children,
  align = "left",
}: {
  children: ReactNode;
  align?: "left" | "center" | "right";
}) {
  return (
    <th
      className={`sticky top-0 z-10 border-b border-slate-100 bg-slate-50/70 px-4 py-3 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400 ${
        align === "center" ? "text-center" : align === "right" ? "text-right" : "text-left"
      }`}
    >
      {children}
    </th>
  );
}

export default function CustomerListPage() {
  const dispatch = useDispatch<AppDispatch>();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { customers, isLoading, error } = useSelector(
    (s: RootState) => s.customers,
  );
  const {
    customers: masterCustomers,
    isLoading: isMasterLoading,
    error: masterError,
  } = useSelector((s: RootState) => s.customerMaster);

  const paramTab = searchParams.get("tab");
  const activeTab: Tab = paramTab === "master" ? "master" : "group";

  const [searchTerm, setSearchTerm] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [modalStack, setModalStack] = useState<CustomerModalEntry[]>([]);
  const showListChrome = true;

  useEffect(() => {
    dispatch(fetchCustomers());
    dispatch(fetchCustomersMaster());
  }, [dispatch]);

  useEffect(() => {
    setIsClient(true);
    setMounted(true);
  }, []);

  const canEdit = mounted && (user?.role === "ADMIN" || user?.role === "ADVISOR");

  const groupMemberCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    masterCustomers.forEach((customer) => {
      if (!customer.groupId) return;
      counts[customer.groupId] = (counts[customer.groupId] || 0) + 1;
    });
    return counts;
  }, [masterCustomers]);

  const filteredCustomers = customers.filter((customer) => {
    const query = searchTerm.toLowerCase();
    return (
      (customer.groupName || customer.name).toLowerCase().includes(query) ||
      (customer.groupCode || "").toLowerCase().includes(query) ||
      (customer.category || "").toLowerCase().includes(query)
    );
  });

  const filteredMasterCustomers = masterCustomers.filter((customer) => {
    const query = searchTerm.toLowerCase();
    const fullName = getFullName(customer).toLowerCase();
    const groupLabel = `${customer.group?.groupCode || ""} ${customer.group?.groupName || ""}`.toLowerCase();
    return (
      fullName.includes(query) ||
      groupLabel.includes(query) ||
      (customer.contactInfo?.mobile1 || "").toLowerCase().includes(query) ||
      (customer.contactInfo?.emailPersonal || "").toLowerCase().includes(query) ||
      (customer.customerType || "").toLowerCase().includes(query)
    );
  });

  useEffect(() => {
    setSearchTerm("");
  }, [activeTab]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      if (deleteTarget.type === "group") {
        await dispatch(deleteCustomer(deleteTarget.id)).unwrap();
        toast.success("Customer group deleted successfully");
      } else {
        await dispatch(deleteCustomerMaster(deleteTarget.id)).unwrap();
        toast.success("Customer deleted successfully");
      }
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "Failed to delete"));
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  };

  const openModal = (type: ModalType, id?: string, extraId?: string) => {
    setModalStack((previous) => {
      const key = `${type}-${id || "new"}-${Date.now()}`;
      let entry: CustomerModalEntry;
      if (type === "family-create") {
        entry = { key, type, memberId: id, groupId: extraId };
      } else if (type === "master-create") {
        entry = { key, type, groupId: id };
      } else if (type === "medical-create") {
        entry = { key, type, memberId: id || "" };
      } else if (type === "medical-edit") {
        entry = { key, type, id: id || "", memberId: extraId || "" };
      } else {
        entry = { key, type, ...(id ? { id } : {}) } as any;
      }
      return [...previous, entry];
    });
  };

  const closeTopModal = () => {
    setModalStack((previous) => previous.slice(0, -1));
  };

  const closeModalAt = (index: number) => {
    setModalStack((previous) => previous.slice(0, index));
  };

  const handleModalMutation = () => {
    dispatch(fetchCustomers());
    dispatch(fetchCustomersMaster());
    closeTopModal();
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const modalParam = params.get("modal");
      const idParam = params.get("id");

      if (modalParam) {
        // Strip modal query parameters from the browser address bar immediately
        params.delete("modal");
        params.delete("id");
        const newSearch = params.toString();
        const newUrl = `${window.location.pathname}${newSearch ? `?${newSearch}` : ""}`;
        window.history.replaceState(null, "", newUrl);

        // Open the modal
        openModal(modalParam as ModalType, idParam || undefined);
      }
    }
  }, [searchParams]);

  const deleteTitle = deleteTarget?.type === "master" ? "Delete Customer" : "Delete Customer Group";
  const deleteText =
    deleteTarget?.type === "master"
      ? "This will remove the customer and all linked contact, address, bank, and preference details."
      : "This will remove the customer group and related portal access.";

  const activeContent = (
      <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#1877F2] via-[#1877F2]/40 to-transparent" />
        {activeTab === "group" ? (
          isLoading && customers.length === 0 ? (
            <div className="flex min-h-[18rem] items-center justify-center">
              <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-[#1877F2]" />
            </div>
          ) : error && customers.length === 0 ? (
            <CustomerEmptyState
              title="Failed to load customer groups"
              description={error}
              action={
                <button
                  onClick={() => dispatch(fetchCustomers())}
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#5c67ff] to-[#3a47ff] px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-200 transition-all hover:brightness-110"
                >
                  Try Again
                </button>
              }
            />
          ) : filteredCustomers.length === 0 ? (
            <CustomerEmptyState
              title="No customer groups found"
              description={
                searchTerm
                  ? "No groups match your search. Try a different keyword."
                  : "Start building your customer base by adding a new group."
              }
              action={
                isClient && canEdit && !searchTerm ? (
                  <button
                    type="button"
                    onClick={() => openModal("group-create")}
                    className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#5c67ff] to-[#3a47ff] px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-200 transition-all hover:brightness-110"
                  >
                    <Plus size={16} />
                    Add First Group
                  </button>
                ) : undefined
              }
            />
          ) : (
            <CustomerTableFrame
              footer={
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>
                    Showing <strong className="text-slate-700">{filteredCustomers.length}</strong> of{" "}
                    <strong className="text-slate-700">{customers.length}</strong> groups
                  </span>
                </div>
              }
            >
              <table className="min-w-full border-separate border-spacing-0 text-left text-sm">
                <thead>
                  <tr>
                    <TableHeadCell>Group Code</TableHeadCell>
                    <TableHeadCell>Group Name</TableHeadCell>
                    <TableHeadCell>Category</TableHeadCell>
                    <TableHeadCell align="center">Members</TableHeadCell>
                    {isClient && canEdit && <TableHeadCell align="right">Actions</TableHeadCell>}
                  </tr>
                </thead>
                <tbody>
                  {filteredCustomers.map((customer, index) => {
                    const dotColor = CATEGORY_DOT[customer.category || ""] ?? "bg-slate-400";
                    const memberCount = groupMemberCounts[customer.id] || 0;
                    const displayName = customer.groupName || customer.name;

                    return (
                      <tr
                        key={customer.id}
                        onClick={() => openModal("group-details", customer.id)}
                        className={`group cursor-pointer border-b border-slate-100 transition-colors hover:bg-blue-50/40 ${
                          index % 2 === 0 ? "bg-white" : "bg-slate-50/30"
                        }`}
                      >
                        <td className="px-4 py-4 align-top">
                          <span className="inline-flex rounded-lg bg-[#f1f5f9] px-3 py-1.5 font-mono text-xs font-semibold text-[#475569]">
                            {customer.groupCode || "-"}
                          </span>
                        </td>
                        <td className="px-4 py-4 align-top">
                          <div className="flex items-start gap-3 text-left">
                            <Seal name={displayName} size={36} />
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="font-semibold text-slate-900 transition-colors group-hover:text-[#1877F2]">
                                  {displayName}
                                </span>
                                <ChevronRight
                                  size={13}
                                  className="text-[#1877F2] opacity-0 transition-opacity group-hover:opacity-100"
                                />
                              </div>
                              {customer.email && <div className="mt-0.5 truncate text-xs text-slate-400">{customer.email}</div>}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 align-top">
                          {customer.category ? (
                            <Chip dotColor={dotColor}>{customer.category}</Chip>
                          ) : (
                            <span className="text-xs text-slate-300">-</span>
                          )}
                        </td>
                        <td className="px-4 py-4 text-center align-top">
                          <span className="inline-flex items-center justify-center rounded-xl bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">{memberCount}</span>
                        </td>
                        {isClient && canEdit && (
                          <td className="px-4 py-4 text-right align-top">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openModal("group-details", customer.id);
                                }}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition-all hover:border-blue-200 hover:bg-blue-50 hover:text-[#1877F2] hover:scale-105"
                                title="View"
                              >
                                <Eye size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openModal("group-edit", customer.id);
                                }}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-blue-100 bg-white text-[#1877F2] transition-all hover:border-blue-300 hover:bg-blue-50 hover:scale-105"
                                title="Edit"
                              >
                                <SquarePen size={14} />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeleteTarget({ id: customer.id, type: "group", label: customer.groupName || customer.name });
                                }}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-rose-100 bg-white text-rose-600 transition-all hover:border-rose-300 hover:bg-rose-50 hover:scale-105"
                                title="Delete"
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
            </CustomerTableFrame>
          )
        ) : isMasterLoading && masterCustomers.length === 0 ? (
          <div className="flex min-h-[18rem] items-center justify-center">
            <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-[#1877F2]" />
          </div>
        ) : masterError && masterCustomers.length === 0 ? (
          <CustomerEmptyState
            title="Failed to load customers"
            description={masterError}
            action={
              <button
                onClick={() => dispatch(fetchCustomersMaster())}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#5c67ff] to-[#3a47ff] px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-200 transition-all hover:brightness-110"
              >
                Try Again
              </button>
            }
          />
        ) : filteredMasterCustomers.length === 0 ? (
          <CustomerEmptyState
            title="No customers found"
            description={
              searchTerm
                ? "No individual customers match your search."
                : "Add the first individual customer and map them to a customer group."
            }
            action={
              isClient && canEdit && !searchTerm ? (
                <button
                  type="button"
                  onClick={() => openModal("master-create")}
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#5c67ff] to-[#3a47ff] px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-200 transition-all hover:brightness-110"
                >
                  <Plus size={16} />
                  Add First Customer
                </button>
              ) : undefined
            }
          />
        ) : (
          <CustomerTableFrame
            footer={
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>
                  Showing <strong className="text-slate-700">{filteredMasterCustomers.length}</strong> of{" "}
                  <strong className="text-slate-700">{masterCustomers.length}</strong> customers
                </span>
              </div>
            }
          >
            <table className="min-w-full border-separate border-spacing-0 text-left text-sm">
              <thead>
                <tr>
                  <TableHeadCell>Customer Name</TableHeadCell>
                  <TableHeadCell>Group</TableHeadCell>
                  <TableHeadCell>Relation</TableHeadCell>
                  <TableHeadCell>Contact</TableHeadCell>
                  <TableHeadCell>Type</TableHeadCell>
                  <TableHeadCell align="center">Status</TableHeadCell>
                  {isClient && canEdit && <TableHeadCell align="right">Actions</TableHeadCell>}
                </tr>
              </thead>
              <tbody>
                {filteredMasterCustomers.map((customer, index) => {
                  const fullName = getFullName(customer);
                  const groupLabel = customer.group
                    ? `${customer.group.groupCode ? `[${customer.group.groupCode}] ` : ""}${customer.group.groupName || ""}`
                    : "Not mapped";

                  return (
                      <tr
                        key={customer.id}
                        onClick={() => openModal("master-details", customer.id)}
                        className={`group cursor-pointer border-b border-slate-100 transition-colors hover:bg-blue-50/40 ${
                          index % 2 === 0 ? "bg-white" : "bg-slate-50/30"
                        }`}
                      >
                        <td className="px-4 py-4 align-top">
                          <div className="flex items-start gap-3 text-left">
                            <Seal name={fullName || "Customer"} size={36} />
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="font-semibold text-slate-900 transition-colors group-hover:text-[#1877F2]">
                                  {fullName}
                                </span>
                                <ChevronRight
                                  size={13}
                                  className="text-[#1877F2] opacity-0 transition-opacity group-hover:opacity-100"
                                />
                              </div>
                              <div className="mt-0.5 text-xs text-slate-400">
                                {[customer.gender, customer.panNumber].filter(Boolean).join(" | ") || "Individual record"}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 align-top">
                          {customer.group ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                openModal("group-details", customer.group!.id);
                              }}
                              className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 transition-colors hover:bg-blue-50 hover:text-[#1877F2]"
                            >
                              <Building2 size={11} />
                              {groupLabel}
                            </button>
                          ) : (
                            <span className="text-xs text-slate-300">Not mapped</span>
                          )}
                        </td>
                        <td className="px-4 py-4 align-top text-sm text-slate-600">
                          {customer.miscInfo?.relationToGroup || "-"}
                        </td>
                        <td className="px-4 py-4 align-top">
                          <div className="space-y-1">
                            {customer.contactInfo?.mobile1 && (
                              <div className="flex items-center gap-1.5 text-xs text-slate-600">
                                <Phone size={11} />
                                {customer.contactInfo.mobile1}
                              </div>
                            )}
                            {customer.contactInfo?.emailPersonal && (
                              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                <Mail size={11} />
                                {customer.contactInfo.emailPersonal}
                              </div>
                            )}
                            {!customer.contactInfo?.mobile1 && !customer.contactInfo?.emailPersonal && (
                              <span className="text-xs text-slate-300">-</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4 align-top text-sm text-slate-700">{customer.customerType || "-"}</td>
                        <td className="px-4 py-4 align-top text-center">
                          {customer.isGroupHead ? (
                            <Chip dotColor="bg-[#1877F2]">
                              <Star size={11} className="text-[#1877F2]" />
                              Head
                            </Chip>
                          ) : (
                            <Chip dotColor="bg-slate-300">Member</Chip>
                          )}
                        </td>
                        {isClient && canEdit && (
                          <td className="px-4 py-4 text-right align-top">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openModal("master-details", customer.id);
                                }}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition-all hover:border-blue-200 hover:bg-blue-50 hover:text-[#1877F2] hover:scale-105"
                                title="View"
                              >
                                <Eye size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openModal("master-edit", customer.id);
                                }}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-blue-100 bg-white text-[#1877F2] transition-all hover:border-blue-300 hover:bg-blue-50 hover:scale-105"
                                title="Edit"
                              >
                                <SquarePen size={14} />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeleteTarget({ id: customer.id, type: "master", label: fullName });
                                }}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-rose-100 bg-white text-rose-600 transition-all hover:border-rose-300 hover:bg-rose-50 hover:scale-105"
                                title="Delete"
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
          </CustomerTableFrame>
        )}
      </div>
    );

  const renderModalContent = (modal: CustomerModalEntry) => {
    switch (modal.type) {
      case "group-create":
        return <CustomerCreatePage isModal onClose={closeTopModal} onSaved={handleModalMutation} />;
      case "group-details":
        return (
          <CustomerDetailsPage
            isModal
            customerId={modal.id}
            onClose={closeTopModal}
            onDeleted={handleModalMutation}
            onOpenModal={openModal}
            modalStackLength={modalStack.length}
          />
        );
      case "group-edit":
        return (
          <CustomerEditPage
            isModal
            customerId={modal.id}
            onClose={closeTopModal}
            onSaved={handleModalMutation}
          />
        );
      case "master-create":
        return (
          <CustomerMasterCreatePage
            isModal
            groupId={"groupId" in modal ? modal.groupId : undefined}
            onClose={closeTopModal}
            onSaved={handleModalMutation}
          />
        );
      case "master-details":
        return (
          <CustomerMasterDetailsPage
            isModal
            customerId={modal.id}
            onClose={closeTopModal}
            onDeleted={handleModalMutation}
            onOpenModal={openModal}
            modalStackLength={modalStack.length}
          />
        );
      case "master-edit":
        return (
          <CustomerMasterEditPage
            isModal
            customerId={modal.id}
            onClose={closeTopModal}
            onSaved={handleModalMutation}
            onOpenModal={openModal}
          />
        );
      case "family-create":
        return (
          <FamilyHistoryForm
            preselectedMemberId={"memberId" in modal ? modal.memberId : undefined}
            preselectedGroupId={"groupId" in modal ? modal.groupId : undefined}
            onClose={handleModalMutation}
          />
        );
      case "family-details":
        return (
          <FamilyHistoryView
            recordId={modal.id}
            onClose={closeTopModal}
            onEdit={(recordId) => openModal("family-edit", recordId)}
          />
        );
      case "family-edit":
        return <FamilyHistoryForm recordId={modal.id} onClose={handleModalMutation} />;
      case "medical-create":
        return (
          <MedicalHistoryForm
            memberId={"memberId" in modal ? modal.memberId : ""}
            onClose={handleModalMutation}
            onSaved={() => {
              if ("memberId" in modal && modal.memberId) {
                dispatch(fetchMedicalHistoriesByMember(modal.memberId));
              }
            }}
          />
        );
      case "medical-edit":
        return (
          <MedicalHistoryForm
            recordId={modal.id}
            memberId={"memberId" in modal ? modal.memberId : ""}
            onClose={handleModalMutation}
            onSaved={() => {
              if ("memberId" in modal && modal.memberId) {
                dispatch(fetchMedicalHistoriesByMember(modal.memberId));
              }
            }}
          />
        );
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-8">
      {/* Top Banner Card */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-2xl border border-blue-100 bg-[#f0f7ff] p-5 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-b from-[#1e3a8a] to-[#2563eb] text-white shadow-lg shadow-blue-200/50">
            <Users size={26} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#0f172a]">
              Customers
            </h1>
            <p className="mt-0.5 text-sm font-medium text-slate-500">
            </p>
          </div>
        </div>

        {isClient && canEdit && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => openModal(activeTab === "group" ? "group-create" : "master-create")}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#5c67ff] to-[#3a47ff] px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-200 transition-all hover:brightness-110 active:scale-[0.98]"
            >
              <Plus size={16} />
              {activeTab === "group" ? "Add Customer Group" : "Add Customer"}
            </button>
          </div>
        )}
      </div>

      {showListChrome && (
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-3 lg:flex-1 lg:min-w-0">
            <CustomerModuleNav />
            <div className="relative min-w-0 flex-1 sm:max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                placeholder={
                  activeTab === "group"
                    ? "Search by group name, code, or category..."
                    : "Search by name, group, mobile, email, or type..."
                }
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pl-10 pr-4 text-sm text-slate-900 outline-none placeholder:text-slate-400 transition-all focus:border-[#1877F2] focus:bg-white focus:ring-2 focus:ring-blue-500/15"
              />
            </div>
          </div>

        </div>
      )}

      {activeContent}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 px-4 py-6 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.28)]">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
                <Trash2 size={18} />
              </div>
              <div className="min-w-0">
                <h3 className="text-lg font-semibold text-slate-900">{deleteTitle}</h3>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  {deleteText}
                </p>
                <p className="mt-2 text-sm font-medium text-slate-700">{deleteTarget.label}</p>
              </div>
            </div>
            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {modalStack.map((modal, index) => (
        <CustomerModalShell
          key={modal.key}
          entry={modal}
          depth={index}
          isTop={index === modalStack.length - 1}
          onClose={() => closeModalAt(index)}
        >
          {renderModalContent(modal)}
        </CustomerModalShell>
      ))}
    </div>
  );
}