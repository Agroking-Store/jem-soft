"use client";

import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useRouter } from "next/navigation";
import type { RootState, AppDispatch } from "@/store/store";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { fetchCustomers, deleteCustomer } from "@/features/customers/customerSlice";
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
  SlidersHorizontal,
} from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";

const CATEGORY_COLORS: Record<string, string> = {
  Client: "bg-blue-100 text-blue-700",
  Personal: "bg-amber-100 text-amber-700",
  Others: "bg-slate-100 text-slate-600",
  Prospect: "bg-green-100 text-green-700",
};



type Tab = "group" | "master";

export default function CustomerListPage() {
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  const { user } = useAuth();
  const { customers, isLoading, error } = useSelector((s: RootState) => s.customers);

  const [activeTab, setActiveTab] = useState<Tab>("group");
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    setIsMounted(true);
    dispatch(fetchCustomers());
  }, [dispatch]);

  const canEdit = isMounted && (user?.role === "ADMIN" || user?.role === "ADVISOR");

  const filteredCustomers = customers.filter(
    (c) =>
      (c.groupName || c.name).toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.groupCode || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.category || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDelete = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    try {
      await dispatch(deleteCustomer(deleteId)).unwrap();
      toast.success("Customer group deleted successfully");
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(deleteId);
        return next;
      });
    } catch (err: any) {
      toast.error(err || "Failed to delete");
    } finally {
      setIsDeleting(false);
      setDeleteId(null);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
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

  return (
    <div className="max-w-7xl mx-auto space-y-0">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Customers</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Manage customer groups and individual customer accounts.
          </p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Tabs Header */}
        <div className="flex border-b border-slate-200 bg-slate-50/60">
          <button
            onClick={() => setActiveTab("group")}
            className={`relative px-6 py-4 text-sm font-semibold transition-all duration-200 flex items-center gap-2 ${
              activeTab === "group"
                ? "text-blue-600 bg-white border-b-2 border-blue-600 -mb-px"
                : "text-slate-500 hover:text-slate-800 hover:bg-white/50"
            }`}
          >
            <Users size={16} />
            Customer Group
            <span className="ml-1 bg-blue-100 text-blue-600 text-xs font-bold px-2 py-0.5 rounded-full">
              {customers.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab("master")}
            className={`relative px-6 py-4 text-sm font-semibold transition-all duration-200 flex items-center gap-2 ${
              activeTab === "master"
                ? "text-blue-600 bg-white border-b-2 border-blue-600 -mb-px"
                : "text-slate-500 hover:text-slate-800 hover:bg-white/50"
            }`}
          >
            <SlidersHorizontal size={16} />
            Customer Master
          </button>
        </div>

        {/* ─── Customer Group Tab ─── */}
        {activeTab === "group" && (
          <>
            {/* Toolbar */}
            <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="text"
                  placeholder="Search by group name, code, or category..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2.5 pl-9 pr-4 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 transition-all"
                />
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button className="inline-flex items-center gap-1.5 px-3 py-2.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 rounded-lg text-sm font-medium transition-colors">
                  <Filter size={14} />
                  Filter
                </button>
                {canEdit && selectedIds.size > 0 && (
                  <button
                    onClick={() => {
                      if (selectedIds.size === 1) setDeleteId([...selectedIds][0]);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-2.5 border border-red-200 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-sm font-medium transition-colors"
                  >
                    <Trash2 size={14} />
                    Delete ({selectedIds.size})
                  </button>
                )}
                {canEdit && (
                  <Link
                    href="/dashboard/customers/new"
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold shadow-sm transition-all duration-200"
                  >
                    <Plus size={16} />
                    Add Group
                  </Link>
                )}
              </div>
            </div>

            {/* Table */}
            {isLoading && customers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
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
                  className="text-sm font-semibold text-blue-600 hover:text-blue-700"
                >
                  Try Again
                </button>
              </div>
            ) : filteredCustomers.length === 0 ? (
              <div className="text-center py-20 px-4">
                <div className="inline-flex p-4 bg-blue-50 text-blue-400 rounded-2xl mb-4">
                  <Users size={28} />
                </div>
                <h3 className="text-base font-semibold text-slate-900 mb-1">No Customer Groups Found</h3>
                <p className="text-sm text-slate-500 max-w-xs mx-auto mb-5">
                  {searchTerm
                    ? "No groups match your search. Try a different keyword."
                    : "Start building your customer base by adding a new group."}
                </p>
                {canEdit && !searchTerm && (
                  <Link
                    href="/dashboard/customers/new"
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-sm shadow-sm transition-all"
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
                    <tr className="bg-gradient-to-r from-blue-600 to-blue-600 text-white text-xs font-semibold uppercase tracking-wider">
                      <th className="py-3 px-4">
                        <input
                          type="checkbox"
                          checked={selectedIds.size === filteredCustomers.length && filteredCustomers.length > 0}
                          onChange={toggleSelectAll}
                          className="rounded border-white/40 text-blue-600 focus:ring-0"
                        />
                      </th>
                      <th className="py-3 px-4 whitespace-nowrap">Group Code</th>
                      <th className="py-3 px-4 whitespace-nowrap">Group Name</th>
                      <th className="py-3 px-4 whitespace-nowrap">Category</th>

                      <th className="py-3 px-4 whitespace-nowrap text-center">No. of Members</th>
                      <th className="py-3 px-4 text-center">Group</th>
                      <th className="py-3 px-4 text-center">Photo</th>
                      {canEdit && <th className="py-3 px-4 text-right"></th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {filteredCustomers.map((customer, idx) => {
                      const catColor =
                        CATEGORY_COLORS[customer.category || ""] ??
                        "bg-slate-100 text-slate-600";
                      const memberCount = customer._count?.policies ?? 0;
                      const isSelected = selectedIds.has(customer.id);

                      return (
                        <tr
                          key={customer.id}
                          className={`transition-colors ${
                            isSelected ? "bg-blue-50/60" : idx % 2 === 0 ? "bg-white" : "bg-slate-50/40"
                          } hover:bg-blue-50/30`}
                        >
                          <td className="py-3 px-4">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelect(customer.id)}
                              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500/20"
                            />
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-mono font-semibold text-slate-700 text-xs bg-slate-100 px-2 py-1 rounded">
                              {customer.groupCode || "—"}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <Link
                              href={`/dashboard/customers/${customer.id}`}
                              className="font-semibold text-slate-900 hover:text-blue-600 transition-colors flex items-center gap-1 group"
                            >
                              {customer.groupName || customer.name}
                              <ChevronRight size={13} className="opacity-0 group-hover:opacity-100 transition-opacity text-blue-500" />
                            </Link>
                            {customer.email && (
                              <div className="text-xs text-slate-400 mt-0.5 truncate max-w-[180px]">
                                {customer.email}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            {customer.category ? (
                              <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${catColor}`}>
                                <Tag size={10} />
                                {customer.category}
                              </span>
                            ) : (
                              <span className="text-slate-300 text-xs">—</span>
                            )}
                          </td>

                          <td className="py-3 px-4 text-center">
                            <span className="text-blue-600 font-bold text-sm hover:underline cursor-pointer">
                              {memberCount}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className="inline-flex w-7 h-7 items-center justify-center bg-slate-100 rounded-lg text-slate-500 hover:bg-blue-100 hover:text-blue-600 transition-colors cursor-pointer" title="View Group">
                              <Users size={13} />
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className="inline-flex w-7 h-7 items-center justify-center bg-slate-100 rounded-lg text-slate-500 hover:bg-blue-100 hover:text-blue-600 transition-colors cursor-pointer" title="Upload Photo">
                              <Camera size={13} />
                            </span>
                          </td>
                          {canEdit && (
                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Link
                                  href={`/dashboard/customers/${customer.id}/edit`}
                                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                                >
                                  Edit
                                </Link>
                                <button
                                  onClick={() => setDeleteId(customer.id)}
                                  className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
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
                    <span className="text-blue-600 font-semibold">{selectedIds.size} selected</span>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {/* ─── Customer Master Tab ─── */}
        {activeTab === "master" && (
          <div className="flex flex-col items-center justify-center py-24 px-4">
            <div className="inline-flex p-5 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-3xl mb-5 shadow-inner">
              <SlidersHorizontal size={36} className="text-indigo-400" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-2">Customer Master</h3>
            <p className="text-sm text-slate-500 text-center max-w-sm leading-relaxed">
              Individual customer accounts will be managed here. This module is coming soon.
            </p>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-50 rounded-xl">
                <AlertTriangle size={22} className="text-red-500" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Delete Customer Group</h3>
                <p className="text-xs text-slate-400">This action cannot be undone</p>
              </div>
            </div>
            <p className="text-sm text-slate-600 mb-6 leading-relaxed">
              Are you sure you want to delete this customer group? All associated data and portal access will be permanently removed.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                disabled={isDeleting}
                onClick={() => setDeleteId(null)}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-sm rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                disabled={isDeleting}
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold text-sm rounded-lg shadow-sm transition-colors flex items-center gap-2"
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
