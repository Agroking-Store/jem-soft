"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  Building2,
  ChevronRight,
  Edit,
  Eye,
  Mail,
  Phone,
  Plus,
  Search,
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

function Seal({ name, size = 36 }: { name: string; size?: number }) {
  return (
    <div
      style={{ width: size, height: size, minWidth: size }}
      className="flex shrink-0 items-center justify-center rounded-full bg-[#0B1220] font-semibold text-[#E8C77A] ring-2 ring-[#B8873A]/40 ring-offset-2 ring-offset-white"
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
      className={`sticky top-0 z-10 border-b border-slate-200 bg-slate-50/95 px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 ${
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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
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
    setSelectedIds(new Set());
  }, [activeTab]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      if (deleteTarget.type === "group") {
        await dispatch(deleteCustomer(deleteTarget.id)).unwrap();
        toast.success("Customer group deleted successfully");
        setSelectedIds((previous) => {
          const next = new Set(previous);
          next.delete(deleteTarget.id);
          return next;
        });
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

  const toggleSelect = (id: string) => {
    setSelectedIds((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredCustomers.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(filteredCustomers.map((customer) => customer.id)));
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
      <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.05)]">
        <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#B8873A] via-[#B8873A]/40 to-transparent" />
        {activeTab === "group" ? (
          isLoading && customers.length === 0 ? (
            <div className="flex min-h-[18rem] items-center justify-center">
              <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-[#0B1220]" />
            </div>
          ) : error && customers.length === 0 ? (
            <CustomerEmptyState
              title="Failed to load customer groups"
              description={error}
              action={
                <button
                  onClick={() => dispatch(fetchCustomers())}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#0B1220] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#16294D]"
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
                    className="inline-flex items-center gap-2 rounded-xl bg-[#0B1220] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#16294D]"
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
                  {selectedIds.size > 0 && <span className="font-semibold text-[#B8873A]">{selectedIds.size} selected</span>}
                </div>
              }
            >
              <table className="min-w-full border-separate border-spacing-0 text-left text-sm">
                <thead>
                  <tr>
                    <TableHeadCell>
                      <input
                        type="checkbox"
                        checked={selectedIds.size === filteredCustomers.length && filteredCustomers.length > 0}
                        onChange={toggleSelectAll}
                        className="rounded border-slate-300 text-[#0B1220] focus:ring-[#B8873A]/20"
                      />
                    </TableHeadCell>
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
                    const isSelected = selectedIds.has(customer.id);
                    const displayName = customer.groupName || customer.name;

                    return (
                      <tr
                        key={customer.id}
                        onClick={() => openModal("group-details", customer.id)}
                        className={`group cursor-pointer border-b border-slate-100 transition-colors hover:bg-[#0B1220]/[0.025] ${
                          isSelected ? "bg-[#B8873A]/[0.06]" : index % 2 === 0 ? "bg-white" : "bg-slate-50/40"
                        }`}
                      >
                        <td className="px-4 py-4 align-top">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelect(customer.id)}
                            onClick={(e) => e.stopPropagation()}
                            className="rounded border-slate-300 text-[#0B1220] focus:ring-[#B8873A]/20"
                          />
                        </td>
                        <td className="px-4 py-4 align-top">
                          <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 font-mono text-xs font-semibold text-slate-700">
                            {customer.groupCode || "-"}
                          </span>
                        </td>
                        <td className="px-4 py-4 align-top">
                          <div className="flex items-start gap-3 text-left">
                            <Seal name={displayName} size={34} />
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="font-semibold text-slate-900 transition-colors group-hover:text-[#0B1220]">
                                  {displayName}
                                </span>
                                <ChevronRight
                                  size={13}
                                  className="text-[#B8873A] opacity-0 transition-opacity group-hover:opacity-100"
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
                          <span className="font-semibold text-[#0B1220]">{memberCount}</span>
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
                                className="inline-flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-[#0B1220]/5 hover:text-[#0B1220]"
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
                                className="inline-flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-[#0B1220]/5 hover:text-[#0B1220]"
                                title="Edit"
                              >
                                <Edit size={14} />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeleteTarget({ id: customer.id, type: "group", label: customer.groupName || customer.name });
                                }}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
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
            <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-[#0B1220]" />
          </div>
        ) : masterError && masterCustomers.length === 0 ? (
          <CustomerEmptyState
            title="Failed to load customers"
            description={masterError}
            action={
              <button
                onClick={() => dispatch(fetchCustomersMaster())}
                className="inline-flex items-center gap-2 rounded-xl bg-[#0B1220] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#16294D]"
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
                  className="inline-flex items-center gap-2 rounded-xl bg-[#0B1220] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#16294D]"
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
                        className={`group cursor-pointer border-b border-slate-100 transition-colors hover:bg-[#0B1220]/[0.025] ${
                          index % 2 === 0 ? "bg-white" : "bg-slate-50/40"
                        }`}
                      >
                        <td className="px-4 py-4 align-top">
                          <div className="flex items-start gap-3 text-left">
                            <Seal name={fullName || "Customer"} size={34} />
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="font-semibold text-slate-900 transition-colors group-hover:text-[#0B1220]">
                                  {fullName}
                                </span>
                                <ChevronRight
                                  size={13}
                                  className="text-[#B8873A] opacity-0 transition-opacity group-hover:opacity-100"
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
                              className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 transition-colors hover:bg-[#0B1220] hover:text-white"
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
                            <Chip dotColor="bg-[#B8873A]">
                              <Star size={11} className="text-[#B8873A]" />
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
                                className="inline-flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-[#0B1220]/5 hover:text-[#0B1220]"
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
                                className="inline-flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-[#0B1220]/5 hover:text-[#0B1220]"
                                title="Edit"
                              >
                                <Edit size={14} />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeleteTarget({ id: customer.id, type: "master", label: fullName });
                                }}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
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
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0B1220] text-[#E8C77A]">
            <Users size={20} />
          </span>
          <h1 className="text-2xl font-serif font-semibold tracking-tight text-slate-900">Customers</h1>
        </div>
      </div>

      {showListChrome && (
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-3 lg:flex-1 lg:min-w-0">
          <CustomerModuleNav />
          <div className="relative min-w-0 flex-1 sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder={
                activeTab === "group"
                  ? "Search by group name, code, or category..."
                  : "Search by name, group, mobile, email, or type..."
              }
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm text-slate-900 outline-none placeholder:text-slate-400 transition-all focus:border-[#B8873A] focus:bg-white focus:ring-2 focus:ring-[#B8873A]/20"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
          {activeTab === "group" && canEdit && selectedIds.size > 0 && (
            <button
              onClick={() => {
                if (selectedIds.size === 1) {
                  const id = [...selectedIds][0];
                  const group = customers.find((customer) => customer.id === id);
                  setDeleteTarget({ id, type: "group", label: group?.groupName || group?.name || "this group" });
                }
              }}
              className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm font-medium text-rose-700 transition-colors hover:bg-rose-100"
            >
              <Trash2 size={14} />
              Delete ({selectedIds.size})
            </button>
          )}

          {isClient && canEdit && (activeTab === "group" || activeTab === "master") && (
            <button
              type="button"
              onClick={() => openModal(activeTab === "group" ? "group-create" : "master-create")}
              className="inline-flex items-center gap-2 rounded-xl bg-[#0B1220] px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-[#0B1220]/20 transition-colors hover:bg-[#16294D]"
            >
              <Plus size={16} />
              {activeTab === "group" ? "New Group" : "New Customer"}
            </button>
          )}
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