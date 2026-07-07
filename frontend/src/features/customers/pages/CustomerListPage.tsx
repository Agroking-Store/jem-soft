"use client";

import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useRouter, useSearchParams } from "next/navigation";
import type { RootState, AppDispatch } from "@/store/store";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { fetchCustomers, deleteCustomer } from "@/features/customers/customerSlice";
import {
  fetchCustomersMaster,
  deleteCustomerMaster,
} from "@/features/customers/customerMasterSlice";
import {
  Plus,
  Search,
  Trash2,
  Users,
  AlertTriangle,
  Filter,
  Tag,
  Camera,
  ChevronRight,
  Mail,
  Phone,
  Star,
  Edit,
  Building2,
  UserCog,
  Activity,
} from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";
import FamilyHistoryList from "./FamilyHistoryList";
import FamilyHistoryView from "./FamilyHistoryView";
import FamilyHistoryForm from "./FamilyHistoryForm";
import CustomerModuleNav from "@/features/customers/components/CustomerModuleNav";

const CATEGORY_DOT: Record<string, string> = {
  Client: "bg-[#0B1220]",
  Personal: "bg-amber-500",
  Others: "bg-slate-400",
  Prospect: "bg-emerald-500",
};

type Tab = "group" | "master" | "family" | "medical";
type DeleteTarget = { id: string; type: Extract<Tab, "group" | "master">; label: string } | null;

type HistoryView =
  | { type: "list" }
  | { type: "add" }
  | { type: "edit"; recordId?: string }
  | { type: "view"; recordId?: string };

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
  return [customer.salutation, customer.firstName, customer.middleName, customer.lastName]
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
      className="rounded-full bg-[#0B1220] text-[#E8C77A] flex items-center justify-center font-serif font-semibold ring-2 ring-[#B8873A]/40 ring-offset-2 ring-offset-white shrink-0"
    >
      <span style={{ fontSize: size * 0.36 }}>{getInitials(name)}</span>
    </div>
  );
}

function Chip({ dotColor, children }: { dotColor: string; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border border-slate-200 bg-white text-slate-700">
      <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
      {children}
    </span>
  );
}

export default function CustomerListPage() {
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  const { user } = useAuth();
  const { customers, isLoading, error } = useSelector((s: RootState) => s.customers);
  const {
    customers: masterCustomers,
    isLoading: isMasterLoading,
    error: masterError,
  } = useSelector((s: RootState) => s.customerMaster);

  const searchParams = useSearchParams();
  const paramTab = searchParams.get("tab");
  const activeTab: Tab = paramTab === "master"
    ? "master"
    : paramTab === "family"
    ? "family"
    : paramTab === "medical"
    ? "medical"
    : "group";

  const [searchTerm, setSearchTerm] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isClient, setIsClient] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [historyView, setHistoryView] = useState<HistoryView>({ type: "list" });

  useEffect(() => {
    dispatch(fetchCustomers());
    dispatch(fetchCustomersMaster());
  }, [dispatch]);

  useEffect(() => {
    setIsClient(true);
    setMounted(true);
  }, []);

  // `canEdit` depends on auth state only known on the client, so it's gated
  // behind `mounted` to keep the first client render identical to the server
  // render (avoids a hydration mismatch) — edit/add controls appear right
  // after hydration completes.
  const canEdit = mounted && (user?.role === "ADMIN" || user?.role === "ADVISOR");

  const groupMemberCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    masterCustomers.forEach((customer) => {
      if (!customer.groupId) return;
      counts[customer.groupId] = (counts[customer.groupId] || 0) + 1;
    });
    return counts;
  }, [masterCustomers]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { Client: 0, Personal: 0, Prospect: 0, Others: 0 };
    customers.forEach((c) => {
      const cat = c.category && counts[c.category] !== undefined ? c.category : "Others";
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return counts;
  }, [customers]);

  const masterStats = useMemo(() => {
    const heads = masterCustomers.filter((c) => c.isGroupHead).length;
    const unmapped = masterCustomers.filter((c) => !c.groupId).length;
    return {
      heads,
      members: masterCustomers.length - heads,
      unmapped,
    };
  }, [masterCustomers]);

  const filteredCustomers = customers.filter((c) => {
    const query = searchTerm.toLowerCase();
    return (
      (c.groupName || c.name).toLowerCase().includes(query) ||
      (c.groupCode || "").toLowerCase().includes(query) ||
      (c.category || "").toLowerCase().includes(query)
    );
  });

  const filteredMasterCustomers = masterCustomers.filter((c) => {
    const query = searchTerm.toLowerCase();
    const fullName = getFullName(c).toLowerCase();
    const groupLabel = `${c.group?.groupCode || ""} ${c.group?.groupName || ""}`.toLowerCase();
    return (
      fullName.includes(query) ||
      groupLabel.includes(query) ||
      (c.contactInfo?.mobile1 || "").toLowerCase().includes(query) ||
      (c.contactInfo?.emailPersonal || "").toLowerCase().includes(query) ||
      (c.customerType || "").toLowerCase().includes(query)
    );
  });

  useEffect(() => {
    setSearchTerm("");
    setSelectedIds(new Set());
    if (activeTab === "family") {
      setHistoryView({ type: "list" });
    }
  }, [activeTab]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      if (deleteTarget.type === "group") {
        await dispatch(deleteCustomer(deleteTarget.id)).unwrap();
        toast.success("Customer group deleted successfully");
        setSelectedIds((prev) => {
          const next = new Set(prev);
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
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredCustomers.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredCustomers.map((c) => c.id)));
    }
  };

  const deleteTitle = deleteTarget?.type === "master" ? "Delete Customer" : "Delete Customer Group";
  const deleteText =
    deleteTarget?.type === "master"
      ? "This will remove the customer and all linked contact, address, bank, and preference details."
      : "This will remove the customer group and related portal access.";

  // Status-grid style stats for each tab
  const groupStatusItems = [
    { label: "Client", value: categoryCounts.Client, icon: Users, color: "text-[#B8873A] bg-[#B8873A]/10" },
    { label: "Personal", value: categoryCounts.Personal, icon: UserCog, color: "text-amber-600 bg-amber-50" },
    { label: "Prospect", value: categoryCounts.Prospect, icon: Star, color: "text-emerald-600 bg-emerald-50" },
    { label: "Others", value: categoryCounts.Others, icon: Tag, color: "text-slate-600 bg-slate-100" },
  ];

  const masterStatusItems = [
    { label: "Group Heads", value: masterStats.heads, icon: Star, color: "text-[#B8873A] bg-[#B8873A]/10" },
    { label: "Members", value: masterStats.members, icon: Users, color: "text-[#B8873A] bg-[#B8873A]/10" },
    { label: "Not Mapped", value: masterStats.unmapped, icon: AlertTriangle, color: "text-red-500 bg-red-50" },
  ];

  const activeStatusItems = activeTab === "group" ? groupStatusItems : masterStatusItems;

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      {/* PANEL 1 — Header masthead */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0B1220] via-[#0F1A2E] to-[#16294D] px-7 py-6 shadow-lg shadow-[#0B1220]/15">
        <div className="absolute -right-10 -top-10 w-44 h-44 rounded-full bg-[#B8873A]/10 pointer-events-none" />
        <div className="absolute right-16 bottom-0 w-24 h-24 rounded-full bg-[#B8873A]/10 pointer-events-none" />
        <div className="relative flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-[#B8873A]/15 border border-[#B8873A]/30 text-[#E8C77A] flex items-center justify-center shrink-0">
            <Users size={20} />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#E8C77A]">
              Customer Management
            </span>
            <h1 className="font-serif text-[26px] font-semibold text-white tracking-tight leading-tight">
              Customers
            </h1>
          </div>
        </div>
        <p className="relative text-white/60 text-sm mt-2 ml-14">
          Manage customer groups, individual records, and family history — all in one place.
        </p>
      </div>

      {/* PANEL 2 — Shared, route-aware navbar (also appears on Details/Edit/Create pages) */}
      <CustomerModuleNav />

      {/* PANEL 3 — Page content */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {(activeTab === "group" || activeTab === "master") && (
          <>
            <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="relative flex-1">
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
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2.5 pl-9 pr-4 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-[#B8873A] focus:bg-white focus:ring-2 focus:ring-[#B8873A]/20 transition-all"
                />
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button className="inline-flex items-center gap-1.5 px-3 py-2.5 border border-slate-200 bg-white hover:border-[#B8873A]/50 hover:bg-[#B8873A]/5 text-slate-600 rounded-lg text-sm font-medium transition-colors">
                  <Filter size={14} />
                  All Statuses
                </button>
                {activeTab === "group" && canEdit && selectedIds.size > 0 && (
                  <button
                    onClick={() => {
                      if (selectedIds.size === 1) {
                        const id = [...selectedIds][0];
                        const group = customers.find((c) => c.id === id);
                        setDeleteTarget({ id, type: "group", label: group?.groupName || group?.name || "this group" });
                      }
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-2.5 border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg text-sm font-medium transition-colors"
                  >
                    <Trash2 size={14} />
                    Delete ({selectedIds.size})
                  </button>
                )}
                {isClient && canEdit && (
                  <Link
                    href={activeTab === "group" ? "/dashboard/customers/new" : "/dashboard/customers/master/new"}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-[#0B1220] hover:bg-[#16294D] text-white rounded-lg text-sm font-semibold shadow-sm shadow-[#0B1220]/20 transition-all duration-200"
                  >
                    <Plus size={16} />
                    {activeTab === "group" ? "Add Group" : "Add Customer"}
                  </Link>
                )}
              </div>
            </div>

            {/* Status grid — icon boxes with counts, only for group/master tabs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 px-4 py-4 border-b border-slate-100">
              {activeStatusItems.map((stat) => {
                const Icon = stat.icon;
                return (
                  <div key={stat.label} className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${stat.color}`}>
                      <Icon size={16} />
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 leading-tight">
                        {stat.label}
                      </p>
                      <p className="text-sm font-bold text-slate-900">{stat.value}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {activeTab === "group" && (
          <>
            {isLoading && customers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#0B1220]" />
                <p className="text-sm text-slate-500">Loading customer groups...</p>
              </div>
            ) : error && customers.length === 0 ? (
              <div className="text-center py-16 px-4">
                <div className="inline-flex p-3 bg-red-50 text-red-500 rounded-xl mb-3">
                  <AlertTriangle size={24} />
                </div>
                <h3 className="text-base font-semibold text-slate-900 mb-1">Failed to Load</h3>
                <p className="text-sm text-slate-500 max-w-md mx-auto mb-4">{error}</p>
                <button
                  onClick={() => dispatch(fetchCustomers())}
                  className="text-sm font-semibold text-[#0B1220] hover:text-[#16294D] underline underline-offset-2"
                >
                  Try Again
                </button>
              </div>
            ) : filteredCustomers.length === 0 ? (
              <div className="text-center py-20 px-4">
                <div className="inline-flex p-4 bg-[#B8873A]/10 text-[#B8873A] rounded-2xl mb-4">
                  <Users size={28} />
                </div>
                <h3 className="text-base font-semibold text-slate-900 mb-1">No Customer Groups Found</h3>
                <p className="text-sm text-slate-500 max-w-xs mx-auto mb-5">
                  {searchTerm
                    ? "No groups match your search. Try a different keyword."
                    : "Start building your customer base by adding a new group."}
                </p>
                {isClient && canEdit && !searchTerm && (
                  <Link
                    href="/dashboard/customers/new"
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#0B1220] hover:bg-[#16294D] text-white rounded-lg font-semibold text-sm shadow-sm transition-all"
                  >
                    <Plus size={16} />
                    Add First Group
                  </Link>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#0B1220] text-white/90 text-[11px] font-bold uppercase tracking-wider border-b-2 border-[#B8873A]/40">
                      <th className="py-3 px-4">
                        <input
                          type="checkbox"
                          checked={selectedIds.size === filteredCustomers.length && filteredCustomers.length > 0}
                          onChange={toggleSelectAll}
                          className="rounded border-white/40 accent-[#B8873A] focus:ring-0"
                        />
                      </th>
                      <th className="py-3 px-4 whitespace-nowrap">Group Code</th>
                      <th className="py-3 px-4 whitespace-nowrap">Group Name</th>
                      <th className="py-3 px-4 whitespace-nowrap">Category</th>
                      <th className="py-3 px-4 whitespace-nowrap text-center">No. of Members</th>
                      <th className="py-3 px-4 text-center">Group</th>
                      <th className="py-3 px-4 text-center">Photo</th>
                      {isClient && canEdit && <th className="py-3 px-4 text-right"></th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {filteredCustomers.map((customer, idx) => {
                      const dotColor = CATEGORY_DOT[customer.category || ""] ?? "bg-slate-400";
                      const memberCount = groupMemberCounts[customer.id] || 0;
                      const isSelected = selectedIds.has(customer.id);
                      const groupHref = `/dashboard/customers/${customer.id}`;
                      const displayName = customer.groupName || customer.name;

                      return (
                        <tr
                          key={customer.id}
                          onDoubleClick={() => router.push(groupHref)}
                          className={`transition-colors ${
                            isSelected ? "bg-[#B8873A]/[0.07]" : idx % 2 === 0 ? "bg-white" : "bg-slate-50/40"
                          } hover:bg-[#0B1220]/[0.03]`}
                        >
                          <td className="py-3 px-4">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelect(customer.id)}
                              className="rounded border-slate-300 accent-[#0B1220] focus:ring-[#B8873A]/20"
                            />
                          </td>
                          <td className="py-3 px-4">
                            <Link href={groupHref} className="font-mono font-semibold text-slate-700 text-xs bg-slate-100 px-2 py-1 rounded hover:bg-[#0B1220] hover:text-white transition-colors">
                              {customer.groupCode || "-"}
                            </Link>
                          </td>
                          <td className="py-3 px-4">
                            <Link href={groupHref} className="flex items-center gap-2.5 group">
                              <Seal name={displayName} size={30} />
                              <div>
                                <span className="font-semibold text-slate-900 group-hover:text-[#0B1220] transition-colors flex items-center gap-1">
                                  {displayName}
                                  <ChevronRight size={13} className="opacity-0 group-hover:opacity-100 transition-opacity text-[#B8873A]" />
                                </span>
                                {customer.email && (
                                  <div className="text-xs text-slate-400 mt-0.5 truncate max-w-[180px]">
                                    {customer.email}
                                  </div>
                                )}
                              </div>
                            </Link>
                          </td>
                          <td className="py-3 px-4">
                            {customer.category ? (
                              <Chip dotColor={dotColor}>{customer.category}</Chip>
                            ) : (
                              <span className="text-slate-300 text-xs">-</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <Link href={`${groupHref}?tab=members`} className="text-[#0B1220] font-bold text-sm hover:underline">
                              {memberCount}
                            </Link>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <Link
                              href={groupHref}
                              className="inline-flex w-7 h-7 items-center justify-center bg-slate-100 rounded-lg text-slate-500 hover:bg-[#0B1220] hover:text-white transition-colors"
                              title="View Group"
                            >
                              <Users size={13} />
                            </Link>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className="inline-flex w-7 h-7 items-center justify-center bg-slate-100 rounded-lg text-slate-500 hover:bg-[#B8873A] hover:text-white transition-colors cursor-pointer" title="Upload Photo">
                              <Camera size={13} />
                            </span>
                          </td>
                          {isClient && canEdit && (
                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Link
                                  href={`/dashboard/customers/${customer.id}/edit`}
                                  className="p-1.5 text-slate-400 hover:text-[#0B1220] hover:bg-[#0B1220]/5 rounded-lg transition-colors"
                                  title="Edit"
                                >
                                  <Edit size={14} />
                                </Link>
                                <button
                                  onClick={() => setDeleteTarget({ id: customer.id, type: "group", label: customer.groupName || customer.name })}
                                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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
                <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/40 flex items-center justify-between text-xs text-slate-400">
                  <span>
                    Showing <strong className="text-slate-600">{filteredCustomers.length}</strong> of{" "}
                    <strong className="text-slate-600">{customers.length}</strong> customer groups
                  </span>
                  {selectedIds.size > 0 && (
                    <span className="text-[#B8873A] font-semibold">{selectedIds.size} selected</span>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {activeTab === "master" && (
          <>
            {isMasterLoading && masterCustomers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#0B1220]" />
                <p className="text-sm text-slate-500">Loading customers...</p>
              </div>
            ) : masterError && masterCustomers.length === 0 ? (
              <div className="text-center py-16 px-4">
                <div className="inline-flex p-3 bg-red-50 text-red-500 rounded-xl mb-3">
                  <AlertTriangle size={24} />
                </div>
                <h3 className="text-base font-semibold text-slate-900 mb-1">Failed to Load</h3>
                <p className="text-sm text-slate-500 max-w-md mx-auto mb-4">{masterError}</p>
                <button
                  onClick={() => dispatch(fetchCustomersMaster())}
                  className="text-sm font-semibold text-[#0B1220] hover:text-[#16294D] underline underline-offset-2"
                >
                  Try Again
                </button>
              </div>
            ) : filteredMasterCustomers.length === 0 ? (
              <div className="text-center py-20 px-4">
                <div className="inline-flex p-4 bg-[#B8873A]/10 text-[#B8873A] rounded-2xl mb-4">
                  <UserCog size={28} />
                </div>
                <h3 className="text-base font-semibold text-slate-900 mb-1">No Customers Found</h3>
                <p className="text-sm text-slate-500 max-w-xs mx-auto mb-5">
                  {searchTerm
                    ? "No individual customers match your search."
                    : "Add the first individual customer and map them to a customer group."}
                </p>
                {isClient && canEdit && !searchTerm && (
                  <Link
                    href="/dashboard/customers/master/new"
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#0B1220] hover:bg-[#16294D] text-white rounded-lg font-semibold text-sm shadow-sm transition-all"
                  >
                    <Plus size={16} />
                    Add First Customer
                  </Link>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#0B1220] text-white/90 text-[11px] font-bold uppercase tracking-wider border-b-2 border-[#B8873A]/40">
                      <th className="py-3 px-4 whitespace-nowrap">Customer Name</th>
                      <th className="py-3 px-4 whitespace-nowrap">Group</th>
                      <th className="py-3 px-4 whitespace-nowrap">Relation</th>
                      <th className="py-3 px-4 whitespace-nowrap">Contact</th>
                      <th className="py-3 px-4 whitespace-nowrap">Type</th>
                      <th className="py-3 px-4 whitespace-nowrap text-center">Status</th>
                      {isClient && canEdit && <th className="py-3 px-4 text-right"></th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {filteredMasterCustomers.map((customer, idx) => {
                      const fullName = getFullName(customer);
                      const href = `/dashboard/customers/master/${customer.id}`;
                      const groupLabel = customer.group
                        ? `${customer.group.groupCode ? `[${customer.group.groupCode}] ` : ""}${customer.group.groupName || ""}`
                        : "Not mapped";

                      return (
                        <tr
                          key={customer.id}
                          onDoubleClick={() => router.push(href)}
                          className={`${idx % 2 === 0 ? "bg-white" : "bg-slate-50/40"} hover:bg-[#0B1220]/[0.03] transition-colors`}
                        >
                          <td className="py-3 px-4">
                            <Link href={href} className="flex items-center gap-2.5 group">
                              <Seal name={fullName || "Customer"} size={30} />
                              <div>
                                <span className="font-semibold text-slate-900 group-hover:text-[#0B1220] transition-colors flex items-center gap-1">
                                  {fullName}
                                  <ChevronRight size={13} className="opacity-0 group-hover:opacity-100 transition-opacity text-[#B8873A]" />
                                </span>
                                <div className="text-xs text-slate-400 mt-0.5">
                                  {[customer.gender, customer.panNumber].filter(Boolean).join(" | ") || "Individual record"}
                                </div>
                              </div>
                            </Link>
                          </td>
                          <td className="py-3 px-4">
                            {customer.group ? (
                              <Link
                                href={`/dashboard/customers/${customer.group.id}`}
                                className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 hover:bg-[#0B1220] hover:text-white transition-colors"
                              >
                                <Building2 size={11} />
                                {groupLabel}
                              </Link>
                            ) : (
                              <span className="text-xs text-slate-300">Not mapped</span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <span className="text-slate-600 text-sm">
                              {customer.miscInfo?.relationToGroup || "-"}
                            </span>
                          </td>
                          <td className="py-3 px-4">
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
                          <td className="py-3 px-4">
                            <span className="text-sm text-slate-700">{customer.customerType || "-"}</span>
                          </td>
                          <td className="py-3 px-4 text-center">
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
                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Link
                                  href={`/dashboard/customers/master/${customer.id}/edit`}
                                  className="p-1.5 text-slate-400 hover:text-[#0B1220] hover:bg-[#0B1220]/5 rounded-lg transition-colors"
                                  title="Edit"
                                >
                                  <Edit size={14} />
                                </Link>
                                <button
                                  onClick={() => setDeleteTarget({ id: customer.id, type: "master", label: fullName })}
                                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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
                <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/40 flex items-center justify-between text-xs text-slate-400">
                  <span>
                    Showing <strong className="text-slate-600">{filteredMasterCustomers.length}</strong> of{" "}
                    <strong className="text-slate-600">{masterCustomers.length}</strong> customers
                  </span>
                </div>
              </div>
            )}
          </>
        )}

        {activeTab === "family" && (
          <div className="p-6">
            {historyView.type === "list" && (
              <FamilyHistoryList
                onAdd={() => setHistoryView({ type: "add" })}
                onEdit={(id) => setHistoryView({ type: "edit", recordId: id })}
                onView={(id) => setHistoryView({ type: "view", recordId: id })}
              />
            )}
            {historyView.type === "view" && (
              <FamilyHistoryView
                recordId={historyView.recordId || ""}
                onClose={() => setHistoryView({ type: "list" })}
                onEdit={(id) => setHistoryView({ type: "edit", recordId: id })}
              />
            )}
            {(historyView.type === "add" || historyView.type === "edit") && (
              <FamilyHistoryForm
                recordId={historyView.recordId}
                onClose={() => setHistoryView({ type: "list" })}
              />
            )}
          </div>
        )}

        {activeTab === "medical" && (
          <div className="p-8 max-w-2xl mx-auto text-center py-20 bg-white">
            <div className="relative inline-flex mb-6">
              <div className="absolute inset-0 bg-[#B8873A]/20 rounded-full blur-xl animate-pulse" />
              <div className="relative p-5 bg-gradient-to-tr from-[#0B1220] to-[#16294D] text-[#E8C77A] rounded-2xl shadow-lg border border-[#B8873A]/20">
                <Activity size={32} className="animate-pulse" />
              </div>
            </div>
            <h2 className="font-serif text-2xl font-semibold text-[#0B1220] tracking-tight mb-2">Medical History</h2>
            <p className="text-slate-500 text-sm max-w-sm mx-auto leading-relaxed mb-6">
              Our comprehensive medical history tracking suite is under development and will be available soon.
            </p>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#B8873A]/10 text-[#B8873A] text-xs font-semibold uppercase tracking-wider shadow-sm border border-[#B8873A]/20 animate-pulse">
              Coming Soon
            </span>
          </div>
        )}
      </div>

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0B1220]/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-50 rounded-xl">
                <AlertTriangle size={22} className="text-red-600" />
              </div>
              <div>
                <h3 className="font-serif text-base font-bold text-[#0B1220]">{deleteTitle}</h3>
                <p className="text-xs text-slate-400">This action cannot be undone</p>
              </div>
            </div>
            <p className="text-sm text-slate-600 mb-6 leading-relaxed">
              Are you sure you want to delete <strong>{deleteTarget.label}</strong>? {deleteText}
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                disabled={isDeleting}
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-sm rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                disabled={isDeleting}
                onClick={handleDelete}
                className="px-4 py-2 bg-[#A93226] hover:bg-[#8E2A20] text-white font-semibold text-sm rounded-lg shadow-sm transition-colors flex items-center gap-2"
              >
                {isDeleting ? (
                  <>
                    <div className="animate-spin w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full" />
                    Deleting...
                  </>
                ) : (
                  "Delete"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}